
export default function createBusStoreReducerService(id, initialData={}, reducer) {

    let state = initialData;
    let connectedBus = null;
    const serviceId = id;

    function getState() {
        return {...state};
    }

    function updateState(action) {
        const draft = {...state};
        state = reducer(draft, action);
        if(connectedBus !== null) {
            
        }
    }

    function connectReducerStoreToBus(bus) {
        connectedBus = bus;
        connectedBus.subscribe(serviceId);
    }
    
    function disconnectFromCurrentBus() {
        if(connectedBus !==null) {
            connectedBus = null;
        }
    }

    return {
        serviceId : serviceId,
        getState: getState,
        dispatch: updateState,
        connectToBus: connectReducerStoreToBus,
        disconnectFromBus: disconnectFromCurrentBus


    }


}