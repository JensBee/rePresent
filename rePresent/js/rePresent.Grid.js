/** Manages the index view slides grid. */
RePresent.Grid = function () {
  var isShown = false;

  var conf = {
    // layer: layer holding the grid
    // rect: SVG rect element as template for page frames
    // root: parent of the grid layer
    // space: spacing between pages (absolute)
    // page: current index page
    // slidesPerPage: number of slides per page
    // columns: number of columns
  };

  /** Global index page state. Passed in by base class. */
  var index;
  // are there any hidden slide frames?
  var hasHiddenRects = false;
  // Current selected grid index. Null if none.
  var currentSelectionIndex = null;

  var slides = {
    // all: array of all slides
    // current: currently active slide element
    // full: array of "full" slides (parts merged)
    // previous: active slide element when switching to index view
    // //selected: slide element selected in index view
  };

  var visible = false;

  function showAllSlides() {
    var visible;
    for (var i=0; i<slides.full.length; i++) {
      for (var j=0; j<slides.full[i].length; j++){
        var slide = RePresent.Util.Slide.getById(slides.full[i][j]);
        RePresent.Util.Element.setAttributes(slide, {
          transform: {
            translate: null
          }
        });
      }
    }
  }

  /** Hides the index view.
   * @param commit If true the current selected slide will be set active.
   */
  function hide(commit) {
    if (conf.layer) {
      RePresent.Util.Element.hide(conf.layer);
    }
    if (isShown) {
      showAllSlides();
      RePresent.Util.Element.setAttributes(RePresent.Util.e.slidesStack, {
        transform: {
          translate: null,
          scale: null
        }
      });
    }
    isShown = false;
    if (currentSelectionIndex) {
      RePresent.Util.Element.setAttributes(
        conf.layer.getElementsByTagName('use')[currentSelectionIndex], {
          class: null
        }
      );
    }
    currentSelectionIndex = null;
    // show master
    RePresent.Util.Element.hide(RePresent.Util.e.master);

    for (var count=0; count<slides.all.length; count++) {
      RePresent.Util.Element.setAttributes(slides.all[count], {
        transform: null
      });
      // hide all but the current slide
      if (slides[count] !== slides.current) {
        RePresent.Util.Element.hide(slides.all[count]);
      }
    }
    // show previous parts, if necessary
    if (slides.current && RePresent.Util.Slide.isPart(slides.current)) {
      RePresent.Util.Slide.showPreviousParts(currentSlide);
    }
  }

  this.hide = function() { hide(); };

  /**
  * Shows a specific page in index mode.
  * param = {
  *   page: page number to display
  * }
  */
  function show(param) {
    if (!param && isShown) {
      // nothing to do
      return;
    }

    param = param || {};
    param.page = param.page || 0;

    var scrollAmount;
    var offset = [0, 0];
    // var currentIdx = 0;
    var currentSlideOffset = 0;
    var slideOffset;
    var hideSlide = false;

    if (conf.layer) {
      RePresent.Util.Element.show(conf.layer);
      isShown = true;
    }

    slideOffset = param.page * conf.slidesPerPage;

    if (param.page > 0) {
      // calculate height of all displayed items
      scrollAmount = (conf.columns * conf.vBox.height) +
        (conf.columns * conf.space);
      // page n-times down, scale value
      scrollAmount = scrollAmount * param.page * -1 * conf.scale;
    } else {
      scrollAmount = 0;
    }

    RePresent.Util.Element.setAttributes(RePresent.Util.e.slidesStack, {
      transform: {
        translate: "0, " + scrollAmount,
        scale: conf.scale
      }
    });

    // hide master
    RePresent.Util.Element.hide(RePresent.Util.e.master);

    // show only visible slides (on current page) and mark
    // the currently active one
    for (var i=0; i<slides.full.length; i++) {
      if (currentSlideOffset >= slideOffset &&
        currentSlideOffset < (slideOffset +
          conf.slidesPerPage)) {
        hideSlide = false;
      } else {
        // set other slides to display none
        hideSlide = true;
      }

      var x = offset[0] * conf.vBox.width + offset[0] * conf.space;
      var y = offset[1] * conf.vBox.height + offset[1] * conf.space;

      for (var j=0; j<slides.full[i].length; j++){
        var slide = RePresent.Util.Slide.getById(slides.full[i][j]);

        if (hideSlide) {
          RePresent.Util.Element.hide(slide);
        } else {
          RePresent.Util.Element.setAttributes(slide, {
            transform: {
              translate: x + "," + y
            }
          });
          RePresent.Util.Element.show(slide);
        }
      }

      currentSlideOffset++;
      offset[0]++; // columns
      if (((i + 1) % conf.columns) === 0) {
        offset[0] = 0;
        offset[1]++; // rows
      }
    }
  }

  /** Callback function. */
  this.slideEvent = function(slide) {
    slides.current = slide;
  };

  /** See show(); */
  this.show = function (param) {
    // check direction parameter
    if (param.direction && isNaN(param.direction)) {
      param.direction = parseInt(param.direction, 10);
      if (isNaN(param.direction)) {
        param.direction = 1;
        console.warn("Parameter 'direction' is NaN. Defaulting to +1.");
      }
    }

    // check page parameter
    if (param.page && isNaN(param.page)) {
      param.page = parseInt(param.page, 10);
      if (isNaN(param.page)) {
        param.page = 0;
        console.warn("Parameter 'page' is NaN. Defaulting to 0.");
      }
    }

    show(param);
  };

  /*
  * param = { optional
  *   hide: hide grid,
  * }
  */
  function drawGrid(param) {
    param = param || {};
    if (param.hide) {
      hide();
    }

    conf.layer.innerHTML = ''; // clear grid
    RePresent.Util.Element.setAttributes(conf.layer, {
      transform: {
        scale: conf.scale
      }
    });

    RePresent.Util.Element.setAttributes(conf.baseRect, {
      width: conf.vBox.width,
      height: conf.vBox.height
    });

    for (var row=0; row<conf.columns; row++) {
      var y = (conf.vBox.height * row) + (conf.space * row);
      for (var col=0; col<conf.columns; col++) {
        var aRect = conf.rect.cloneNode();
        var x = (conf.vBox.width * col) + (conf.space * col);
        RePresent.Util.Element.setAttributes(aRect, {
          x: x,
          y: y
        });
        conf.layer.appendChild(aRect);
      }
    }
  }

  /*
  * param = {
  *   current: current selection index
  *   hide: if true, don't show after updating
  *   previous: previous selection index
  * }
  */
  this.update = function(param) {
    param.current = param.current || 0;
    var noShow = param.hide || false;
    if (param.previous && param.previous == param.current) {
      return;
    }
    param.previous = param.previous || 0;

    var pages = {};
    conf.page = Math.floor(param.current / conf.slidesPerPage);
    if (conf.page === 0) {
      pages.min = 0;
      pages.max = conf.slidesPerPage -1;
    } else {
      pages.min = (conf.page * conf.slidesPerPage);
      pages.max = pages.min + conf.slidesPerPage -1;
    }
    var currentSlide = RePresent.Util.Slide.getById(
      slides.full[param.current][0]);
    if (param.current < pages.min || param.current > pages.max) {
      conf.page = conf.page + param.direction;
      show({
        page: conf.page
      });
      noShow = true; // prevent double update
    }

    var rects = conf.layer.getElementsByTagName('use');

    // constraint indexes to column size
    param.previous = param.previous % conf.slidesPerPage;
    if (!isNaN(param.previous)) {
      RePresent.Util.Element.setAttributes(rects[param.previous], {
        class: null
      });
    }

    // check if there are any remaining empty slide frames
    var remain = slides.full.length % conf.slidesPerPage;
    if (remain !== 0) {
      var i;
      if (param.current > (slides.full.length - (remain + 1))) {
        for (i=conf.slidesPerPage; i>(remain - 1); i--) {
          // hide remaining frames
          RePresent.Util.Element.hide(rects[i]);
          hasHiddenRects = true;
        }
      } else if (hasHiddenRects) {
        // show any previously hidden frames
        for (i=0; i<rects.length; i++) {
          RePresent.Util.Element.show(rects[i]);
        }
      }
    }

    // calculate relative selection index
    param.current = param.current % conf.slidesPerPage;
    RePresent.Util.Element.setAttributes(rects[param.current], {
      class: 'selected'
    });

    if (!noShow) {
      show({page: conf.page});
    }

    currentSelectionIndex = param.current;
    slides.current = currentSlide;
  };

  function createGridElement() {
    var defs = document.getElementsByTagName('defs')[0];
    var rect = document.createElementNS(RePresent.Util.NSS.svg, 'rect');
    defs.appendChild(rect);
    RePresent.Util.Element.setAttributes(rect, {
      id: 'rePresent-slides-index-grid-rect'
    });
    conf.baseRect = rect;
    conf.rect = document.createElementNS(RePresent.Util.NSS.svg, 'use');
    RePresent.Util.Element.setAttributes(conf.rect, {
      'xlink:href': '#rePresent-slides-index-grid-rect'
    });
  }

  this.navigate = function(param) {
    var currentIdx = RePresent.Util.Slide.findInGrouped(
      slides.full, slides.current);
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
        newIdx = (currentIdx - conf.columns);
        dir = -1;
        // console.log("up to %o", newIdx);
        break;
      case 'down':
        newIdx = (currentIdx + conf.columns);
        dir = +1;
        // console.log("down to %o", newIdx);
        break;
    }

    if (newIdx !== null && newIdx >= 0 &&
          newIdx < slides.full.length) {
      this.update({
        current: newIdx,
        direction: dir,
        previous: currentIdx
      });
    }
  };

  /* Hides the index view.
   * @param noCommit If true slide selection will be ignored (optional)
   */
  this.hideIndex = function(noCommit) {
    noCommit = noCommit || false;
    hide();

    // switch back to the slide active when entering index mode
    if (noCommit) {
      RePresent.Util.Element.hide(slides.current);
      if (RePresent.Util.Slide.isPartType(slides.previous)) {
        RePresent.Util.Slide.showPreviousParts(slides.previous);
      } else {
        RePresent.Util.Element.show(slides.previous);
      }
      slides.current = slides.previous;
    }

    visible = false;
  };

  this.showIndex = function() {
    slides.previous = slides.current;
    RePresent.Util.Element.hide(RePresent.Util.e.master);
    this.update({
      current: RePresent.Util.Slide.findInGrouped(slides.full, slides.current)
    });
    visible = true;
  };

  /** Toggles the index view without changing a slide.
   * @return The new view mode
   */
  this.toggle = function() {
    if (visible === true) {
      this.hideIndex(true);
    } else {
      this.showIndex();
    }
    return visible;
  };

  /** Check whether the index is currently visible.
   * @return True if index is visible
   */
  this.isVisible = function() {
    return visible;
  };

  /** Hide the index and get the currently selected slide element.
   * @return Currently selected slide element
   */
  this.commit = function() {
    var slide = null;
    if (this.isVisible()) {
      this.hideIndex();
      slide = slides.current;
    }
    return slide;
  };

  this.init = function(config) {
    // slide frame template for index grid
    conf.vBox = RePresent.Util.getViewBoxDimension();

    conf.layer = document.createElementNS(RePresent.Util.NSS.svg, 'g');
    conf.layer.id = 'rePresent-slides-index-grid';

    conf.columns = config.index.columns;
    conf.slidesPerPage = conf.columns * conf.columns;
    // space between slides in index view
    conf.space = (config.index.spacing / 100) * conf.vBox.width;
    // calc real space from percentage value
    conf.scale = conf.vBox.width / ((conf.columns * conf.vBox.width) +
      ((conf.columns -1) * conf.space));

    createGridElement();

    RePresent.Util.Element.setAttributes(conf.rect, {
      x: 0, y: 0
    });
    document.documentElement.appendChild(conf.layer);

    slides.all = RePresent.Util.Slide.getAll();
    slides.full = RePresent.Util.Slide.getAllGrouped();

    // initial column setup
    hide();
    drawGrid();
  };
};