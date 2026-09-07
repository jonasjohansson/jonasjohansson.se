export function initTheme() {
  const system = matchMedia('(prefers-color-scheme: dark)');
  const applyTheme = () => {
    document.documentElement.dataset.theme = system.matches ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', system.matches ? '#221f1c' : '#e8e4dd');
  };
  applyTheme();
  system.addEventListener('change', applyTheme);
}
