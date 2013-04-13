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
	var slides = new Array();
	var activeSlide = 0;

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
        width = ((activeSlide + 1) / slides.length) * 1024;
        pBar = document.getElementById('rePresent-progress-bar');
        pBar.setAttribute('width', width);
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
        collectSlides();
        // alert("found "+slides.length+" slides");
        showSlide(0, 1);
	};
}
var rePresent = new RePresent()

window.onload = rePresent.init();
document.onkeydown = rePresent.keydown;
document.onkeypress = rePresent.keypress;