import { useState, useEffect } from 'react';

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
     */
    function sendMessage(event) {
        const {from, to, body, eventKey } = event;
        txt(`${from} sends a message with eventKey ${event.eventKey}.`);
        if (eventKey !== null) {
            if (listeners[eventKey] === undefined) {
                listeners[eventKey] = [];
            }
            listeners[eventKey].forEach(listener => {
                listener.fn(event);
            });
        }
        listeners.all.forEach(listener => {
            listener.fn(event);
        });
        services.forEach(sub => {
            if(typeof sub.action === "function" && sub.id !== event.from) {
                sub.action(event);
            }
        });
    }

    function sendMessageToSubscriber(event) {
        const {from, to, body, eventKey } = event;
        txt(`${from} sends a message to service ${to} with event key ${eventKey}`);
        const subscriber = services.find(sub => sub.id === to);
        if(typeof subscriber.action === "function" && subscriber.id !== from) {
            subscriber.action(event);
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
        sendMessage({from: serviceId, eventKey: "_SERVICEUPDATED_"});
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

    function removeJokiConnection(bus) {
        txt(`Remove Subscribtion ${serviceId}`);
        if(jokiInstance !== null) {
            jokiInstance.unSubscribeServiceProvider(serviceId);
            jokiInstance = null;
        }
    }

    function sendMessageToJoki(event) {
        txt(`Send message with key ${event.eventKey} by ${serviceId}`);
        event.from = serviceId;
        jokiInstance.send(event);
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

    function handleMessage(event) {
        reducerRunner({type: event.eventKey, data: event.body});
    }

    function reducerRunner(action) {
        
        const newData = reducer(data, action);
        if(newData !== undefined) {
            data = newData;
            joki.updated();
        }
    }

    return {
        getState: getState,
        action: reducerRunner,
    }
}

function useListenJokiEvent(jokiInstance, options = {}) {
    const [eventData, updateData] = useState({ data: null, sender: null, eventKey: null });

    const targetEventKey = options.eventKey !== undefined ? options.eventKey : undefined;
    const targetSender = options.sender !== undefined ? options.sender : undefined;

    useEffect(() => {
        const listenerId = jokiInstance.listen((sender, msg, eventKey) => {
            const eventKeyMatch = targetEventKey === undefined || targetEventKey === eventKey ? true : false;
            const senderMatch = targetSender === undefined || targetSender === sender ? true : false;

            if (eventKeyMatch && senderMatch) {
                updateData({ data: msg, sender: sender, eventKey: eventKey });
            }
        }, targetEventKey);

        return () => {
            jokiInstance.stop(listenerId);
        };
    });

    return [eventData];
}

function useListenJokiService(jokiInstance, serviceId) {
    const [data, updateServiceData] = useState({ data: jokiInstance.getService(serviceId), listenerId: null });

    useEffect(() => {
        if (data.listenerId === null) {
            const listenerId = jokiInstance.listen((event) => {
                if (event.eventKey === "_SERVICEUPDATED_" && event.from === serviceId) {
                    const newData = { data: jokiInstance.getService(serviceId), listenerId: data.listenerId };
                    updateServiceData(newData);
                }
            }, serviceId);

            updateServiceData({ data: data.data, listenerId: listenerId });
        }

        return () => {
            if (data.listenerId !== null) {
                jokiInstance.stop(data.listenerId);
            }
        };
    });

    return [data.data];
}

function trigger(jokiInstance, event) {
    
    event.from = event.from !== undefined ? event.from : "react-trigger";
    
    // Event to be sent must have either 'to' or 'eventKey' defined
    if(event.to === undefined && event.eventKey === undefined) {
        throw "Event must defined either a target for the event with 'to' or an 'eventKey'";
    }
    
    // event.eventKey = event.eventKey !== undedefined ?  event.eventKey : "all";
    // const eventKey = event.eventKey !== undefined ? event.eventKey : "all";
    
    // const msg = event.data !== undefined ? event.data : event.msg !== undefined ? event.msg : {};
    // const serviceId = event.serviceId !== undefined ? event.serviceId : null;
    return jokiInstance.send(event);
}

export { createJoki, connectJoki, ClassService, createReducerService, useListenJokiEvent, useListenJokiService, useListenJokiEvent as useEvent, useListenJokiService as useService, trigger };
