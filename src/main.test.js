const {
    createJoki,
    // connectJoki,
    // ClassService,
    // createReducerService,
    // createFetchService,
} = require("../dist/joki.cjs.js");

describe("createJoki 0.6", () => {
    it("Test that createJoki funtion has valid api", () => {
        const joki = createJoki();
        expect(typeof joki.on).toBe("function");
        expect(typeof joki.trigger).toBe("function");
        expect(typeof joki.ask).toBe("function");
        expect(typeof joki.addService).toBe("function");
        expect(typeof joki.removeService).toBe("function");
        expect(typeof joki.listServices).toBe("function");
        expect(typeof joki.options).toBe("function");
    });

    it("createJoki options Api", () => {
        const joki = createJoki({
            foo: "bar",
        });

        joki.options("alpha", "omega");
        expect(joki.options("foo")).toBe("bar");
        expect(joki.options("alpha")).toBe("omega");
        expect(joki.options()).toEqual({ foo: "bar", alpha: "omega" });
    });

    it("Create an event listener and trigger it", done => {
        const joki = createJoki();

        const unsubscribe = joki.on({
            key: "test",
            fn: event => {
                expect(event.body).toEqual({ foo: "bar" });
                done();
            },
        });

        expect(typeof unsubscribe).toBe("function");

        joki.trigger({
            key: "test",
            body: {
                foo: "bar",
            },
        });
    });

    it("Create and remove a listener", () => {
        const joki = createJoki();

        const unsubscribe = joki.on({
            key: "test",
            fn: event => true,
        });

        expect(joki.listeners()).toEqual([{ key: "test", size: 1 }]);

        unsubscribe();

        expect(joki.listeners().length).toBe(0);
    });

    it("Register same event to multiple keys, trigger one event and remove listener", () => {
        const joki = createJoki();

        const unsubscribe = joki.on({
            key: ["alpha", "beta", "gamma"],
            fn: event => {
                if (event.key === "beta") {
                    expect(event.body).toBe("foo");
                }

                if (event.key === "alpha") {
                    expect(event.body).toBe("bar");
                }
            },
        });

        expect(joki.listeners().length).toBe(3);

        joki.trigger({
            key: "beta",
            body: "foo",
        });

        joki.trigger({
            key: "alpha",
            body: "bar",
        });

        unsubscribe();

        expect(joki.listeners().length).toBe(0);

        expect.assertions(4);
    });

    it("Create a service and trigger it", done => {
        const joki = createJoki();

        const serv = event => {
            expect(event.key).toBe("test-event");
            expect(event.to).toBe("testService");
            done();
        };

        joki.addService({
            id: "testService",
            fn: serv,
        });

        joki.trigger({
            to: "testService",
            key: "test-event",
        });
    });

    it("Ask from services", () => {
        const joki = createJoki();

        const serv = event => {
            if (event.key === "state" && event.to === "testService") {
                return { foo: "bar", private: true };
            }

            if (event.key === "state") {
                return { foo: "bar", private: false };
            }
        };

        joki.addService({ id: "testService", fn: serv });

        joki.addService({ id: "beta", fn: serv });

        expect(
            joki.ask({
                to: "testService",
                key: "state",
            })
        ).resolves.toEqual({ testService: { foo: "bar", private: true } });

        expect(
            joki.ask({
                to: true,
                key: "state",
            })
        ).resolves.toEqual({
            testService: { foo: "bar", private: false },
            beta: { foo: "bar", private: false },
        });
    });

    it("Ask from listeners", () => {
        const joki = createJoki();

        joki.on({ key: "alpha", fn: event => (event.body !== undefined ? event.body : "No body found") });

        joki.on({ key: "beta", fn: event => (event.body !== undefined ? event.body : "No body found") });

        expect(
            joki.ask({
                key: "alpha",
            })
        ).resolves.toEqual({ alpha: ["No body found"] });

        joki.on({ key: "alpha", fn: event => (event.body !== undefined ? event.body : "No body found") });

        expect(
            joki.ask({
                key: "alpha",
                body: "reply",
            })
        ).resolves.toEqual({ alpha: ["reply", "reply"] });
    });
});

xdescribe("Testing createJoki", () => {
    class Service {
        constructor(serviceId) {
            this.bus = connectJoki(serviceId, this.getState.bind(this), this.incoming.bind(this));
            this.data = {
                counter: 0,
                users: [],
            };
            this.serviceId = serviceId;
        }

        setBus(bus) {
            this.bus.set(bus);
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
        const Joki = createJoki();

        const listId = Joki.listen((sender, msg, eventKey) => {
            expect(eventKey).toBe("test");
        }, "test");

        expect(listId).toBe("listener-0");
        expect(Joki.getEventKeys()).toEqual(["all", "test"]);
        expect(Joki._getListeners("test").length).toBe(1);

        Joki.send("test-suite", 0, "test");
        Joki.send("test-suite", 1, "test");

        Joki.stop(listId);

        expect(Joki._getListeners("test").length).toBe(0);
    });

    it("Create multiple listeners and remove one", () => {
        const Joki = createJoki();
        // Joki.debug(true);
        const lids = [];

        lids.push(Joki.listen((s, m, e) => {}, "test"));

        lids.push(Joki.listen((s, m, e) => {}, "test-too"));

        lids.push(Joki.listen((s, m, e) => {}, "test-again"));

        lids.push(Joki.listen((s, m, e) => {}, "test"));

        expect(Joki._getListeners("test-again").length).toBe(1);
        expect(Joki._getListeners("test-too").length).toBe(1);
        expect(Joki._getListeners("test").length).toBe(2);

        expect(Joki.getEventKeys()).toEqual(["all", "test", "test-too", "test-again"]);
        expect(Joki.getEventKeys()).toEqual(["all", "test", "test-too", "test-again"]);
        expect(lids).toEqual(["listener-0", "listener-1", "listener-2", "listener-3"]);
        Joki.stop(lids.splice(2, 1));
        expect(lids).toEqual(["listener-0", "listener-1", "listener-3"]);
        expect(Joki._getListeners("test-again").length).toBe(0);
    });

    it("Test one time listener", done => {
        const Joki = createJoki();

        Joki.once((s, m, e) => {
            expect(m).toBe(true);
            expect(s).toBe("test-suite");
            expect(e).toBe("hello");
            done();
        }, "hello");

        Joki.send("test-suite", true, "hello");

        expect.assertions(3);
    });

    it("Subscribe a service to Bus, using a class as a service", () => {
        const Joki = createJoki();

        const serv = new Service("test-service");
        serv.setBus(Joki);

        // console.log(Joki._getListeners());
        // console.log(Joki.getService("test-service"));

        expect(Joki.getService("test-service")).toEqual({ counter: 0, users: [] });

        Joki.send("test-suite", "HELLO", "test-service");

        serv.testMessage();
    });

    it("Create multiple Services and communicate between them", () => {
        const Joki = createJoki();

        class SimpleService {
            constructor(id, joki) {
                this.joki = connectJoki(id, this.getState.bind(this), this.incoming.bind(this));
                this.data = {};
                this.id = id;
                this.joki.set(joki);
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
                this.joki.send(msg, ek);
            }
        }

        Joki.listen((s, m, e) => {
            expect(s).toBe("gamma");
            expect(m).toBe("Done");
            expect(e).toBe("final");
        }, "final");

        const alpha = new SimpleService("alpha", Joki);
        const beta = new SimpleService("beta", Joki);
        const gamma = new SimpleService("gamma", Joki);
        const delta = new SimpleService("delta", Joki);

        alpha.send("delta", "beta");

        expect(beta.data.sender).toBe("alpha");
        expect(delta.data.sender).toBe("beta");
        expect(gamma.data.sender).toBe("delta");
    });
});

xdescribe("Testing class service", () => {
    class MyService extends ClassService {
        constructor(joki) {
            super({
                serviceId: "MyService",
                joki: joki,
            });
            this.data = {
                counter: 0,
            };
        }

        getState() {
            return this.data.counter;
        }

        messageHandler(sender, msg, eventKey) {
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
        const Joki = createJoki();
        const serv = new MyService(Joki);

        expect(serv.getState()).toBe(0);
        serv.messageHandler(null, 0, "plus");
        expect(serv.getState()).toBe(1);
        serv.messageHandler(null, 0, "reset");
        expect(serv.getState()).toBe(0);
        expect(Joki.services()).toEqual([{ id: "MyService" }]);
    });

    it("Testing ClassService via bus", () => {
        const Joki = createJoki();
        const serv = new MyService(Joki);

        serv.messageHandler(null, 5, "set");
        expect(serv.getState()).toBe(5);
        expect(Joki.services()).toEqual([{ id: "MyService" }]);
        expect(Joki.getService("MyService")).toBe(5);

        Joki.send(null, 2, "set");
        expect(Joki.getService("MyService")).toBe(2);
        Joki.send(null, null, "plus");
        expect(Joki.getService("MyService")).toBe(3);
    });
});

xdescribe("reducerService testing", () => {
    it("testing the reducerService without bus", () => {
        const Joki = createJoki();
        const rstore = createReducerService("reducerStore", Joki, { counter: 0 }, (state, action) => {
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

    it("reducerService with Joki", () => {
        const Joki = createJoki();
        const rstore = createReducerService("reducerStore", Joki, { counter: 0 }, (state, action) => {
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

        expect(Joki.getService("reducerStore")).toEqual({ counter: 0 });
        Joki.send(null, { number: 3 }, "plus");
        expect(Joki.getService("reducerStore")).toEqual({ counter: 3 });
    });
});

xdescribe("fetchService", () => {
    beforeEach(() => {
        fetch.resetMocks();
    });

    it("Fetch Get promise", done => {
        fetch.mockResponseOnce(JSON.stringify({ test: true }));
        const Joki = createJoki();

        const serv = createFetchService("testFetchService", Joki, {
            url: "http://localhost/test/url",
            format: "json",
        });

        Joki.once((sender, msg, eventKey) => {
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
        const Joki = createJoki();

        const serv = createFetchService("testFetchService", Joki, {
            url: "http://localhost/test/url",
            format: "json",
        });

        Joki.once((sender, msg, eventKey) => {
            // THIS PART SHOULD NEVER RUN WHEN triggerEvent IS SET TO TRUE
            expect(msg).toEqual({ test: true });
        }, "FETCH-POST");

        serv.post({ body: { myData: true }, triggerEvent: false, header: { auth: true } }).then(res => {
            expect(fetch.mock.calls[0][1].method).toBe("POST");
            expect(fetch.mock.calls[0][1].body).toEqual({ myData: true });
            expect(fetch.mock.calls[0][1].header).toEqual({ auth: true });
            expect(res).toEqual({ test: true });
            done();
        });

        expect.assertions(4);
    });

    it("Send get Request via Bus", done => {
        fetch.mockResponseOnce(JSON.stringify({ test: true }));
        const Joki = createJoki();

        const serv = createFetchService("testFetchService", Joki, {
            url: "http://localhost/test/url",
            format: "json",
            getEventKey: "BUS-FETCH-GET",
        });

        const responseId = "MyNiceGetRequest";

        Joki.once((sender, msg, eventKey) => {
            expect(msg.test).toBe(true);
            expect(sender).toBe("testFetchService");
            expect(eventKey).toBe(responseId);
            expect(fetch.mock.calls[0][1].body).toEqual({ bodydata: true });
            expect(fetch.mock.calls[0][1].header).toEqual({ auth: true });
            done();
        }, responseId);

        Joki.send(
            "test-suite",
            {
                responseEventKey: responseId,
                body: { bodydata: true },
                header: { auth: true },
            },
            "BUS-FETCH-GET"
        );
    });
});
