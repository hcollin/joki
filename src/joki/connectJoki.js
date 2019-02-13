
export default function connectJoki(id, requestStateHandler=null, actionHandler=null) {

    let jokiInstance = null;
    const serviceId = id;
    const _stateHandler = requestStateHandler !== null ? requestStateHandler : () => null;
    const _actionHandler = actionHandler !== null ? actionHandler : () => null; 

    let debugMode = false;

    function setJokiInstance(joki) {    
        jokiInstance = joki;
        txt(`Subscribe connection ${serviceId}`);
        return jokiInstance.subscribe(serviceId, _stateHandler, _actionHandler);
    }

    function removeJokiConnection(bus) {
        txt(`Remove Subscribtion ${serviceId}`);
        if(jokiInstance !== null) {
            jokiInstance.unSubscribeServiceProvider(serviceId);
            jokiInstance = null;
        }
    }

    function sendMessageToJoki(msg, eventKey=null) {
        txt(`Send message with key ${eventKey} by ${serviceId}`);
        jokiInstance.send(serviceId, msg, eventKey);
    }

    function addJokiEventListener(handlerFn, eventKey=null) {
        const listenerId = jokiInstance.listen(handlerFn, eventKey);
        return () => {
            jokiInstance.stop(listenerId);
        }
    }

    function broadcastServiceStateUpdate() {
        jokiInstance.serviceUpdated(serviceId);
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
            console.debug(`JokiConnection:Debug: ${msg}`);
        }
    }


    txt(`Connection established with serviceId ${serviceId}`);
    return {
        set: setJokiInstance,
        clear: removeJokiConnection,
        send: sendMessageToJoki,
        listen: addJokiEventListener,
        debug: setDebugMode,
        updated: broadcastServiceStateUpdate
    }

}