/** Base class. */
var RePresent = function() {
    RePresent.NS = "https://github.com/JensBee/rePresent";

    // active slide element
    var activeSlide;
    // known hooks
    var hooks = [
        'changeSlide', // just before a slide will change
        'slide', // slide is changing
        'slideChanged' // slide just changed
    ];
    // important elements
    var e;

    /** Find the next slide we want to display.
    @param element to start the search at
    @param <0 for backwards, >0 for forward search */
    function findNextSlide(element, direction, hasNewParent) {
        console.log("findNextSlide: e:%o d:%o p:%o",element,direction,hasNewParent);
        if (element == null) {
            return null;
        }
        var slide = null;
        var sFunc; // search function
        var nextSlide = null;

        if (direction > 0) { // forward search
            sFunc = RePresent.Util.getNextNode;
            slide = element;
        } else { // backwards search
            sFunc = RePresent.Util.getPrevNode;
            var prevNode = sFunc(element, e.slidesStack.id);
            slide = prevNode.node;
            hasNewParent = hasNewParent || prevNode.hasNewParent;
        }

        console.log("findNextSlide: slide:%o active:%o",slide,activeSlide);

        var sfResult;
        if (RePresent.Util.isGroup(slide)) {
            // a group
            var children = slide.children;
            if (children.length > 0) {
                // group with children
                nextSlide = findNextSlide(children[0], direction, hasNewParent);
            } else {
                sfResult = sFunc(slide, e.slidesStack.id);
                nextSlide = findNextSlide(sfResult.node, direction,
                                          sfResult.hasNewParent);
            }
        } else {
            // slide
            nextSlide = slide;
            if (nextSlide === activeSlide) {
                sfResult = sFunc(slide, e.slidesStack.id)
                nextSlide = findNextSlide(sfResult.node, direction,
                                          sfResult.hasNewParent);
            }
        }
        data = {node: nextSlide}
        console.log("findNextSlide -> %o", data);
        return data;
    }

    function showSlide(param) {
        var prevSlide = activeSlide;
        if (param.direction !== undefined) {
            nextSlide = findNextSlide(activeSlide, param.direction);
        } else if (param.slide !== undefined) {
            console.error("param.slide currently not implemented!");
        } else {
            // start from first slide
            nextSlide = findNextSlide(e.slidesStack.children[0], 1);
        }

        console.log("changeSlide -> %o",{
                'currentSlide': activeSlide,
                'nextSlide': nextSlide.node,
                'hasNewParent': nextSlide.hasNewParent
            });


        if (nextSlide != null) {
            // trigger slide switching hooks
            triggerHook('changeSlide', {
                'currentSlide': activeSlide,
                'nextSlide': nextSlide.node,
                'hasNewParent': nextSlide.hasNewParent
            });
            activeSlide = nextSlide.node;
            triggerHook('slide', nextSlide);
            console.log("slideChanged -> %o",{
                'currentSlide': nextSlide.node,
                'previousSlide': prevSlide,
                'hasNewParent': nextSlide.hasNewParent
            });
            triggerHook('slideChanged', {
                'currentSlide': nextSlide.node,
                'previousSlide': prevSlide,
                'hasNewParent': nextSlide.hasNewParent
            });
        }
    }

    /** Get the slide to display from the URL. */
    function getSlidesFromUrl() {
        var hash = window.location.hash;
        var currentSlide = new Array();
        currentSlide[0] = undefined;
        currentSlide[1] = undefined;
        currentSlide[2] = undefined;
        if (typeof hash !== undefined) {
            var slides = hash.replace('#', '').split('_');
            // set main slide
            if (slides[0] != '' && !isNaN(slides[0])) {
                currentSlide[0] = parseInt(slides[0]);
                // set part, if any
                if (!isNaN(slides[1])) {
                    currentSlide[1] = parseInt(slides[1]);
                    if (!isNaN(slides[2])) {
                        currentSlide[2] = parseInt(slides[2]);
                    }
                }
            }
        }
        // none set - default to first slide
        return currentSlide;
    }

    /** Trigger a hook.
    @param The hook to trigger
    @param parameters to pass on to the registered functions */
    function triggerHook(hook, args) {
        // console.log("Fire: "+hook);
        if (hooks.indexOf(hook) != -1 && hooks[hook] !== undefined) {
            for (var i=0; i<hooks[hook].length; i++) {
                // console.log("fire ("+hook+")");
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

    this.registerHook = function(hook, callback) {
        if (hooks.indexOf(hook) == -1) {
            console.warn("Tried to register unknown hook '"+hook+"'.");
        } else {
            if (hooks[hook] === undefined) {
                hooks[hook] = new Array();
            }
            // console.debug("Registered %o for hook: "+hook, callback);
            hooks[hook].push(callback);
        }
    }

    this.init = function(config) {
        e = {
            'slidesStack': document.getElementById('rePresent-slides-stack'),
        };
        viewBox = RePresent.Util.getViewBoxDimesion();

        var currentSlide = getSlidesFromUrl();
        showSlide({
            slide: currentSlide[0],
            group: currentSlide[1],
            part: currentSlide[2]
        });
    }
}

/** General utility class. */
RePresent.Util = {
    isArray: function(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    },

    /** Toggle the visible state of an element. */
    toggleVisibility: function(node) {
        if (typeof node == 'undefined' || node == null) {
            return;
        }
        style = node.getAttribute('style').toLowerCase();
        if (style.indexOf('display:none') !== -1) {
            style = style.replace('display:none', 'display:inline');
        } else {
            style = style.replace('display:inline', 'display:none');
        }
        node.setAttribute('style', style);
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

    _getNode: function(element, stopId, direction, newParent) {
        if (element.id == stopId) {
            return null;
        }

        newParent = newParent || false;

        var sibling;
        if (direction > 0) { // forward
            sibling = element.nextSibling;
        } else { // backwards
            sibling = element.previousSibling;
        }

        if (sibling === null) {
            var parentNode = element.parentNode;
            newParent = true;
            if (parentNode === null) {
                sibling = null;
            } else {
                sibling = RePresent.Util._getNode(parentNode, stopId,
                                                     newParent);
            }
        }
        console.log("_getNode: %o", {
            dir: direction,
            node: sibling,
            hasNewParent: newParent
        });
        return {
            node: sibling,
            hasNewParent: newParent
        };
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
    }
}

/** Slides display class. */
RePresent.Stage = function() {
    // Index view settings. Setup done by initDefaults()
    // var index = {
    //     selectedSlide: activeSlide
    // };
    var width;
    var conf;
    var MODES = {
        slide: 0, // presentation mode
        index: 1 // slides index view
    };
    // current display mode
    var mode;

    this.init = function(config) {
        conf = config;
        width = RePresent.Util.getViewBoxDimesion[0];
        mode = MODES.slide;
    }

    this.changeSlide = function(param) {
        RePresent.Util.toggleVisibility(param.nextSlide);
        RePresent.Util.toggleVisibility(param.currentSlide);
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
