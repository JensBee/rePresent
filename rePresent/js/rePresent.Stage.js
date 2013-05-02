/** Slides display class. */
RePresent.Stage = function () {
  // SVG viewbox
  var vBox = {};
  var conf;
  // var MODES = {
  //   slide: 0, // presentation mode
  //   index: 1 // slides index view
  // };
  // important nodes
  var e = {};
  // current display mode
  var mode;// = MODES.slide;
  // stores parent -> child association to properly show stacked parts
  var nodes = {
    lastParent: null, // parent of current shown slide
    // children (parts) of the parent of the current slide wich are visible
    visible: []
  };
  // slides state object. may be shared between sub-classes.
  var slides = {
    // all: all slide elements found
    // current: current slide element
  };

  /** Private index state object. */
  var _index = {
    // columns: number of columns to display
    // _grid: slides grid
    // lastSlide: slide element displayed when entering index mode
    // scale: scaling factor of pages to fit on a single page
    // slidePositions: array with [[slide][slide, part]] elements in order
    // slidesPerPage: number of slides per page
    // space: spacing between pages
  };

  /** Simple functions to interact with sub-modules. */
  this.api = {
    getSlideIndex: function(slide) {
      for (var i=0; i<_index.slidePositions.length; i++) {
        for (var j=0; j<_index.slidePositions[i].length; j++){
          var partSlide = RePresent.Util.Slide.getById(
          _index.slidePositions[i][j]);
          if (slide === partSlide) {
            return i;
          }
       }
      }
      return null;
    },

    /** Acessor object for the private index state. */
    index: {
        get: function(property) {
          if (property in _index && !property.startsWith('_')) {
            return _index[property];
          }
          return null;
        }
    },

    getAllSlides: function() {
      return RePresent.Util.e.slidesStack.getElementsByTagName('use');
    },

    getCurrentSlide: function() {
      return slides.current;
    },

    setCurrentSlide: function(slide) {
      slides.current = slide;
    }
  };

  this.init = function(config) {
    conf = config;
    var viewBox = RePresent.Util.getViewBoxDimension();
    vBox.width = viewBox[0];
    vBox.height = viewBox[1];
    mode = RePresent.Stage.MODES.slide;

    // gather all slides
    slides.all = this.api.getAllSlides();

    _index.slidePositions = RePresent.Stage.Util.collectSlides();

    // create a custom layer for the slides grids
    e.root = document.createElementNS(RePresent.Util.NSS.svg, 'g');
    e.root.id = 'rePresent-slides-index';
    document.documentElement.appendChild(e.root);
    setState();
    _index._grid = new RePresent.Stage.Grid();
    _index._grid.init({
      api: this.api,
      root: e.root,
      vBox: vBox
    });
  };

  /** Update changeable paramter values. */
  function setState() {
    // space between slides in index view
    _index.space = (conf.index.spacing / 100) * vBox.width;
    // calc real space from percentage value
    _index.scale = vBox.width / ((conf.index.columns * vBox.width) +
      ((conf.index.columns -1) * _index.space));
    _index.columns = conf.index.columns;
    _index.slidesPerPage = _index.columns * _index.columns;
  }

  this.navIndex = function(param) {
    var currentIdx = parseInt(this.api.getSlideIndex(slides.current), 10);
    var newIdx = null;
    var dir = 0; // direction +1: forward, -1 backwards

    switch (param.direction) {
      case 'left':
        newIdx = (currentIdx - 1);
        dir = -1;
        // console.log("left to %o", newIdx);
        break;
      case 'right':
        newIdx = (currentIdx + 1);
        dir = +1;
        // console.log("right to %o", newIdx);
        break;
      case 'up':
        newIdx = (currentIdx - parseInt(_index.columns, 10));
        dir = -1;
        // console.log("up to %o", newIdx);
        break;
      case 'down':
        newIdx = (currentIdx + parseInt(_index.columns, 10));
        dir = +1;
        // console.log("down to %o", newIdx);
        break;
    }

    if (newIdx !== null && newIdx >= 0 &&
          newIdx < _index.slidePositions.length) {
      _index._grid.update({
        current: newIdx,
        direction: dir,
        previous: currentIdx
      });
    }
  };

  /**
  * Callback function
  * param = {
  *   currentSlide: current displaying slide element
  *   direction: -1 for going backwards, +1 for forward
  *   jump:
  *   nextSlide: next slide element
  * }
  */
  this.changeSlide = function(param) {
    // console.log("Nextslide event!");
    var newParent = param.nextSlide.parentNode;
    if (newParent === nodes.lastParent &&
        (RePresent.Util.Element.isPart(param.nextSlide) ||
        RePresent.Util.Element.isPartParent(param.nextSlide))) {
      if (param.direction > 0) { // forward
          // add current node, wich is part-type to the list
          nodes.visible.push(param.nextSlide);
      } else { // backwards
          // we are in a part group: hide only last shown element
          var gPart = nodes.visible.pop();
          RePresent.Util.Element.hide(gPart);
      }
    } else {
      for (var i=0; i<nodes.visible.length; i++) {
        RePresent.Util.Element.hide(nodes.visible[i]);
      }
      nodes.visible = [];

      // hide current slide
      RePresent.Util.Element.hide(param.currentSlide);

      // we stepped back in/jumped into a part: show all previous sibling
      if ((param.direction < 0 || param.jump) && (
          RePresent.Util.Element.isPart(param.nextSlide) ||
          RePresent.Util.Element.isPartParent(param.nextSlide))) {
        nodes.visible = nodes.visible.concat(
          RePresent.Util.Slide.showPreviousParts(param.nextSlide));
      }

      // store current node
      nodes.visible.push(param.nextSlide);
      // store current parent
      nodes.lastParent = newParent;
    }
    // show new slide
    RePresent.Util.Element.show(param.nextSlide);
    slides.current = param.nextSlide;
  };

  this.getSelectedSlide = function() {
    return slides.current;
  };

  /* Hides the index view.
  * @param noCommit If true slide selection will be ignored (optional)
  */
  this.hideIndex = function(noCommit) {
    noCommit = noCommit || false;
    _index._grid.hide();

    if (noCommit) {
      RePresent.Util.Element.hide(slides.current);
      slides.current = _index.lastSlide;
    }

    mode = RePresent.Stage.MODES.slide;
  };

  this.showIndex = function() {
    _index.lastSlide = slides.current;
    RePresent.Util.Element.hide(RePresent.Util.e.master);
    _index._grid.update({
      current: this.api.getSlideIndex(slides.current)
    });
    // _index._grid.show();
    mode = RePresent.Stage.MODES.index;
  };

  /** Toggles the index view without changing a slide.
   * @return The new view mode
   */
  this.toggleIndex = function() {
    if (mode === RePresent.Stage.MODES.index) {
      this.hideIndex(true);
    } else {
      this.showIndex();
    }
    return mode;
  };

  this.getMode = function() {
    return mode;
  };

  this.commitIndex = function() {
    mode = RePresent.Stage.MODES.index;
    this.hideIndex();
    return slides.current;
  };
};

RePresent.Stage.MODES = {
  slide: 0, // presentation mode
  index: 1 // slides index view
}