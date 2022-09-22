
abstract class ModuleBase {
    subscriptions;
    settings;

    constructor() {
        this.subscriptions = [];
        this.settings = {enabled:true, changes:{}};
    }

    FirstEntry() {}
    AnyEntry() {}

    // settings and savestate management would be good here, need constructor

    SubscribeEvent(event: HookType, callback: Function) {
        let s = context.subscribe(event, callback);
        this.subscriptions.push(s);
    }

    UnSubscribeEvents() {
        for(let i in this.subscriptions) {
            this.subscriptions[i].dispose();
        }
        this.subscriptions = [];
    }

    AddChange(key, name, from, to, factor=null) {
        var obj = {name: name, from: from, to: to, factor: factor};
        console.log(this.constructor.name, 'AddChange', key, JSON.stringify(obj));
        if(from === to && !factor) return;

        this.settings.changes[key] = obj;
        settings[this.constructor.name] = this.settings;
        SaveSettings();
    }

    RandomizeField(obj:Object, name:string, difficulty:number) {
        if(!obj[name]) return;

        const old = obj[name];
        obj[name] = randomize(obj[name], difficulty);
        this.AddChange(name, name, old, obj[name]);
    }
}

var modules:ModuleBase[] = [];

function registerModule(module:ModuleBase) {
    console.log("registerModule", module.constructor.name);
    for(var i=0; i<modules.length; i++) {
        const m = modules[i];
        if(m.constructor.name === module.constructor.name) {
            console.log("registerModule already found", module.constructor.name);
            return;
        }
    }
    modules.push(module);
}

function FirstEntry() {
    for(var i=0; i<modules.length; i++) {
        const m = modules[i];
        try {
            console.log('FirstEntry(): ', m.constructor.name, m.settings.enabled);
            if(!m.settings.enabled) continue;
            setLocalSeed(m.constructor.name+' FirstEntry');
            m.FirstEntry();
        } catch(e) {
            printException('error in FirstEntry(): ' + m.constructor.name, e);
        }
    }
}

function AnyEntry() {
    for(var i=0; i<modules.length; i++) {
        const m = modules[i];
        try {
            console.log('AnyEntry(): ', m.constructor.name, m.settings.enabled);
            if(!m.settings.enabled) continue;
            setLocalSeed(m.constructor.name+' AnyEntry');
            m.AnyEntry();
        } catch(e) {
            printException('error in AnyEntry(): ' + m.constructor.name, e);
        }
    }
}

function UnSubscribeEvents() {
    for(var i=0; i<modules.length; i++) {
        const m = modules[i];
        try {
            console.log('UnSubscribeEvents(): ', m.constructor.name);
            m.UnSubscribeEvents();
        } catch(e) {
            printException('error in UnSubscribeEvents(): ', m.constructor.name);
        }
    }
}

function GetModule(classname:string): ModuleBase {
    for(var i=0; i<modules.length; i++) {
        const m = modules[i];
        if(classname === m.constructor.name) {
            return m;
        }
    }
    return null;
}