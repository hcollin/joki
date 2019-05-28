

export default function createMockService(jokiInstance, serviceId, eventHandlers={}) {

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
    })

}