# Joki ![GitHub license](https://img.shields.io/github/package-json/license/hcollin/joki.svg) ![Github version](https://img.shields.io/github/package-json/v/hcollin/joki.svg)

Joki is an publish-subscriber and service provider library. Reasons for writing this can be found at the of the this Readme file from the chapter **Why?!**.

Joki has no runtime dependencies, but it should be used from within babel compiled code.

# Current status

Joki is currently used in production, but is still considered to be in early stages of development. So use at your own risk. =)


# Installation

By using npm

    npm i joki

Or if you prefer yarn

    yarn add joki

# Setting up Joki

Joki exports only one function called `createJoki` and one variable called `ìdentifier `. The function is used to crate a new event bus instance. The identifier contains the version number of the Joki library you are running.

Creating a new Joki instance is a simple process

```javascript
import { createJoki } from 'joki';

const jokiInstance =  createJoki();
```

The `createJoki` function takes one optional object as a parameter that contains the options set for this instance.

## Options

*example:*

    {
        debug: boolean, // defaults to false
        noInit: boolean // defaults to undefined (identical to setting false)
    }



When **debug** is set to true, Joki will start printing information to the console about's it internal processes.

When **noInit** is set to true, Joki will not call initialization Event to services automatically.


# Using Joki

At the base of the joki there is an old concept of publish-subscribe pattern and it could be used just like simple message queue with commands `on` and `trigger`. Joki also has a concept of specialized subscriber called *service* to make writing application logic more undestandable and coherent. The events inside joki are JavaScript Objects and referred in this documentation as *Joki Events*.

## Joki Event format

Joki events can be sent with three separate functions: `trigger`, `ask` and `broadcast`.

```javascript
const jokiEvent = {
    key: "myEventKey",
    to: "targetOnlyThisService",
    from: "whoIsSendingThisMessage",    
}
```

The main parameter of the Joki Event is **key**. It is the name of the triggered event that subscibers are listening. It must be a string or an array of strings if multiple subscribers  are to be triggered at the same time.

The value of parameter **to**  must be an id of a registered service. If the **to** parameter is present in the event Joki sends this event directly to this service and does not trigger other subsribers or services. This parameter can also be an array of strings and the event is sent all those services.

The **from** parameter is mandatory when sending broadcasts. It should alse be attached to events triggered from within services and have the id of the service triggering the event.

Other parameters can be added to the event object too, but most of the data should be wrapped within a parameter called **body** or something similar as some parts of the Joki will modify the root event object.

**NOTICE!** The paramters **syncAsk** and **broadcast** are also reserved as they are used in by `ask` and `broadcast` functions.

## API functions

The joki instance has the following api calls:

* `on` - Subscribe to events triggered in Joki
* `trigger` - Trigger an event inside Joki
* `ask` - Trigger an event and expect a return value from it
* `broadcast` - Trigger a broadcast event to all services and to specific events listening for these broadcasts
* `addService` - Register a service to the Joki
* `removeService` - Remove a service from the Joki
* `listServices` - List all services currently registered to this Joki instance
* `initServices` - Send initialization call to all registered Services
* `listeners` - List all listeners currently subscribed to this Joki instance
* `options` - list, get or set options for this joki Instance

All examples below will expect that an instance of Joki called `jokiInstance` has been created with `createJoki` function.

### on

`const unsubscribeFn = jokiInstance.on(Object);`

Create a new subcriber listening to events.

```javascript
const off = jokiInstance.on({
    key: "listenTothisKey",
    from: "listenEventsFromThisSource",
    fn: (event) => { console.log("Do stuff"); }
});
off();
```
The `on` function will add a new subscriber to the Joki Instance and returns an anonymous function that can be used to unsubscribe it.

The object used to defined the subscriber has three parameters:

* **key** - *String || Array[String]* - Listen to Joki events with this key
* **from** - *String* -  Only trigger this event if the from of the event is defined and equals to this.
* **fn** - *function* - This function is triggered with the triggering Joki Event as an argument.

The subscriber must always have the **fn** defined. Either or both **key** or **from** must be defined. When only **key** is defined, all Joki Events with an identical key will trigger this subscriber. If only **from** is defined for the subscriber, all Joki Events with identical **from** will trigger this Subscriber. If both are defined, only Joki Events matching with both **key** and **from** will trigger.

The normal use case for **from** is to capture all events triggered by a defined *service*.

The callback function only takes one argument and it is the Joki Event that was triggered.

### trigger

`jokiInstance.trigger(JokiEventObject);`

Trigger subscribers or services with Joki Events without return value.

example:
```javascript
jokiInstance.trigger({
    key: "somethingHappened",
    body: {
        /// my data
    }
});
```
Check the Joki Event chapter above for more information about the format of the Joki Event Object

**NOTICE!** If parameter **to** is defined, no subscribers are triggered, only the target service or services. And if no **to** is defined, no services are triggered.

### ask


`const results = jokiInstance.ask(JokiEventObject); // synchronous ask`
`jokiInstance.ask(JokiEventObject).then(results => .... ); // asynchronous ask`

Trigger event and expect a return value.

*example:*
```javascript
jokiInstance.ask({
    key: "somethingHappened",
    body: {
        /// my data
    }
})
    .then( results => { 
        // Do stuff   
    })
    .catch(err => {
        // On err
    });
```

`ask` is a wrapper for `trigger` that is used when a return values is expected. The Joki Event object is extended with a key **syncAsk**, which defaults to *false*. When **syncAsk** is false the `ask` function return a promise which will trigger when all services or subscribers have executed their handlers. If the **syncAsk** is set to true, this is done synchronously and the execution of the program will wait until for handlers to finish.

The return value will be an object when the Joki Event had a parameter **to** defined. For example if we call two services called *alpha* and *beta*:

    jokiInstance.ask({
        to: ["alpha", "beta"],
        key: "doStuff" 
    }).then(response => .... )

The response object will wrap the response of each service with the serviceId as a key:

    {
        alpha: Return value from alpha service,
        beta: Return value from beta service
    }

When calling subscribers the return value will be an array of responses from subscribers that triggered.

### broadcast

`jokiInstance.broadcast(JokiEventObject);`

Send an event to all services and subscribers listening to this key.

*example:*
```javascript
jokiInstance.broadcast({
    key: "somethingVeryImportant",
    from: "ImportantService",
    body: {
        // my data
    }
});
```

`broadcast` will trigger every service that has been registered and all subscribers listening to this **key**. The **from**  parameter is mandatory in broadcast events.

The `broadcast`is separated from the `trigger` so that the user cannot make broadcast events without actually writing broadcast :). And of course because this allows the broadcast function itself to be a lot simpler and thus faster.

**NOTICE!** `broadcast` will add a parameter **broadcast** to the Joki Event Object sent to services and subscribers so that they know that this event is actually a broadcast and treat it accordingly.

### addService

`jokiInstance.addService(ServiceObject);`

Registers a new service to Joki instance.

```javascript
jokiInstance.addService({
    id: "MyService",
    fn: (jokiEvent) => { 
        switch(jokiEvent.key) {
            // Do stuff
        }
    }
});
```

The service object has two paramters: **id** containing an unique string id for the service and **fn** containing the event handler function.

The **id** should always be a desciptive name for the service as it is used by the Joki Events **to** parameter and thus makes the event triggers a lot more descriptive and easier to follow.

The service itself can be a class or function, Joki library itself does not care. 

### removeService

`jokiInstance.removeService(serviceId);`

Removes the service from the Joki instance. 

```javascript
jokiInstance.removeService("MyService");
```

Services are rarely removed from Joki after initialization unless they have been created dynamically and temporarily.

### listServices

`const arrayOfServiceIds = jokiInstance.listServices();`

Returns an array of registered service id's.

### initServices

`jokiInstance.initServices(dataObject);`

Sends an initialization event to all registered services.

The initialization event looks like this:

    {
        from: "JOKI",
        key: "initialize",
        body: dataObject,
    }

This event can be used to do initialization of services after for example authorization is finished.

**NOTICE!** If the service is added after the initialization is done, the initialization is called on it immediately. This can be prevented by setting the option **noInit** to *true*.

### listeners

`const arrayOfListeners = jokiInstance.listners();`

List all subscribers in this Joki instance.

The return value is an array of objects where each object contains each subscribers **key** and **from** values.

Getting a list of currently subscribers is mainly usuful only for debugging and testing purposes and should not really be used in production code for anything.

### options

list: `const optionsObject = jokiInstance.options();`

get: `const optionValue = jokiInstance.options(optionKeyString);`

set: `jokiInstance.options(optionKeyString, newValue);`

List, get or set option values for the current Joki instance.

# Service Factory: createMockService

`createMockService` factory function is used to create a simple services for Joki. It's main purpose is to provide a simple tool for mocking services with simple responses to events in tests. 

**NOTICE!** This function may be renamed to something like `createSimpleService` or `createStaticService` if it is found to be good enough for those purposes. Although at the moment the plan is to create separate functions for these functionalities.

## Usage

Example:
```javascript
import { createJoki, createMockService } from 'joki';

const jokiInstance = createJoki();
createMockService(jokiInstance, "MockService", {
    "getDetails": { id: "id1", name: "Name"},
    "getList": [{id: "id1", name: "Name"}],
    "isValid": (event) => event.body === true,
    "send": (event) => { joki.trigger({key: "hey", from: "MockService", body: "foobar"})}
});
```
The 'createMockService' takes 3 arguments. 

1. jokiInstance - This must be a valid instance of Joki.
2. serviceId - Service Id must a be a unique string
3. eventHandlers - This is an object where keys equal to event keys and the value is either returned as is or it can be a function.

If the eventHandlers value is a function that returns a value or static value a ServiceUpdate function is sent by the Mock Service.


# Why?!

The idea for Joki has been floating in my mind for quite a while. A microservice inspired state container for React, which would allow React to function as a view library and separating the actual application logic and state to separate services. When React Hooks were released it allowed an easier lifecycle handling. 

After using Redux (with different friends), Mobx and Mobx-State-Tree I found them good when the focus was in the user interface itself and will keep using them in the future. But Idea of Joki was to solve more data oriented problem, where asynchronous calls and sockets to backend services are even more common than clicks on the page. Where state updates will be triggered not by user but by events from the server. Only visible thing of these sites to public web is usually a login page, if even that.

Joki allows us to write services that do their stuff and keep their state contained within themselves. It allows us to dynamically change services under the same id for example depending on the users access rights etc.


# License

MIT