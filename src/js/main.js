import { initializeStrips, updateStrips } from './strips.js';
import { router } from './router.js';
import { mountMedia } from './media.js';
import { initTheme } from './theme.js';
import { initPrint } from './print.js';
import { initializeHome, updateHome } from './home.js';

initTheme();
initPrint();
initializeStrips();
initializeHome();
router.init(slug => { updateHome(slug); updateStrips(slug); });
mountMedia(document.getElementById('projects'));
