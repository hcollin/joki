export default function createJoki(options = {}) {
    let subIdCounter = 0;

    // The key generator for services can be overwritten with options
    const keyGenerator =
        options.keyGenerator !== undefined && typeof options.keyGenerator === "function"
            ? options.keyGenerator 
            : keyType => {
                  return keyType;
    };

    
    // All subscribed services are store here.
    let services = [];

    // Listeners are here
    const listeners = {
        all: [],
    };

    // LIstener removing functions are stored here based on their id.
    const listenerRemovers = {};

    let debugMode = options.debugMode !== undefined ? options.debugMode : false;

    /**
     * Services in the Joki are data storages that usually contain a state and manage their internal state
     * They send updates to the Joki, when their data changes. They can also provide apis
     *
     * @param {string|null} serviceId
     * @param {}
     */
    function subscribeServiceProvider(serviceId = null, currentStateCallback = null, actionsCallback = null) {
        const id = serviceId !== null ? serviceId : keyGenerator(`subscriber-${subIdCounter++}`);
        services.push({
            id: id,
            getState: currentStateCallback,
            action: actionsCallback,
        });
        txt(`New service subscribed as ${serviceId} ${services.length}.`);
        return id;
    }

    function unSubscribeServiceProvider(subscriberId) {
        services = services.filter(s => s.id !== subscriberId);
        txt(`Service ${serviceId} unsubscribed .`);
    }


    function listSubscribers() {
        const subs = services.map(sub => {return {id: sub.id};});
        return subs;
    }

    /**
     * Send a message to the Joki
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
        services.forEach(sub => {
            if(typeof sub.action === "function" && sub.id !== sender) {
                sub.action(sender, msg, eventKey);
            }
        })
    }

    function sendMessageToSubscriber(subscriberId, sender, msg, eventKey) {
        txt(`${sender} sends a message to service ${subscriberId} with event key ${eventKey}`);
        const subscriber = services.find(sub => sub.id === subscriberId);
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
            listeners[eventKey] = listeners[eventKey].filter(l => l.id !== listenerId);
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
        const service = services.find(sub => sub.id === serviceId);
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
            console.debug(`Joki:Debug: ${msg}`);
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

    function confirmThatThisAJokiInstance() {
        return true;
    }

    return {
        subscribe: subscribeServiceProvider,
        unsubscribe: unSubscribeServiceProvider,
        services: listSubscribers,
        getService: getCurrentStateOfService,
        serviceUpdated: serviceHasUpdatedItsState,

        send: sendMessage,
        action: sendMessageToSubscriber,
        
        listen: listenMessages,
        once: oneTimeListener,
        stop: clearListener,
        
        debug: setDebugMode,
        getEventKeys: getRegisteredEventKeys,
        
        _getListeners: getListeners,
        _isJoki: confirmThatThisAJokiInstance
    };
}
