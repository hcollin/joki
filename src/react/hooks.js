import React, { useState, useEffect } from "react";

export function useListenJokiEvent(jokiInstance, options = {}) {
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

export function useListenJokiService(jokiInstance, serviceId) {
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

export function trigger(jokiInstance, event) {
    
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

