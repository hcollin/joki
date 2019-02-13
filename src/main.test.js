const {
    createBusStore,
    createBusConnection,
    ClassService,
    createReducerService,
    createFetchService,
} = require("../dist/busstore.cjs.js");

describe("Testing createBusStore", () => {
    class Service {
        constructor(serviceId) {
            this.bus = createBusConnection(serviceId, this.getState.bind(this), this.incoming.bind(this));
            this.data = {
                counter: 0,
                users: [],
            };
            this.serviceId = serviceId;
        }

        setBus(bus) {
            this.bus.setBus(bus);
        }

        testMessage() {
            this.bus.send("HELLO", "test-service");
        }

        getState() {
            return this.data;
        }

        incoming(sender, message, eventKey) {
            expect(message).toBe("HELLO");
            expect(sender).not.toBe(this.serviceId);
        }
    }

    it("Send messages to listener ", () => {
        const AppBus = createBusStore();

        const listId = AppBus.listen((sender, msg, eventKey) => {
            expect(eventKey).toBe("test");
        }, "test");

        expect(listId).toBe("listener-0");
        expect(AppBus.getEventKeys()).toEqual(["all", "test"]);
        expect(AppBus._getListeners("test").length).toBe(1);

        AppBus.send("test-suite", 0, "test");
        AppBus.send("test-suite", 1, "test");

        AppBus.stop(listId);

        expect(AppBus._getListeners("test").length).toBe(0);
    });

    it("Create multiple listeners and remove one", () => {
        const AppBus = createBusStore();
        // AppBus.debug(true);
        const lids = [];

        lids.push(AppBus.listen((s, m, e) => {}, "test"));

        lids.push(AppBus.listen((s, m, e) => {}, "test-too"));

        lids.push(AppBus.listen((s, m, e) => {}, "test-again"));

        lids.push(AppBus.listen((s, m, e) => {}, "test"));

        expect(AppBus._getListeners("test-again").length).toBe(1);
        expect(AppBus._getListeners("test-too").length).toBe(1);
        expect(AppBus._getListeners("test").length).toBe(2);

        expect(AppBus.getEventKeys()).toEqual(["all", "test", "test-too", "test-again"]);
        expect(AppBus.getEventKeys()).toEqual(["all", "test", "test-too", "test-again"]);
        expect(lids).toEqual(["listener-0", "listener-1", "listener-2", "listener-3"]);
        AppBus.stop(lids.splice(2, 1));
        expect(lids).toEqual(["listener-0", "listener-1", "listener-3"]);
        expect(AppBus._getListeners("test-again").length).toBe(0);
    });


    it('Test one time listener', (done) => {
        const AppBus = createBusStore();

        AppBus.once((s, m, e) => {
            expect(m).toBe(true);
            expect(s).toBe("test-suite");
            expect(e).toBe("hello");
            done();
        }, "hello");

        AppBus.send("test-suite", true, "hello");

        expect.assertions(3);
    });

    it("Subscribe a service to Bus, using a class as a service", () => {
        const AppBus = createBusStore();

        const serv = new Service("test-service");
        serv.setBus(AppBus);

        // console.log(AppBus._getListeners());
        // console.log(AppBus.getService("test-service"));

        expect(AppBus.getService("test-service")).toEqual({ counter: 0, users: [] });

        AppBus.send("test-suite", "HELLO", "test-service");

        serv.testMessage();
    });

    it("Create multiple Services and communicate between them", () => {
        const AppBus = createBusStore();

        class SimpleService {
            constructor(id, bus) {
                this.bus = createBusConnection(id, this.getState.bind(this), this.incoming.bind(this));
                this.data = {};
                this.id = id;
                this.bus.setBus(bus);
            }

            getState() {
                return this.data;
            }

            incoming(s, m, e) {
                expect(s).not.toBe(this.id);
                if (e === this.id) {
                    this.data = {
                        sender: s,
                        message: m,
                        eventKey: e,
                    };
                    this.send("gamma", m);
                }
                if (this.id === "gamma" && e === "gamma") {
                    this.send("Done", "final");
                }
            }

            send(msg, ek) {
                this.bus.send(msg, ek);
            }
        }

        AppBus.listen((s, m, e) => {
            expect(s).toBe("gamma");
            expect(m).toBe("Done");
            expect(e).toBe("final");
        }, "final");

        const alpha = new SimpleService("alpha", AppBus);
        const beta = new SimpleService("beta", AppBus);
        const gamma = new SimpleService("gamma", AppBus);
        const delta = new SimpleService("delta", AppBus);

        alpha.send("delta", "beta");

        expect(beta.data.sender).toBe("alpha");
        expect(delta.data.sender).toBe("beta");
        expect(gamma.data.sender).toBe("delta");
    });
});

describe("Testing class service", () => {
    class MyService extends ClassService {
        constructor(busStore) {
            super({
                serviceId: "MyService",
                bus: busStore,
            });
            this.data = {
                counter: 0,
            };
        }

        getState() {
            return this.data.counter;
        }

        busHandler(sender, msg, eventKey) {
            switch (eventKey) {
                case "plus":
                    this.data.counter++;
                    break;
                case "minus":
                    this.data.counter--;
                    break;
                case "reset":
                    this.data.counter = 0;
                    break;
                case "set":
                    this.data.counter = msg;
                    break;
                default:
                    break;
            }
        }
    }

    it("Testing ClassService functionality separately", () => {
        const AppBus = createBusStore();
        const serv = new MyService(AppBus);
        expect(AppBus.services()).toEqual([{ id: "MyService" }]);
        expect(serv.getState()).toBe(0);
        serv.busHandler(null, 0, "plus");
        expect(serv.getState()).toBe(1);
        serv.busHandler(null, 0, "reset");
        expect(serv.getState()).toBe(0);
    });

    it("Testing ClassService via bus", () => {
        const AppBus = createBusStore();
        const serv = new MyService(AppBus);
        serv.busHandler(null, 5, "set");
        expect(serv.getState()).toBe(5);
        expect(AppBus.services()).toEqual([{ id: "MyService" }]);
        expect(AppBus.getService("MyService")).toBe(5);

        AppBus.send(null, 2, "set");
        expect(AppBus.getService("MyService")).toBe(2);
        AppBus.send(null, null, "plus");
        expect(AppBus.getService("MyService")).toBe(3);
    });
});

describe("reducerService testing", () => {
    it("testing the reducerService without bus", () => {
        const AppBus = createBusStore();
        const rstore = createReducerService("reducerStore", AppBus, { counter: 0 }, (state, action) => {
            switch (action.type) {
                case "plus":
                    return Object.assign({}, state, {
                        counter: state.counter + (action.number !== undefined ? action.number : 1),
                    });
                case "minus":
                    return Object.assign({}, state, {
                        counter: state.counter - (action.number !== undefined ? action.number : 1),
                    });
                default:
                    return state;
            }
        });

        expect(rstore.getState()).toEqual({ counter: 0 });
        rstore.action({
            type: "plus",
        });
        expect(rstore.getState()).toEqual({ counter: 1 });
        rstore.action({
            type: "plus",
            number: 4,
        });
        expect(rstore.getState()).toEqual({ counter: 5 });
    });

    it("reducerService with AppBus", () => {
        const AppBus = createBusStore();
        const rstore = createReducerService("reducerStore", AppBus, { counter: 0 }, (state, action) => {
            switch (action.type) {
                case "plus":
                    return Object.assign({}, state, {
                        counter: state.counter + (action.data.number !== undefined ? action.data.number : 1),
                    });
                case "minus":
                    return Object.assign({}, state, {
                        counter: state.counter - (action.data.number !== undefined ? action.data.number : 1),
                    });
                default:
                    return state;
            }
        });

        expect(AppBus.getService("reducerStore")).toEqual({ counter: 0 });
        AppBus.send(null, { number: 3 }, "plus");
        expect(AppBus.getService("reducerStore")).toEqual({ counter: 3 });
    });
});

describe("fetchService", () => {
    beforeEach(() => {
        fetch.resetMocks();
    });


    it("Fetch Get promise", done => {
        fetch.mockResponseOnce(JSON.stringify({ test: true }));
        const AppBus = createBusStore();

        const serv = createFetchService("testFetchService", AppBus, {
            url: "http://localhost/test/url",
            format: "json",
        });

        AppBus.once((sender, msg, eventKey) => {
            expect(msg.test).toBe(true);
            done();
        }, "FETCH-GET");

        serv.get({ urlExtension: "/myext" })
            .then(results => {
                expect(fetch.mock.calls[0][0]).toBe("http://localhost/test/url/myext");
                expect(fetch.mock.calls[0][1].method).toBe("GET");
                expect(fetch.mock.calls[0][1].header).toBe(undefined);
                
                expect(results.test).toBe(true);
            })
            .catch(err => {
                console.log("ERROR", err);
            });

        expect.assertions(5);
    });

    it("Fetch Post Promise", done => {
        fetch.mockResponseOnce(JSON.stringify({ test: true }));
        const AppBus = createBusStore();

        const serv = createFetchService("testFetchService", AppBus, {
            url: "http://localhost/test/url",
            format: "json",
        });

        AppBus.once((sender, msg, eventKey) => {
            // THIS PART SHOULD NEVER RUN WHEN triggerEvent IS SET TO TRUE
            expect(msg).toEqual({ test: true });
        }, "FETCH-POST");

        serv.post({ body: { myData: true }, triggerEvent: false, header: { auth: true} }).then(res => {
            expect(fetch.mock.calls[0][1].method).toBe("POST");
            expect(fetch.mock.calls[0][1].body).toEqual({ myData: true });
            expect(fetch.mock.calls[0][1].header).toEqual({ auth: true });
            expect(res).toEqual({test: true});
            done();
        });

        expect.assertions(4);
    });

    it("Send get Request via Bus", done => {
        fetch.mockResponseOnce(JSON.stringify({ test: true }));
        const AppBus = createBusStore();

        const serv = createFetchService("testFetchService", AppBus, {
            url: "http://localhost/test/url",
            format: "json",
            getEventKey: "BUS-FETCH-GET",
        });

        const responseId = "MyNiceGetRequest";

        AppBus.once((sender, msg, eventKey) => {
            expect(msg.test).toBe(true);
            expect(sender).toBe("testFetchService");
            expect(eventKey).toBe(responseId);
            expect(fetch.mock.calls[0][1].body).toEqual({bodydata: true});
            expect(fetch.mock.calls[0][1].header).toEqual({auth: true});
            done();
        }, responseId);

        AppBus.send(
            "test-suite",
            {
                responseEventKey: responseId,
                body: { bodydata: true },
                header: { auth: true }
            },
            "BUS-FETCH-GET"
        );
    });
});
