
export default class BusStoreClassService {

    constructor() {
        this._bus = null;
        this._serviceId = null;
        this._busListenerId = null;
        this._busListeners = [];
        this._testSuiteCallsRecieved = 0;
    }
    

    connectToBus(bus, serviceId) {
        if(bus === undefined) {
            throw "BusStore:ServiceClass:connectToBus: Bus not defined. Create a bus with createBusStore() and provide the results to as a first parameter";
        }
        if(serviceId === undefined) {
            throw "BusStore:ServiceClass:connectToBus: Service Id not defined. Provide a unique id as a string for this service as a second parameter.";
        }
        this._bus = bus;
        this._serviceId = this._bus.subscribe(serviceId, this.getState.bind(this),this.busListener.bind(this));
        this._busListenerId = this._bus.listen(this.busListener.bind(this), this._serviceId);
    }

    disconnectFromBus() {
        if(this._bus !== null) {
            this._bus.stop(this._busListenerId);
            this._busListeners.forEach(lid => this._bus.stop(lid));
            this._bus.unsubscribe(this._serviceId);
            this._busListenerId = null;
            this._busListeners = [];
            this._serviceId = null;
            this._bus = null;
        }
    }

    sendToBus(msg, key=null) {
        if(this._bus !== null) {
            this._bus.send(this._serviceId, msg, key);
        }
    }

    listenToBusEvent(fn, eventKey) {
        if(this._bus !== null) {
            const id = this._bus.listen(fn.bind(this), eventKey);
            this._busListeners.push(id);
            return id;
        }
    }

    stopListeningToBusEvent(listenerId) {
        this._bus.stop(listenerId);
        this._busListeners = this._busListeners.filter(id => id !== listenerId);
    }

    busListener(sender, msg, eventKey) {
        // console.log("Default Bus Listener. Overwrite me!", msg);
        if(sender === "test-suite") {
            this._testSuiteCallsRecieved++;
        }
    }

    
    getState() {
        return {};
    }
}