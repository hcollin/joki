import { useState, useEffect } from "react";

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
            const listenerId = jokiInstance.listen((sender, msg, eventKey) => {
                if (msg === "UPDATE" && eventKey === serviceId) {
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

export function trigger(jokiInstance, options = {}) {
    const sender = options.sender !== undefined ? options.sender : "unknown-react-component";
    const eventKey = options.eventKey !== undefined ? options.eventKey : "all";
    const msg = options.data !== undefined ? options.data : options.msg !== undefined ? options.msg : {};
    const serviceId = options.serviceId !== undefined ? options.serviceId : null;
    if (serviceId !== null) {
        return sendToService(jokiInstance, serviceId, sender, msg, eventKey);
    }
    return sendToBus(jokiInstance, sender, msg, eventKey);
}

function sendToBus(jokiInstance, sender, msg, eventKey) {
    jokiInstance.send(sender, msg, eventKey);
}

function sendToService(jokiInstance, serviceId, sender, msg, eventKey) {
    jokiInstance.action(serviceId, sender, msg, eventKey);
}
