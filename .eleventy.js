const htmlmin = require('html-minifier')
const CleanCSS = require('clean-css')
const UglifyJS = require('uglify-es')
const Image = require('@11ty/eleventy-img')

const imageFolder = 'assets/images/'

module.exports = function (eleventyConfig) {
    eleventyConfig.addNunjucksAsyncShortcode('gallery', async function (filenames) {
        if (!Array.isArray(filenames)) {
            filenames = new Array(filenames)
        }

        let html = ''

        await asyncForEach(filenames, async filename => {
            let ext = filename.split('.').pop()

            switch (ext) {
                case 'png':
                case 'jpg':
                case 'gif':
                    html += await getImage(filename, ext)
                    break
                case 'mp4':
                    html += getVideo(filename, ext)
                    break
            }
        })

        return html
    })

    eleventyConfig.addNunjucksAsyncShortcode('img', async function (src, outputFormat = 'jpeg') {
        let stats = await Image(imageFolder + src, {
            widths: [null],
            formats: [outputFormat],
            outputDir: 'docs/img/'
        })
        let props = stats[outputFormat].pop()
        return props.url
    })

    async function getImage(src, outputFormat) {
        let stats = await Image(imageFolder + src, {
            widths: [960, null],
            formats: ['jpeg'],
            outputDir: 'docs/img/'
        })

        const alt = ''
        const lowestSrc = stats.jpeg[0]
        const sizes = '100vw'
        const sources = Object.values(stats)
            .map(imageFormat => {
                return `<source type="image/${imageFormat[0].format}" srcset="${imageFormat
                    .map(entry => `${entry.url} ${entry.width}w`)
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

        // let props = stats[outputFormat].pop()
        // return `<img src="${props.url}" width="${props.width}" height="${props.height}">`
    }

    function getVideo(src) {
        return `<video src="videos/${src}" autoplay loop muted playsinline></video>`
    }

    eleventyConfig.addTransform('htmlmin', function (content, outputPath) {
        if (outputPath.endsWith('.html')) {
            let minified = htmlmin.minify(content, {
                useShortDoctype: true,
                removeComments: true,
                collapseWhitespace: true
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

    eleventyConfig.addPassthroughCopy({ 'assets/videos': 'videos' })

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
            output: 'docs'
        }
    }
}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}
