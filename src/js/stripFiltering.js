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

  const buttons = document.querySelectorAll(".filter-dropdown-button");

  if (buttons.length === 0) {
    setTimeout(() => {
      const retryButtons = document.querySelectorAll(".filter-dropdown-button");
      if (retryButtons.length > 0) {
        initFilters();
      }
    }, 100);
    return;
  }

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

  const closeAllDropdowns = () => {
    document.querySelectorAll(".filter-dropdown").forEach((d) => {
      d.classList.remove("open");
      const btn = d.querySelector(".filter-dropdown-button");
      if (btn) btn.textContent = "Filter";
    });
  };

  buttons.forEach((button) => {
    button.addEventListener(
      "focus",
      (e) => {
        e.preventDefault();
        button.blur();
      },
      true
    );

    button.addEventListener(
      "mousedown",
      (e) => {
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        setProgrammaticScroll(true);
        window.scrollTo({ top: scrollY, left: scrollX, behavior: "auto" });
        button._savedScrollY = scrollY;
        button._savedScrollX = scrollX;
      },
      true
    );

    button.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();

        const savedScrollY = button._savedScrollY ?? window.scrollY;
        const savedScrollX = button._savedScrollX ?? window.scrollX;

        window.scrollTo({ top: savedScrollY, left: savedScrollX, behavior: "auto" });
        setProgrammaticScroll(true);
        button.blur();

        const dropdown = button.closest(".filter-dropdown");
        if (!dropdown) return;

        const isOpen = dropdown.classList.contains("open");
        closeAllDropdowns();

        if (!isOpen) {
          dropdown.classList.add("open");
          button.textContent = "×";
        }

        const restoreScroll = () => window.scrollTo({ top: savedScrollY, left: savedScrollX, behavior: "auto" });
        restoreScroll();
        requestAnimationFrame(() => {
          restoreScroll();
          requestAnimationFrame(() => {
            restoreScroll();
            setTimeout(() => {
              restoreScroll();
              setProgrammaticScroll(false);
              delete button._savedScrollY;
              delete button._savedScrollX;
            }, 100);
          });
        });
      },
      true
    );
  });

  document.addEventListener(
    "click",
    (e) => {
      if (e.target.closest(".filter-dropdown-button")) return;
      if (!e.target.closest(".filter-dropdown")) {
        closeAllDropdowns();
      }
    },
    true
  );
}
