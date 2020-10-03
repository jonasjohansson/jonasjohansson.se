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
      location.href = 'https://www.instagram.com/ar/246383379934365/'
      break
    case '2':
      location.href = 'https://aavistus.glitch.me/'
      break
    default:
      location.href = location.origin
      break
  }
}
