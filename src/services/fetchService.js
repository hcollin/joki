
import createBusConnection from "../serviceClass/createBusConnection";

export default function createFetchService(serviceId, busStore, options) {


    const { url, format, ...rest } = Object.assign({}, { 
        format: "json",
        getEventKey: `${serviceId}-GET`,
        postEventKey: `${serviceId}-GET`,
        putEventKey: `${serviceId}-PUT`,
        deleteEventKey: `${serviceId}-DELETE`,
    }, options);
    
    
    
    const bus = createBusConnection(serviceId, getState, handleMessage);
    bus.setBus(busStore);

    const callHistory = [];


    function getState() {
        if(callHistory.length > 0) {
            return callHistory[0];
        }
        return {};
    }

    function handleMessage(sender, msg, eventKey) {
        const { params, urlExtension, data, responseEventKey } = msg;
        
        switch( eventKey ) {
            case rest.getEventKey:
                sendFetch(params, urlExtension, data, "GET", responseEventKey);
                break;
            case rest.postEventKey:
                sendFetch(params, urlExtension, data, "POST", responseEventKey);
                break;
            case rest.putEventKey:
                sendFetch(params, urlExtension, data, "PUT", responseEventKey);
                break;
            case rest.deleteEventKey:
                sendFetch(params, urlExtension, data, "DELETE", responseEventKey);
                break;
            default:
                break;
        }
    }
    
    function _fetch(url, fetchParams={}, data=null) {
        return new Promise((resolve, reject) => {

            if(data!==null && fetchParams.method === "POST") {
                fetchParams.body = data;
            }

            fetch(url, fetchParams).then(response => {
                switch(format) {
                    case "json":
                    default:
                        resolve(response.json());
                        break;
                }   
            }).catch(err => {
                reject(err);
            });
        });
    }

    function _addToCallHistory(results) {
        callHistory.unshift(results);
    }

    function sendFetch(params, urlExtension ="", data=null, method="GET", predefinedFetchId=null) {
        const fetchId = predefinedFetchId !== null ? predefinedFetchId : `${Date.now()}-${Math.round(Math.random()*10000)}`;
        
        _fetch(urlParamParser(url, urlExtension, params), {method: "GET", body: data}).then(results => {
            receiveResults(results, fetchId);
        });

        return fetchId;
    }

    

    function receiveResults(results, fetchId=null) {
        bus.send(results, fetchId);
    }
    

    function urlParamParser(url, urlExtension="", params) {
        
        return `${url}${urlExtension}`;
    }

    function fetchGET(options) {
        const { params, urlExtension, data, triggerEvent } = Object.assign({}, {triggerEvent: true, urlExtension: ""}, options);
        
        return new Promise((resolve, reject) => {
            _fetch(urlParamParser(url, urlExtension, params))
                .then((results) => {
                    if(triggerEvent) {
                        setTimeout(() => { 
                            receiveResults(results, 'FETCH-GET');
                        }, 0);
                    }

                    resolve(results);
                }).catch( err => {
                    reject(err);
                });
        });

    }

    function fetchPOST(options) {
        const { params, urlExtension, data, triggerEvent } = Object.assign({}, {triggerEvent: true, urlExtension: ""}, options);
        return new Promise((resolve, reject) => {
            _fetch(urlParamParser(url, urlExtension, params), {method: "POST"}, data)
                .then((results) => {
                    if(triggerEvent) {
                        setTimeout(() => { 
                            receiveResults(results, 'FETCH-POST');
                        }, 0);
                    }
                    resolve(results);
                }).catch( err => {
                    reject(err);
                });
        });
    }
    


    return {
        rawFetch: sendFetch,
        get: fetchGET,
        post: fetchPOST

    }
}