export default function createJoki(initialOptions = {}) {
    const _options = initialOptions;

    const _services = new Map();
    const _listeners = new Map();

    let idCounter = 0;

    function ask(event) {
        _txt(`Ask from ${event.from} about ${event.key}`);

        if (event.syncAsk === true) {
            return trigger(event);
        }

        return new Promise((resolve, reject) => {
            try {
                const replies = trigger(event);
                resolve(replies);
            } catch (err) {
                reject(err);
            }
        });
    }

    function on(event) {
        // If keys is an array, each key will have a separate listener
        if (Array.isArray(event.key)) {
            _txt(`event.key is an Array with ${event.key.length} keys in it`);
            const stops = event.key.map(k => {
                return on({ ...event, key: k });
            });
            return () => {
                stops.forEach(off => {
                    off();
                });
            };
        }

        // const eventKey = event.key === undefined ? "all" : typeof event.key === "string" ? event.key : null;

        const eventKey =
            event.key !== undefined
                ? typeof event.key === "string"
                    ? event.key
                    : null
                : event.from !== undefined
                    ? event.from
                    : "all";

        _txt(`EventKeys: orig: ${event.key} parsed: ${eventKey} from: ${event.from}`);
        if (event.fn === undefined || typeof event.fn !== "function") {
            throw "Joki event subscriber must have handler function assigned to parameter 'key'";
        }

        if (eventKey === null) {
            throw `Invalid key ${key} for event ${event}`;
        }

        const onId = `on-${idCounter++}`;
        _txt(`Listener for event.key ${eventKey} with if ${onId}`);

        if (!_listeners.has(eventKey)) {
            _listeners.set(eventKey, new Map());
        }

        _listeners.get(eventKey).set(onId, {
            id: onId,
            event: event,
        });

        return () => {
            _off(eventKey, onId);
        };
    }

    function trigger(event) {
        _txt(
            `Trigger an event.\n\tfrom: ${event.from}\n\tto: ${event.to}\n\tkey: ${event.key}\n\tbroadcast: ${
                event.broadcast === true ? "yes" : "no"
            }\n\tbody length: ${event.body !== undefined ? event.body : "N/A"}`
        );
        // Only trigger a service
        if (event.to !== undefined) {
            const serviceIds =
                typeof event.to === "string"
                    ? [event.to]
                    : Array.isArray(event.to)
                    ? event.to
                    : event.to === true
                    ? Array.from(_services.keys())
                    : null;
            if (serviceIds === null) {
                throw "Event parameter must be a string or an array of strings";
            }
            const replies = {};
            serviceIds.forEach(id => {
                if (_services.has(id)) {
                    replies[id] = _services.get(id).fn(event);
                }
            });
            return replies;
        }

        // // Send event to those listeners that have subscribed to this event source.
        // if(event.from !== undefined) {
        //     if(_listeners.has(event.from)) {
        //         const sourceListeners = _listeners.get(event.from);
        //         sourceListeners.forEach(on => {

        //         });

        //     }
        // }




        if (event.key === undefined && event.from !== undefined && event.broadcast !== true) {
            event.key = event.from;
            event.serviceUpdate = true;
        }

        // Trigger listeners
        if (event.key !== undefined && event.onlyServices !== true) {
            const eventKeys = typeof event.key === "string" ? [event.key] : Array.isArray(event.key) ? event.key : null;
            if (eventKeys === null) {
                throw "Event parameter key must be a string or an array of strings";
            }
            const replies = {};
            eventKeys.forEach(key => {
                if (_listeners.has(key)) {
                    const eventListeners = _listeners.get(key);
                    _txt(`Listener count for key ${key} is ${eventListeners.size}`);
                    eventListeners.forEach(on => {
                        if (replies[key] === undefined) {
                            replies[key] = [];
                        }

                        
                        if(event.serviceUpdate) {
                            _txt(`ServiceUpdate\n\tLISTENER:\n\t\tFrom:${on.event.from}\n\t\tkey:${on.event.key}\n\tEVENT\n\t\tFrom:${event.from}\n\t\tKey:${event.key}`);
                            if(on.event.from === event.from) {
                                replies[key].push(on.event.fn(event));
                            }
                        } else {
                            if(on.event.from === undefined || on.event.from === event.from) {
                                replies[key].push(on.event.fn(event));
                            }
                        }
                        
                    });
                }
            });
            return replies;
        }

        // // Broadcast event to all services and all listeners. Must have the from parameter defined and does not send to itself
        // if (event.broadcast === true && event.from !== undefined) {
        //     _services.forEach(service => {
        //         if (service.id !== event.from) {
        //             service.fn(event);
        //         }
        //     });
        //     const replies = [];
        //     _listeners.forEach(events => {
        //         events.forEach(on => {
        //             if (on.id !== event.from) {
        //                 replies.push(on.event.fn(event));
        //             }
        //         });
        //     });
        //     return replies;
        // }
    }

    function listeners() {
        const eventKeys = Array.from(_listeners.keys());
        return eventKeys.map(key => {
            return {
                key: key,
                size: _listeners.get(key).size,
            };
        });
        // return Array.from(_listeners.keys());
    }

    /**
     * get and set options for Joki Instance
     * @param {*} key
     * @param {*} newValue
     */
    function options(key = null, newValue = undefined) {
        if (key == null && newValue == undefined) {
            return { ..._options };
        }

        if (typeof key === "string" && newValue === undefined) {
            return _options[key];
        }

        if (typeof key === "string" && newValue !== undefined) {
            _options[key] = newValue;
        }
    }

    function addService(service) {
        if (_services.has(service.id)) {
            throw `Service with ${service.id} already exists`;
        }
        if (service.fn === undefined || typeof service.fn !== "function") {
            throw `Service must have a messageHandler function stored to parameter 'fn'`;
        }
        if (service.id === undefined || typeof service.id !== "string") {
            throw `Service must have a unique id stored to parameter 'id'`;
        }
        _txt(`Added a new service with id ${service.id}`);
        _services.set(service.id, service);
    }

    function removeService(serviceId) {
        if (_services.has(serviceId)) {
            _txt(`Removed a service with id ${service.id}`);
            _services.delete(serviceId);
        }
    }

    function listServices() {
        return Array.from(_services.keys());
    }

    /**
     * Remove listener
     * @param {*} onId
     */
    function _off(eventKey, onId) {
        if (_listeners.has(eventKey)) {
            if (_listeners.get(eventKey).has(onId)) {
                _listeners.get(eventKey).delete(onId);
                if (_listeners.get(eventKey).size === 0) {
                    _listeners.delete(eventKey);
                    _txt(`Removed the last listener ${onId} from event ${eventKey}`);
                } else {
                    _txt(`Removed listener ${onId} from event ${eventKey}`);
                }
            }
        }
    }

    function _txt(msg, subcategory = "Debug") {
        if (_options.debug === true) {
            console.debug(`Joki:${subcategory}: ${msg}`);
        }
    }

    return {
        ask,
        on,
        trigger,
        listeners,

        addService,
        removeService,
        listServices,

        options,
    };
}

export function createJokiOld(options = {}) {
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
        const subs = services.map(sub => {
            return { id: sub.id };
        });
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
            if (typeof sub.action === "function" && sub.id !== sender) {
                sub.action(sender, msg, eventKey);
            }
        });
    }

    function sendMessageToSubscriber(subscriberId, sender, msg, eventKey) {
        txt(`${sender} sends a message to service ${subscriberId} with event key ${eventKey}`);
        const subscriber = services.find(sub => sub.id === subscriberId);
        if (typeof subscriber.action === "function" && subscriber.id !== sender) {
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

    function oneTimeListener(listenerFn, eventKey, id = null) {
        if (eventKey === undefined) {
            throw "When listening one time event an eventKey is mandatory";
        }
        txt(`Listening for event ${eventKey} once`);
        const lid = listenMessages(
            (sender, msg, eventKey) => {
                const data = listenerFn(sender, msg, eventKey);
                clearListener(lid);
                return data;
            },
            eventKey,
            id
        );
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
        _isJoki: confirmThatThisAJokiInstance,
    };
}
