RePresent.Stage.Util = {
  /** Collect ids of full slides (parts merged).
   * @return array with [[slide][slide, part]] elements in order
   */
  collectSlides: function () {
    var slidePositions = [];

    var slides = RePresent.Util.e.slidesStack.getElementsByTagName('use');
    var fullSlide = 0;
    var lastParent = null;
    for (var count=0; count<slides.length; count++) {
      var holdPosition = false;
      var currentSlide = slides[count];

      if (RePresent.Util.Element.isPart(currentSlide) ||
          RePresent.Util.Element.isPartParent(currentSlide)) {
        var newParent = currentSlide.parentNode;
        if (newParent === lastParent) {
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
      var slideId = RePresent.Util.Slide.getId(currentSlide);
      if (typeof slidesPos == 'undefined') {
        slidePositions[fullSlide] = [slideId];
      } else {
        slidesPos.push(slideId);
      }
    }
    return slidePositions;
  }
};