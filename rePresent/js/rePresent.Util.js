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
    viewBox = document.documentElement.getAttribute('viewBox');
    width = parseInt(viewBox.split(' ')[2], 10);
    height = parseInt(viewBox.split(' ')[3], 10);
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
  }
};