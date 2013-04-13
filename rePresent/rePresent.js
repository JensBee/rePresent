var RePresent = function() {
    NSS = {
        'svg': "http://www.w3.org/2000/svg"
    }
    KEYS = {
        'left': 37,
        'up': 38,
        'right': 39,
        'down': 40
    };
    var width = null;
    // array of slides
    var slides = new Array();
    // array index of active slide
    var activeSlide = 0;
    var timer = {
        duration: 0,  // duration of presentation
        interval: null,
        elapsed: 0,
        start: 0
    };

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

    function collectSlides() {
        var slidesNodes = document.getElementById(
            'rePresent-slides-order').childNodes;
        for(slideElement=0, slideElements=slidesNodes.length;
                slideElement<slideElements; slideElement++){
            var node = slidesNodes[slideElement];
            // alert("Node: "+node.nodeName.toLowerCase());
            if (node.nodeName.toLowerCase() == 'g') {
                var subSlidesNodes = node.childNodes;
                for(subSlideElement=0, subSlideElements=subSlidesNodes.length;
                        subSlideElement<subSlideElements; subSlideElement++){
                    var subNode = subSlidesNodes[subSlideElement];
                    if (subNode.nodeName.toLowerCase() == 'use') {
                        slides.push(subNode);
                    }
                }
            } else if (node.nodeName.toLowerCase() == 'use') {
                slides.push(node);
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
            slides[activeSlide].style.display = "none";
            slides[nextSlide].style.display = "inherit";
            activeSlide = nextSlide;
            updateProgressBar();
        }
    }

    function updateProgressBar() {
        widthBar = (((activeSlide + 1) / slides.length)) * width;
        pBar = document.getElementById('rePresent-progress-bar');
        pBar.setAttribute('width', widthBar);
    }

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

    /** Handle function keys. */
    this.keypress = function(e) {
        e = e || window.event;
        var charCode = e.which || e.keyCode;
        switch(String.fromCharCode(charCode)) {
            case 'd':
                queryDuration(this);
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

    this.init = function() {
        viewBox = document.documentElement.getAttribute('viewBox');
        width = viewBox.split(' ')[2];
        height = viewBox.split(' ')[3];
        collectSlides();
        // alert("found "+slides.length+" slides");
        showSlide(0, 1);
    };
}
var rePresent = new RePresent()

window.onload = rePresent.init();
document.onkeydown = rePresent.keydown;
document.onkeypress = rePresent.keypress;