# Joki 

> *Joki means River in Finnish*

Joki is an alternative approach to making a global store (aka redux, mobx etc.) for React. The key idea here is to separate the actual data and logic from the view aka React. Joki can be connected to the React with React Hooks. Of course custom implementations to class based connections are also possible. 

Main design goals for Joki were:

* Use React Hooks and pure components on the view
* Minimize boilerplate code on components
* No need for separate solutions for async (like redux+saga||thunk etc.)
* Bundling multiple complex backends and apis to clear simple Services for view to use
* Target is closed environment BtoB web applications where only thing visible to open web is usually a login page, if even that.

The main inspiration for Joki came from microservice architecture in the backend. The main use cae for Joki are closed BtoB web applications with custom backends. This clear separation of the view layer from the service layer in client side will allow more flexible approach to creating the connections between server and client.

**NOTICE** This library is much in alpha stages and there WILL be breaking changes. A lot of them and not all of them will be updated into this manual until release.

## Installation

By using npm

    npm i joki

Or if you prefer yarn

    yarn add joki


## How to use

The Joki store is by design more complex than Redux style store so we need to do a bit more to get going.


### API

Joki exports the following api

* `createJoki()` is used to create a Joki instance. This is the core of the library.
* `connectJoki()` connects a service to Joki. This is needed when doing custom Services.
* `ClassService` can be extended to create your own class based services
* `createReducerService()` is used to create Redux inspired stores that listen to Joki events.
* `useListenJokiEvent()` or `useEvent()` React hook to listen events in Joki.
* `useListenJokiService()` or `useService()` React hook to retrieve current state of registered service in Joki. updated semi-automatically (needs to be triggered from the service).
* `trigger()` send a message to the Joki from React Component.

### Joki Instance aka the Event Bus

First we need to create a single Joki instance. The easiest way to do that is to place it into a separate file export it from there. Here is the simplest version of that.

```js
import { createJoki } from 'joki';
const Joki = createJoki();
export default Joki;
```

This bus could be used to send events and listen for events but feature like that is fairly simple to implement with much easier api. 

### Services

The strength of the Joki comes from services that can be attached to it. Services can be pretty much anything and using `connectJoki()` function pretty much any style of service can be added to the Joki. 

The easiest way to create service is to use a built-in service creators. Joki provides three of these at the moment.

* Class based service that can be used to implement more traditional service with mutating data.
* Reducer style service, where we listen for actions from the Joki and send updates when the state changes
* FetchService (very much in alpha) that will create a fetch api to target url.

No matter which style of service is used it needs to be created and added to the Joki. Here is a simple example of Reducer style service with a simple counter and plus and minus actions.

```js
import { createJoki, createReducerService } from 'joki';
const Joki = createJoki();

createReducerService("myService", Joki, {counter: 0}, (state, action) => {
    switch(action.type) {
        case "plus":
            return {counter: state.counter + 1};
        case "minus":
            return {counter: state.counter + 1};
        default:
            return undefined; // This inform the Joki that the state did not change
    }
});

export default Joki;
```

#### ClassService

```js
import {ClassService} from 'joki';

class MyService extends ClassService {

    constructor(jokiInstance) {
        super({
            joki: jokiInstance,
            serviceId: "MyService"
        });

        this.data = {};
    }

    // This overrides a function in ClassService and handles current state requests coming from Joki. (like useService hook)
    getState() {
        return this.data;
    }

    // This overrides a function in ClassService and handles incoming messages from Joki
    messageHandler(sender, message, eventKey) {
        // acts more or less like a reducer.
        switch(eventKey) {
            
        }
    }
}
```
Class based services are quite handy for situations where we want to do more than just store data.

*To be continued*

#### createReducerService

```js
import { createReducerService } from 'joki';
import Joki from './myJokiSetup';

const initialState = {
    counter: 0
};

const reducer = (state, action) => {
    switch(actionö.type) {
        case "plus":
            return { counter: state.counter + 1 };
        case "minus":
            return { counter: state.counter + 1 };
        default:
            return undefined;

    }
};

createReducerService("MyService", Joki, initialState, reducer);
```


### Sending messages

Simplest way to send a message to Joki is to use the function `trigger`.

```js
import {trigger} from 'joki';
trigger(jokiInstance, {options});
```

