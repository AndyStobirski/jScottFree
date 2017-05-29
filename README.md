# jScottFree

A jQuery plugin for playing **Scott Adam**s Adventure games that are in the ScottFree format. This will play all the classic Scott Adams games, and you can find a working example of it [here](http://www.evilscience.co.uk/jScottFree/).

To find out more about **Scott Adams**, his incredible and his enormous influence of the computer gaming history visit his [website](http://www.msadams.com/).

This code is released uner the MIT license - refer to the file LICENSE for more information.

## Using this plugin

### Basic Syntax
The basic syntax for invoking the jScottFree plugin is as follows. 

```javascript
$(User Interface Selector).jScottFree({ debug: true / false});
```

Where debug: true, unsurprisingly, sets debug mode to true. See a demo [here](http://www.evilscience.co.uk/jScottFree/jScottFreeDebug.htm). By default, this value is false.

### User Interface
This is a container element with 7 children and is used by the plugin to represent the game world, recieve player input and load / save game. These children are:

 + two textarea with an id of _worldView_ and *gameOutput*, 
 + a textbox with an id of *gameInput*,
 + a select tag with id of *load menu*, populate with games to load - the file name is value.
 + four span with ids of *loadButton*, *resetButton* and *loadSavedGame*

The file *jScottFree.htm* contains an example of a user interface.

### Example
You can find a working example of this plugin [here](http://www.evilscience.co.uk/jScottFree/).

## Depencies
jScottFree requires [Jquery 1.11.3 or later](http://jquery.com/).

## In more detail
The plugin jQuery.jScottFree.js works in conjunction scottLoad.js. The latter loads an adventure game file (a text file with a .dat extension) and converts it to a JSON object and then passes to the former. The source code is commented and, I believe, self explanatory :)

**jQuery.jScottFree.js**
The function init() initialises the plugin, and game play starts when a user selects a game from the UI game menu and clicks the button **Load**. The load button fires the *LoadGame* event, which starts up the game. From then onwards, the game is driven by Enter Keyup events which are handled by the *EnterPressed* function.

## Files included in this project

 + Hints - Descrambled hint files for the adventure games
 + adv - Adventure games, in ScottFree format
 + LICENSE
 + README.md
 + jQuery.ScottFree.js - jScottFree plugin
 + jScottFreeDebug.htm - Example of jScottFree with debug mode enabled
 + jScottFree.htm - Example of jScottFree
 + jquery.jScottFree.css - Style sheet for the above two htm files
 + scottLoad.js - Used by jQuery.ScottFree.js, converts "ScottFree" format adventure games into a jSon object.
