export function initTheme() {
  const system = matchMedia('(prefers-color-scheme: dark)');
  const applyTheme = () => {
    document.documentElement.dataset.theme = system.matches ? 'dark' : 'light';
  };
  applyTheme();
  system.addEventListener('change', applyTheme);
}
