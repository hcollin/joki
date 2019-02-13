import connectJoki from "../joki/connectJoki";

export default function createReducerService(id, jokiInstance, initState={}, reducerFunction=null) {

    const serviceId = id;
    let data = initState;
    const joki = connectJoki(serviceId, getState, handleMessage);

    if(jokiInstance._isJoki() !== true) {
        throw("Provided busStore is not a valid busStore", jokiInstance);
    }

    joki.set(jokiInstance);

    if(typeof reducerFunction !== "function") {
        throw("reducerFunction must be a function with two arguments: state and action");
    }

    const reducer = reducerFunction;

    function getState() {
        return {...data};
    }

    function handleMessage(sender, msg, eventKey) {
        reducerRunner({type: eventKey, data: msg});
    }

    function reducerRunner(action) {
        
        const newData = reducer(data, action);
        if(newData !== undefined) {
            data = newData;
            joki.updated();
        }
    }

    return {
        getState: getState,
        action: reducerRunner,
    }
}