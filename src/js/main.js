import { initializeStrips, updateStrips } from './strips.js';
import { router } from './router.js';
import { mountMedia } from './media.js';
import { initTheme } from './theme.js';

initTheme();
initializeStrips();
router.init(updateStrips);
mountMedia(document.getElementById('projects'));
