const url = location.href;
const id = url ? url.split('?')[1] : location.search.slice(1);

if (id) {
	switch (id) {
		case 'vrsci':
			location.href = 'https://jonasjohansson.github.io/virtualdancer/ar';
			break;
		case 'vrscifest':
			location.href = 'https://jonasjohansson.github.io/virtualdancer/ar';
			break;
		case 'vrscifestbeckmans':
			location.href = 'https://jonasjohansson.se/';
			break;
		case '1':
			location.href = 'https://jonasjohansson.github.io/vista/ar/';
			break;
		case '2':
			location.href = 'https://aavistus.glitch.me/';
			break;
		case '3':
			location.href = 'https://markuskyrkan.glitch.me/';
			break;
		case '4':
			location.href = 'https://jonasjohansson.github.io/vista/ar/';
			break;
		case '5':
			location.href = 'https://www.instagram.com/ar/386247699446530/';
			break;
		case '6':
			location.href = 'https://www.instagram.com/ar/660719167804465/';
			break;
		default:
			location.href = location.origin;
			break;
	}
}
