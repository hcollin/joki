(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.busstore = {})));
}(this, (function (exports) { 'use strict';

    function createJoki(options = {}) {
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
         * They send updates to the bus, when their data changes. They can also provide apis
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
            services.forEach(sub => {
                if(typeof sub.action === "function" && sub.id !== sender) {
                    sub.action(sender, msg, eventKey);
                }
            });
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
            _isJoki: confirmThatThisVariableIsABusStore
        };
    }

    function connectJoki(id, requestStateHandler=null, actionHandler=null) {

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

        function removeBusConnection(bus) {
            txt(`Remove Subscribtion ${serviceId}`);
            if(jokiInstance !== null) {
                jokiInstance.unSubscribeServiceProvider(serviceId);
                jokiInstance = null;
            }
        }

        function sendMessageToBus(msg, eventKey=null) {
            txt(`Send message with key ${eventKey} by ${serviceId}`);
            jokiInstance.send(serviceId, msg, eventKey);
        }

        function addListenerToBusEvent(handlerFn, eventKey=null) {
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
                console.debug(`BusStoreConnection:Debug: ${msg}`);
            }
        }


        txt(`Connection established with serviceId ${serviceId}`);
        return {
            set: setJokiInstance,
            clear: removeBusConnection,
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

            // if (options.joki === undefined) {
            //     console.error(
            //         "The ClassService constructor requires an option with key joki providing the Joki instance it uses."
            //     );
            //     throw "The ClassService constructor requires an option with key joki providing the Joki instance it uses.";
            // }

            const { serviceId, joki } = options;
            this._serviceId = serviceId;
            this.joki = connectJoki(this._serviceId, this.getState.bind(this), this.messageHandler.bind(this));
            
            if(options.joki !== undefined ) {
                this.connectToJoki(options.joki);
            }

        }

        connectToJoki(jokiInstance) {
            if (jokiInstance._isJoki() !== true) {
                console.error("The Joki provided is not a valid Joki Instance");
                throw("The Joki provided is not a valid Joki instance");
            }
            this.joki.set(jokiInstance);
        }

        getState() {
            throw "This function must be overridden in the service class inheriting from the ClassService. This function must return the current state of the service.";
        }

        messageHandler(sender, msg, eventKey) {
            throw "This function must be overridden in the service class inheriting from the ClassService. This function handles incoming messages from the Joki.";
        }

        sendToJoki(msg, eventKey = null) {
            if (this.joki !== null) {
                this.joki.send(msg, eventKey);
            }
            
        }
    }

    function createReducerService(id, jokiInstance, initState={}, reducerFunction=null) {

        const serviceId = id;
        let data = initState;
        const joki = connectJoki(serviceId, getState, handleMessage);

        if(jokiInstance._isJoki() !== true) {
            throw(jokiInstance);
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

        const bus = connectJoki(serviceId, getState, handleMessage);
        bus.setJoki(busStore);

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

        function _addToCallHistory(results) {
            callHistory.unshift(results);
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
            _addToCallHistory(results);
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

    exports.createJoki = createJoki;
    exports.connectJoki = connectJoki;
    exports.ClassService = ClassService;
    exports.createReducerService = createReducerService;
    exports.createFetchService = createFetchService;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
