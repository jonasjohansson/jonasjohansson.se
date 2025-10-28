// Loading manager for preloading images and showing progress
export class LoadingManager {
  constructor() {
    this.loadingScreen = document.getElementById("loading-screen");
    this.startButton = document.getElementById("start-button");
    this.loadedImages = 0;
    this.totalImages = 0;
    this.isLoading = true;
    this.originalTitle = document.title;

    console.log("LoadingManager initialized", {
      loadingScreen: this.loadingScreen,
      startButton: this.startButton,
    });

    // Add loading class to body
    document.body.classList.add("loading");

    // Set up start button click handler
    if (this.startButton) {
      this.startButton.addEventListener("click", () => {
        this.startExperience();
      });
    }
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
    document.title = `${percentage}% - ${this.originalTitle}`;
    console.log(`Loading progress: ${percentage}% (${this.loadedImages}/${this.totalImages})`);

    // Check if we've reached 100%
    if (percentage >= 100) {
      console.log("100% reached, enabling start button");
      this.enableStartButton();
    }
  }

  enableStartButton() {
    if (this.startButton) {
      this.startButton.disabled = false;
      this.startButton.textContent = "EASY";
    }

    // Restore original title when loading is complete
    document.title = this.originalTitle;
  }

  startExperience() {
    console.log("Starting experience");

    // Remove loading screen
    if (this.loadingScreen) {
      this.loadingScreen.classList.add("fade-out");
      setTimeout(() => {
        this.loadingScreen.remove();
      }, 500);
    }

    // Add loaded class to body
    document.body.classList.remove("loading");
    document.body.classList.add("loaded");

    // Show header and filter
    const header = document.getElementById("header");
    const filter = document.getElementById("filter-dropdown-container");
    if (header) header.style.display = "";
    if (filter) filter.style.display = "";

    // Initialize strips with full functionality
    this.initializeStripsFull();

    // Trigger strip animations
    this.animateStrips();
  }

  initializeStripsFull() {
    // Import and call the strips initialization function
    import("../strips.js")
      .then((stripsModule) => {
        if (stripsModule.initializeStrips) {
          stripsModule.initializeStrips();
        }
      })
      .catch((error) => {
        console.error("Failed to initialize strips:", error);
      });
  }

  animateStrips() {
    // CSS animations handle everything automatically
    // No JavaScript needed - strips animate based on --strip-index
    console.log("Strips will animate automatically via CSS");
  }
}

export const loadingManager = new LoadingManager();
