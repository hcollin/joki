import createBusConnection from "../serviceClass/createBusConnection";

export default function createGraphService(serviceId, busStore, options) {

    const bus = createBusConnection(serviceId, getState, messageHandler);
    bus.setBus(busStore);

    function getState() {

    }

    function messageHandler(sender, msg, eventKey) {

    }

    return {
        
    }

}