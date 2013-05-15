window.onload = function() {
  var rePresent = new RePresent();
  var rePresentStage = new RePresent.Stage();
  var rePresentGrid = new RePresent.Grid();
  // progress is currently not working
  // var rePresentProgress = new RePresent.Progress();
  // The following line will be replaced by export script to include user
  // configuration.
  var userConf = {};
  // configuration defaults
  var DEFAULTS = {
    index: {
      columns: 4,
      spacing: 5, // percentage of slide width
      selectSize: 5
    }
  };
  // resulting configuration
  var config = {};
  // key codes
  var KEYS = {
    'return': 13,
    'esc': 27,
    'left': 37,
    'up': 38,
    'right': 39,
    'down': 40
  };

  // merge user configuration into local config
  RePresent.Util.mergeConf(config, DEFAULTS);
  RePresent.Util.mergeConf(config, userConf);

  rePresentStage.init(config);
  rePresentGrid.init(config);
  // rePresentProgress.init(config);
  rePresent.registerHook('changeSlide', rePresentStage.changeSlideEvent);
  rePresent.registerHook('slide', rePresentGrid.slideEvent);
  rePresent.init(config);

  // handle navigational keys
  document.onkeydown = function(e) {
    e = e || window.event;
    switch(e.keyCode) {
      case KEYS['down']:
        if (rePresentGrid.isVisible()) {
          rePresentGrid.navigate({direction: 'down'});
        } else {
          rePresent.nextSlide();
        }
        break;
      case KEYS['esc']:
        if (rePresentGrid.isVisible()) {
          rePresentGrid.cancel();
        }
        break;
      case KEYS['left']:
        if (rePresentGrid.isVisible()) {
          rePresentGrid.navigate({direction: 'left'});
        } else {
          rePresent.prevSlide();
        }
        break;
      case KEYS['return']:
        if (rePresentGrid.isVisible()) {
          rePresent.showSlide(rePresentGrid.commit());
        }
        break;
      case KEYS['right']:
        if (rePresentGrid.isVisible()) {
          rePresentGrid.navigate({direction: 'right'});
        } else {
          rePresent.nextSlide();
        }
        break;
      case KEYS['up']:
        if (rePresentGrid.isVisible()) {
          rePresentGrid.navigate({direction: 'up'});
        } else {
          rePresent.prevSlide();
        }
        break;
    }
  };

  // handle functional keys
  document.onkeypress = function(e) {
    e = e || window.event;
    var charCode = e.which || e.keyCode;
    switch(String.fromCharCode(charCode)) {
      case 'd':
        // rePresentProgress.queryDuration();
        break;
      case 'i':
        rePresentGrid.toggle();
        break;
      case 'p':
        // rePresentProgress.toggleVisibility();
        break;
    }
  };
};