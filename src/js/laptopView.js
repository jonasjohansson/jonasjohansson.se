// Laptop view - fits entire site inside laptop display using matrix3d transform
// Based on the provided example code, adapted for this codebase
//
// CONFIGURATION INSTRUCTIONS:
// 1. Open your laptop.webp image in an image editor (e.g., Affinity Photo, Photoshop, or online tool)
// 2. Measure the pixel coordinates of the four corners of the laptop screen:
//    - Top-left corner of the screen
//    - Top-right corner of the screen
//    - Bottom-right corner of the screen
//    - Bottom-left corner of the screen
// 3. Update the screenCorners array below with your measured coordinates
// 4. Update originalWidth and originalHeight to match your image dimensions
// 5. The image path should point to where the laptop image is served (default: /assets/img/laptop.webp)

import { getPathPrefix } from "./utils/routeUtils.js";

const LAPTOP_CONFIG = {
  // Screen corners in original image coordinates (measure these from your laptop.webp)
  // IMPORTANT: Measure these coordinates from your actual laptop.webp image!
  // Open the image in an image editor and note the pixel coordinates of the screen corners
  // These are example values - REPLACE WITH YOUR ACTUAL MEASUREMENTS
  screenCorners: [
    { x: 498, y: 180 },  // top-left corner of screen
    { x: 1280, y: 233 }, // top-right corner of screen
    { x: 1161, y: 727 }, // bottom-right corner of screen
    { x: 370, y: 628 }   // bottom-left corner of screen
  ],
  // Original image dimensions - UPDATE TO MATCH YOUR ACTUAL IMAGE SIZE
  // Check the actual pixel dimensions of your laptop.webp file
  originalWidth: 1500,
  originalHeight: 1000,
  // Image path (resolved at runtime with path prefix)
  get imagePath() {
    const pathPrefix = getPathPrefix();
    return `${pathPrefix}/assets/img/laptop.webp`;
  }
};

let isLaptopView = false;
let laptopWrapper = null;
let laptopScreen = null;
let siteWrapper = null;

// Gaussian elimination for solving the matrix equation
function gaussianElimination(A, b) {
  const n = A.length;
  const x = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxEl = Math.abs(A[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > maxEl) {
        maxEl = Math.abs(A[k][i]);
        maxRow = k;
      }
    }

    // Swap maximum row with current row
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    [b[i], b[maxRow]] = [b[maxRow], b[i]];

    // Make all rows below this one 0 in current column
    for (let k = i + 1; k < n; k++) {
      const c = -A[k][i] / A[i][i];
      for (let j = i; j < n; j++) {
        if (i === j) {
          A[k][j] = 0;
        } else {
          A[k][j] += c * A[i][j];
        }
      }
      b[k] += c * b[i];
    }
  }

  // Solve equation Ax=b using back substitution
  for (let i = n - 1; i >= 0; i--) {
    x[i] = b[i] / A[i][i];
    for (let k = i - 1; k >= 0; k--) {
      b[k] -= A[k][i] * x[i];
    }
  }

  return x;
}

// Compute matrix3d transform from source points to destination points
function computeMatrix3d(from, to) {
  const A = [];
  const b = [];

  for (let i = 0; i < 4; i++) {
    const [x, y] = [from[i].x, from[i].y];
    const [u, v] = [to[i].x, to[i].y];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(u, v);
  }

  const h = gaussianElimination(A, b);
  return [
    h[0], h[3], 0, h[6],
    h[1], h[4], 0, h[7],
    0, 0, 1, 0,
    h[2], h[5], 0, 1
  ];
}

// Store initial transform to maintain consistency
let baseTransform = null;
let baseWrapperSize = null;
let baseScreenSize = null;

// Update the transform to fit content inside laptop screen corners
function updateTransform() {
  if (!laptopWrapper || !laptopScreen) return;

  const wrapperRect = laptopWrapper.getBoundingClientRect();
  
  // Calculate the actual displayed size of the image (accounting for cover sizing)
  // With cover, the image fills the container and may be cropped
  const imageAspect = LAPTOP_CONFIG.originalWidth / LAPTOP_CONFIG.originalHeight;
  const wrapperAspect = wrapperRect.width / wrapperRect.height;
  
  let displayedWidth, displayedHeight, offsetX, offsetY;
  if (wrapperAspect > imageAspect) {
    // Width is limiting - image fits width, height extends beyond (will be cropped)
    displayedWidth = wrapperRect.width;
    displayedHeight = displayedWidth / imageAspect;
    offsetX = 0;
    offsetY = (wrapperRect.height - displayedHeight) / 2;
  } else {
    // Height is limiting - image fits height, width extends beyond (will be cropped)
    displayedHeight = wrapperRect.height;
    displayedWidth = displayedHeight * imageAspect;
    offsetX = (wrapperRect.width - displayedWidth) / 2;
    offsetY = 0;
  }
  
  // Calculate scale factors from original image to displayed size
  const scaleX = displayedWidth / LAPTOP_CONFIG.originalWidth;
  const scaleY = displayedHeight / LAPTOP_CONFIG.originalHeight;

  // Destination: the screen area corners in displayed coordinates
  // Map screen corners from original image coordinates to displayed coordinates
  const to = LAPTOP_CONFIG.screenCorners.map(p => ({
    x: p.x * scaleX + offsetX,
    y: p.y * scaleY + offsetY
  }));

  // Calculate the bounding box of the laptop screen area
  // This is the actual visible area inside the laptop
  const screenMinX = Math.min(...to.map(p => p.x));
  const screenMaxX = Math.max(...to.map(p => p.x));
  const screenMinY = Math.min(...to.map(p => p.y));
  const screenMaxY = Math.max(...to.map(p => p.y));
  const screenWidth = screenMaxX - screenMinX;
  const screenHeight = screenMaxY - screenMinY;
  
  // Calculate the average width and height of the screen quadrilateral
  // This gives us a better size estimate for the content container
  const avgWidth = (
    Math.abs(to[1].x - to[0].x) + // top edge
    Math.abs(to[2].x - to[3].x)   // bottom edge
  ) / 2;
  const avgHeight = (
    Math.abs(to[3].y - to[0].y) + // left edge
    Math.abs(to[2].y - to[1].y)   // right edge
  ) / 2;
  
  // Use the average dimensions for a better fit
  const contentWidth = avgWidth || screenWidth;
  const contentHeight = avgHeight || screenHeight;
  
  // Source: the content container dimensions
  // This is what we're transforming FROM - sized to fit the screen area
  const from = [
    { x: 0, y: 0 },                                    // top-left
    { x: contentWidth, y: 0 },                         // top-right
    { x: contentWidth, y: contentHeight },              // bottom-right
    { x: 0, y: contentHeight }                         // bottom-left
  ];
  
  // Adjust destination points to be relative to screen area origin
  const adjustedTo = to.map(p => ({
    x: p.x - screenMinX,
    y: p.y - screenMinY
  }));

  // Calculate the base transform on first call or if aspect ratio changed significantly
  const currentAspect = wrapperRect.width / wrapperRect.height;
  const needsRecalculation = !baseTransform || 
    !baseWrapperSize ||
    Math.abs(currentAspect - (baseWrapperSize.width / baseWrapperSize.height)) > 0.01;

  // Position and size the screen container to match laptop screen area
  laptopScreen.style.left = `${screenMinX}px`;
  laptopScreen.style.top = `${screenMinY}px`;
  laptopScreen.style.width = `${contentWidth}px`;
  laptopScreen.style.height = `${contentHeight}px`;
  
  // Size the site-wrapper to match the laptop screen dimensions (not viewport)
  // This makes all content inside responsive to the laptop screen size
  siteWrapper.style.width = `${contentWidth}px`;
  siteWrapper.style.height = `${contentHeight}px`;
  
  if (needsRecalculation) {
    // Recalculate the matrix3d transform
    const matrix = computeMatrix3d(from, adjustedTo);
    baseTransform = matrix;
    baseWrapperSize = { width: wrapperRect.width, height: wrapperRect.height };
    baseScreenSize = { width: contentWidth, height: contentHeight };
    laptopScreen.style.transform = `matrix3d(${matrix.join(',')})`;
  } else {
    // When aspect ratio is the same, scale uniformly
    const scaleFactor = contentWidth / baseScreenSize.width;
    laptopScreen.style.transform = `matrix3d(${baseTransform.join(',')}) scale(${scaleFactor})`;
    // Also scale the site-wrapper
    siteWrapper.style.width = `${contentWidth}px`;
    siteWrapper.style.height = `${contentHeight}px`;
  }
  
  laptopScreen.style.transformOrigin = '0 0';
  
  // Debug logging
  if (window.location.search.includes('debug=laptop')) {
    console.log('Laptop Transform Debug:', {
      viewportSize: { width: window.innerWidth, height: window.innerHeight },
      wrapperSize: { width: wrapperRect.width, height: wrapperRect.height },
      displayedSize: { width: displayedWidth, height: displayedHeight },
      screenArea: { 
        x: screenMinX, 
        y: screenMinY, 
        width: screenWidth, 
        height: screenHeight 
      },
      contentSize: { width: contentWidth, height: contentHeight },
      siteWrapperSize: { 
        width: siteWrapper?.style.width, 
        height: siteWrapper?.style.height 
      },
      offset: { x: offsetX, y: offsetY },
      scale: { x: scaleX, y: scaleY },
      sourceCorners: from,
      destinationCorners: adjustedTo,
      screenCornersOriginal: LAPTOP_CONFIG.screenCorners,
      recalculated: needsRecalculation
    });
  }
}

// Create laptop container structure
function createLaptopContainer() {
  // Create wrapper for laptop image
  laptopWrapper = document.createElement('div');
  laptopWrapper.className = 'laptop-wrapper';
  laptopWrapper.style.backgroundImage = `url('${LAPTOP_CONFIG.imagePath}')`;
  // Set aspect ratio CSS variable to match image
  const aspectRatio = LAPTOP_CONFIG.originalWidth / LAPTOP_CONFIG.originalHeight;
  document.documentElement.style.setProperty('--laptop-aspect-ratio', `${LAPTOP_CONFIG.originalWidth} / ${LAPTOP_CONFIG.originalHeight}`);
  
  // Create screen container (where site content will be placed)
  // This will be transformed to fit the laptop screen area
  laptopScreen = document.createElement('div');
  laptopScreen.className = 'laptop-screen';
  // Set initial size to viewport - will be transformed to fit laptop screen
  laptopScreen.style.cssText = `
    position: absolute;
    width: 100vw;
    height: 100vh;
    overflow: auto;
    transform-origin: 0 0;
    background: transparent;
  `;

  // Create a wrapper for all site content
  // This will be sized to match the laptop screen area, not the viewport
  siteWrapper = document.createElement('div');
  siteWrapper.className = 'site-wrapper';
  // Initial size will be set by updateTransform to match laptop screen
  siteWrapper.style.cssText = `
    overflow: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    position: relative;
  `;
  siteWrapper.style.setProperty('--webkit-scrollbar', 'display: none');

  // Move all body children into site wrapper
  // All content including about overlay should be transformed together
  const bodyChildren = Array.from(document.body.children);
  
  bodyChildren.forEach(child => {
    // Skip the laptop wrapper
    if (child.classList.contains('laptop-wrapper')) {
      return;
    }
    
    siteWrapper.appendChild(child);
  });

  laptopScreen.appendChild(siteWrapper);
  laptopWrapper.appendChild(laptopScreen);
  document.body.appendChild(laptopWrapper);

  // Update transform on resize
  const resizeObserver = new ResizeObserver(() => {
    if (isLaptopView) {
      updateTransform();
    }
  });
  resizeObserver.observe(laptopWrapper);

  window.addEventListener('resize', () => {
    if (isLaptopView) {
      updateTransform();
    }
  });
}

// Reset scroll position in laptop mode
export function resetLaptopScroll() {
  if (isLaptopView && siteWrapper) {
    siteWrapper.scrollTop = 0;
  }
}

// Toggle laptop view on/off
export function toggleLaptopView() {
  if (!laptopWrapper) {
    createLaptopContainer();
  }

  isLaptopView = !isLaptopView;

  if (isLaptopView) {
    // Enable laptop view
    laptopWrapper.style.display = 'flex';
    document.body.classList.add('laptop-view-active');
    // Reset base transform when entering laptop mode
    baseTransform = null;
    baseWrapperSize = null;
    baseScreenSize = null;
    // Reset scroll to top when entering laptop mode
    if (siteWrapper) {
      siteWrapper.scrollTop = 0;
    }
    // Update transform after a frame to ensure layout is ready
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateTransform();
      });
    });
  } else {
    // Disable laptop view - restore original structure
    laptopWrapper.style.display = 'none';
    document.body.classList.remove('laptop-view-active');
    
    // Move all children back to body (in correct order, before laptop wrapper)
    const siteChildren = Array.from(siteWrapper.children);
    
    siteChildren.forEach(child => {
      document.body.insertBefore(child, laptopWrapper);
    });
  }
}

// Initialize on load
export function initializeLaptopView() {
  // Expose reset function globally for router
  window.__RESET_LAPTOP_SCROLL__ = resetLaptopScroll;

  // Add keyboard listener for 'L' key to toggle laptop mode
  document.addEventListener('keydown', (e) => {
    // Only trigger if not typing in an input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      return;
    }
    
    // Toggle on 'L' key (case insensitive)
    if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      toggleLaptopView();
    }
  });
}

