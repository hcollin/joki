'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function createBusStore(options = {}) {
    let subIdCounter = 0;

    const keyGenerator =
        options.keyGenerator !== undefined && typeof options.keyGenerator === "function"
            ? options.keyGenerator 
            : keyType => {
                  return keyType;
              };

    let subscribers = [];
    const listeners = {
        all: [],
    };

    const listenerRemovers = {};

    let debugMode = options.debugMode !== undefined ? options.debugMode : false;

    /**
     * Services are the BusStore are data storages that usually contain a state and manage their internal state
     * They send updates to the bus, when their data changes. They can also provide apis
     *
     * @param {string|null} serviceId
     * @param {}
     */
    function subscribeServiceProvider(serviceId = null, currentStateCallback = null, actionsCallback = null) {
        const id = serviceId !== null ? serviceId : keyGenerator(`subscriber-${subIdCounter++}`);
        subscribers.push({
            id: id,
            getState: currentStateCallback,
            action: actionsCallback,
        });
        txt(`New service subscribed as ${serviceId}.`);
        return id;
    }

    function unSubscribeServiceProvider(subscriberId) {
        subscribers = subscribers.filter(s => s.id !== subscriberId);
        txt(`Service ${serviceId} unsubscribed .`);
    }

    /**
     * Send a message to the bus
     * @param {*} msg
     * @param {*} options
     */
    function sendMessage(sender = null, msg, eventKey = null) {
        txt(`${sender} sends a message with eventKey ${eventKey}.`);
        if (eventKey !== null) {
            if (listeners[eventKey] === undefined) {
                listeners[eventKey] = [];
            }
            listeners[eventKey].forEach(listener => {
                listener.fn(sender, msg, eventKey);
            });
        }
        listeners.all.forEach(listener => {
            listener.fn(sender, msg, eventKey);
        });
        subscribers.forEach(sub => {
            if(typeof sub.action === "function" && sub.id !== sender) {
                sub.action(sender, msg, eventKey);
            }
        });
    }

    /**
     * Register a listener for messages
     */
    function listenMessages(listenerFn, eventKey = "all", id = null) {
        const listenerId = id !== null ? id : keyGenerator(`listener-${subIdCounter++}`);
        txt(`New listener with id ${listenerId} registered.`);
        if (listeners[eventKey] === undefined) {
            listeners[eventKey] = [];
        }
        listeners[eventKey].push({
            id: listenerId,
            fn: listenerFn,
        });
        
        listenerRemovers[listenerId] = () => {
            // txt(`\tListeners for eventKey ${eventKey} before removal ${listeners[eventKey].length}.`);
            listeners[eventKey] = listeners[eventKey].filter(l => l.id !== listenerId);
            // txt(`\tListeners for eventKey ${eventKey} after removal ${listeners[eventKey].length}.`);
        };
        return listenerId;
    }

    function clearListener(listenerId) {
        if (listenerRemovers[listenerId] !== undefined) {
            listenerRemovers[listenerId]();
            delete listenerRemovers[listenerId];
            txt(`Listener with id ${listenerId} removed.`);
        }
    }

    function getCurrentStateOfService(serviceId) {
        const service = subscribers.find(sub => sub.id === serviceId);
        txt(`Get current state for service ${serviceId}`);
        if (service === undefined) {
            console.error("Cannot get a state for unknown service", serviceId);
            return false;
        }
        return service.getState();
    }

    function serviceHasUpdatedItsState(serviceId) {
        sendMessage(serviceId, "UPDATE", serviceId);
    }

    function txt(msg) {
        if (debugMode) {
            console.debug(`BusStore:Debug: ${msg}`);
        }
    }

    function setDebugMode(setTo = null) {
        if (setTo === null) {
            debugMode = !debugMode;
        } else {
            debugMode = setTo;
        }
    }

    function getListeners(key = null) {
        if (key === null) return listeners;
        return listeners[key];
    }

    function getRegisteredEventKeys() {
        const eventKeys = Object.keys(listeners);
        return eventKeys;
    }

    return {
        subscribe: subscribeServiceProvider,
        unsubscribe: unSubscribeServiceProvider,
        send: sendMessage,
        listen: listenMessages,
        stop: clearListener,
        debug: setDebugMode,
        getService: getCurrentStateOfService,
        serviceUpdated: serviceHasUpdatedItsState,
        _getListeners: getListeners,
        getEventKeys: getRegisteredEventKeys,
    };
}

function createBusStoreReducerService(id, initialData={}, reducer) {

    let state = initialData;
    let connectedBus = null;
    const serviceId = id;

    function getState() {
        return {...state};
    }

    function updateState(action) {
        const draft = {...state};
        state = reducer(draft, action);
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

function createBusConnection(id, requestStateHandler=null, actionHandler=null) {

    let busStore = null;
    const serviceId = id;
    const _stateHandler = requestStateHandler !== null ? requestStateHandler : () => null;
    const _actionHandler = actionHandler !== null ? actionHandler : () => null; 

    function setBusConnection(bus) {
        
        busStore = bus;
        return busStore.subscribe(serviceId, _stateHandler, _actionHandler);
    }

    function removeBusConnection(bus) {
        if(busStore !== null) {
            busStore.unSubscribeServiceProvider(serviceId);
            busStore = null;
        }
    }

    function sendMessageToBus(msg, eventKey=null) {
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
    }

    return {
        setBus: setBusConnection,
        clearBus: removeBusConnection,
        send: sendMessageToBus,
        listen: addListenerToBusEvent,
        debug: setDebugMode,
        updated: broadcastServiceStateUpdate
    }

}

exports.createBusStore = createBusStore;
exports.createBusConnection = createBusConnection;
exports.createReducerService = createBusStoreReducerService;
