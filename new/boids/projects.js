// projects.js — generate 30 projects from a small image pool.
// Swap these URLs with your own hero/additional images if you want.

const pool = [
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1600&auto=format",
  "https://images.unsplash.com/photo-1502005229762-cf1b2da7c9fb?q=80&w=1600&auto=format",
  "https://images.unsplash.com/photo-1499002238440-d264edd596ec?q=80&w=1600&auto=format",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1600&auto=format",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=1600&auto=format",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1600&auto=format",
  "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1600&auto=format",
];

function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

export const projects = Array.from({ length: 30 }, (_, i) => {
  const hero = pick(pool);
  const images = Array.from({ length: 2 }, () => pick(pool));
  return {
    title: `Project ${i + 1}`,
    description: "Generated demo project item.",
    hero,
    images,
  };
});
