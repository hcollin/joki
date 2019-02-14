export default function MapContainer(mapOptions) {
    const data = new Map();
    const options = mapOptions;

    let idCounter = 0;
    const containerKey = options.key !== undefined ? options.key : Math.round(Math.random() * 1000);

    const timers = {
        lastModified: 0,
        created: Date.now(),
    };

    function _newKey() {
        return `id-${containerKey}-${idCounter++}`;
    }

    function init() {}

    function get(rules = null) {
        // Return an array containing all values
        if (rules === null) {
            return Array.from(data.values());
        }

        // Return a value based on Joki Container Id
        if (typeof rules === "string") {
            if (data.has(rules)) {
                return data.get(rules);
            }
            return undefined;
        }

        const dataArr = Array.from(data.values());
        const ruleKeys = Object.keys(rules);
        return dataArr.filter(item => {
            return ruleKeys.every(key => item[key] !== undefined && item[key] === rules[key]);
        });
    }

    function set(item) {
        if(Array.isArray(item)=== true) {
            item.forEach(it => {
                set(it);
            });
            return;
        }

        if (item._jokiContainerId === undefined) {
            item._jokiContainerId = _newKey();
        }
        data.set(item._jokiContainerId, item);
        timers.lastModified = Date.now();
    }

    function del(target) {
        if(typeof target === "string") {
            if(data.has(target)) {
                data.delete(target);
                timers.lastModified = Date.now();
                return true;
            }
        }

        if(target._jokiContainerId !== undefined) {
            if(data.has(target._jokiContainerId )) {
                data.delete(target._jokiContainerId);
                timers.lastModified = Date.now();
                return true;
            }
        }

        return false;
        
    }

    function close() {}

    function stats() {
        return {...timers, size: data.size};
    }

    return {
        init,
        get,
        set,
        del,
        close,
        stats,
    };
}
