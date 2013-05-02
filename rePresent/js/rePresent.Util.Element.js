RePresent.Util.Element = {
  _setVisibility: function(node, mode) {
    if (node) {
      RePresent.Util.Element.setStyles(node, {
        display: (mode == 'hide') ? 'none' : 'inline'
      });
    }
  },

  hide: function(node) {
    RePresent.Util.Element._setVisibility(node, 'hide');
  },

  show: function(node) {
    RePresent.Util.Element._setVisibility(node, 'show');
  },

  /** Toggle the visible state of an element. */
  toggleVisibility: function(node) {
    if (typeof node == 'undefined' || node === null) {
      return;
    }
    style = node.getAttribute('style').toLowerCase();
    if (style.indexOf('display:none') !== -1) {
      RePresent.Util.Element._setVisibility(node, 'show');
    } else {
      RePresent.Util.Element._setVisibility(node, 'hide');
    }
  },

  /** Filter child nodes by tag names.
  * @param node wich children should be examinated
  * @param array of wanted tagnames
  */
  getByTagnames: function(element, tags) {
    var found = [];
    for (var i=0; i<tags.length; i++) {
      found = found.concat(element.getElementsByTagName(tags[i]));
    }
    return found;
  },

  /** Check if slide-element is a group node.
  * @param element node to check
  */
  isGroup: function(element) {
    return element.getAttributeNS(
      RePresent.Util.NSS.represent, 'type') == 'group';
  },

  /** Check if slide-element is a part node.
  * @param element node to check
  */
  isPart: function(element) {
    return element.getAttributeNS(
      RePresent.Util.NSS.represent, 'type') == 'part';
  },

  /** Check if slide-element is the parent of part nodes.
  * @param element node to check
  */
  isPartParent: function(element) {
    return element.getAttributeNS(
      RePresent.Util.NSS.rePresent, 'type') == 'partParent';
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
        sibling = RePresent.Util.Element._getNode(parentNode,
          stopId, direction);
      }
    }
    return sibling;
  },

  /** Iteratively get the previous.
  * @param The element to start at
  * @param Id of an element to stop iteration at
  */
  getPrevNode: function(element, stopId) {
    return RePresent.Util.Element._getNode(element, stopId, -1);
  },

  /** Iteratively get the next node.
  * @param The element to start at
  * @param Id of an element to stop iteration at
  */
  getNextNode: function(element, stopId) {
    return RePresent.Util.Element._getNode(element, stopId, +1);
  },

  setAttributes: function(element, attributes) {
    for (var attr in attributes) {
      if (attr == 'style' && typeof attributes[attr] !== 'string') {
        RePresent.Util.Element.setStyles(element, attributes[attr]);
      } else if (attr == 'transform' &&
        typeof attributes[attr] !== 'string') {
        RePresent.Util.Element.setTransform(element, attributes[attr]);
      } else {
        // if attribute value is null: remove the attribute
        if (attributes[attr] === null) {
          element.removeAttribute(attr);
        } else {
          element.setAttribute(attr, attributes[attr]);
        }
      }
    }
  },

  /** Simple search & replace for style statements. Will replace all
  * occourances of the given property with the new one.
  * @param element: element whose style attribute should be altered/added
  * @param styles: object with 'style property' to 'value' mappings
  */
  setStyles: function(element, styles) {
    var styleProp;
    if (typeof element.style == 'undefined') {
      styleValue = '';
      for (styleProp in styles) {
        if (styles[styleProp] !== null) {
          styleValue += styleProp + ':' +
          styles[styleProp] + ';';
        }
      }
      element.setAttributeNS(null, 'style', styleValue);
    } else {
      for (styleProp in styles) {
        if (styles[styleProp] === null) {
          // if property value is null: remove the attribute
          element.style.removeProperty(styleProp);
        } else {
          element.style[styleProp] = styles[styleProp];
        }
      }
    }
  },

  /** Simple search & replace for transform statements. Will replace all
  * transform types it finds with the new one.
  * @param element: element whose transform attribute should be altered/added
  * @param transforms: object with 'transform type' to 'value' mappings
  */
  setTransform: function(element, transforms) {
    // console.log("Transform %o for %o", transforms, element);
    var transform = element.getAttribute('transform') || '';
    for (var transProp in transforms) {
      var rex = new RegExp(transProp + '\\([^\\)]*\\)', 'gi');
      transform = transform.replace(rex, ''); // remove old properties
      if (transforms[transProp] !== null) {
        transform += ' ' + transProp + '(' +
          transforms[transProp] + ')';
      }
    }
    transform = transform.replace(/\s+/g, ' '); // normalize spaces
    element.setAttributeNS(null, 'transform', transform);
  },

  // http://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport
  inViewPort: function(element) {
    var dim = element.getBoundingClientRect();
    return (
      dim.top >= 0 &&
      dim.left >= 0 &&
      dim.bottom <= (
        window.innerHeight || document.documentElement.clientHeight) &&
      dim.right <= (
        window.innerWidth || document. documentElement.clientWidth)
      );
  }
};