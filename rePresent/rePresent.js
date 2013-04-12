var RePresent = function() {
	keys = {
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
		if (nextSlide > slides.length || nextSlide < slides.length) {
			alert("DEBUG: ran out of slides! "+nextSlide+" (have:"+slides.length+")");
		}


	}

	function keydown (e) {
		// anny efx, etc. should be stopped here
		if (!e) { e = window.event; }
		var code = e.keyCode || e.charCode;
		alert("keydown["+code+"]@"+activeSlide);
		if (code == keys['right'] || code == keys['down']) {
			activeSlide = 1;
		}
		alert("keydown_fin["+code+"]@"+activeSlide);
	}

	this.init = function() {
		document.onkeydown = keydown;
		var slidesNodes = document.getElementById('rePresent-slides-order').childNodes;
		for (var i=0; i<slidesNodes.length; i++) {
			// TODO: handle group and part slides
			slides.push(slidesNodes[i]);
		}
	};
}
var rePresent = new RePresent()

window.onload = rePresent.init();