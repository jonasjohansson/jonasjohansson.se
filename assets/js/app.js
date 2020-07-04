window.addEventListener('load', () => {
    document.body.classList.remove('loading')
})

document.addEventListener('DOMContentLoaded', () => {
    // let transitionItems = document.querySelectorAll('body > * > *')

    // transitionItems.forEach(function (item, i) {
    //     item.classList.add('transition')
    //     item.style.transitionDelay = `${++i * 100}ms`
    //     item.style.transitionDuration = `400ms`
    // })

    const anchors = document.querySelectorAll('a')
    anchors.forEach(a => {
        a.setAttribute('target', '_blank')
        a.setAttribute('rel', 'noreferrer')
    })

    // const videos = document.querySelectorAll('video')
    // videos.forEach(video => {
    //     video.play()
    // })

    /*
    Text Effects
    */

    const effects = document.querySelectorAll('[data-effect]')

    effects.forEach(text => {
        if (text.hasAttribute('data-delay')) {
            const arr = text.textContent.split('')
            const delay = text.getAttribute('data-delay')
            text.innerHTML = ''
            arr.forEach(function (char, i) {
                let span = document.createElement('span')
                span.textContent = char
                // span.className = text.getAttribute('data-effect')
                span.style.animationDelay = `${i++ * delay}ms`
                text.appendChild(span)
            })
        }
    })

    /*
    Currently
    */

    // var currently = document.querySelector('#currently')
    // console.log(currently.childNodes)
    // for (let i = currently.childElementCount; i >= 0; i--) {
    //     currently.appendChild(currently.children[(Math.random() * i) | 0])
    // }

    /*
	Gallery
	*/

    const groups = document.querySelectorAll('.group')

    const slides = document.querySelectorAll('.slide')

    let currGroup = groups[0]
    let currSlide = slides[0]

    show(currGroup)
    show(currSlide)

    const info = document.querySelector('#info')

    slides.forEach(slide => {
        slide.onclick = e => {
            hide(slide)
            if (slide.nextElementSibling === null) {
                console.log('Last slide!')
                let group = slide.parentElement
                hide(group)
                if (group.nextElementSibling === null) {
                    console.log('Last group!')
                    currGroup = groups[0]
                } else {
                    currGroup = group.nextElementSibling
                }
                currSlide = currGroup.firstElementChild
            } else {
                console.log('Next slide!')
                currSlide = slide.nextElementSibling
            }
            show(currGroup)
            show(currSlide)
            info.innerHTML = getInfo(currSlide)
        }
    })

    info.innerHTML = getInfo(currSlide)

    function getInfo(el) {
        let slideIndex = getIndex(el) + 1
        let numSlides = el.parentElement.childElementCount
        let title = el.parentElement.getAttribute('data-title')
        let out = `<span class="title">${title}</span>`
        if (numSlides > 1) {
            out += `<span class="pagination">${slideIndex}/${numSlides}</span>`
        }
        return out
    }

    function getIndex(child) {
        return Array.from(child.parentNode.children).indexOf(child)
    }

    function show(el) {
        el.classList.add('show')
    }

    function hide(el) {
        el.classList.remove('show')
    }

    /*
	Resume
    */

    let entryGroups = document.querySelectorAll('#resume > div')

    entryGroups.forEach(group => {
        if (group.childElementCount >= 4) {
            const heading = group.querySelector('h3')
            group.classList.add('limit')
            heading.onclick = () => {
                group.classList.toggle('show-all')
            }
        }
    })

    let entries = document.querySelectorAll('[data-start]')

    for (let entry of entries) {
        let dateStart = entry.getAttribute('data-start')
        let dateEnd = entry.getAttribute('data-end')

        if (dateStart) {
            entry.setAttribute('data-start-year', dateStart.substr(2, 2))
        } else {
            entry.removeAttribute('data-start')
        }

        if (dateEnd) {
            entry.setAttribute('data-end-year', dateEnd.substr(2, 2))
        } else {
            entry.removeAttribute('data-end')
        }

        const now = new Date()
        const start = new Date(dateStart)
        const end = new Date(dateEnd)
        // if (now < new Date(dateStart)) entry.innerHTML = `&#x2934;&#xFE0E; ${entry.innerHTML}`
        if (now < start) {
            entry.innerHTML = `<span data-no-print>&#x2934;</span> ${entry.innerHTML}`
        } else if (now > start && now < end) {
            entry.innerHTML = `<span data-no-print>&#x21AA;</span> ${entry.innerHTML}`
        }

        // entry.innerHTML = entry.innerHTML
        //     .replace(/(\r\n|\n|\r)/gm, ' ') // remove newlines
        //     .replace(/\s+/g, ' ') // remove multiple spaces
        //     .trim() // remove leading and trailing spaces
    }
})
