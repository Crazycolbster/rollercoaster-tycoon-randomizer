/// <reference path="moduleBase.ts" />
/// <reference path="../../lib/openrct2.d.ts" />

class RCTRArchipelagoConnection extends ModuleBase {

    AnyEntry(): void {
        var self = this;
        if (!settings.rando_archipelago)
            return;
        //init_archipelago_connection();

    }
}

if(context.apiVersion >= 75)
    registerModule(new RCTRArchipelagoConnection());
var send_timeout = false; //For plugin side sends
var spam_timeout = false; //For user side sends

function archipelago_send_message(type: string, message?: any) {
    try {
        trace(connection.buffer.length);
        if (connection.buffer.length == 0){
            if (!send_timeout){
                archipelago_select_message(type, message);
                send_timeout = true;
                context.setTimeout(() => {send_timeout = false;}, 3000);
            }
            else{
                context.setTimeout(() => {archipelago_send_message(type,message);}, 3000);
            }
        }
    }
    catch(e) {
        printException('error sending '+this.name, e);
        throw(e);
    }
}

function archipelago_select_message(type: string, message?: any){
    switch(type){
    case "Connect":
        // TODO: This and ConnectUpdate don't display the TrapLink tag, but that's fine for now.
        trace({cmd: "Connect", password: message.password, game: "OpenRCT2", name: message.name, uuid: message.name + ": OpenRCT2", version: {major: 0, minor: 4, build: 1}, item_handling: 0b111, tags: (archipelago_settings.deathlink) ? ["DeathLink"] : [], slot_data: true});
        break;
    case "ConnectUpdate":
        trace({cmd: "ConnectUpdate", tags: (archipelago_settings.deathlink) ? ["DeathLink"] : []})
        break;
    case "Sync"://Get's all the currently received items for the game
        connection.send({cmd: "Sync"});
        break;
    case "LocationChecks":
        var checks = [];//List of unlocked locations
        for (let i = 0; i < message.length; i++){
            checks.push(message[i].LocationID + 2000000);//OpenRCT2 has reserved the item ID space starting at 2000000
        }
        connection.send({cmd: "LocationChecks", locations: checks});
        break;
    case "LocationScouts"://Get's the item info for every location in the unlock shop
        var wanted_locations = [];
        for(let i = 0; i < archipelago_location_prices.length; i++){
            wanted_locations.push(2000000 + i);
        }
        switch(archipelago_settings.awards){
            case 0://Adds all awards to the location scout list
                var award_locations = [2008008, 2008009, 2008010, 2008011, 2008012, 2008014, 2008015, 2008016, 2008017, 2008018, 2008019, 2008020, 2008021, 2008022, 2008023]
                if (!archipelago_settings.exclude_safest_park)
                    award_locations.push(2008013);
                wanted_locations = wanted_locations.concat(award_locations);
                break;
            case 1://Adds postive awards to the location scout list
                var award_locations = [2008009, 2008010, 2008011, 2008014, 2008015, 2008017, 2008019, 2008020, 2008021, 2008023]
                if (!archipelago_settings.exclude_safest_park)
                    award_locations.push(2008013);
                wanted_locations = wanted_locations.concat(award_locations);
                break;
            case 2://Adds nothing to the list. 
                break;
        }
        connection.send({cmd: "LocationScouts", locations: wanted_locations, create_as_hint: 0});
        archipelago_location_request_sent = true;//Keeps archipelago_update_locations from spamming
        context.setTimeout(() => {archipelago_location_request_sent = false;}, 20000);//In case the connection fails, reset after 20 seconds
        break;
    case "LocationHints":
        connection.send({cmd: "LocationScouts", locations: message, create_as_hint: 2});
        break;
    case "StatusUpdate":
        connection.send({cmd: "StatusUpdate", status: message});//CLIENT_UNKNOWN = 0; CLIENT_CONNECTED = 5; CLIENT_READY = 10; CLIENT_PLAYING = 20; CLIENT_GOAL = 30
        break;
    case "Say":
        const regex = /peck/gi;
        message = message.replace(regex, 'p*ck');
        trace({cmd: "Say", text: message});
        connection.send({cmd: "Say", text: message});
        break;
    case "GetDataPackage":
        connection.send({cmd: "GetDataPackage", games: [message]});
        break;
    case "Bounce":
        if(message.tag == "DeathLink"){
            connection.send({cmd: "Bounce", tags: ["DeathLink"], data: {time: Math.round(+new Date()/1000), cause: message.ride + " has crashed!", source: archipelago_settings.player[0]}});
        }
        if(message.tag == "TrapLink"){
            connection.send({cmd: "Bounce", tags: ["TrapLink"], data: {time: Math.round(+new Date()/1000), trap_name: message.trap, source: archipelago_settings.player[0]}});
        }
        break;
    case "Get":
        connection.send({cmd: "Get", keys: []});
        break;
    case "Set":
        connection.send({cmd: "Set", key: message.key, tag: message.tag, default: message.default, want_reply: message.want_reply, operations: message.operations})
        break;
    case "SetNotify":
        break;
    }
}

function ac_req(data) {//This is what we do when we receive a data packet
    // TODO: come up with a better name for this function, and also move some of these big cases into their own functions
    var Archipelago = GetModule("RCTRArchipelago") as RCTRArchipelago;
    var archipelagoPlayers: playerTuple[] = [];
    switch(data.cmd){
        case "RoomInfo":
            archipelago_settings.current_time = data.time;
            trace("Archipelago Time has been set:");
            trace(archipelago_settings.current_time);
            break;
        case "Connected"://Packet stating player is connected to the Archipelago game
            if(!archipelago_settings.started){
                var multiworld_games = [];
                if(!context.getParkStorage().get("RCTRando.ArchipelagoPlayers")){ //We only need to do this once
                    for(let i=0; i<data.players.length; i++) {
                        //Create guest list populated with Player names
                        let playerAlias = data.players[i][2];
                        let playerGame = data.slot_info[data.players[i][1]][1];
                        let playerSlot = data.players[i][1];
                        let team = data.players[i][0];
                        archipelagoPlayers.push([playerAlias, false, playerGame, playerSlot, team]);
                        multiworld_games.push(data.slot_info[i + 1][1]);
                    }
                    trace(data.slot_info);
                    console.log("Here's our players:");
                    console.log(archipelagoPlayers);
                    context.getParkStorage().set("RCTRando.ArchipelagoPlayers",archipelagoPlayers);
                    try{
                        context.registerAction('SetNames', (args) => {return {};}, (args) => Archipelago.SetNames());
                    }
                    catch(e){
                        console.log("Error in registering SetNames:" + e)
                    }
                    context.executeAction("SetNames", {});
                    archipelago_settings.player = archipelagoPlayers[data.slot - 1];
                }
                context.getParkStorage().set("RCTRando.ArchipelagoHintPoints",data.hint_points);

                //To prevent sending lots of redundant data, we strip copies of games
                var unique_multiworld_games = multiworld_games.filter(function(elem, index, self) {
                    return index === self.indexOf(elem);
                })
                archipelago_settings.multiworld_games = unique_multiworld_games;
                trace("Here's the games in the multiworld:");
                trace(archipelago_settings.multiworld_games);

                if(!archipelago_init_received){
                    try{
                        context.registerAction('SetImportedSettings', (args) => {return {};}, (args) => Archipelago.SetImportedSettings(args));
                    }
                    catch(e){
                        console.log("Error in registering SetImportedSettings:" + e)
                    }
                    context.executeAction("SetImportedSettings", data.slot_data);
                    // Archipelago.SetImportedSettings(data.slot_data);
                }
                
            }
            else {//Verify we're connected to the right save
                if(data.slot_data.seed != archipelago_settings.seed){
                    if(archipelago_settings.seed != "Bypass"){
                        connection.destroy();
                        connection = null;
                        var bad_save_warning = ui.openWindow({
                            classification: 'bad_save_warning',
                            title: "WARNING",
                            width: 500,
                            height: 300,
                            widgets: [].concat(
                                {
                                    type: 'label',   
                                    name: 'warning-label-1',
                                    text: "{RED}WARNING: This save does not match with the server! Continuing may cause", 
                                    x: 50,
                                    y: 40,
                                    width: 400,
                                    height: 260,
                                    textAlign: "centred",
                                    tooltip: "No more worlds will be ruined at the hands of an illegitimate save. Man, I'm a hero!"
                                },{
                                    type: 'label',   
                                    name: 'warning-label-2',
                                    text: "{RED}unwanted changes to your game! If you're sure you want to continue,", 
                                    x: 50,
                                    y: 60,
                                    width: 400,
                                    textAlign: "centred",
                                    height: 260,
                                    tooltip: "No more worlds will be ruined at the hands of an illegitimate save. Man, I'm a hero!"
                                },
                                {
                                    type: 'label',   
                                    name: 'warning-label-3',
                                    text: "{RED}select the correct box and reconnect to the server.", 
                                    x: 50,
                                    y: 80,
                                    width: 400,
                                    height: 260,
                                    textAlign: "centred",
                                    tooltip: "No more worlds will be ruined at the hands of an illegitimate save. Man, I'm a hero!"
                                },
                                {
                                    type: 'button',
                                    name: 'confirm-button',
                                    x: 50,
                                    y: 150,
                                    width: 200,
                                    height: 100,
                                    text: 'I Understand and Wish to Continue',
                                    tooltip: 'You\'ve been warned.',
                                    onClick: function() {
                                        bad_save_warning.close();
                                        archipelago_settings.seed = "Bypass";
                                        saveArchipelagoProgress();
                                        init_archipelago_connection();
                                        ui.showError("", "I'd reccomend disconnecting and reconnecting the client at this time, just in case.");
                                    }
                                },
                                {
                                    type: 'button',
                                    name: 'load-button',
                                    x: 250,
                                    y: 150,
                                    width: 200,
                                    height: 100,
                                    text: 'Load a Different Save',
                                    tooltip: ('Be sure to select the correct one this time! Maybe this will help!   ' + data.slot_data.seed),
                                    isDisabled: false,
                                    onClick: function() {
                                        context.executeAction("loadorquit", {mode:0, savePromptMode: 1});
                                    }
                                },
                                {
                                    type: 'custom',
                                    name: 'custom-archipealgo-logo-1',
                                    x: 5,
                                    y: 275,
                                    width: 22,
                                    height: 20,
                                    tooltip: 'This tooltip comes from past Colby, typing in Antarctica. Will this ever be finished, or will I spend eternity fixing bugs and adding features?',
                                    onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
                                }
                            )
                        })
                        return bad_save_warning;
                    }
                }
            }
            // If the user has already made progress on this game, reflect that in the unlock shop
            context.setTimeout(() => {archipelago_update_locations(data.checked_locations)}, 2000);

            archipelago_connected_to_server = true;

            if(data.slot_data.version != archipelago_version){
                var bad_version_warning = ui.openWindow({
                    classification: 'bad_version_warning',
                    title: "WARNING",
                    width: 500,
                    height: 300,
                    widgets: [].concat(
                        {
                            type: 'label',   
                            name: 'warning-label-1',
                            text: "{RED}WARNING: The version of this plugin does not match the version used to generate", 
                            x: 25,
                            y: 40,
                            width: 450,
                            height: 20,
                            textAlign: "centred",
                            tooltip: "No more worlds will be ruined at the hands of an incorrect version. Man, I'm a hero!"
                        },{
                            type: 'label',   
                            name: 'warning-label-2',
                            text: "{RED}this world! Continuing may cause glitches and lead to an unwinnable scenario!", 
                            x: 25,
                            y: 60,
                            width: 450,
                            textAlign: "centred",
                            height: 20,
                            tooltip: "You know how version numbers work, right?"
                        },
                        {
                            type: 'label',   
                            name: 'warning-label-3',
                            text: "The version used to generate this world was: " + String(data.slot_data.version) + ".", 
                            x: 25,
                            y: 80,
                            width: 450,
                            height: 20,
                            textAlign: "centred",
                            tooltip: "When the leftmost number increases, the developer is very proud!"
                        },
                        {
                            type: 'label',   
                            name: 'warning-label-4',
                            text: "The plugins version is: " + String(archipelago_version) + ".", 
                            x: 25,
                            y: 100,
                            width: 450,
                            height: 20,
                            textAlign: "centred",
                            tooltip: "When the rightmost number increases, the developer is ashamed."
                        },
                        {
                            type: 'button',
                            name: 'confirm-button',
                            x: 50,
                            y: 150,
                            width: 400,
                            height: 100,
                            text: 'I Understand and Wish to Continue',
                            tooltip: 'You\'ve been warned.',
                            onClick: function() {
                                bad_version_warning.close();
                            }
                        },
                        {
                            type: 'custom',
                            name: 'custom-archipealgo-logo-1',
                            x: 5,
                            y: 275,
                            width: 22,
                            height: 20,
                            tooltip: 'It\'s crazy how long it took me to add this, given how many "glitches" could have been prevented when testing.',
                            onDraw: (g: GraphicsContext) => {g.colour = 0;g.image(g.getImage(archipelago_icon_ID.start).id, 0,0)}
                        }
                    )
                })
                // return bad_version_warning;
            }

            break;

        case "ConnectionRefused"://Packet stating an error has occured in connecting to the Archipelago game
            var errorMessage = "Archipelago Refused the connection with the following error(s):";
            for(let i = 0; i < data.errors.length; i++){
                errorMessage += data.errors[i];
            }
            archipelago_print_message(errorMessage);
            break;

        case "PrintJSON"://Packet with data to print to the screen
            archipelagoPlayers = (context.getParkStorage().get("RCTRando.ArchipelagoPlayers") as playerTuple[]);
            switch(data.type){
                case "Hint":
                case "ItemSend":
                    if (!archipelago_settings.universal_item_messages){//Only display item messages directly relevant to the player if enabled
                        let display = false;
                        for (let i = 0; i < data.data.length; i++){
                            if(data.data[i].type == "player_id"){
                                let checked_player = context.getParkStorage().get("RCTRando.ArchipelagoPlayers")[Number(data.data[i].text)-1][0];
                                if (archipelago_settings.player[0] == checked_player){
                                    display = true;
                                    break;//Breaks the for loop
                                }
                            }
                        }
                        if (!display)
                        break;//Breaks the case statement
                    }
                    let message = "";
                    for (let i = 0; i < data.data.length; i++){
                        let color = "";
                        if(data.data[i].type){
                            let segment = data.data[i].text;
                            switch(data.data[i].type){
                                case "player_id":
                                    segment = archipelagoPlayers[Number(data.data[i].text)-1][0];//Gets the name of the relevant player
                                    color = "PALELAVENDER";//Colors them purple
                                    break;
                                case "item_id":
                                    var game = archipelagoPlayers[data.data[i].player - 1][2];
                                    segment = context.getParkStorage().get("RCTRando.ArchipelagoItemIDToName")[game][Number(data.data[i].text)];
                                    switch(data.data[i].flags){
                                        case 0://Normal
                                        case 2://Useful
                                            color = "BABYBLUE";
                                            break;
                                        case 1://Progression
                                            color = "PALELAVENDER";
                                            break;
                                        case 4://Trap
                                            color = "RED";
                                            break;
                                    }
                                    break;
                                case "location_id":
                                    var game = archipelagoPlayers[data.data[i].player - 1][2];
                                    segment = context.getParkStorage().get("RCTRando.ArchipelagoLocationIDToName")[game][Number(data.data[i].text)];
                                    color = "GREEN";
                                    break;
                            }
                            message += '{' + color + '}' + segment + '{WHITE}';
                        }
                        else{
                            message += data.data[i].text;
                        }
                    }
                    console.log(message);
                    archipelago_print_message(message);
                    break;

                case "ItemCheat":
                    archipelago_print_message(data.data[0].text);
                    break;

                // case "Hint":
                //     var hintMessage = "Colby has a lot to do when he gets the proxy";
                //     archipelago_print_message(hintMessage);
                //     break;

                case "Goal":
                    archipelago_print_message(data.data[0].text);
                    archipelagoPlayers[data.slot - 1][1] = true;
                    context.getParkStorage().set("RCTRando.ArchipelagoPlayers",archipelagoPlayers);
                    // let guests = map.getAllEntities("guest");
                    // for(let i=0; i<(guests.length); i++){
                    //     if(guests[i].name == archipelagoPlayers[data.slot - 1]){
                    //         guests[i].setFlag("joy", true);
                    //         break;
                    //     }
                    // }

                    break;

                case "Countdown":
                    ui.showError("Let's get ready to rumble!", data.data[0].text);
                    break;

                default:
                    archipelago_print_message(data.data[0].text);
            }
            break;

        case "DataPackage":
            var item_name_to_id = {};
            var item_id_to_name = {};
            var location_name_to_id = {};
            var location_id_to_name = {};
            let current_game = Object.keys(data.data.games)[0];

            console.log("Here's all the keys:");
            console.log(Object.keys(data.data.games));

            console.log("Here's our current game:");
            console.log(current_game);
            console.log("Here's every game we've received so far (This shouldn't have the current game):");
            console.log(archipelago_settings.received_games);

            if(archipelago_settings.received_games.indexOf(current_game) !== -1)//Throw away data we already have
                break;

            console.log("Received DataPackage, updating translation tables");

            function mergeObjects(target: { [key: string]: any }, source: { [key: string]: any }): void {
                for (const key in source) {
                    // console.log(key);
                  if (source.hasOwnProperty(key)) {
                    target[key] = source[key];
                  }
                }
              }

            function flipObject(obj: { [key: string]: any }): { [key: string]: string } {
                const flippedObject: { [key: string]: string } = {};

                for (const key in obj) {
                  if (obj.hasOwnProperty(key)) {
                    const value = obj[key];
                    flippedObject[value] = key;
                  }
                }

                return flippedObject;
              }
            
            mergeObjects(item_name_to_id, data.data.games[current_game].item_name_to_id);
            mergeObjects(location_name_to_id, data.data.games[current_game].location_name_to_id);
            
            item_id_to_name = flipObject(item_name_to_id);
            location_id_to_name = flipObject(location_name_to_id);

            item_id_to_name = {[current_game]: item_id_to_name}
            location_id_to_name = {[current_game]: location_id_to_name}

            mergeObjects(full_item_id_to_name, item_id_to_name);
            mergeObjects(full_location_id_to_name, location_id_to_name);

            context.getParkStorage().set("RCTRando.ArchipelagoItemIDToName",full_item_id_to_name);
            context.getParkStorage().set("RCTRando.ArchipelagoLocationIDToName",full_location_id_to_name);

            // console.log(full_item_id_to_name);
            // console.log(full_location_id_to_name);

            console.log("Just added data for this game:");
            console.log(current_game);

            archipelago_settings.received_games.push(current_game);
            saveArchipelagoProgress();
            break;

        case "Bounced"://Keeps the connection alive and recevies the Deathlink Signal from other games
            if(data.tags){
                for(let i = 0; i < data.tags.length; i++){
                    if(data.tags[i] == "DeathLink"){
                        const cause = data.data.cause;
                        const source = data.data.source;
                        if(archipelago_settings.deathlink){
                            Archipelago.ReceiveDeathLink({cause, source, attempt: 1});
                        }
                        if(cause){
                            archipelago_print_message(cause);
                        }
                        else{
                            var player_color = "{PALELAVENDER}" + source;
                            var message_choice = [player_color + " {RED}is bad at video games!", player_color + " {RED}just got Windows Vista'd.",
                                player_color + " {RED}should have upgraded to Linux.", player_color + " {RED}has met their maker!",
                                '{RED}"What is death anyways?"\n{PALELAVENDER}-' + player_color,
                                "{RED}If it makes you feel better, at least it's " + player_color + "{RED}'s fault and not yours.", player_color + " {RED}is an airsick lowlander!",
                                player_color + "{RED} missed 100% of the shots they didn't take.", "{RED}It was " + player_color + "{RED}'s controller, I swear!",
                                player_color + "{RED} was not the imposter.", player_color + "{RED} rolled a natural 1.",
                                player_color + "{RED} should not have tried stealing the kings flocks from Ammon!", player_color + "{RED} started a land war in Asia!",
                                player_color + "{RED} was burninated by Trogdor!",player_color + "{RED} couldn't live and didn't learn!",
                                player_color + "{RED} was driven mad by High Demon Elgrim!"];
                            var death_message = message_choice[Math.floor(Math.random() * message_choice.length)];
                            archipelago_print_message(death_message);
                        }
                        break;
                    }

                    if (data.tags[i] == "TrapLink"){
                        const trap = data.data.trap_name;
                        const source = data.data.source;

                        // Ignore this trap if it comes from ourselves or TrapLink is disabled.
                        if (source == archipelago_settings.player[0] || !archipelago_settings.traplink){
                            break;
                        }

                        var TrapLink = GetModule("RCTRArchipelago") as RCTRArchipelago;

                        // Whether or not a message should be placed in the ticker regarding the TrapLink.
                        var NotifyLink = true;

                        switch (trap){
                            // OpenRCT2's own traps.
                            case "Bathroom Trap":
                            case "Furry Convention Trap":
                            case "Spam Trap":
                            case "Loan Shark Trap":
                            case "Food poisoning Trap":
                            TrapLink.ActivateTrap(trap, true);
                            break;

                            // Other game's traps.
                            case "Aaa Trap": TrapLink.AaaTrap(); break;
                            case "Animal Trap": TrapLink.ActivateTrap("Furry Convention Trap", true); break;
                            case "Animal Bonus Trap": TrapLink.ActivateTrap("Furry Convention Trap", true); break;
                            case "Army Trap": context.executeAction("staffhire", {autoPosition: true, staffType: 2, costumeIndex: 0, staffOrders: 0} satisfies StaffHireArgs); break; // TODO: Not sure if we'll keep this one.
                            case "Attraction Breakdown Trap": TrapLink.BreakdownTrap(); break;
                            case "Bald Trap": TrapLink.BaldTrap(); break;
                            case "Camera Rotate Trap": ui.mainViewport.rotation = Math.floor(Math.random() * 4); break; // TODO: Maybe make it so it can't pick the already active rotation level.
                            case "Chaos Control Trap": PauseGame(); break;
                            case "Exposition Trap": TrapLink.ActivateTrap("Spam Trap", true); break;
                            case "Freeze Trap": PauseGame(); break; // Has altenate idea on the TODO list.
                            case "Frozen Trap": PauseGame(); break; // Has altenate idea on the TODO list.
                            case "Frost Trap": TrapLink.setWeather("Snowstorm"); break;
                            case "Help Trap": tutorial_0(); break;
                            case "Hey! Trap": TrapLink.ActivateTrap("Spam Trap", true); break; // Has altenate idea on the TODO list.
                            case "Literature Trap": TrapLink.ActivateTrap("Spam Trap", true); break;
                            case "Paralyze Trap": PauseGame(); break;
                            case "Paralysis Trap": PauseGame(); break;
                            case "Poison Mushroom": TrapLink.ActivateTrap("Food poisoning Trap", true); break;
                            case "Poison Trap": TrapLink.ActivateTrap("Food poisoning Trap", true); break;
                            case "Text Trap": TrapLink.ActivateTrap("Spam Trap", true); break;
                            case "Tutorial Trap": tutorial_0(); break;
                            case "Zoom In Trap": ui.mainViewport.zoom = -2; break; // TODO: Change this to just zoom in one pip rather than going to the max zoom level?
                            case "Zoom Out Trap": ui.mainViewport.zoom = 3; break; // TODO: Change this to just zoom out one pip rather than going to the max zoom level?
                            case "Zoom Trap": ui.mainViewport.zoom = (Math.floor(Math.random() * 6) - 2); break; // TODO: Maybe make it so it can't pick the already active zoom level.

                            // If this trap is unhandled, then trace log it and flip the NotifyLink flag so we don't send a pointless TrapLink notification.
                            default:
                                trace("Unhandled trap type: '" + trap +"'.");
                                NotifyLink = false;
                                break;
                        }
                        
                        if (NotifyLink){
                            archipelago_print_message(source + " linked a " + trap + "!");
                        }
                    }
                }
            }
            break;

        case "InvalidPacket":
            console.log("Invalid Packet Error: " + data.type);
            console.log(data.text);
            break;

        case "ReceivedItems":
            if (archipelago_settings.started){//We don't want to apply all the previously received items before we start the game.
                Archipelago.ReceiveArchipelagoItem(data.items, data.index);
            }
            break;

        case "LocationInfo":
            if(data.locations.length > 9){//This is for the unlock shop and not a hint
                const players: string[] = context.getParkStorage().get("RCTRando.ArchipelagoPlayers");
                var ready = true;
                if(context.getParkStorage().get('RCTRando.ArchipelagoLockedLocations'))
                    break;//If we have the locations already, we can assume this was an unintentional repeat request

                if(ready){
                    switch(archipelago_settings.awards){
                        case 0://all
                        var count = archipelago_settings.exclude_safest_park ? 15 : 16;
                        // splice last N from locations
                        var awardSource = data.locations.splice(data.locations.length - count, count);
                            for(let i = 0; i < awardSource.length; i++){
                                console.log("Here's all the award locations!",JSON.stringify(awardSource));
                                let receivingPlayer = players[data.locations[i][2] - 1][0]
                                let game = players[data.locations[i][2] - 1][2];
                                let slot = data.locations[i][2];
                                //Strip the 2000000 from the location for internal use.
                                archipelago_award_locations.push({LocationID: Number(awardSource[i][1] - 2000000), Item: awardSource[i][0], Game: game, Slot: slot, ReceivingPlayer: receivingPlayer, Flags: awardSource[i][3]})
                                context.getParkStorage().set("RCTRando.ArchipelagoAwardLocations",archipelago_award_locations);
                            }
                            break;//Okay, we're going from here next time. Add logic for pushing the positive awards onto the list and have the award function check teh list and send out the item. Good luck.
                        case 1://positive
                        var count = archipelago_settings.exclude_safest_park ? 10 : 11;
                        // splice last N from locations
                        var awardSource = data.locations.splice(data.locations.length - count, count);
                            for(let i = 0; i < awardSource.length; i++){
                                trace("Here's all the award locations!",JSON.stringify(awardSource));
                                let receivingPlayer = players[data.locations[i][2] - 1][0]
                                let game = players[data.locations[i][2] - 1][2];
                                let slot = data.locations[i][2];
                                //Strip the 2000000 from the location for internal use.
                                archipelago_award_locations.push({LocationID: Number(awardSource[i][1] - 2000000), Item: awardSource[i][0], Game: game, Slot: slot, ReceivingPlayer: receivingPlayer, Flags: awardSource[i][3]})        
                                context.getParkStorage().set("RCTRando.ArchipelagoAwardLocations",archipelago_award_locations);
                            }
                            break;
                        case 2://none
                    }
                    for(let i = 0; i < data.locations.length; i++){
                        let receivingPlayer = players[data.locations[i][2] - 1][0]
                        let game = players[data.locations[i][2] - 1][2];
                        let slot = data.locations[i][2];
                        archipelago_locked_locations.push({LocationID: i, Item: data.locations[i][0], Game: game, Slot: slot, ReceivingPlayer: receivingPlayer, Flags: data.locations[i][3]})
                    }
                    ArchipelagoSaveLocations(archipelago_locked_locations,[]);
                }
                else{//We don't have all the item info yet. Try again.
                    console.log("Item Info incorrect. Retrying.");
                    context.setTimeout(() => {archipelago_send_message("LocationScouts");}, 3000)
                }

            }
            break;
        case "SetReply"://Handles hints and energylink
            const hint_pattern: RegExp = /^_read_hints_/;
            const receipt_pattern: RegExp = /^EnergyLink/;            
            if(hint_pattern.test(data.key)){
                trace(context.getParkStorage().get("RCTRando.ArchipelagoPlayers") as playerTuple[]);
                for(let i = 0; i < data.value.length; i++){
                    let archipelagoPlayers = (context.getParkStorage().get("RCTRando.ArchipelagoPlayers") as playerTuple[]);
                    let receivingPlayer = archipelagoPlayers[Number(data.value[i].receiving_player) - 1][0];
                    let findingPlayer = archipelagoPlayers[Number(data.value[i].finding_player) - 1][0];
                    let itemGame = archipelagoPlayers[Number(data.value[i].receiving_player) - 1][2];
                    let locationGame = archipelagoPlayers[Number(data.value[i].finding_player) - 1][2];
                    var hint: archipelago_hint = {
                        ReceivingPlayer: receivingPlayer,
                        FindingPlayer: findingPlayer,
                        Location: context.getParkStorage().get("RCTRando.ArchipelagoLocationIDToName")[locationGame][Number(data.value[i].location)],
                        Item: context.getParkStorage().get("RCTRando.ArchipelagoItemIDToName")[itemGame][Number(data.value[i].item)],
                        Found: data.value[i].found
                    }
                    //Check if we've received the hint before
                    var position = -1;
                    for (let j = 0; j < archipelago_settings.hints.length; j++) {
                        const obj = archipelago_settings.hints[j];
                        if (obj.Location === hint.Location && obj.FindingPlayer === hint.FindingPlayer) {
                            position = j; // Return the index of the matching object
                        }
                    }
                    if(position > -1){
                        archipelago_settings.hints[position].Found = hint.Found;
                    }
                    else{
                        archipelago_settings.hints.push(hint);
                    }
                }
                saveArchipelagoProgress();
            }
            else if (receipt_pattern.test(data.key)){
                Archipelago.BankReceipt(data.original_value, data.value, data.tag);
            }
            break;

        case "Ping":
            data.cmd = "Pong";
            if(data.multiply){
                let number = data.multiply;
                for(let i = 0; i < number; i++){
                    data.multiply = i;
                    connection.send(data, false);
                }
            }
            else
                connection.send(data, false);
            break;
    }
    return null;
}

function errorCallback() {
    archipelago_connected_to_game = false;
    try {
        var window:Window = ui.getWindow("archipelago-connect");
        window.findWidget<LabelWidget>("label-Connected-to-game").text = "The Archipelago Client is {RED}not{WHITE} connected to the game!";
        var button:ButtonWidget = window.findWidget<ButtonWidget>("start-button");
        button.isDisabled = (!archipelago_connected_to_game || !archipelago_connected_to_server || !archipelago_correct_scenario);
    }
    catch{
        trace("Looks like the Archipelago window isn't open.");
    }
    // try {
    //     var window:Window = ui.getWindow("archipelago-locations");
    //     window.findWidget<LabelWidget>("label-Connected-to-server").text = "The Archipelago Client is {RED}not{WHITE} connected to the game!";
    //     trace(archipelago_connected_to_server);
    // }
    // catch{
    //     trace("Looks like the Archipelago Shop isn't open");
    // }
}

function connectCallback() {
    archipelago_connected_to_game = true;
    try {
        var window:Window = ui.getWindow("archipelago-connect");
        var label:LabelWidget = window.findWidget<LabelWidget>("label-Connected-to-game");
        if (label){
            label.text = "The Archipelago Client is connected to the game!";
            window.findWidget<ButtonWidget>("start-button").isDisabled = !archipelago_connected_to_game || !archipelago_connected_to_server || !archipelago_correct_scenario;
        }
    }
    catch {
        trace("Looks like the setup window isn't open.")
    }
    // try{
    //     if(ui.getWindow("archipelago-locations").findWidget<LabelWidget>("label-Connected-to-server"))
    //     ui.getWindow("archipelago-locations").findWidget<LabelWidget>("label-Connected-to-server").text = "The Archipelago Client is connected to the game!";
    // }
    // catch{
    //     trace("Looks like the unlock shop isn't open.");
    // }
}

var connection = null;
function init_archipelago_connection() {
    trace("Hello?");
    connection = new APIConnection("Archipelago", 38280, ac_req, errorCallback, connectCallback);
}

function archipelago_print_message(message: string) {//Prints the message in whatever places the user selects
    var messageLog = context.getParkStorage().get("RCTRando.MessageLog") as Array<any>;
    if(messageLog)
    messageLog.push(message);
    else
    messageLog = [message];
    context.getParkStorage().set("RCTRando.MessageLog", messageLog);
    var lockedWindow = ui.getWindow("archipelago-locations");
    if(lockedWindow){//If the archipelago window is open
        if(lockedWindow.findWidget<ListViewWidget>("message-list"))//If the player is on the chat tab
        lockedWindow.findWidget<ListViewWidget>("message-list").items = messageLog;
    }
    if(archipelago_settings.park_message_chat){
        context.executeAction("postMessage",
            {message: {type: 'blank', text: message} as ParkMessageDesc}
        );
    }
    if(archipelago_settings.network_chat){
        network.sendMessage(message);

    }
}
