import connectJoki from "../joki/connectJoki";

export default class ClassService {
    
    constructor(options) {

        if (options.serviceId === undefined) {
            console.error("The ClassService constructor requires an option with key unique serviceId.");
            throw "The ClassService constructor requires an option with key unique serviceId.";
        }

        // if (options.joki === undefined) {
        //     console.error(
        //         "The ClassService constructor requires an option with key joki providing the Joki instance it uses."
        //     );
        //     throw "The ClassService constructor requires an option with key joki providing the Joki instance it uses.";
        // }

        const { serviceId, joki } = options;
        this._serviceId = serviceId;
        this.joki = connectJoki(this._serviceId, this.getState.bind(this), this.messageHandler.bind(this));
        
        if(options.joki !== undefined ) {
            this.connectToJoki(options.joki);
        }

    }

    connectToJoki(jokiInstance) {
        if (jokiInstance._isJoki() !== true) {
            console.error("The Joki provided is not a valid Joki Instance");
            throw("The Joki provided is not a valid Joki instance");
        }
        this.joki.set(jokiInstance);
    }

    getState() {
        throw "This function must be overridden in the service class inheriting from the ClassService. This function must return the current state of the service.";
    }

    messageHandler(sender, msg, eventKey) {
        throw "This function must be overridden in the service class inheriting from the ClassService. This function handles incoming messages from the Joki.";
    }

    sendToJoki(msg, eventKey = null) {
        if (this.joki !== null) {
            this.joki.send(msg, eventKey);
        }
        
    }
}
