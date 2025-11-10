// Color extraction utility for extracting dominant colors from images
export class ColorExtractor {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Extract the dominant color from an image
   * @param {string} imageUrl - URL of the image
   * @param {number} sampleSize - Number of pixels to sample (default: 10000)
   * @returns {Promise<string>} - Hex color string
   */
  async extractDominantColor(imageUrl, sampleSize = 10000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // Set canvas size to image size
          this.canvas.width = img.width;
          this.canvas.height = img.height;
          
          // Draw image to canvas
          this.ctx.drawImage(img, 0, 0);
          
          // Get image data
          const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
          const data = imageData.data;
          
          // Sample pixels and calculate average color
          const color = this.calculateDominantColor(data, sampleSize);
          resolve(color);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageUrl;
    });
  }

  /**
   * Calculate dominant color from image data
   * @param {Uint8ClampedArray} data - Image data from canvas
   * @param {number} sampleSize - Number of pixels to sample
   * @returns {string} - Hex color string
   */
  calculateDominantColor(data, sampleSize) {
    const pixels = data.length / 4;
    const step = Math.max(1, Math.floor(pixels / sampleSize));
    
    let r = 0, g = 0, b = 0, count = 0;
    
    // Sample pixels
    for (let i = 0; i < data.length; i += 4 * step) {
      const red = data[i];
      const green = data[i + 1];
      const blue = data[i + 2];
      const alpha = data[i + 3];
      
      // Skip transparent pixels
      if (alpha < 128) continue;
      
      r += red;
      g += green;
      b += blue;
      count++;
    }
    
    if (count === 0) {
      return '#000000'; // Fallback to black
    }
    
    // Calculate average
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);
    
    return this.rgbToHex(r, g, b);
  }

  /**
   * Convert RGB values to hex
   * @param {number} r - Red value (0-255)
   * @param {number} g - Green value (0-255)
   * @param {number} b - Blue value (0-255)
   * @returns {string} - Hex color string
   */
  rgbToHex(r, g, b) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  /**
   * Adjust color brightness for better contrast
   * @param {string} hex - Hex color string
   * @param {number} multiplier - Brightness multiplier (>1 = brighter, <1 = darker)
   * @returns {string} - Adjusted hex color string
   */
  adjustBrightness(hex, multiplier) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    const newR = Math.round(Math.min(255, r * multiplier));
    const newG = Math.round(Math.min(255, g * multiplier));
    const newB = Math.round(Math.min(255, b * multiplier));
    
    return this.rgbToHex(newR, newG, newB);
  }

  /**
   * Get a contrasting color (light or dark) based on the input color
   * @param {string} hex - Hex color string
   * @returns {string} - Contrasting color
   */
  getContrastColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark colors, black for light colors
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
}
