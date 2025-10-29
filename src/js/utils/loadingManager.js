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
    const imageUrls = [];

    // Initialize strips first (shuffle, etc.)
    this.initializeStrips();

    // Collect all strip image URLs
    strips.forEach((strip) => {
      const stripImage = strip.querySelector(".strip-image");
      if (stripImage) {
        const bgImage = stripImage.getAttribute("data-bg-image");
        if (bgImage) {
          imageUrls.push(bgImage);
        }
      }
    });

    this.totalImages = imageUrls.length;

    if (this.totalImages === 0) {
      this.completeLoading();
      return;
    }

    // Preload images
    const loadPromises = imageUrls.map((url) => this.loadImage(url));
    await Promise.all(loadPromises);

    // Ensure loading is marked complete after all images load
    this.completeLoading();
  }

  initializeStrips() {
    const stripsContainer = document.getElementById("strips");
    if (!stripsContainer) return;

    const strips = Array.from(stripsContainer.querySelectorAll(".strip"));
    if (strips.length === 0) return;

    // Shuffle strips for variety
    const shuffledStrips = this.shuffle([...strips]);

    // Re-append strips in shuffled order
    shuffledStrips.forEach((strip, index) => {
      stripsContainer.appendChild(strip);
      strip.setAttribute("data-index", index);
      strip.style.setProperty("--strip-index", index);
    });

    // Load strip images immediately but keep them invisible
    const stripImages = Array.from(stripsContainer.querySelectorAll(".strip-image"));
    stripImages.forEach((img) => {
      const bgImage = img.getAttribute("data-bg-image");
      if (bgImage && !img.style.backgroundImage) {
        img.style.backgroundImage = `url('${bgImage}')`;
      }
    });
  }

  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

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
    const percentage = Math.round((this.loadedImages / this.totalImages) * 100);

    // Check if we've reached 100%
    if (percentage >= 100) {
      this.completeLoading();
    }
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
