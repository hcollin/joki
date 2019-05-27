const {
    createJoki,
    createMockService,
    identifier,
    // connectJoki,
    // ClassService,
    // createReducerService,
    // createFetchService,
} = require("../dist/joki.cjs.js");

describe("createJoki 0.9.1", () => {
    it("Identifier must be of correct version", () => {
        expect(identifier).toBe("0.9.1-alpha");
    });

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
        const joki = createJoki({ debug: false });

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

        expect.assertions(2);
    });

    it("Create and remove a listener", () => {
        const joki = createJoki();

        const unsubscribe = joki.on({
            key: "test",
            fn: event => true,
        });

        expect(joki.listeners()).toEqual([{ key: "test" }]);

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
        ).resolves.toEqual(["No body found"]);

        joki.on({ key: "alpha", fn: event => (event.body !== undefined ? event.body : "No body found") });

        expect(
            joki.ask({
                key: "alpha",
                body: "reply",
            })
        ).resolves.toEqual(["reply", "reply"]);
    });

    it("Make a synchronous ask", () => {
        const joki = createJoki();

        joki.on({ key: "alpha", fn: event => (event.body !== undefined ? event.body : "No body found") });

        expect(
            joki.ask({
                key: "alpha",
                syncAsk: true,
            })
        ).toEqual(["No body found"]);
    });

    it("Only one listener must trigger from service update call", () => {
        const joki = createJoki({ debug: false });

        const counter = jest.fn();

        joki.on({
            from: "service",
            fn: event => {
                expect(event.body).toBe("update");
                counter();
            },
        });

        joki.on({
            key: "service",
            fn: event => {
                expect(event.body).toBe("update");
                counter();
            },
        });

        joki.trigger({
            from: "service",
            body: "update",
        });

        expect(counter).toBeCalledTimes(1);
        expect.assertions(2);
    });

    it("Separation of from and key", () => {
        const joki = createJoki({ debug: false });

        const counter = jest.fn();

        const list1 = joki.on({
            key: "dostuff",
            fn: event => {
                expect(event.key).toBe("dostuff");
                expect(["Hello", "World"]).toContain(event.body);
                counter();
            },
        });

        const list2 = joki.on({
            key: "dostuff",
            from: "service",
            fn: event => {
                expect(event.body).toBe("World");
                expect(event.from).toBe("service");
                expect(event.key).toBe("dostuff");
                counter();
            },
        });

        const list3 = joki.on({
            from: "service",
            fn: event => {
                switch (event.key) {
                    case "dostuff":
                        expect(event.from).toBe("service");
                        expect(event.key).toBe("dostuff");
                        expect(event.body).toBe("World");
                        counter();
                        break;
                    default:
                        expect(event.from).toBe("service");
                        expect(event.body).toBe("Again");
                        counter();
                        break;
                }
            },
        });

        expect(joki.listeners()).toEqual([
            { from: undefined, key: "dostuff" },
            { from: "service", key: "dostuff" },
            { from: "service", key: undefined },
        ]);

        joki.trigger({
            key: "dostuff",
            body: "Hello",
        });

        joki.trigger({
            key: "dostuff",
            from: "service",
            body: "World",
        });

        joki.trigger({
            from: "service",
            body: "Again",
        });

        expect(counter).toBeCalledTimes(5);

        expect.assertions(14);
    });

    it("Check service initialization", () => {
        const joki = createJoki();

        const initAlpha = jest.fn();
        const initBeta = jest.fn();

        joki.addService({
            id: "alpha",
            fn: event => {
                switch (event.key) {
                    case "initialize":
                        initAlpha();
                        break;
                    default:
                        break;
                }
            },
        });

        joki.initServices({});
        joki.initServices({});

        joki.addService({
            id: "beta",
            fn: event => {
                switch (event.key) {
                    case "initialize":
                        initBeta();
                        break;
                    default:
                        break;
                }
            },
        });

        expect(initAlpha).toBeCalledTimes(1);
        expect(initBeta).toBeCalledTimes(1);
    });

    it("broadcast function must require from and key parameters and trigger all registered servies", () => {
        const joki = createJoki({ debug: false });

        const broadcastSuccess = jest.fn();
        const broadcastFailure = jest.fn();

        joki.addService({
            id: "alpha",
            fn: event => {
                switch (event.key) {
                    case "broadcastEvent":
                        if (event.body.success === true) {
                            broadcastSuccess();
                        }
                        if (event.body.success === false) {
                            broadcastFailure();
                        }
                        break;
                    default:
                        break;
                }
            },
        });

        joki.addService({
            id: "beta",
            fn: event => {
                switch (event.key) {
                    case "broadcastEvent":
                        if (event.body.success === true) {
                            broadcastSuccess();
                        }
                        if (event.body.success === false) {
                            broadcastFailure();
                        }
                        break;
                    default:
                        break;
                }
            },
        });

        joki.on({
            key: "broadcastEvent",
            fn: event => {
                expect(event.broadcast).toBeTruthy();
                if (event.body.success === true) {
                    broadcastSuccess();
                }
                if (event.body.success === false) {
                    broadcastFailure();
                }
            },
        });

        joki.on({
            key: "broadcastEvent",
            from: "another-source",
            fn: event => {
                broadcastFailure();
            },
        });

        joki.broadcast({
            key: "broadcastEvent",
            body: {
                text: "Should not trigger anything as the from is missing",
                success: false,
            },
        });

        joki.broadcast({
            key: "broadcastEvent",
            from: "test-suite",
            servicesOnly: true,
            body: {
                text: "Should trigger succcess on services",
                success: true,
            },
        });

        joki.broadcast({
            key: "broadcastEvent",
            from: "test-suite",
            body: {
                text: "Should trigger succcess on both services and listeners",
                success: true,
            },
        });

        expect(broadcastFailure).toBeCalledTimes(0);
        expect(broadcastSuccess).toBeCalledTimes(5);
    });
});

describe("createMockService", () => {
    it("Basic mock service", async () => {
        const joki = createJoki();
        createMockService(joki, "MockService", {
            text: "River must flow",
            num: 4,
            bool: true,
            obj: {
                key: "Foo",
                value: "Bar",
            },
            arr: [1, "Foo"],
            test: event => {
                return "Foo";
            },
        });

        // Just return plain text
        expect(
            await joki.trigger({
                to: "MockService",
                key: "text",
                async: false,
            })["MockService"]
        ).toBe("River must flow");

        // Just return plain number
        expect(
            await joki.trigger({
                to: "MockService",
                key: "num",
                async: false,
            })["MockService"]
        ).toBe(4);

        // Plain boolean
        expect(
            await joki.trigger({
                to: "MockService",
                key: "bool",
                async: false,
            })["MockService"]
        ).toBe(true);

        // Object
        expect(
            await joki.trigger({
                to: "MockService",
                key: "obj",
                async: false,
            })["MockService"]
        ).toEqual({ key: "Foo", value: "Bar" });

        // Array
        expect(
            await joki.trigger({
                to: "MockService",
                key: "arr",
                async: false,
            })["MockService"]
        ).toEqual([1, "Foo"]);

        // Function value
        expect(
            await joki.trigger({
                to: "MockService",
                key: "test",
                async: false,
            })["MockService"]
        ).toBe("Foo");

        // Return undefined
        expect(
            await joki.trigger({
                to: "MockService",
                key: "unknown",
                async: false,
            })["MockService"]
        ).toBeUndefined();
    });

    it("Expect serviceUpdate events to trigger from Mock Service", async () => {
        const joki = createJoki();

        createMockService(joki, "Mock", {
            test: event => {
                return {
                    key: "foo",
                };
            },
        });

        joki.on({
            from: "Mock",
            key: "ServiceUpdate",
            fn: event => {
                expect(event.from).toBe("Mock");
                expect(event.key).toBe("ServiceUpdate");
                expect(event.serviceUpdate).toBe(true);
                expect(event.body.key).toBe("foo");
            },
        });

        expect(
            await joki.trigger({
                to: "Mock",
                key: "test",
                async: false,
            })["Mock"]
        ).toEqual({ key: "foo" });

        expect.assertions(5);
    });

    it("ServiceUpdate event is NOT sent if there is no return value", () => {
        const joki = createJoki();

        createMockService(joki, "Mock", {
            test: event => {
                expect(event.to).toBe("Mock");
                expect(event.body).toBe("foo");
            },
        });

        joki.on({
            from: "Mock",
            key: "ServiceUpdate",
            fn: event => {
                // This should never trigger!
                expect(event.from).toBe("Mock");
                expect(event.serviceUpdate).toBe(false);
            },
        });

        joki.trigger({
            to: "Mock",
            key: "test",
            body: "foo",
        });

        expect.assertions(2);
    });

    it("ERROR: Expect to throw if no valid Joki instance is provided", () => {
        expect(() => createMockService({}, "Mock", {})).toThrowError(TypeError);
    });

    it("ERROR: Expect to throw if provided provided serviceId is not a string", () => {
        const joki = createJoki();
        expect(() => createMockService(joki, 45, {})).toThrowError(TypeError);
    });

    it("Create two mock services calling each other", async () => {
        const joki = createJoki();

        createMockService(joki, "Alpha", {
            send: event => {
                expect(event.body).toBe("foo");
                joki.trigger({
                    to: "Beta",
                    key: "recieve",
                    body: "bar",
                });
            },
        });

        createMockService(joki, "Beta", {
            recieve: event => {
                expect(event.body).toBe("bar");
            },
            send: event => {
                expect(true).toBe(false); // This should never be called!
            },
        });

        joki.trigger({
            to: "Alpha",
            key: "send",
            body: "foo",
        });

        expect.assertions(2);
    });
});
