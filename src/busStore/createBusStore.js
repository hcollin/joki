export default function createBusStore(options = {}) {
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
        })
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
