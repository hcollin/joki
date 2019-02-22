/**
 * Create a new Joki event listener.
 *
 *
 * @param {Object} [initialOptions={}]
 * @param {Boolean} initialOptions.debug - If set to true will write a LOT of debug data to console.
 * @param {Boolean} initialOptions.noInit - If set to true no initialization events are sent to services
 * @returns {Object} The Joki object that handles the services and events.
 */
function createJoki(initialOptions = {}) {
    // All the options are here
    const _options = initialOptions;

    // All services are store to this map
    const _services = new Map();

    // All listeners are store to this map
    const _listeners = new Map();

    // This counter is used to generate unique ids for listeners.
    // TODO: Make this more robust and preferably something that can be changed with options.
    let idCounter = 0;

    // Contains internal states that changes the logic
    const _statuses = {
        firstInitDone: _options.noInit !== undefined ? _options.noInit : false,
    };

    /**
     * Triggers an event with the expectation of a return value
     *
     * @param {Object} event - Joki Event Object
     * @param {String} event.key - The event key to be triggered
     * @param {String} event.from - Who is sending this event
     * @param {String} event.to - Direct this event to this serviceId
     * @param {String} event.body - The data sent with this event
     * @param {Boolean} [event.syncAsk=false] - If set to true will make a synchronous call, otherwise will return a promise
     * @returns {(Promise|Object|Array)} - Returns an array or object depending if the event had property 'to' set or not. Promise will resolve with return value as an argument.
     */
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

    /**
     * Subscribe a listener to Joki
     *
     * @param {Object} event - The listener object used to listen for triggered events.
     * @param {(String|Array)} key - This listener is triggered by events with this key (or keys if provided in array)
     * @param {String} from - Triggered by events sent by this source (usually serviceId)
     * @param {Function} fn - Handler function that is triggered. This function takes the event object that triggers it as an argument.
     * @returns {Function} - Returns an anonymous function that when called removes the listener subscription from Joki.
     */
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

        const onId = `on-${idCounter++}`;

        _listeners.set(onId, event);

        return () => {
            _off(onId);
        };
    }

    /**
     * Send an event to the Joki
     *
     * NOTICE! Even though trigger returns values, they should not be used. If the return values are needed us the function ask.
     *
     * @param {Object} event - Joki Event Object
     * @param {String} event.key - The event key to be triggered
     * @param {String} event.from - Who is sending this event
     * @param {String} event.to - Direct this event to this serviceId
     * @param {String} event.body - The data sent with this event
     * @returns {(Object|Array)} Returns an array of replies from the listeners or and Object of replies from services if the event contained 'to' property
     */
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

        const replies = [];
        _listeners.forEach(on => {
            _txt(`Listener ${on.from} ${on.key} ${on.to}`);
            let match = true;
            // Not really working yet.

            if (on.from !== undefined && event.from !== on.from) {
                match = false;
            }

            if (on.key !== undefined && event.key !== on.key) {
                match = false;
            }

            _txt(
                `\nON: F:${on.from} K:${on.key} T:${on.to}\nEV: F:${event.from} K:${event.key} T:${
                    event.to
                }\n\tMatch? ${match ? "YES" : "NO"}\n`
            );

            if (match) {
                replies.push(on.fn(event));
            }
        });

        return replies;
    }

    /**
     * List of the current listeners registered
     * @returns {Array} - Array contains one object for each registered listener with arguments key and from
     */
    function listeners() {
        return Array.from(_listeners.values()).map(on => {
            return {
                key: on.key,
                from: on.from,
            };
        });
    }

    /**
     * Get and set options for Joki Instance
     * @param {String} key - The option to be changed
     * @param {*} newValue - The value to be set for the value
     * @returns {*} Either the current option of the provided key or if not provided an Object with all key/value pairs currently set
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

    /**
     * Add a new service to Joki
     * @param {Object} service - Parameters for this service
     * @param {String} service.id - Unique ID for this service that can be used in events.Array
     * @param {Function} service.fn - The incoming event handler for this service
     */
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

        service.initialized = _options.noInit === true;
        _txt(`Added a new service with id ${service.id}`);
        // console.log("JOKI:service:added", service.id);
        _services.set(service.id, service);

        if(_statuses.firstInitDone === true) {
            _initializeService(service.id);
        }
        
    }

    /**
     * Remove service from Joki
     * @param {String} serviceId - The id of the service to be removed
     */
    function removeService(serviceId) {
        if (_services.has(serviceId)) {
            _txt(`Removed a service with id ${service.id}`);
            _services.delete(serviceId);
        }
    }

    /**
     * Return an array of serviceIds registered to Joki
     * @returns {Array}
     */
    function listServices() {
        return Array.from(_services.keys());
    }

    /**
     * Send initialize event to all registered services, if it hasn't been done yet.
     * 
     * @param {Object} [data={}] - Data Object included into the initialization body
     */
    function initServices(data={}) {
        if (_statuses.firstInitDone === false) {
            _services.forEach((service, serviceId) => {
                _initializeService(serviceId, data);
            });
            _statuses.firstInitDone = true;
        }
    }

    function _initializeService(serviceId, data={}) {
        if (_services.has(serviceId)) {
            const service = _services.get(serviceId);
            if (service.initialized !== true) {
                service.initialized = true;
                service.fn({
                    from: "JOKI",
                    key: "initialize",
                    body: data,
                });
            }
        }
    }

    /**
     * Remove a listener with Id
     * @param {String} onId
     * @private
     */
    function _off(onId) {
        if (_listeners.has(onId)) {
            _listeners.delete(onId);
            _txt(`Removed listener ${onId}`);
        }
    }

    /**
     * Writes a message to the console if the option.debug is set to true
     *
     * @param {String} msg - The message to be written to the console
     * @param {String} [subcategory="Debug"] - The Debug subCategory can be replaced with something else.
     */
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
        initServices,

        options,
    };
}

// import connectJoki from "./joki/connectJoki";

// import ClassService from "./services/ClassService";
// import createReducerService from "./services/reducerService";
// import createFetchService from "./services/fetchService";

// import { useListenJokiEvent, useListenJokiService, trigger } from "./react/hooks";

const identifier = "0.6.1";

export { createJoki, identifier };
