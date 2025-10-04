// Curtain drag functionality
document.addEventListener("DOMContentLoaded", () => {
  const island = document.getElementById("island-handle");
  const header = document.getElementById("header");
  const curtain = document.getElementById("about-curtain");

  let isDragging = false;
  let hasMoved = false; // Track if user actually dragged
  let startY = 0;
  let currentPosition = 0; // Store current position (0 = closed, maxDrag = fully open)

  // Calculate maximum drag distance based on actual curtain height
  const curtainHeight = curtain.offsetHeight;
  const maxDrag = curtainHeight; // pixels

  // Calculate the offset for the filter dropdown below the island
  const headerHeight = header.offsetHeight;
  const islandHeight = island.offsetHeight;
  const filterOffset = headerHeight - islandHeight;

  // Set initial position (hidden above viewport)
  curtain.style.top = `-${curtainHeight}px`;

  // Add hover effect to show curtain preview
  island.addEventListener("mouseenter", () => {
    if (!isDragging) {
      curtain.classList.add("hover-preview");
    }
  });

  island.addEventListener("mouseleave", () => {
    curtain.classList.remove("hover-preview");
  });

  island.addEventListener("pointerdown", (e) => {
    isDragging = true;
    hasMoved = false;
    startY = e.clientY - currentPosition; // Account for current position
    curtain.classList.add("dragging");
    island.style.cursor = "grabbing";
  });

  window.addEventListener("pointermove", (e) => {
    if (!isDragging) return;

    // Calculate drag distance from start
    const dragDistance = e.clientY - startY;

    // Mark as moved if dragged more than 5px
    if (Math.abs(dragDistance - currentPosition) > 5) {
      hasMoved = true;
    }

    // Clamp between 0 and maxDrag
    currentPosition = Math.max(0, Math.min(dragDistance, maxDrag));

    // Move curtain and header (island + links + filter) together
    curtain.style.top = `${-curtainHeight + currentPosition}px`;
    curtain.style.transform = `translateX(-50%)`;
    header.style.transform = `translate(-50%, ${currentPosition - filterOffset}px)`;

    // Enable pointer events on curtain when visible
    if (currentPosition > 0) {
      curtain.style.pointerEvents = "auto";
    } else {
      curtain.style.pointerEvents = "none";
    }
  });

  window.addEventListener("pointerup", () => {
    if (!isDragging) return;

    isDragging = false;
    curtain.classList.remove("dragging");
    island.style.cursor = "grab";

    // If user didn't drag (just clicked), toggle open/closed
    if (!hasMoved) {
      const targetPosition = currentPosition > 0 ? 0 : maxDrag;
      animateCurtain(targetPosition);
    }
  });

  // Animate curtain to target position
  function animateCurtain(targetPosition) {
    const startPosition = currentPosition;
    const distance = targetPosition - startPosition;
    const duration = 300; // ms
    const startTime = performance.now();

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out function
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      currentPosition = startPosition + distance * easeProgress;

      // Move curtain and header (island + links + filter) together
      curtain.style.top = `${-curtainHeight + currentPosition}px`;
      curtain.style.transform = `translateX(-50%)`;
      header.style.transform = `translate(-50%, ${currentPosition - filterOffset}px)`;

      // Enable/disable pointer events
      if (currentPosition > 0) {
        curtain.style.pointerEvents = "auto";
      } else {
        curtain.style.pointerEvents = "none";
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }
});
