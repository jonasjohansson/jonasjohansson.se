export function initPrint() {
  let preparing = false;
  const warmImages = () => {
    const slug = document.documentElement.dataset.project;
    const projects = [...document.querySelectorAll('[data-print-project]')]
      .filter(project => !slug || project.dataset.printProject === slug);
    return projects.flatMap(project => [...project.querySelectorAll('img')]).map(img => {
      img.loading = 'eager';
      return img.decode().catch(() => {});
    });
  };

  // Menu printing must stay synchronous. Cmd/Ctrl+P can wait for image decode
  // before opening the dialog, preventing empty frames on a cold first visit.
  addEventListener('beforeprint', warmImages);
  const printPortfolio = async () => {
    if (preparing) return;
    preparing = true;
    try {
      await Promise.all([...warmImages(), document.fonts.ready]);
      window.print();
    } finally {
      preparing = false;
    }
  };
  addEventListener('keydown', event => {
    if (event.defaultPrevented || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'p' || event.altKey || event.shiftKey) return;
    event.preventDefault();
    printPortfolio();
  });
  document.addEventListener('click', event => {
    if (event.target.closest('button[data-action="print"]')) printPortfolio();
  });
}
