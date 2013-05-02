/** Manages the index view slides grid. */
RePresent.Stage.Grid = function () {
  var isShown = false;

  var conf = {
    // layer: layer holding the grid
    // rect: SVG rect element as template for page frames
    // root: parent of the grid layer
    // space: spacing between pages (absolute)
    // page: current index page
  };

  /** Global index page state. Passed in by base class. */
  var index;
  // are there any hidden slide frames?
  var hasHiddenRects = false;
  // Current selected grid index. Null if none.
  var currentSelectionIndex = null;

  var stageApi;

  function showAllSlides() {
    var visible;
    for (var i=0; i<stageApi.index.get('slidePositions').length; i++) {
      for (var j=0; j<stageApi.index.get('slidePositions')[i].length; j++){
        var slide = RePresent.Util.Slide.getById(
          stageApi.index.get('slidePositions')[i][j]);
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

    var slides = stageApi.getAllSlides();
    var currentSlide = stageApi.getCurrentSlide();
    for (var count=0; count<slides.length; count++) {
      RePresent.Util.Element.setAttributes(slides[count], {
        transform: null
      });
      // hide all but the current slide
      if (slides[count] !== currentSlide) {
        RePresent.Util.Element.hide(slides[count]);
      }
    }
    // show previous parts, if neccessary
    if (currentSlide && RePresent.Util.Element.isPart(currentSlide)) {
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

    slideOffset = param.page * stageApi.index.get('slidesPerPage');

    if (param.page > 0) {
      // calulate height of all displayed items
      scrollAmount = (stageApi.index.get('columns') * conf.vBox.height) +
        ((stageApi.index.get('columns')) * stageApi.index.get('space'));
      // page n-times down, scale value
      scrollAmount = scrollAmount * param.page * -1 * stageApi.index.get('scale');
    } else {
      scrollAmount = 0;
    }

    RePresent.Util.Element.setAttributes(RePresent.Util.e.slidesStack, {
      transform: {
        translate: "0, " + scrollAmount,
        scale: stageApi.index.get('scale')
      }
    });

    // hide master
    RePresent.Util.Element.hide(RePresent.Util.e.master);

    // show only visible slides (on current page) and mark
    // the currently active one
    for (var i=0; i<stageApi.index.get('slidePositions').length; i++) {
      if (currentSlideOffset >= slideOffset &&
        currentSlideOffset < (slideOffset +
          stageApi.index.get('slidesPerPage'))) {
        hideSlide = false;
      } else {
        // set other slides to display none
        hideSlide = true;
      }

      var x = offset[0] * conf.vBox.width + offset[0] *
        stageApi.index.get('space');
      var y = offset[1] * conf.vBox.height + offset[1] *
        stageApi.index.get('space');

      for (var j=0; j<stageApi.index.get('slidePositions')[i].length; j++){
        var slide = RePresent.Util.Slide.getById(
          stageApi.index.get('slidePositions')[i][j]);

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
      if (((i + 1) % stageApi.index.get('columns')) === 0) {
        offset[0] = 0;
        offset[1]++; // rows
      }
    }
  }

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
        scale: stageApi.index.get('scale')
      }
    });

    RePresent.Util.Element.setAttributes(conf.baseRect, {
      width: conf.vBox.width,
      height: conf.vBox.height
    });

    for (var row=0; row<stageApi.index.get('columns'); row++) {
      var y = (conf.vBox.height * row) + (stageApi.index.get('space') * row);
      for (var col=0; col<stageApi.index.get('columns'); col++) {
        var aRect = conf.rect.cloneNode();
        var x = (conf.vBox.width * col) + (stageApi.index.get('space') * col);
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
    //conf.page = conf.page || 0;
    conf.page = Math.floor(param.current / stageApi.index.get('slidesPerPage'));
    if (conf.page === 0) {
      pages.min = 0;
      pages.max = stageApi.index.get('slidesPerPage') -1;
    } else {
      pages.min = (conf.page * stageApi.index.get('slidesPerPage'));
      pages.max = pages.min + stageApi.index.get('slidesPerPage') -1;
    }
    var currentSlide = RePresent.Util.Slide.getById(
          stageApi.index.get('slidePositions')[param.current][0]);
    if (param.current < pages.min || param.current > pages.max) {
      conf.page = conf.page + param.direction;
      show({
        page: conf.page
      });
      noShow = true; // prevent double update
    }

    var rects = conf.layer.getElementsByTagName('use');

    // constraint indexes to column size
    param.previous = param.previous % stageApi.index.get('slidesPerPage');
    if (!isNaN(param.previous)) {
      RePresent.Util.Element.setAttributes(rects[param.previous], {
        class: null
      });
    }

    // check if there are any remaining empty slide frames
    var remain = stageApi.index.get('slidePositions').length %
      stageApi.index.get('slidesPerPage');
    if (remain !== 0) {
      var i;
      if (param.current > (
            stageApi.index.get('slidePositions').length - (remain + 1)
          )) {
        for (i=stageApi.index.get('slidesPerPage'); i>(remain - 1); i--) {
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
    param.current = param.current % stageApi.index.get('slidesPerPage');
    RePresent.Util.Element.setAttributes(rects[param.current], {
      class: 'selected'
    });

    if (!noShow) {
      show({page: conf.page});
    }

    currentSelectionIndex = param.current;
    stageApi.setCurrentSlide(currentSlide);
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

  /**
  * @param param = {
  *   columns: number of columns to display (defaults to 4)
  *   height: height of a slide
  *   space: spacing between slides (percentage) (defaults to 5.0)
  *   root: parent of the grid layer
  *   width: width of a slide
  * }
  */
  this.init = function(param) {
    // slide frame template for index grid
    stageApi = param.api;
    conf.vBox = param.vBox;
    conf.layer = document.createElementNS(
      RePresent.Util.NSS.svg, 'g');
    createGridElement();
    conf.root = param.root || document.documentElement;

    RePresent.Util.Element.setAttributes(conf.rect, {
      x: 0, y: 0
    });
    conf.layer.id = 'rePresent-slides-index-grid';
    conf.root.appendChild(conf.layer);

    index = param.indexObj;
    // initial column setup
    hide();
    drawGrid();
  };
};