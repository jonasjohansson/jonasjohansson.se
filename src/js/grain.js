// Create grain texture using canvas
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
  opacity: 0.05,
  scale: 1.0,
  blend: 'screen',
};

function updateGrain() {
  // Create grain texture if it doesn't exist
  const currentGrainImage = getComputedStyle(document.documentElement).getPropertyValue('--grain-image');
  if (!currentGrainImage || currentGrainImage === 'none') {
    createGrainTextureCanvas();
  }
  
  // Update CSS variables
  document.documentElement.style.setProperty('--grain-opacity', grainParams.opacity);
  const baseSize = 200;
  const scaledSize = baseSize / grainParams.scale;
  document.documentElement.style.setProperty('--grain-size', `${scaledSize}px ${scaledSize}px`);
  document.documentElement.style.setProperty('--grain-blend', grainParams.blend);
}

export function initializeGrain() {
  updateGrain();
}

export { grainParams };

