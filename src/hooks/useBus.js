import { useState, useEffect } from "react";

export function useListenBus(bus, options = {}) {
    const [data, updateData] = useState({ data: null, sender: null, eventKey: null });
    const [listening, setListening] = useState(false);

    const targetEventKey = options.eventKey !== undefined ? options.eventKey : undefined;
    const targetSender = options.sender !== undefined ? options.sender : undefined;

    useEffect(() => {
        if (listening !== true) {
            setListening(true);

            const listenerId = bus.listen((sender, msg, eventKey) => {
                const eventKeyMatch = targetEventKey === undefined || targetEventKey === eventKEy ? true : false;
                const senderMatch = targetSender === undefined || targetSender === sender ? true : false;

                if (eventKeyMatch && senderMatch) {
                    updateData({ data: msg, sender: sender, eventKey: eventKey });
                }
            }, targetEventKey);

            return () => {
                bus.stop(listenerId);
            };
        }
    });

    return [data];
}
