import { initializeStrips, updateStrips, resetFilters } from './strips.js';
import { router } from './router.js';
import { mountMedia } from './media.js';
import { initPrint } from './print.js';
import { initializeHome, updateHome } from './home.js';

initPrint();
initializeStrips();
initializeHome();
router.init((slug, { resetFilters: reset } = {}) => { updateHome(slug); if (reset) resetFilters(); updateStrips(slug); });
mountMedia(document.getElementById('projects'));
