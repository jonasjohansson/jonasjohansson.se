const ASCII_CHARS = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export class ScrambleText {
  constructor(element, options = {}) {
    this.element = element;
    // Store the current final text (not scrambled)
    // Initialize with element's textContent, but we'll validate it's not scrambled
    const initialText = element.textContent.trim();
    // Check if initial text looks scrambled (contains special scramble chars)
    const hasScrambleChars = /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]/.test(initialText);
    // If it looks scrambled, we can't know the original, so use empty string
    // It will be set correctly on first scramble
    this.originalText = hasScrambleChars ? "" : initialText;
    this.options = {
      duration: options.duration || 800,
      charactersPerFrame: options.charactersPerFrame || 1,
      frameDelay: options.frameDelay || 30,
      ...options,
    };
    this.isAnimating = false;
    this.animationFrame = null;
  }
  
  // Method to update originalText when text is set directly (not via scramble)
  setText(text) {
    const finalText = (text || this.element.textContent).trim();
    this.originalText = finalText;
    this.element.textContent = finalText;
  }

  scramble(targetText) {
    // EARLY RETURN: Check BEFORE doing anything else
    const finalText = (targetText || this.originalText).trim();
    const normalizedFinal = finalText.toUpperCase();
    
    // CRITICAL: Check ACTUAL DISPLAYED TEXT FIRST (most reliable)
    // This catches cases where hover changed the text but originalText hasn't updated yet
    const currentDisplayedText = this.element.textContent.trim();
    const normalizedDisplayed = currentDisplayedText.toUpperCase();
    
    // If displayed text matches target, skip animation (regardless of originalText state)
    if (normalizedDisplayed === normalizedFinal) {
      // Check if it's currently scrambled (has scramble chars)
      const hasScrambleChars = /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]/.test(currentDisplayedText);
      if (!hasScrambleChars) {
        // Not scrambled and matches - update stored text and exit immediately
        this.originalText = finalText;
        return;
      }
      // If it IS scrambled but matches target, it means animation is in progress
      // towards the correct target - update originalText and let it finish
      this.originalText = finalText;
      return;
    }
    
    // Update originalText to the target BEFORE starting animation
    // This ensures state is correct even if animation is interrupted
    this.originalText = finalText;
    
    // Check stored originalText as secondary check
    const normalizedStored = (this.originalText || "").trim().toUpperCase();
    if (normalizedStored === normalizedFinal && this.isAnimating) {
      // Animation already running to this target - don't restart
      return;
    }
    
    // Clear any existing animation before starting new one
    if (this.animationFrame) {
      clearTimeout(this.animationFrame);
      this.animationFrame = null;
    }

    this.isAnimating = true;
    const textLength = finalText.length;
    let currentIteration = 0;
    const totalIterations = Math.ceil(this.options.duration / this.options.frameDelay);

    const animate = () => {
      if (currentIteration >= totalIterations) {
        // Animation complete - set final text and update stored originalText
        this.element.textContent = finalText;
        this.isAnimating = false;
        this.originalText = finalText.trim(); // Ensure it's trimmed and synced
        this.animationFrame = null; // Clear the frame reference
        return;
      }

      const progress = currentIteration / totalIterations;
      const revealedChars = Math.floor(progress * textLength);

      let scrambledText = "";
      for (let i = 0; i < textLength; i++) {
        if (i < revealedChars) {
          scrambledText += finalText[i];
        } else {
          const randomChar = ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
          scrambledText += randomChar;
        }
      }

      this.element.textContent = scrambledText;
      currentIteration++;

      this.animationFrame = setTimeout(animate, this.options.frameDelay);
    };

    animate();
  }

  stop() {
    if (this.animationFrame) {
      clearTimeout(this.animationFrame);
      this.animationFrame = null;
    }
    this.isAnimating = false;
    this.element.textContent = this.originalText;
  }

  reset() {
    this.stop();
  }
}

export function createScrambler(element, options) {
  return new ScrambleText(element, options);
}

// Document title scrambler - updates document.title with scramble effect
export class ScrambleTitle {
  constructor(options = {}) {
    this.options = {
      duration: options.duration || 200,
      frameDelay: options.frameDelay || 15,
      ...options,
    };
    this.isAnimating = false;
    this.animationFrame = null;
    this.originalTitle = document.title;
  }

  scramble(targetText) {
    if (this.animationFrame) {
      clearTimeout(this.animationFrame);
      this.animationFrame = null;
    }

    const finalText = targetText || this.originalTitle;
    
    // Skip animation if the new text is the same as the current title
    const currentTitle = document.title.trim();
    if (currentTitle === finalText.trim()) {
      return;
    }

    this.isAnimating = true;
    const textLength = finalText.length;
    let currentIteration = 0;
    const totalIterations = Math.ceil(this.options.duration / this.options.frameDelay);

    const animate = () => {
      if (currentIteration >= totalIterations) {
        document.title = finalText;
        this.isAnimating = false;
        this.originalTitle = finalText;
        return;
      }

      const progress = currentIteration / totalIterations;
      const revealedChars = Math.floor(progress * textLength);

      let scrambledText = "";
      for (let i = 0; i < textLength; i++) {
        if (i < revealedChars) {
          scrambledText += finalText[i];
        } else {
          const randomChar = ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
          scrambledText += randomChar;
        }
      }

      document.title = scrambledText;
      currentIteration++;

      this.animationFrame = setTimeout(animate, this.options.frameDelay);
    };

    animate();
  }

  stop() {
    if (this.animationFrame) {
      clearTimeout(this.animationFrame);
      this.animationFrame = null;
    }
    this.isAnimating = false;
    document.title = this.originalTitle;
  }

  reset() {
    this.stop();
  }
}

export function createTitleScrambler(options) {
  return new ScrambleTitle(options);
}
