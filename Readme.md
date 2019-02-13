# Joki 

> *Joki means River in Finnish*

Joki is event based store for React Hooks. The key idea here is to separate the actual data handling from the React allowing data handling in plain js and using asynchrous methods best suited for the project. 

**NOTICE** This library is much in alpha stages and there WILL be breaking changes. A lot of them and not all of them will be updated into this manual until release.

## Installation

By using npm

    npm i joki

Or if you prefer yarn

    yarn add joki


## How to use

The Joki store is by design more complex than Redux style store so we need to do a bit more to get going.

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

    import {trigger} from 'joki';
    trigger(jokiInstance, {options});

