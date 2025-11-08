// Grain texture - using base64 encoded SVG for better performance
// This creates a simple noise pattern that can be tiled
function createGrainTexture() {
  // Create a small SVG noise pattern (200x200px)
  // Using SVG filters for better quality and smaller size
  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
      </defs>
      <rect width="200" height="200" filter="url(#noise)" opacity="0.4"/>
    </svg>
  `.trim();
  
  // Convert to base64 data URL
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  const dataUrl = `data:image/svg+xml;base64,${base64}`;
  
  document.documentElement.style.setProperty('--grain-image', `url(${dataUrl})`);
}

// Alternative: Simple canvas-based grain (if SVG doesn't work well)
function createGrainTextureCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(200, 200);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const value = Math.random() * 255;
    data[i] = value;     // R
    data[i + 1] = value; // G
    data[i + 2] = value; // B
    data[i + 3] = 255;   // A
  }
  
  ctx.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');
  document.documentElement.style.setProperty('--grain-image', `url(${dataUrl})`);
}

// Grain parameters
const grainParams = {
  opacity: 0.15,
  scale: 1.0,
  blend: 'difference',
};

const GRAIN_STORAGE_KEY = 'grainSettings';

function saveGrainToLocalStorage() {
  try {
    const settings = JSON.parse(JSON.stringify(grainParams));
    localStorage.setItem(GRAIN_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save grain settings to localStorage:', error);
  }
}

function loadGrainFromLocalStorage() {
  try {
    const stored = localStorage.getItem(GRAIN_STORAGE_KEY);
    if (stored) {
      const settings = JSON.parse(stored);
      Object.assign(grainParams, settings);
      return true;
    }
  } catch (error) {
    console.warn('Failed to load grain settings from localStorage:', error);
  }
  return false;
}

function updateGrain() {
  // Create grain texture if it doesn't exist
  const currentGrainImage = getComputedStyle(document.documentElement).getPropertyValue('--grain-image');
  if (!currentGrainImage || currentGrainImage === 'none') {
    // Use canvas method for better visibility (same as original implementation)
    createGrainTextureCanvas();
  }
  
  // Update CSS variables
  document.documentElement.style.setProperty('--grain-opacity', grainParams.opacity);
  const baseSize = 200;
  const scaledSize = baseSize / grainParams.scale;
  document.documentElement.style.setProperty('--grain-size', `${scaledSize}px ${scaledSize}px`);
  document.documentElement.style.setProperty('--grain-blend', grainParams.blend);
  
  // Save to localStorage whenever grain is updated
  saveGrainToLocalStorage();
}

export function initializeGrain() {
  // Load settings from localStorage first
  loadGrainFromLocalStorage();
  updateGrain();
}

// Expose grain params for potential GUI control
export { grainParams, updateGrain };

