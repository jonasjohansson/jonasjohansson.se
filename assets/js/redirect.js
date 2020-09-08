const url = location.href
const id = url ? url.split('?')[1] : location.search.slice(1)
const redirects = {
	undefined: 'https://jonasjohansson.se/',
	vrscifest: 'https://jonasjohansson.github.io/virtualdancer/ar',
	vrscifestbeckmans: 'https://jonasjohansson.se/test'
}
location.href = redirects[id]
