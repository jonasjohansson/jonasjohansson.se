// Strip filtering - dropdown UI and project tag filtering
import { resetAnimationState } from "./stripAnimation.js";
import { setProgrammaticScroll } from "./utils/state.js";

const projects = window.__PROJECTS_DATA__ || [];

const filterCategories = (() => {
  const seen = new Set();
  const categories = [];

  projects.forEach((project) => {
    const tags = Array.isArray(project?.tags) ? project.tags : [];
    tags.forEach((tag) => {
      if (!tag) return;
      const normalized = String(tag).trim();
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      categories.push(normalized);
    });
  });

  categories.sort((a, b) => {
    if (a.length === b.length) return a.localeCompare(b);
    return a.length - b.length;
  });

  return categories;
})();

const filterCategorySet = new Set(filterCategories.map((tag) => tag.toLowerCase()));

// State
let stripsContainer = null;
let allStripsRef = null; // function that returns current allStrips array

export function initFilteringRefs(container, getAllStrips, getNavigationTimeoutId, clearNavigationTimeout) {
  stripsContainer = container;
  allStripsRef = getAllStrips;
  _clearNavigationTimeout = clearNavigationTimeout;
}

let _clearNavigationTimeout = null;

export function getSelectedFilters() {
  const tags = Array.from(document.querySelectorAll('.filter-dropdown-content input[type="checkbox"]:checked'))
    .map((cb) => cb.value)
    .filter((value) => filterCategorySet.has(String(value).toLowerCase()));
  return { tags };
}

export function resetFilters() {
  document.querySelectorAll('.filter-dropdown-content input[type="checkbox"]:checked').forEach((cb) => {
    cb.checked = false;
  });
  filterProjects();
}

export function filterProjects() {
  const { tags } = getSelectedFilters();
  const hasFilters = tags.length > 0;
  const allStrips = allStripsRef ? allStripsRef() : [];

  document.body?.classList.toggle("filter-active", hasFilters);
  stripsContainer?.classList.toggle("filtered", hasFilters);

  allStrips?.forEach((strip) => {
    if (!strip) return;

    if (!hasFilters) {
      strip.classList.remove("filter-match");
      return;
    }

    const stripTags = strip.getAttribute("data-tags");
    if (!stripTags) {
      strip.classList.remove("filter-match");
      return;
    }

    const stripTagsLower = stripTags.split(",").map((t) => t.trim().toLowerCase());
    const selectedTagsLower = tags.map((t) => t.toLowerCase());
    const hasMatch = selectedTagsLower.some((tag) => stripTagsLower.includes(tag));

    strip.classList.toggle("filter-match", hasMatch);
  });

  updateStripCount();
  resetAnimationState();
}

function updateStripCount() {
  const allStrips = allStripsRef ? allStripsRef() : [];
  const hasFilters = document.body.classList.contains("filter-active");
  const visibleStrips = Array.from(allStrips).filter((strip) => {
    if (strip.classList.contains("hidden")) return false;
    // The filter is a control, not a project, and the count drives audio pitch.
    if (strip.classList.contains("strip-filter")) return false;
    // Placeholders are display:none outside mobile — CSS decides, so ask the DOM.
    if (strip.classList.contains("strip-placeholder") && getComputedStyle(strip).display === "none") return false;
    if (hasFilters && !strip.classList.contains("filter-match")) return false;
    return true;
  });

  const visibleCount = visibleStrips.length;
  stripsContainer?.setAttribute("data-visible-count", visibleCount);
  document.documentElement.style.setProperty("--visible-strip-count", visibleCount);
}

export function initFilters() {
  const body = document.body;

  const setFiltering = (value) => {
    if (!body) return;
    if (value) {
      body.dataset.filtering = "true";
    } else {
      delete body.dataset.filtering;
    }
  };

  // Helper to preserve scroll position
  const preserveScroll = (callback) => {
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    setFiltering(true);
    setProgrammaticScroll(true);
    if (_clearNavigationTimeout) _clearNavigationTimeout();

    callback();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: scrollX, behavior: "auto" });
        setTimeout(() => {
          setProgrammaticScroll(false);
          setFiltering(false);
        }, 50);
      });
    });
  };

  const handleFilterClick = (e, checkbox) => {
    e.preventDefault();
    e.stopPropagation();
    preserveScroll(() => {
      checkbox.checked = !checkbox.checked;
      filterProjects();
    });
  };

  document.querySelectorAll('.filter-option, .filter-dropdown-content input[type="checkbox"]').forEach((el) => {
    if (el.classList.contains("filter-option")) {
      el.addEventListener(
        "click",
        (e) => {
          const checkbox = el.querySelector('input[type="checkbox"]');
          if (checkbox) handleFilterClick(e, checkbox);
        },
        true
      );
    } else {
      el.addEventListener("click", (e) => handleFilterClick(e, el), true);
      el.addEventListener("focus", (e) => e.preventDefault());
    }
  });
}
