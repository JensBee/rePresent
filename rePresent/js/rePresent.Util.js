/** General utility class. */
RePresent.Util = {
  NSS: {
    represent: 'https://github.com/JensBee/rePresent',
    svg: 'http://www.w3.org/2000/svg',
    xlink: 'http://www.w3.org/1999/xlink'
  },
  // important elements
  e: {
    'slidesStack': document.getElementById('rePresent-slides-stack'),
    'master': document.getElementById('rePresent-slides-gmaster')
  },

  isArray: function(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  },

  getViewBoxDimension: function() {
    var viewBox = document.documentElement.getAttribute('viewBox');
    viewBox = viewBox.split(' ');
    var width = parseInt(viewBox[2], 10);
    var height = parseInt(viewBox[3], 10);
    return [width, height];
  },

  /** Merge the attributes of two objects. */
  mergeConf: function(conf, uConf) {
    for (var key in uConf) {
        if (uConf[key].constructor==Object) {
          conf[key] = conf[key] || {};
          conf[key] = RePresent.Util.mergeConf(conf[key], uConf[key]);
        } else {
          conf[key] = uConf[key];
        }
    }
    return conf;
  },

  parseInt: function(string, defaultNumber, radix) {
    var number = defaultNumber;
    if (string) {
      radix = radix || 10;
      number = parseInt(string, radix);
      if (isNaN(result)) {
        number = defaultNumber;
      }
    }
    return number;
  }
};