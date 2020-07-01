document.addEventListener('DOMContentLoaded', () => {
    const anchors = document.querySelectorAll('a')
    anchors.forEach(a => {
        a.setAttribute('target', '_blank')
    })

    const now = new Date()
    const hours = now.getHours()

    // if (hours > 18 || hours < 6) {
    // 	document.documentElement.classList.add('dark')
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
        console.log(group.childElementCount)
        if (group.childElementCount > 6) {
            let fadeEl = document.createElement('div')
        }
    })

    let entries = document.querySelectorAll('[data-start]')

    for (let entry of entries) {
        let dateStart = entry.getAttribute('data-start')
        let dateEnd = entry.getAttribute('data-end')
        entry.setAttribute('data-start-full', dateStart)
        if (dateStart !== '') entry.setAttribute('data-start', dateStart.substr(2, 2))
        if (dateEnd !== '') {
            entry.setAttribute('data-end-full', dateEnd)
            if (dateEnd.length <= 4 && dateEnd.length > 0) entry.setAttribute('data-end', dateEnd.substr(2, 2))
            else entry.removeAttribute('data-end')
        }
        //let dateCheck = dateEnd != null ? dateEnd : dateStart;
        //if (now < new Date(dateCheck))
        if (now < new Date(dateStart)) entry.innerHTML = `&#x2934;&#xFE0E; ${entry.innerHTML}`

        entry.innerHTML = entry.innerHTML
            .replace(/(\r\n|\n|\r)/gm, ' ') // remove newlines
            .replace(/\s+/g, ' ') // remove multiple spaces
            .trim() // remove leading and trailing spaces
    }
})
