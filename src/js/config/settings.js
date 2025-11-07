// Centralized settings for application behavior

export const SETTINGS = {
  animation: {
    easeFactor: 0.18,
    idleThresholdFrames: 60,
    stripInitialDelayStep: 25, // matches CSS animation-delay per strip
    stripInitialDuration: 400,
    stripAppendDelayStep: 12, // delay between appending strips for staggered animation
  },
  images: {
    loadMargin: "200px",
  },
};
