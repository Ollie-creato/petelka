'use strict';
/* Замок Петельки: расшифровывает приложение паролем. Ключ после первого входа хранится на устройстве. */
(function () {
  const KEY_LS = 'petelka.key';
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const unb64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const box = document.getElementById('lock');
  // Офлайн-кэш: проверить обновление при каждом запуске и один раз перезагрузиться, когда пришла новая версия.
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !window.__petelkaReloaded) { window.__petelkaReloaded = true; location.reload(); } });
  }

  async function decrypt(pack, key) {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(pack.iv) }, key, b64(pack.data));
    return JSON.parse(new TextDecoder().decode(plain));
  }
  async function keyFromPassword(pass, pack) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(pack.salt), iterations: pack.iter, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
  }
  function run(bundle) {
    box.remove();
    window.__PETELKA_SEED = bundle.seed;
    const s = document.createElement('script');
    s.textContent = bundle.app;
    document.body.appendChild(s);
  }
  function showForm(pack) {
    box.hidden = false;
    const form = box.querySelector('form'), input = box.querySelector('input'), err = box.querySelector('.err');
    const eye = box.querySelector('.eye');
    if (eye) eye.addEventListener('click', () => { const show = input.type === 'password'; input.type = show ? 'text' : 'password'; eye.setAttribute('aria-pressed', String(show)); eye.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль'); input.focus(); });
    input.focus();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      err.textContent = '';
      try {
        const key = await keyFromPassword(input.value, pack);
        const bundle = await decrypt(pack, key);
        try { localStorage.setItem(KEY_LS, unb64(await crypto.subtle.exportKey('raw', key))); } catch (e) {}
        run(bundle);
      } catch (e) { err.textContent = 'Неверный пароль'; input.select(); }
    });
  }
  (async function () {
    let pack;
    try { pack = await (await fetch('app.enc')).json(); }
    catch (e) { box.hidden = false; box.querySelector('.err').textContent = 'Не удалось загрузить приложение'; return; }
    let saved = null;
    try { saved = localStorage.getItem(KEY_LS); } catch (e) {}
    if (saved) {
      try {
        const key = await crypto.subtle.importKey('raw', b64(saved), 'AES-GCM', false, ['decrypt']);
        return run(await decrypt(pack, key));
      } catch (e) { try { localStorage.removeItem(KEY_LS); } catch (e) {} }
    }
    showForm(pack);
  })();
})();
