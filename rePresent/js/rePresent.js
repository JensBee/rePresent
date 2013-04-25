/** RePresent base class. */
var RePresent = function() {
    // active slide element
    var activeSlide = null;
    // known hooks
    var hooks = [
        'changeSlide', // just before a slide will change
        'slide', // slide is changing
        'slideChanged' // slide just changed
    ];
    // important elements
    var e = {
        'slidesStack': document.getElementById('rePresent-slides-stack'),
    };

    function showSlide(param) {
        var prevSlide = activeSlide;
        var nextSlide = null;
        var jump = false;
        if (typeof param !== 'undefined') {
            if (param.direction !== undefined) {
                nextSlide = RePresent.Util.Slide.findNext({
                    element: activeSlide,
                    currentElement: activeSlide,
                    direction: param.direction
                });
            } else if (param.slide !== undefined) {
                nextSlide = param.slide;
                jump = true;
            }
        } else {
            // console.log("showSlide: param undefined!");
            // default to forward moving
            param = {direction: +1};
            // start from first slide
            nextSlide = RePresent.Util.Slide.findNext({
                element: e.slidesStack.children[0],
                currentElement: activeSlide,
                direction: +1
            });
        }

        // console.log("showSlide ==> %o", nextSlide);

        if (nextSlide != null) {
            // trigger slide switching hooks
            triggerHook('changeSlide', {
                'currentSlide': activeSlide,
                'nextSlide': nextSlide,
                'direction': param.direction,
                'jump': jump
            });
            activeSlide = nextSlide;
            window.location.hash = RePresent.Util.Slide.getId(activeSlide);
            triggerHook('slide', nextSlide);
            triggerHook('slideChanged', {
                'currentSlide': nextSlide,
                'previousSlide': prevSlide,
                'direction': param.direction,
                'jump': jump
            });
        }
    }

    /** Get the slide to display from the URL. */
    function getSlideFromUrl() {
        var hash = window.location.hash;
        if (typeof hash !== undefined && hash != '') {
            return RePresent.Util.Slide.getById(hash);
        }
        return null;
    }

    /** Trigger a hook.
    @param The hook to trigger
    @param parameters to pass on to the registered functions */
    function triggerHook(hook, args) {
        if (hooks.indexOf(hook) != -1 && hooks[hook] !== undefined) {
            for (var i=0; i<hooks[hook].length; i++) {
                hooks[hook][i](args);
            }
        }
    }

    /** Step one slide forward. */
    this.nextSlide = function() {
        showSlide({direction: +1});
    }

    /** Step back slide forward. */
    this.prevSlide = function() {
        showSlide({direction: -1});
    }

    this.showSlide = function(slide) {
        showSlide({slide: slide});
    }

    /** Allows to register foreign functions for hooks triggerd by RePresent.
    @param Hook to register for
    @param Callback function to call */
    this.registerHook = function(hook, callback) {
        if (hooks.indexOf(hook) == -1) {
            console.warn("Tried to register unknown hook '"+hook+"'.");
        } else {
            if (hooks[hook] === undefined) {
                hooks[hook] = new Array();
            }
            hooks[hook].push(callback);
        }
    }

    this.init = function(config) {
        viewBox = RePresent.Util.getViewBoxDimension();

        var slide = getSlideFromUrl();
        if (slide != null) {
            showSlide({slide: slide})
        } else {
            showSlide();
        }
    }
};