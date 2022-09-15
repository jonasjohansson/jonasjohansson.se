const htmlmin = require('html-minifier')
const CleanCSS = require('clean-css')
const UglifyJS = require('uglify-es')
const Image = require('@11ty/eleventy-img')

module.exports = function (eleventyConfig) {
	eleventyConfig.addNunjucksAsyncShortcode('gallery', async function (filenames) {
		if (!Array.isArray(filenames)) {
			filenames = new Array(filenames)
		}

		let html = ''

		await asyncForEach(filenames, async (filename) => {
			let ext = filename.split('.').pop()
			html += ext === 'mp4' ? await video(filename) : await img(filename)
		})

		return html
	})

	eleventyConfig.addNunjucksAsyncShortcode('img', async function (path) {
		const props = await optimImg(path)
		return props.url
	})

	async function video(src) {
		return `<video width="960" height="540" src="assets/video/${src}" autoplay loop muted playsinline></video>`
	}

	async function img(path) {
		if (path.includes('http')) {
			return `<img src="${path}">`
		} else {
			const props = await optimImg(path)
			return `<img src="${props.url}">`
		}
	}

	async function fig(path, caption = '') {
		const props = await optimImg(path)
		return `<figure><img src="${props.url}"><figcaption>${caption}</figcaption></figure>`
	}

	async function pic(path) {
		const stats = await optimImg(path, { widths: [960, null] })
		const alt = ''
		const lowestSrc = stats.jpeg[0]
		const sizes = '100vw'
		const sources = Object.values(stats)
			.map((imageFormat) => {
				return `<source type="img/${imageFormat[0].format}" srcset="${imageFormat
					.map((entry) => `${entry.url} ${entry.width}w`)
					.join(', ')}" sizes="${sizes}">`
			})
			.join('\n')

		return `
        <picture>${sources}
            <img
                alt="${alt}"
                src="${lowestSrc.url}"
                width="${lowestSrc.width}"
                height="${lowestSrc.height}">
        </picture>`
	}

	async function optimImg(path, opts = {}) {
		const widths = opts.hasOwnProperty('widths') ? opts.widths : [null]
		var outputFormat = opts.hasOwnProperty('outputFormat') ? opts.outputFormat : path.split('.').pop()
		let stats = await Image(`./assets/img/` + path, {
			widths: widths,
			formats: outputFormat,
			urlPath: '/assets/img',
			outputDir: './docs/assets/img',
		})
		outputFormat = Object.keys(stats)[0]
		if (widths.length > 1) return stats
		else return stats[outputFormat].pop()
	}

	eleventyConfig.addTransform('htmlmin', function (content, outputPath) {
		if (outputPath.endsWith('.html')) {
			let minified = htmlmin.minify(content, {
				useShortDoctype: true,
				removeComments: true,
				collapseWhitespace: true,
			})
			return minified
		}
		return content
	})

	eleventyConfig.addFilter('cssmin', function (code) {
		return new CleanCSS({}).minify(code).styles
	})

	eleventyConfig.addFilter('jsmin', function (code) {
		return UglifyJS.minify(code).code
	})

	eleventyConfig.addPassthroughCopy({ 'assets/fonts': 'assets/fonts' })
	eleventyConfig.addPassthroughCopy({ 'assets/video': 'assets/video' })

	return {
		templateFormats: ['css', 'json', 'md', 'njk', 'html', 'liquid'],
		pathPrefix: '/',
		markdownTemplateEngine: 'liquid',
		htmlTemplateEngine: 'njk',
		dataTemplateEngine: 'njk',
		passthroughFileCopy: true,
		dir: {
			input: '.',
			includes: 'data',
			data: 'data',
			output: 'docs',
		},
	}
}

async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array)
	}
}

