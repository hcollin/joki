
export default function createBusConnection(id, requestStateHandler=null, actionHandler=null) {

    let busStore = null;
    const serviceId = id;
    const _stateHandler = requestStateHandler !== null ? requestStateHandler : () => null;
    const _actionHandler = actionHandler !== null ? actionHandler : () => null; 

    let debugMode = false;

    function setBusConnection(bus) {    
        busStore = bus;
        txt(`Subscribe connection ${serviceId}`);
        return busStore.subscribe(serviceId, _stateHandler, _actionHandler);
    }

    function removeBusConnection(bus) {
        txt(`Remove Subscribtion ${serviceId}`);
        if(busStore !== null) {
            busStore.unSubscribeServiceProvider(serviceId);
            busStore = null;
        }
    }

    function sendMessageToBus(msg, eventKey=null) {
        txt(`Send message with key ${eventKey} by ${serviceId}`);
        busStore.send(serviceId, msg, eventKey);
    }

    function addListenerToBusEvent(handlerFn, eventKey=null) {
        const listenerId = busStore.listen(handlerFn, eventKey);
        return () => {
            busStore.stop(listenerId);
        }
    }

    function broadcastServiceStateUpdate() {
        busStore.serviceUpdated(serviceId);
    }

    function setDebugMode(setTo=null) {
        if(setTo === null) {
            debugMode = !debugMode;
        } else {
            debugMode = setTo;
        }
    }

    function txt(msg) {
        if (debugMode) {
            console.debug(`BusStoreConnection:Debug: ${msg}`);
        }
    }


    txt(`Connection established with serviceId ${serviceId}`);
    return {
        setBus: setBusConnection,
        clearBus: removeBusConnection,
        send: sendMessageToBus,
        listen: addListenerToBusEvent,
        debug: setDebugMode,
        updated: broadcastServiceStateUpdate
    }

}