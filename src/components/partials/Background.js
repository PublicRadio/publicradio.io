import Vue from 'vue';


const seed = 87667058.69593290 * Math.random();
const maxColumnWidth = 20;

export default Vue.extend({
    template: `<canvas style='width: 100%; height: 100%'/>`,
    ready () {
        renderCanvas(this.$el);
        window.addEventListener('resize', this.resizeFN = () => renderCanvas(this.$el));
    }
})


function renderCanvas (canvas) {
    const width = canvas.width = canvas.clientWidth;
    const height = canvas.height = canvas.clientHeight;
    fillGrid(canvas, makeGrid(width, height));
}

function fillGrid (canvas, grid) {
    const ctx = canvas.getContext('2d');
    for (var i = 0, gridLength = grid.length; i < gridLength; i++) {
        //var x = i / gridLength;
        for (var j = 0, row = grid[i], rowLength = row.length; j < rowLength; j++) {
            var col = row[j];
            let path = new Path2D();
            path.moveTo(col[1], col[2]);
            path.lineTo(col[3], col[4]);
            path.lineTo(col[5], col[6]);

            let brightness = Math.floor(col[0]);
            ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
            ctx.fill(path);
        }
    }
}

function makeGrid (width, height) {
    const grid = [];
    const columnCount = width / maxColumnWidth;
    const columnWidth = width / columnCount;
    const cellHeight = columnWidth / 1.82; //равносторонний треугольник
    const cellCount = Math.ceil(height / cellHeight);

    const extendedColumnWidth = columnWidth + 1;
    const extendedCellHeight = cellHeight + 1;

    for (let x = 0; x <= columnCount; x++)
        for (let y = 0, isOdd = x % 2, row = grid[grid.length] = []; y <= cellCount; y++)
            row.push([Math.floor(Math.abs(Math.sin(seed % (x * y + x + y))) * 25)]
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
                       y * cellHeight + extendedCellHeight]));
    return grid;
}