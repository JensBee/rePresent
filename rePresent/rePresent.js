var RePresent = function() {
    NSS = {
        'svg': "http://www.w3.org/2000/svg",
        'represent': "https://github.com/JensBee/rePresent"
    };
    KEYS = {
        'left': 37,
        'up': 38,
        'right': 39,
        'down': 40
    };
    MODES = {
        slide: 0, // presentation mode
        index: 1 // slides index view
    };
    DEFAULTS = {
        index: {
            columns: 4,
            spacing: 5, // percentage of slide width
            selectColor: 'black',
            selectSize: 5
        }
    };
    var width = null;
    // nested array of slides
    var slides = new Array();
    // active slide index
    var activeSlide = [0, undefined, undefined];  // slide, group, part
    // current display mode
    var mode = MODES.slide;
    var timer = {
        duration: 0,  // duration of presentation
        interval: null,
        elapsed: 0,
        start: 0
    };
    // Index view settings. Setup done by initDefaults()
    var index = {
        selectedSlide: activeSlide
    };
    // local configuration
    var config = {};

    function setTimerValue(value) {
        var indicator = document.getElementById("rePresent-progress-timer");

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

    function queryDuration(self) {
        var duration_new = prompt("Length of presentation in minutes?",
                                  timer.duration);
        if ((duration_new != null) && !isNaN(duration_new)
                && (duration_new > 0)) {
            timer.duration = duration_new;
            if (timer.interval !== null) {
                clearInterval(timer.interval);
            }
            document.getElementById("rePresent-progress-timer")
                                    .style.display = 'inherit';
            timer.interval = setInterval(function(){updateTimer()}, 1000);
        }
    }

    function addMouseHandler(node) {
        node.onmouseover = function(e) {
            this.style.opacity = 1;
        };
        node.onmouseout = function(e) {
            this.style.opacity = 0.7;
        };
    }

    function isGroup(element) {
        return element.getAttributeNS(NSS['represent'], 'type') == 'group';
    }

    function isPart(element) {
        return element.getAttributeNS(NSS['represent'], 'type') == 'part';
    }

    function getElementsByTagnames(element, tags) {
        var elements = element.childNodes;
        var found = new Array();
        for (var i=0; i<elements.length; i++) {
            if (tags.indexOf(elements[i].nodeName.toLowerCase()) > -1) {
                found.push(elements[i]);
            }
        }
        return found;
    }

    function collectSlides() {
        var e = getElementsByTagnames(document.getElementById(
                                    'rePresent-slides-stack'), ['use', 'g']);
        for (var i=0; i<e.length; i++) {
            // check if e is group or slide
            if (e[i].nodeName.toLowerCase() == 'g' && isGroup(e[i])) {
                // check for nested groups & slides
                var subSlides = new Array();
                var eG = getElementsByTagnames(e[i], ['use', 'g']);
                for (var j=0; j<eG.length; j++) {
                    // if it's a group it may contain parts
                    if (eG[j].nodeName.toLowerCase() == 'g' &&
                            isGroup(eG[j])) {
                        var partSlides = new Array();
                        // get all parts
                        var p = getElementsByTagnames(eG[j], ['use']);
                        for (var k=0; k<p.length; k++) {
                            // part inside group
                            partSlides.push(p[k]);
                        }
                        subSlides.push(partSlides);
                    } else {
                        // simple slide inside group
                        subSlides.push(eG[j]);
                    }
                }
                slides.push(subSlides);
            } else {
                // simple slide
                slides.push(e[i]);
            }
        }
        console.log(slides);
    }

    function setSlideVis(idx, vis) {
        // console.log(idx);
        try {
            if (idx[2] !== undefined) {
                slides[idx[0]][idx[1]][idx[2]].style.display = vis;
            } else if (idx[1] !== undefined) {
                slides[idx[0]][idx[1]].style.display = vis;
            } else if (idx[0] !== undefined) {
                slides[idx[0]].style.display = vis;
            }
        } catch(e) {
            console.log(e);
        }
    }

    function isArray(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }

    function findNextSlide(idx, dir) {
        var next = [];
        console.log("----------------findNextSlide:");
        console.log(idx);
        // console.log(dir);

        if (idx[2] !== undefined) {
            // change on part level
            if (dir > 0) {
                // forward
                if (slides[idx[0]][idx[1]][idx[2] + 1] !== undefined) {
                    // next part is there
                    console.log("part>>found");
                    next = [idx[0], idx[1], idx[2] + 1];
                } else {
                    console.log("part>>none");
                    next = findNextSlide([idx[0], idx[1]], dir);
                }
            } else {
                // backwards
                if (slides[idx[0]][idx[1]][idx[2] - 1] !== undefined) {
                    console.log("part<<found");
                    next = [idx[0], idx[1], idx[2] - 1];
                } else {
                    console.log("part<<none");
                    next = findNextSlide([idx[0], idx[1]], dir);
                }
            }
        } else if (idx[1] !== undefined) {
            // change on group level
            if (dir > 0) {
                var nextSlide = slides[idx[0]][idx[1] + 1];
                if (nextSlide !== undefined) {
                    // next group found
                    if (isArray(nextSlide)) {
                        // jump to first slide in group
                        console.log("group||slide>>found:array");
                        next = [idx[0], idx[1] + 1, 0];
                    } else {
                        // single slide in group
                        console.log("group||slide>>found");
                        next = [idx[0], idx[1] + 1];
                    }
                } else {
                    // no next group, try next slide
                    console.log("group||slide>>none");
                    next = findNextSlide([idx[0]], dir);
                }
            } else {
                // backwards
                var nextSlide = slides[idx[0]][idx[1] - 1];
                if (nextSlide !== undefined) {
                    // next group found
                    console.log("group||slide<<found");
                    if (isArray(nextSlide)) {
                        // jump to last slide in group
                        next = [idx[0], idx[1] - 1, nextSlide.length - 1];
                    } else {
                        // single slide in group
                        next = [idx[0], idx[1] - 1];
                    }
                } else {
                    // no next group, try next slide
                    console.log("group||slide<<none");
                    next = findNextSlide([idx[0]], dir);
                }
            }
        } else {
            if (dir > 0) {
                var nextSlide = slides[idx[0] + 1];
                if (nextSlide !== undefined) {
                    // next slide found
                    if (isArray(nextSlide)) {
                        console.log("slide>>found:array");
                        // slide is a group, try to jump to first slide
                        next = findNextSlide([idx[0] + 1, -1], dir);
                    } else {
                        console.log("slide>>found");
                        next = [idx[0] + 1];
                    }
                } else {
                    // no next slide
                    console.log("slide>>none");
                    next = null;
                }
            } else {
                // backwards
                var nextSlide = slides[idx[0] - 1];
                if (nextSlide !== undefined) {
                    // next slide found
                    if (isArray(nextSlide)) {
                        console.log("slide<<found:array");
                        // slide is a group, try to jump to first slide
                        //next = findNextSlide([idx[0] - 1, nextSlide.length - 1], dir);
                        next = [idx[0] - 1, nextSlide.length - 1];
                    } else {
                        console.log("slide<<found");
                        next = [idx[0] - 1];
                    }
                } else {
                    // no next slide
                    console.log("slide<<none");
                    next = null;
                }
            }
        }
        return next;
    }

    function showSlide(param) {
        var next = []; // if all fails: stay on current slide
        var nextSlide = undefined;

        if (param.direction !== undefined) {
            next = findNextSlide(activeSlide, param.direction);
            console.log("Next");
            console.log(next);
        } else if (param.slide !== undefined) {
            next[0] = param.slide;
            if (param.group !== undefined) {
                next[1] = param.group;
                if (param.part !== undefined) {
                    next[2] = param.part;
                }
                 else {
                    next[2] = 0;
                }
            }
        }
        else {
            // no slide given - start from root
            next = findNextSlide([-1], 1);
        }

        if (next !== null) {
            console.log("=====");
            console.log(next);
            setSlideVis(next, 'inherit');
            setSlideVis(activeSlide, 'none');
            activeSlide = next;
        }

        return;
    }

    function updateProgressBar() {
        widthBar = (((activeSlide + 1) / slides.length)) * width;
        pBar = document.getElementById('rePresent-progress-bar');
        pBar.setAttribute('width', widthBar);
    }

    /** Toggle display of the time and progress bar. */
    function toggleProgressBar() {
        progress = document.getElementById('rePresent-progress');
        style = progress.getAttribute('style').toLowerCase();
        if (style.indexOf('display:none') !== -1) {
            style = style.replace('display:none', 'display:inline');
        } else {
            style = style.replace('display:inline', 'display:none');
        }
        progress.setAttribute('style', style);
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
            var space = (config.index.spacing / 100) * width;
            // calc real space from percentage value
            var scale = width / ((config.index.columns * width) +
                        ((config.index.columns -1) * space));
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
                if (((count + 1) % config.index.columns) === 0) {
                    offset[0] = 0;
                    offset[1]++; // rows
                }
            }
            mode = MODES.index;
        }
    }

    /** Handle function keys. */
    this.keypress = function(e) {
        e = e || window.event;
        var charCode = e.which || e.keyCode;
        switch(String.fromCharCode(charCode)) {
            case 'd':
                queryDuration(this);
                break;
            case 'i':
                toggleIndex();
                break;
            case 'p':
                toggleProgressBar();
                break;
        }
    }

    /** Handle navigational keys. */
    this.keydown = function(e) {
        var direction = null;
        e = e || window.event;
        switch(e.keyCode) {
            case KEYS['right']:
            case KEYS['down']:
                direction = 1;
                break;
            case KEYS['left']:
            case KEYS['up']:
                direction = -1;
                break;
        }
        if (direction !== null) {
            showSlide({direction: direction});
        }
    }

    this.mergeConf = function(conf, uConf) {
        for (var key in uConf) {
            try {
                if (uConf[key].constructor==Object) {
                    conf[key] = this.mergeConf(conf[key], uConf[key]);
                } else {
                    conf[key] = uConf[key];
                }
            } catch(e) {
                conf[key] = uConf[key];
            }
        }
        return conf;
    }

    this.getSlidesFromUrl = function() {
        var hash = window.location.hash;
        var currentSlide = new Array();
        currentSlide[0] = undefined;
        currentSlide[1] = undefined;
        currentSlide[2] = undefined;
        if (typeof hash !== undefined) {
            var slides = hash.replace('#', '').split('_');
            // set main slide
            if (slides[0] != '' && !isNaN(slides[0])) {
                // console.log("url: slide: " + slides[0]);
                currentSlide[0] = parseInt(slides[0]);
                // set part, if any
                if (!isNaN(slides[1])) {
                    // console.log("url: group: " + slides[1]);
                    currentSlide[1] = parseInt(slides[1]);
                    if (!isNaN(slides[2])) {
                        // console.log("url: part: " + slides[2]);
                        currentSlide[2] = parseInt(slides[2]);
                    }
                }
            }
        }
        // none set - default to first slide
        return currentSlide;
    }

    this.init = function(userConfig) {
        // merge user configuration into local config
        this.mergeConf(config, DEFAULTS);
        this.mergeConf(config, userConfig);

        viewBox = document.documentElement.getAttribute('viewBox');
        width = viewBox.split(' ')[2];
        height = viewBox.split(' ')[3];
        collectSlides();

        var currentSlide = this.getSlidesFromUrl();
        showSlide({
            slide: currentSlide[0],
            group: currentSlide[1],
            part: currentSlide[2]
        });
    };
}
var rePresent = new RePresent()

window.onload = rePresent.init();
document.onkeydown = rePresent.keydown;
document.onkeypress = rePresent.keypress;