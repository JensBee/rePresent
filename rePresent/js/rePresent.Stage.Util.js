RePresent.Stage.Util = {
  /** Collect ids of full slides (parts merged).
   * @return array with [[slide][slide, part]] elements in order
   */
  collectSlides: function () {
    var slidePositions = [];
    var slides = RePresent.Util.e.slidesStack.getElementsByTagName('use');
    var fullSlide = 0;
    var lastParent = null, newParent = null;

    for (var count=0; count<slides.length; count++) {
      var holdPosition = false;
      if (RePresent.Util.Element.isPart(slides[count]) ||
          RePresent.Util.Element.isPartParent(slides[count])) {
        newParent = slides[count].parentNode;
        if (lastParent === null || newParent === lastParent) {
          holdPosition = true;
        } else {
          lastParent = newParent;
        }
      } else {
        lastParent = null;
      }

      if (!holdPosition && count > 0) {
        fullSlide++;
      }

      var slidesPos = slidePositions[fullSlide];
      var slideId = RePresent.Util.Slide.getId(slides[count]);
      if (typeof slidesPos == 'undefined') {
        slidePositions[fullSlide] = [slideId];
      } else {
        slidesPos.push(slideId);
      }
    }
    return slidePositions;
  }
};