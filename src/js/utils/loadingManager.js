// Loading manager for preloading images
export class LoadingManager {
  constructor() {
    this.loadedImages = 0;
    this.totalImages = 0;
    this.isLoading = true;
    this.originalTitle = document.title;

    // Add loading class to body
    document.body.classList.add("loading");
  }

  async preloadStripImages() {
    const strips = document.querySelectorAll(".strip");
    
    // Don't preload all images - let lazy loading handle it
    // Only mark loading complete immediately to avoid blocking
    if (strips.length === 0) {
      this.completeLoading();
      return;
    }

    // Only preload first 2-3 visible strips for faster LCP
    const eagerCount = Math.min(3, strips.length);
    const eagerImages = [];
    
    for (let i = 0; i < eagerCount; i++) {
      const stripImage = strips[i]?.querySelector(".strip-image");
      if (stripImage) {
        const bgImage = stripImage.getAttribute("data-bg-image");
        if (bgImage) {
          eagerImages.push(this.loadImage(bgImage));
        }
      }
    }

    // Wait only for eager images, then mark complete (don't block on rest)
    if (eagerImages.length > 0) {
      await Promise.all(eagerImages);
    }
    
    this.completeLoading();
  }

  // initializeStrips removed - handled by strips.js now

  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        this.loadedImages++;
        this.updatePercentage();
        resolve();
      };

      img.onerror = () => {
        this.loadedImages++;
        this.updatePercentage();
        resolve(); // Continue even if image fails
      };

      img.src = url;
    });
  }

  updatePercentage() {
    // Removed - no longer tracking percentage during preload
  }

  completeLoading() {
    // Restore original title when loading is complete
    document.title = this.originalTitle;
    this.isLoading = false;
    document.body.classList.remove("loading");
    document.body.classList.add("loaded");
  }

  // Removed startExperience, initializeStripsFull, animateStrips - no longer needed
}

export const loadingManager = new LoadingManager();
