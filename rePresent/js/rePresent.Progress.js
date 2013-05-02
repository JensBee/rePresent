/** Slides progress and timer display.
TODO: rewrite to use hooks.
*/
RePresent.Progress = function() {
  var timer; // progress timer state
  var e; // some frequent used elements
  var width;

  this.init = function(config) {
      timer = {
          duration: 0,  // duration of presentation
          interval: null,
          elapsed: 0,
          start: 0
      };

      // create base layer
      var eMain = document.createElement('g');
      eMain.id = 'rePresent-progress';
      document.documentElement.appendChild(eMain);
      RePresent.Util.Element.hide(eMain);
      width = RePresent.Util.getViewBoxDimension()[0];
      height = RePresent.Util.getViewBoxDimension()[1];

      // create progressbar
      var ePBar = document.createElement('rect');
      ePBar.id = 'rePresent-progress-bar';
      RePresent.Util.Element.setAttributes(ePBar, {
          style: {
              fill: "rgb(128, 128, 128)",
              marker: 'none',
              stroke: 'none'
          },
          x: 0,
          y: (0.995 * height),
          width: 0,
          height: (0.005 * height)
      });
      eMain.appendChild(ePBar);
      RePresent.Util.Element.hide(ePBar);

      // create start / end markers
      var ePStart = document.createElement('rect');
      RePresent.Util.Element.setAttributes(ePStart, {
          style: {
              fill: "rgb(128, 128, 128)",
              marker: 'none',
              stroke: 'none'
          },
          x: (width - 3),
          y: (0.98 * height),
          width: 3,
          height: (0.01 * height)
      });
      ePStart.id = "rePresent-progress-start";
      eMain.appendChild(ePStart);
      var ePEnd = ePStart.cloneNode();
      ePEnd.setAttribute('x', "0");
      ePEnd.id = "rePresent-progress-final";
      eMain.appendChild(ePEnd);

      // create timer symbol
      var ePTimer = ePBar.cloneNode();
      RePresent.Util.Element.setAttributes(ePTimer, {
          id: "rePresent-progress-timer",
          style: {
              fill: "rgb(0,0,0)",
              display: 'none'
          },
          width: (0.01 * height),
          height: (ePBar.getAttribute('height') * 1.5),
          y: (ePBar.getAttribute('y') - (ePBar.getAttribute('height') * 0.5))
      });
      eMain.appendChild(ePTimer);

      // important elements
      e = {
          progress: eMain,
          progressBar: ePBar,
          progressTimer: document.getElementById("rePresent-progress-timer")
      };
  };

  /** Toggle display of the time and progress bar. */
  this.toggleVisibility = function() {
      RePresent.Util.Element.toggleVisibility(e.progress);
  };

  /** Update presentation progress.
  * @param percentage value as decimal
  * @param slide width */
  this.updateProgress = function(dec, width) {
      widthBar = dec * width;
      e.progressBar.setAttribute('width', widthBar);
  };

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
      if ((duration_new !== null) && !isNaN(duration_new) &&
            (duration_new > 0)) {
          timer.duration = duration_new;
          if (timer.interval !== null) {
              clearInterval(timer.interval);
          }
          e.progressTimer.style.display = 'inherit';
          timer.interval = setInterval(function(){updateTimer();}, 1000);
      }
  };
};