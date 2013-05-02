RePresent.Util.Slide = {
  /** Count the number of slides starting at the given element. Parts will
  * be counted as individual slides.
  * @param Element to start the search at
  */
  count: function(element) {
    RePresent.Util.e.slidesStack.getElementsByTagName('use');
    if (slides !== null) {
      slidesCount = slides.length;
    }
  },

  /** Shows all previous slides inside a group regardless of their type. */
  showPreviousParts: function(element) {
    var hasPrev = true;
    var node = element;
    var nodes = [];
    RePresent.Util.Element.show(node);
    while (hasPrev) {
      var sibling = node.previousSibling;
      if (sibling === null) {
        hasPrev = false;
      } else {
        if (RePresent.Util.Element.isGroup(sibling)) {
          hasPrev = false;
        } else {
          nodes.push(sibling);
          RePresent.Util.Element.show(sibling);
        }
      }
      node = sibling;
    }
      // return correct stacking order (lifo order)
      return nodes.reverse();
    },

  /** Get the id of a slide.
  * @param Slide to get the id for
  */
  getId: function(element) {
    return element.getAttributeNS(RePresent.Util.NSS.xlink, 'href');
  },

  /** Get a specific slide by given link id.
  * @param The id of the linked slide
  */
  getById: function(id) {
    var found = false;
    var slide = RePresent.Util.Slide.findNext({
      element: RePresent.Util.e.slidesStack.children[0],
      direction: +1
    });
    while(!found) {
      if (slide === null) {
        found = true;
      } else {
        if (RePresent.Util.Slide.getId(slide) == id) {
          found = true;
        } else {
          slide = RePresent.Util.Slide.findNext({
            element: slide,
            currentElement: slide,
            direction: +1
          });
        }
      }
    }
    return slide;
  },

  /** Find the next slide we want to display.
  * @param object with:
  * - element: element to start the search at. Required.
  * - currentElement: Element currently displayed. Required.
  * - direction: <0 for backwards, >0 for forward search. Optional,
  *     defaults to forward.
  * - noIncrement: If true the function will operate on the current
  *    node, instead of incrementing/decrementing. Optional, defaults
  *    to false.
  */
  findNext: function(param) {
    // console.log("findNextSlide <- %o",param);
    if (param.element === null) {
      return null;
    }
    var slide = null;
    var sFunc; // search function
    var nextSlide = null;

    if (typeof param.direction == 'undefined') {
      param.direction = +1;
    }

    if (typeof param.noIncrement == 'undefined' || !param.noIncrement) {
      if (param.direction > 0) { // forward search
        sFunc = RePresent.Util.Element.getNextNode;
        slide = param.element;
      } else { // backwards search
        sFunc = RePresent.Util.Element.getPrevNode;
        slide = sFunc(param.element, RePresent.Util.e.slidesStack.id);
      }
    } else {
      slide = param.element;
    }

    if (RePresent.Util.Element.isGroup(slide)) {
      // a group
      var children = slide.children;
      // store id of current group
      if (children.length > 0) {
        // group with children
        if (param.direction > 0) {
          nextSlide = RePresent.Util.Slide.findNext({
            element: children[0],
            currentElement: param.currentElement,
            direction: param.direction
          });
        } else {
          nextSlide = children[children.length -1];
          if (RePresent.Util.Element.isGroup(nextSlide)) {
            // check contents, don't decrement node
            nextSlide = RePresent.Util.Slide.findNext({
              element: nextSlide,
              currentElement: param.currentElement,
              direction: param.direction,
              noIncrement: true
            });
          }
        }
      } else {
        nextSlide = RePresent.Util.Slide.findNext({
          element: sFunc(slide, RePresent.Util.e.slidesStack.id),
          currentElement: param.currentElement,
          direction: param.direction
        });
      }
    } else {
      // a slide
      nextSlide = slide;
      if (nextSlide === param.currentElement) {
        nextSlide = RePresent.Util.Slide.findNext({
          element: sFunc(slide, RePresent.Util.e.slidesStack.id),
          currentElement: param.currentElement,
          direction: param.direction
        });
      }
    }
    // console.log("findNextSlide -> %o",nextSlide);
    return nextSlide;
  }
};