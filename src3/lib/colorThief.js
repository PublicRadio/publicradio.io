/*original code by Lokesh Dhakar: https://github.com/null2/color-thief/blob/master/js/color-thief.js*/



/*
 * getColor(sourceImage[, quality])
 * returns {r: num, g: num, b: num}
 *
 * Use the median cut algorithm provided by quantize.js to cluster similar
 * colors and return the base color from the largest cluster.
 *
 * Quality is an optional argument. It needs to be an integer. 0 is the highest quality settings.
 * 10 is the default. There is a trade-off between quality and speed. The bigger the number, the
 * faster a color will be returned but the greater the likelihood that it will not be the visually
 * most dominant color.
 *
 * Use the median cut algorithm provided by quantize.js to cluster similar colors.
 *
 * quality is an optional argument. It needs to be an integer. 0 is the highest quality settings.
 * 10 is the default. There is a trade-off between quality and speed. The bigger the number, the
 * faster the palette generation but the greater the likelihood that colors will be missed.
 *
 * BUGGY: Function does not always return the requested amount of colors. It can be +/- 2.
 * */

const canvas = document.createElement('canvas');
const channelCount = 4;
export function colorThief (sourceImage, {step = 10, allowWhite = false, expectTransparent = false, colorCount = 5}) {


    this.canvas.width = image.width;
    this.canvas.height = image.height;
    const context = canvas.getContext('2d');

    context.drawImage(image, 0, 0, image.width, image.height);
    const {data: pixels} = context.getImageData(0, 0, image.width, image.height);
    const pixelCount = image.width * image.height;
    const offsetMaxValue = pixelCount * channelCount;
    const offsetStep = step * channelCount;
    const colorThreshold = allowWhite ? 255 : 250;
    // Store the RGB values in an array format suitable for quantize function
    const pixelArray = [];
    /*removing O(n) check time of if (pixels[offset + 3] >= 125) for cases when we do not expect transparent colors*/
    (expectTransparent
        ? function () {
        for (var offset = 0; offset < offsetMaxValue; offset += offsetStep)
            if (pixels[offset + 3] >= 125)
                if (pixels[offset] <= colorThreshold ||
                    pixels[offset + 1] <= colorThreshold ||
                    pixels[offset + 2] > colorThreshold)
                    pixelArray.push(pixels.slice(pixels, offset, 3));
    }
        : function () {
        for (var offset = 0; offset < offsetMaxValue; offset += offsetStep)
            if (pixels[offset] <= colorThreshold ||
                pixels[offset + 1] <= colorThreshold ||
                pixels[offset + 2] > colorThreshold)
                pixelArray.push(pixels.slice(pixels, offset, 3));
    })();

    // Send array to quantize function which clusters values
    // using median cut algorithm
    return quantize(pixelArray, colorCount).palette();
}


/*!
 * quantize.js Copyright 2008 Nick Rabinowitz.
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 */

// fill out a couple protovis dependencies
/*!
 * Block below copied from Protovis: http://mbostock.github.com/protovis/
 * Copyright 2010 Stanford Visualization Group
 * Licensed under the BSD License: http://www.opensource.org/licenses/bsd-license.php
 */
var pv = {
    map         : (array, f, o = {}) => f
        ? array.map((d, index) => f.call(Object.assign(o, {index}), d))
        : array.slice(),
    naturalOrder: (a, b) => (a < b) ? -1 : ((a > b) ? 1 : 0),
    sum         : (array, f, o = {}) => array.reduce(f
        ? (p, d, i) => p + f.call(Object.assign(o, {index}), d)
        : (p, d) => p + d, 0),
    max         : (array, f) => Math.max.apply(null, f ? pv.map(array, f) : array)
};

/**
 * Basic Javascript port of the MMCQ (modified median cut quantization)
 * algorithm from the Leptonica library (http://www.leptonica.com/).
 * Returns a color map you can use to map original pixels to the reduced
 * palette. Still a work in progress.
 *
 * @author Nick Rabinowitz
 * @example

 // array of pixels as [R,G,B] arrays
 var myPixels = [[190,197,190], [202,204,200], [207,214,210], [211,214,211], [205,207,207]
 // etc
 ];
 var maxColors = 4;

 var cmap = MMCQ.quantize(myPixels, maxColors);
 var newPalette = cmap.palette();
 var newPixels = myPixels.map(function(p) {
    return cmap.map(p);
});

 */

var quantize = (function () {
    // private constants
    var sigbits = 5,
        rshift = 8 - sigbits,
        maxIterations = 1000,
        fractByPopulations = 0.75;

    // get reduced-space color index for a pixel
    function getColorIndex (r, g, b) { return (r << (2 * sigbits)) + (g << sigbits) + b; }

    // Simple priority queue
    class PQueue {
        contents = [];
        sorted = false;

        constructor (comparator) {
            this.comparator = comparator;
        }

        sort () {
            this.contents.sort(this.comparator);
            this.sorted = true;
        }

        push (o) {
            this.contents.push(o);
            this.sorted = false;
        }

        peek (index) {
            if (!this.sorted) sort();
            if (index === undefined) index = this.contents.length - 1;
            return this.contents[index];
        }

        pop () {
            if (!this.sorted) sort();
            return this.contents.pop();
        }

        size () { return this.contents.length; }

        map (f) { return this.contents.map(f); }

        debug () {
            if (!this.sorted) sort();
            return this.contents;
        }
    }

    // 3d color space box
    class VBox {
        constructor (r1, r2, g1, g2, b1, b2, histo) {
            Object.assign(this, {r1, r2, g1, g2, b1, b2, histo});
        }

        volume (force) {
            if (!this._volume || force)
                this._volume = ((this.r2 - this.r1 + 1) * (this.g2 - this.g1 + 1) * (this.b2 - this.b1 + 1));

            return this._volume;
        }

        count (force) {
            var histo = this.histo;
            if (!this._count_set || force) {
                var npix = 0,
                    i, j, k;
                for (i = this.r1; i <= this.r2; i++) {
                    for (j = this.g1; j <= this.g2; j++) {
                        for (k = this.b1; k <= this.b2; k++) {
                            var index = getColorIndex(i, j, k);
                            npix += (histo[index] || 0);
                        }
                    }
                }
                this._count = npix;
                this._count_set = true;
            }
            return this._count;
        }

        copy () {
            return new VBox(this.r1, this.r2, this.g1, this.g2, this.b1, this.b2, this.histo);
        }

        avg (force) {
            var histo = this.histo;
            if (!this._avg || force) {
                var ntot = 0,
                    mult = 1 << (8 - sigbits),
                    rsum = 0,
                    gsum = 0,
                    bsum = 0,
                    hval,
                    i, j, k, histoindex;
                for (i = this.r1; i <= this.r2; i++) {
                    for (j = this.g1; j <= this.g2; j++) {
                        for (k = this.b1; k <= this.b2; k++) {
                            histoindex = getColorIndex(i, j, k);
                            hval = histo[histoindex] || 0;
                            ntot += hval;
                            rsum += (hval * (i + 0.5) * mult);
                            gsum += (hval * (j + 0.5) * mult);
                            bsum += (hval * (k + 0.5) * mult);
                        }
                    }
                }
                if (ntot) {
                    this._avg = [~~(rsum / ntot), ~~(gsum / ntot), ~~(bsum / ntot)];
                } else {
                    //                    console.log('empty box');
                    this._avg = [
                        ~~(mult * (this.r1 + this.r2 + 1) / 2),
                        ~~(mult * (this.g1 + this.g2 + 1) / 2),
                        ~~(mult * (this.b1 + this.b2 + 1) / 2)
                    ];
                }
            }
            return this._avg;
        }

        contains (pixel) {
            var rval = pixel[0] >> rshift;
            var gval = pixel[1] >> rshift;
            var bval = pixel[2] >> rshift;
            return (rval >= this.r1 && rval <= this.r2 &&
            gval >= this.g1 && gval <= this.g2 &&
            bval >= this.b1 && bval <= this.b2);
        }
    }

    // Color map
    class CMap {
        vboxes = new PQueue((a, b) => pv.naturalOrder(
            a.vbox.count() * a.vbox.volume(),
            b.vbox.count() * b.vbox.volume()));

        push (vbox) { this.vboxes.push({vbox, color: vbox.avg()}); }

        palette () { return this.vboxes.map(function (vb) { return vb.color }); }

        size () { return this.vboxes.size(); }

        map (color) {
            var vboxes = this.vboxes;
            for (var i = 0; i < vboxes.size(); i++) {
                if (vboxes.peek(i).vbox.contains(color)) {
                    return vboxes.peek(i).color;
                }
            }
            return this.nearest(color);
        }

        nearest (color) {
            var vboxes = this.vboxes,
                d1, d2, pColor;
            for (var i = 0; i < vboxes.size(); i++) {
                d2 = Math.sqrt(
                    Math.pow(color[0] - vboxes.peek(i).color[0], 2) +
                    Math.pow(color[1] - vboxes.peek(i).color[1], 2) +
                    Math.pow(color[2] - vboxes.peek(i).color[2], 2)
                );
                if (d2 < d1 || d1 === undefined) {
                    d1 = d2;
                    pColor = vboxes.peek(i).color;
                }
            }
            return pColor;
        }
    }


    // histo (1-d array, giving the number of pixels in
    // each quantized region of color space), or null on error
    function getHisto (pixels) {
        var histosize = 1 << (3 * sigbits),
            histo = new Array(histosize),
            index, rval, gval, bval;
        pixels.forEach(function (pixel) {
            rval = pixel[0] >> rshift;
            gval = pixel[1] >> rshift;
            bval = pixel[2] >> rshift;
            index = getColorIndex(rval, gval, bval);
            histo[index] = (histo[index] || 0) + 1;
        });
        return histo;
    }

    function vboxFromPixels (pixels, histo) {
        var rmin = 1000000, rmax = 0,
            gmin = 1000000, gmax = 0,
            bmin = 1000000, bmax = 0,
            rval, gval, bval;
        // find min/max
        pixels.forEach(function (pixel) {
            rval = pixel[0] >> rshift;
            gval = pixel[1] >> rshift;
            bval = pixel[2] >> rshift;
            if (rval < rmin) rmin = rval;
            else if (rval > rmax) rmax = rval;
            if (gval < gmin) gmin = gval;
            else if (gval > gmax) gmax = gval;
            if (bval < bmin) bmin = bval;
            else if (bval > bmax)  bmax = bval;
        });
        return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, histo);
    }

    function medianCutApply (histo, vbox) {
        if (!vbox.count()) return;

        var rw = vbox.r2 - vbox.r1 + 1,
            gw = vbox.g2 - vbox.g1 + 1,
            bw = vbox.b2 - vbox.b1 + 1,
            maxw = pv.max([rw, gw, bw]);
        // only one pixel, no split
        if (vbox.count() == 1) {
            return [vbox.copy()]
        }
        /* Find the partial sum arrays along the selected axis. */
        var total = 0,
            partialsum = [],
            lookaheadsum = [],
            i, j, k, sum, index;
        if (maxw == rw) {
            for (i = vbox.r1; i <= vbox.r2; i++) {
                sum = 0;
                for (j = vbox.g1; j <= vbox.g2; j++) {
                    for (k = vbox.b1; k <= vbox.b2; k++) {
                        index = getColorIndex(i, j, k);
                        sum += (histo[index] || 0);
                    }
                }
                total += sum;
                partialsum[i] = total;
            }
        }
        else if (maxw == gw) {
            for (i = vbox.g1; i <= vbox.g2; i++) {
                sum = 0;
                for (j = vbox.r1; j <= vbox.r2; j++) {
                    for (k = vbox.b1; k <= vbox.b2; k++) {
                        index = getColorIndex(j, i, k);
                        sum += (histo[index] || 0);
                    }
                }
                total += sum;
                partialsum[i] = total;
            }
        }
        else {  /* maxw == bw */
            for (i = vbox.b1; i <= vbox.b2; i++) {
                sum = 0;
                for (j = vbox.r1; j <= vbox.r2; j++) {
                    for (k = vbox.g1; k <= vbox.g2; k++) {
                        index = getColorIndex(j, k, i);
                        sum += (histo[index] || 0);
                    }
                }
                total += sum;
                partialsum[i] = total;
            }
        }
        partialsum.forEach(function (d, i) {
            lookaheadsum[i] = total - d
        });
        function doCut (color) {
            var dim1 = color + '1',
                dim2 = color + '2',
                left, right, vbox1, vbox2, d2, count2 = 0;
            for (i = vbox[dim1]; i <= vbox[dim2]; i++) {
                if (partialsum[i] > total / 2) {
                    vbox1 = vbox.copy();
                    vbox2 = vbox.copy();
                    left = i - vbox[dim1];
                    right = vbox[dim2] - i;
                    if (left <= right)
                        d2 = Math.min(vbox[dim2] - 1, ~~(i + right / 2));
                    else d2 = Math.max(vbox[dim1], ~~(i - 1 - left / 2));
                    // avoid 0-count boxes
                    while (!partialsum[d2]) d2++;
                    count2 = lookaheadsum[d2];
                    while (!count2 && partialsum[d2 - 1]) count2 = lookaheadsum[--d2];
                    // set dimensions
                    vbox1[dim2] = d2;
                    vbox2[dim1] = vbox1[dim2] + 1;
                    //                    console.log('vbox counts:', vbox.count(), vbox1.count(), vbox2.count());
                    return [vbox1, vbox2];
                }
            }

        }

        // determine the cut planes
        return maxw == rw
            ? doCut('r')
            : maxw == gw
                   ? doCut('g')
                   : doCut('b');
    }

    return function quantize (pixels, maxcolors) {
        // short-circuit
        if (!pixels.length || maxcolors < 2 || maxcolors > 256) {
            //            console.log('wrong number of maxcolors');
            return false;
        }

        // XXX: check color content and convert to grayscale if insufficient

        var histo = getHisto(pixels);

        // check that we aren't below maxcolors already
        var nColors = histo.length;
        if (nColors <= maxcolors) {
            // XXX: generate the new colors from the histo and return
        }

        // get the beginning vbox from the colors
        var vbox = vboxFromPixels(pixels, histo),
            pq = new PQueue(function (a, b) { return pv.naturalOrder(a.count(), b.count()) });
        pq.push(vbox);

        // inner function to do the iteration
        function iter (lh, target) {
            var ncolors = 1,
                niters = 0,
                vbox;
            while (niters < maxIterations) {
                vbox = lh.pop();
                if (!vbox.count()) { /* just put it back */
                    lh.push(vbox);
                    niters++;
                    continue;
                }
                // do the cut
                var vboxes = medianCutApply(histo, vbox),
                    vbox1 = vboxes[0],
                    vbox2 = vboxes[1];

                if (!vbox1) {
                    //                    console.log("vbox1 not defined; shouldn't happen!");
                    return;
                }
                lh.push(vbox1);
                if (vbox2) {  /* vbox2 can be null */
                    lh.push(vbox2);
                    ncolors++;
                }
                if (ncolors >= target) return;
                if (niters++ > maxIterations) {
                    //                    console.log("infinite loop; perhaps too few pixels!");
                    return;
                }
            }
        }

        // first set of colors, sorted by population
        iter(pq, fractByPopulations * maxcolors);

        // Re-sort by the product of pixel occupancy times the size in color space.
        var pq2 = new PQueue(function (a, b) {
            return pv.naturalOrder(a.count() * a.volume(), b.count() * b.volume())
        });
        while (pq.size()) {
            pq2.push(pq.pop());
        }

        // next set - generate the median cuts using the (npix * vol) sorting.
        iter(pq2, maxcolors - pq2.size());

        // calculate the actual colors
        var cmap = new CMap();
        while (pq2.size()) {
            cmap.push(pq2.pop());
        }

        return cmap;
    }
})();