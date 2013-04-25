window.onload = function() {
    var rePresent = new RePresent();
    var rePresentStage = new RePresent.Stage();
    var rePresentProgress = new RePresent.Progress();
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
        'left': 37,
        'up': 38,
        'right': 39,
        'down': 40
    };

    // merge user configuration into local config
    RePresent.Util.mergeConf(config, DEFAULTS);
    RePresent.Util.mergeConf(config, userConf);

    rePresentStage.init(config);
    rePresentProgress.init(config);
    rePresent.registerHook('changeSlide', rePresentStage.changeSlide);
    rePresent.init(config);

    // handle navigational keys
    document.onkeydown = function(e) {
        e = e || window.event;
        switch(e.keyCode) {
            case KEYS['return']:
                if (rePresentStage.getMode() == 'index') {
                    var slide = rePresentStage.selectIndexSlide();
                    rePresent.showSlide(slide);
                }
                break;
            case KEYS['right']:
                if (rePresentStage.getMode() == 'index') {
                    rePresentStage.navIndex({direction: 'right'});
                } else {
                    rePresent.nextSlide();
                }
                break;
            case KEYS['down']:
                if (rePresentStage.getMode() == 'index') {
                    rePresentStage.navIndex({direction: 'down'});
                } else {
                    rePresent.nextSlide();
                }
                break;
            case KEYS['left']:
                if (rePresentStage.getMode() == 'index') {
                    rePresentStage.navIndex({direction: 'left'});
                } else {
                    rePresent.prevSlide();
                }
                break;
            case KEYS['up']:
                if (rePresentStage.getMode() == 'index') {
                    rePresentStage.navIndex({direction: 'up'});
                } else {
                    rePresent.prevSlide();
                }
                break;
        }
    }
    // handle functional keys
    document.onkeypress = function(e) {
        e = e || window.event;
        var charCode = e.which || e.keyCode;
        switch(String.fromCharCode(charCode)) {
            case 'd':
                rePresentProgress.queryDuration();
                break;
            case 'i':
                rePresentStage.toggleIndex();
                break;
            case 'p':
                rePresentProgress.toggleVisibility();
                break;
        }
    }
};