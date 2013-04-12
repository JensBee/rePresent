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
	slides = new Array();
	activeSlide = 0;

	function showSlide(dir) {
		var nextSlide = activeSlide + dir;
		// only debug - this shouldn't happen
		if (nextSlide > (slides.length -1) || nextSlide < 0) {
			alert("DEBUG: ran out of slides! " + nextSlide +
                " (have:"+slides.length+")");
		}
        slides[activeSlide].style.display = "none";
        slides[nextSlide].style.display = "inherit";
        activeSlide = nextSlide;
        // alert("Current: "+activeSlide+" next:"+nextSlide);
	}

	function keydown (e) {
        direction = 0;
		// anny efx, etc. should be stopped here
		if (!e) { e = window.event; }
		var code = e.keyCode || e.charCode;
		//alert("keydown["+code+"]@"+activeSlide);
		if (code == KEYS['right'] || code == KEYS['down']) {
			direction = 1;
		} else if (code == KEYS['left'] || code == KEYS['up']) {
            direction = -1;
		}
        showSlide(direction);
	}

	this.init = function() {
		document.onkeydown = keydown;
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
        // alert("found "+slides.length+" slides");
        showSlide(activeSlide);
	};
}
var rePresent = new RePresent()

window.onload = rePresent.init();