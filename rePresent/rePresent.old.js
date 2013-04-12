// rePresent JensBee 2013. https://github.com/JensBee/rePresent
// based on JessyInk

// Copyright 2008, 2009 Hannes Hochreiner
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see http://www.gnu.org/licenses/.

// Set onload event handler.
window.onload = jessyInkInit;

// Creating a namespace dictionary. The standard Inkscape namespaces are taken from inkex.py.
var NSS = new Object();
NSS['sodipodi']='http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd';
NSS['cc']='http://web.resource.org/cc/';
NSS['svg']='http://www.w3.org/2000/svg';
NSS['dc']='http://purl.org/dc/elements/1.1/';
NSS['rdf']='http://www.w3.org/1999/02/22-rdf-syntax-ns#';
NSS['inkscape']='http://www.inkscape.org/namespaces/inkscape';
NSS['xlink']='http://www.w3.org/1999/xlink';
NSS['xml']='http://www.w3.org/XML/1998/namespace';
NSS['jessyink']='https://launchpad.net/jessyink';

// Keycodes.
var LEFT_KEY = 37; // cursor left keycode
var UP_KEY = 38; // cursor up keycode
var RIGHT_KEY = 39; // cursor right keycode
var DOWN_KEY = 40; // cursor down keycode
var PAGE_UP_KEY = 33; // page up keycode
var PAGE_DOWN_KEY = 34; // page down keycode
var HOME_KEY = 36; // home keycode
var END_KEY = 35; // end keycode
var ENTER_KEY = 13; // next slide
var SPACE_KEY = 32;
var ESCAPE_KEY = 27;

// Mouse handler actions.
var MOUSE_UP = 1;
var MOUSE_DOWN = 2;
var MOUSE_MOVE = 3;
var MOUSE_WHEEL = 4;

// Parameters.
var INDEX_COLUMNS_DEFAULT = 4;
var INDEX_COLUMNS = INDEX_COLUMNS_DEFAULT;
var INDEX_OFFSET = 0;
var STATE_START = -1;
var STATE_END = -2;
var slides = new Array();

// Initialisation.
var masterSlide = null;
var activeSlide = 0;
var activeEffect = 0;
var timeStep = 30; // 40 ms equal 25 frames per second.
var lastFrameTime = null;
var processingEffect = false;
var transCounter = 0;
var effectArray = 0;

// CUT

var progress_bar_visible = false;
var timer_elapsed = 0;
var timer_start = timer_elapsed;
var timer_duration = 0; // in minutes
var timer_interval = null;

var history_counter = 0;
var history_original_elements = new Array();
var history_presentation_elements = new Array();

var mouse_original_path = null;
var mouse_presentation_path = null;
var mouse_last_x = -1;
var mouse_last_y = -1;
var mouse_min_dist_sqr = 3 * 3;
var path_colour = "red";
var path_width_default = 3;
var path_width = path_width_default;
var path_paint_width = path_width;

// Main class
var Represent = function() {
	self = this;

	/****************************************
	** DOM functions
	****************************************/
	this.dom = (function(parent) {
		var self = {};

		self.node = {
			// document root
			'root' : document.getElementsByTagNameNS(NSS['svg'], "svg")[0],
			// presentation layer
			'presentationLayer' : document.createElementNS(NSS['svg'], "g")
		};
		self.backgroundColor = '#fff';

		/** Find slide layers nested inside a given parent. Slide nodes are labeled with a leading tilde (~).
		* @param parent node
		* @return array of nodes or an empty array if none found
		*/
		self.getSlides = function(node) {
			var parentNode = nodeOrRoot(node);
			var nodes = new Array();
			var firstTier = parentNode.childNodes;
			for (var i = 0; i < firstTier.length; i++) {
				var node = firstTier[i];
				if (node.nodeType == 1 && node.nodeName === "g"
					&& node.getAttributeNS(NSS['inkscape'], "label").substring(0, 1) === "~") {
					nodes.push(node);
				}
			}
			return nodes;
		}

		/** Find the master slide. The master layer is labeled '{master}'.
		* @param parent node
		* @return master slide node or null if none found
		*/
		self.getMaster = function(node) {
			var parentNode = nodeOrRoot(node);
			var firstTier = parentNode.childNodes;
			for (var i = 0; i < firstTier.length; i++) {
				var node = firstTier[i];
				if (node.nodeType == 1 && node.nodeName === "g"
					&& node.getAttributeNS(NSS['inkscape'], "label").toLowerCase() === "{master}") {
					return node;
				}
			}
			return null;
		}

		self.getPresentationLayer = function() {
			return self.node.presentationLayer;
		};

		self.getRoot = function() {
			return self.node.root;
		};

		/** Create a clip path for slides.
		* @param width of the presentation
		* @param height of the presentation
		*/
		self.createClipPath = function(width, height) {
			/* done on export
			var defsNodes = document.getElementsByTagNameNS(NSS['svg'], "defs");
			if (defsNodes.length > 0) {
				var existingClipPath = document.getElementById("jessyInkSlideClipPath");
				if (!existingClipPath) {
					var rectNode = document.createElementNS(NSS['svg'], "rect");
					var clipPath = document.createElementNS(NSS['svg'], "clipPath");

					rectNode.setAttribute("x", 0);
					rectNode.setAttribute("y", 0);
					rectNode.setAttribute("width", width);
					rectNode.setAttribute("height", height);

					clipPath.setAttribute("id", "jessyInkSlideClipPath");
					clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");

					clipPath.appendChild(rectNode);
					defsNodes[0].appendChild(clipPath);
				}
			}
			*/
		};

		/** Inserts a layer at the bottom (display order) an existing one.
		* @param node to insert
		* @param target node
		* @param node id suffix (TODO: ?)
		*/
		self.stackLayer = function(node, target, suffix) {
			var clonedNode = suffixNodeIds(node.cloneNode(true), "_" + suffix);
			clonedNode.removeAttributeNS(NSS['inkscape'], "groupmode");
			clonedNode.removeAttributeNS(NSS['inkscape'], "label");
			clonedNode.style.display = "inherit";
			target.insertBefore(clonedNode, target.firstChild);
		};

		function nodeOrRoot(node) {
			if (node === undefined || node === null) {
				return self.node.root;
			}
			return node;
		}

		/** Create a layer used for displaying slides. */
		function setupPresentationLayer() {
			var layer = self.getPresentationLayer();
			layer.setAttributeNS(NSS['inkscape'], "groupmode", "layer");
			layer.setAttributeNS(NSS['inkscape'], "label", "JessyInk Presentation Layer");
			layer.setAttributeNS(NSS['jessyink'], "presentationLayer", "presentationLayer");
			layer.setAttribute("id", "jessyink_presentation_layer");
			layer.style.display = "inherit";
			self.getRoot().appendChild(layer);
		};

		/** Sets the background color according to the inkscape setting. */
		function setBackgroundColor() {
			/* done in export script
			var namedViews = document.getElementsByTagNameNS(NSS['sodipodi'], "namedview");
			for (var counter = 0; counter < namedViews.length; counter++) {
				if (namedViews[counter].hasAttribute("id") && namedViews[counter].hasAttribute("pagecolor")) {
					if (namedViews[counter].getAttribute("id") == "base") {
						self.backgroundColor = namedViews[counter].getAttribute("pagecolor")
						self.getRoot().style.backgroundColor = self.backgroundColor;
						break;
					}
				}
			}
			*/
		};

		self.initialize = function() {
			//setBackgroundColor();
			setupPresentationLayer();
		};

		return self;
	})(this);

	/****************************************
	** UI functions
	****************************************/
	this.ui = (function(parent) {
		var self = {};
		self.width = undefined;
		self.height = undefined;

		/** Function to build a progress bar.
		*
		*  @param parent node to attach the progress bar to
		*/
		self.createProgressBar = function(parentNode) {
			var g = document.createElementNS(NSS['svg'], "g");
			g.setAttribute("clip-path", "url(#jessyInkSlideClipPath)");
			g.setAttribute("id", "layer_progress_bar");
			g.setAttribute("style", "display: none;");

			var rect_progress_bar = document.createElementNS(NSS['svg'], "rect");
			rect_progress_bar.setAttribute("style", "marker: none; fill: rgb(128, 128, 128); stroke: none;");
			rect_progress_bar.setAttribute("id", "rect_progress_bar");
			rect_progress_bar.setAttribute("x", 0);
			rect_progress_bar.setAttribute("y", 0.99 * self.height);
			rect_progress_bar.setAttribute("width", 0);
			rect_progress_bar.setAttribute("height", 0.01 * self.height);
			g.appendChild(rect_progress_bar);

			var circle_timer_indicator = document.createElementNS(NSS['svg'], "circle");
			circle_timer_indicator.setAttribute("style", "marker:none; fill:rgb(255, 0, 0); stroke:none; display:none;");
			circle_timer_indicator.setAttribute("id", "circle_timer_indicator");
			circle_timer_indicator.setAttribute("cx", 0.005 * self.height);
			circle_timer_indicator.setAttribute("cy", 0.995 * self.height);
			circle_timer_indicator.setAttribute("r", 0.005 * self.height);
			g.appendChild(circle_timer_indicator);

			parentNode.appendChild(g);
		};

		self.setWidth = function(width) {
			self.width = width;
		}

		self.setHeight = function(height) {
			self.height = height;
		}

		return self;
	})(this);

	/****************************************
	** Slideshow functions
	****************************************/
	this.stage = (function(parent) {
		var self = {};
		self.modes = {
			'slide':1,
			'index':2,
			'draw':3
		};
		self.mode = self.modes.slide;

		/** Function to change between slides.
		*
		*  @param dir direction (1 = forwards, -1 = backwards)
		*/
		self.changeSlide = function(dir) {
			var nextSlide = activeSlide + dir;

			if (nextSlide > (slides.length -1) || nextSlide < 0) {
				return;
			}

			processingEffect = true;
			effectArray = [ {
					'dir': (dir == 1 ? -1 : 1),
					'element': slides[activeSlide]["element"],
					'effect': "appear",
					'options': {}
				},{
					'dir': (dir == 1 ? 1 : -1),
					'element': slides[activeSlide + dir]["element"],
					'effect': "appear",
					'options': {}
				}
			];

			activeSlide += dir;
			setProgressBarValue(activeSlide);
			activeEffect = 0;

			transCounter = 0;
			startTime = (new Date()).getTime();
			lastFrameTime = null;

			// do the appear effect
			var suspendHandle = parent.dom.getRoot().suspendRedraw(200);
			for (var counter = 0; counter < effectArray.length; counter++) {
				var element = effectArray[counter]["element"];
				var theDir = parseInt(effectArray[counter]["dir"]) * dir;
				if (theDir == 1) {
					element.style.display = "inherit";
					element.setAttribute("opacity",1);
				} else if (theDir == -1) {
					element.style.display = "none";
					element.setAttribute("opacity",0);
				}
			}

			parent.dom.getRoot().unsuspendRedraw(suspendHandle);
			parent.dom.getRoot().forceRedraw();

			window.location.hash = (activeSlide + 1) + '_' + activeEffect;
			processingEffect = false;
		};

		/** Function to toggle between index and slide mode. */
		self.toggleIndex = function() {
			var suspendHandle = parent.dom.getRoot().suspendRedraw(500);

			if (self.mode == self.modes.slide) {
				hideProgressBar();
				INDEX_OFFSET = -1;
				indexSetPageSlide(activeSlide);
				self.mode = self.modes.index;
			} else if (self.mode == self.modes.index) {
				for (var counter = 0; counter < slides.length; counter++) {
					slides[counter]["element"].setAttribute("transform","scale(1)");
					if (counter == activeSlide)	{
						slides[counter]["element"].style.display = "inherit";
						slides[counter]["element"].setAttribute("opacity",1);
						activeEffect = 0;
					} else {
						slides[counter]["element"].setAttribute("opacity",0);
						slides[counter]["element"].style.display = "none";
					}
				}
				self.mode = self.modes.slide;
				setSlideToState(activeSlide);
				setProgressBarValue(activeSlide);

				if (progress_bar_visible) {
					showProgressBar();
				}
			}

			parent.dom.getRoot().unsuspendRedraw(suspendHandle);
			parent.dom.getRoot().forceRedraw();
		}

		self.nextSlide = function() {
			self.changeSlide(1);
		};

		self.prevSlide = function() {
			self.changeSlide(-1);
		};

		self.initialize = function() {
			/* done on export
			// make the presentation scaleable.
			if (parent.dom.getRoot().getAttribute("viewBox")) {
				parent.ui.setWidth(parent.dom.getRoot().viewBox.animVal.width);
				parent.ui.setHeight(parent.dom.getRoot().viewBox.animVal.height);
			} else {
				parent.ui.setHeight(parseFloat(parent.dom.getRoot().getAttribute("height")));
				parent.ui.setWidth(parseFloat(parent.dom.getRoot().getAttribute("width")));
				parent.dom.getRoot().setAttribute("viewBox", "0 0 " + parent.ui.width + " " + parent.ui.height);
			}
			*/
		};

		return self;
	})(this);

	this.initialize = function() {

		// order matters!
		this.dom.initialize();
		this.stage.initialize();

		/* done on export
		this.dom.getRoot().setAttribute("width", "100%");
		this.dom.getRoot().setAttribute("height", "100%");
		*/

		// create a clipping box for slides
		// this.dom.createClipPath(this.ui.width, this.ui.height);

		// add ui controls
		this.ui.createProgressBar(this.dom.getPresentationLayer());
	};
};

// Start rePresent
var rps = new Represent();
rps.initialize();

// Initialise char and key code dictionaries.
var charCodeDictionary = getDefaultCharCodeDictionary();
var keyCodeDictionary = getDefaultKeyCodeDictionary();

// Initialise mouse handler dictionary.
var mouseHandlerDictionary = getDefaultMouseHandlerDictionary();


/** Initialisation function.
 *  The whole presentation is set-up in this function.
 */
function jessyInkInit() {
	// Making a list of the slide and finding the master slide.
	nodes = rps.dom.getSlides();
	masterSlide = rps.dom.getMaster();

	// Set start slide.
	var hashObj = new LocationHash(window.location.hash);
	activeSlide = hashObj.slideNumber;
	//activeEffect = hashObj.effectNumber;
	if (activeSlide < 0) {
		activeSlide = 0;
	}
	/*
	TODO: needs new upper bounds check
	else if (activeSlide >= tempSlides.length) {
		activeSlide = tempSlides.length - 1;
	}
	*/

	for (var counter = 0; counter < nodes.length; counter++) {
		if (nodes[counter].getAttributeNS(NSS['inkscape'], "groupmode") && (nodes[counter].getAttributeNS(NSS['inkscape'], "groupmode") == "layer")) {
			var originalNode = document.getElementById(nodes[counter].getAttribute("id"));
			originalNode.style.display = "none";
			var node = suffixNodeIds(originalNode.cloneNode(true), "_" + counter);
			rps.dom.getPresentationLayer().appendChild(node);
			slides[counter] = {
				'original_element': originalNode,
				'element': node
			};

			// Copy master slide content.
			// if (masterSlide) {
			// 	rps.dom.stackLayer(masterSlide, node, counter);
			// }

			// Setting clip path.
			//node.setAttribute("clip-path", "url(#jessyInkSlideClipPath)");
			// TODO: needed?
			node.removeAttributeNS(NSS['inkscape'], "groupmode");
			node.removeAttributeNS(NSS['inkscape'], "label");
			// Make invisible, but keep in rendering tree to ensure that bounding box can be calculated.
			node.setAttribute("opacity",0);
			node.style.display = "inherit";

			// Create a transform group.
			var transformGroup = document.createElementNS(NSS['svg'], "g");

			// Add content to transform group.
			while (node.firstChild) {
				transformGroup.appendChild(node.firstChild);
			}

			// Transfer the transform attribute from the node to the transform group.
			if (node.getAttribute("transform")) {
				transformGroup.setAttribute("transform", node.getAttribute("transform"));
				node.removeAttribute("transform");
			}

			// Create a view group.
			var viewGroup = document.createElementNS(NSS['svg'], "g");
			viewGroup.appendChild(transformGroup);
			slides[counter]["viewGroup"] = node.appendChild(viewGroup);

			node.setAttribute("onmouseover", "if ((rps.stage.mode == rps.stage.modes.index) && ( activeSlide != " + counter + ")) { indexSetActiveSlide(" + counter + "); };");

			// Set visibility for initial state.
			if (counter == activeSlide) {
				node.style.display = "inherit";
				node.setAttribute("opacity",1);
			} else {
				node.style.display = "none";
				node.setAttribute("opacity",0);
			}

		}
	}

	hideProgressBar();
	setProgressBarValue(activeSlide);
	setSlideToState(activeSlide);
}

/** Function to display the index sheet.
 *
 *  @param offsetNumber offset number
 */
function displayIndex(offsetNumber)
{
	var offsetX = 0;
	var offsetY = 0;

	if (offsetNumber < 0)
		offsetNumber = 0;
	else if (offsetNumber >= slides.length)
		offsetNumber = slides.length - 1;

	for (var counter = 0; counter < slides.length; counter++)
	{
		if ((counter < offsetNumber) || (counter > offsetNumber + INDEX_COLUMNS * INDEX_COLUMNS - 1))
		{
			slides[counter]["element"].setAttribute("opacity",0);
			slides[counter]["element"].style.display = "none";
		}
		else
		{
			offsetX = ((counter - offsetNumber) % INDEX_COLUMNS) * rps.ui.width;
			offsetY = Math.floor((counter - offsetNumber) / INDEX_COLUMNS) * rps.ui.height;

			slides[counter]["element"].setAttribute("transform","scale("+1/INDEX_COLUMNS+") translate("+offsetX+","+offsetY+")");
			slides[counter]["element"].style.display = "inherit";
			slides[counter]["element"].setAttribute("opacity",0.5);
		}

		setSlideToState(counter);
	}

	//do we need to save the current offset?
	if (INDEX_OFFSET != offsetNumber)
		INDEX_OFFSET = offsetNumber;
}

/** Function to set the active slide in the slide view.
 *
 *  @param nbr index of the active slide
 */
function slideSetActiveSlide(nbr)
{
	if (nbr >= slides.length)
		nbr = slides.length - 1;
	else if (nbr < 0)
		nbr = 0;

	slides[activeSlide]["element"].setAttribute("opacity",0);
	slides[activeSlide]["element"].style.display = "none";

	activeSlide = parseInt(nbr);

	setSlideToState(activeSlide);
	slides[activeSlide]["element"].style.display = "inherit";
	slides[activeSlide]["element"].setAttribute("opacity",1);

	activeEffect = 0;
	setProgressBarValue(nbr);
}

/** Function to set the active slide in the index view.
 *
 *  @param nbr index of the active slide
 */
function indexSetActiveSlide(nbr)
{
	if (nbr >= slides.length)
		nbr = slides.length - 1;
	else if (nbr < 0)
		nbr = 0;

	slides[activeSlide]["element"].setAttribute("opacity",0.5);

	activeSlide = parseInt(nbr);
	window.location.hash = (activeSlide + 1) + '_0';

	slides[activeSlide]["element"].setAttribute("opacity",1);
}

/** Function to set the page and active slide in index view.
 *
 *  @param nbr index of the active slide
 *
 *  NOTE: To force a redraw,
 *  set INDEX_OFFSET to -1 before calling indexSetPageSlide().
 *
 *  This is necessary for zooming (otherwise the index might not
 *  get redrawn) and when switching to index mode.
 *
 *  INDEX_OFFSET = -1
 *  indexSetPageSlide(activeSlide);
 */
function indexSetPageSlide(nbr)
{
	if (nbr >= slides.length)
		nbr = slides.length - 1;
	else if (nbr < 0)
		nbr = 0;

	//calculate the offset
	var offset = nbr - nbr % (INDEX_COLUMNS * INDEX_COLUMNS);

	if (offset < 0)
		offset = 0;

	//if different from kept offset, then record and change the page
	if (offset != INDEX_OFFSET)
	{
		INDEX_OFFSET = offset;
		displayIndex(INDEX_OFFSET);
	}

	//set the active slide
	indexSetActiveSlide(nbr);
}

/** Event handler for key press.
 *
 *  @param e the event
 */
function keydown(e)
{
	if (!e)
		e = window.event;

	code = e.keyCode || e.charCode;

	if (!processingEffect && keyCodeDictionary[rps.stage.mode] && keyCodeDictionary[rps.stage.mode][code])
		return keyCodeDictionary[rps.stage.mode][code]();
	else
		document.onkeypress = keypress;
}
// Set event handler for key down.
document.onkeydown = keydown;

/** Event handler for key press.
 *
 *  @param e the event
 */
function keypress(e)
{
	document.onkeypress = null;

	if (!e)
		e = window.event;

	str = String.fromCharCode(e.keyCode || e.charCode);

	if (!processingEffect && charCodeDictionary[rps.stage.mode] && charCodeDictionary[rps.stage.mode][str])
		return charCodeDictionary[rps.stage.mode][str]();
}

/** Function to supply the default char code dictionary.
 *
 * @returns default char code dictionary
 */
function getDefaultCharCodeDictionary()
{
	var charCodeDict = new Object();

	charCodeDict[rps.stage.modes.slide] = new Object();
	charCodeDict[rps.stage.modes.index] = new Object();
	charCodeDict[rps.stage.modes.draw] = new Object();

	charCodeDict[rps.stage.modes.slide]["i"] = function () { return rps.stage.toggleIndex(); };
	charCodeDict[rps.stage.modes.slide]["d"] = function () { return slideSwitchToDrawingMode(); };
	charCodeDict[rps.stage.modes.slide]["D"] = function () { return slideQueryDuration(); };
	charCodeDict[rps.stage.modes.slide]["p"] = function () { return slideToggleProgressBarVisibility(); };
	charCodeDict[rps.stage.modes.slide]["t"] = function () { return slideResetTimer(); };

	charCodeDict[rps.stage.modes.draw]["d"] = function () { return drawingSwitchToSlideMode(); };
	charCodeDict[rps.stage.modes.draw]["0"] = function () { return drawingResetPathWidth(); };
	charCodeDict[rps.stage.modes.draw]["1"] = function () { return drawingSetPathWidth(1.0); };
	charCodeDict[rps.stage.modes.draw]["3"] = function () { return drawingSetPathWidth(3.0); };
	charCodeDict[rps.stage.modes.draw]["5"] = function () { return drawingSetPathWidth(5.0); };
	charCodeDict[rps.stage.modes.draw]["7"] = function () { return drawingSetPathWidth(7.0); };
	charCodeDict[rps.stage.modes.draw]["9"] = function () { return drawingSetPathWidth(9.0); };
	charCodeDict[rps.stage.modes.draw]["b"] = function () { return drawingSetPathColour("blue"); };
	charCodeDict[rps.stage.modes.draw]["c"] = function () { return drawingSetPathColour("cyan"); };
	charCodeDict[rps.stage.modes.draw]["g"] = function () { return drawingSetPathColour("green"); };
	charCodeDict[rps.stage.modes.draw]["k"] = function () { return drawingSetPathColour("black"); };
	charCodeDict[rps.stage.modes.draw]["m"] = function () { return drawingSetPathColour("magenta"); };
	charCodeDict[rps.stage.modes.draw]["o"] = function () { return drawingSetPathColour("orange"); };
	charCodeDict[rps.stage.modes.draw]["r"] = function () { return drawingSetPathColour("red"); };
	charCodeDict[rps.stage.modes.draw]["w"] = function () { return drawingSetPathColour("white"); };
	charCodeDict[rps.stage.modes.draw]["y"] = function () { return drawingSetPathColour("yellow"); };
	charCodeDict[rps.stage.modes.draw]["z"] = function () { return drawingUndo(); };

	charCodeDict[rps.stage.modes.index]["i"] = function () { return rps.stage.toggleIndex(); };
	charCodeDict[rps.stage.modes.index]["-"] = function () { return indexDecreaseNumberOfColumns(); };
	charCodeDict[rps.stage.modes.index]["="] = function () { return indexIncreaseNumberOfColumns(); };
	charCodeDict[rps.stage.modes.index]["+"] = function () { return indexIncreaseNumberOfColumns(); };
	charCodeDict[rps.stage.modes.index]["0"] = function () { return indexResetNumberOfColumns(); };

	return charCodeDict;
}

/** Function to supply the default key code dictionary.
 *
 * @returns default key code dictionary
 */
function getDefaultKeyCodeDictionary()
{
	var keyCodeDict = new Object();

	keyCodeDict[rps.stage.modes.slide] = new Object();
	keyCodeDict[rps.stage.modes.index] = new Object();
	keyCodeDict[rps.stage.modes.draw] = new Object();

	keyCodeDict[rps.stage.modes.slide][LEFT_KEY] = function() { return rps.stage.changeSlide(-1); };
	keyCodeDict[rps.stage.modes.slide][RIGHT_KEY] = function() { return rps.stage.changeSlide(1); };
	keyCodeDict[rps.stage.modes.slide][UP_KEY] = function() { return rps.stage.changeSlide(-1); };
	keyCodeDict[rps.stage.modes.slide][DOWN_KEY] = function() { return rps.stage.changeSlide(1); };
	keyCodeDict[rps.stage.modes.slide][PAGE_UP_KEY] = function() { return rps.stage.changeSlide(-1); };
	keyCodeDict[rps.stage.modes.slide][PAGE_DOWN_KEY] = function() { return rps.stage.changeSlide(1); };
	keyCodeDict[rps.stage.modes.slide][HOME_KEY] = function() { return slideSetActiveSlide(0); };
	keyCodeDict[rps.stage.modes.slide][END_KEY] = function() { return slideSetActiveSlide(slides.length - 1); };
	keyCodeDict[rps.stage.modes.slide][SPACE_KEY] = function() { return rps.stage.changeSlide(1); };

	keyCodeDict[rps.stage.modes.index][LEFT_KEY] = function() { return indexSetPageSlide(activeSlide - 1); };
	keyCodeDict[rps.stage.modes.index][RIGHT_KEY] = function() { return indexSetPageSlide(activeSlide + 1); };
	keyCodeDict[rps.stage.modes.index][UP_KEY] = function() { return indexSetPageSlide(activeSlide - INDEX_COLUMNS); };
	keyCodeDict[rps.stage.modes.index][DOWN_KEY] = function() { return indexSetPageSlide(activeSlide + INDEX_COLUMNS); };
	keyCodeDict[rps.stage.modes.index][PAGE_UP_KEY] = function() { return indexSetPageSlide(activeSlide - INDEX_COLUMNS * INDEX_COLUMNS); };
	keyCodeDict[rps.stage.modes.index][PAGE_DOWN_KEY] = function() { return indexSetPageSlide(activeSlide + INDEX_COLUMNS * INDEX_COLUMNS); };
	keyCodeDict[rps.stage.modes.index][HOME_KEY] = function() { return indexSetPageSlide(0); };
	keyCodeDict[rps.stage.modes.index][END_KEY] = function() { return indexSetPageSlide(slides.length - 1); };
	keyCodeDict[rps.stage.modes.index][ENTER_KEY] = function() { return rps.stage.toggleIndex(); };

	keyCodeDict[rps.stage.modes.draw][ESCAPE_KEY] = function () { return drawingSwitchToSlideMode(); };

	return keyCodeDict;
}

/** Function to handle all mouse events.
 *
 *	@param	evnt	event
 *	@param	action	type of event (e.g. mouse up, mouse wheel)
 */
function mouseHandlerDispatch(evnt, action)
{
	if (!evnt)
		evnt = window.event;

	var retVal = true;

	if (!processingEffect && mouseHandlerDictionary[rps.stage.mode] && mouseHandlerDictionary[rps.stage.mode][action])
	{
		var subRetVal = mouseHandlerDictionary[rps.stage.mode][action](evnt);

		if (subRetVal != null && subRetVal != undefined)
			retVal = subRetVal;
	}

	if (evnt.preventDefault && !retVal)
		evnt.preventDefault();

	evnt.returnValue = retVal;

	return retVal;
}

// Set mouse event handler.
document.onmousedown = function(e) { return mouseHandlerDispatch(e, MOUSE_DOWN); };
document.onmouseup = function(e) { return mouseHandlerDispatch(e, MOUSE_UP); };
document.onmousemove = function(e) { return mouseHandlerDispatch(e, MOUSE_MOVE); };

// Moz
if (window.addEventListener)
{
	window.addEventListener('DOMMouseScroll', function(e) { return mouseHandlerDispatch(e, MOUSE_WHEEL); }, false);
}

// Opera Safari OK - may not work in IE
window.onmousewheel = function(e) { return mouseHandlerDispatch(e, MOUSE_WHEEL); };

/** Function to supply the default mouse handler dictionary.
 *
 * @returns default mouse handler dictionary
 */
function getDefaultMouseHandlerDictionary()
{
	var mouseHandlerDict = new Object();

	mouseHandlerDict[rps.stage.modes.slide] = new Object();
	mouseHandlerDict[rps.stage.modes.index] = new Object();
	mouseHandlerDict[rps.stage.modes.draw] = new Object();

	mouseHandlerDict[rps.stage.modes.slide][MOUSE_DOWN] = function(evnt) { return rps.stage.changeSlide(1); };
	mouseHandlerDict[rps.stage.modes.slide][MOUSE_WHEEL] = function(evnt) { return slideMousewheel(evnt); };

	mouseHandlerDict[rps.stage.modes.index][MOUSE_DOWN] = function(evnt) { return rps.stage.toggleIndex(); };

	mouseHandlerDict[rps.stage.modes.draw][MOUSE_DOWN] = function(evnt) { return drawingMousedown(evnt); };
	mouseHandlerDict[rps.stage.modes.draw][MOUSE_UP] = function(evnt) { return drawingMouseup(evnt); };
	mouseHandlerDict[rps.stage.modes.draw][MOUSE_MOVE] = function(evnt) { return drawingMousemove(evnt); };

	return mouseHandlerDict;
}

/** Function to switch from slide mode to drawing mode.
*/
function slideSwitchToDrawingMode()
{
	rps.stage.mode = rps.stage.modes.draw;

	var tempDict;

	if (rps.dom.getRoot().hasAttribute("style"))
		tempDict = propStrToDict(rps.dom.getRoot().getAttribute("style"));
	else
		tempDict = new Object();

	tempDict["cursor"] = "crosshair";
	rps.dom.getRoot().setAttribute("style", dictToPropStr(tempDict));
}

/** Function to switch from drawing mode to slide mode.
*/
function drawingSwitchToSlideMode()
{
	rps.stage.mode = rps.stage.modes.slide;

	var tempDict;

	if (rps.dom.getRoot().hasAttribute("style"))
		tempDict = propStrToDict(rps.dom.getRoot().getAttribute("style"));
	else
		tempDict = new Object();

	tempDict["cursor"] = "auto";
	rps.dom.getRoot().setAttribute("style", dictToPropStr(tempDict));
}

/** Function to decrease the number of columns in index mode.
*/
function indexDecreaseNumberOfColumns()
{
	if (INDEX_COLUMNS >= 3)
	{
		INDEX_COLUMNS -= 1;
		INDEX_OFFSET = -1
			indexSetPageSlide(activeSlide);
	}
}

/** Function to increase the number of columns in index mode.
*/
function indexIncreaseNumberOfColumns()
{
	if (INDEX_COLUMNS < 7)
	{
		INDEX_COLUMNS += 1;
		INDEX_OFFSET = -1
			indexSetPageSlide(activeSlide);
	}
}

/** Function to reset the number of columns in index mode.
*/
function indexResetNumberOfColumns()
{
	if (INDEX_COLUMNS != INDEX_COLUMNS_DEFAULT)
	{
		INDEX_COLUMNS = INDEX_COLUMNS_DEFAULT;
		INDEX_OFFSET = -1
			indexSetPageSlide(activeSlide);
	}
}

/** Function to reset path width in drawing mode.
*/
function drawingResetPathWidth()
{
	path_width = path_width_default;
	set_path_paint_width();
}

/** Function to set path width in drawing mode.
 *
 * @param width new path width
 */
function drawingSetPathWidth(width)
{
	path_width = width;
	set_path_paint_width();
}

/** Function to set path colour in drawing mode.
 *
 * @param colour new path colour
 */
function drawingSetPathColour(colour)
{
	path_colour = colour;
}

/** Function to query the duration of the presentation from the user in slide mode.
*/
function slideQueryDuration() {
	var new_duration = prompt("Length of presentation in minutes?", timer_duration);

	if ((new_duration != null) && (new_duration != '')) {
		timer_duration = new_duration;
	}

	if (timer_duration > 0) {
		if (timer_interval !== null) {
			clearInterval(timer_interval);
		}
		document.getElementById("circle_timer_indicator").style.display = "inherit";
		timer_interval = setInterval("updateTimer()", 1000);
		rps.ui.createProgressBar(rps.dom.getPresentationLayer());
		updateTimer();
	} else  {
		document.getElementById("circle_timer_indicator").style.display = "none";
	}
}

/** Function to toggle the visibility of the progress bar in slide mode.
*/
function slideToggleProgressBarVisibility()
{
	if (progress_bar_visible)
	{
		progress_bar_visible = false;
		hideProgressBar();
	}
	else
	{
		progress_bar_visible = true;
		showProgressBar();
	}
}

/** Function to reset the timer in slide mode.
*/
function slideResetTimer()
{
	timer_start = timer_elapsed;
	updateTimer();
}

/** Function to undo last drawing operation.
*/
function drawingUndo()
{
	mouse_presentation_path = null;
	mouse_original_path = null;

	if (history_presentation_elements.length > 0)
	{
		var p = history_presentation_elements.pop();
		var parent = p.parentNode.removeChild(p);

		p = history_original_elements.pop();
		parent = p.parentNode.removeChild(p);
	}
}

/** Event handler for mouse down in drawing mode.
 *
 *  @param e the event
 */
function drawingMousedown(e)
{
	var value = 0;

	if (e.button)
		value = e.button;
	else if (e.which)
		value = e.which;

	if (value == 1)
	{
		history_counter++;

		var p = calcCoord(e);

		mouse_last_x = e.clientX;
		mouse_last_y = e.clientY;
		mouse_original_path = document.createElementNS(NSS['svg'], "path");
		mouse_original_path.setAttribute("stroke", path_colour);
		mouse_original_path.setAttribute("stroke-width", path_paint_width);
		mouse_original_path.setAttribute("fill", "none");
		mouse_original_path.setAttribute("id", "path " + Date());
		mouse_original_path.setAttribute("d", "M" + p.x + "," + p.y);
		slides[activeSlide]["original_element"].appendChild(mouse_original_path);
		history_original_elements.push(mouse_original_path);

		mouse_presentation_path = document.createElementNS(NSS['svg'], "path");
		mouse_presentation_path.setAttribute("stroke", path_colour);
		mouse_presentation_path.setAttribute("stroke-width", path_paint_width);
		mouse_presentation_path.setAttribute("fill", "none");
		mouse_presentation_path.setAttribute("id", "path " + Date() + " presentation copy");
		mouse_presentation_path.setAttribute("d", "M" + p.x + "," + p.y);

		if (slides[activeSlide]["viewGroup"])
			slides[activeSlide]["viewGroup"].appendChild(mouse_presentation_path);
		else
			slides[activeSlide]["element"].appendChild(mouse_presentation_path);

		history_presentation_elements.push(mouse_presentation_path);

		return false;
	}

	return true;
}

/** Event handler for mouse up in drawing mode.
 *
 *  @param e the event
 */
function drawingMouseup(e)
{
	if(!e)
		e = window.event;

	if (mouse_presentation_path != null)
	{
		var p = calcCoord(e);
		var d = mouse_presentation_path.getAttribute("d");
		d += " L" + p.x + "," + p.y;
		mouse_presentation_path.setAttribute("d", d);
		mouse_presentation_path = null;
		mouse_original_path.setAttribute("d", d);
		mouse_original_path = null;

		return false;
	}

	return true;
}

/** Event handler for mouse move in drawing mode.
 *
 *  @param e the event
 */
function drawingMousemove(e)
{
	if(!e)
		e = window.event;

	var dist = (mouse_last_x - e.clientX) * (mouse_last_x - e.clientX) + (mouse_last_y - e.clientY) * (mouse_last_y - e.clientY);

	if (mouse_presentation_path == null)
	{
		return true;
	}

	if (dist >= mouse_min_dist_sqr)
	{
		var p = calcCoord(e);
		var d = mouse_presentation_path.getAttribute("d");
		d += " L" + p.x + "," + p.y;
		mouse_presentation_path.setAttribute("d", d);
		mouse_original_path.setAttribute("d", d);
		mouse_last_x = e.clientX;
		mouse_last_y = e.clientY;
	}

	return false;
}

/** Event handler for mouse wheel events in slide mode.
 *  based on http://adomas.org/javascript-mouse-wheel/
 *
 *  @param e the event
 */
function slideMousewheel(e)
{
	var delta = 0;

	if (!e)
		e = window.event;

	if (e.wheelDelta)
	{ // IE Opera
		delta = e.wheelDelta/120;
	}
	else if (e.detail)
	{ // MOZ
		delta = -e.detail/3;
	}

	if (delta > 0)
		rps.stage.changeSlide(-1);
	else if (delta < 0)
		rps.stage.changeSlide(1);

	if (e.preventDefault)
		e.preventDefault();

	e.returnValue = false;
}

/** Event handler for mouse wheel events in index mode.
 *  based on http://adomas.org/javascript-mouse-wheel/
 *
 *  @param e the event
 */
function indexMousewheel(e)
{
	var delta = 0;

	if (!e)
		e = window.event;

	if (e.wheelDelta)
	{ // IE Opera
		delta = e.wheelDelta/120;
	}
	else if (e.detail)
	{ // MOZ
		delta = -e.detail/3;
	}

	if (delta > 0)
		indexSetPageSlide(activeSlide - INDEX_COLUMNS * INDEX_COLUMNS);
	else if (delta < 0)
		indexSetPageSlide(activeSlide + INDEX_COLUMNS * INDEX_COLUMNS);

	if (e.preventDefault)
		e.preventDefault();

	e.returnValue = false;
}

/** Function to set the path paint width.
*/
function set_path_paint_width()
{
	var svgPoint1 = document.documentElement.createSVGPoint();
	var svgPoint2 = document.documentElement.createSVGPoint();

	svgPoint1.x = 0.0;
	svgPoint1.y = 0.0;
	svgPoint2.x = 1.0;
	svgPoint2.y = 0.0;

	var matrix = slides[activeSlide]["element"].getTransformToElement(rps.dom.getRoot());

	if (slides[activeSlide]["viewGroup"])
		matrix = slides[activeSlide]["viewGroup"].getTransformToElement(rps.dom.getRoot());

	svgPoint1 = svgPoint1.matrixTransform(matrix);
	svgPoint2 = svgPoint2.matrixTransform(matrix);

	path_paint_width = path_width / Math.sqrt((svgPoint2.x - svgPoint1.x) * (svgPoint2.x - svgPoint1.x) + (svgPoint2.y - svgPoint1.y) * (svgPoint2.y - svgPoint1.y));
}

/** The view effect.
 *
 *  @param dir direction the effect should be played (1 = forwards, -1 = backwards)
 *  @param element the element the effect should be applied to
 *  @param time the time that has elapsed since the beginning of the effect
 *  @param options a dictionary with additional options (e.g. length of the effect); for the view effect the options need to contain the old and the new matrix.
 */
function view(dir, element, time, options)
{
	var length = 250;
	var fraction;

	if (!options["matrixInitial"])
	{
		var tempString = slides[activeSlide]["viewGroup"].getAttribute("transform");

		if (tempString)
			options["matrixInitial"] = (new matrixSVG()).fromAttribute(tempString);
		else
			options["matrixInitial"] = (new matrixSVG()).fromSVGElements(1, 0, 0, 1, 0, 0);
	}

	if ((time == STATE_END) || (time == STATE_START))
		fraction = 1;
	else
	{
		if (options && options["length"])
			length = options["length"];

		fraction = time / length;
	}

	if (dir == 1)
	{
		if (fraction <= 0)
		{
			element.setAttribute("transform", options["matrixInitial"].toAttribute());
		}
		else if (fraction >= 1)
		{
			element.setAttribute("transform", options["matrixNew"].toAttribute());

			set_path_paint_width();

			options["matrixInitial"] = null;
			return true;
		}
		else
		{
			element.setAttribute("transform", options["matrixInitial"].mix(options["matrixNew"], fraction).toAttribute());
		}
	}
	else if (dir == -1)
	{
		if (fraction <= 0)
		{
			element.setAttribute("transform", options["matrixInitial"].toAttribute());
		}
		else if (fraction >= 1)
		{
			element.setAttribute("transform", options["matrixOld"].toAttribute());
			set_path_paint_width();

			options["matrixInitial"] = null;
			return true;
		}
		else
		{
			element.setAttribute("transform", options["matrixInitial"].mix(options["matrixOld"], fraction).toAttribute());
		}
	}

	return false;
}

/** The fade effect.
 *
 *  @param dir direction the effect should be played (1 = forwards, -1 = backwards)
 *  @param element the element the effect should be applied to
 *  @param time the time that has elapsed since the beginning of the effect
 *  @param options a dictionary with additional options (e.g. length of the effect)
 */
function fade(dir, element, time, options)
{
	var length = 250;
	var fraction;

	if ((time == STATE_END) || (time == STATE_START))
		fraction = 1;
	else
	{
		if (options && options["length"])
			length = options["length"];

		fraction = time / length;
	}

	if (dir == 1)
	{
		if (fraction <= 0)
		{
			element.style.display = "none";
			element.setAttribute("opacity", 0);
		}
		else if (fraction >= 1)
		{
			element.style.display = "inherit";
			element.setAttribute("opacity", 1);
			return true;
		}
		else
		{
			element.style.display = "inherit";
			element.setAttribute("opacity", fraction);
		}
	}
	else if (dir == -1)
	{
		if (fraction <= 0)
		{
			element.style.display = "inherit";
			element.setAttribute("opacity", 1);
		}
		else if (fraction >= 1)
		{
			element.setAttribute("opacity", 0);
			element.style.display = "none";
			return true;
		}
		else
		{
			element.style.display = "inherit";
			element.setAttribute("opacity", 1 - fraction);
		}
	}
	return false;
}

/** The appear effect.
 *
 *  @param dir direction the effect should be played (1 = forwards, -1 = backwards)
 *  @param element the element the effect should be applied to
 *  @param time the time that has elapsed since the beginning of the effect
 *  @param options a dictionary with additional options (e.g. length of the effect)
 */
function appear(dir, element, time, options)
{
	if (dir == 1)
	{
		element.style.display = "inherit";
		element.setAttribute("opacity",1);
	}
	else if (dir == -1)
	{
		element.style.display = "none";
		element.setAttribute("opacity",0);
	}
	return true;
}

/** The pop effect.
 *
 *  @param dir direction the effect should be played (1 = forwards, -1 = backwards)
 *  @param element the element the effect should be applied to
 *  @param time the time that has elapsed since the beginning of the effect
 *  @param options a dictionary with additional options (e.g. length of the effect)
 */
function pop(dir, element, time, options)
{
	var length = 500;
	var fraction;

	if ((time == STATE_END) || (time == STATE_START))
		fraction = 1;
	else
	{
		if (options && options["length"])
			length = options["length"];

		fraction = time / length;
	}

	if (dir == 1)
	{
		if (fraction <= 0)
		{
			element.setAttribute("opacity", 0);
			element.setAttribute("transform", "scale(0)");
			element.style.display = "none";
		}
		else if (fraction >= 1)
		{
			element.setAttribute("opacity", 1);
			element.removeAttribute("transform");
			element.style.display = "inherit";
			return true;
		}
		else
		{
			element.style.display = "inherit";
			var opacityFraction = fraction * 3;
			if (opacityFraction > 1)
				opacityFraction = 1;
			element.setAttribute("opacity", opacityFraction);
			var offsetX = rps.ui.width * (1.0 - fraction) / 2.0;
			var offsetY = rps.ui.height * (1.0 - fraction) / 2.0;
			element.setAttribute("transform", "translate(" + offsetX + "," + offsetY + ") scale(" + fraction + ")");
		}
	}
	else if (dir == -1)
	{
		if (fraction <= 0)
		{
			element.setAttribute("opacity", 1);
			element.setAttribute("transform", "scale(1)");
			element.style.display = "inherit";
		}
		else if (fraction >= 1)
		{
			element.setAttribute("opacity", 0);
			element.removeAttribute("transform");
			element.style.display = "none";
			return true;
		}
		else
		{
			element.setAttribute("opacity", 1 - fraction);
			element.setAttribute("transform", "scale(" + 1 - fraction + ")");
			element.style.display = "inherit";
		}
	}
	return false;
}

/** Function to set a slide either to the start or the end state.
 *
 *  @param slide the slide to use
 *  @param state the state into which the slide should be set
 */
function setSlideToState(slide) {
	window.location.hash = (activeSlide + 1);
}

/** Convenience function to translate a attribute string into a dictionary.
 *
 *	@param str the attribute string
 *  @return a dictionary
 *  @see dictToPropStr
 */
function propStrToDict(str)
{
	var list = str.split(";");
	var obj = new Object();

	for (var counter = 0; counter < list.length; counter++)
	{
		var subStr = list[counter];
		var subList = subStr.split(":");
		if (subList.length == 2)
		{
			obj[subList[0]] = subList[1];
		}
	}

	return obj;
}

/** Convenience function to translate a dictionary into a string that can be used as an attribute.
 *
 *  @param dict the dictionary to convert
 *  @return a string that can be used as an attribute
 *  @see propStrToDict
 */
function dictToPropStr(dict)
{
	var str = "";

	for (var key in dict)
	{
		str += key + ":" + dict[key] + ";";
	}

	return str;
}

/** Sub-function to add a suffix to the ids of the node and all its children.
 *
 *	@param node the node to change
 *	@param suffix the suffix to add
 *	@param replace dictionary of replaced ids
 *  @see suffixNodeIds
 */
function suffixNoneIds_sub(node, suffix, replace)
{
	if (node.nodeType == 1)
	{
		if (node.getAttribute("id"))
		{
			var id = node.getAttribute("id")
				replace["#" + id] = id + suffix;
			node.setAttribute("id", id + suffix);
		}

		if ((node.nodeName == "use") && (node.getAttributeNS(NSS['xlink'], "href")) && (replace[node.getAttribute(NSS['xlink'], "href")]))
			node.setAttribute(NSS['xlink'], "href", node.getAttribute(NSS['xlink'], "href") + suffix);

		if (node.childNodes)
		{
			for (var counter = 0; counter < node.childNodes.length; counter++)
				suffixNoneIds_sub(node.childNodes[counter], suffix, replace);
		}
	}
}

/** Function to add a suffix to the ids of the node and all its children.
 *
 *	@param node the node to change
 *	@param suffix the suffix to add
 *  @return the changed node
 *  @see suffixNodeIds_sub
 */
function suffixNodeIds(node, suffix)
{
	var replace = new Object();

	suffixNoneIds_sub(node, suffix, replace);

	return node;
}

/** Function to hide the progress bar.
 *
 */
function hideProgressBar()
{
	var progress_bar = document.getElementById("layer_progress_bar");

	if (!progress_bar)
	{
		return;
	}

	progress_bar.setAttribute("style", "display: none;");
}

/** Function to show the progress bar.
 *
 */
function showProgressBar()
{
	var progress_bar = document.getElementById("layer_progress_bar");

	if (!progress_bar)
	{
		return;
	}

	progress_bar.setAttribute("style", "display: inherit;");
}

/** Set progress bar value.
 *
 *	@param value the current slide number
 *
 */
function setProgressBarValue(value)
{
	var rect_progress_bar = document.getElementById("rect_progress_bar");

	if (!rect_progress_bar)
	{
		return;
	}

	if (value < 1)
	{
		// First slide, assumed to be the title of the presentation
		var x = 0;
		var w = 0.01 * rps.ui.height;
	}
	else if (value >= slides.length - 1)
	{
		// Last slide, assumed to be the end of the presentation
		var x = rps.ui.width - 0.01 * rps.ui.height;
		var w = 0.01 * rps.ui.height;
	}
	else
	{
		value -= 1;
		value /= (slides.length - 2);

		var x = rps.ui.width * value;
		var w = rps.ui.width / (slides.length - 2);
	}

	rect_progress_bar.setAttribute("x", x);
	rect_progress_bar.setAttribute("width", w);
}

/** Set time indicator.
 *
 *	@param value the percentage of time elapse so far between 0.0 and 1.0
 *
 */
function setTimeIndicatorValue(value) {
	var circle_timer_indicator = document.getElementById("circle_timer_indicator");

	if (!circle_timer_indicator) {
		return;
	}

	if (value < 0.0) {
		value = 0.0;
	} else if (value > 1.0) {
		value = 1.0;
	}

	var cx = (rps.ui.width - 0.01 * rps.ui.height) * value + 0.005 * rps.ui.height;
	circle_timer_indicator.setAttribute("cx", cx);
}

/** Update timer.
 *
 */
function updateTimer() {
	timer_elapsed += 1;
	setTimeIndicatorValue((timer_elapsed - timer_start) / (60 * timer_duration));
}

/** Convert screen coordinates to document coordinates.
 *
 *  @param e event with screen coordinates
 *
 *  @return coordinates in SVG file coordinate system
 */
function calcCoord(e) {
	var svgPoint = document.documentElement.createSVGPoint();
	svgPoint.x = e.clientX + window.pageXOffset;
	svgPoint.y = e.clientY + window.pageYOffset;

	var matrix = slides[activeSlide]["element"].getScreenCTM();

	if (slides[activeSlide]["viewGroup"])
		matrix = slides[activeSlide]["viewGroup"].getScreenCTM();

	svgPoint = svgPoint.matrixTransform(matrix.inverse());
	return svgPoint;
}

/** Convenience function to obtain a transformation matrix from a point matrix.
 *
 *	@param mPoints Point matrix.
 *	@return A transformation matrix.
 */
function pointMatrixToTransformation(mPoints)
{
	mPointsOld = (new matrixSVG()).fromElements(0, rps.ui.width, rps.ui.width, 0, 0, rps.ui.height, 1, 1, 1);

	return mPointsOld.mult(mPoints.inv());
}

/** Convenience function to obtain a matrix with three corners of a rectangle.
 *
 *	@param rect an svg rectangle
 *	@return a matrixSVG containing three corners of the rectangle
 */
function rectToMatrix(rect)
{
	rectWidth = rect.getBBox().width;
	rectHeight = rect.getBBox().height;
	rectX = rect.getBBox().x;
	rectY = rect.getBBox().y;
	rectXcorr = 0;
	rectYcorr = 0;

	scaleX = rps.ui.width / rectWidth;
	scaleY = rps.ui.height / rectHeight;

	if (scaleX > scaleY)
	{
		scaleX = scaleY;
		rectXcorr -= (rps.ui.width / scaleX - rectWidth) / 2;
		rectWidth = rps.ui.width / scaleX;
	}
	else
	{
		scaleY = scaleX;
		rectYcorr -= (rps.ui.height / scaleY - rectHeight) / 2;
		rectHeight = rps.ui.height / scaleY;
	}

	if (rect.transform.baseVal.numberOfItems < 1)
	{
		mRectTrans = (new matrixSVG()).fromElements(1, 0, 0, 0, 1, 0, 0, 0, 1);
	}
	else
	{
		mRectTrans = (new matrixSVG()).fromSVGMatrix(rect.transform.baseVal.consolidate().matrix);
	}

	newBasePoints = (new matrixSVG()).fromElements(rectX, rectX, rectX, rectY, rectY, rectY, 1, 1, 1);
	newVectors = (new matrixSVG()).fromElements(rectXcorr, rectXcorr + rectWidth, rectXcorr + rectWidth, rectYcorr, rectYcorr, rectYcorr + rectHeight, 0, 0, 0);

	return mRectTrans.mult(newBasePoints.add(newVectors));
}

/** Class processing the location hash.
 *
 *	@param str location hash
 */
function LocationHash(str)
{
	this.slideNumber = 0;
	this.effectNumber = 0;

	str = str.substr(1, str.length - 1);

	var parts = str.split('_');

	// Try to extract slide number.
	if (parts.length >= 1)
	{
		try
		{
			var slideNumber = parseInt(parts[0]);

			if (!isNaN(slideNumber))
			{
				this.slideNumber = slideNumber - 1;
			}
		}
		catch (e)
		{
		}
	}

	// Try to extract effect number.
	if (parts.length >= 2)
	{
		try
		{
			var effectNumber = parseInt(parts[1]);

			if (!isNaN(effectNumber))
			{
				this.effectNumber = effectNumber;
			}
		}
		catch (e)
		{
		}
	}
}

/** Class representing an svg matrix.
*/
function matrixSVG()
{
	this.e11 = 0; // a
	this.e12 = 0; // c
	this.e13 = 0; // e
	this.e21 = 0; // b
	this.e22 = 0; // d
	this.e23 = 0; // f
	this.e31 = 0;
	this.e32 = 0;
	this.e33 = 0;
}

/** Constructor function.
 *
 *	@param a element a (i.e. 1, 1) as described in the svg standard.
 *	@param b element b (i.e. 2, 1) as described in the svg standard.
 *	@param c element c (i.e. 1, 2) as described in the svg standard.
 *	@param d element d (i.e. 2, 2) as described in the svg standard.
 *	@param e element e (i.e. 1, 3) as described in the svg standard.
 *	@param f element f (i.e. 2, 3) as described in the svg standard.
 */
matrixSVG.prototype.fromSVGElements = function(a, b, c, d, e, f)
{
	this.e11 = a;
	this.e12 = c;
	this.e13 = e;
	this.e21 = b;
	this.e22 = d;
	this.e23 = f;
	this.e31 = 0;
	this.e32 = 0;
	this.e33 = 1;

	return this;
}

/** Constructor function.
 *
 *	@param matrix an svg matrix as described in the svg standard.
 */
matrixSVG.prototype.fromSVGMatrix = function(m)
{
	this.e11 = m.a;
	this.e12 = m.c;
	this.e13 = m.e;
	this.e21 = m.b;
	this.e22 = m.d;
	this.e23 = m.f;
	this.e31 = 0;
	this.e32 = 0;
	this.e33 = 1;

	return this;
}

/** Constructor function.
 *
 *	@param e11 element 1, 1 of the matrix.
 *	@param e12 element 1, 2 of the matrix.
 *	@param e13 element 1, 3 of the matrix.
 *	@param e21 element 2, 1 of the matrix.
 *	@param e22 element 2, 2 of the matrix.
 *	@param e23 element 2, 3 of the matrix.
 *	@param e31 element 3, 1 of the matrix.
 *	@param e32 element 3, 2 of the matrix.
 *	@param e33 element 3, 3 of the matrix.
 */
matrixSVG.prototype.fromElements = function(e11, e12, e13, e21, e22, e23, e31, e32, e33)
{
	this.e11 = e11;
	this.e12 = e12;
	this.e13 = e13;
	this.e21 = e21;
	this.e22 = e22;
	this.e23 = e23;
	this.e31 = e31;
	this.e32 = e32;
	this.e33 = e33;

	return this;
}

/** Constructor function.
 *
 *	@param attrString string value of the "transform" attribute (currently only "matrix" is accepted)
 */
matrixSVG.prototype.fromAttribute = function(attrString)
{
	str = attrString.substr(7, attrString.length - 8);

	str = str.trim();

	strArray = str.split(",");

	// Opera does not use commas to separate the values of the matrix, only spaces.
	if (strArray.length != 6)
		strArray = str.split(" ");

	this.e11 = parseFloat(strArray[0]);
	this.e21 = parseFloat(strArray[1]);
	this.e31 = 0;
	this.e12 = parseFloat(strArray[2]);
	this.e22 = parseFloat(strArray[3]);
	this.e32 = 0;
	this.e13 = parseFloat(strArray[4]);
	this.e23 = parseFloat(strArray[5]);
	this.e33 = 1;

	return this;
}

/** Output function
 *
 *	@return a string that can be used as the "transform" attribute.
 */
matrixSVG.prototype.toAttribute = function()
{
	return "matrix(" + this.e11 + ", " + this.e21 + ", " + this.e12 + ", " + this.e22 + ", " + this.e13 + ", " + this.e23 + ")";
}

/** Matrix nversion.
 *
 *	@return the inverse of the matrix
 */
matrixSVG.prototype.inv = function()
{
	out = new matrixSVG();

	det = this.e11 * (this.e33 * this.e22 - this.e32 * this.e23) - this.e21 * (this.e33 * this.e12 - this.e32 * this.e13) + this.e31 * (this.e23 * this.e12 - this.e22 * this.e13);

	out.e11 =  (this.e33 * this.e22 - this.e32 * this.e23) / det;
	out.e12 = -(this.e33 * this.e12 - this.e32 * this.e13) / det;
	out.e13 =  (this.e23 * this.e12 - this.e22 * this.e13) / det;
	out.e21 = -(this.e33 * this.e21 - this.e31 * this.e23) / det;
	out.e22 =  (this.e33 * this.e11 - this.e31 * this.e13) / det;
	out.e23 = -(this.e23 * this.e11 - this.e21 * this.e13) / det;
	out.e31 =  (this.e32 * this.e21 - this.e31 * this.e22) / det;
	out.e32 = -(this.e32 * this.e11 - this.e31 * this.e12) / det;
	out.e33 =  (this.e22 * this.e11 - this.e21 * this.e12) / det;

	return out;
}

/** Matrix multiplication.
 *
 *	@param op another svg matrix
 *	@return this * op
 */
matrixSVG.prototype.mult = function(op)
{
	out = new matrixSVG();

	out.e11 = this.e11 * op.e11 + this.e12 * op.e21 + this.e13 * op.e31;
	out.e12 = this.e11 * op.e12 + this.e12 * op.e22 + this.e13 * op.e32;
	out.e13 = this.e11 * op.e13 + this.e12 * op.e23 + this.e13 * op.e33;
	out.e21 = this.e21 * op.e11 + this.e22 * op.e21 + this.e23 * op.e31;
	out.e22 = this.e21 * op.e12 + this.e22 * op.e22 + this.e23 * op.e32;
	out.e23 = this.e21 * op.e13 + this.e22 * op.e23 + this.e23 * op.e33;
	out.e31 = this.e31 * op.e11 + this.e32 * op.e21 + this.e33 * op.e31;
	out.e32 = this.e31 * op.e12 + this.e32 * op.e22 + this.e33 * op.e32;
	out.e33 = this.e31 * op.e13 + this.e32 * op.e23 + this.e33 * op.e33;

	return out;
}

/** Matrix addition.
 *
 *	@param op another svg matrix
 *	@return this + op
 */
matrixSVG.prototype.add = function(op)
{
	out = new matrixSVG();

	out.e11 = this.e11 + op.e11;
	out.e12 = this.e12 + op.e12;
	out.e13 = this.e13 + op.e13;
	out.e21 = this.e21 + op.e21;
	out.e22 = this.e22 + op.e22;
	out.e23 = this.e23 + op.e23;
	out.e31 = this.e31 + op.e31;
	out.e32 = this.e32 + op.e32;
	out.e33 = this.e33 + op.e33;

	return out;
}

/** Matrix mixing.
 *
 *	@param op another svg matrix
 *	@parma contribOp contribution of the other matrix (0 <= contribOp <= 1)
 *	@return (1 - contribOp) * this + contribOp * op
 */
matrixSVG.prototype.mix = function(op, contribOp)
{
	contribThis = 1.0 - contribOp;
	out = new matrixSVG();

	out.e11 = contribThis * this.e11 + contribOp * op.e11;
	out.e12 = contribThis * this.e12 + contribOp * op.e12;
	out.e13 = contribThis * this.e13 + contribOp * op.e13;
	out.e21 = contribThis * this.e21 + contribOp * op.e21;
	out.e22 = contribThis * this.e22 + contribOp * op.e22;
	out.e23 = contribThis * this.e23 + contribOp * op.e23;
	out.e31 = contribThis * this.e31 + contribOp * op.e31;
	out.e32 = contribThis * this.e32 + contribOp * op.e32;
	out.e33 = contribThis * this.e33 + contribOp * op.e33;

	return out;
}

/** Trimming function for strings.
*/
String.prototype.trim = function()
{
	return this.replace(/^\s+|\s+$/g, '');
}

