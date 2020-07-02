const htmlmin = require('html-minifier')
const CleanCSS = require('clean-css')
const UglifyJS = require('uglify-es')
const Image = require('@11ty/eleventy-img')

module.exports = function (eleventyConfig) {
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

    // https://github.com/11ty/eleventy-img
    // https://www.11ty.dev/docs/languages/nunjucks/#shortcodes
    eleventyConfig.addNunjucksAsyncShortcode('gallery', async function (filenames) {
        // turn filename into array of filename(s)
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

    async function getImage(src, outputFormat) {
        const alt = ''
        src = 'assets/images/' + src
        let stats = await Image(src, {
            widths: [960, null],
            formats: ['jpeg'],
            outputDir: 'docs/img/'
        })

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
        return `<video src="videos/${src}" autoplay loop muted></video>`
    }

    eleventyConfig.addFilter('cssmin', function (code) {
        return new CleanCSS({}).minify(code).styles
    })

    eleventyConfig.addFilter('jsmin', function (code) {
        let minified = UglifyJS.minify(code)
        if (minified.error) {
            console.log('UglifyJS error: ', minified.error)
            return code
        }
        return minified.code
    })

    // eleventyConfig.addPassthroughCopy('img')

    return {
        templateFormats: ['css', 'json', 'md', 'njk', 'html', 'liquid'],

        // If your site lives in a different subdirectory, change this.
        // Leading or trailing slashes are all normalized away, so don’t worry about it.
        // If you don’t have a subdirectory, use "" or "/" (they do the same thing)
        // This is only used for URLs (it does not affect your file structure)
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
