/**
 * Create a new Joki event listener.
 *
 *
 * @param {Object} [initialOptions={}]
 * @param {Boolean} initialOptions.debug - If set to true will write a LOT of debug data to console.
 * @param {Boolean} initialOptions.debugWithWarns - uses console.warn instead of console.debug. Main reason for this is showing logging information when running jest
 * @param {Boolean} initialOptions.noInit - If set to true no initialization events are sent to services
 * @param {Boolean} initialOptions.noLongKey - If set to true, longKey is NOT generated for each event. This may help with performance.
 * @returns {Object} The Joki object that handles the services and events.
 */
function createJoki(initialOptions = {}) {
    // All the options are here
    const _options = initialOptions;

    // All services are store to this map
    const _services = new Map();

    // All listeners are store to this map
    const _listeners = new Map();
    const _initializingListeners = [];

    // This counter is used to generate unique ids for listeners.
    // TODO: Make this more robust and preferably something that can be changed with options.
    let idCounter = 0;

    // Contains internal states that changes the logic
    const _statuses = {
        firstInitDone: _options.noInit !== undefined ? _options.noInit : false,
    };

    
    let jokiDevToolsActive = false;


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
        _txt(`Ask from ${event.from} about ${event.key}`, event.debug);
        event._ask = true;
        _sendEventToDevTool(event);
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
     * Add a subscriber to Joki
     *
     * @param {Object} event - The subscriber object used to listen for triggered events.
     * @param {(String|Array)} key - This listener is triggered by events with this key (or keys if provided in array)
     * @param {String} from - Triggered by events sent by this source (usually serviceId)
     * @param {Function} fn - Handler function that is triggered. This function takes the event object that triggers it as an argument.
     * @returns {Function} - Returns an anonymous function that when called removes the listener subscription from Joki.
     */
    function on(event) {
        // If keys is an array, each key will have a separate listener
        if (Array.isArray(event.key)) {
            _txt(`event.key is an Array with ${event.key.length} keys in it`, event.debug);
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

        _txt(
            `New listener created for with ${event.key ? "key " + event.key : ""} ${
                event.from ? "from: " + event.from : ""
            } `,
            event.debug
        );
        _listeners.set(onId, event);

        return () => {
            _off(onId, event);
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
            }\n\tbody length: ${event.body !== undefined ? event.body : "N/A"}`, event.debug
        );
        
        _addLongKeyToEvent(event);
        event._ask !== true && _sendEventToDevTool(event);
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
            _txt(`Listener ${on.from} ${on.key} ${on.to}`, event.debug);
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
                }\n\tMatch? ${match ? "YES" : "NO"}\n`, event.debug
            );

            if (match) {
                replies.push(on.fn(event));
            }
        });

        return replies;
    }

    /**
     * Send an event to all services currently registered and listeners with listeners for this broadcast eventKey.
     *
     * This function should be used when a system wide event needs to be processed (like logout, initialize etc.).
     * Please be careful of the keys used to trigger broadcast events so that the services do not confuse these
     * general events to their specific events. A broadcast key is added to the event and set to true that can be
     * checked in the service if necessary.
     *
     * Broadcast events NEVER return anything. If a response for broadcast is expected a separate listener must be
     * created and triggered from the services by hand. The reason for this is to minimize infinite loop situations.
     *
     * The from field is a mandatory for broadcast events.
     *
     * @param {Object} event - Joki Event Object
     * @param {String} event.key - The event key to be triggered
     * @param {String} event.from - Who is sending this event. Mandatory in broadcasts.
     * @param {Boolean} event.servicesOnly - If set to true will not trigger listeners outside services
     * @param {String} event.body - The data sent with this event
     */
    function broadcast(event) {
        if (event.key === undefined || event.key === null || typeof event.key !== "string") {
            _txt(`Broadcast from ${event.from} event missing the key parameter.`, event.debug);
            return;
        }
        if (event.from === undefined || event.from === null || typeof event.from !== "string") {
            _txt(`Broadcast with key ${event.key} event missing the from parameter.`, event.debug);
            return;
        }
        _txt(
            `Broadcast event from ${event.from} to key ${event.key} ${
                event.servicesOnly === true ? "to services only" : ""
            }`, event.debug
        );

        event.broadcast = true; // This will be depracated later on.
        event._broadcast = true;
        _addLongKeyToEvent(event);
        !event._jokiServiceUpdate && _sendEventToDevTool(event);
        _services.forEach(service => {
            service.fn(event);
        });

        if (event.servicesOnly !== true) {
            _listeners.forEach(on => {
                if (on.key === event.key && (on.from === undefined || on.from === event.from)) {
                    on.fn(event);
                }
            });
        }
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
            throw new Error(`Service with ${service.id} already exists`);
        }
        if (service.fn === undefined || typeof service.fn !== "function") {
            throw new TypeError(`Service must have a messageHandler function stored to parameter 'fn'`);
        }
        if (service.id === undefined || typeof service.id !== "string") {
            throw new TypeError(`Service must have a unique id stored to parameter 'id'`);
        }

        service.initialized = _options.noInit === true;
        _txt(`Added a new service with id ${service.id}`, service.debug);
        // console.log("JOKI:service:added", service.id);
        _services.set(service.id, service);
        _sendServiceToDevTool(service, "serviceNew");

        if (_statuses.firstInitDone === true) {
            _initializeService(service.id);
        }
    }

    /**
     * Remove service from Joki
     * @param {String} serviceId - The id of the service to be removed
     * @param {boolean} [debug=false] - debug this call
     */
    function removeService(serviceId, debug=false) {
        if (_services.has(serviceId)) {
            _txt(`Removed a service with id ${serviceId}`, debug);
            _sendServiceToDevTool({serviceId: serviceId}, "serviceRemove");
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
     * Also send initialize event to all listeners
     * 
     * @param {Object} [data={}] - Data Object included into the initialization body
     */
    function initServices(data = {}) {
        if (_statuses.firstInitDone === false) {
            _services.forEach((service, serviceId) => {
                _initializeService(serviceId, data);
            });

            while(_initializingListeners.length > 0) {
                const cb = _initializingListeners.pop();
                cb(data);
            }

            _statuses.firstInitDone = true;
        }
    }

    function _initializeService(serviceId, data = {}) {
        if (_services.has(serviceId)) {
            const service = _services.get(serviceId);
            if (service.initialized !== true) {
                service.initialized = true;
                service.fn({
                    from: "JOKI",
                    key: "initialize",
                    body: data,
                });
                _sendServiceToDevTool({serviceId: serviceId, data: data}, "serviceInitialize");
            }
        }
    }

    /**
     * Allows initialization callbacks outside services.
     * 
     * Will throw an error if noInit option has been set to true.
     * 
     * @param {function} callback - The callback that is called when the initServices() function is called
     */
    function onInitialize(callback) {

        if(_options.noInit === true) {
            throw new Error("Joki options 'noInit' has been set to true, initialization cannot be executed.");
        }

        if(typeof callback !== "function") {
            throw new Error("Callback parameter for onInitialize must be a function.");
        }

        if(!_statuses.firstInitDone) {
            _initializingListeners.push(callback);
        } else {
            
            _txt(`Joki has been initialized already.`, false);
        }
        
    }

    function serviceUpdate(serviceId, newData, customEventObjectParams=false) {
        const event = Object.assign({}, {
            from: serviceId,
            key: "serviceUpdate",
            _jokiServiceUpdate: true,
            body: newData
        }, customEventObjectParams !== false ? customEventObjectParams : {});

        broadcast(event);

        if(jokiDevToolsActive) {
            // window.postMessage({type: "JOKI", state: "serviceUpdate", serviceId: serviceId, serviceData: JSON.stringify(event)}, "*");
            _sendServiceToDevTool(event, "serviceUpdate");
        }

    }

    /**
     * Remove a listener with Id
     * @param {String} onId
     * @param {Object} event - The full event
     * @private
     */
    function _off(onId, event) {
        if (_listeners.has(onId)) {
            _listeners.delete(onId);
            _txt(`Removed listener ${onId}`, event.debug);
        }
    }

    /**
     * Creates a long single string key for the event
     * @param {*} event
     */
    function _addLongKeyToEvent(event) {
        if (_options.noLongKey === true) return event;
        const toStr = event.to ? (Array.isArray(event.to) ? event.to.join("|") + ":" : event.to + ":") : "";
        event.longKey = `${event.from ? event.from + ">" : ""}${event.broadcast ? "BC>" : ""}${toStr}${
            event.key ? event.key : ""
        }`;
        return event;
    }

    /**
     * Writes a message to the console if the option.debug is set to true
     *
     * @param {String} msg - The message to be written to the console
     * @param {boolean} [forceShow=false] - Show debug info, even when debugging is turned off (for debugging single events)
     */
    function _txt(msg, forceShow = false) {
        if (_options.debug === true || forceShow) {
            if(_options.debugWithWarns) {
                console.warn(`Joki:${forceShow}: ${msg}`);
            } else {
                console.debug(`Joki:${forceShow}: ${msg}`);
            }
            
        }
    }

    /**
     * Send this event to JOKI Developer Tool with window.postMessage
     * @param {*} event 
     */
    function _sendEventToDevTool(event) {
        if(jokiDevToolsActive && window.postMessage !== undefined) {
            try {
                window.postMessage({type: "JOKI", state: "event", eventData: JSON.stringify(event)}, "*");
            } catch(err) {
                console.error("Failed to send a message to Joki Developer Tool", err);
                console.log(jokiDevToolsActive);
                console.log(window);
                console.log(event);
            }
            
        }
    }

    /**
     * Send this event to JOKI Developer Tool with window.postMessage
     * @param {*} event 
     */
    function _sendServiceToDevTool(service, state="service") {
        if(jokiDevToolsActive && window.postMessage !== undefined) {
            try {
                window.postMessage({type: "JOKI", state: state, data: JSON.stringify(service)}, "*");
            } catch(err) {
                console.error("Failed to send a message to Joki Developer Tool", err);
                console.log(jokiDevToolsActive);
                console.log(window);
                console.log(event);
            } 
        }
    }

    // Connect Joki Developer Tool if it is present
    if(window !== undefined) {
        const devToolMessageHandler = (event) => {
            if(event.data.type==="JOKI_DEVELOPER_TOOL" && event.data.state === "initialize") {
                console.log("Joki Development Tool is present!");
                jokiDevToolsActive = true;
                window.postMessage({type: "JOKI", state: "initialize", data: {
                    services: Array.from(_services.values()).map(srv => {
                        return {
                            id: srv.id,
                            initialized: srv.initialized
                        };
                    })
                }}, "*");
            }

            if(jokiDevToolsActive === true && event.data.type === "JOKI_DEVELOPER_TOOL" && event.data.state === "getServices") {
                const servicesData = Array.from(_services.values()).map(srv => {
                    const cState = srv.fn({to: srv.id, key: "getState"});
                    return {
                        if: srv.id,
                        state: cState
                    };
                });
                window.postMessage({type: "JOKI", state: "services", data: JSON.stringify(servicesData)}, "*");
            }

        };
        window.addEventListener("message", devToolMessageHandler);
    }


    return {
        ask,
        on,
        trigger,
        listeners,
        broadcast,

        addService,
        removeService,
        listServices,
        initServices,
        onInitialize,

        serviceUpdate,

        options,

        isJokiInstance: true,
    };
}

function createMockService(jokiInstance, serviceId, eventHandlers={}) {

    if(!jokiInstance.isJokiInstance) {
        throw new TypeError("The first argument for createMockService must be a valid Joki instance");
    }

    if(typeof serviceId !== "string") {
        throw new TypeError("The second argument for createMockService must a unique ServiceId as a string");
    }

    const joki = jokiInstance;
    
    function eventHandler(event) {
        if(eventHandlers[event.key] !== undefined) {
            const handler = eventHandlers[event.key];
            if(typeof handler === "function") {
                const returnValue = handler(event);
                if(returnValue !== undefined) {
                    triggerUpdate(returnValue);    
                }
                return returnValue;
                
            }
            
            return triggerUpdate(handler);            
        }
    }

    function triggerUpdate(data) {
        joki.trigger({
            from: serviceId,
            key: "ServiceUpdate",
            serviceUpdate: true,
            body: data
        });
        return data;
    }

    joki.addService({
        id: serviceId,
        fn: eventHandler
    });

}

const identifier = "0.9.4";

export { createJoki, createMockService, identifier };
