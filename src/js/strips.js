let entries = [];

export function updateStrips(slug) {
  let count = 0;
  for (const entry of entries) {
    entry.hidden = entry.dataset.project === slug;
    if (!entry.hidden) count++;
  }
  document.getElementById('project-count').textContent = `${count} projects`;
}

export function initializeStrips() {
  entries = [...document.querySelectorAll('#strips .strip')];
  updateStrips(document.documentElement.dataset.project);
  document.documentElement.classList.add('enhanced');
}
