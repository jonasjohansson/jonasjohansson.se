const url = location.href
const id = url ? url.split('?')[1] : location.search.slice(1)
const redirects = {
	undefined: 'https://jonasjohansson.se/',
	vrsci: 'https://jonasjohansson.github.io/virtualdancer/ar',
	vrscifest: 'https://jonasjohansson.github.io/virtualdancer/ar',
	vrscifestbeckmans: 'https://jonasjohansson.se/'

}

if (id !== undefined) {
  alert(redirects[id])
  // location.href = redirects[id]
}
