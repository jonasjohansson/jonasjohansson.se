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
        const effect = text.getAttribute('data-effect')
        const delay = text.getAttribute('data-delay')
        const arr = text.textContent.split('')

        if (delay) {
            text.innerHTML = ''
            arr.forEach(function (char, i) {
                let span = document.createElement('span')
                span.textContent = char
                if (delay > 0) span.style.animationDelay = `${i++ * delay}ms`
                text.appendChild(span)
            })
        }
        if (effect === 'shf') {
            text.addEventListener('mouseenter', e => {
                if (e.target.dataset.triggered === 'true') return
                e.target.dataset.triggered = true
                shuffleText(text, e)
            })
            text.addEventListener('mouseout', function () {})
        }
    })

    const shuffleText = (element, e) => {
        let letters = Array.from(element.children),
            keyCode = letters.map(letter => {
                return letter.textContent.charCodeAt(0)
            }),
            min = Math.min(...keyCode) - 10,
            max = Math.max(...keyCode) + 10,
            cont = 0

        letters.map((letter, index) => {
            let interv = setInterval(() => {
                let randNumber = randomNumber(min, max)

                if (keyCode[index] === randNumber.randNumber) {
                    letter.textContent = String.fromCharCode(keyCode[index])
                    cont++
                    if (cont === letters.length) {
                        e.target.dataset.triggered = false
                    }
                    clearInterval(interv)
                } else {
                    letter.textContent = randNumber.randNumberShow
                }
            }, 20)
        })
    }

    const randomNumber = (min, max) => {
        let randNumber = Math.floor(Math.random() * (max - min) + min),
            randNumberShow = Math.floor(Math.random() * 10)
        return { randNumber, randNumberShow }
    }

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

    const gallery = document.querySelector('#gallery')

    gallery.onclick = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen()
        } else {
            gallery.requestFullscreen()
            // document.documentElement.requestFullscreen()
        }
    }

    // const tempGroups = gallery.querySelectorAll('.group')

    // console.log(tempGroups.length)

    // for (var i = tempGroups.length; i >= 0; i--) {
    //     gallery.appendChild(tempGroups[(Math.random() * i) | 0])
    // }

    const groups = gallery.querySelectorAll('.group')
    const slides = gallery.querySelectorAll('.slide')

    let groupIndex = randomNumber(0, groups.length).randNumber
    let currGroup = groups[groupIndex]
    let currSlide = currGroup.children[0]

    show(currGroup)
    show(currSlide)

    const info = document.querySelector('#info')

    // slides.forEach(slide => {
    //     slide.onclick = e => {
    //         hide(slide)
    //         if (slide.nextElementSibling === null) {
    //             console.log('Last slide!')
    //             let group = slide.parentElement
    //             hide(group)
    //             if (group.nextElementSibling === null) {
    //                 console.log('Last group!')
    //                 currGroup = groups[0]
    //             } else {
    //                 currGroup = group.nextElementSibling
    //             }
    //             currSlide = currGroup.firstElementChild
    //         } else {
    //             console.log('Next slide!')
    //             currSlide = slide.nextElementSibling
    //         }
    //         show(currGroup)
    //         show(currSlide)
    //         info.innerHTML = getInfo(currSlide)
    //     }
    // })

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
            entry.innerHTML = `<span data-no-print>&#x2191;</span> ${entry.innerHTML}`
        } else if (now > start && now < end) {
            entry.innerHTML = `<span data-no-print>&#x2192;</span> ${entry.innerHTML}`
        }

        // entry.innerHTML = entry.innerHTML
        //     .replace(/(\r\n|\n|\r)/gm, ' ') // remove newlines
        //     .replace(/\s+/g, ' ') // remove multiple spaces
        //     .trim() // remove leading and trailing spaces
    }
})
