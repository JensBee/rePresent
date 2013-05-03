/** Slides display class.
 * Simple implementation that simply sets the current slide visible and
 * hides all other.
 */
RePresent.Stage = function () {
  var nodes = {
    lastParent: null, // parent of current shown slide
    // children (parts) of the parent of the current slide wich are visible
    visible: []
  };

  /** Class initialization, */
  this.init = function(config) {
    // left empty
  };

  /** Callback function. */
  this.changeSlideEvent = function(param) {
    // console.log("Nextslide event!");
    var newParent = param.nextSlide.parentNode;
    if (newParent === nodes.lastParent &&
        (RePresent.Util.Slide.isPartType(param.nextSlide))) {
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
          RePresent.Util.Slide.isPartType(param.nextSlide))) {
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
  };
};