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

  function hide() {
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
  }

  this.hide = function() { hide(); };

  /**
  * Shows a specific page in index mode.
  * param = {
  *   direction: -1 for going backwards, +1 for forward
  *   page: page number to display
  * }
  */
  function show(param) {
    console.log(":::show();");
    if (!param && isShown) {
      // nothing to do
      return;
    }
    isShown = true;

    if (conf.layer) {
      RePresent.Util.Element.show(conf.layer);
    }

    param = param || {};
    param.direction = param.direction || 0;

    var page;
    if (param.direction) {
      page = (conf.page || 0) + param.direction;
    } else {
      page = parseInt(param.page, 10) || 0;
    }
    if (conf.page == page) {
      return;
    }
    conf.page = page;

    var scrollAmount;
    var offset = [0, 0];
    // var currentIdx = 0;
    var currentSlideOffset = 0;
    var slideOffset;
    var hideSlide = false;

    slideOffset = page * stageApi.index.get('slidesPerPage');

    if (page > 0) {
      // calulate height of all displayed items
      scrollAmount = (stageApi.index.get('columns') * conf.vBox.height) +
        ((stageApi.index.get('columns')) * conf.space);
      // page n-times down, scale value
      scrollAmount = scrollAmount * page * -1 * stageApi.index.get('scale');
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
        currentSlideOffset < (slideOffset + stageApi.index.get('slidesPerPage'))) {
        hideSlide = false;
      } else {
        // set other slides to display none
        hideSlide = true;
      }

      var x = offset[0] * conf.vBox.width + offset[0] * conf.space;
      var y = offset[1] * conf.vBox.height + offset[1] * conf.space;

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

    // set current index page
    conf.page = page;
  }

  /** See show(); */
  this.show = function (param) {
    console.log(":::this.show();");
    show(param); };

  /*
  * param = { optional
  *   current: current selection index (optional)
  *   hide: hide grid,
  * }
  */
  function drawGrid(param) {
    param = param || {};
    if (param.hide) {
      hide();
    }

    conf.layer.innerHTML = ''; // clear grid
    var slideNum = 0;
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
      var y = (conf.vBox.height * row) + (conf.space * row);
      for (var col=0; col<stageApi.index.get('columns'); col++) {
        var aRect = conf.rect.cloneNode();
        var x = (conf.vBox.width * col) + (conf.space * col);
        RePresent.Util.Element.setAttributes(aRect, {
          x: x,
          y: y
        });
        conf.layer.appendChild(aRect);

        if (param.current && slideNum == param.current) {
          RePresent.Util.Element.setAttributes(aRect, {
            'class': 'selected'
          });
        }

        slideNum++;
      }
    }
  }

  /** Calculate values dependant on number of columns. */
  function calcColumnData() {
    drawGrid();
  }

  /*
  * param = {
  *   current: current selection index
  *   hide: if true, don't show after updating
  *   previous: previous selection index
  * }
  */
  this.update = function(param) {
    console.log(":::this.update();");
    param.current = param.current || 0;
    var noShow = param.hide || false;
    if (param.previous == param.current) {
      return;
    }

    var pages = {};
    if (conf.page === 0) {
      pages.min = 0;
      pages.max = stageApi.index.get('slidesPerPage') -1;
    } else {
      pages.min = (conf.page * stageApi.index.get('slidesPerPage'));
      pages.max = pages.min + stageApi.index.get('slidesPerPage') -1;
    }
    var currentSlide = RePresent.Util.Slide.getById(
          stageApi.index.get('slidePositions')[param.current][0]);
    console.log("update() param.current:%o < pages.min:%o || param.current:%o > pages.max:%o", param.current, pages.min, param.current, pages.max);
    if (param.current < pages.min || param.current > pages.max) {
      console.log(":::this.update(); -> show();");
      show({
        direction: param.direction
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
    var remain = stageApi.index.get('slidePositions').length % stageApi.index.get('slidesPerPage');
    if (remain !== 0) {
      var i;
      console.log("param.current:%o > stageApi.index.get('slidePositions').length:%o - remain:%o -1", param.current, stageApi.index.get('slidePositions').length, remain );
      if (param.current > (stageApi.index.get('slidePositions').length - (remain + 1))) {
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
      console.log(":::this.update(); show();");
      show();
    }

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
    conf.space = (stageApi.index.get('space') / 100) *
      conf.vBox.width;
    // conf.rect =
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
    calcColumnData();
    drawGrid();
  };
};