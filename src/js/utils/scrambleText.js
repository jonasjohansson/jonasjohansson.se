const ASCII_CHARS = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export class ScrambleText {
  constructor(element, options = {}) {
    this.element = element;
    this.originalText = element.textContent;
    this.options = {
      duration: options.duration || 800,
      charactersPerFrame: options.charactersPerFrame || 1,
      frameDelay: options.frameDelay || 30,
      ...options,
    };
    this.isAnimating = false;
    this.animationFrame = null;
  }

  scramble(targetText) {
    if (this.animationFrame) {
      clearTimeout(this.animationFrame);
      this.animationFrame = null;
    }

    const finalText = targetText || this.originalText;
    
    // Skip animation if the new text is the same as the current text
    const currentText = this.element.textContent.trim();
    if (currentText === finalText.trim()) {
      return;
    }

    this.isAnimating = true;
    const textLength = finalText.length;
    let currentIteration = 0;
    const totalIterations = Math.ceil(this.options.duration / this.options.frameDelay);

    const animate = () => {
      if (currentIteration >= totalIterations) {
        this.element.textContent = finalText;
        this.isAnimating = false;
        this.originalText = finalText;
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
