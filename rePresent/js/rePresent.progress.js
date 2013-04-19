/** Slides progress and timer display.
TODO: rewrite to use hooks.
*/
RePresent.Progress = function() {
    var timer; // progress timer state
    var e; // some frequent used elements

    this.init = function(config) {
        timer = {
            duration: 0,  // duration of presentation
            interval: null,
            elapsed: 0,
            start: 0
        };
        e = {
            progress: document.getElementById('rePresent-progress'),
            progressBar: document.getElementById('rePresent-progress-bar'),
            progressTimer: document.getElementById("rePresent-progress-timer")
        };
    }

    /** Toggle display of the time and progress bar. */
    this.toggleVisibility = function() {
        RePresent.Util.Element.toggleVisibility(e.progress);
    }

    /** Update presentation progress.
    * @param percentage value as decimal
    * @param slide width */
    this.updateProgress = function(dec, width) {
        widthBar = dec * width;
        e.progressBar.setAttribute('width', widthBar);
    }

    function setTimerValue(value) {
        var indicator = e.progressTimer;

        if (value < 0.0) {
            value = 0.0;
        } else if (value > 1.0) {
            value = 1.0;
        }

        var x = (width - 0.01 * height) * value + 0.005 * height;
        indicator.setAttribute('x', x);
    }

    function updateTimer() {
        timer.elapsed += 1;
        setTimerValue((timer.elapsed - timer.start) / (60 * timer.duration));
    }

    /** Show presentation length request dialog. */
    this.queryDuration = function() {
        var duration_new = prompt("Length of presentation in minutes?",
                                  timer.duration);
        if ((duration_new != null) && !isNaN(duration_new)
                && (duration_new > 0)) {
            timer.duration = duration_new;
            if (timer.interval !== null) {
                clearInterval(timer.interval);
            }
            e.progressTimer.style.display = 'inherit';
            timer.interval = setInterval(function(){updateTimer()}, 1000);
        }
    }
};