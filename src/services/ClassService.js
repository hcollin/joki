import createBusConnection from "../serviceClass/createBusConnection";

export default class ClassService {
    
    constructor(options) {

        if (options.serviceId === undefined) {
            console.error("The ClassService constructor requires an option with key unique serviceId.");
            throw "The ClassService constructor requires an option with key unique serviceId.";
        }

        if (options.bus === undefined) {
            console.error(
                "The ClassService constructor requires an option with key bus providing the busStore it uses."
            );
            throw "The ClassService constructor requires an option with key bus providing the busStore it uses.";
        }

        const { serviceId, bus } = options;
        this._serviceId = serviceId;
        this.bus = createBusConnection(this._serviceId, this.getState.bind(this), this.busHandler.bind(this));
        
        this.connectToBus(bus);
    }

    connectToBus(busStore) {
        if (busStore._thisIsABusStore() !== true) {
            console.error("The bus provided is not a valid busStore");
            throw("The bus provided is not a valid busStore");
        }
        this.bus.setBus(busStore);
    }

    getState() {
        throw "This function must be overridden in the service class inheriting from the ClassService. This function must return the current state of the service.";
    }

    busHandler(sender, msg, eventKey) {
        throw "This function must be overridden in the service class inheriting from the ClassService. This function handles incoming messages from the bus.";
    }

    sendToBus(msg, eventKey = null) {
        if (this.bus !== null) {
            this.bus.send(msg, eventKey);
        }
    }
}
