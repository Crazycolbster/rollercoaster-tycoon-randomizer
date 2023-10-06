
class APIConnection
{
    sock:Socket = null;
    good: boolean = false;
    reconnect_interval: number = null;
    name:string = "API";
    port:number;
    callback:CallableFunction;
    onCloseCallback: (hadError: any) => void;
    onExpectedCloseCallback: (hadError: any) => void;
    onErrorCallback: (hadError: any) => void;
    onDataCallback: (hadError: any) => void;
    buffer:string = "";

    constructor(name:string, port:number, callback:CallableFunction) {
        this.name = name;
        this.port = port;
        this.callback = callback;

        var self = this;
        this.onCloseCallback = function(hadError){self.onClose(hadError);};
        this.onExpectedCloseCallback = function(hadError){self.onExpectedClose(hadError);}
        this.onErrorCallback = function(hadError){self.onError(hadError);};
        this.onDataCallback = function(hadError){self.onData(hadError);};

        this.connect();
    }

    send(data:Object) {
        try {
            let r: string = JSON.stringify(data) + '\0';
            info(this.name+' sending:', r.length, r);
            this.end(r);
        } catch(e) {
            printException('error sending '+this.name, e);
        }
    }

    destroy() {
        if(!this.sock) return;

        info(this.name+'.destroy()');
        try {
            this.sock.off('close', this.onCloseCallback);
        } catch(e) {
            printException('error closing event handlers in '+this.name+'.close', e);
        }

        try {
            this.sock.off('close', this.onExpectedCloseCallback);
        } catch(e) {
            printException('error closing event handlers in '+this.name+'.close', e);
        }

        try {
            this.sock.destroy(null);
        } catch(e) {
            printException('error destroying old '+this.name+' connection ', e);
        }

        this.sock = null;
    }

    private onError(hadError: boolean) {
        info('error in '+this.name+' connection, will keep trying...');
        if(this.good) {
            park.postMessage(
                {type: 'blank', text: 'error in '+this.name+' connection, will keep trying...'} as ParkMessageDesc
            );
        }
        if(settings.rando_archipelago){
            archipelago_connected_to_game = false;
            try {
                if (ui.getWindow("archipelago-connect").findWidget<LabelWidget>("label-Connected-to-game"))
                ui.getWindow("archipelago-connect").findWidget<LabelWidget>("label-Connected-to-game").text = "The Archipelago Client is {RED}not{WHITE} connected to the game!";
                ui.getWindow("archipelago-connect").findWidget<ButtonWidget>("start-button").isDisabled = (!archipelago_connected_to_game || !archipelago_connected_to_server || !archipelago_correct_scenario);
            }
            catch{
                console.log("Looks like the Archipelago window isn't open.");
            }
            try {
                if (ui.getWindow("archipelago-locations").findWidget<LabelWidget>("label-Connected-to-server"))
                ui.getWindow("archipelago-locations").findWidget<LabelWidget>("label-Connected-to-server").text = "The Archipelago Client is {RED}not{WHITE} connected to the game!";
                console.log(archipelago_connected_to_server);
            }
            catch{
                console.log("Looks like the Archipelago Shop isn't open");
            }
            
        }
        this.good = false;
        this.connect();
    }

    private onClose(hadError: boolean) {
        info(this.name+' connection closed, will keep trying...');
        if(this.good) {
            park.postMessage(
                {type: 'blank', text: this.name+' connection closed, will keep trying...'} as ParkMessageDesc
            );
        }
        this.good = false;
        this.connect();
    }

    private onExpectedClose(hadError: boolean) {
        info(this.name+' connection closed cc_onExpectedClose, will keep trying...');
        this.good = true;
        this.connect();
    }

    private reconnect() {
        debug(this.name+' reconnecting...');
        this.connect();
    }

    private onData(message: string) {
        let data: Object = null;
        let resp: Object = null;

        // chop off the null-terminator
        while(message[message.length-1] == '\0')
            message = message.substring(0, message.length-1);

        // try
        try {
            data = JSON.parse(message);
            this.buffer = "";
        } catch(e) {
            try {
                this.buffer += message;
                data = JSON.parse(this.buffer);
                this.buffer = "";
            }
            catch(e) {
                printException('error parsing '+this.name+' request JSON: ' + message, e);
                return;
            }
        }

        try {
            info(this.name+" received data: ", data);
            resp = this.callback(data);
            // this.send(resp);
        } catch(e) {
            printException('error handling '+this.name+' request: ' + message, e);
        }
    }

    private reset_timeout() {
        if(this.reconnect_interval !== null) {
            context.clearInterval(this.reconnect_interval);
            this.reconnect_interval = null;
        }

        //this.reconnect_interval = context.setInterval(this.end, 5000);
    }

    private end(data?:string) {
        if(!this.sock) return;

        info(this.name+'.end()');
        try {
            this.sock.off('close', this.onCloseCallback);
            this.sock.on('close', this.onExpectedCloseCallback);
        } catch(e) {
            printException('error closing event handlers in '+this.name+'.close', e);
        }

        try {
            data = data ? data : '{"id": 0, "status": 0}\0';
            info(this.name+'.sock.end('+data+')');
            this.sock.end(data);
        } catch(e) {
            printException('error closing old '+this.name+' connection ', e);
        }

        try {
            this.sock.destroy(null);
        } catch(e) {
            printException('error destroying old '+this.name+' connection ', e);
        }

        this.reset_timeout();
        this.good = true;
    }

    private connect() {
        var self = this;

        if (network.mode == "server") {
            //info("This is a server...");
        } else if (network.mode == "client") {
            //info("This is a client...");
            return;
        } else {
            //info("This is single player...");
        }

        this.reset_timeout();
        this.destroy();

        info(this.name+'.connect');
        this.sock = network.createSocket();

        this.sock.connect(this.port, '127.0.0.1', function() {
            if(!self.good) {
                info(self.name+' connected to port '+self.port);
                park.postMessage(
                    {type: 'blank', text: self.name+' connected!'} as ParkMessageDesc
                );
                if(settings.rando_archipelago){
                    archipelago_connected_to_game = true;
                    try {
                        if (ui.getWindow("archipelago-connect").findWidget<LabelWidget>("label-Connected-to-game")){
                            ui.getWindow("archipelago-connect").findWidget<LabelWidget>("label-Connected-to-game").text = "The Archipelago Client is connected to the game!";
                            ui.getWindow("archipelago-connect").findWidget<ButtonWidget>("start-button").isDisabled = !archipelago_connected_to_game || !archipelago_connected_to_server || !archipelago_correct_scenario;
                        }
                    }
                    catch {
                        console.log("Looks like the setup window isn't open.")
                    }
                    try{
                        if(ui.getWindow("archipelago-locations").findWidget<LabelWidget>("label-Connected-to-server"))
                        ui.getWindow("archipelago-locations").findWidget<LabelWidget>("label-Connected-to-server").text = "The Archipelago Client is connected to the game!";
                    }
                    catch{
                        console.log("Looks like the unlock shop isn't open.");
                    }
                }
            }
            self.good = true;
        });
        this.sock.setNoDelay(true);

        this.sock.on('error', this.onErrorCallback);
        this.sock.on('close', this.onCloseCallback);
        this.sock.on('data', this.onDataCallback);
    }
}
