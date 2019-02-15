
import connectJoki from '../joki/connectJoki';

import MapContainer from './containers/MapContainer';

export default function createJokiService(initOptions) {
    
    const serviceId = initOptions.id;
    
    const dataContainer = initOptions.container !== undefined ? initOptions.container : MapContainer();
    const serverConnection = initOptions.connection !== undefined ? initOptions.connection : null;
    
    const joki = connectJoki(serviceId, messageHandler, getState);
    joki.set(initOptions.joki);

    // To get this to work properly the event Refactor needs to be done.
    function messageHandler(sender, message, eventKey) {
        
    }

    function getState() {
        return dataContainer.get();
    }

    return {

    }
}


