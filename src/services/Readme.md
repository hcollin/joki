
# JokiService

JokiService consists of following parts:

* DataContainer, where the actual data is stored
* ServerConnection, which provides connection to the backend
* JokiConnection, which provides connection to the Joki Event Bus


These are parts that may be done later on:

* DataSchema contains a reference for the data
* References, Other collections that this service uses.

## DataContainer

Data Container holds the data that the service is handling. 

* MapContainer works much like a database table, where each row has a unique key and an object of data.
* ObjectContainer is a simple key-value container for more simplistic data
* ReducerContainer is a redux style container for more complex data structures

### Container Api

Each container will provide an identical with the following commands:

* **init** is used to setup the container with some default data.
* **get** returns one or more values from the container
* **set** adds a new or updates an existing value in the container
* **del** removes a value from the container
* **close** called when the service is closed gracefully
* **stats** return an object with some stats for the Container like size, last modification, last server update.

## ServerConnection

ServerConnection holds the connection api to the backend. It is used to query data when needed and sends chenges to the backend when needed.

Currently the plan is to craete at least two ServerConnection types

* RestConnection that connects to a restApi.
* SocketConnection that connects with a WebSocket.


### Connection Api

Connections need to provide at least the following APIs

* **init** Open connections if necessary etc. Always called when the service is created
* **close** Closes the connection gracefully
* **send** Sends a some data to the server
* **request** Sends a request to the server

## JokiConnection

This is where the Joki instance is stored. It will automatically listen to messages targeted for this this service and sends updates when the data changes.

* JokiConnect

 * **listen** Listen to events coming from the Joki
 * **send** Send an event to the Joki 

