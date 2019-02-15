const {
    createJoki,
    connectJoki,
    ClassService,
    createReducerService,
    // createFetchService,
} = require("../dist/joki.cjs.js");

describe("Testing createJoki", () => {
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
            this.bus.send({
                from: this.serviceId,
                body: "HELLO",
                eventKey: "test-suite",
            });
        }

        getState() {
            return this.data;
        }

        incoming(event) {
            expect(event.body).toBe("HELLO");
            expect(event.from).not.toBe(this.serviceId);
        }
    }

    it("Send messages to listener ", () => {
        const Joki = createJoki();

        const listId = Joki.listen(event => {
            expect(event.eventKey).toBe("test");
        }, "test");

        expect(listId).toBe("listener-0");
        expect(Joki.getEventKeys()).toEqual(["all", "test"]);
        expect(Joki._getListeners("test").length).toBe(1);

        Joki.send({ from: "test-suite", body: 0, eventKey: "test" });
        Joki.send({ from: "test-suite", body: 1, eventKey: "test" });

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

        Joki.once(e => {
            expect(e.body).toBe(true);
            expect(e.from).toBe("test-suite");
            expect(e.eventKey).toBe("hello");
            done();
        }, "hello");

        Joki.send({ from: "test-suite", body: true, eventKey: "hello" });

        expect.assertions(3);
    });

    it("Subscribe a service to Bus, using a class as a service", () => {
        const Joki = createJoki();

        const serv = new Service("test-service");
        serv.setBus(Joki);

        // console.log(Joki._getListeners());
        // console.log(Joki.getService("test-service"));

        expect(Joki.getService("test-service")).toEqual({ counter: 0, users: [] });

        Joki.send({ 
            from: "test-suite", 
            to: "test-service",
            body: "HELLO",

        });

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

            incoming(e) {
                expect(e.from).not.toBe(this.id);
                if (e.to === this.id || e.to === "all") {
                    
                    if(e.eventKey === "hello") {
                        this.data = {
                            sender: e.from,
                            message: e.body,
                            eventKey: e.eventKey,
                        };
                        this.send("Hi!", "reply", e.from);
                    }
                    if(e.eventKey === "reply") {
                        this.data.replies = this.data.replies === undefined ? 1 : this.data.replies + 1;
                        if(this.data.replies === 3) {
                            this.send("Thanks!", "confirm", "all");
                        }
                    }
                }
            }

            send(msg, ek, to) {
                this.joki.send({body: msg, eventKey: ek, to: to});
            }
        }

        Joki.listen((e) => {
            expect(e.from).toBe("alpha");
            expect(e.body).toBe("Thanks!");
            expect(e.eventKey).toBe("confirm");
        }, "confirm");

        const alpha = new SimpleService("alpha", Joki);
        const beta = new SimpleService("beta", Joki);
        const gamma = new SimpleService("gamma", Joki);
        const delta = new SimpleService("delta", Joki);

        alpha.send("Hello Everyone!","hello", "all");

        expect(beta.data.message).toBe("Hello Everyone!");
        expect(gamma.data.message).toBe("Hello Everyone!");
        expect(delta.data.message).toBe("Hello Everyone!");
        expect(alpha.data.replies).toBe(3);

        
        
    });
});

describe("Testing class service", () => {
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

        messageHandler(event) {
            switch (event.eventKey) {
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
                    this.data.counter = event.body;
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
        serv.messageHandler({body: 0, eventKey: "plus"});
        expect(serv.getState()).toBe(1);
        serv.messageHandler({body: 0, eventKey: "reset"});
        expect(serv.getState()).toBe(0);
        expect(Joki.services()).toEqual([{ id: "MyService" }]);
    });

    it("Testing ClassService via bus", () => {
        const Joki = createJoki();
        const serv = new MyService(Joki);

        serv.messageHandler({body:5, eventKey:"set"});
        expect(serv.getState()).toBe(5);
        expect(Joki.services()).toEqual([{ id: "MyService" }]);
        expect(Joki.getService("MyService")).toBe(5);

        Joki.send({body:2, eventKey:"set"});
        expect(Joki.getService("MyService")).toBe(2);
        Joki.send({eventKey:"plus"});
        expect(Joki.getService("MyService")).toBe(3);
    });
});

describe("reducerService testing", () => {
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
                    return undefined;
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
                    return undefined;
            }
        });

        expect(Joki.getService("reducerStore")).toEqual({ counter: 0 });
        Joki.send({body: { number: 3 }, eventKey:"plus"});
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
