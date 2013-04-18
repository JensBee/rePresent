/** General utility class. */
RePresent.Util = {
    NSS: {
        xlink: 'http://www.w3.org/1999/xlink'
    },
    // important elements
    e: {
        'slidesStack': document.getElementById('rePresent-slides-stack'),
    },

    isArray: function(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    },

    _setVisibility: function(node, mode) {
        if (typeof node == 'undefined' || node == null) {
            return;
        }
        style = node.getAttribute('style').toLowerCase();
        style = style.replace(/display:(inherit|inline|none);?/g, '');
        if (mode == 'hide') {
            style += 'display:none;';
        } else {
            style += 'display:inline;';
        }

        node.setAttribute('style', style);
    },

    hideElement: function(node) {
        RePresent.Util._setVisibility(node, 'hide');
    },

    showElement: function(node) {
        RePresent.Util._setVisibility(node, 'show');
    },

    /** Toggle the visible state of an element. */
    toggleVisibility: function(node) {
        if (typeof node == 'undefined' || node == null) {
            return;
        }
        style = node.getAttribute('style').toLowerCase();
        if (style.indexOf('display:none') !== -1) {
            RePresent.Util._setVisibility(node, 'show');
        } else {
            RePresent.Util._setVisibility(node, 'hide');
        }
    },

    /** Filter child nodes by tag names.
    * @param node wich children should be examinated
    * @param array of wanted tagnames */
    getElementsByTagnames: function(element, tags) {
        var found = new Array();
        for (var i=0; i<tags.length; i++) {
            found = found.concat(element.getElementsByTagName(tags[i]));
        }
        return found;
    },

    /** Check if slide-element is a group node.
    * @param element node to check */
    isGroup: function(element) {
        return element.getAttributeNS(RePresent.NS, 'type') == 'group';
    },

    /** Check if slide-element is a part node.
    * @param element node to check */
    isPart: function(element) {
        return element.getAttributeNS(RePresent.NS, 'type') == 'part';
    },

    /** Check if slide-element is the parent of part nodes.
    * @param element node to check */
    isPartParent: function(element) {
        return element.getAttributeNS(RePresent.NS, 'type') == 'partParent';
    },

    showPreviousParts: function(element) {
        var hasPrev = true;
        var node = element;
        var nodes = new Array();
        RePresent.Util.showElement(node);
        while (hasPrev) {
            var sibling = node.previousSibling;
            if (sibling === null) {
                hasPrev = false;
            } else {
                if (RePresent.Util.isGroup(sibling)) {
                    hasPrev = false;
                } else {
                    nodes.push(sibling);
                    RePresent.Util.showElement(sibling);
                }
            }
            node = sibling;
        }
        // return correct stacking order (lifo order)
        return nodes.reverse();
    },

    getViewBoxDimesion: function(doc) {
        viewBox = document.documentElement.getAttribute('viewBox');
        width = viewBox.split(' ')[2];
        height = viewBox.split(' ')[3];
        return [width, height];
    },

    /** Merge the attributes of two objects. */
    mergeConf: function(conf, uConf) {
        for (var key in uConf) {
            try {
                if (uConf[key].constructor==Object) {
                    conf[key] = mergeConf(conf[key], uConf[key]);
                } else {
                    conf[key] = uConf[key];
                }
            } catch(e) {
                conf[key] = uConf[key];
            }
        }
        return conf;
    },

    _getNode: function(element, stopId, direction) {
        if (element.id == stopId) {
            return null;
        }

        var sibling;
        if (direction > 0) { // forward
            sibling = element.nextSibling;
        } else { // backwards
            sibling = element.previousSibling;
        }

        if (sibling === null) {
            var parentNode = element.parentNode;
            if (parentNode === null) {
                sibling = null;
            } else {
                sibling = RePresent.Util._getNode(parentNode, stopId, direction);
            }
        }
        return sibling;
    },

    /** Iteratively get the previous.
    * @param The element to start at
    * @param Id of an element to stop iteration at
    */
    getPrevNode: function(element, stopId) {
        return RePresent.Util._getNode(element, stopId, -1);
    },

    /** Iteratively get the next node.
    * @param The element to start at
    * @param Id of an element to stop iteration at
    */
    getNextNode: function(element, stopId) {
        return RePresent.Util._getNode(element, stopId, +1);
    },

    /** Get the id of a slide.
    @param Slide to get the id for */
    getSlideId: function(element) {
        return element.getAttributeNS(RePresent.Util.NSS.xlink, 'href');
    },

    /** Find the next slide we want to display.
    @param object with:
        - element: element to start the search at. Required.
        - currentElement: Element currently displayed. Required.
        - direction: <0 for backwards, >0 for forward search. Optional,
            defaults to forward.
        - noIncrement: If true the function will operate on the current node,
            instead of incrementing/decrementing. Optional, defaults to false. */
    findNextSlide: function(param) {
        console.log("findNextSlide <- %o",param);
        if (param.element == null) {
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
                sFunc = RePresent.Util.getNextNode;
                slide = param.element;
            } else { // backwards search
                sFunc = RePresent.Util.getPrevNode;
                slide = sFunc(param.element, RePresent.Util.e.slidesStack.id);
            }
        } else {
            slide = param.element;
        }

        if (RePresent.Util.isGroup(slide)) {
            // a group
            var children = slide.children;
            // store id of current group
            if (children.length > 0) {
                // group with children
                if (param.direction > 0) {
                    nextSlide = RePresent.Util.findNextSlide({
                        element: children[0],
                        currentElement: param.currentElement,
                        direction: param.direction
                    });
                } else {
                    nextSlide = children[children.length -1];
                    if (RePresent.Util.isGroup(nextSlide)) {
                        // check contents, don't decrement node
                        nextSlide = RePresent.Util.findNextSlide({
                            element: nextSlide,
                            currentElement: param.currentElement,
                            direction: param.direction,
                            noIncrement: true
                        });
                    }
                }
            } else {
                nextSlide = RePresent.Util.findNextSlide({
                    element: sFunc(slide, RePresent.Util.e.slidesStack.id),
                    currentElement: param.currentElement,
                    direction: param.direction
                });
            }
        } else {
            // a slide
            nextSlide = slide;
            if (nextSlide === param.currentElement) {
                nextSlide = RePresent.Util.findNextSlide({
                    element: sFunc(slide, RePresent.Util.e.slidesStack.id),
                    currentElement: param.currentElement,
                    direction: param.direction
                });
            }
        }
        console.log("findNextSlide -> %o",nextSlide);
        return nextSlide;
    },

    /** Get a specific slide by given link id.
    @param The id of the linked slide */
    getSlideById: function(id) {
        var found = false;
        var slide = RePresent.Util.findNextSlide({
            element: RePresent.Util.e.slidesStack.children[0],
            direction: +1
        });
        while(!found) {
            if (slide === null) {
                found = true;
            } else {
                if (RePresent.Util.getSlideId(slide) == id) {
                    found = true;
                } else {
                    slide = RePresent.Util.findNextSlide({
                        element: slide,
                        currentElement: slide,
                        direction: +1
                    });
                }
            }
        }
        return slide;
    }
};