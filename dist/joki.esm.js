import 'react';

function createJoki(initialOptions = {}) {
    const _options = initialOptions;

    const _services = new Map();
    const _listeners = new Map();

    let idCounter = 0;

    function ask(event) {
        _txt(`Ask from ${event.from} about ${event.key}`);

        if(event.syncAsk === true) {
            return trigger(event);
        }

        return new Promise((resolve, reject) => {
            try {
                const replies = trigger(event);
                resolve(replies);
            } catch(err) {
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

        const eventKey = event.key === undefined ? "all" : typeof event.key === "string" ? event.key : null;

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
        _txt(`Trigger an event with key ${event.key} to ${event.to === true ? "all services" : event.to}`);
        // Only trigger a service
        if (event.to !== undefined) {
            const serviceIds = typeof event.to === "string" ? [event.to] : Array.isArray(event.to) ? event.to : event.to === true ? Array.from(_services.keys()) :null;
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
                    eventListeners.forEach(on => {
                        if(replies[key] === undefined) {
                            replies[key] = [];
                        }
                        replies[key].push(on.event.fn(event));
                    });
                }
            });
            return replies;
        }

        // Broadcast event to all services and all listeners. Must have the from parameter defined
        if (event.broadcast === true && event.from !== undefined) {
            _services.forEach(service => {
                service.fn(event);
            });
            const replies = [];
            _listeners.forEach(events => {
                events.forEach(on => {
                    replies.push(on.event.fn(event));
                });
            });
            return replies;
        }
    }

    function listeners() {
        const eventKeys = Array.from(_listeners.keys());
        return eventKeys.map(key => {
            return {
                key: key,
                size: _listeners.get(key).size
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
            throw `Service must have a messageHandler function stored to parameter 'key'`;
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

const identifier = "0.6.0-alpha";

export { createJoki, identifier };
