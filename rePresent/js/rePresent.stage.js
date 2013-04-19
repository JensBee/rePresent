/** Slides display class. */
RePresent.Stage = function() {
    var width;
    var conf;
    var MODES = {
        slide: 0, // presentation mode
        index: 1 // slides index view
    };
    // important nodes
    var e = {};
    // current display mode
    var mode = MODES.slide;
    // stores parent -> child association to properly show stacked parts
    var nodes = {
        lastParent: null, // parent of current shown slide
        // children (parts) of the parent of the current slide wich are visible
        visible: []
    };
    // slides index & state
    var slides = {};
    // index state
    var index = {};
    // index rasters
    var raster = {};

    this.init = function(config) {
        conf = config;
        width = RePresent.Util.getViewBoxDimension()[0];
        mode = MODES.slide;
        // gather all slides
        slides.all = RePresent.Util.e.slidesStack.getElementsByTagName('use');
        // create a custom layer
        e.root = document.createElementNS(RePresent.Util.NSS['svg'], 'g');
        e.root.id = 'rePresent-slides-index';
        document.documentElement.appendChild(e.root);
    }

    function drawRaster(param) {
        var id = 'rePresent-slides-index-raster-' + param.width + '-' +
                param.height + '-' + param.space + '-' + conf.index.columns;
        e.raster = document.createElementNS(RePresent.Util.NSS['svg'], 'g');
        e.raster.id = 'rePresent-slides-index-raster';
        e.root.appendChild(e.raster);

        var rect = document.createElementNS(RePresent.Util.NSS['svg'], 'rect');
        RePresent.Util.Element.setAttributes(rect, {
            style: {
                stroke: conf.index.frame,
                fill: 'none',
                'stroke-width': 2,
            },
            x: 0,
            y: 0,
            width: param.width,
            height: param.height
        });

        for (var row=0; row<conf.index.columns; row++) {
            y = (param.height * row) + (param.space * row);
            for (var col=0; col<conf.index.columns; col++) {
                aRect = rect.cloneNode();
                x = (param.width * col) + (param.space * col);
                RePresent.Util.Element.setAttributes(aRect, {
                    x: x,
                    y: y
                });
                e.raster.appendChild(aRect);
            }
        }
    }

    function navigateSlide(param) {
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
                        RePresent.Util.Slide.showPreviousParts(param.nextSlide));
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

    function navigateIndex(param) {
        console.log("Index nv!");
    }

    this.changeSlide = function(param) {
        if (mode === MODES.index) {
            navigateIndex(param);
        } else {
            navigateSlide(param);
        }
    }

    /** Toggle display of the slides index view.
    TODO: add some caching of the slides */
    this.toggleIndex = function() {
        if (mode === MODES.index) { // switch back to slide mode
            // show master
            RePresent.Util.Element.show(RePresent.Util.e.master);
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
            var offset = [0, 0];
            var space = (conf.index.spacing / 100) * width;
            // calc real space from percentage value
            var scale = width / ((conf.index.columns * width) +
                        ((conf.index.columns -1) * space));

            // hide master
            RePresent.Util.Element.hide(RePresent.Util.e.master);
            // draw raster (frames) for slides
            drawRaster({
                width: (width * scale),
                height: (height * scale),
                space: (space * scale)
            });

            var lastParent = null;
            var holdPosition = false;
            var x, y = null;
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
                    offset[0]++; // columns
                    if (((count + 1) % conf.index.columns) === 0) {
                        offset[0] = 0;
                        offset[1]++; // rows
                    }
                }

                x = offset[0] * width + offset[0] * space;
                y = offset[1] * height + offset[1] * space;
                slides.all[count].setAttribute('transform',
                    'scale(' + scale + ') translate(' +
                        x + ',' + y + ')');
                RePresent.Util.Element.show(slides.all[count]);
                slides.all[count].style.opacity = 0.7;
            }
            index.lastY = (
                (y -
                    (
                    ((conf.index.columns - 1) * height) +
                    ((conf.index.columns - 1) * conf.index.spacing)
                    )
                )
                * scale);
            mode = MODES.index;
        }
    }
};