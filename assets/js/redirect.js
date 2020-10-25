const url = location.href
const id = url ? url.split('?')[1] : location.search.slice(1)

if (id) {
	switch (id) {
		case 'vrsci':
			location.href = 'https://jonasjohansson.github.io/virtualdancer/ar'
			break
		case 'vrscifest':
			location.href = 'https://jonasjohansson.github.io/virtualdancer/ar'
			break
		case 'vrscifestbeckmans':
			location.href = 'https://jonasjohansson.se/'
			break
		case '1':
			alert(
				'The following experience uses the Instagram app, and requires that it is installed. Functionality and experience may vary depending on your device.'
			)
			location.href = 'https://www.instagram.com/ar/246383379934365/'
			break
		case '2':
			location.href = 'https://aavistus.glitch.me/'
			break
		case '3':
			location.href = 'https://markuskyrkan.glitch.me/'
			break
		case '4':
			alert(
				'Du skickas nu till en Augmented Reality-effekt på Instagram. För att effekten ska fungera behöver ditt Instagram vara uppdaterat, och du behöver ställa dig så att hela tyget syns i kameran. Det finns 3 effekter: SKREA, HIDE och UNNA. Börja med SKREA, och kika sedan på de andra. Kram, Jonas Johansson.'
			)
			location.href = 'https://www.instagram.com/ar/396483261746904/'
			break
		default:
			location.href = location.origin
			break
	}
}
