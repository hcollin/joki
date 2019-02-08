const { createBusStore, createBusConnection } = require("../dist/busstore.cjs.js");

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
                if(e === this.id) {
                    this.data = { 
                        sender: s,
                        message: m,
                        eventKey: e
                    };
                    this.send("gamma", m);
                }
                if(this.id === "gamma" && e === "gamma") {
                    console.log("Last one!");
                    this.send("Done", "final");
                }
            }

            send(msg, ek) {
                this.bus.send(msg, ek)
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

