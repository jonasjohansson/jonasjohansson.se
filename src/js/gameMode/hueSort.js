// Hue-based sorting for color gradient strip ordering

export function hexToHSL(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function sortByHue(stripElements, projectsData) {
  const colorMap = new Map();
  for (const p of projectsData) {
    if (p.color) colorMap.set(p.slug, p.color);
  }

  return [...stripElements].sort((a, b) => {
    const slugA = a.getAttribute("data-project");
    const slugB = b.getAttribute("data-project");
    const colorA = colorMap.get(slugA);
    const colorB = colorMap.get(slugB);

    if (!colorA && !colorB) return 0;
    if (!colorA) return 1;
    if (!colorB) return -1;

    const hslA = hexToHSL(colorA);
    const hslB = hexToHSL(colorB);

    if (!hslA && !hslB) return 0;
    if (!hslA) return 1;
    if (!hslB) return -1;

    return hslA.h - hslB.h;
  });
}
