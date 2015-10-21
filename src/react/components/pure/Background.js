import React, {Component} from 'react'
const seed = 87667058.69593290 * Math.random()
const maxColumnWidth = 20

export class Background extends Component {
    renderCanvasBinded = this.renderCanvas.bind(this)
    renderCanvas () {
        const canvas = this.refs.canvas
        fillGrid(canvas, makeGrid(canvas.width = canvas.parentElement.clientWidth, canvas.height = canvas.parentElement.clientHeight))
    }

    componentWillUnmount () {
        window.removeEventListener('resize', this.renderCanvasBinded)
    }

    componentDidMount () {
        this.renderCanvas()
        window.addEventListener('resize', this.renderCanvasBinded)
    }

    render () { return <canvas ref="canvas"/> }
}


function fillGrid (canvas, grid) {
    const ctx = canvas.getContext('2d')
    for (var i = 0, gridLength = grid.length; i < gridLength; i++) {
        for (var j = 0, row = grid[i], rowLength = row.length; j < rowLength; j++) {
            const col = row[j]
            const path = new Path2D()
            const brightness = Math.floor(col[0])

            path.moveTo(col[1], col[2])
            path.lineTo(col[3], col[4])
            path.lineTo(col[5], col[6])

            ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`
            ctx.fill(path)
        }
    }
}

function makeGrid (width, height) {
    const grid = []
    const columnCount = width / maxColumnWidth
    const columnWidth = width / columnCount
    const cellHeight = columnWidth / 1.82 //равносторонний треугольник
    const cellCount = Math.ceil(height / cellHeight)

    const extendedColumnWidth = columnWidth + 1
    const extendedCellHeight = cellHeight + 1

    for (let x = 0; x <= columnCount; x++)
        for (let y = 0, isOdd = x % 2, row = grid[grid.length] = []; y <= cellCount; y++)
            row.push(
                [Math.floor(Math.abs(Math.sin(seed % (x * y + x + y))) * 25)]
                    .concat(
                    (isOdd = !isOdd)
                        ? [x * columnWidth,
                           y * cellHeight,
                           x * columnWidth + extendedColumnWidth,
                           y * cellHeight - extendedCellHeight,
                           x * columnWidth + extendedColumnWidth,
                           y * cellHeight + extendedCellHeight]
                        : [x * columnWidth + extendedColumnWidth,
                           y * cellHeight,
                           x * columnWidth,
                           y * cellHeight - extendedCellHeight,
                           x * columnWidth,
                           y * cellHeight + extendedCellHeight]))
    return grid
}