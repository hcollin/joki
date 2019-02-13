import createBusConnection from "../serviceClass/createBusConnection";

export default function createFetchService(serviceId, busStore, options) {
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

    const defaultHeaders = headers;

    const bus = createBusConnection(serviceId, getState, handleMessage);
    bus.setBus(busStore);

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
