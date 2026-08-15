/// <reference path="../../lib/openrct2.d.ts" />


function archipelagoGui(){
    var ww = 350;
    var wh = 225;
    let y = 0;

    var onStart = function() {
        try{
            trace('This is where we connect to Archipelago and set up the game.');
            //TODO: Get seed from Archipelago
            setGlobalSeed(Math.floor(Math.random() * 1000000));//Maybe someday I'll allow custom seeds
            //No need for research, since we're using a different system entirely for that
            settings.rando_research = false;
            //Crowd control has a lot of options that would most likely break Archipelago. We're going to disable both at once until further notice.
            archipelago_settings.deathlink_timeout = false;
            //We're going to track the objectives ourselves instead
            try{
                context.registerAction('changeObjective', (args) => {return {};}, (args) => {scenario.objective.type = "haveFun"; return {};});
            }
            catch(e){
                console.log("Error in registering changeObjective:" + e)
            }
            context.executeAction("changeObjective", {});            
            archipelago_settings.started = true;
            saveArchipelagoProgress();//Save the settings to our Archipelago tracker
            // we need to unpause the game in order for the next tick to run
            UnpauseGame();
            runNextTick(function() {
                initRando();
                if(global_settings.auto_pause) {
                    PauseGame();
                }
            createChangesWindow();
            });
        }
        catch(e){
            printException("Error in onStart (archipelagoWindow):", e);
            throw e;
        }
    }

    context.setTimeout(changeTextColor, 1000);

    var window = ui.openWindow({
        classification: 'archipelago-connect',
        title: "Archipelago " + archipelago_version,
        width: ww,
        height: wh,
        widgets: [].concat(
            NewLabel("If you haven't done so, open your OpenRCT2 Client. You can find more info at archipelago.gg/tutorial", {
                name: 'Instructions',
                y: y++,
                width: 2,
                tooltip: "Shoutout to Die4Ever for figuring out all this networking stuff, cause I certainly wouldn't have been able to."
            }),
            NewLabel(archipelago_connected_to_game ? "The Archipelago Client is connected to the game!" : "The Archipelago Client is {RED}not{WHITE} connected to the game.", {
                name: 'Connected-to-game',
                y: y++,
                width: 2,
                tooltip: "Ooh, it changes based on connection status! That's pretty fancy!"
            }),
            NewLabel(archipelago_connected_to_server ? "The Archipelago Client is connected to the server!" : "The Archipelago Client is {RED}not{WHITE} connected to the server.", {
                name: 'Connected-to-server',
                y: y++,
                width: 2,
                tooltip: "Too bad this font doesn't support emoji. :("
            }),
            NewLabel("", {
                name: 'Correct-scenario',
                y: y++,
                width: 2,
                tooltip: "Writing code to figure this out specifically was kind of a pain."
            }),
            [{
                type: 'button',
                name: 'cancel-button',
                x: ww - 160 - 6,
                y: wh - 6 - 26 - 29,
                width: 90,
                height: 26,
                text: 'Cancel',
                tooltip: 'Cancels the Archipelago game and set up a local randomizer',
                onClick: function() {
                    startGameGui();
                    settings.rando_archipelago = false;
                    // var connection = GetModule("APIConnection") as APIConnection;
                    connection.destroy();
                    window.close();
                }
            },
            {
                type: 'button',
                name: 'start-button',
                x: ww - 160 - 88 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Start Game!',
                tooltip: 'Starts your game of Archipelago!',
                isDisabled: (!archipelago_connected_to_game || !archipelago_connected_to_server || !archipelago_correct_scenario),
                onClick: function() {
                    onStart();
                    trace("At this point, the user should be playing Archipelago! This only needs to be clicked once per multiworld");
                    window.close();
                }
            },
            {
                type: 'button',
                name: 'Tutorial-button',
                x: ww - 160 - 44 - 6,
                y: wh - 24 - 6,
                width: 85,
                height: 26,
                text: 'AP Tutorial',
                tooltip: 'I\'ll learn you good!',
                isDisabled: false,
                onClick: function() {
                    tutorial_0();
                }
            },
            {
                type: 'label',
                name: 'Tutorial-label',
                x: ww - 160 - 40 - 95,
                y: wh - 20,
                width: 85,
                height: 26,
                text: '{GREEN}First time? -->',
                tooltip: 'I\'ll learn you good!',
            },
            {
                type: 'label',
                name: 'Tutorial-label1',
                x: ww - 120 - 4 - 0,
                y: wh - 20,
                width: 85,
                height: 26,
                text: '{GREEN}<-- Click here!!',
                tooltip: 'I\'ll learn you good!',
            },
            {
                type: 'custom',
                name: 'custom-archipealgo-logo-1',
                x: 5,
                y: wh - 24,
                width: 22,
                height: 20,
                tooltip: 'What if this logo was animated? Wouldn\'t that be cool?',
                onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
            }
            ]
        )
    });
    return window;
}

function changeTextColor(){
    trace("COLEOR!");
    if(((ui.getWindow("archipelago-connect").findWidget("Tutorial-label") as LabelWidget).text) == '{BABYBLUE}First time? -->'){
        (ui.getWindow("archipelago-connect").findWidget("Tutorial-label") as LabelWidget).text = '{GREEN}First time? -->';
    }
    else{
        (ui.getWindow("archipelago-connect").findWidget("Tutorial-label") as LabelWidget).text = '{BABYBLUE}First time? -->';
    }
    if(((ui.getWindow("archipelago-connect").findWidget("Tutorial-label1") as LabelWidget).text) == '{BABYBLUE}<-- Click here!!'){
        (ui.getWindow("archipelago-connect").findWidget("Tutorial-label1") as LabelWidget).text = '{GREEN}<-- Click here!!';
    }
    else{
        (ui.getWindow("archipelago-connect").findWidget("Tutorial-label1") as LabelWidget).text = '{BABYBLUE}<-- Click here!!';
    }
    context.setTimeout(changeTextColor, 1000);
}

function archipelagoLocations(){
    var ww = 700;
    var wh = 350;
    let y = 0;
    const furryProblem: boolean = (map.getAllEntities("staff").filter((staff: Staff) => staff.staffType === "entertainer").length < 19 ? true : false);

    var Archipelago = GetModule("RCTRArchipelago") as RCTRArchipelago;
    var lockedList = Archipelago.CreateLockedList();
    var messageLog = context.getParkStorage().get("RCTRando.MessageLog") as Array<any>;

    var game_choice = ["Ocarina of Time", "Adventure", "Donkey Kong Country 3", "Final Fantasy 1", "Hollow Knight",
    "The Legend of Zelda", "A Link to the Past", "Links Awakening", "Pokemon Red and Blue", "Rogue Legacy",
    "Sonic Adventure 2", "Super Mario World", "Super Mario 64", "Super Metroid", "VVVVVV"];
    var game = game_choice[Math.floor(Math.random() * game_choice.length)];//Gotta throw that shade

    archipelago_settings.opened_unlock_shop = true;

    var existing: Window = ui.getWindow("archipelago-locations");
    if(existing) {
        return existing;
    }

    var window = ui.openWindow({
        classification: 'archipelago-locations',
        title: "Welcome to the Unlock Shop!",
        width: ww,
        height: wh,
        onTabChange: () => {
            var currentWindow = ui.getWindow("archipelago-locations");
            if (currentWindow.tabIndex == 0){
                currentWindow.findWidget<ListViewWidget>("locked-location-list").items = Archipelago.CreateLockedList();
                (ui.getWindow("archipelago-locations").findWidget("skip-button") as ButtonWidget).text = 'Skips: ' + String(archipelago_settings.skips);
                (ui.getWindow("archipelago-locations").findWidget("skip-button") as ButtonWidget).isDisabled = !archipelago_settings.skips;
            }
            else if (currentWindow.tabIndex == 1){
                currentWindow.findWidget<ListViewWidget>("unlocked-location-list").items = Archipelago.CreateUnlockedList();
            }
            else if (currentWindow.tabIndex == 2){
                currentWindow.findWidget<ListViewWidget>("objective-list").items = Archipelago.CreateObjectiveList();
            }
            else if (currentWindow.tabIndex == 3){
                currentWindow.findWidget<ListViewWidget>("message-list").items = context.getParkStorage().get("RCTRando.MessageLog") as Array<any>;
                currentWindow.findWidget<CheckboxWidget>("universal-notifications-toggle").isChecked = archipelago_settings.universal_item_messages;
                currentWindow.findWidget<CheckboxWidget>("park-message-toggle").isChecked = archipelago_settings.park_message_chat;
                currentWindow.findWidget<CheckboxWidget>("network-chat-toggle").isChecked = archipelago_settings.network_chat;
            }
            else if (currentWindow.tabIndex == 4){
                currentWindow.findWidget<ListViewWidget>("Hint-list").items = createHintList();
            }
        },
        onClose: () => {
            archipelago_skip_enabled = false;
        },
        tabs:
        [
            {//Locked Checks
                image: {frameBase: 5261,frameCount: 8,frameDuration: 4},
                widgets: [].concat
                (
                    [
                        {
                            type: 'label',
                            name: 'Locked-Location-Label',
                            x: 250,
                            y: 50,
                            width: 100,
                            height: 26,
                            text: 'Locked Checks',
                            tooltip: 'Buying these will help somebody in the multiworld!'
                        },
                        {
                            type: 'listview',
                            name: 'locked-location-list',
                            x: 25,
                            y: 75,
                            width: 650,
                            height: 200,
                            isStriped: true,
                            items: lockedList,
                            scrollbars: 'none',
                            onClick: (item: number) => {
                                if (lockedList[0] === "{WHITE}Either this game just started and you're impatient, or Colby is bad at programming" || lockedList[0] === "Conglaturations! You've unlocked everything! Now go outside and touch some grass."){
                                    return;
                                }
                                else{
                                    console.log("Dank" + lockedList);
                                    Archipelago.PurchaseItem((item - item %2) / 2);
                                    lockedList = Archipelago.CreateLockedList()
                                }
                            }
                        },
                        {
                            type: 'checkbox',
                            name: 'colorblind-toggle',
                            text: 'Enable Colorblind Mode',
                            x: 25,
                            y: 285,
                            width: 240,
                            height: 10,
                            tooltip: 'If you\'re clicking this, you are most likely caucasian and male! That\s true of both colorblind people *and* Archipelago players!',
                            isChecked: archipelago_settings.colorblind_mode,
                            onChange: function(isChecked: boolean) {
                                var currentWindow = ui.getWindow("archipelago-locations");
                                archipelago_settings.colorblind_mode = isChecked;
                                currentWindow.findWidget<ListViewWidget>("locked-location-list").items = Archipelago.CreateLockedList();
                                saveArchipelagoProgress();
                            }
                        },
                        {
                            type: 'button',
                            name: 'excorcize-furry-button',
                            x: 500,
                            y: 285,
                            width: 175,
                            height: 26,
                            text: 'A furry problem? In my park?',
                            tooltip: "It's more likely than you think!",
                            //Disable the button if there's not a furry problem in the park
                            isDisabled: furryProblem,
                            onClick: () => {archipelagoExcorcizeFurries();}
                        },
                        {
                            type: 'button',
                            name: 'skip-button',
                            x: 500,
                            y: 315,
                            width: 175,
                            height: 26,
                            text: 'Skips: ' + String(archipelago_settings.skips),
                            tooltip: "You're telling me you *don't* want to build 9 Railroads?",
                            //Disable the button if there's no skips in the bank
                            isDisabled: !archipelago_settings.skips,
                            onClick: () => {
                                let pressed = (ui.getWindow("archipelago-locations").findWidget("skip-button") as ButtonWidget).isPressed;
                                if (!pressed){
                                    (ui.getWindow("archipelago-locations").findWidget("skip-button") as ButtonWidget).isPressed = true;
                                    archipelago_skip_enabled = true;
                                    trace("Clicky");
                                }
                                else{
                                    (ui.getWindow("archipelago-locations").findWidget("skip-button") as ButtonWidget).isPressed = false;
                                    archipelago_skip_enabled = false;
                                    trace("Unclicky");
                                }
                            }
                        },
                        {
                            type: 'label',
                            name: 'Version',
                            x: 200,
                            y: 330,
                            width: 300,
                            height: 26,
                            text: "Archipelago " + archipelago_version,
                            tooltip: "You see that number? We like watching that number go up. That means I'm good at programming."
                        },
                        {
                            type: 'custom',
                            name: 'custom-archipealgo-logo-1',
                            x: 5,
                            y: wh - 24,
                            width: 22,
                            height: 20,
                            tooltip: 'I\'ll be honest, I spent way too many hours trying to figure out how to add custom images to not plaster this wherever I could.',
                            onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
                        }
                    ]
                )
            },
            {//Unlocked Checks
                image: {frameBase: 5442,frameCount: 16,frameDuration: 4},
                widgets: [].concat
                (
                    [
                        {
                            type: 'label',
                            name: 'Unlocked-Location-Label',
                            x: 125,
                            y: 50,
                            width: 100,
                            height: 26,
                            text: 'Unlocked Checks',
                            tooltip: 'Thank you for your purchases! No refunds!'
                        },
                        {
                            type: 'listview',
                            name: 'unlocked-location-list',
                            x: 25,
                            y: 75,
                            width: 650,
                            height: 200,
                            isStriped: true,
                            items: Archipelago.CreateUnlockedList()
                        },
                        // {
                        //     type: 'label',
                        //     name: 'Connected-to-server',
                        //     x: 200,
                        //     y: 330,
                        //     width: 300,
                        //     height: 26,
                        //     text: archipelago_connected_to_game ? "The Archipelago Client is connected to the game!" : "The Archipelago Client is {RED}not{WHITE} connected to the game.",
                        //     tooltip: "Well, back in the day I used to connect at twelve-hundred baud, but ever since the merger, I'm lucky if I get twelve baud! "
                        // },
                        {
                            type: 'custom',
                            name: 'custom-archipealgo-logo-1',
                            x: 5,
                            y: wh - 24,
                            width: 22,
                            height: 20,
                            tooltip: 'I know for a fact nobody is reading this exact tooltip. Therefore I can say whatever I want here without repercussions! Dutch is not a real language.',
                            onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
                        }
                    ]
                )
            },
            {//Goals
                image: {frameBase: 5511,frameCount: 15,frameDuration: 4},
                widgets: [].concat
                (
                    [

                        {
                            type: 'label',
                            name: 'Goal',
                            x: 45,
                            y: 60,
                            width: 1000,
                            height: 56,
                            text: "Your goal, should you choose to accept it, is to build a grand theme park featuring - at minimum - the following attributes:",
                            tooltip: 'If you have deathlink on... good luck'
                        },
                        {
                            type: 'listview',
                            name: 'objective-list',
                            x: 25,
                            y: 75,
                            width: 650,
                            height: 240,
                            isStriped: true,
                            scrollbars: 'none',
                            columns:[{width: 1400}],
                            items: Archipelago.CreateObjectiveList()
                        },
                        // {
                        //     type: 'label',
                        //     name: 'Connected-to-server',
                        //     x: 200,
                        //     y: 300,
                        //     width: 300,
                        //     height: 26,
                        //     text: archipelago_connected_to_game ? "The Archipelago Client is connected to the game!" : "The Archipelago Client is {RED}not{WHITE} connected to the game.",
                        //     tooltip: "Well, back in the day I used to connect at twelve-hundred baud, but ever since the merger, I'm lucky if I get twelve baud! "
                        // },
                        {
                            type: 'custom',
                            name: 'custom-archipealgo-logo-1',
                            x: 5,
                            y: wh - 24,
                            width: 22,
                            height: 20,
                            tooltip: 'If you like Archipelago in OpenRCT2, let me know! You can find me at "Crazycolbster" on Discord. If you don\'t like Archipelago in OpenRCT2, that sounds like a you problem.',
                            onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
                        }
                    ]
                )
            },
            {//Chat
                image: {frameBase: 5269,frameCount: 8,frameDuration: 4},
                widgets: [].concat
                (
                    [
                        {
                            type: 'label',
                            name: 'Message-Log-Label',
                            x: 250,
                            y: 50,
                            width: 100,
                            height: 26,
                            text: 'Message Log',
                            tooltip: "Y'all's sure do talk a lot, don't you?"
                        },
                        {
                            type: 'listview',
                            name: 'message-list',
                            x: 25,
                            y: 75,
                            width: 650,
                            height: 200,
                            isStriped: false,
                            items: (messageLog ? messageLog : []),
                            scrollbars: 'both',
                            columns:[{width: 1400}]
                        },
                        {
                            type: 'textbox',
                            name: 'chatbox',
                            text: 'Type your message here!',
                            maxLength: 999,
                            x: 25,
                            y: 275,
                            width: 650,
                            height: 20,
                            tooltip: "You know, not every game lets you type in-game. All I'm saying is that we're better than " + game + " because of this.",
                        },
                        {
                            type: 'button',
                            name: 'send-chat-button',
                            x: 25,
                            y: 300,
                            width: 100,
                            height: 26,
                            text: 'Send Message!',
                            tooltip: 'The shortcut to this button is alt-F4',
                            onClick: function() {
                                interpretMessage();
                            }
                        },
                        {
                            type: 'checkbox',
                            name: 'universal-notifications-toggle',
                            text: 'Enable universal item notifications',
                            x: 150,
                            y: 310,
                            width: 240,
                            height: 10,
                            tooltip: 'If disabled, only items directly related to you will appear as chats. Useful in large games.',
                            isChecked: archipelago_settings.universal_item_messages,
                            onChange: function(isChecked: boolean) {
                                var currentWindow = ui.getWindow("archipelago-locations");
                                archipelago_settings.universal_item_messages = isChecked;
                                saveArchipelagoProgress();
                            }
                        },
                        {
                            type: 'checkbox',
                            name: 'park-message-toggle',
                            text: 'Print Archipelago Chat to Park Messages',
                            x: 400,
                            y: 310,
                            width: 240,
                            height: 10,
                            tooltip: 'Prints Archipelago chats and messages as in game notifications. If your group is chatty, this could be annoying',
                            isChecked: archipelago_settings.park_message_chat,
                            onChange: function(isChecked: boolean) {
                                var currentWindow = ui.getWindow("archipelago-locations");
                                archipelago_settings.park_message_chat = isChecked;
                                saveArchipelagoProgress();
                            }
                        },
                        {
                            type: 'checkbox',
                            name: 'network-chat-toggle',
                            text: "Print Archipelago Chat to Network Messages",
                            x: 400,
                            y: 330,
                            width: 220,
                            height: 10,
                            tooltip: 'Prints Archipelago chats and messages as network chats. This will not work in single player mode',
                            isChecked: archipelago_settings.network_chat,
                            onChange: function(isChecked: boolean) {
                                var currentWindow = ui.getWindow("archipelago-locations");
                                archipelago_settings.network_chat = isChecked;
                                saveArchipelagoProgress();
                            }
                        },
                        {
                            type: 'custom',
                            name: 'custom-archipealgo-logo-1',
                            x: 5,
                            y: wh - 24,
                            width: 22,
                            height: 20,
                            tooltip: 'I bet ' + game + ' doesn\'t have the archipelago logo in it.',
                            onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
                        }
                    ]
                )
            },
            {//Hints
                image: {frameBase: 5367,frameCount: 8,frameDuration: 4},
                widgets: [].concat
                (
                    [
                        {
                            type: 'label',
                            name: 'Hint-Log-Label',
                            x: 250,
                            y: 50,
                            width: 100,
                            height: 26,
                            text: 'Hints',
                            tooltip: "Is it really that important to know where your items are?"
                        },
                        {
                            type: 'listview',
                            name: 'Hint-list',
                            x: 25,
                            y: 75,
                            width: 650,
                            height: 200,
                            isStriped: true,
                            items: (createHintList()),
                            scrollbars: 'vertical',
                            columns:[{width: 140},{width: 140},{width: 140},{width: 140},{width: 140}],
                            onClick: (item: number) => {
                                console.log("Colbys doing this right");
                                ui.showError("", String(createHintList()[item][3]));
                            }
                        },
                        {
                            type: 'checkbox',
                            name: 'not-found-toggle',
                            text: 'Only show Not Found',
                            x: 150,
                            y: 310,
                            width: 240,
                            height: 10,
                            tooltip: 'Hides any items already found.',
                            isChecked: archipelago_settings.hint_not_found_filter,
                            onChange: function(isChecked: boolean) {
                                var currentWindow = ui.getWindow("archipelago-locations");
                                archipelago_settings.hint_not_found_filter = isChecked;
                                saveArchipelagoProgress();
                                currentWindow.findWidget<ListViewWidget>("Hint-list").items = createHintList();
                            }
                        },{
                            type: 'label',
                            name: 'Player-List-Label',
                            x: 150,
                            y: 325,
                            width: 150,
                            height: 26,
                            text: 'Filter by player:',
                            tooltip: "Filters by the selected player. Man, this is better than the client!"
                        },
                        {
                            type: 'dropdown',
                            name: 'player-toggle',
                            text: 'Filter by Player',
                            x: 300,
                            y: 325,
                            width: 240,
                            height: 10,
                            tooltip: 'Filters by the selected player. Man, this is better than the client!',
                            items: ["All", ...(context.getParkStorage().get("RCTRando.ArchipelagoPlayers") as playerTuple[]).map(tuple => tuple[0])],
                            onChange: function(index: number) {
                                var currentWindow = ui.getWindow("archipelago-locations");
                                if(index)
                                archipelago_settings.hint_player_filter = context.getParkStorage().get("RCTRando.ArchipelagoPlayers")[index - 1][0];
                                else
                                archipelago_settings.hint_player_filter = 0;
                                saveArchipelagoProgress();
                                currentWindow.findWidget<ListViewWidget>("Hint-list").items = createHintList();
                            }
                        },
                        {
                            type: 'custom',
                            name: 'custom-archipealgo-logo-1',
                            x: 5,
                            y: wh - 24,
                            width: 22,
                            height: 20,
                            tooltip: 'After recovering from this project, I\'m thinking about doing Kirby and the Amazing Mirror next. Wouldn\'t that be cool?',
                            onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
                        }
                    ]
                )
            },
            {//EnergyLink
                image: {frameBase: 5277,frameCount: 7,frameDuration: 4},
                widgets: [].concat
                (
                    [
                        {
                            type: 'label',
                            name: 'Bank-Label',
                            x: 250,
                            y: 50,
                            width: 160,
                            height: 26,
                            text: 'EnergyLink Bank ATM Machine',
                            tooltip: "We here at this Multi-Billion Dollar Bank care deeply about you, just like how oil companies care deeply about climate change."
                        },
                        {
                            type: 'button',
                            name: 'withdraw-button',
                            x: 25,
                            y: 100,
                            width: 200,
                            height: 200,
                            text: 'Withdraw Funds',
                            tooltip: 'I\'m sure that Stardew Valley player didn\'t need the money anyways!',
                            onClick: function() {
                                ui.showTextInput({title: "Enter Amount to be Withdrawn", 
                                description: "Note: A 10% fee will be assessed on both deposits and withdrawls. " + 
                                "All users in the multiworld have access to this account.", 
                                callback(value: string){
                                    if(!(parseInt(value)  > -1)){//Numbers only
                                        ui.showError("Not A Valid Amount", "This ATM Machine only accepts amounts as a positive integer. Please input a valid amount.")
                                        return;
                                    }
                                    var amount = parseInt(value);
                                    // Convert 1 internal currency to a multiplier by formatting it into a string and parsing it
                                    var currency = context.formatString("{CURRENCY2DP}", 1)
                                    var currencyMultiplierAsArray = currency.match(/[\d.]+/g); // Matches numbers and decimals
                                    //Finishes converting the value to just the number
                                    var currencyMultiplier = parseFloat(currencyMultiplierAsArray.join(""));
                                    // Get the user to type in a value into a textbox and use the multiplier
                                    amount = Math.floor(amount / currencyMultiplier);//Amount is now in the undelying game currency units
                                    if(!archipelago_settings.team)//If the team isn't set
                                        archipelago_settings.team = 0;//Put them on team 0
                                    const key = "EnergyLink" + String(archipelago_settings.team);
                                    const tag = archipelago_settings.seed + String(date.ticksElapsed);
                                    archipelago_send_message("Set", {key: key, default: 0, tag: tag, want_reply: true, operations: [{operation: "add", value: -amount * (5 * 10**6)}, {"operation": "max", "value": 0}]})
                                } });
                            }
                        },
                        {
                            type: 'button',
                            name: 'deposit-button',
                            x: 250,
                            y: 100,
                            width: 200,
                            height: 200,
                            text: 'Deposit Funds',
                            tooltip: 'Look at you. You\'re so generous.',
                            onClick: function() {
                                ui.showTextInput({title: "Enter Amount to be Deposited", 
                                description: "Note: A 10% fee will be assessed on both deposits and withdrawls. " + 
                                "All users in the multiworld have access to this account.", 
                                callback(value: string){
                                    if(!(parseInt(value)  > -1)){//Numbers only
                                        ui.showError("Not A Valid Amount", "This ATM Machine only accepts amounts as a positive integer. Please input a valid amount.")
                                        return;
                                    }
                                    var amount = parseInt(value);
                                    // Convert 1 internal currency to a multiplier by formatting it into a string and parsing it
                                    var currency = context.formatString("{CURRENCY2DP}", 1)
                                    var currencyMultiplierAsArray = currency.match(/[\d.]+/g); // Matches numbers and decimals
                                    //Finishes converting the value to just the number
                                    var currencyMultiplier = parseFloat(currencyMultiplierAsArray.join(""));
                                    // Get the user to type in a value into a textbox and use the multiplier
                                    amount = Math.floor(amount / currencyMultiplier);//Amount is now in the undelying game currency units
                                    if(park.cash - amount < 100000){//The player must have the equivalent of at least $10,000 afterwards to be elligible to deposit
                                        ui.showError("Insufficient Reserves", "Multiworld Customs and Import laws require that the customer have at least " +
                                        context.formatString("{CURRENCY2DP}", 100000) + " in reserve to contribute to their account at EnergyLink Bank.")
                                        return;
                                    }
                                    if(!archipelago_settings.team)//If the team isn't set
                                        archipelago_settings.team = 0;//Put them on team 0
                                    const key = "EnergyLink" + String(archipelago_settings.team);
                                    const tag = archipelago_settings.seed + String(date.ticksElapsed);
                                    archipelago_send_message("Set", {key: key, default: 0, tag: tag, want_reply: true, operations: [{operation: "add", value: .9* amount * (5 * 10**6)}]})
                                } });                            }
                        },
                        {
                            type: 'button',
                            name: 'inquiry-button',
                            x: 475,
                            y: 100,
                            width: 200,
                            height: 200,
                            text: 'Balance Inquiry',
                            tooltip: 'IRL ATMs charging you money for this should be a crime.',
                            onClick: function() {
                                if(!archipelago_settings.team)//If the team isn't set
                                    archipelago_settings.team = 0;//Put them on team 0
                                const key = "EnergyLink" + String(archipelago_settings.team);
                                const tag = "inquiry";
                                archipelago_send_message("Set", {key: key, default: 0, tag: tag, want_reply: true, operations: []})                            }
                        },
                        {
                            type: 'custom',
                            name: 'custom-archipealgo-logo-1',
                            x: 5,
                            y: wh - 24,
                            width: 22,
                            height: 20,
                            tooltip: 'Linux is clearly the superior operating system. We all agree, right?',
                            onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
                        }
                    ]
                )
            },
            {//Awards
                image: {frameBase: 5470,frameCount: 16,frameDuration: 8},
                widgets: [].concat
                (
                    [

                        {
                            type: 'label',
                            name: 'Awards',
                            x: 245,
                            y: 60,
                            width: 1000,
                            height: 25,
                            text: "Awards You've Earned!",
                            tooltip: 'Congrats champ, you\'ve earned these!'
                        },
                        {
                            type: 'button',
                            name: 'Tidiest Award',
                            width: 25,
                            height: 25,
                            x: 45,
                            y: 90,
                            border: true,
                            image: 5470,
                            isDisabled: archipelago_settings.awards_received.indexOf("mostTidy") === -1,
                            isVisible: true,
                            tooltip: "More than 1/64th of the guests must be commenting on how tidy the park is, and less than 6 guests must be thinking the park is untidy."
                        },
                        {
                            type: 'label',
                            name: 'Tidiest Label',
                            x: 25,
                            y: 120,
                            width: 75,
                            height: 85,
                            text: "Most Tidy\nPark in the\nMultiverse",
                            tooltip: 'More than 1/64th of the guests must be commenting on how tidy the park is, and less than 6 guests must be thinking the park is untidy.'
                        },
                        {
                            type: 'button',
                            name: 'Best Rollercoasters Award',
                            width: 25,
                            height: 25,
                            x: 135,
                            y: 90,
                            border: true,
                            image: 5471,
                            isDisabled: archipelago_settings.awards_received.indexOf("bestRollerCoasters") === -1,
                            isVisible: true,
                            tooltip: "Park must have at least 6 rollercoasters which are opened."
                        },
                        {
                            type: 'label',
                            name: 'Best Rollercoasters Label',
                            x: 115,
                            y: 120,
                            width: 80,
                            height: 85,
                            text: "Best Roller\nCoasters in\nthe Multiverse",
                            tooltip: 'Park must have at least 6 rollercoasters which are opened.'
                        },
                        {
                            type: 'button',
                            name: 'Most Beautiful Award',//It's a beautiful award. The best award there ever was! And I got it. They tried to not give it to me, but I threatened tarrifs if I didn't get it.
                            width: 25,
                            height: 25,
                            x: 225,
                            y: 90,
                            border: true,
                            image: 5473,
                            isDisabled: archipelago_settings.awards_received.indexOf("mostBeautiful") === -1,
                            isVisible: true,
                            tooltip: "More than 1/128th of guests think \"Great scenery!\" and less than 16 guests comment on how untidy park is."
                        },
                        {
                            type: 'label',
                            name: 'Most Beautiful Label',//They say "Colby, I've never seen such a beautiful label!" It brings a tear to their eye. It's the best label, unlike those dirty lying Democrat labels.
                            x: 205,
                            y: 120,
                            width: 80,
                            height: 85,
                            text: "Most Beautiful\nPark in the\nMultiverse",//Most Beautiful Park in the Multiverse
                            tooltip: 'More than 1/128th of guests think \"Great scenery!\" and less than 16 guests comment on how untidy park is.'
                        },
                        {
                            type: 'button',
                            name: 'Best Staff Award',
                            width: 25,
                            height: 25,
                            x: 315,
                            y: 90,
                            border: true,
                            image: 5476,
                            isDisabled: archipelago_settings.awards_received.indexOf("bestStaff") === -1,
                            isVisible: true,
                            tooltip: "All staff types, at least 20 staff, one staff per 32 peeps."
                        },
                        {
                            type: 'label',
                            name: 'Best Staff Label',
                            x: 295,
                            y: 120,
                            width: 80,
                            height: 85,
                            text: "Best Staff\nin the\nMultiverse",//Best Staff in the Multiverse
                            tooltip: 'All staff types, at least 20 staff, one staff per 32 peeps.'
                        },
                        {
                            type: 'button',
                            name: 'Best Food Award',
                            width: 25,
                            height: 25,
                            x: 405,
                            y: 90,
                            border: true,
                            image: 5477,
                            isDisabled: archipelago_settings.awards_received.indexOf("bestFood") === -1,
                            isVisible: true,
                            tooltip: "At least 7 food shops, 4 unique, one food shop per 128 guests and no more than 12 guests are allowed to think \"I'm hungry\"."
                        },
                        {
                            type: 'label',
                            name: 'Best Food Label',
                            x: 385,
                            y: 120,
                            width: 80,
                            height: 85,
                            text: "Best Food\nin the\nMultiverse",//Best Food in the Multiverse
                            tooltip: "At least 7 food shops, 4 unique, one food shop per 128 guests and no more than 12 guests are allowed to think \"I'm hungry\"."
                        },
                        {
                            type: 'button',
                            name: 'Best Toilets Award',
                            width: 25,
                            height: 25,
                            x: 495,
                            y: 90,
                            border: true,
                            image: 5479,
                            isDisabled: archipelago_settings.awards_received.indexOf("bestToilets") === -1,
                            isVisible: true,
                            tooltip: "At least 4 restrooms, 1 restroom per 128 guests and no more than 16 guests who think they need the restroom."
                        },
                        {
                            type: 'label',
                            name: 'Best Toilets Label',
                            x: 475,
                            y: 120,
                            width: 80,
                            height: 85,
                            text: "Best Toilets\nin the\nMultiverse",//Best Toilets in the Multiverse
                            tooltip: "At least 4 restrooms, 1 restroom per 128 guests and no more than 16 guests who think they need the restroom."
                        },
                        {
                            type: 'button',
                            name: 'Best Water Rides Award',
                            width: 25,
                            height: 25,
                            x: 585,
                            y: 90,
                            border: true,
                            image: 5481,
                            isDisabled: archipelago_settings.awards_received.indexOf("bestWaterRides") === -1,
                            isVisible: true,
                            tooltip: "Park must have at least 6 water rides which are currently open and have not crashed recently. #DeathLink"
                        },
                        {
                            type: 'label',
                            name: 'Best Water Rides Label',
                            x: 565,
                            y: 120,
                            width: 80,
                            height: 85,
                            text: "Best Water\nRides in the\nMultiverse",//Best Water Rides in the Multiverse
                            tooltip: "Park must have at least 6 water rides which are currently open and have not crashed recently. #DeathLink"
                        },
                        {
                            type: 'button',
                            name: 'Best Custom Designed Rides Award',
                            width: 25,
                            height: 25,
                            x: 45,
                            y: 180,
                            border: true,
                            image: 5482,
                            isDisabled: archipelago_settings.awards_received.indexOf("bestCustomDesignedRides") === -1,
                            isVisible: true,
                            tooltip: "Park must have at least 6 rides which are custom designed, and must have an excitement of more than 5.5"
                        },
                        {
                            type: 'label',
                            name: 'Best Custom Designed Rides Label',
                            x: 25,
                            y: 210,
                            width: 80,
                            height: 85,
                            text: "Best Custom\nDesigned\nRides in\nthe Multiverse",//Best Custom Designed Rides in the Multiverse
                            tooltip: "Park must have at least 6 rides which are custom designed, and must have an excitement of more than 5.5"
                        },
                        {
                            type: 'button',
                            name: 'Most Dazzling Colors Award',
                            width: 25,
                            height: 25,
                            x: 135,
                            y: 180,
                            border: true,
                            image: 5483,
                            isDisabled: archipelago_settings.awards_received.indexOf("mostDazzlingRideColours") === -1,
                            isVisible: true,
                            tooltip: "At least 5 rides and more than half of the rides are colourful. A ride is considered colourful if the main track color is bright purple, bright green, light orange or bright pink. Hover over the colors in the palette in the game to see the color names. Rides without a track are not counted!"
                        },
                        {
                            type: 'label',
                            name: 'Most Dazzling Colors Label',
                            x: 115,
                            y: 210,
                            width: 80,
                            height: 85,
                            text: "Most Dazzling\nColors in\nthe Multiverse",//Most Dazzling Colors in the Multiverse
                            tooltip: "At least 5 rides and more than half of the rides are colourful. A ride is considered colourful if the main track color is bright purple, bright green, light orange or bright pink. Hover over the colors in the palette in the game to see the color names. Rides without a track are not counted!"
                        },
                        {
                            type: 'button',
                            name: 'Best Gentle Rides Award',
                            width: 25,
                            height: 25,
                            x: 225,
                            y: 180,
                            border: true,
                            image: 5485,
                            isDisabled: archipelago_settings.awards_received.indexOf("bestGentleRides") === -1,
                            isVisible: true,
                            tooltip: "Park must have at least 10 gentle rides which are opened."
                        },
                        {
                            type: 'label',
                            name: 'Best Gentel Rides Label',
                            x: 205,
                            y: 210,
                            width: 80,
                            height: 35,
                            text: "Best Gentle\nRides in\nthe Multiverse",//Best Gentle Rides in the Multiverse
                            tooltip: "Park must have at least 10 gentle rides which are opened."
                        },
                        {
                            type: 'button',
                            name: 'Safest Park Award',
                            width: 25,
                            height: 25,
                            x: 315,
                            y: 180,
                            border: true,
                            image: 5475,
                            isDisabled: archipelago_settings.awards_received.indexOf("safest") === -1,
                            isVisible: true,
                            tooltip: "If a ride crashes with fatalities, the game will store a value of 8 in a variable(without fatalities it's 2). Every 2 in-game weeks, 1 is subtracted from this value, so after approximately 3.5 months, the value is back to 0. For the safest park award, the game checks all rides to see if this variable is 0 for every ride, and if no more than 2 peeps think \"The vandalism here is really bad\". If DeathLink is getting to you, you can disable it by typing\"!!toggleDeathlink\" in the chat tab."
                        },
                        {
                            type: 'label',
                            name: 'Safest Park Label',
                            x: 295,
                            y: 210,
                            width: 80,
                            height: 35,
                            text: "Hypothetical\nSafest Park\nin the\nMultiverse",//Hypothetical Safest Park in the Multiverse
                            tooltip: "If a ride crashes with fatalities, the game will store a value of 8 in a variable(without fatalities it's 2). Every 2 in-game weeks, 1 is subtracted from this value, so after approximately 3.5 months, the value is back to 0. For the safest park award, the game checks all rides to see if this variable is 0 for every ride, and if no more than 2 peeps think \"The vandalism here is really bad\". If DeathLink is getting to you, you can disable it by typing\"!!toggleDeathlink\" in the chat tab."
                        },
                        {
                            type: 'button',
                            name: 'Most Untidy Award',
                            width: 25,
                            height: 25,
                            x: 405,
                            y: 180,
                            border: true,
                            image: 5469,
                            isDisabled: archipelago_settings.awards_received.indexOf("mostUntidy") === -1,
                            isVisible: true,
                            tooltip: "More than 1/16th of the guests must be thinking that the park is untidy. This includes thoughts \"The litter here is really bad\", \"This path is disgusting\" or \"The vandalism here is really bad\"."
                        },
                        {
                            type: 'label',
                            name: 'Most Untidy Label',
                            x: 385,
                            y: 210,
                            width: 80,
                            height: 25,
                            text: "Most Untidy\nPark in\nthe Multiverse",//Most Untidy Park in the Multiverse
                            tooltip: "More than 1/16th of the guests must be thinking that the park is untidy. This includes thoughts \"The litter here is really bad\", \"This path is disgusting\" or \"The vandalism here is really bad\"."
                        },
                        {
                            type: 'button',
                            name: 'Worst Value Award',
                            width: 25,
                            height: 25,
                            x: 495,
                            y: 180,
                            border: true,
                            image: 5474,
                            isDisabled: archipelago_settings.awards_received.indexOf("worstValue") === -1,
                            isVisible: true,
                            tooltip: "Entrance fee is more than the current total \"ride value for money.\" Total ride value for money is calculated by taking the value for each ride and subtracting the entrance price of the ride from it. The value for a ride is calculated from its stats, and becomes lower as a ride ages. If you get this award, it means the entrance fee of your park is too high. Cannot be active together with best value park."
                        },
                        {
                            type: 'label',
                            name: 'Worst Value Label',
                            x: 475,
                            y: 210,
                            width: 80,
                            height: 25,
                            text: "Worst Value\nin the\nMultiverse",//Worst Value in the Multiverse
                            tooltip: "Entrance fee is more than the current total \"ride value for money.\" Total ride value for money is calculated by taking the value for each ride and subtracting the entrance price of the ride from it. The value for a ride is calculated from its stats, and becomes lower as a ride ages. If you get this award, it means the entrance fee of your park is too high. Cannot be active together with best value park."
                        },
                        {
                            type: 'button',
                            name: 'Worst Food Award',
                            width: 25,
                            height: 25,
                            x: 585,
                            y: 180,
                            border: true,
                            image: 5478,
                            isDisabled: archipelago_settings.awards_received.indexOf("worstFood") === -1,
                            isVisible: true,
                            tooltip: "No more than 2 unique food shops, less than one food shop per 256 guests and more than 15 hungry guests must be be thinking \"I'm hungry\"."
                        },
                        {
                            type: 'label',
                            name: 'Worst Food Label',
                            x: 565,
                            y: 210,
                            width: 80,
                            height: 25,
                            text: "Worst Food\nin the\nMultiverse",//Worst Food in the Multiverse
                            tooltip: "No more than 2 unique food shops, less than one food shop per 256 guests and more than 15 hungry guests must be be thinking \"I'm hungry\"."
                        },
                        {
                            type: 'button',
                            name: 'Total Disappointment',
                            width: 25,
                            height: 25,
                            x: 45,
                            y: 270,
                            border: true,
                            image: 5480,
                            isDisabled: archipelago_settings.awards_received.indexOf("mostDisappointing") === -1,
                            isVisible: true,
                            tooltip: "Park rating must be below 650 and at least half of rides must have popularity below 6 (on a scale from 0 to 255, so very low!)."
                        },
                        {
                            type: 'label',
                            name: 'Total Disappointment Label',
                            x: 25,
                            y: 300,
                            width: 85,
                            height: 25,
                            text: "Total\nDisappointment",//Total Disappointment
                            tooltip: "Park rating must be below 650 and at least half of rides must have popularity below 6 (on a scale from 0 to 255, so very low!)."
                        },
                        {
                            type: 'button',
                            name: 'Most Confusing Award',
                            width: 25,
                            height: 25,
                            x: 135,
                            y: 270,
                            border: true,
                            image: 5484,
                            isDisabled: archipelago_settings.awards_received.indexOf("mostConfusingLayout") === -1,
                            isVisible: true,
                            tooltip: "At least 10 peeps and more than 1/64th of guests are thinking \"I'm lost\" or \"I can't find <ride name>\"."
                        },
                        {
                            type: 'label',
                            name: 'Most Confusing Label',
                            x: 115,
                            y: 300,
                            width: 80,
                            height: 85,
                            text: "Most\nConfusing\nLayout in\nthe Multiverse",//Most Confusing Layout in the Multiverse
                            tooltip: "At least 10 peeps and more than 1/64th of guests are thinking \"I'm lost\" or \"I can't find <ride name>\"."
                        },
                        {
                            type: 'custom',
                            name: 'custom-archipealgo-logo-1',
                            x: 5,
                            y: wh - 24,
                            width: 22,
                            height: 20,
                            tooltip: 'Somebody should give me an award for making OpenRCT2 work with Archipelago! I have a vanity quota to fill after all.',
                            onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
                        }
                    ]
                )
            }
        ]
    });
    return window;
}

function archipelagoExcorcizeFurries(quiz?){
    if (ui.getWindow("archipelago-excorcize-furries"))
    return;
    var ww = 350;
    var wh = 225;
    let y = 0;
    let challenge = null;
    if(quiz)
        challenge = returnChallenge(quiz);
    else 
        challenge = returnChallenge();
    let buttons = [];
    for (let i = 0; i < challenge.buttons.length; i++){
        buttons.push({
            type: 'button',
            name: 'button-' + String(i),
            x: 35 + (i%3) * 90,
            y: 112 + (Math.floor(i/3) * 26),
            width: 90,
            height: 26,
            text: challenge.buttons[i].text,
            tooltip: challenge.buttons[i].tooltip,
            onClick: challenge.buttons[i].onClick
        })
    }
    var prompt = ui.openWindow({
        classification: 'archipelago-excorcize-furries',
        title: "Furry Removal Services",
        width: ww,
        height: wh,
        colours: challenge.colors,
        widgets: [].concat(
            NewLabel(challenge.label1, {
                name: 'label-1',
                y: y++,
                width: 2,
                tooltip: challenge.label1_tooltip
            }),
            NewLabel(challenge.label2, {
                name: 'label-2',
                y: y++,
                width: 2,
                tooltip: challenge.label2_tooltip
            }),
            buttons
        )
    });
    return;
}

function explodeFurries(){
    var staff_list = map.getAllEntities("staff").filter((staff: Staff) => staff.staffType === "entertainer");
    let effect = Math.floor(Math.random() * 8);
    // let effect = 6;
    try{
        ui.getWindow('archipelago-locations').close();
    }
    catch{
        console.log("Error in explodeFurries: No Window to close");
    }
    for (let i = 0; i < staff_list.length; i++){
        if(staff_list[i].staffType == "entertainer"){
            if (!staff_list[i].patrolArea.tiles.length){
                let id = staff_list[i].id;
                let x = staff_list[i].x;
                let y = staff_list[i].y;
                let z = staff_list[i].z;
                // context.executeAction("stafffire",{id: id});
                staff_list[i].remove();
                if (i < 250){//TODO: Remove this check on next major OpenRCT2 release
                    switch(effect){
                    case 0://What hilarious effect will banishment have?
                        map.createEntity("balloon",{x,y,z});
                        var balloons = map.getAllEntities("balloon");//Randomize the colors
                        for(let i = 0; i < balloons.length; i++){
                            balloons[i].colour = Math.floor(Math.random() * 40);
                        }
                        break;
                    case 1:
                        map.createEntity("crash_splash",{x,y,z});
                        break;
                    case 2:
                        map.createEntity("duck",{x,y,z});
                        break;
                    case 3: 
                        map.createEntity("explosion_cloud",{x,y,z});
                        break;
                    case 4:
                        map.createEntity("explosion_flare",{x,y,z});
                        break;
                    case 5:
                        let litter = map.createEntity("litter",{x,y,z}) as Litter;//,litterType:"burger_box"});//Math.floor(Math.random()*12)});
                        switch(Math.floor(Math.random() * 8)){
                            case 0:
                                litter.litterType = "vomit";
                                break;
                            case 1:
                                litter.litterType = "vomit_alt";
                                break;
                            case 2:
                                litter.litterType = "empty_can";
                                break;
                            case 3:
                                litter.litterType = "rubbish";
                                break;
                            case 4:
                                litter.litterType = "burger_box";
                                break;
                            case 5:
                                litter.litterType = "empty_cup";
                                break;
                            case 6:
                                litter.litterType = "empty_box";
                                break;
                            case 7:
                                litter.litterType = "empty_bottle";
                                break;
                            case 8:
                                litter.litterType = "empty_bowl_red";
                                break;
                            case 9:
                                litter.litterType = "empty_bowl_blue";
                                break;
                            case 10:
                                litter.litterType = "empty_drink_carton";
                                break;
                            case 11:
                                litter.litterType = "empty_juice_cup";
                                break;
                            default:
                                litter.litterType = "vomit_alt";
                                break;
                        }
                        break;
                    case 6:
                        map.createEntity("money_effect",{x,y,z})//,Value:Math.floor(Math.random()*100000)});
                        break;
                    case 7:
                        map.createEntity("steam_particle",{x,y,z});
                        break;
                    }
                }
            }
        }
    }
}

function explodeGuests(number){
    var guest_list = map.getAllEntities("guest");
    if (guest_list.length > number){
        for(var i = 0; i < number; i++){
            guest_list[i].setFlag("explode", true);// Credit to Gymnasiast/everything-must-die for the idea
        }
    }
    else{
        for(var i = 0; i < guest_list.length; i++){
            guest_list[i].setFlag("explode", true);// Credit to Gymnasiast/everything-must-die for the idea
        }
    }
}

function archipelagoDebug(){
    var ww = 600;
    var wh = 350;
    let y = 0;

    var window = ui.openWindow({
        classification: 'debug-window',
        title: "Debug Window. You should never see this!",
        width: ww,
        height: wh,
        widgets: [].concat(
            [
                {
                    type: 'button',
                    name: 'debug-button',
                    x: 5,
                    y: 50,
                    width: 200,
                    height: 25,
                    text: 'AddRide (Merry Go Round)',
                    onClick: function() {
                        // network.sendMessage("data.data.text");
                        // console.log(RideType["Merry Go Round"]);

                        // park.cash = 10000;
                        // var i = "Monorail";
                        //console.log(RideType["rollercoaster"]);
                        //console.log(RideType[i]);
                        // console.log(scenario.status);
                        //park.setFlag("scenarioCompleteNameInput",true);
                        //console.log(map.rides[0]);
                        //console.log(RideType["Looping Roller Coaster"].rideType);
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        // context.executeAction("landsetrights",{x1:1,y1:1,x2:2,y2:2,setting:4,ownership:7}, () => console.log("I'm so good at this."));
                        // console.log(park.research.inventedItems[0]);
                        BathroomTrap.AddRide(RideType["Merry Go Round"]);
                        // BathroomTrap.AddScenery();
                        // BathroomTrap.GrantDiscount("Land Discount");
                        // park.landPrice = 2000.50;
                        //ac_req({"cmd":"PrintJSON","data":[{"text":"1","type":"player_id"},{"text":" found their "},{"text":"69696969","player":1,"flags":1,"type":"item_id"},{"text":" ("},{"text":"69696969","player":1,"type":"location_id"},{"text":")"}],"type":"ItemSend","receiving":1,"item":{"item":69696969,"location":69696969,"player":1,"flags":1,"class":"NetworkItem"}})
                        // console.log(context.getParkStorage().get('RCTRando.nuttin'));
                        // (BathroomTrap as RCTRArchipelagoConnection).connect();
                        // init_archipelago_connection();

                    }
                },
                {
                    type: 'button',
                    name: 'debug-button2',
                    x: 5,
                    y: 80,
                    width: 200,
                    height: 25,
                    text: 'Receive DeathLink',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        ac_req({"cmd":"Bounced","tags":["DeathLink"],"data":{"time":1690148379.2967014,"source":"Colby","cause":"Colby is out of usable Pokémon! Colby blacked out!"}})
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button3',
                    x: 5,
                    y: 110,
                    width: 200,
                    height: 25,
                    text: 'Connected to Archipelago',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        ac_req({"cmd":"Connected","team":0,"slot":2,"players":[{"team":0,"slot":1,"alias":"Cool1","name":"Cool1","class":"NetworkPlayer"},{"team":0,"slot":2,"alias":"Test","name":"Test","class":"NetworkPlayer"}],"missing_locations":[81000,81001,81002,81003,81004,81005,81006,81007,81008,81009,81010,81011,81012,81013,81014,81015,81016,81017,81018,81019,81020,81021,81022,81023,81024],"checked_locations":[],"slot_info":{"1":{"name":"Cool1","game":"Clique","type":1,"group_members":[],"class":"NetworkSlot"},"2":{"name":"Test","game":"ChecksFinder","type":1,"group_members":[],"class":"NetworkSlot"}},"hint_points":0,"slot_data":{"world_seed":3098991349,"seed_name":"31784654339393198182","player_name":"Test","player_id":2,"client_version":7,"race":false}})
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button4',
                    x: 5,
                    y: 20,
                    width: 200,
                    height: 25,
                    text: 'Set Game State',
                    onClick: function() {
                        archipelago_settings.location_information = 'Full';
                        // archipelago_unlocked_locations = [{LocationID: 0,Item: "Sling Shot",ReceivingPlayer: "Dallin"}, {LocationID: 1,Item: "progressive automation",ReceivingPlayer: "Drew"}, {LocationID: 2,Item: "16 pork chops",ReceivingPlayer: "Minecraft d00ds"}];
                        // archipelago_locked_locations = [{LocationID: 3,Item: "Howling Wraiths",ReceivingPlayer: "Miranda"},{LocationID: 4,Item: "Hookshot",ReceivingPlayer: "Dallin"}, {LocationID: 5,Item: "progressive flamethrower",ReceivingPlayer: "Drew"}, {LocationID: 6,Item: "egg shard",ReceivingPlayer: "Minecraft d00ds"}, {LocationID: 7,Item: "Descending Dive",ReceivingPlayer: "Miranda"}];
                        archipelago_location_prices = [{LocationID: 0, Price: 500, Lives: 0, RidePrereq: [3, "First Aid Room", 6.3,0,0,0]}, {LocationID: 1, Price: 2500, Lives: 0, RidePrereq: []},{LocationID: 2, Price: 2500, Lives: 0, RidePrereq: []},{LocationID: 3, Price: 6000, Lives: 0, RidePrereq: []},{LocationID: 4, Price: 4000, Lives: 0, RidePrereq: [2, "gentle",0,0,0,0]},{LocationID: 5, Price: 4000, Lives: 0, RidePrereq: [3, "Looping Roller Coaster", 6.3,0,0,0]},{LocationID: 6, Price: 0, Lives: 200, RidePrereq: []},{LocationID: 7, Price: 10000, Lives: 0, RidePrereq: [1, "Wooden Roller Coaster", 0, 5.0, 7.0, 1000]}];
                        archipelago_objectives = {Guests: [300, false], ParkValue: [0, false], RollerCoasters: [5,2,2,2,0,false], RideIncome: [0, false], ShopIncome: [8000, false], ParkRating: [700, false], LoanPaidOff: [true, false], Monopoly: [true, false], UniqueRides: [[], true]};
                        context.getParkStorage().set('RCTRando.ArchipelagoLocationPrices', archipelago_location_prices);
                        context.getParkStorage().set('RCTRando.ArchipelagoObjectives', archipelago_objectives);
                        ArchipelagoSaveLocations(archipelago_locked_locations, archipelago_unlocked_locations);
                        }
                },
                {
                    type: 'button',
                    name: 'debug-button5',
                    x: 5,
                    y: 140,
                    width: 200,
                    height: 25,
                    text: 'Archipelago Player Completed Goal',
                    onClick: function() {

                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        ac_req({"cmd":"PrintJSON","data":[{"text":"Cool1 (Team #1) has completed their goal."}],"type":"Goal","team":0,"slot":1})
                        console.log(context.getParkStorage().get("RCTRando.ArchipelagoPlayers"))

                    }
                },
                {
                    type: 'button',
                    name: 'debug-button6',
                    x: 5,
                    y: 170,
                    width: 200,
                    height: 25,
                    text: 'Release Rule',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        BathroomTrap.ReleaseRule("Allow Tree Removal");
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button7',
                    x: 5,
                    y: 200,
                    width: 200,
                    height: 25,
                    text: '"Grant Discount(Land)"',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        BathroomTrap.GrantDiscount("Land Discount");
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button8',
                    x: 5,
                    y: 230,
                    width: 200,
                    height: 25,
                    text: '"Grant Discount(Construction Rights)"',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        BathroomTrap.GrantDiscount("Construction Rights Discount");
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button9',
                    x: 5,
                    y: 260,
                    width: 200,
                    height: 25,
                    text: '"Display all cars"',
                    onClick: function() {
                        console.log(map.getAllEntities("car"));
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button10',
                    x: 5,
                    y: 290,
                    width: 200,
                    height: 25,
                    text: 'Colbys Decision',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        // (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_menu_location_image_ID.start).id, 0,0)}
                        BathroomTrap.RotateTrap()
                        console.log(((map.rides)));
                        archipelago_objectives.UniqueRides[0] = ["Classic Wooden Twister Roller Coaster","Classic Wooden Roller Coaster","Classic Stand-up Roller Coaster","Classic Wooden Roller Coaster","Classic Wooden Roller Coaster","Classic Wooden Roller Coaster","Classic Wooden Roller Coaster","Classic Wooden Roller Coaster","Classic Wooden Roller Coaster","Classic Wooden Roller Coaster","Classic Wooden Roller Coaster","Classic Wooden Roller Coaster","Classic Wooden Roller Coaster","Classic Wooden Roller Coaster","Classic Wooden Roller Coaster","Classic Wooden Roller Coaster","Classic Wooden Roller Coaster","Classic Wooden Roller Coaster","Classic Wooden Roller Coaster","Classic Wooden Roller Coaster",]
                    //     var get_rotated_idiot = ui.openWindow({
                    //         classification: 'get-rotated-idiot',
                    //         title: "Get Rotated",
                    //         width: 330,
                    //         height: 330,
                    //         colours: [0,0],
                    //         widgets: [].concat(
                    //             {
                    //                 type: 'custom',
                    //                 name: 'get-rotated-idiot',
                    //                 x: 10,
                    //                 y: 30,
                    //                 width: 300,
                    //                 height: 300,
                    //                 tooltip: 'Just kidding, I love you, very platonically.',
                    //                 onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_get_rotated_idiot_top_image_ID.start).id, 0,0)}
                    //             },
                    //             {
                    //                 type: 'custom',
                    //                 name: 'get-rotated-idiot',
                    //                 x: 10,
                    //                 y: 165,
                    //                 width: 300,
                    //                 height: 300,
                    //                 tooltip: 'Just kidding, I love you, very platonically.',
                    //                 onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_get_rotated_idiot_bottom_image_ID.start).id, 0,0)}
                    //             },
                    //             {
                    //                 type: 'custom',
                    //                 name: 'custom-archipealgo-logo-1',
                    //                 x: 5,
                    //                 y: 300,
                    //                 width: 22,
                    //                 height: 20,
                    //                 tooltip: 'I\'ve wasted so much time committing to stupid bits like this.',
                    //                 onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
                    //             }
                    //         )
                    //     })
                    //     return get_rotated_idiot;
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button11',
                    x: 5,
                    y: 320,
                    width: 200,
                    height: 25,
                    text: 'Display All Rides',
                    onClick: function() {
                        for(let i=0; i<map.numRides; i++){
                            console.log(map.rides[i]);
                        }
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button12',
                    x: 210,
                    y: 20,
                    width: 200,
                    height: 25,
                    text: 'Free Space',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Dustin found Colbys Spam Mail Trap!");
                        BathroomTrap.SpamTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button13',
                    x: 210,
                    y: 50,
                    width: 200,
                    height: 25,
                    text: 'Free Space',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Ty found Colby's Bathroom Trap!");
                        BathroomTrap.BathroomTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button14',
                    x: 210,
                    y: 80,
                    width: 200,
                    height: 25,
                    text: 'Set Monopoly Mode',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        BathroomTrap.SetPurchasableTiles();
                        archipelago_settings.monopoly_x = 1;
                        archipelago_settings.monopoly_y = 1;
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button15',
                    x: 210,
                    y: 110,
                    width: 200,
                    height: 25,
                    text: 'Set Obscene Cash',
                    onClick: function() {
                        park.cash = 100000000;
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button16',
                    x: 210,
                    y: 140,
                    width: 200,
                    height: 25,
                    text: 'AC_Connect',
                    onClick: function() {
                        init_archipelago_connection();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button17',
                    x: 210,
                    y: 170,
                    width: 200,
                    height: 25,
                    text: 'Display Unlock Shop',
                    onClick: function() {
                        console.log("Unlock shop:\n" + JSON.stringify(archipelago_location_prices));
                        console.log("Awards:\n" + archipelago_award_locations);
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button18',
                    x: 210,
                    y: 200,
                    width: 200,
                    height: 25,
                    text: 'AddCash($10,000)',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        BathroomTrap.AddCash("$10,000");
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button19',
                    x: 210,
                    y: 230,
                    width: 200,
                    height: 25,
                    text: 'AddGuests(250)',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        BathroomTrap.AddGuests("250 Guests");
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button20',
                    x: 210,
                    y: 260,
                    width: 200,
                    height: 25,
                    text: 'Set Weather (Blizzard)',
                    onClick: function() {
                        // let researchItems = park.research.inventedItems.concat(park.research.uninventedItems);
                        // console.log(researchItems.length);
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        BathroomTrap.setWeather("Blizzard");
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button21',
                    x: 210,
                    y: 290,
                    width: 200,
                    height: 25,
                    text: 'Cmd: "Sync"',
                    onClick: function() {
                        archipelago_send_message("Sync");
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button22',
                    x: 210,
                    y: 320,
                    width: 200,
                    height: 25,
                    text: 'UI Tests',
                    onClick: function() {
                        // console.log(archipelago_settings.received_items);
                        // archipelago_print_message
                        var window = ui.openWindow({
                            classification: 'rain-check',
                            title: "Official Archipelago UI Debug",
                            width: 400,
                            height: 300,
                            colours: [7,7],
                            widgets: [].concat(
                                [
                                    {
                                        type: 'label',
                                        name: 'Debug-Label',
                                        x: 0,
                                        y: 50,
                                        width: 400,
                                        height: 26,
                                        text: 'Colby {RED} is {WHITE} very {PURPLE} cool{WHITE} indeed!',//{INLINE_SPRITE}{164}{20}{0}{0}',
                                        tooltip: "Y'all's sure do {MAGENTA}talk a lot, don't you?"
                                    },
                                    {
                                        type: 'custom',
                                        name: 'custom-archipealgo-logo',
                                        x: 0,
                                        y: 75,
                                        width: 100,
                                        height: 108,
                                        onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
                                    }
                                ]
                            )
                        });
                        return window;
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button23',
                    x: 415,
                    y: 170,
                    width: 200,
                    height: 25,
                    text: 'Get List for Archipelago',
                    onClick: function() {
                        let researchItems = park.research.inventedItems.concat(park.research.uninventedItems);
                        var items: any = [];
                        for(let i = 0; i < researchItems.length; i++){
                            if(researchItems[i].category == "scenery")
                            items.push(objectManager.getObject("scenery_group", (researchItems[i] as SceneryResearchItem).object).name);
                            else{
                                if((RideType[(researchItems[i] as RideResearchItem).rideType]) == "Food Stall"){
                                    items.push(objectManager.getObject("ride", (researchItems[i] as RideResearchItem).object).name)
                                }
                                else if((RideType[(researchItems[i] as RideResearchItem).rideType]) == "Drink Stall"){
                                    items.push(objectManager.getObject("ride", (researchItems[i] as RideResearchItem).object).name)
                                }
                                else if((RideType[(researchItems[i] as RideResearchItem).rideType]) == "Shop"){
                                    items.push(objectManager.getObject("ride", (researchItems[i] as RideResearchItem).object).name)
                                }
                                else
                                items.push(RideType[(researchItems[i] as RideResearchItem).rideType]);
                            }
                        }
                        console.log("\n\n");
                        console.log(scenario.name);
                        console.log(JSON.stringify(items));
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button24',
                    x: 415,
                    y: 320,
                    width: 200,
                    height: 25,
                    text: 'Colbys Choice',
                    onClick: function() { 
                        // var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        // BathroomTrap.ExtremeChaosTrap();
                        console.log(archipelago_settings.traplink)
                        archipelago_settings.traplink = !archipelago_settings.traplink;
                        const images: ImageData[] = [
                            { width: 16, height: 16, data: pngToBase64.archipelago_icon },
                        ];
                        // allocate memory slots for each image
                        const range = ui.imageManager.allocate(images.length);
                    
                        // populate the memory slots with the images
                        if (range) {
                            images.forEach((image, index) => {
                                ui.imageManager.setPixelData(range.start + index, {
                                    type: "png",
                                    palette: "keep",
                                    data: image.data,
                                });
                                imageMap[index] = range.start + index;
                            });
                        // console.log(JSON.stringify(context.getParkStorage().get('RCTRando.ArchipelagoLockedLocations')));
                        // console.log(convert_shop_name_to_ID("Burger Bar"))
                        }      
                                      
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button25',
                    x: 415,
                    y: 20,
                    width: 200,
                    height: 25,
                    text: 'Add Skip',
                    onClick: function() {
                        archipelago_settings.skips++;
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button26',
                    x: 415,
                    y: 50,
                    width: 200,
                    height: 25,
                    text: 'Try Furry Quiz',
                    onClick: function() {
                        ui.showTextInput({title:"Yeaaaaaah, WHADDA WANT?",description:"Fine, give me a quiz number.", callback(value: string){
                            const quizNumber = parseInt(value, 10);
                            archipelagoExcorcizeFurries(quizNumber);
                        }});
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button27',
                    x: 415,
                    y: 80,
                    width: 200,
                    height: 25,
                    text: 'Traps!',
                    onClick: function() {
                        archipelagoDebugTraps();
                        }
                },
                {
                    type: 'button',
                    name: 'debug-button28',
                    x: 415,
                    y: 110,
                    width: 200,
                    height: 25,
                    text: 'Specific Ad',
                    onClick: function() {
                        ui.showTextInput({title:"Yeaaaaaah, WHADDA WANT?",description:"Fine, give me an ad number.", callback(value: string){
                            const adNumber = parseInt(value, 10);
                            showAd(adPool[adNumber]);
                        }});
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button30',
                    x: 415,
                    y: 140,
                    width: 200,
                    height: 25,
                    text: 'Free Space',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("AuGold found Colby's Food Poisoning Trap!");
                        BathroomTrap.FoodPoisoningTrap();
                        // let rides = map.rides;
                        // for(let i = 0; i < rides.length; i++){
                        //     console.log((rides[i]))
                        // }
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button31',
                    x: 415,
                    y: 200,
                    width: 200,
                    height: 25,
                    text: 'Free Space',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Traplink: Knux Received Chaos Control Trap!");
                        BathroomTrap.PauseTrap();
                        // let rides = map.rides;
                        // for(let i = 0; i < rides.length; i++){
                        //     console.log((rides[i]))
                        // }
                    }
                }
           ]
        )
    });
    return window;
}

function archipelagoDebugTraps(){
    var ww = 600;
    var wh = 350;
    let y = 0;

    var window = ui.openWindow({
        classification: 'debug-traps-window',
        title: "Trap Window. You should never see this!",
        width: ww,
        height: wh,
        widgets: [].concat(
            [
                {
                    type: 'button',
                    name: 'debug-button1',
                    x: 5,
                    y: 20,
                    width: 200,
                    height: 25,
                    text: 'Furry Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Curtis found Colbys Furry Convention Trap!");
                        BathroomTrap.FurryConventionTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button2',
                    x: 5,
                    y: 50,
                    width: 200,
                    height: 25,
                    text: 'Spam Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Dustin found Colbys Spam Mail Trap!");
                        BathroomTrap.SpamTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button3',
                    x: 5,
                    y: 80,
                    width: 200,
                    height: 25,
                    text: 'Bathroom Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Ty found Colby's Bathroom Trap!");
                        BathroomTrap.BathroomTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button4',
                    x: 5,
                    y: 110,
                    width: 200,
                    height: 25,
                    text: 'Loan Shark Trap',
                    
                },
                {
                    type: 'button',
                    name: 'debug-button5',
                    x: 5,
                    y: 140,
                    width: 200,
                    height: 25,
                    text: 'Poison Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("AuGold found Colby's Food Poisoning Trap!");
                        BathroomTrap.FoodPoisoningTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button12',
                    x: 210,
                    y: 20,
                    width: 200,
                    height: 25,
                    text: 'Pause Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Traplink: Knux Received Chaos Control Trap!");
                        BathroomTrap.PauseTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button13',
                    x: 210,
                    y: 50,
                    width: 200,
                    height: 25,
                    text: 'Aaa Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Traplink: Knux Received Chaos Control Trap!");
                        BathroomTrap.AaaTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button14',
                    x: 210,
                    y: 80,
                    width: 200,
                    height: 25,
                    text: 'Bald Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Traplink: Knux Received Chaos Control Trap!");
                        BathroomTrap.BaldTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button15',
                    x: 210,
                    y: 110,
                    width: 200,
                    height: 25,
                    text: 'Breakdown Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Traplink: Knux Received Chaos Control Trap!");
                        BathroomTrap.BreakdownTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button16',
                    x: 210,
                    y: 140,
                    width: 200,
                    height: 25,
                    text: 'Chaos Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Traplink: Knux Received Chaos Control Trap!");
                        BathroomTrap.ChaosTrap()
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button17',
                    x: 210,
                    y: 170,
                    width: 200,
                    height: 25,
                    text: 'Close Ride Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Traplink: Knux Received Chaos Control Trap!");
                        BathroomTrap.CloseRideTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button18',
                    x: 210,
                    y: 200,
                    width: 200,
                    height: 25,
                    text: 'Extreme Chaos Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Traplink: Knux Received Chaos Control Trap!");
                        BathroomTrap.ExtremeChaosTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button19',
                    x: 210,
                    y: 200,
                    width: 200,
                    height: 25,
                    text: 'Fast Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Traplink: Knux Received Chaos Control Trap!");
                        BathroomTrap.FastTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button19',
                    x: 210,
                    y: 230,
                    width: 200,
                    height: 25,
                    text: 'Frost Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Traplink: Knux Received Chaos Control Trap!");
                        BathroomTrap.FrostTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button20',
                    x: 210,
                    y: 260,
                    width: 200,
                    height: 25,
                    text: 'Hey Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Traplink: Knux Received Chaos Control Trap!");
                        BathroomTrap.HeyTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button21',
                    x: 210,
                    y: 290,
                    width: 200,
                    height: 25,
                    text: 'Pause Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        archipelago_print_message("Traplink: Knux Received Chaos Control Trap!");
                        BathroomTrap.PauseTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button22',
                    x: 210,
                    y: 320,
                    width: 200,
                    height: 25,
                    text: 'Rotate Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        BathroomTrap.RotateTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button23',
                    x: 415,
                    y: 20,
                    width: 200,
                    height: 25,
                    text: 'Scroll Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        BathroomTrap.ScrollTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button24',
                    x: 415,
                    y: 50,
                    width: 200,
                    height: 25,
                    text: 'Security Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        BathroomTrap.SecurityTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button25',
                    x: 415,
                    y: 80,
                    width: 200,
                    height: 25,
                    text: 'Spawn Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        BathroomTrap.SpawnTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button26',
                    x: 415,
                    y: 110,
                    width: 200,
                    height: 25,
                    text: 'Tutorial Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        BathroomTrap.TutorialTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button27',
                    x: 415,
                    y: 140,
                    width: 200,
                    height: 25,
                    text: 'Zoom In Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        BathroomTrap.ZoomInTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button28',
                    x: 415,
                    y: 170,
                    width: 200,
                    height: 25,
                    text: 'Zoom Out Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        BathroomTrap.ZoomOutTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button29',
                    x: 415,
                    y: 200,
                    width: 200,
                    height: 25,
                    text: 'Zoom Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        BathroomTrap.ZoomTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button30',
                    x: 415,
                    y: 200,
                    width: 200,
                    height: 25,
                    text: 'Voucher Trap',
                    onClick: function() {
                        var BathroomTrap = GetModule("RCTRArchipelago") as RCTRArchipelago;
                        BathroomTrap.VoucherTrap();
                    }
                },
                {
                    type: 'button',
                    name: 'debug-button31',
                    x: 415,
                    y: 290,
                    width: 200,
                    height: 25,
                    text: 'Try Furry Quiz',
                    onClick: function() {
                        ui.showTextInput({title:"Yeaaaaaah, WHADDA WANT?",description:"Fine, give me a quiz number.", callback(value: string){
                            const quizNumber = parseInt(value, 10);
                            archipelagoExcorcizeFurries(quizNumber);
                        }});
                    }
                },
                
                {
                    type: 'button',
                    name: 'debug-button32',
                    x: 415,
                    y: 320,
                    width: 200,
                    height: 25,
                    text: 'Specific Ad',
                    onClick: function() {
                        ui.showTextInput({title:"Yeaaaaaah, WHADDA WANT?",description:"Fine, give me an ad number.", callback(value: string){
                            const adNumber = parseInt(value, 10);
                            showAd(adPool[adNumber]);
                        }});
                    }
                }
           ]
        )
    });
    return window;
}

var tutorial_0 = function() {
    var ww = 350;
    var wh = 225;
    let y = 0;
    var tutorial_0 = ui.openWindow({
        classification: 'tutorial-1',
        title: "How to play!",
        width: ww,
        height: wh,
        widgets: [].concat(
            NewLabel("Welcome to Archipelago! You may be thinking \"Gee, how do you even play Roller Coaster Tycoon on Archipelago?\" or \"What IS Archipelago?", {
                name: 'Line-1',
                y: 0,
                width: 2,
                tooltip: "You may also be thinking \"Gee, I bet the developer of this mod is really cool, good looking and humble!\", but that's neither here nor there."
            }),
            NewLabel("Archipelago is a multi-game, multi-world randomizer! Have you ever wanted to play Minecraft, Ocarina of Time, and OpenRCT2 cooperatively at the same time, with everything interlinked? Now you can!", {
                name: 'Line-2',
                y: 1.5,
                width: 2,
                tooltip: "If you said no, you're probably a liar."
            }),
            NewLabel("First off, make sure your game is connected and you have Archipelago running. You can find those instructions at archipelago.gg", {
                name: 'Line-3',
                y: 3,
                width: 2,
                tooltip: "Fun fact: gg is the country code top-level domain for the Bailiwick of Guernsey. Fun fact 2: I have no idea where the p*ck the Balilwick of Guernsey is."
            }),
            [{
                type: 'button',
                name: 'cancel-button',
                x: ww - 160 - 88 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Cancel',
                tooltip: 'Changed your mind? Fine, I didn\'t want you to read this anyways!',
                onClick: function() {
                    tutorial_0.close();
                }
            },
            {
                type: 'button',
                name: 'next-button',
                x: ww - 160 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Next Page',
                tooltip: '"Pro tip: Hover your mouse over any of the window elements in this plugin to get insightful and useful commentary!"',
                isDisabled: false,
                onClick: function() {
                    tutorial_0.close();
                    tutorial_1();
                }
            },
            {
                type: 'custom',
                name: 'custom-archipealgo-logo-1',
                x: 5,
                y: wh - 24,
                width: 22,
                height: 20,
                tooltip: 'Be sure to play with Deathlink! It\s a fun option that doesn\'t cause any stress at all!',
                onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
            }
            ]
        )
    })
    return tutorial_0;
}

var tutorial_1 = function() {
    var ww = 350;
    var wh = 225;
    let y = 0;
    var tutorial_1 = ui.openWindow({
        classification: 'tutorial-1',
        title: "How to play!",
        width: ww,
        height: wh + 80,
        widgets: [].concat(
            NewLabel("Once your game is connected, hit the \"Start Game!\" button to begin!", {
                name: 'Line-1',
                y: 0,
                width: 2,
                tooltip: "In online games, usually people run a countdown before everyone begins. You'll probably want to look at the client for that, since messages are weird while the game is paused."
            }),
            NewLabel("The primary method of progress in your game will be purchasing items in the shop. You can find the shop under the map icon labeled \"Archipelago Checks!\". You can also strike the \"Home\" key to open it.", {
                name: 'Line-2',
                y: 1.5,
                width: 2,
                tooltip: "If the shop is empty, past Colby p*cked up the code. See the troubleshooting guide online. Just kidding! There isn't one."
            }),
            {
                type: 'custom',
                name: 'menu-location',
                x: ww / 3,
                y: wh - 120,
                width: 131,
                height: 160,
                tooltip: 'Importing images to an OpenRCT2 plugin is a pain. I hope you\'re thankful!',
                onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_menu_location_image_ID.start).id, 0,0)}
            },
            [{
                type: 'button',
                name: 'back-button',
                x: ww - 160 - 88 - 6,
                y: wh - 6 - 26 - 29 + 90,
                width: 85,
                height: 26,
                text: 'Back',
                tooltip: 'The previous page was pretty good, wasn\'t it?',
                onClick: function() {
                    tutorial_1.close();
                    tutorial_0();
                }
            },
            {
                type: 'button',
                name: 'next-button',
                x: ww - 160 - 6,
                y: wh - 6 - 26 - 29 + 90,
                width: 85,
                height: 26,
                text: 'Next Page',
                tooltip: '"Pro tip: Hover your mouse over any of the window elements in this plugin to get insightful and useful commentary!"',
                isDisabled: false,
                onClick: function() {
                    tutorial_1.close();
                    tutorial_2();
                }
            },
            {
                type: 'custom',
                name: 'custom-archipealgo-logo-1',
                x: 5,
                y: wh - 24 + 80,
                width: 22,
                height: 20,
                tooltip: 'Be sure to play with Deathlink! It\s a fun option that doesn\'t cause any stress at all!',
                onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
            }
            ]
        )
    })
    return tutorial_1;
}

var tutorial_2 = function() {
    var ww = 350;
    var wh = 225;
    let y = 0;
    var tutorial_2 = ui.openWindow({
        classification: 'tutorial-2',
        title: "How to play!",
        width: ww,
        height: wh,
        widgets: [].concat(
            NewLabel("The first tab you’ll see upon opening the shop is well, the shop. Here you can buy items for other games! Depending on your settings, you’ll see who it goes to and what it is.", {
                name: 'Line-1',
                y: 0,
                width: 2,
                tooltip: "$$$$$$$$$$$$$$$$$$$$$$$$$$$"
            }),
            NewLabel("The shop is organized into colored branches. When somebody asks you for their {LIGHTPINK}Pink_4{WHITE}, you’ll know it’s the fourth item on the {LIGHTPINK}Pink{WHITE} branch!", {
                name: 'Line-2',
                y: 1.5,
                width: 2,
                tooltip: "That's right, {WHITE}I {BLACK}CAN {GREEN}COLOR {RED}THE {BABYBLUE}TEXT!"
            }),
            NewLabel("Some items have prerequisites aside cash that need to be met before you can buy them. If it requires any sort of stat (excitement, length, total guests, etc.), they must be posted in the test data tab of the ride before they’ll be counted. Each ride must meet all the listed stats.", {
                name: 'Line-3',
                y: 3,
                width: 2,
                tooltip: "Nobody told me that balancing the checks would be such a hard task. I guess I gotta keep playing the game to make sure it feels right. Oh no, what a nightmare."
            }),
            [{
                type: 'button',
                name: 'back-button',
                x: ww - 160 - 88 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Back',
                tooltip: 'The previous page was pretty good, wasn\'t it?',
                onClick: function() {
                    tutorial_2.close();
                    tutorial_1();
                }
            },
            {
                type: 'button',
                name: 'next-button',
                x: ww - 160 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Next Page',
                tooltip: '"Pro tip: Hover your mouse over any of the window elements in this plugin to get insightful and useful commentary!"',
                isDisabled: false,
                onClick: function() {
                    tutorial_2.close();
                    tutorial_3();
                }
            },
            {
                type: 'custom',
                name: 'custom-archipealgo-logo-1',
                x: 5,
                y: wh - 24,
                width: 22,
                height: 20,
                tooltip: 'Be sure to play with Deathlink! It\s a fun option that doesn\'t cause any stress at all!',
                onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
            }
            ]
        )
    })
    return tutorial_2;
}

var tutorial_3 = function() {
    var ww = 350;
    var wh = 225;
    let y = 0;
    var tutorial_3 = ui.openWindow({
        classification: 'tutorial-2',
        title: "How to play!",
        width: ww,
        height: wh,
        widgets: [].concat(
            NewLabel("The second tab is your purchase history. Use it when your friends say you aren’t pulling your weight.", {
                name: 'Line-1',
                y: 0,
                width: 2,
                tooltip: "I'll be honest, I put that in because its easy to track and looks more important than it actually is."
            }),
            NewLabel("Tab 3 is the goals tab! In this tab you’ll see what requirements you must fulfill to complete your game in Archipelago. These will have been set in your options file when you generate the game.", {
                name: 'Line-2',
                y: 1.5,
                width: 2,
                tooltip: "They should add modular goals as a regular option in the base game!"
            }),
            NewLabel("The required rides list has 3 colors: {RED}Red means you haven’t yet unlocked the ride. Keep playing and somebody will find it! {YELLOW}Yellow means the ride is unlocked, but not yet built. {GREEN}Green means the ride is built and ready to go!", {
                name: 'Line-3',
                y: 3,
                width: 2,
                tooltip: "The goals tab is updated at the start of each day, by the way. Not that that really matters, given that days last about 8 seconds in this weird universe."
            }),
            [{
                type: 'button',
                name: 'back-button',
                x: ww - 160 - 88 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Back',
                tooltip: 'The previous page was pretty good, wasn\'t it?',
                onClick: function() {
                    tutorial_3.close();
                    tutorial_2();
                }
            },
            {
                type: 'button',
                name: 'next-button',
                x: ww - 160 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Next Page',
                tooltip: '"Pro tip: Hover your mouse over any of the window elements in this plugin to get insightful and useful commentary!"',
                isDisabled: false,
                onClick: function() {
                    tutorial_3.close();
                    tutorial_4();
                }
            },
            {
                type: 'custom',
                name: 'custom-archipealgo-logo-1',
                x: 5,
                y: wh - 24,
                width: 22,
                height: 20,
                tooltip: 'Be sure to play with Deathlink! It\s a fun option that doesn\'t cause any stress at all!',
                onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
            }
            ]
        )
    })
    return tutorial_3;
}

var tutorial_4 = function() {
    var ww = 350;
    var wh = 225;
    let y = 0;
    var tutorial_4 = ui.openWindow({
        classification: 'tutorial-2',
        title: "How to play!",
        width: ww,
        height: wh,
        widgets: [].concat(
            NewLabel("The fourth tab is the chat tab. Here you can communicate with other players in the multworld! It also logs messages and unlocks from other players and the server.", {
                name: 'Line-1',
                y: 0,
                width: 2,
                tooltip: "Someday I'll also have the in-game multiplayer chat work as well, but that would first require getting in-game multiplayer to work, which is a shockingly difficult task."
            }),
            NewLabel("You can use the text input to run a select number of commands for the local world. These include some player-debugging tools, Archipelago settings, and so forth. To see the list, type in !!help", {
                name: 'Line-2',
                y: 1.5,
                width: 2,
                tooltip: "!!addSkip if you're a filthy cheater."
            }),
            NewLabel("", {
                name: 'Line-3',
                y: 3,
                width: 2,
                tooltip: ""
            }),
            [{
                type: 'button',
                name: 'back-button',
                x: ww - 160 - 88 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Back',
                tooltip: 'The previous page was pretty good, wasn\'t it?',
                onClick: function() {
                    tutorial_4.close();
                    tutorial_3();
                }
            },
            {
                type: 'button',
                name: 'next-button',
                x: ww - 160 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Next Page',
                tooltip: '"Pro tip: Hover your mouse over any of the window elements in this plugin to get insightful and useful commentary!"',
                isDisabled: false,
                onClick: function() {
                    tutorial_4.close();
                    tutorial_5();
                }
            },
            {
                type: 'custom',
                name: 'custom-archipealgo-logo-1',
                x: 5,
                y: wh - 24,
                width: 22,
                height: 20,
                tooltip: 'Be sure to play with Deathlink! It\s a fun option that doesn\'t cause any stress at all!',
                onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
            }
            ]
        )
    })
    return tutorial_4;
}

var tutorial_5 = function() {
    var ww = 350;
    var wh = 225;
    let y = 0;
    var tutorial_5 = ui.openWindow({
        classification: 'tutorial-2',
        title: "How to play!",
        width: ww,
        height: wh,
        widgets: [].concat(
            NewLabel("The fifth tab is the hint tab. It tracks any hints received in the multiworld, most importantly, yours! This will be auto-populated if the visibility setting in the shop is “Visible”.", {
                name: 'Line-1',
                y: 0,
                width: 2,
                tooltip: "And it's worked every time without ever giving us a glitch! *Cries in developer"
            }),
            NewLabel("You can additionally filter by a particular player in this tab. To hint an item, you can use the native Archipelago command !hint {Item Name}", {
                name: 'Line-2',
                y: 1.5,
                width: 2,
                tooltip: "You can spam the chat by using !countdown"
            }),
            NewLabel("Here’s a few helpful items: “Allow High Construction”, “Allow Tree Removal”, “Allow Landscape Changes”", {
                name: 'Line-3',
                y: 3,
                width: 2,
                tooltip: "\"$5,000\" if you're feeling greedy."
            }),
            [{
                type: 'button',
                name: 'back-button',
                x: ww - 160 - 88 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Back',
                tooltip: 'The previous page was pretty good, wasn\'t it?',
                onClick: function() {
                    tutorial_5.close();
                    tutorial_4();
                }
            },
            {
                type: 'button',
                name: 'next-button',
                x: ww - 160 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Next Page',
                tooltip: '"Pro tip: Hover your mouse over any of the window elements in this plugin to get insightful and useful commentary!"',
                isDisabled: false,
                onClick: function() {
                    tutorial_5.close();
                    tutorial_6();
                }
            },
            {
                type: 'custom',
                name: 'custom-archipealgo-logo-1',
                x: 5,
                y: wh - 24,
                width: 22,
                height: 20,
                tooltip: 'Be sure to play with Deathlink! It\s a fun option that doesn\'t cause any stress at all!',
                onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
            }
            ]
        )
    })
    return tutorial_5;
}

var tutorial_6 = function() {
    var ww = 350;
    var wh = 225;
    let y = 0;
    var tutorial_6 = ui.openWindow({
        classification: 'tutorial-2',
        title: "How to play!",
        width: ww,
        height: wh,
        widgets: [].concat(
            NewLabel("The sixth tab is EnergyLink Bank ATM Machine. This ATM Machine lets you send money to the multiworld for any game that supports EnergyLink.", {
                name: 'Line-1',
                y: 0,
                width: 2,
                tooltip: "Yes, I do realize \"ATM Machine\" is redundant. Yes, I do know it's annoying you. No, I will not fix it. It's funnier this way."
            }),
            NewLabel("These games include (But are not limited to) Pokémon Red/Blue, Factorio (The EnergyLink OG), Stardew Valley, and the OG MegaMan games.", {
                name: 'Line-2',
                y: 1.5,
                width: 2,
                tooltip: "Did you know, Red's dad left the family to become a Roller Coaster Tycoon?"
            }),
            NewLabel("The ATM Machine charges a 10% fee each way for depositing and withdrawing any funds in EnergyLink. Additionally, you must have at least "+ context.formatString("{CURRENCY2DP}", 100000) + " remaining at the end of any deposit as collateral.", {
                name: 'Line-3',
                y: 3,
                width: 2,
                tooltip: "You wouldn't believe how expensive the infrastructure to send money across the multiworld is!"
            }),
            [{
                type: 'button',
                name: 'back-button',
                x: ww - 160 - 88 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Back',
                tooltip: 'The previous page was pretty good, wasn\'t it?',
                onClick: function() {
                    tutorial_6.close();
                    tutorial_5();
                }
            },
            {
                type: 'button',
                name: 'next-button',
                x: ww - 160 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Next Page',
                tooltip: '"Pro tip: Hover your mouse over any of the window elements in this plugin to get insightful and useful commentary!"',
                isDisabled: false,
                onClick: function() {
                    tutorial_6.close();
                    tutorial_6point5();
                }
            },
            {
                type: 'custom',
                name: 'custom-archipealgo-logo-1',
                x: 5,
                y: wh - 24,
                width: 22,
                height: 20,
                tooltip: 'Be sure to play with Deathlink! It\s a fun option that doesn\'t cause any stress at all!',
                onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
            }
            ]
        )
    })
    return tutorial_6;
}

var tutorial_6point5 = function() {//I didn't want to change every other function when I had to add this new one.
    var ww = 350;
    var wh = 225;
    let y = 0;
    var tutorial_6point5 = ui.openWindow({
        classification: 'tutorial-2',
        title: "How to play!",
        width: ww,
        height: wh,
        widgets: [].concat(
            NewLabel("The seventh and final tab is the awards tab! Here, you can see what awards you've unlocked in your run (if enabled in the YAML).", {
                name: 'Line-1',
                y: 0,
                width: 2,
                tooltip: "I'll be honest. I kept mixing up 'award' and 'reward' in the code."
            }),
            NewLabel("Hovering over the award will tell you what it is and how to unlock it in a tooltip.", {
                name: 'Line-2',
                y: 1.5,
                width: 2,
                tooltip: "It's like the one time the tooltips in here are actually helpful."
            }),
            NewLabel("Positive awards will send out a regular Archipelago item. Negative awards will always send out a trap. Beware!", {
                name: 'Line-3',
                y: 3,
                width: 2,
                tooltip: "Unless of course you're playing with a game devolped by a maniac who puts both the progression and trap tags on the same item. Evil stuff."
            }),
            [{
                type: 'button',
                name: 'back-button',
                x: ww - 160 - 88 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Back',
                tooltip: 'The previous page was pretty good, wasn\'t it?',
                onClick: function() {
                    tutorial_6point5.close();
                    tutorial_6();
                }
            },
            {
                type: 'button',
                name: 'next-button',
                x: ww - 160 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Next Page',
                tooltip: '"Pro tip: Hover your mouse over any of the window elements in this plugin to get insightful and useful commentary!"',
                isDisabled: false,
                onClick: function() {
                    tutorial_6point5.close();
                    tutorial_7();
                }
            },
            {
                type: 'custom',
                name: 'custom-archipealgo-logo-1',
                x: 5,
                y: wh - 24,
                width: 22,
                height: 20,
                tooltip: 'Be sure to play with Deathlink! It\s a fun option that doesn\'t cause any stress at all!',
                onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
            }
            ]
        )
    })
    return tutorial_6point5;
}

var tutorial_7 = function() {
    var ww = 350;
    var wh = 225;
    let y = 0;
    var tutorial_7 = ui.openWindow({
        classification: 'tutorial-2',
        title: "How to play!",
        width: ww,
        height: wh,
        widgets: [].concat(
            NewLabel("Finally, a few extra notes. Deathlink is an optional rule that players may choose. Any time somebody dies with deathlink enabled; everybody dies. For you, that means a ride will crash.", {
                name: 'Line-1',
                y: 0,
                width: 2,
                tooltip: "Disable deathlink if you're a coward. Especially if somebody is playing VVVVVV"
            }),
            NewLabel("Conversely, if you crash a ride (Yes, even in testing mode), everybody will die. Deathlink has a 20 second cooldown. Fix your ride before it elapses!", {
                name: 'Line-2',
                y: 1.5,
                width: 2,
                tooltip: "There's a hidden second way to send a deathlink. Think you can find it?"
            }),
            NewLabel("If for some reason, you find an abundance of furries in your park, you can banish them by using the button in the bottom right of the unlock shop. “A Furry Problem? In MY Park?”", {
                name: 'Line-3',
                y: 3,
                width: 2,
                tooltip: "It's more likely than you think!"
            }),
            [{
                type: 'button',
                name: 'back-button',
                x: ww - 160 - 88 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Back',
                tooltip: 'The previous page was pretty good, wasn\'t it?',
                onClick: function() {
                    tutorial_7.close();
                    tutorial_6point5();
                }
            },
            {
                type: 'button',
                name: 'next-button',
                x: ww - 160 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Next Page',
                tooltip: '"Pro tip: Hover your mouse over any of the window elements in this plugin to get insightful and useful commentary!"',
                isDisabled: false,
                onClick: function() {
                    tutorial_7.close();
                    tutorial_8();
                }
            },
            {
                type: 'custom',
                name: 'custom-archipealgo-logo-1',
                x: 5,
                y: wh - 24,
                width: 22,
                height: 20,
                tooltip: 'Be sure to play with Deathlink! It\s a fun option that doesn\'t cause any stress at all!',
                onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
            }
            ]
        )
    })
    return tutorial_7;
}

var tutorial_8 = function() {
    var ww = 350;
    var wh = 225;
    let y = 0;
    var tutorial_8 = ui.openWindow({
        classification: 'tutorial-2',
        title: "How to play!",
        width: ww,
        height: wh,
        widgets: [].concat(
            NewLabel("In case a ride is too challenging/expensive/tedious to build, you have a limited number of skips to bypass the check. When selecting the world options, you could include more to be found.", {
                name: 'Line-1',
                y: 0,
                width: 2,
                tooltip: "Nothing is as satisfying as not having to build 10 monorails."
            }),
            NewLabel("Skips are found beneath to the Furry Banishment Button TM.", {
                name: 'Line-2',
                y: 1.5,
                width: 2,
                tooltip: "Skips is also found in a park in California, working with Mordecai and Rigby."
            }),
            NewLabel("Thanks for reading the tutorial! As a reward, here "+ context.formatString("{CURRENCY2DP}", 200) + ". Don’t spend it all in one place!", {
                name: 'Line-3',
                y: 3,
                width: 2,
                tooltip: "You can support me on Patreon at ... just kidding. I don't have a Patreon. I'm doing just fine as an Electrical Engineer."
            }),
            [{
                type: 'button',
                name: 'back-button',
                x: ww - 160 - 88 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Back',
                tooltip: 'The previous page was pretty good, wasn\'t it?',
                onClick: function() {
                    tutorial_8.close();
                    tutorial_7();
                }
            },
            {
                type: 'button',
                name: 'next-button',
                x: ww - 160 - 6,
                y: wh - 6 - 26 - 29,
                width: 85,
                height: 26,
                text: 'Yay ' + context.formatString("{CURRENCY2DP}", 200) + "!",
                tooltip: 'What do you mean that\'s not a lot of money?',
                isDisabled: false,
                onClick: function() {
                    tutorial_8.close();
                    park.cash += 200;
                }
            },
            {
                type: 'custom',
                name: 'custom-archipealgo-logo-1',
                x: 5,
                y: wh - 24,
                width: 22,
                height: 20,
                tooltip: 'Be sure to play with Deathlink! It\s a fun option that doesn\'t cause any stress at all!',
                onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
            }
            ]
        )
    })
    return tutorial_8;
}

function createHintList(){
    var hint_list = [["{WHITE}Receiving Player","{WHITE}Item","{WHITE}Finding Player","{WHITE}Location","{WHITE}Status"]];
    var hints = archipelago_settings.hints;
    for(let i = 0; i < hints.length; i++){
        let hint = [hints[i].ReceivingPlayer,hints[i].Item,hints[i].FindingPlayer,hints[i].Location,hints[i].Found? "{GREEN}Found" : "{RED}Not Found"];
        if((!hints[i].Found || !archipelago_settings.hint_not_found_filter) && //Found Filter
            ((hints[i].ReceivingPlayer == archipelago_settings.hint_player_filter || hints[i].FindingPlayer == archipelago_settings.hint_player_filter) ||
            archipelago_settings.hint_player_filter == 0))// Player Filter
        hint_list.push(hint);
    }
    return hint_list;
}

function interpretMessage(){
    var currentWindow = ui.getWindow("archipelago-locations");
    if (!currentWindow)
    return;
    if(currentWindow.findWidget<ButtonWidget>("send-chat-button")){
        var message = currentWindow.findWidget<TextBoxWidget>("chatbox").text;
        if (!message)
        return;
        trace("This is the message:");
        trace(message);
        if(message.charAt(0) === '!' && message.charAt(1) === '!'){
            message = message.toLocaleLowerCase();
            switch(message){
                case '!!help':
                    archipelago_print_message("!!help: Prints this menu. I bet you didn't know that.");
                    archipelago_print_message("!!toggleDeathLink: Enables/Disables Deathlink\n");
                    archipelago_print_message("!!toggleTrapLink: Enables/Disables TrapLink\n");
                    archipelago_print_message("!!setMaxSpeed x: Sets the maximum allowed speed.");
                    archipelago_print_message("!!setvisibility x: Sets visibility. See your YAML for the options.")
                    archipelago_print_message("!!sync: syncs all the items in case the connector is bad at its job.");
                    archipelago_print_message("!!addSkip: Cheats in a skip for the unlock shop. This is on the honor system.");
                    break;
                case '!!toggledeathlink':
                    archipelago_settings.deathlink = !archipelago_settings.deathlink;
                    archipelago_settings.deathlink_timeout = false;
                    if(archipelago_settings.deathlink)
                    archipelago_print_message("Deathlink Enabled you monster");
                    else
                    archipelago_print_message("Deathlink Disabled you coward");
                    break;
                case '!!toggletraplink':
                    archipelago_settings.traplink = !archipelago_settings.traplink;
                    if(archipelago_settings.traplink)
                    archipelago_print_message("TrapLink Enabled you maschoist");
                    else
                    archipelago_print_message("TrapLink Disabled you lameo");
                    break;
                case "!!setvisibility nothing":
                case "!!setvisibility none":
                    archipelago_settings.location_information = "None";
                    archipelago_print_message("Visibility set to [REDACTED]");
                    break;
                case "!!setvisibility progression":
                    archipelago_settings.location_information = "Progression";
                    archipelago_print_message("Visibility set to Progression!")
                    break;
                case "!!setvisibility recipient":
                    archipelago_settings.location_information = "Recipient";
                    archipelago_print_message("Visibilty set to Recipient!")
                    break;
                case "!!setvisibility progression recipient": 
                    archipelago_settings.location_information = "Progression Recipient";
                    archipelago_print_message("Visibilty set to Progression Recipient!")
                    break;
                case "!!setvisibility full":
                    archipelago_settings.location_information = "Full";
                    archipelago_print_message("Visibilty set to Full!")
                    break;
                case '!!setmaxspeed 1'://Changes maximum speed allowed
                    archipelago_settings.maximum_speed = 1;
                    archipelago_print_message("Maximum speed reset to 1. We're off! Like a herd of turtles!")
                    break;
                case '!!setmaxspeed 2':
                    archipelago_settings.maximum_speed = 2;
                    archipelago_print_message("Maximum speed set to 2. Those guests sure are slow, ain't they?");
                    break;
                case '!!setmaxspeed 3':
                    archipelago_settings.maximum_speed = 3;
                    archipelago_print_message("Maximum speed set to 3. Zoom. Look at it go.");
                    break;
                case '!!setmaxspeed 4':
                    archipelago_settings.maximum_speed = 4;
                    archipelago_print_message("Maximum speed set to 4. Is this not fast enough for you yet?");
                    break;
                case '!!setmaxspeed 5':
                    archipelago_settings.maximum_speed = 8;
                    archipelago_print_message("Maximum speed set. You better pray you don't get a furry trap.");
                    break;
                case '!!sync':
                    ArchipelagoSaveLocations(context.getParkStorage().get('RCTRando.ArchipelagoLockedLocations'),context.getParkStorage().get('RCTRando.ArchipelagoUnlockedLocations'));
                    archipelago_send_message("Sync");
                    break;
                case '!!addskip':
                    archipelago_settings.skips ++;
                    archipelago_print_message("It appears somebody set their difficulty too high. This is where your hubris brought you!");
                    break;
                case '!!fixunlockshop':
                    archipelago_print_message("Apologies from present Colby for past Colby being bad at programming.");
                    archipelago_send_message("LocationScouts");
                    break;
                default:
                    archipelago_print_message("Unknown command: try using !!help");
                    break;
            }
        }
        else {
            if(message == "Colby sucks"){ //Gotta do some error correction here.
                archipelago_send_message("Say","Colby is awesome!");
                return;
            }
            archipelago_send_message("Say", message);
        }
        currentWindow.findWidget<TextBoxWidget>("chatbox").text = '';
    }
    return;
}

function test(player, type, result){
    if(type == "ridecreate")
    console.log("Player: " + player + "\nType: " + type + "\nResult: " + result);
}

enum ImageMoniker {
    "archipelago_icon",
}

type ImageStringNames = keyof typeof ImageMoniker;

const pngToBase64: Record<ImageStringNames, string> = {
    archipelago_icon:
    "iVBORw0KGgoAAAANSUhEUgAAB/IAAAhACAYAAAA6vnE+AAAEu2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS41LjAiPgogPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgeG1sbnM6ZXhpZj0iaHR0cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8iCiAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIKICAgIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIKICAgIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIgogICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgZXhpZjpQaXhlbFhEaW1lbnNpb249IjIwMzQiCiAgIGV4aWY6UGl4ZWxZRGltZW5zaW9uPSIyMTEyIgogICBleGlmOkNvbG9yU3BhY2U9IjEiCiAgIHRpZmY6SW1hZ2VXaWR0aD0iMjAzNCIKICAgdGlmZjpJbWFnZUxlbmd0aD0iMjExMiIKICAgdGlmZjpSZXNvbHV0aW9uVW5pdD0iMiIKICAgdGlmZjpYUmVzb2x1dGlvbj0iNzIuMCIKICAgdGlmZjpZUmVzb2x1dGlvbj0iNzIuMCIKICAgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIKICAgcGhvdG9zaG9wOklDQ1Byb2ZpbGU9InNSR0IgSUVDNjE5NjYtMi4xIgogICB4bXA6TW9kaWZ5RGF0ZT0i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",
};

const imageMap: number[] = [];

type ImageData = {
    width: number;
    height: number;
    data: string;
};

const customImageFor = (image: ImageStringNames): number => {
    return imageMap[ImageMoniker[image]];
};