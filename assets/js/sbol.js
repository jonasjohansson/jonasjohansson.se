var SBOL = {
    shapes: [
        // { name: '3 Overhang Sticky End', path: '<path d="M50,61.5H6.5"/><path d="M6.5,38.3h87"/>' },
        {
            name: '3 Sticky Restriction Site',
            path: '<path d="M93.5,12.2V49.9H6.5V87.6"/>'
        },
        // { name: '5 Overhang Sticky End', path: '<path d="M6.5,38.3h87"/><path d="M50,61.5H93.5"/>' },
        {
            name: '5 Sticky Restriction Site',
            path: '<path d="M6.5,12.2V49.9h87V87.6"/>'
        },
        // { name: 'Alternate CDS', path: '<path d="M70.42,21.79,97.24,49.9,70.31,78.12l-.31-10-.06-1.94H68L2,66.36V35.74l66.3.3h2l0-2,.11-12.27m-2-4.95L68.31"/>' },
        { name: 'Alternate DNA Location', path: '<path d="M50,85.39V16"/>' },
        // {
        //     name: 'Assembly Scar',
        //     path: '<path d="M15.08,38.3H84.67"/><path d="M15.08,61.5H84.67"/>'
        // },
        // {
        //     name: 'DNA Cleavage Site',
        //     path:
        //         '<path d="M50,99.19V26.69"/><path d="M26.8,3.49l46.4,46.4"/><path d="M73.2,3.49,26.8,49.89"/><path d="M-32.39,18.84-2.76,49.9-32.39,81H-98V18.84h65.61m.85-2H-100V83h68.46L0,49.9-31.54,16.84Z"/>'
        // },
        // { name: 'Insulator', path: '<path d="M91.49,8.4v83h-83V8.4h83m2"/>' },
        { name: 'Operator', path: '<path d="M21,21V79H79V21"/>' },
        // {
        //     name: 'ORI',
        //     path: '<path d="M50,17.1A32.8,32.8,0,1,1,17.2,49.9,32.84,32.84,0,0,1,50,17.1m0-2A34.8,34.8,0"/>'
        // },
        {
            name: 'Primer Binding Site',
            path: '<path d="M12.33,60.87h75.4l-29-20.3"/>'
        },
        {
            name: 'Promoter',
            path: '<path d="M6.5,99.91V21.61H90.6"/><path d="M67.41,1.62l23.19,20-23.19,20"/>'
        },
        // {
        //     name: 'Ribosome Entry Site',
        //     path:
        //         '<path d="M50,22.9c9.85,0,18.73,3.64,25,10.25C82,40.51,85.7,51.32,85.7,64.4V76.9H14.3V64.4C14.3,51.32,18,40.51,25,33.15,31.27,26.54,40.15,22.9,50,22.9m0-2c-20.3"/>'
        // },
        {
            name: 'Terminator',
            path: '<path d="M50,86.11V16.52"/><path d="M6.5,16.52h87"/>'
        }
    ],
    // colors: ['#c71881', '#f6937e', '#2a255f'],
    colors: ['#ffffff'],
    range: {
        x: [10, 90],
        y: [10, 90]
    },
    size: [10, 10],
    strokeWidth: 4,
    count: 0,
    wait: 4000,
    alive: 8000,
    fade: 1000,
    wrap: null,
    index: 0
}

document.addEventListener('DOMContentLoaded', () => {
    // var el = document.createElement('div')
    // el.id = 'svg'
    // document.body.appendChild(el)
    // SBOL.wrap = el
    SBOL.wrap = document.body
    setInterval(() => {
        addShape()
    }, SBOL.wait)
})

function addShape() {
    if (SBOL.count >= SBOL.shapes.length) return

    const shape = createShape(SBOL.index)
    const paths = shape.querySelectorAll('path')
    const color = SBOL.colors[random(0, SBOL.colors.length - 1)]
    const size = random(SBOL.size[0], SBOL.size[1])
    shape.style.width = size + '%'

    for (var path of paths) {
        length = path.getTotalLength()
        path.setAttribute('data-length', length)
        path.setAttribute('stroke', color)
        // path.setAttribute('stroke-miterlimit', 10);
        path.setAttribute('fill', 'none')
        path.setAttribute('stroke-width', SBOL.strokeWidth)
        path.style.strokeDasharray = length
        path.style.strokeDashoffset = length
        path.getBoundingClientRect()
    }

    var [x, y] = getPos()

    shape.style.left = x + '%'
    shape.style.top = y + '%'
    shape.style.marginLeft = size / -2 + '%'
    shape.style.marginTop = size / -2 + '%'

    SBOL.wrap.appendChild(shape)

    var removeTimeout = setTimeout(() => {
        if (shape.classList.contains('fade')) return
        remove(shape)
    }, SBOL.alive)

    // shape.addEventListener('mouseover', () => {
    //     if (shape.classList.contains('fade')) return
    //     remove(shape)
    //     setTimeout(() => {
    //         addShape(index)
    //     }, SBOL.fade)
    // })

    function remove(shape) {
        shape.classList.add('fade')
        setTimeout(function () {
            removeMe(shape)
            SBOL.count--
            // var index = random(0, SBOL.shapes.length - 1)
        }, SBOL.fade)
    }

    if (SBOL.index < SBOL.shapes.length - 1) {
        SBOL.index++
    } else {
        SBOL.index = 0
    }

    SBOL.count++
}

function removeMe(el) {
    el.parentNode.removeChild(el)
}

function getPos() {
    const xMin = SBOL.range.x[0]
    const xMax = SBOL.range.x[1]
    const yMin = SBOL.range.y[0]

    SBOL.range.y[1] = Math.round((document.documentElement.scrollHeight / window.innerHeight) * 100)

    const yMax = SBOL.range.y[1]

    var x = random(xMin, xMax)
    var y = random(yMin, yMax)

    return [x, y]
}

function createShape(index) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', `0 0 100 100`)
    var shape = SBOL.shapes[index]
    svg.innerHTML = shape.path
    return svg
}

function random(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}
