"use strict";

/*
*   Parse loaded .dat file into Javascript object
*
*       pFilearray - array of dat file
*       pAddComments -boolean, add comments to the outputted JS object 
*
*       returns JSObject
*/
function Parse(pFilearray, addComents) {

    if (!String.prototype.trim) {
        String.prototype.trim = function() {
            return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        };
    }

    //Convert the file array into an array of tokens
    //that are either a number or a characters wrapped in inverted commas
    var tokens = [];
    var capture = false;
    var ctr = 0;
    var f = "";
    var c = "";

    for (var i = 0; i < pFilearray.length; i++) {

        c = pFilearray[i].trim();

        if (capture && f != "\"" && c == "") {//end number capture
            capture = false;
            tokens[tokens.length - 1] = parseInt(tokens[tokens.length - 1]);
        }

        if (!capture && c != "") {
            capture = true;
            tokens.push("");
            f = c; //store the first character captured
        }

        if (capture)
            tokens[tokens.length - 1] += pFilearray[i];

        //end string capture
        if (capture && tokens[tokens.length - 1].length > 1
                            && c == "\""
                            && c == f) {
            capture = false;

            //trim containing quotes
            tokens[tokens.length - 1] = tokens[tokens.length - 1].slice(1, -1);

            //ensure there is an \r before an \n
            tokens[tokens.length - 1] = tokens[tokens.length - 1].replace(/\r?\n/g, "\r\n");

        }

    }

    //data here
    var gameData = {
        header: {
            "MaxCarry": tokens[5]
                , "StartRoom": tokens[6]
                , "TotalTreasures": tokens[7]
                , "WordLength": tokens[8]
                , "LightDuration": tokens[9]
                , "TreasureRoom": tokens[11]
        },
        actions: [],
        verbs: [],
        nouns: [],
        rooms: [],
        messages: [],
        items: [],
        current: {
            "playerNoun": null
                , "currentRoom": null
                , "savedRoom": null
                , "savedRooms": null
                , "bitFlags": null
                , "counters": null
                , "currentCounter": null
                , "lampLife": null
        }
    };

    var start = 0;
    var words = [];
    var actionDescriptions = [];

    /*
        
    The first 12 numbers are:
        
    "NumberOfItems" :tokens[1]
    "NumberOfActions" :tokens[2]
    "NumberOfNounsVerbs" :tokens[3]
    "NumberRooms" :tokens[4]
    "MaxCarry" :tokens[5]
    "StartRoom" :tokens[6]
    "TotalTreasures" :tokens[7]
    "WordLength" :tokens[8]
    "LightDuration" :tokens[9]
    "NumberMessages" :tokens[10]
    "TreasureRoom" :tokens[11]            
    
    */


    //
    //  Actions data
    //
    start = 12;
    var actraw;
    var base;
    for (var i = 0; i < tokens[2] + 1; i++) {

        /*
        8 item integer array representing an action

        [0] verb/noun
        [1 - 5] conditons
        [6 - 7] actions

        */
        actraw = [];
        for (var j = 0; j < 8; j++)
            actraw.push(tokens[start + (i * 8) + j]);

        //only attempt to process if there actions present
        if (actraw[7] + actraw[6] > 0) {

            base = {
                "verb": Math.floor(actraw[0] / 150),
                "noun": Math.floor(actraw[0] % 150),
                "conditions": [],
                "actions": []
            };

            //Get conditions and action arguments
            var actarg = [];
            for (var k = 1; k < 6; k++) {
                if (actraw[k] % 20 > 0)
                    base.conditions.push({ "con": Math.floor(actraw[k] % 20), "arg": Math.floor(actraw[k] / 20) });
                else
                    actarg.push(actraw[k] / 20);
            }

            //action numbers
            var a = [];
            for (var k = 6; k < 8; k++) {

                if (actraw[k] > 0)
                    base.actions.push({ "act": Math.floor(actraw[k] / 150), "arg1": 0, "arg2": 0 });

                if (actraw[k] % 150 > 0)
                    base.actions.push({ "act": Math.floor(actraw[k] % 150), "arg1": 0, "arg2": 0 });

            }

            //assign the action arguements to the actions
            var aaPos = 0;
            for (var k = 0; k < base.actions.length; k++) {

                switch (base.actions[k].act) {

                    //require 1 argument      
                    case 52:
                    case 53:
                    case 54:
                    case 55:
                    case 58:
                    case 59:
                    case 60:
                    case 74:
                    case 81:
                    case 82:
                    case 83:
                    case 87:
                    case 79:    //set current counter
                        base.actions[k]["arg1"] = actarg[aaPos];
                        aaPos++
                        break;

                    //actipons that require 2 args      
                    case 62:
                    case 72:
                    case 75:
                        base.actions[k]["arg1"] = actarg[aaPos];
                        base.actions[k]["arg2"] = actarg[aaPos + 1];
                        aaPos += 2;
                        break;
                }
            }

            gameData.actions.push(base);

        }

    }

    //
    //  Child action processing
    //
    //  All actions that follow an action with a component 73 are noun == 0 && verb == 0
    //  change them to -1 -1, as they are child items and this makes them easier to
    //  handle in the game
    //
    var act73 = false;
    for (var i = 0; i < gameData.actions.length; i++) {

        act73 = false;
        $.map(gameData.actions[i].actions, function(a) { if (a.act == 73) act73 = true; });

        if (act73) {
            i++;
            while (i < gameData.actions.length && //added to prevent array overrun
                        gameData.actions[i].noun == 0 & gameData.actions[i].verb == 0) {
                gameData.actions[i].verb = -1;
                gameData.actions[i].noun = -1;
                i++;
            }
            i--;
        }
    }



    //
    //  Words
    //
    start += ((tokens[2] + 1) * 8);
    for (var i = 0; i < tokens[3] * 2 + 2; i++) {
        words.push(tokens[start + i]);
        if (i % 2 == 0)
            gameData.verbs.push(tokens[start + i]);
        else
            gameData.nouns.push(tokens[start + i]);

    }

    //
    //  Rooms
    //
    start += words.length;
    for (var i = 0; i < tokens[4] + 1; i++) {

        var room = {
            "description": tokens[start + (i * 7) + 6],
            "exits": []
        };

        for (var j = 0; j < 6; j++)
            room["exits"].push(parseInt(tokens[start + (i * 7) + j]));

        gameData.rooms.push(room);

    }

    //
    //  Messages
    //
    start += gameData.rooms.length * 7;
    for (var i = 0; i < tokens[10] + 1; i++)
        gameData.messages.push(tokens[start + i]);

    //
    //  Items: an array of objects that represent an Item
    //      {description: "", word:"", location:""}
    //
    start += gameData.messages.length;
    for (var i = 0; i < tokens[1] + 1; i++) {

        var item = [];
        for (var j = 0; j < 2; j++) {
            item.push(tokens[start + (i * 2) + j]);
        }
        var itemObj =
					{
					    "description": item[0],
					    "initialLocation": item[1],
					    "currentLocation": item[1]
					};

        //two items - the first is description and optional word, and the second is location
        if (itemObj.description.indexOf("\/") > 0) {

            itemObj.word = item[0].substring(item[0].indexOf("/") + 1, item[0].lastIndexOf("/"));
            itemObj.description = item[0].substring(0, item[0].indexOf("/"));

        }


        gameData.items.push(itemObj);
    }

    //
    //  Action Descriptions
    //
    start += (gameData.items.length * 2);
    for (var i = 0; i < tokens[2] + 1; i++)
        actionDescriptions.push(tokens[start + i]);



    //
    //  process footer
    //
    start += (gameData.actions.length);
    gameData.header.AdventureNumber = tokens[start + 1];
    gameData.header.AdventureVersion = tokens[start + 2];



    // 
    //  Finished loading data
    //

    //record the total number of system actions
    //this will be used in the game PerformActions to determine when
    //to output an OK message after an auto take drop occurs
    gameData.header.NumberOfActions = gameData.actions.length;


    //
    //  finally, generate get/drop actions for items that can be carried
    //
    var match = false;
    for (var i = 0; i < gameData.items.length; i++) {

        if ("word" in gameData.items[i]) {

            //the word will also have a nounID
            var nounID = $.inArray(gameData.items[i].word, gameData.nouns);

            //if word is present, we need to add a get an drop action for it
            gameData.actions.push
                (
                    {
                        "description": "Auto take for " + gameData.items[i].description
                        , "verb": 10
                        , "noun": nounID
                        , conditions: [{ "con": 2, "arg": i}]
                        , actions: [{ "act": 52, "arg1": i, "arg2": 0}]
                    }
                );


            gameData.actions.push
                (
                    {
                        "description": "Auto drop for " + gameData.items[i].description
                        , "verb": 18
                        , "noun": nounID
                        , conditions: [{ "con": 1, "arg": i}]
                        , actions: [{ "act": 53, "arg1": i, "arg2": 0}]
                    }
                );

        }
    }


    //add comments
    var desc;

    if (addComents) {

        var action = null;
        for (var i = 0; i < gameData.actions.length; i++) {

            action = gameData.actions[i];

            action.description = ["Event " + i + (actionDescriptions[i] != "" ? ": " + actionDescriptions[i] : "")];

            if (action.verb == 0 & action.noun > 0)
                desc = "Prob < " + action.noun + "%";
            else if (action.verb > 0)
                desc = gameData.verbs[action.verb] + " " + gameData.nouns[action.noun];
            else if (action.verb == 0 & action.noun == 0)
                desc = "auto action";

            action.description.push(desc);

            action.description.push("**CONDITIONS");
            if (action.conditions.length == 0)
                action.description.push("-none-");
            for (var c = 0; c < action.conditions.length; c++) {
                var con = action.conditions[c];
                action.description.push(ConditionDescription(con.con, con.arg));
            }

            action.actionDescriptions = [];
            for (var a = 0; a < action.actions.length; a++) {
                var act = action.actions[a];
                action.actionDescriptions.push(ActionDescription(act.act, act.arg1, act.arg2));
            }

        }
    }

    return gameData;

    //
    //  Return a string describing the action
    //  pAction, the action value
    //  pValue1, pValue2 the action arguments
    //
    function ActionDescription(pAction, pValue1, pValue2) {

        var description = "";

        if (pAction >= 1 && pAction < 52) {
            return "Output message: '@'".replace("@", gameData.messages[pAction]).replace("\n", "#").replace("\r", "#");
        }
        else if (pAction >= 102)
            return "Output message: '@'".replace("@", gameData.messages[pAction - 50]).replace("\n", "#").replace("\r", "#");
        else {
            switch (pAction) {

                case 52:
                    description = "Get item '@'. Checks if you can carry it first".replace("@", gameData.items[pValue1].description);
                    break;

                case 53:
                    description = "Drops item '@'.".replace("@", gameData.items[pValue1].description);
                    break;

                case 54:
                    description = "Moves to room @".replace("@", pValue1);
                    break;

                case 55:
                case 59:
                    description = "Item '@' is removed from game (put in room 0)".replace("@", gameData.items[pValue1].description);
                    break;

                case 56:
                    description = "The darkness flag is set";
                    break;

                case 57:
                    description = "The darkness flag is cleared";
                    break;

                case 58:
                    description = "Bitflag @ is set".replace("@", pValue1);
                    break;

                case 60:
                    description = "Bitflag @ is cleared".replace("@", pValue1);
                    break;

                case 61:
                    description = "Death. Dark flag cleared, player moved to last room";
                    break;

                case 62:
                    description = "Item '@' is moved to room '-#-'".replace("@", gameData.items[pValue1].description).replace("-#-", pValue2);
                    break;

                case 63:
                    description = "Game over";
                    break;

                case 65:
                    description = "Score";
                    break;

                case 66:
                    description = "Inventory";
                    break;

                case 67:
                    description = "Bitflag 0 is set";
                    break;

                case 68:
                    description = "Bitflag 0 is cleared";
                    break;

                case 69:
                    description = "Refill lamp";
                    break;

                case 70:
                    description = "Clear screen";
                    break;

                case 71:
                    description = "Save the game";
                    break;

                case 72:
                    description = "Swap item '<arg1>' and item '<arg2>' locations".replace("<arg1>", gameData.items[pValue1].description).replace("<arg2>", gameData.items[pValue2].description);
                    break;

                case 73:
                    description = "Continue with next line (the next line starts verb 0 noun 0)";
                    break;

                case 74:
                    description = "Take item '<arg1>' - no check is done too see if it can be carried.".replace("<arg1>", gameData.items[pValue1].description);
                    break;

                case 76:
                case 64:
                    description = "Look";
                    break;

                case 77:
                    description = "Decrement current counter. Will not go below 0";
                    break;

                case 78:
                    description = "Print current counter value.";
                    break;

                case 79:
                    description = "Set current counter value to @".replace("@", pValue1);
                    break;

                case 80:
                    description = "Swap location with current location-swap flag";
                    break;

                case 81:
                    description = "Select a counter. Current counter is swapped with backup counter @".replace("@", pValue1);
                    break;

                case 82:
                    description = "Add @ to current counter value".replace("@", pValue1);
                    break;

                case 83:
                    description = "Subtract @ from current counter value".replace("@", pValue1);
                    break;

                case 84:
                    description = "Echo noun player typed without Carriage Return";
                    break;

                case 85:
                    description = "Echo the noun the player typed";
                    break;

                case 86:
                    description = "Carriage Return";
                    break;

                case 87:
                    description = "Swap current location value with backup location-swap value @".replace("@", pValue1);
                    break;

                case 88:
                    description = "Wait 2 seconds";
                    break;

                case 89:
                    description = "SAGA - draw picture <n>";
                    break;

                default:
                    description = "*UNKOWN PARAMETER*";
                    break;
            }
        }

        return description;
    }

    //
    //  Return a condition description
    //
    //		pCondition 	condition ID
    //		pValue		Condition argument
    //
    function ConditionDescription(pCondition, pValue) {

        var description = "";

        switch (pCondition) {

            case 1:
                description = "Item '@' carried".replace("@", gameData.items[pValue].description);
                break;

            case 2:
                description = "Item '@' in room with player".replace("@", gameData.items[pValue].description);
                break;

            case 3:
                description = "Item '@' carried or in room with player".replace("@", gameData.items[pValue].description);
                break;

            case 4:
                description = "In room '@'".replace("@", pValue);
                break;

            case 5:
                description = "Item '@' not in room with player".replace("@", gameData.items[pValue].description);
                break;

            case 6:
                description = "Item '@' not carried".replace("@", gameData.items[pValue].description);
                break;

            case 7:
                description = "Not in room '@'".replace("@", pValue);
                break;

            case 8:
                description = "BitFlag @ is set".replace("@", pValue);
                break;

            case 9:
                description = "BitFlag @ is cleared".replace("@", pValue);
                break;

            case 10:
                description = "Something carried";
                break;

            case 11:
                description = "Nothing carried";
                break;

            case 12:
                description = "Item '@' not carried nor in room with player".replace("@", gameData.items[pValue].description);
                break;

            case 13:
                description = "Item '@' is in game".replace("@", gameData.items[pValue].description);
                break;

            case 14:
                description = "Item '@' is not in game".replace("@", gameData.items[pValue].description);
                break;

            case 15:
                description = "CurrentCounter <= @".replace("@", pValue);
                break;

            case 16:
                description = "CurrentCounter >= @".replace("@", pValue);
                break;

            case 17:
                description = "Object still in initial room";
                break;

            case 18:
                description = "Object not in initial room";
                break;

            case 19:
                description = "CurrentCounter = @".replace("@", pValue);
                break;

        }

        return description;
    }

}
