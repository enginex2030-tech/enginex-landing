// Small, dependency-free behaviour for the About page: the theme cycle, the
// mobile menu, and the footer year. The page itself is static HTML, so nothing
// here is required to read it.
(() => {
  'use strict';

  const root = document.documentElement;
  const theme = document.getElementById('theme');
  if (theme) {
    theme.addEventListener('click', () => {
      const current = root.dataset.theme || 'auto';
      root.dataset.theme = current === 'auto' ? 'dark' : current === 'dark' ? 'light' : 'auto';
    });
  }

  const menu = document.getElementById('menu');
  const mobile = document.getElementById('mobile');
  if (menu && mobile) {
    menu.addEventListener('click', () => mobile.classList.toggle('open'));
    mobile.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => mobile.classList.remove('open'));
    });
  }

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
