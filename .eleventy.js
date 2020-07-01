const htmlmin = require('html-minifier')
const CleanCSS = require('clean-css')
const UglifyJS = require('uglify-es')

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

    eleventyConfig.addFilter('gallery', function (filename) {
        let out = ''

        if (Array.isArray(filename)) {
            filename.forEach(fname => {
                out += _ext(fname)
            })
        } else {
            out += _ext(filename)
        }

        return out
    })

    function _ext(fname) {
        let ext = fname.split('.').pop()
        switch (ext) {
            case 'png':
            case 'jpg':
            case 'gif':
                return _img(fname)
            case 'mp4':
                return _video(fname)
        }
    }

    function _img(src) {
        return `<img src="images/${src}">`
    }
    function _video(src) {
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
