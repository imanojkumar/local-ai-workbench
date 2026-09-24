
(() => {
  const root = document.documentElement;
  const saved = localStorage.getItem('laiw-docs-theme');
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;

  const themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      localStorage.setItem('laiw-docs-theme', next);
    });
  }

  const menuBtn = document.querySelector('.menu-toggle');
  const topbar = document.querySelector('.topbar');
  const layout = document.querySelector('.docs-layout');
  if (menuBtn && topbar) {
    menuBtn.addEventListener('click', () => {
      topbar.classList.toggle('nav-open');
      if (layout) layout.classList.toggle('nav-side-open');
    });
  }

  document.querySelectorAll('pre').forEach((pre) => {
    const code = pre.querySelector('code');
    if (!code) return;
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.type = 'button';
    btn.textContent = 'Copy';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.innerText);
        btn.textContent = 'Copied';
        setTimeout(() => btn.textContent = 'Copy', 1200);
      } catch {
        btn.textContent = 'Select';
      }
    });
    pre.appendChild(btn);
  });
})();
