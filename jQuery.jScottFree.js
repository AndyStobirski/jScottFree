/*
 *  jQuery.jScottFree.js
 *  A jQuery plugin for playing Scott Adams Adventure games
 *
 *  Made by Andy Stobirski
 *  Under the MIT License
 *
 *	Made using https://jqueryboilerplate.com
 */
;
(function ($, window, document, undefined) {

	"use strict";

	// Create the defaults once
	var pluginName = "jScottFree",
	defaults = {
		debug : false
	},

	//Elements
	worldView = null,
	gameOutput = null,
	gameInput = null,
	debug = null,
	reset = null,
	loadSaved = null,
	dataButt = null,

	//Game lookups
	directions = ["", "N", "S", "E", "W", "U", "D"],
	directions_1 = ["", "NOR", "SOU", "EAS", "WES", "UP", "DOW"],
	directionsLong = ["", "North", "South", "East", "West", "Up", "Down"],
	sysmessages = ["OK\r\n" //0
	, " is a word I don't know...sorry!\r\n" //1
	, "I can't go in that direction\r\n" //2
	, "I'm in a " //3
	, "I can see: " //4
	, "Obvious exits: " //5
	, "Tell me what to do" //6
	, "I don't understand\r\n" //7
	, "I'm carrying too much\r\n" //8
	, "I'm carrying:\r\n" //9
	, "Give me a direction too!\r\n" //10
	, "What?\r\n" //11
	, "Nothing\r\n" //12
	, "I've stored {0} treasures. On a scale of 0 to 100, that rates {1}\r\n" //13
	, "It's beyound my power to do that.\r\n" //14
	, "I don't understand your command.\r\n" //15
	, "I can't see. It is too dark!\r\n" //16
	, "Dangerous to move in the dark!\r\n" //17
	, "I fell down and broke my neck.\r\n" //18
	, "Light has run out!\r\n" //19
	, "Your light is growing dim.\r\n" //20
	, "Nothing taken.\r\n" //21
	, "Nothing dropped.\r\n" //22
	],
	CONSTANTS = {
		INVENTORY : -1,
		STORE : 0,
		TAKE : 10,
		DROP : 18,
		DARKNESSFLAG : 15,
		LIGHOUTFLAG : 16,
		LIGHTSOURCE : 9
	},

	//Game settings
	gameData = null,

	endGame = false,

	takeSuccesful = false, //set after a take action

	InputHistory = [],

	tickHandle = null,
	delayHandle = null;

	//constructor
	function Plugin(element, options) {
		this.element = element;

		this.settings = $.extend({}, defaults, options);
		this._defaults = defaults;
		this._name = pluginName;
		this.init();
	}

	$.extend(Plugin.prototype, {

		/*

		Start here and connect up the child elements within the provided
		parent element to the appropriate bits of code.

		 */
		init : function () {

			var el = $(this.element);
			var that = this;

			worldView = el.find("#worldView");
			gameOutput = el.find("#gameOutput");
			gameInput = el.find("#gameInput")
				.focus()
				.attr("placeholder", sysmessages[6])
				.keyup(function (e) { //raise event on carriage return
					var keyCode = e.keyCode || e.which;
					if (keyCode == 13) {
						EnterPressed($(this).val());
						$(this).val("");
					}
				});

			el.find("#loadButton").click(function () {
				if (confirm("Load game: " + el.find("#loadMenu option:selected").text() + "?"))
					LoadGame(el.find("#loadMenu").val(), that.settings.debug);
			});

			reset = el.find("#resetButton").click(function () {
					if (confirm("Are you sure you want to restart this game"))
						ResetGame();
				});

			//load game
			loadSaved = el.find("#loadSavedGame").click(function () {
					var ret_val = prompt("Enter save game data here", "");
					if (ret_val) {

						try {
							var obj = JSON.parse(ret_val);

							if (!obj.hasOwnProperty("AdventureVersion")
								 | !obj.hasOwnProperty("AdventureNumber")
								 | !obj.hasOwnProperty("items")
								 | !obj.hasOwnProperty("bitFlags")
								 | !obj.hasOwnProperty("counters")
								 | !obj.hasOwnProperty("currentCounter")
								 | !obj.hasOwnProperty("currentRoom")
								 | !obj.hasOwnProperty("lampLife")
								 | !obj.hasOwnProperty("playerNoun")
								 | !obj.hasOwnProperty("savedRoom")
								 | !obj.hasOwnProperty("savedRooms"))
								throw "JSON Object Malformed";

							if (obj.AdventureNumber != gameData.header.AdventureNumber |
								!obj.AdventureVersion == gameData.header.AdventureVersion)
								throw "Adventure / Verion number don't match";

							//reset all items to their current location
							for (var i = 0; i < gameData.items.length; i++)
								gameData.items[i].currentLocation = gameData.items[i].initialLocation;

							//update an
							if (obj.items.length > 0)
								for (var i = 0; i < obj.items.length; i += 2) 
									gameData.items[obj.items[i]].currentLocation = obj.items[i + 1];

							delete obj.items;
							delete obj.version;

							//after deleting items, what is left is the game data header
							gameData.current = JSON.parse(JSON.stringify(obj));

							PerformActionComponent(64, 0, 0);

							SetGameOutput("GAME LOADED", true);

							DisableUserInput(false);
            
							gameInput.val("");

						} catch (e) {
						    worldView.text("");
						    SetGameOutput("Error loading save file: " + e, true);
						}

					}
				});

			dataButt = el.find("#dataButton").click(function () {
					var x = window.open('', 'windowName', 'width=500,height=400,resizable=1,scrollbars=1');
					if (!x) {
						return;
					} //browser is blocking popups
					x.document.open();
					x.document.write("<html><head><style>body { white-space: pre; font-family: monospace; }</style></head><body>");
					x.document.write(JSON.stringify(gameData, '\r\n', 4));
					x.document.write('</body></html>');
					x.document.close();
				});

			if (this.settings.debug)
				el.append
				(
					$("<div/>").addClass("TextWrapper")
					.append(debug = $("<div/>")
							.addClass("BigText debug").dblclick(function () {
								$(this).empty();
							})
							.attr("Style", "height:300px;")));

			Disable(true);
		}

	});

	/*
	Disable the UI elements

	@pState True / False

	 */
	var Disable = function (pState) {

		if (pState) {
			reset.addClass("Hide");
			worldView.attr("disabled", "disabled");
			gameOutput.attr("disabled", "disabled");
			gameInput.attr("disabled", "disabled");
			loadSaved.addClass("Hide");
			dataButt.addClass("Hide");
		} else {
			reset.removeClass("Hide");
			worldView.removeAttr("disabled");
			gameOutput.removeAttr("disabled");
			gameInput.removeAttr("disabled");
			loadSaved.removeClass("Hide");
		}
	}

	/*
	Disable just the user input

	@pState True / False
	 */
	var DisableUserInput = function(pState) {

	console.log("DisableUserInput", pState);
	    
		if (pState)
			gameInput.attr("disabled", "disabled");
		else
			gameInput.removeAttr("disabled");
	}

	/*
	Load the specified game

	@pGameFile jSon object representing the game file
	@pDebug start game in debug mode
	*/
	var LoadGame = function (pGameFile, pDebug) {

		if (gameData !== null) {
			if (!confirm('Game in progress - load another?'))
				return;
		}

		$.ajax({
			url : "adv/" + pGameFile,
			data : null,
			beforeSend : function () {
				Disable(true);
			},
			success : function (data) {
				gameData = Parse(data.split(""), pDebug);
				Disable(false);
		        if (pDebug)
			        dataButt.removeClass("Hide");
				ResetGame();
			},
			error: function(data) {
			gameInput.val("");

			    worldView.text("");
			    SetGameOutput(	"Error loading " + pGameFile + ": " + data.statusText,true);
				return;
			},
			dataType : "text"
		});

	}

	/*
	Reset the entire game
	 */
	var ResetGame = function () {

		gameData.current.currentRoom = gameData.header.StartRoom;
		
		endGame = false;
		gameData.current.bitFlags = [];
		gameData.current.counters = [];
		gameData.current.savedRooms = [];
		takeSuccesful = false;
		InputHistory = [];

		gameData.current.savedRoom = null;

		for (var i = 0; i <= 32; i++) {
			gameData.current.bitFlags.push(false);
			gameData.current.counters.push(0);
			gameData.current.savedRooms.push(0);
		}

		for (var j = 0; j < gameData.items.length; j++)
			gameData.items[j].currentLocation = gameData.items[j].initialLocation;

		gameData.current.lampLife = gameData.header.LightDuration;

		if (debug != null)
			debug.empty();

		PerformActionComponent(70, 0, 0); //clear screen
		PerformActions(0, 0, 0, 0);
		Disable(false);

	}

	/*

	Perform the actions that match the provide criteria.

	@pVerb Id of the verb
	@pNoun Id of the noun

	@pStartAction (optional) Value to restart at
	@pStartComponent (optional) Value to restart at

	Execute actions based on the following criteria
	pVerb > 0 & pNoun >= 0
	action.verb == pVerb & action.noun == pNoun

	pVerb == 0 & pNoun == 0
	if action.noun > 0
	action.verb == pVerb and rand(100) < action.noun
	else
	action.verb == pVerb & action.noun == pNoun

	If the action executed contains component act73, then execute
	all subsequent actions with a verb == 0 and noun == 0
	until an with action verb != 0 and noun != 0 is encountered.

	The two optional arguments are used for delay callbacks.

	If component 88, delay 2 seconds, is encountered, then PerformActions
	is called again with the optional arguments supplied allowing action
	execution to continue appropriately, after the delay period of
	2 seconds.

	 */
	var PerformActions = function (pVerb, pNoun, pStartAction, pStartComponent) {

		WriteDebug("PerformActions: "  + pVerb + " " + pNoun + " start at: " + pStartAction + "/" + pStartComponent, "debugItem_performactions");

		endGame = false;

		//determines if we output a message upon completion
		//0 no message, 1 don't understand, 2 beyond my power
		//message used if input is via a user, pVerb > 0
		var msg = pVerb > 0 ? 1 : 0;

		var i = pStartAction;
		var j = pStartComponent;
		var parentOutcome = false;
		var canExecute = false;
		var currentAction = null;
		var attempt = null;

		//A pause action has been encountered
		if (delayHandle !== null) {
		    DisableUserInput(false);
			clearTimeout(delayHandle);
			clearInterval(tickHandle);
			delayHandle = null;
			tickHandle = null;
			SetGameOutput("\r\n", false);
		}

		//If pStartComponent > 0 then in means we're in the middle of an
		//action, so of course we can excute it
		if (j > 0) {
			canExecute = true;
			parentOutcome = true;
        } else if (i < gameData.actions.length) {   //if i >= gameData.actions.length it means the delay has been called from 
                                                    //a user action that has no children
			//A value of 0 indicates we are starting on a new action
			//if verb == -1 and noun == -1 we are executing a child
			//meaning the parent has been successfully executed
			if (gameData.actions[pStartAction].verb == -1 & gameData.actions[pStartAction].noun == -1)
			    parentOutcome = true;
            } else {
            canExecute = true;
            parentOutcome = true;
        }
		
		while (i < gameData.actions.length) {

			currentAction = gameData.actions[i];

			//if > 0 indicates resumed execution within an action component block
			if (j == 0) {
				if (currentAction.noun == -1 & currentAction.verb == -1) {
					if (parentOutcome) {

					    canExecute = ActionTest(currentAction.conditions);

					    if ("description" in currentAction)
					        WriteDebug("CHILD " + currentAction.description);

					} else {
						canExecute = false;
						//this child can't be executed because the parent hasn't
						//been succesfully executed, so we can skip all children
						while (i < gameData.actions.length && (
								gameData.actions[i].verb == -1
								 & gameData.actions[i].noun == -1))
							i++;

						i--;
					}
				}
				//it's not a child, so see if we can execute it
				else {

					//if 0,0 provided and we have an action with 0,0 or 0,n where  random(100) < n
					attempt = (pVerb == 0 & pNoun == 0 & currentAction.verb == 0 &
						(currentAction.noun == 0 || (Math.floor(Math.random() * 100) + 1) < currentAction.noun))
					 ||
					//pVerb, pNoun match act.input.ver, act.input.noun
					(pVerb == currentAction.verb & pNoun == currentAction.noun)
					 ||
					(pVerb == currentAction.verb & currentAction.noun == 0);

					//output a can't do that message if we recognise a player verb in the list, but not a noun
					if (pVerb > 0 && pVerb == currentAction.verb && currentAction.noun > 0
						 && pNoun != currentAction.noun) //player input
						msg = 2;

					if (attempt) {
					    parentOutcome = ActionTest(currentAction.conditions);
					    if (parentOutcome && "description" in currentAction)
					        WriteDebug(currentAction.description.join(","));
					} else
						parentOutcome = false;

					canExecute = parentOutcome;
				}
			}

			if (canExecute) {

				
				//step through the components
				do {

				    if ("actionDescriptions" in currentAction)
                        WriteDebug("C" + j + ": " + currentAction.actionDescriptions[j], "debugItem1");
				        
					if (PerformActionComponent(currentAction.actions[j].act, currentAction.actions[j].arg1, currentAction.actions[j].arg2)) {

						var restartAction = i;
						var restartComponent = j + 1; //go to the next component

						//We're on the last component of the current action so
						//move to the next action and the component start will be 0
						if (j == currentAction.actions.length - 1) {
							restartComponent = 0;
							restartAction++;

							if (restartAction < gameData.actions.length) {
								//there are more actions to go...

								//...however, the next action is not a child...
								if (!(gameData.actions[restartAction].noun == -1 &
										gameData.actions[restartAction].verb == -1)) {

									//..if the input is user input (verb > 0), and if we're here it means
									//we can stop executing the current action after the delay
									//so exceed the number of actions, causing the next call
									//to prevent execution actions
									if (pVerb > 0)
										restartAction = gameData.actions.length;
								}
							} else {
								//No actions to go, so as above
								restartAction = gameData.actions.length;
							}
			            }

			            DisableUserInput(true);

						delayHandle = setTimeout($.proxy(
									function () {
									PerformActions(pVerb, pNoun, restartAction, restartComponent)
								}, this), 2000);
						
						tickHandle = setInterval($.proxy(
									function () {
									doTick()
								}, this), 100);

						return;
					}

					j++;

				} while (j < currentAction.actions.length);

				j = 0;

			} //end  canExecute


			if (endGame) {
			
			    PerformActionComponent(64, 0, 0); //look
			    DisableUserInput(true);
				return;
			}

			if (pVerb > 0 && parentOutcome) {

				//this is user input, and the same verb noun combination may be used
				//under different conditions, so bail if we've successfully processed
				//user input

				if (i + 1 >= gameData.actions.length //reached the end of the actions list
					 || gameData.actions[i + 1].verb > 0 //next action is user input
					 ||
					(
						//current action child
						(gameData.actions[i].noun == -1 & gameData.actions[i].verb == -1)
						 & //next action not child
						(gameData.actions[i + 1].verb > 0))) {

					if (i > gameData.header.NumberOfActions
						 && (pVerb == CONSTANTS.TAKE & takeSuccesful) || pVerb == CONSTANTS.DROP)
						SetGameOutput(sysmessages[0], false);

					break;
				}
			}

			i++;

		} //while end exit

		if (pVerb > 0) { //only do after user input

			if (!parentOutcome) {
				if (msg == 1) //don't understand
					SetGameOutput(sysmessages[15], true);
				else if (msg == 2) //Can't do that yet
					SetGameOutput(sysmessages[14], true);
			}

			PerformActions(0, 0, 0, 0); //auto actions
			//DisableUserInput(false);
		}

		//lamp stuff, is it in the game
		if (CheckCondition(13, CONSTANTS.LIGHTSOURCE)) {

			if (gameData.current.lampLife == 0) {
				gameData.current.bitFlags[CONSTANTS.LIGHOUTFLAG] = true;
				SetGameOutput(sysmessages[19], false);
				gameData.current.lampLife = 0;
			} else if (gameData.current.lampLife > 0 && gameData.current.lampLife < 25 &&
				ActionTest(3, CONSTANTS.LIGHTSOURCE) &&
				gameData.current.lampLife % 5 == 0)
				SetGameOutput(sysmessages[20], false); //light growing dim
		}

		//DisableUserInput(false);
		PerformActionComponent(64, 0, 0); //look
		gameInput.focus();

	}
	
	/*
		When the game is paused, write a dot to the output window
		to show something is happening
	*/
	var doTick = function(){
		SetGameOutput(".", false);
	}

	/*
	Return all the items in specified location

	@pLocation Location to check
	 */
	var GetItemsAt = function (pLocation) {
		return $.grep(gameData.items, function (i) {
			return i.currentLocation == pLocation;
		})
	}

	/*
	Test all the conditions the provided condition block

	@pCond condition block
	 */
	var ActionTest = function (pCond) {
		var result = false;
		var retVal = true;
		for (var i = 0; i < pCond.length; i++) {
			result = CheckCondition(pCond[i].con, pCond[i].arg);
			if (!result) {
				retVal = false;
			}
		}
		return retVal;
	}

	/*
	Perform the provided action

	pAct - Action to perform
	pArg1 - Argument 1
	pArg2 - Argument 2

	Returns bool, to indicate if delay required
	 */
	var PerformActionComponent = function (pAct, pArg1, pArg2) {

		if (pAct >= 1 && pAct < 52) {
			SetGameOutput(gameData.messages[pAct] + "\r\n", false);
		} else if (pAct >= 102) {
			SetGameOutput(gameData.messages[pAct - 50] + "\r\n", false);
		} else {

			switch (pAct) {

			case 52: //get item, check if can carry
				takeSuccesful = false;
				if (GetItemsAt(CONSTANTS.INVENTORY).length < gameData.header.MaxCarry) {
					gameData.items[pArg1].currentLocation = CONSTANTS.INVENTORY;
					takeSuccesful = true;
				} else
					SetGameOutput(sysmessages[8], true);
				break;

			case 53: //drops item into current room
				gameData.items[pArg1].currentLocation = gameData.current.currentRoom;
				break;

			case 54: //move room
				gameData.current.currentRoom = pArg1;
				PerformActionComponent(64, 0, 0);
				break;

			case 55: //Item <arg> is removed from the game (put in room 0)
			case 59:
				gameData.items[pArg1].currentLocation = CONSTANTS.STORE;
				break;

			case 56: //set darkness flag
				gameData.current.bitFlags[CONSTANTS.DARKNESSFLAG] = true;
				break;

			case 57: //clear darkness flag
				gameData.current.bitFlags[CONSTANTS.DARKNESSFLAG] = false;
				break;

			case 58: //set pArg1 flag
				gameData.current.bitFlags[pArg1] = true;
				break;

			case 60: //set pArg1 flag
				gameData.current.bitFlags[pArg1] = false;
				break;

			case 61: //Death, clear dark flag, move to last room
				PerformActionComponent(57, 0, 0);
				gameData.current.currentRoom = gameData.rooms.length - 1;
				SetGameOutput("I am dead.\r\n", false);
				endGame = true;
				break;

			case 62: //item is moved to room
				gameData.items[pArg1].currentLocation = pArg2;
				break;

			case 63: //game over
				DisableUserInput(true);
				SetGameOutput("\r\nThis game is now over\r\n", false);
				endGame = true;
				break;

			case 65: //score
				var storedItems = $.grep(GetItemsAt(gameData.header.TreasureRoom), function (i) {
						return i.description.substring(0, 1) == "*"
					}).length;

				SetGameOutput(sysmessages[13]
					.replace("{0}", storedItems)
					.replace("{1}", Math.floor((storedItems / gameData.header.TotalTreasures) * 100)), false);
				if (storedItems == gameData.header.TotalTreasures) {
					alert("You have colleceted all the treasures!");
					PerformActionComponent(63, 0, 0);
				}

				break;

			case 66: // output inventory
				var inv = $.map(GetItemsAt(CONSTANTS.INVENTORY), function (v, i) {
						return v.description;
					});

				SetGameOutput(sysmessages[9] + (inv == "" ? sysmessages[12] : inv.join(", ") + "\r\n"), false);
				break;

			case 67:
				gameData.current.bitFlags[0] = true;
				break;

			case 68:
				gameData.current.bitFlags[0] = false;
				break;

			case 69: //refill lamp
				gameData.current.lampLife = gameData.header.LightDuration;
				gameData.current.bitFlags[CONSTANTS.LIGHOUTFLAG] = false;
				gameData.items[CONSTANTS.LIGHTSOURCE].currentLocation = CONSTANTS.INVENTORY;
				break;

			case 64: //look
			case 76:

				if (gameData.current.bitFlags[CONSTANTS.DARKNESSFLAG] && CheckCondition(12, CONSTANTS.LIGHTSOURCE)) {
					worldView.text(sysmessages[16]);
				} else {

					var items = $.map(GetItemsAt(gameData.current.currentRoom), function (v, i) {
							return v.description;
						});

					var exits = $.map(gameData.rooms[gameData.current.currentRoom].exits, function (val, ind) {
							if (val > 0)
								return directionsLong[ind + 1];
						});

					worldView.text(
						(gameData.rooms[gameData.current.currentRoom].description.substring(0, 1) == "*" ?
							gameData.rooms[gameData.current.currentRoom].description.substring(1) :
							sysmessages[3] + gameData.rooms[gameData.current.currentRoom].description)

						 + "\r\n\r\n" + sysmessages[5] + (exits.length > 0 ? exits.join(", ") : "none")
						 + (items.length > 0 ? "\r\n\r\n" + sysmessages[4] + items.join(", ") : ""));
				}
				break;

			case 70: //clear screen
				SetGameOutput("", true);
				worldView.text("");
				break;

			case 71: //save game

				var data = gameData.current;
				data.items = $.map(gameData.items, function (val, ind) {
						if (val.currentLocation != val.initialLocation)
							return [ind, val.currentLocation]
					});
				data.AdventureNumber = gameData.header.AdventureNumber;
				data.AdventureVersion = gameData.header.AdventureVersion;

				prompt("Save game data", JSON.stringify(data));

				break;

			case 72: // swap item locations
				var loc = gameData.items[pArg1].currentLocation;
				gameData.items[pArg1].currentLocation =
					gameData.items[pArg2].currentLocation;
				gameData.items[pArg2].currentLocation = loc;
				break;

			case 73: //continue with next action
				break;

			case 74: //take item, no check done to see if can carry
				gameData.items[pArg1].currentLocation = CONSTANTS.INVENTORY;
				break;

			case 75: //put item 1 with item2
				gameData.items[pArg1].currentLocation =
					gameData.items[pArg2].currentLocation;
				break;

				//case 76, look, grouped with 64

			case 77: //decement current counter
				WriteDebug("CurrentCounter decrement: " + gameData.current.currentCounter, "debugItem1");
				if (gameData.current.currentCounter > 0)
					gameData.current.currentCounter--;
				break;

			case 78: //output current counter
				SetGameOutput(gameData.current.currentCounter + "\r\n", false);
				break;

			case 79: //set current counter value
				WriteDebug("CurrentCounter set: " + pArg1, "debugItem1");
				gameData.current.currentCounter = pArg1;
				break;

			case 80: //swap location with saved location
				var i = gameData.current.currentRoom;
				gameData.current.currentRoom = gameData.current.savedRoom;
				gameData.current.savedRoom = i;
				break;

			case 81: //"Select a counter. Current counter is swapped with backup counter @".replace("@", pValue1);
				var temp = gameData.current.currentCounter;
				gameData.current.currentCounter = gameData.current.counters[pArg1];
				gameData.current.counters[pArg1] = temp;
				break;

			case 82: //add to current counter
				var str = "CurrentCounter += " + pArg1 + " Changed from " + gameData.current.currentCounter;
				gameData.current.currentCounter += pArg1;
				WriteDebug(str + " to " + gameData.current.currentCounter, "debugItem1");
				break;

			case 83: //subtract from current counter
				var str = "CurrentCounter -= " + pArg1 + " Changed from " + gameData.current.currentCounter;
				gameData.current.currentCounter -= pArg1;
				if (gameData.current.currentCounter < -1) {
					gameData.current.currentCounter = -1;
				}

				WriteDebug(str + " to " + gameData.current.currentCounter, "debugItem1");
				break;

			case 84: //echo noun without cr
				SetGameOutput(gameData.current.playerNoun, false);
				break;

			case 85: //echo noun
				SetGameOutput(gameData.current.playerNoun + "\r\n", false);
				break;

			case 86: //Carriage Return"
				SetGameOutput("\r\n", false);
				break;

			case 87: //Swap current location value with backup location-swap value
				var temp = gameData.current.currentRoom;
				gameData.current.currentRoom = gameData.current.savedRooms[pArg1];
				gameData.current.savedRooms[pArg1] = temp;
				break;

            case 88: //wait 2 seconds
                DisableUserInput(true);
				return true;
			}
		}

		return false;
	}

	/*
	Check the provided condition

	@pCon Condition number
	@pArg Condition argument
	 */
	var CheckCondition = function (pCon, pArg) {

		var retVal = false;
		switch (pCon) {

		case 1: //item carried
			retVal = gameData.items[pArg].currentLocation == CONSTANTS.INVENTORY;
			break;

		case 2: //item in room with player
			retVal = gameData.items[pArg].currentLocation == gameData.current.currentRoom;
			break;

		case 3: //item carried or in room with player
			retVal = gameData.items[pArg].currentLocation == CONSTANTS.INVENTORY ||
				gameData.items[pArg].currentLocation == gameData.current.currentRoom;
			break;

		case 4: //player in room X
			retVal = gameData.current.currentRoom == pArg;
			break;

		case 5: //item not in room with player
			retVal = gameData.items[pArg].currentLocation != gameData.current.currentRoom;
			break;

		case 6: //item not carried
			retVal = gameData.items[pArg].currentLocation != CONSTANTS.INVENTORY;
			break;

		case 7: //player not it room
			retVal = gameData.current.currentRoom != pArg;
			break;

		case 8: //bitflag X is set
			retVal = gameData.current.bitFlags[pArg] == true;
			break;

		case 9: //bitflag X is false
			retVal = gameData.current.bitFlags[pArg] != true;
			break;

		case 10: //something carried
			retVal = $.grep(gameData.items, function (i) {
					return i.currentLocation == CONSTANTS.INVENTORY;
				}).length > 0;
			break;

		case 11: //nothing carried
			retVal = $.grep(gameData.items, function (i) {
					return i.currentLocation == CONSTANTS.INVENTORY;
				}).length == 0;
			break;

		case 12: //item not carried or in room with player
			retVal = gameData.items[pArg].currentLocation != CONSTANTS.INVENTORY &
				gameData.items[pArg].currentLocation != gameData.current.currentRoom;
			break;

		case 13: //item in game
			retVal = (gameData.items[pArg].currentLocation != CONSTANTS.STORE);
			break;

		case 14: //item not in game
			retVal = (gameData.items[pArg].currentLocation == CONSTANTS.STORE);
			break;

		case 15: //current counter less than arg
			retVal = gameData.current.currentCounter <= pArg;
			break;

		case 16: //current counter greater than arg
			retVal = gameData.current.currentCounter > pArg;
			break;

		case 17: //object in initial location
			retVal = gameData.items[pArg].currentLocation == gameData.items[pArg].initialLocation;
			break;

		case 18: //object not in initial location
			retVal = gameData.items[pArg].currentLocation != gameData.items[pArg].initialLocation;
			break;

		case 19: //current counter equals
			retVal = gameData.current.currentCounter == pArg;
			break;
		}

		return retVal;
	}

	/*
	Detected an enter press...
	 */
	var EnterPressed = function (text) {

		WriteDebug("Text entered: " + text);

		var inp = text.match(/[^ ]+/g); //split into words
		var verb = null;
		var verbID = null;
		var nounID = 0;

		var temp = null;

		SetGameOutput("", true);

		if (inp == null) //nothing entered
			SetGameOutput(sysmessages[11], true);
		else {

			//shrink
			verb = inp[0].trim().toUpperCase().substring(0, gameData.header.WordLength);

			verbID = SearchWordList(verb, gameData.verbs);
			gameData.current.playerNoun = "";

			if (verbID == 0) //verb not recognised
				SetGameOutput("\"" + inp[0] + "\"" + sysmessages[1], true); //what?

			if (inp.length > 1) { //two words entered
				gameData.current.playerNoun = inp[1];
				nounID = SearchWordList(
						gameData.current.playerNoun.trim().toUpperCase().substring(0, gameData.header.WordLength), gameData.nouns);
			} else if (SearchWordList(verb, directions) > 0) {
				//found a short direction, convert to GO ...
				verbID = 1;
				nounID = SearchWordList(verb, directions);
			} else if (SearchWordList(verb, directions_1) > 0) {
				//found a short direction, convert to GO ...
				verbID = 1;
				nounID = SearchWordList(verb, directions_1);
			} else if (verb == "I" || verb == "INV") {
				SetGameOutput("", true);
				PerformActionComponent(66, 0, 0);
				return;
			} else if //take / drop <no word>
			(gameData.current.playerNoun == "" &&
				(verbID == CONSTANTS.TAKE || verbID == CONSTANTS.DROP)) {
				SetGameOutput(sysmessages[11], true); //what?
				return;
			}

			//we're now at point where the entered data appears to do something..

			//Check lamp life
			if (CheckCondition(13, CONSTANTS.LIGHTSOURCE) & gameData.current.lampLife > 0) { //is the light source in the game
				gameData.current.lampLife--;
				WriteDebug("Lamp life decrement now: " + gameData.current.lampLife);
			}

			//player moving in direction
			if (verbID == 1 && nounID > 0 && nounID < 8) {

				var dark = (gameData.current.bitFlags[CONSTANTS.DARKNESSFLAG] && CheckCondition(12, CONSTANTS.LIGHTSOURCE));

				if (gameData.rooms[gameData.current.currentRoom].exits[nounID - 1] > 0) {

					//direction being moved in exists
					PerformActionComponent(54, gameData.rooms[gameData.current.currentRoom].exits[nounID - 1], 0);

					if (dark)
						SetGameOutput(sysmessages[17], true); //dangerous to move in dark
					else
						SetGameOutput(sysmessages[0], true); //can move

				} else {
					//can't go in that direction
					if (dark) {
						SetGameOutput(sysmessages[18], true); //dead
						PerformActionComponent(63, 0, 0);
						return;
					} else
						SetGameOutput(sysmessages[2], true);
				}

			} else //take / drop all
				if ((verbID == CONSTANTS.TAKE || verbID == CONSTANTS.DROP) && gameData.current.playerNoun.toUpperCase() == "ALL") {

					//we're only intesred in standard items that have an associated word,
					//can be naturally picked and dropped. Special cases that have no word
					//such as the magic mirror in ADV01.dat are picked and dropped by special actions
					var happened = false;
					for (var i = 0; i < gameData.items.length; i++) {

						if (gameData.items[i].currentLocation == (verbID == CONSTANTS.TAKE ? gameData.current.currentRoom : CONSTANTS.INVENTORY)
							 && gameData.items[i].hasOwnProperty("word")) {

							if (verbID == CONSTANTS.TAKE) {
								if (GetItemsAt(CONSTANTS.INVENTORY).length < gameData.header.MaxCarry) {
									PerformActionComponent(52, i, 0);
									SetGameOutput(gameData.items[i].description + ": " + sysmessages[0], false);
								} else {
									SetGameOutput(sysmessages[8], false);
									break;
								}
							} else {
								//drop all
								gameData.items[i].currentLocation = gameData.current.currentRoom;
								SetGameOutput(gameData.items[i].description + ": " + sysmessages[0], false);
							}

							happened = true;
						}
					}

					if (!happened)
						SetGameOutput(verbID == CONSTANTS.TAKE ? sysmessages[21] : sysmessages[22], true);

					PerformActionComponent(64, 0, 0); //look
				} else {
					//compare against custome actions
					PerformActions(verbID, nounID, 0, 0);
					return;
				}

		}

		PerformActions(0, 0, 0, 0);
	}

	/*
	Write debug data

	@pData data to write
	@pClass (optional) class to append to item
	 */
	var WriteDebug = function (pData, pClass) {
		if (debug != null){
		    debug.append($("<div/>").html(pData).addClass(pClass == undefined ? "debugItem" : pClass));
		    debug.scrollTop(debug.find(":last-child").position().top
		        + debug.find(":last-child").height());
		    }
	 }

	/*
	Search the provided array with the provided value.

	If a match is made on a word beginning with a star (a synonym)
	keep moving up until the parent word (!startsWith("*") is found

	@word word to search for
	@list list to search
	 */
	var SearchWordList = function (word, list) {
		var w = null;
		for (var j = 0; j < list.length; j++) {
			//trim the word to the wordlength, adding 1 if it's an alias
			w = list[j].substring(0, gameData.header.WordLength + (list[j].substring(0, 1) == "*" ? 1 : 0));

			if (w == word)
				return j;
			else if (w.substring(0, 1) == "*" && w.substring(1) == word) {
				while (list[j].substring(0, 1) == "*")
					j--;
				return j;
			}
		}
		return 0; //found nothing
	}

	/*
	Set the game output

	@pText Text to display
	@pClear boolean Append or add text
	 */
	var SetGameOutput = function (pText, pClear) {
		if (pClear)
			gameOutput.text(pText);
		else
			gameOutput.text(gameOutput.text() + pText);
	}

	// A really lightweight plugin wrapper around the constructor,
	// preventing against multiple instantiations
	$.fn[pluginName] = function (options) {
		return this.each(function () {
			if (!$.data(this, "plugin_" + pluginName)) {
				$.data(this, "plugin_" +
					pluginName, new Plugin(this, options));
			}
		});
	};

})(jQuery, window, document);
