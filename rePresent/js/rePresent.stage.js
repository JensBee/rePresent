/** Slides display class. */
RePresent.Stage = function() {
    var width;
    var conf;
    var MODES = {
        slide: 0, // presentation mode
        index: 1 // slides index view
    };
    // current display mode
    var mode = MODES.slide;
    // stores parent -> child association to properly show stacked parts
    var nodes = {
        lastParent: null, // parent of current shown slide
        // children (parts) of the parent of the current slide wich are visible
        visible: []
    };

    this.init = function(config) {
        conf = config;
        width = RePresent.Util.getViewBoxDimesion[0];
        mode = MODES.slide;
    }

    this.changeSlide = function(param) {
        var newParent = param.nextSlide.parentNode;
        if (newParent === nodes.lastParent &&
                (RePresent.Util.isPart(param.nextSlide) ||
                    RePresent.Util.isPartParent(param.nextSlide))) {
            if (param.direction > 0) { // forward
                // add current node, wich is part-type to the list
                nodes.visible.push(param.nextSlide);
            } else { // backwards
                // we are in a part group: hide only last shown element
                var gPart = nodes.visible.pop();
                RePresent.Util.hideElement(gPart);
            }
        } else {
            for (var i=0; i<nodes.visible.length; i++) {
                RePresent.Util.hideElement(nodes.visible[i]);
            }
            nodes.visible = new Array();

            // hide current slide
            RePresent.Util.hideElement(param.currentSlide);

            // we stepped back in/jumped into a part: show all previous sibling
            if ((param.direction < 0 || param.jump) && (
                    RePresent.Util.isPart(param.nextSlide) ||
                        RePresent.Util.isPartParent(param.nextSlide))) {
                nodes.visible = nodes.visible.concat(
                            RePresent.Util.showPreviousParts(param.nextSlide));
            }

            // store current node
            nodes.visible.push(param.nextSlide);
            // store current parent
            nodes.lastParent = newParent;
        }
        // show new slide
        RePresent.Util.showElement(param.nextSlide);
    }

    /** Toggle display of the slides index view. */
    this.toggleIndex = function() {
        if (mode === MODES.index) { // switch back to slide mode
            console.log("toggle index OFF");
            for (var count=0; count<slides.length; count++) {
                slides[count].removeAttribute('transform');
                slides[count].style.opacity = 1;
                // hide all but the current slide
                if (count !== activeSlide) {
                    slides[count].style.display = 'none';
                }
            }
            mode = MODES.slide;
        } else { // show index mode
            console.log("toggle index ON");
            var offset = [0, 0];
            var space = (conf.index.spacing / 100) * width;
            // calc real space from percentage value
            var scale = width / ((conf.index.columns * width) +
                        ((conf.index.columns -1) * space));
            for (var count=0; count<slides.length; count++) {
                var x = offset[0] * width + offset[0] * space;
                var y = offset[1] * height + offset[1] * space;
                slides[count].setAttribute('transform',
                    'scale(' + scale + ') translate(' +
                        x + ',' + y + ')');
                slides[count].style.display = 'inherit';
                slides[count].style.opacity = 0.7;
                // mark the current slide
                if (count === activeSlide) {
                    index.selectedSlide = activeSlide;
                }
                offset[0]++; // columns
                if (((count + 1) % conf.index.columns) === 0) {
                    offset[0] = 0;
                    offset[1]++; // rows
                }
            }
            mode = MODES.index;
        }
    }
};