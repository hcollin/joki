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


    function listSubscribers() {
        const subs = subscribers.map(sub => {return {id: sub.id};});
        return subs;
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

    function sendMessageToSubscriber(subscriberId, sender, msg, eventKey) {
        txt(`${sender} sends a message to service ${subscriberId} with event key ${eventKey}`);
        const subscriber = subscribers.find(sub => sub.id === subscriberId);
        if(typeof subscriber.action === "function" && subscriber.id !== sender) {
            subscriber.action(sender, msg, eventKey);
        }
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

    function oneTimeListener(listenerFn, eventKey, id=null) {
        if(eventKey === undefined) {
            throw "When listening one time event an eventKey is mandatory";
        }
        txt(`Listening for event ${eventKey} once`);
        const lid = listenMessages((sender, msg, eventKey) => {
            const data = listenerFn(sender, msg, eventKey);
            clearListener(lid);
            return data;
        }, eventKey, id);
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

    function confirmThatThisVariableIsABusStore() {
        return true;
    }

    return {
        subscribe: subscribeServiceProvider,
        unsubscribe: unSubscribeServiceProvider,
        send: sendMessage,
        action: sendMessageToSubscriber,
        listen: listenMessages,
        once: oneTimeListener,
        stop: clearListener,
        debug: setDebugMode,
        services: listSubscribers,
        getService: getCurrentStateOfService,
        serviceUpdated: serviceHasUpdatedItsState,
        _getListeners: getListeners,
        getEventKeys: getRegisteredEventKeys,
        _thisIsABusStore: confirmThatThisVariableIsABusStore
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

class ClassService {
    
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

function createReducerService(id, busStore, initState={}, reducerFunction=null) {

    const serviceId = id;
    let data = initState;
    const bus = createBusConnection(serviceId, getState, handleBusMessage);

    if(busStore._thisIsABusStore() !== true) {
        throw(busStore);
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

function createFetchService(serviceId, busStore, options) {
    const { url, format, headers, ...rest } = Object.assign(
        {},
        {
            format: "json",
            getEventKey: `${serviceId}-GET`,
            postEventKey: `${serviceId}-GET`,
            putEventKey: `${serviceId}-PUT`,
            deleteEventKey: `${serviceId}-DELETE`,
            headers: {},
        },
        options
    );

    const bus = createBusConnection(serviceId, getState, handleMessage);
    bus.setBus(busStore);

    const callHistory = [];

    function getState() {
        if (callHistory.length > 0) {
            return callHistory[0];
        }
        return {};
    }

    function handleMessage(sender, msg, eventKey) {
        // const { params, urlExtension, body, responseEventKey } = msg;

        switch (eventKey) {
            case rest.getEventKey:
                sendFetch(msg, "GET");
                break;
            case rest.postEventKey:
                sendFetch(msg, "POST");
                break;
            case rest.putEventKey:
                sendFetch(msg, "PUT");
                // sendFetch(params, urlExtension, data, "PUT", responseEventKey);
                break;
            case rest.deleteEventKey:
                sendFetch(msg, "DELETE");
                // sendFetch(params, urlExtension, data, "DELETE", responseEventKey);
                break;
            default:
                break;
        }
    }

    function _fetch(url, fetchParams = {}) {
        return new Promise((resolve, reject) => {
            fetch(url, fetchParams)
                .then(response => {
                    switch (format) {
                        case "json":
                        default:
                            resolve(response.json());
                            break;
                    }
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    function sendFetch(options, method = "GET") {
        const { params, urlExtension, body, header, responseEventKey } = Object.assign(
            {},
            { triggerEvent: true, urlExtension: "", body: null, header: null },
            options
        );

        const fetchParams = {
            method: method,
        };

        if (body !== null) fetchParams.body = body;
        if (header !== null) fetchParams.header = header;

        const fetchId =
            responseEventKey !== null ? responseEventKey : `${Date.now()}-${Math.round(Math.random() * 10000)}`;

        _fetch(urlParamParser(url, urlExtension, params), fetchParams).then(results => {
            receiveResults(results, fetchId);
        });

        return fetchId;
    }

    function receiveResults(results, fetchId = null) {
        bus.send(results, fetchId);
    }

    function urlParamParser(url, urlExtension = "", params) {
        return `${url}${urlExtension}`;
    }

    function fetchGET(options) {
        const { params, urlExtension, body, triggerEvent, header } = Object.assign(
            {},
            { triggerEvent: true, urlExtension: "", body: null, header: null },
            options
        );

        return new Promise((resolve, reject) => {
            const fetchParams = {
                method: "GET",
            };

            if (body !== null) fetchParams.body = body;
            if (header !== null) fetchParams.header = header;

            _fetch(urlParamParser(url, urlExtension, params), fetchParams)
                .then(results => {
                    if (triggerEvent) {
                        setTimeout(() => {
                            receiveResults(results, "FETCH-GET");
                        }, 0);
                    }

                    resolve(results);
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    function fetchPOST(options) {
        const { params, urlExtension, body, triggerEvent, header } = Object.assign(
            {},
            { triggerEvent: true, urlExtension: "", header: null, body: null },
            options
        );
        return new Promise((resolve, reject) => {
            const fetchParams = {
                method: "POST",
            };

            if (body !== null) fetchParams.body = body;
            if (header !== null) fetchParams.header = header;

            _fetch(urlParamParser(url, urlExtension, params), fetchParams)
                .then(results => {
                    if (triggerEvent) {
                        setTimeout(() => {
                            receiveResults(results, "FETCH-POST");
                        }, 0);
                    }
                    resolve(results);
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    return {
        get: fetchGET,
        post: fetchPOST,
    };
}

export { createBusStore, createBusConnection, createBusStoreReducerService as BusStoreReducerService, ClassService, createReducerService, createFetchService };
