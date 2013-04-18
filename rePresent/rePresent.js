/** Base class. */
var RePresent = function() {
    RePresent.NS = "https://github.com/JensBee/rePresent";

    // active slide element
    var activeSlide = null;
    // known hooks
    var hooks = [
        'changeSlide', // just before a slide will change
        'slide', // slide is changing
        'slideChanged' // slide just changed
    ];
    // important elements
    var e;

    /** Find the next slide we want to display.
    @param object with:
        - element: element to start the search at
        - currentElement: element currently displayed
        - direction: <0 for backwards, >0 for forward search
        - noIncrement: if true the function will operate on the current node,
            instead of incrementing/decrementing */
    function findNextSlide(param) {
        if (param.element == null) {
            return null;
        }
        var slide = null;
        var sFunc; // search function
        var nextSlide = null;

        if (typeof param.noIncrement == 'undefined' || !param.noIncrement) {
            if (param.direction > 0) { // forward search
                sFunc = RePresent.Util.getNextNode;
                slide = param.element;
            } else { // backwards search
                sFunc = RePresent.Util.getPrevNode;
                slide = sFunc(param.element, e.slidesStack.id);
            }
        } else {
            slide = param.element;
        }

        if (RePresent.Util.isGroup(slide)) {
            // a group
            var children = slide.children;
            // store id of current group
            if (children.length > 0) {
                // group with children
                if (param.direction > 0) {
                    nextSlide = findNextSlide({
                        element: children[0],
                        currentElement: param.currentElement,
                        direction: param.direction
                    });
                } else {
                    nextSlide = children[children.length -1];
                    if (RePresent.Util.isGroup(nextSlide)) {
                        // check contents, don't decrement node
                        nextSlide = findNextSlide({
                            element: nextSlide,
                            currentElement: param.currentElement,
                            direction: param.direction,
                            noIncrement: true
                        });
                    }
                }
            } else {
                nextSlide = findNextSlide({
                    element: sFunc(slide, e.slidesStack.id),
                    currentElement: param.currentElement,
                    direction: param.direction
                });
            }
        } else {
            // a slide
            nextSlide = slide;
            if (nextSlide === param.currentElement) {
                nextSlide = findNextSlide({
                    element: sFunc(slide, e.slidesStack.id),
                    currentElement: param.currentElement,
                    direction: param.direction
                });
            }
        }
        // console.log("findNextSlide -> %o", nextSlide);
        return nextSlide;
    }

    function showSlide(param) {
        var prevSlide = activeSlide;
        var nextSlide = null;
        var jump = false;
        if (typeof param !== 'undefined') {
            if (param.direction !== undefined) {
                nextSlide = findNextSlide({
                    element: activeSlide,
                    currentElement: activeSlide,
                    direction: param.direction
                });
            } else if (param.slide !== undefined) {
                nextSlide = param.slide;
                jump = true;
            }
        } else {
            // default to forward moving
            param = {direction: +1};
        }
        if (nextSlide == null) {
            // start from first slide
            nextSlide = findNextSlide({
                element: e.slidesStack.children[0],
                currentElement: activeSlide,
                direction: +1
            });
        }

        if (nextSlide != null) {
            // trigger slide switching hooks
            triggerHook('changeSlide', {
                'currentSlide': activeSlide,
                'nextSlide': nextSlide,
                'direction': param.direction,
                'jump': jump
            });
            activeSlide = nextSlide;
            window.location.hash = RePresent.Util.getSlideId(activeSlide);
            triggerHook('slide', nextSlide);
            triggerHook('slideChanged', {
                'currentSlide': nextSlide,
                'previousSlide': prevSlide,
                'direction': param.direction,
                'jump': jump
            });
        }
    }

        /** Get a specific slide by given link id.
    @param The id of the linked slide */
    function getSlideById(id) {
        var found = false;
        var slide = findNextSlide({
            element: e.slidesStack.children[0],
            direction: +1
        });
        while(!found) {
            if (slide === null) {
                found = true;
            } else {
                if (RePresent.Util.getSlideId(slide) == id) {
                    found = true;
                } else {
                    slide = findNextSlide({
                        element: slide,
                        currentElement: slide,
                        direction: +1
                    });
                }
            }
        }
        return slide;
    }

    /** Get the slide to display from the URL. */
    function getSlideFromUrl() {
        var hash = window.location.hash;
        if (typeof hash !== undefined && hash != '') {
            return getSlideById(hash);
        }
        return null;
    }

    /** Trigger a hook.
    @param The hook to trigger
    @param parameters to pass on to the registered functions */
    function triggerHook(hook, args) {
        if (hooks.indexOf(hook) != -1 && hooks[hook] !== undefined) {
            for (var i=0; i<hooks[hook].length; i++) {
                hooks[hook][i](args);
            }
        }
    }

    /** Step one slide forward. */
    this.nextSlide = function() {
        showSlide({direction: 1});
    }

    /** Step back slide forward. */
    this.prevSlide = function() {
        showSlide({direction: -1});
    }

    /** Allows to register foreign functions for hooks triggerd by RePresent.
    @param Hook to register for
    @param Callback function to call */
    this.registerHook = function(hook, callback) {
        if (hooks.indexOf(hook) == -1) {
            console.warn("Tried to register unknown hook '"+hook+"'.");
        } else {
            if (hooks[hook] === undefined) {
                hooks[hook] = new Array();
            }
            hooks[hook].push(callback);
        }
    }

    this.init = function(config) {
        e = {
            'slidesStack': document.getElementById('rePresent-slides-stack'),
        };
        viewBox = RePresent.Util.getViewBoxDimesion();

        var slide = getSlideFromUrl();
        if (slide != null) {
            showSlide({slide: slide})
        } else {
            showSlide();
        }
    }
}

/** General utility class. */
RePresent.Util = {
    NSS: {
        xlink: 'http://www.w3.org/1999/xlink'
    },

    isArray: function(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    },

    _setVisibility: function(node, mode) {
        if (typeof node == 'undefined' || node == null) {
            return;
        }
        style = node.getAttribute('style').toLowerCase();
        style = style.replace(/display:(inherit|inline|none);?/g, '');
        if (mode == 'hide') {
            style += 'display:none;';
        } else {
            style += 'display:inline;';
        }

        node.setAttribute('style', style);
    },

    hideElement: function(node) {
        RePresent.Util._setVisibility(node, 'hide');
    },

    showElement: function(node) {
        RePresent.Util._setVisibility(node, 'show');
    },

    /** Toggle the visible state of an element. */
    toggleVisibility: function(node) {
        if (typeof node == 'undefined' || node == null) {
            return;
        }
        style = node.getAttribute('style').toLowerCase();
        if (style.indexOf('display:none') !== -1) {
            RePresent.Util._setVisibility(node, 'show');
        } else {
            RePresent.Util._setVisibility(node, 'hide');
        }
    },

    /** Filter child nodes by tag names.
    * @param node wich children should be examinated
    * @param array of wanted tagnames (all lowercase) */
    getElementsByTagnames: function(element, tags) {
        var elements = element.childNodes;
        var found = new Array();
        for (var i=0; i<elements.length; i++) {
            if (tags.indexOf(elements[i].nodeName.toLowerCase()) > -1) {
                found.push(elements[i]);
            }
        }
        return found;
    },

    /** Check if slide-element is a group node.
    * @param element node to check */
    isGroup: function(element) {
        return element.getAttributeNS(RePresent.NS, 'type') == 'group';
    },

    /** Check if slide-element is a part node.
    * @param element node to check */
    isPart: function(element) {
        return element.getAttributeNS(RePresent.NS, 'type') == 'part';
    },

    /** Check if slide-element is the parent of part nodes.
    * @param element node to check */
    isPartParent: function(element) {
        return element.getAttributeNS(RePresent.NS, 'type') == 'partParent';
    },

    showPreviousParts: function(element) {
        var hasPrev = true;
        var node = element;
        var nodes = new Array();
        RePresent.Util.showElement(node);
        while (hasPrev) {
            var sibling = node.previousSibling;
            if (sibling === null) {
                hasPrev = false;
            } else {
                if (RePresent.Util.isGroup(sibling)) {
                    hasPrev = false;
                } else {
                    nodes.push(sibling);
                    RePresent.Util.showElement(sibling);
                }
            }
            node = sibling;
        }
        // return correct stacking order (lifo order)
        return nodes.reverse();
    },

    getViewBoxDimesion: function(doc) {
        viewBox = document.documentElement.getAttribute('viewBox');
        width = viewBox.split(' ')[2];
        height = viewBox.split(' ')[3];
        return [width, height];
    },

    /** Merge the attributes of two objects. */
    mergeConf: function(conf, uConf) {
        for (var key in uConf) {
            try {
                if (uConf[key].constructor==Object) {
                    conf[key] = mergeConf(conf[key], uConf[key]);
                } else {
                    conf[key] = uConf[key];
                }
            } catch(e) {
                conf[key] = uConf[key];
            }
        }
        return conf;
    },

    _getNode: function(element, stopId, direction) {
        if (element.id == stopId) {
            return null;
        }

        var sibling;
        if (direction > 0) { // forward
            sibling = element.nextSibling;
        } else { // backwards
            sibling = element.previousSibling;
        }

        if (sibling === null) {
            var parentNode = element.parentNode;
            if (parentNode === null) {
                sibling = null;
            } else {
                sibling = RePresent.Util._getNode(parentNode, stopId, direction);
            }
        }
        return sibling;
    },

    /** Iteratively get the previous.
    * @param The element to start at
    * @param Id of an element to stop iteration at.
    */
    getPrevNode: function(element, stopId) {
        return RePresent.Util._getNode(element, stopId, -1);
    },

    /** Iteratively get the next node.
    * @param The element to start at
    * @param Id of an element to stop iteration at.
    */
    getNextNode: function(element, stopId) {
        return RePresent.Util._getNode(element, stopId, +1);
    },

    getSlideId: function(element) {
        return element.getAttributeNS(RePresent.Util.NSS.xlink, 'href');
    }
}

/** Slides display class. */
RePresent.Stage = function() {
    var width;
    var conf;
    var MODES = {
        slide: 0, // presentation mode
        index: 1 // slides index view
    };
    // current display mode
    var mode;
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
    function toggleIndex() {
        if (mode === MODES.index) { // switch back to slide mode
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
}

/** Slides progress and timer display.
TODO: rewrite to use hooks.
*/
RePresent.Progress = function() {
    var timer; // progress timer state
    var e; // some frequent used elements

    this.init = function(config) {
        timer = {
            duration: 0,  // duration of presentation
            interval: null,
            elapsed: 0,
            start: 0
        };
        e = {
            progress: document.getElementById('rePresent-progress'),
            progressBar: document.getElementById('rePresent-progress-bar'),
            progressTimer: document.getElementById("rePresent-progress-timer")
        };
    }

    /** Toggle display of the time and progress bar. */
    this.toggleVisibility = function() {
        RePresent.Util.toggleVisibility(e.progress);
    }

    /** Update presentation progress.
    * @param percentage value as decimal
    * @param slide width */
    this.updateProgress = function(dec, width) {
        widthBar = dec * width;
        e.progressBar.setAttribute('width', widthBar);
    }

    function setTimerValue(value) {
        var indicator = e.progressTimer;

        if (value < 0.0) {
            value = 0.0;
        } else if (value > 1.0) {
            value = 1.0;
        }

        var x = (width - 0.01 * height) * value + 0.005 * height;
        indicator.setAttribute('x', x);
    }

    function updateTimer() {
        timer.elapsed += 1;
        setTimerValue((timer.elapsed - timer.start) / (60 * timer.duration));
    }

    /** Show presentation length request dialog. */
    this.queryDuration = function() {
        var duration_new = prompt("Length of presentation in minutes?",
                                  timer.duration);
        if ((duration_new != null) && !isNaN(duration_new)
                && (duration_new > 0)) {
            timer.duration = duration_new;
            if (timer.interval !== null) {
                clearInterval(timer.interval);
            }
            e.progressTimer.style.display = 'inherit';
            timer.interval = setInterval(function(){updateTimer()}, 1000);
        }
    }
}

window.onload = function() {
    var rePresent = new RePresent();
    var rePresentStage = new RePresent.Stage();
    var rePresentProgress = new RePresent.Progress();
    // The following line will be replaced by export script to include user
    // configuration.
    var userConf = {};
    // configuration defaults
    var DEFAULTS = {
        index: {
            columns: 4,
            spacing: 5, // percentage of slide width
            selectColor: 'black',
            selectSize: 5
        }
    };
    // resulting configuration
    var config = {};
    // key codes
    var KEYS = {
        'left': 37,
        'up': 38,
        'right': 39,
        'down': 40
    };

    // merge user configuration into local config
    RePresent.Util.mergeConf(config, DEFAULTS);
    RePresent.Util.mergeConf(config, userConf);

    rePresent.registerHook('changeSlide', rePresentStage.changeSlide);
    rePresent.init(config);
    rePresentStage.init(config);
    rePresentProgress.init(config);

    // handle navigational keys
    document.onkeydown = function(e) {
        e = e || window.event;
        switch(e.keyCode) {
            case KEYS['right']:
            case KEYS['down']:
                rePresent.nextSlide();
                break;
            case KEYS['left']:
            case KEYS['up']:
                rePresent.prevSlide();
                break;
        }
    }
    // handle functional keys
    document.onkeypress = function(e) {
        e = e || window.event;
        var charCode = e.which || e.keyCode;
        switch(String.fromCharCode(charCode)) {
            case 'd':
                rePresentProgress.queryDuration();
                break;
            case 'i':
                rePresentStage.toggleIndex();
                break;
            case 'p':
                rePresentProgress.toggleVisibility();
                break;
        }
    }
}
