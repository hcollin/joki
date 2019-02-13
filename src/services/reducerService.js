import createBusConnection from "../serviceClass/createBusConnection";

export default function createReducerService(id, busStore, initState={}, reducerFunction=null) {

    const serviceId = id;
    let data = initState;
    const bus = createBusConnection(serviceId, getState, handleBusMessage);

    if(busStore._thisIsABusStore() !== true) {
        throw("Provided busStore is not a valid busStore", busStore);
    }

    bus.setBus(busStore);

    if(typeof reducerFunction !== "function") {
        throw("reducerFunction must be a function with two arguments: state and action");
    }

    const reducer = reducerFunction;

    function getState() {
        return {...data};
    }

    function handleBusMessage(sender, msg, eventKey) {
        reducerRunner({type: eventKey, data: msg});
    }

    function reducerRunner(action) {
        data = reducer({...data}, action);
    }

    return {
        getState: getState,
        action: reducerRunner,
    }
}