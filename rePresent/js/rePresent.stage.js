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
    var slides = {
        // all: all slide elements found
        // current: current slide element
    };
    // index state
    var index = {
        // columns: number of columns to display
        // lastSlide: slide element displayed when entering index mode
        // page: current displayed index page
        // rect: SVG rect element as template for page frames
        // scale: scaling factor of pages to fit on a single page
        // slidePositions: array with [[slide][slide, part]] elements in order
        // slidesPerPage: number of slides per page
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
        index.columns = conf.index.columns;
        index.slidesPerPage = index.columns * index.columns;
        drawRaster({
            width: (vBox.width * index.scale),
            height: (vBox.height * index.scale),
            space: (index.space * index.scale),
            hide: true
        });
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

            var pages = {}
            if (index.page == 0) {
                pages.min = 0;
                pages.max = index.slidesPerPage -1;
            } else {
                pages.min = (index.page * index.slidesPerPage);
                pages.max = pages.min + index.slidesPerPage -1;
            }
            console.log("nIdx: %o min:%o max:%o", newIdx, pages.min, pages.max);
            if (newIdx < pages.min || newIdx > pages.max) {
                showIndexPage({direction: dir});
            }

            // constraint indexes to column size
            console.log("nexIdx-b: %o", newIdx);
            newIdx = newIdx % index.slidesPerPage;
            console.log("nexIdx-a: %o", newIdx);
            currentIdx = currentIdx % index.slidesPerPage;

            updateRaster({
                current: newIdx,
                previous: currentIdx
            })
        } else {
            // console.debug("newIdx was NULL or out of range (%o)", newIdx);
        }
    }

    function hideRaster() {
        e.raster && RePresent.Util.Element.hide(e.raster);
    }

    function showRaster() {
        e.raster && RePresent.Util.Element.show(e.raster);
    }

    /*
    * param = {
    *   current: current selection index (optional)
    *   height: height of a frame box
    *   hide: hide raster,
    *   space: space between boxes
    *   width: width of a frame box
    * }
    */
    function drawRaster(param) {
        if (e.raster === null) {
            e.raster = document.createElementNS(RePresent.Util.NSS['svg'], 'g');
            e.raster.id = 'rePresent-slides-index-raster';
            e.root.appendChild(e.raster);
        }

        param.hide && hideRaster();

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

                if (param.current && slideNum == param.current) {
                    RePresent.Util.Element.setAttributes(aRect, {
                        'class': 'selected'
                    });
                }

                slideNum++;
            }
        }
    }

    /*
    * param = {
    *   current: current selection index
    *   hide: if true, don't show after updating
    *   previous: previous selection index
    * }
    */
    function updateRaster(param) {
        var rasters = new Array();
        console.log("dRaster %o", param);
        param.current = param.current || 0;
        if (param.previous == param.current) {
            return;
        }

        var rects = e.raster.getElementsByTagName('rect');
        console.log("@%o -> %o", param.current,rects[param.current]);
        RePresent.Util.Element.setAttributes(rects[param.current], {
            'class': 'selected'
        });

        if (!isNaN(param.previous)) {
            RePresent.Util.Element.setAttributes(rects[param.previous], {
                'class': null
            });
        }

        // check if there are any remaining empty slide frames
        var remain = index.slidePositions.length % index.slidesPerPage;
        if (remain != 0) {
            console.log(">>remaining boxes possible (%o) @%o!",
                remain, param.current);
            if (param.current > (index.slidePositions.length - remain)) {
                console.log(">>removing remaining boxes..");
                for (var i=remain; i<index.slidesPerPage; i++) {
                    console.log(">>box %o", rects[i]);
                    RePresent.Util.Element.hide(rects[i]);
                }
            } else {
                console.log(">>no remaining boxes found!");
            }
        }

        !param.hide && showRaster();
    }

    /**
    * Callback function
    * param = {
    *   currentSlide: current displaying slide element
    *   direction: -1 for going backwards, +1 for forward
    *   jump:
    *   nextSlide: next slide element
    * }
    */
    this.changeSlide = function(param) {
        // console.log("Nextslide event!");
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
        var slideOffset = page * index.slidesPerPage;
        var hideSlide = false;
        for (var i=0; i<index.slidePositions.length; i++) {
            if (currentSlideOffset >= slideOffset &&
                currentSlideOffset < (slideOffset + index.slidesPerPage)) {
                hideSlide = false;
            } else {
                // set other slides to display none
                hideSlide = true;
            }

            x = offset[0] * vBox.width + offset[0] * index.space;
            y = offset[1] * vBox.height + offset[1] * index.space;

            for (var j=0; j<index.slidePositions[i].length; j++){
                var slide = RePresent.Util.Slide.getById(
                    index.slidePositions[i][j]);

                if (hideSlide) {
                    RePresent.Util.Element.hide(slide);
                } else {
                    slide.setAttribute('transform',
                        'scale(' + index.scale +
                            ') translate(' + x + ',' + y + ')');
                    RePresent.Util.Element.show(slide);

                    if (slide === slides.current) {
                        currentIdx = i;
                    }
                }
            }

            currentSlideOffset++;
            offset[0]++; // columns
            if (((i + 1) % index.columns) === 0) {
                offset[0] = 0;
                offset[1]++; // rows
            }
        }

        // set current index page
        index.page = page;
    }

    /*
    * @param noCommit: if true current slide will be slide selected when entring
    *   index mode
    */
    function hideIndex(noCommit) {
        noCommit = noCommit || false;

        hideRaster();
        // show master
        RePresent.Util.Element.show(RePresent.Util.e.master);
        // reset layer scroll
        RePresent.Util.Element.setStyles(e.slidesStack, {
            transform: null
        });

        if (noCommit) {
            RePresent.Util.Element.setAttributes(slides.current, {
                    'class': null
            });
            slides.current = index.lastSlide;
        }
        for (var count=0; count<slides.all.length; count++) {
            RePresent.Util.Element.setAttributes(slides.all[count], {
                transform: null
            });
            // hide all but the current slide
            if (slides.all[count] !== slides.current) {
                RePresent.Util.Element.hide(slides.all[count]);
            }
        }
        // show previous parts, if neccessary
        if (RePresent.Util.Element.isPart(slides.current)) {
            RePresent.Util.Slide.showPreviousParts(slides.current);
        }
        mode = MODES.slide;
    }

    /** Toggle display of the slides index view. */
    this.toggleIndex = function() {
        if (mode === MODES.index) { // switch back to slide mode
            hideIndex();
        } else { // show index mode
            // hide master
            index.lastSlide = slides.current;
            RePresent.Util.Element.hide(RePresent.Util.e.master);
            showIndexPage();
            updateRaster({
                current: getSlideIndex(slides.current)
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

    this.cancelIndex = function() {
        hideIndex(true);
    }

    this.selectIndexSlide = function() {
        mode = MODES.index;
        this.toggleIndex();
        return slides.current;
    }
};