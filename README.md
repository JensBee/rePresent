# rePresent

>*Create your presentation slides with your favourite tool [inkscape](http://www.inkscape.org)*

rePresent started out as a revamped version of the [JessyInk](http://code.google.com/p/jessyink/) script for the [Inkscape](http://www.inkscape.org) SVG vector drawing program.

Most of the javascript code is moved to a dedicated export filter written in python wich does all the neccesry SVG setup. Only the presentation logic is left to the javascript code wich runs in the webbrowser.

* For now there are no transition effects (and _problaby never_ will be).

### Features
Although rePresent is not complete there are some features already present in the development version.

#### Finished / should be working
* All texts are converted to pathes (based on idea & code from [Jan Thor](http://www.janthor.com/sketches/index.php?/archives/6-Fonts,-Texts,-Paths-and-Uses.html)). No more problems with missing fonts on different systems.
* Time and slide position indicator

#### Planned / not yet finished
* Print a handout version of your slides direct from the browser
* Bookmarks/Chapter support
* Slides overview (not navigable yet)
* Confgiuration support (no gui yet)