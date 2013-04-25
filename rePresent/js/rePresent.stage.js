/** Slides display class. */
RePresent.Stage = function() {
    // SVG viewbox
    var vBox = {};
    var conf;
    var MODES = {
        slide: 0, // presentation mode
        index: 1 // slides index view
    };
    // important nodes
    var e = {
        'raster': null,
        'slidesStack': RePresent.Util.e.slidesStack
    };
    // current display mode
    var mode = MODES.slide;
    // stores parent -> child association to properly show stacked parts
    var nodes = {
        lastParent: null, // parent of current shown slide
        // children (parts) of the parent of the current slide wich are visible
        visible: new Array()
    };
    // slides index & state
    var slides = {};
    // index state
    var index = {};

    this.init = function(config) {
        conf = config;
        var viewBox = RePresent.Util.getViewBoxDimension();
        vBox.width = viewBox[0];
        vBox.height = viewBox[1];
        mode = MODES.slide;

        // create a custom layer
        e.root = document.createElementNS(RePresent.Util.NSS['svg'], 'g');
        RePresent.Util.Element.setAttributes(e.slidesStack, {
            style: {
                transition:"transform 4s"
            }
        })
        e.root.id = 'rePresent-slides-index';
        document.documentElement.appendChild(e.root);

        // gather all slides
        slides.all = RePresent.Util.e.slidesStack.getElementsByTagName('use');

        // collect ids of full slides (parts merged)
        var fullSlide = 0;
        index.slidePositions = new Array();
        for (var count=0; count<slides.all.length; count++) {
            holdPosition = false;
            if (RePresent.Util.Element.isPart(slides.all[count]) ||
                RePresent.Util.Element.isPartParent(slides.all[count])) {
                var newParent = slides.all[count].parentNode
                if (lastParent === null || newParent === lastParent) {
                    holdPosition = true;
                } else {
                    lastParent = newParent;
                }
            } else {
                lastParent = null;
            }

            if (!holdPosition && count > 0) {
                fullSlide++;
            }

            var slidesPos = index.slidePositions[fullSlide];
            var slideId = RePresent.Util.Slide.getId(slides.all[count]);
            if (typeof slidesPos == 'undefined') {
                index.slidePositions[fullSlide] = [slideId];
            } else {
                slidesPos.push(slideId);
            }
        }

        // slide frame template for index raster
        index.rect = document.createElementNS(
            RePresent.Util.NSS['svg'], 'rect');
        RePresent.Util.Element.setAttributes(index.rect, {
            style: {
                stroke: conf.index.frame,
                fill: 'none',
                'stroke-width': 2,
            },
            x: 0,
            y: 0
        });

        setState();
    }

    /** Update changeable paramter values. */
    function setState() {
        // space between slides in index view
        index.space = (conf.index.spacing / 100) * vBox.width;
        // calc real space from percentage value
        index.scale = vBox.width / ((conf.index.columns * vBox.width) +
            ((conf.index.columns -1) * index.space));
        // columns in index view
        index.columns = conf.index.columns;
    }

    function scrollIndex(dir) {
        var page = (index.columns * vBox.height) +
            ((index.columns - 1) * index.space);
        page = page * index.scale;
        if (dir > 0) { // down
            console.log("Scroll down: %o", "translate(0, -" + page + ")");
            RePresent.Util.Element.setAttributes(e.slidesStack, {
                    style: {
                        '-moz-transform': "translate(0, -" + page + ")"
                    }
            });
        }
    }

    this.navIndex = function(param) {
        var currentIdx = parseInt(getSlideIndex(slides.current));
        var newIdx = null;

        switch (param.direction) {
            case 'left':
                newIdx = (currentIdx - 1);
                console.log("left to %o", newIdx);
                break;
            case 'right':
                newIdx = (currentIdx + 1);
                console.log("right to %o", newIdx);
                break;
            case 'up':
                newIdx = (currentIdx - parseInt(index.columns));
                console.log("up to %o", newIdx);
                break;
            case 'down':
                newIdx = (currentIdx + parseInt(index.columns));
                console.log("down to %o", newIdx);
                break;
        }

        if (newIdx !== null && newIdx >= 0 &&
                newIdx < index.slidePositions.length) {
            slides.current = RePresent.Util.Slide.getById(
                index.slidePositions[newIdx][0]);

            // if we step out of sight it's time to scroll
            if (!RePresent.Util.Element.inViewPort(slides.current)) {
                scrollIndex(+1);
            }

            // constraint indexes to column size
            newIdx = newIdx % (index.columns * index.columns);
            currentIdx = currentIdx % (index.columns * index.columns);

            drawRaster({
                current: newIdx,
                previous: currentIdx
            })
        } else {
            console.debug("newIdx was NULL or out of range (%o)", newIdx);
        }
    }

    function drawRaster(param) {
        var rasters = new Array();
        if (param.previous == param.current) {
            return;
        }
        if (e.raster === null) {
            e.raster = document.createElementNS(RePresent.Util.NSS['svg'], 'g');
            e.raster.id = 'rePresent-slides-index-raster';
            e.root.appendChild(e.raster);
        }

        if ((typeof param.width == 'undefined' ||
                typeof param.height == 'undefined') &&
                !isNaN(param.current)) {
            param.previous = param.previous || 0;
            RePresent.Util.Element.setAttributes(
                e.raster.getElementsByTagName('rect')[param.current], {
                    style: {
                        stroke: conf.index.currentFrame
                    }
                });
            RePresent.Util.Element.setAttributes(
                e.raster.getElementsByTagName('rect')[param.previous], {
                    style: {
                        stroke: conf.index.frame
                    }
                });
        } else {
            e.raster.innerHTML = ''; // clear raster
            var slideNum = 0;
            for (var row=0; row<index.columns; row++) {
                y = (param.height * row) + (param.space * row);
                for (var col=0; col<index.columns; col++) {
                    aRect = index.rect.cloneNode();
                    x = (param.width * col) + (param.space * col);
                    RePresent.Util.Element.setAttributes(aRect, {
                        x: x,
                        y: y,
                        width: param.width,
                        height: param.height
                    });
                    e.raster.appendChild(aRect);

                    if (slideNum == param.current) {
                        RePresent.Util.Element.setAttributes(aRect, {
                            style: {
                                stroke: conf.index.currentFrame
                            }
                        });
                    }

                    slideNum++;
                }
            }
        }
    }

    this.changeSlide = function(param) {
        var newParent = param.nextSlide.parentNode;
        if (newParent === nodes.lastParent &&
                (RePresent.Util.Element.isPart(param.nextSlide) ||
                    RePresent.Util.Element.isPartParent(param.nextSlide))) {
            if (param.direction > 0) { // forward
                // add current node, wich is part-type to the list
                nodes.visible.push(param.nextSlide);
            } else { // backwards
                // we are in a part group: hide only last shown element
                var gPart = nodes.visible.pop();
                RePresent.Util.Element.hide(gPart);
            }
        } else {
            for (var i=0; i<nodes.visible.length; i++) {
                RePresent.Util.Element.hide(nodes.visible[i]);
            }
            nodes.visible = new Array();

            // hide current slide
            RePresent.Util.Element.hide(param.currentSlide);

            // we stepped back in/jumped into a part: show all previous sibling
            if ((param.direction < 0 || param.jump) && (
                    RePresent.Util.Element.isPart(param.nextSlide) ||
                        RePresent.Util.Element.isPartParent(param.nextSlide))) {
                nodes.visible = nodes.visible.concat(
                        RePresent.Util.Slide.showPreviousParts(
                            param.nextSlide));
            }

            // store current node
            nodes.visible.push(param.nextSlide);
            // store current parent
            nodes.lastParent = newParent;
        }
        // show new slide
        RePresent.Util.Element.show(param.nextSlide);
        slides.current = param.nextSlide;
    }

    function getSlideIndex(slide) {
        for (var i=0; i<index.slidePositions.length; i++) {
            for (var j=0; j<index.slidePositions[i].length; j++){
                var partSlide = RePresent.Util.Slide.getById(
                        index.slidePositions[i][j]);
                if (slide === partSlide) {
                    return i;
                }
            }
        }
        return null;
    }

    /** Toggle display of the slides index view.*/
    this.toggleIndex = function() {
        if (mode === MODES.index) { // switch back to slide mode
            // show master
            RePresent.Util.Element.show(RePresent.Util.e.master);
            // reset layer scroll
            RePresent.Util.Element.setStyles(e.slidesStack, {
                transform: null
            });
            for (var count=0; count<slides.all.length; count++) {
                slides.all[count].removeAttribute('transform');
                slides.all[count].style.opacity = 1;
                // hide all but the current slide
                if (slides.all[count] !== slides.current) {
                    RePresent.Util.Element.hide(slides.all[count]);
                }
            }
            mode = MODES.slide;
        } else { // show index mode
            // hide master
            RePresent.Util.Element.hide(RePresent.Util.e.master);

            var x, y = null;
            var offset = [0, 0];
            var currentIdx = 0;
            for (var i=0; i<index.slidePositions.length; i++) {
                x = offset[0] * vBox.width + offset[0] * index.space;
                y = offset[1] * vBox.height + offset[1] * index.space;
                for (var j=0; j<index.slidePositions[i].length; j++){
                    var slide = RePresent.Util.Slide.getById(
                        index.slidePositions[i][j]);
                    slide.setAttribute('transform',
                        'scale(' + index.scale +
                            ') translate(' + x + ',' + y + ')');
                    RePresent.Util.Element.show(slide);

                    if (slide === slides.current) {
                        currentIdx = i;
                    }
                }
                offset[0]++; // columns
                if (((i + 1) % index.columns) === 0) {
                    offset[0] = 0;
                    offset[1]++; // rows
                }
            }

            // draw raster (frames) for slides
            drawRaster({
                width: (vBox.width * index.scale),
                height: (vBox.height * index.scale),
                space: (index.space * index.scale),
                current: currentIdx
            });

            mode = MODES.index;
        }
    }

    this.getMode = function() {
        for (aMode in MODES) {
            if (MODES[aMode] === mode) {
                return aMode;
            }
        }
    }
};