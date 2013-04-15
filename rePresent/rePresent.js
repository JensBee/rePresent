var RePresent = function() {
    NSS = {
        'svg': "http://www.w3.org/2000/svg"
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
    // array of slides
    var slides = new Array();
    // array index of active slide
    var activeSlide = 0;
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

    function collectSlides() {
        var slidesNodes = document.getElementById(
            'rePresent-slides-order').childNodes;
        for(var slideElement=0, slideElements=slidesNodes.length;
                slideElement<slideElements; slideElement++){
            var node = slidesNodes[slideElement];
            if (node.nodeName.toLowerCase() == 'g') {
                var subSlidesNodes = node.childNodes;
                for(var subSlideElement=0,
                        subSlideElements=subSlidesNodes.length;
                        subSlideElement<subSlideElements; subSlideElement++){
                    var subNode = subSlidesNodes[subSlideElement];
                    if (subNode.nodeName.toLowerCase() == 'use') {
                        slides.push(subNode);
                        addMouseHandler(subNode);
                    }
                }
            } else if (node.nodeName.toLowerCase() == 'use') {
                slides.push(node);
                addMouseHandler(node);
            }
        }
    }

    function showSlide(dir, direct) {
        var nextSlide = activeSlide

        // relative / direct move
        if (typeof direct === 'undefined') {
            nextSlide = activeSlide + dir;
        } else {
            nextSlide = dir;
        }

        // check bounds
        if (nextSlide > (slides.length -1)) {
            nextSlide = slides.length -1;
        } else if (nextSlide < 0) {
            nextSlide = 0;
        }

        // any changes? direct jump?
        if (nextSlide != activeSlide || typeof direct !== 'undefined') {
            slides[activeSlide].style.display = 'none';
            slides[nextSlide].style.display = 'inherit';
            activeSlide = nextSlide;
            updateProgressBar();
        }
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
        direction = undefined;
        // TODO: any efx, etc. should be stopped here
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
        if (typeof direction !== 'undefined') {
            showSlide(direction);
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

    this.init = function(userConfig) {
        // merge user configuration into local config
        this.mergeConf(config, DEFAULTS);
        this.mergeConf(config, userConfig);

        viewBox = document.documentElement.getAttribute('viewBox');
        width = viewBox.split(' ')[2];
        height = viewBox.split(' ')[3];
        collectSlides();
        showSlide(0, 1);
    };
}
var rePresent = new RePresent()

window.onload = rePresent.init();
document.onkeydown = rePresent.keydown;
document.onkeypress = rePresent.keypress;