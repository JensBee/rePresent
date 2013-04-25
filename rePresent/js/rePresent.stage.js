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
    var index = {
        // columns: number of columns to display
        // page: current displayed index page
        // rect: SVG rect element as template for page frames
        // scale: scaling factor of pages to fit on a single page
        // slidePositions: array with [[slide][slide, part]] elements in order
        // space: spacing between pages
    };

    this.init = function(config) {
        conf = config;
        var viewBox = RePresent.Util.getViewBoxDimension();
        vBox.width = viewBox[0];
        vBox.height = viewBox[1];
        mode = MODES.slide;

        // create a custom layer for the slides raster
        e.root = document.createElementNS(RePresent.Util.NSS['svg'], 'g');
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

    this.navIndex = function(param) {
        var currentIdx = parseInt(getSlideIndex(slides.current));
        var newIdx = null;
        var dir = 0; // direction +1: forward, -1 backwards

        switch (param.direction) {
            case 'left':
                newIdx = (currentIdx - 1);
                dir = -1;
                // console.log("left to %o", newIdx);
                break;
            case 'right':
                newIdx = (currentIdx + 1);
                dir = +1;
                // console.log("right to %o", newIdx);
                break;
            case 'up':
                newIdx = (currentIdx - parseInt(index.columns));
                dir = -1;
                // console.log("up to %o", newIdx);
                break;
            case 'down':
                newIdx = (currentIdx + parseInt(index.columns));
                dir = +1;
                // console.log("down to %o", newIdx);
                break;
        }

        if (newIdx !== null && newIdx >= 0 &&
                newIdx < index.slidePositions.length) {
            slides.current = RePresent.Util.Slide.getById(
                index.slidePositions[newIdx][0]);

            // if we step out of sight it's time to scroll
            if (!RePresent.Util.Element.inViewPort(slides.current)) {
                showIndexPage({direction: dir});
            }

            // constraint indexes to column size
            newIdx = newIdx % (index.columns * index.columns);
            currentIdx = currentIdx % (index.columns * index.columns);

            drawRaster({
                current: newIdx,
                previous: currentIdx
            })
        } else {
            // console.debug("newIdx was NULL or out of range (%o)", newIdx);
        }
    }

    function hideRaster() {
        if (e.raster !== null) {
            e.raster.innerHTML = '';
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
            console.log("RASTER - update");
            param.previous = param.previous || 0;
            RePresent.Util.Element.setAttributes(
                e.raster.getElementsByTagName('rect')[param.current], {
                    'class': 'selected'
                });
            RePresent.Util.Element.setAttributes(
                e.raster.getElementsByTagName('rect')[param.previous], {
                    'class': null
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
                            'class': 'selected'
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

    /**
    * Shows a specific page in index mode.
    * param = {
    *   page: page number to display
    *   direction: -1 for going backwards, +1 for forward
    * }
    */
    function showIndexPage(param) {
        console.log("showIndexPage param:%o index:%o", param, index);
        param = param || {};
        if (param.direction) {
            page = (index.page || 0) + param.direction;
        } else {
            page = parseInt(param.page) || 0;
        }

        if (page > 0) {
            // calulate height of all displayed items
            var scrollAmount = (index.columns * vBox.height) +
                ((index.columns) * index.space);
            // page n-times down, scale value
            scrollAmount = scrollAmount * page * -1 * index.scale;
        } else {
            scrollAmount = 0;
        }

        RePresent.Util.Element.setAttributes(e.slidesStack, {
                transform: "translate(0, " + scrollAmount + ")"
        });

        // hide master
        RePresent.Util.Element.hide(RePresent.Util.e.master);
        var x, y = null;
        var offset = [0, 0];
        var currentIdx = 0;
        var currentSlideOffset = 0;
        var slideOffset = page * (index.columns * index.columns);
        console.log("slideOffset %o", slideOffset);
        for (var i=0; i<index.slidePositions.length; i++) {
            if (currentSlideOffset >= slideOffset) {
                x = offset[0] * vBox.width + offset[0] * index.space;
                y = offset[1] * vBox.height + offset[1] * index.space;
                for (var j=0; j<index.slidePositions[i].length; j++){
                    var slide = RePresent.Util.Slide.getById(
                        index.slidePositions[i][j]);
                    console.log("rendering slide: %o", slide);
                    slide.setAttribute('transform',
                        'scale(' + index.scale +
                            ') translate(' + x + ',' + y + ')');
                    RePresent.Util.Element.show(slide);

                    if (slide === slides.current) {
                        currentIdx = i;
                    }
                }
            } else {
                // set other slides to display none!
            }
            currentSlideOffset++;
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

        // set current index page
        index.page = page;
    }

    /** Toggle display of the slides index view.*/
    this.toggleIndex = function() {
        if (mode === MODES.index) { // switch back to slide mode
            hideRaster();
            // show master
            RePresent.Util.Element.show(RePresent.Util.e.master);
            // reset layer scroll
            RePresent.Util.Element.setStyles(e.slidesStack, {
                transform: null
            });
            for (var count=0; count<slides.all.length; count++) {
                slides.all[count].removeAttribute('transform');
                // hide all but the current slide
                if (slides.all[count] !== slides.current) {
                    RePresent.Util.Element.hide(slides.all[count]);
                }
            }
            mode = MODES.slide;
        } else { // show index mode
            // hide master
            RePresent.Util.Element.hide(RePresent.Util.e.master);
            showIndexPage();
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

    this.selectIndexSlide = function() {
        mode = MODES.index;
        this.toggleIndex();
        return slides.current;
    }
};