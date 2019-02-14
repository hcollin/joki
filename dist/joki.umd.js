(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react')) :
    typeof define === 'function' && define.amd ? define(['exports', 'react'], factory) :
    (factory((global.busstore = {}),global.React));
}(this, (function (exports,react) { 'use strict';

    function createJoki() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var subIdCounter = 0; // The key generator for services can be overwritten with options

      var keyGenerator = options.keyGenerator !== undefined && typeof options.keyGenerator === "function" ? options.keyGenerator : function (keyType) {
        return keyType;
      }; // All subscribed services are store here.

      var services = []; // Listeners are here

      var listeners = {
        all: []
      }; // LIstener removing functions are stored here based on their id.

      var listenerRemovers = {};
      var debugMode = options.debugMode !== undefined ? options.debugMode : false;
      /**
       * Services in the Joki are data storages that usually contain a state and manage their internal state
       * They send updates to the Joki, when their data changes. They can also provide apis
       *
       * @param {string|null} serviceId
       * @param {}
       */

      function subscribeServiceProvider() {
        var serviceId = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var currentStateCallback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var actionsCallback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        var id = serviceId !== null ? serviceId : keyGenerator("subscriber-".concat(subIdCounter++));
        services.push({
          id: id,
          getState: currentStateCallback,
          action: actionsCallback
        });
        txt("New service subscribed as ".concat(serviceId, " ").concat(services.length, "."));
        return id;
      }

      function unSubscribeServiceProvider(subscriberId) {
        services = services.filter(function (s) {
          return s.id !== subscriberId;
        });
        txt("Service ".concat(serviceId, " unsubscribed ."));
      }

      function listSubscribers() {
        var subs = services.map(function (sub) {
          return {
            id: sub.id
          };
        });
        return subs;
      }
      /**
       * Send a message to the Joki
       * @param {*} msg
       * @param {*} options
       */


      function sendMessage() {
        var sender = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var msg = arguments.length > 1 ? arguments[1] : undefined;
        var eventKey = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        txt("".concat(sender, " sends a message with eventKey ").concat(eventKey, "."));

        if (eventKey !== null) {
          if (listeners[eventKey] === undefined) {
            listeners[eventKey] = [];
          }

          listeners[eventKey].forEach(function (listener) {
            listener.fn(sender, msg, eventKey);
          });
        }

        listeners.all.forEach(function (listener) {
          listener.fn(sender, msg, eventKey);
        });
        services.forEach(function (sub) {
          if (typeof sub.action === "function" && sub.id !== sender) {
            sub.action(sender, msg, eventKey);
          }
        });
      }

      function sendMessageToSubscriber(subscriberId, sender, msg, eventKey) {
        txt("".concat(sender, " sends a message to service ").concat(subscriberId, " with event key ").concat(eventKey));
        var subscriber = services.find(function (sub) {
          return sub.id === subscriberId;
        });

        if (typeof subscriber.action === "function" && subscriber.id !== sender) {
          subscriber.action(sender, msg, eventKey);
        }
      }
      /**
       * Register a listener for messages
       */


      function listenMessages(listenerFn) {
        var eventKey = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "all";
        var id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        var listenerId = id !== null ? id : keyGenerator("listener-".concat(subIdCounter++));
        txt("New listener with id ".concat(listenerId, " registered."));

        if (listeners[eventKey] === undefined) {
          listeners[eventKey] = [];
        }

        listeners[eventKey].push({
          id: listenerId,
          fn: listenerFn
        });

        listenerRemovers[listenerId] = function () {
          listeners[eventKey] = listeners[eventKey].filter(function (l) {
            return l.id !== listenerId;
          });
        };

        return listenerId;
      }

      function oneTimeListener(listenerFn, eventKey) {
        var id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

        if (eventKey === undefined) {
          throw "When listening one time event an eventKey is mandatory";
        }

        txt("Listening for event ".concat(eventKey, " once"));
        var lid = listenMessages(function (sender, msg, eventKey) {
          var data = listenerFn(sender, msg, eventKey);
          clearListener(lid);
          return data;
        }, eventKey, id);
      }

      function clearListener(listenerId) {
        if (listenerRemovers[listenerId] !== undefined) {
          listenerRemovers[listenerId]();
          delete listenerRemovers[listenerId];
          txt("Listener with id ".concat(listenerId, " removed."));
        }
      }

      function getCurrentStateOfService(serviceId) {
        var service = services.find(function (sub) {
          return sub.id === serviceId;
        });
        txt("Get current state for service ".concat(serviceId));

        if (service === undefined) {
          console.error("Cannot get a state for unknown service", serviceId);
          return false;
        }

        return service.getState();
      }

      function serviceHasUpdatedItsState(serviceId) {
        sendMessage(serviceId, "UPDATE", serviceId);
      }

      function txt(msg) {
        if (debugMode) {
          console.debug("Joki:Debug: ".concat(msg));
        }
      }

      function setDebugMode() {
        var setTo = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

        if (setTo === null) {
          debugMode = !debugMode;
        } else {
          debugMode = setTo;
        }
      }

      function getListeners() {
        var key = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        if (key === null) return listeners;
        return listeners[key];
      }

      function getRegisteredEventKeys() {
        var eventKeys = Object.keys(listeners);
        return eventKeys;
      }

      function confirmThatThisAJokiInstance() {
        return true;
      }

      return {
        subscribe: subscribeServiceProvider,
        unsubscribe: unSubscribeServiceProvider,
        services: listSubscribers,
        getService: getCurrentStateOfService,
        serviceUpdated: serviceHasUpdatedItsState,
        send: sendMessage,
        action: sendMessageToSubscriber,
        listen: listenMessages,
        once: oneTimeListener,
        stop: clearListener,
        debug: setDebugMode,
        getEventKeys: getRegisteredEventKeys,
        _getListeners: getListeners,
        _isJoki: confirmThatThisAJokiInstance
      };
    }

    function connectJoki(id) {
      var requestStateHandler = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var actionHandler = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
      var jokiInstance = null;
      var serviceId = id;

      var _stateHandler = requestStateHandler !== null ? requestStateHandler : function () {
        return null;
      };

      var _actionHandler = actionHandler !== null ? actionHandler : function () {
        return null;
      };

      var debugMode = false;

      function setJokiInstance(joki) {
        jokiInstance = joki;
        txt("Subscribe connection ".concat(serviceId));
        return jokiInstance.subscribe(serviceId, _stateHandler, _actionHandler);
      }

      function removeJokiConnection(bus) {
        txt("Remove Subscribtion ".concat(serviceId));

        if (jokiInstance !== null) {
          jokiInstance.unSubscribeServiceProvider(serviceId);
          jokiInstance = null;
        }
      }

      function sendMessageToJoki(msg) {
        var eventKey = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        txt("Send message with key ".concat(eventKey, " by ").concat(serviceId));
        jokiInstance.send(serviceId, msg, eventKey);
      }

      function addJokiEventListener(handlerFn) {
        var eventKey = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var listenerId = jokiInstance.listen(handlerFn, eventKey);
        return function () {
          jokiInstance.stop(listenerId);
        };
      }

      function broadcastServiceStateUpdate() {
        jokiInstance.serviceUpdated(serviceId);
      }

      function setDebugMode() {
        var setTo = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

        if (setTo === null) {
          debugMode = !debugMode;
        } else {
          debugMode = setTo;
        }
      }

      function txt(msg) {
        if (debugMode) {
          console.debug("JokiConnection:Debug: ".concat(msg));
        }
      }

      txt("Connection established with serviceId ".concat(serviceId));
      return {
        set: setJokiInstance,
        clear: removeJokiConnection,
        send: sendMessageToJoki,
        listen: addJokiEventListener,
        debug: setDebugMode,
        updated: broadcastServiceStateUpdate
      };
    }

    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      return Constructor;
    }

    function _defineProperty(obj, key, value) {
      if (key in obj) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        obj[key] = value;
      }

      return obj;
    }

    function _objectSpread(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i] != null ? arguments[i] : {};
        var ownKeys = Object.keys(source);

        if (typeof Object.getOwnPropertySymbols === 'function') {
          ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
            return Object.getOwnPropertyDescriptor(source, sym).enumerable;
          }));
        }

        ownKeys.forEach(function (key) {
          _defineProperty(target, key, source[key]);
        });
      }

      return target;
    }

    function _objectWithoutPropertiesLoose(source, excluded) {
      if (source == null) return {};
      var target = {};
      var sourceKeys = Object.keys(source);
      var key, i;

      for (i = 0; i < sourceKeys.length; i++) {
        key = sourceKeys[i];
        if (excluded.indexOf(key) >= 0) continue;
        target[key] = source[key];
      }

      return target;
    }

    function _objectWithoutProperties(source, excluded) {
      if (source == null) return {};

      var target = _objectWithoutPropertiesLoose(source, excluded);

      var key, i;

      if (Object.getOwnPropertySymbols) {
        var sourceSymbolKeys = Object.getOwnPropertySymbols(source);

        for (i = 0; i < sourceSymbolKeys.length; i++) {
          key = sourceSymbolKeys[i];
          if (excluded.indexOf(key) >= 0) continue;
          if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
          target[key] = source[key];
        }
      }

      return target;
    }

    function _slicedToArray(arr, i) {
      return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
    }

    function _arrayWithHoles(arr) {
      if (Array.isArray(arr)) return arr;
    }

    function _iterableToArrayLimit(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"] != null) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }

    var ClassService =
    /*#__PURE__*/
    function () {
      function ClassService(options) {
        _classCallCheck(this, ClassService);

        if (options.serviceId === undefined) {
          console.error("The ClassService constructor requires an option with key unique serviceId.");
          throw "The ClassService constructor requires an option with key unique serviceId.";
        } // if (options.joki === undefined) {
        //     console.error(
        //         "The ClassService constructor requires an option with key joki providing the Joki instance it uses."
        //     );
        //     throw "The ClassService constructor requires an option with key joki providing the Joki instance it uses.";
        // }


        var serviceId = options.serviceId,
            joki = options.joki;
        this._serviceId = serviceId;
        this.joki = connectJoki(this._serviceId, this.getState.bind(this), this.messageHandler.bind(this));

        if (options.joki !== undefined) {
          this.connectToJoki(options.joki);
        }
      }

      _createClass(ClassService, [{
        key: "connectToJoki",
        value: function connectToJoki(jokiInstance) {
          if (jokiInstance._isJoki() !== true) {
            console.error("The Joki provided is not a valid Joki Instance");
            throw "The Joki provided is not a valid Joki instance";
          }

          this.joki.set(jokiInstance);
        }
      }, {
        key: "getState",
        value: function getState() {
          throw "This function must be overridden in the service class inheriting from the ClassService. This function must return the current state of the service.";
        }
      }, {
        key: "messageHandler",
        value: function messageHandler(sender, msg, eventKey) {
          throw "This function must be overridden in the service class inheriting from the ClassService. This function handles incoming messages from the Joki.";
        }
      }, {
        key: "sendToJoki",
        value: function sendToJoki(msg) {
          var eventKey = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

          if (this.joki !== null) {
            this.joki.send(msg, eventKey);
          }
        }
      }]);

      return ClassService;
    }();

    function createReducerService(id, jokiInstance) {
      var initState = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var reducerFunction = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
      var serviceId = id;
      var data = initState;
      var joki = connectJoki(serviceId, getState, handleMessage);

      if (jokiInstance._isJoki() !== true) {
        throw jokiInstance;
      }

      joki.set(jokiInstance);

      if (typeof reducerFunction !== "function") {
        throw "reducerFunction must be a function with two arguments: state and action";
      }

      var reducer = reducerFunction;

      function getState() {
        return _objectSpread({}, data);
      }

      function handleMessage(sender, msg, eventKey) {
        reducerRunner({
          type: eventKey,
          data: msg
        });
      }

      function reducerRunner(action) {
        var newData = reducer(data, action);

        if (newData !== undefined) {
          data = newData;
          joki.updated();
        }
      }

      return {
        getState: getState,
        action: reducerRunner
      };
    }

    function createFetchService(serviceId, jokiInstance, options) {
      var _Object$assign = Object.assign({}, {
        format: "json",
        getEventKey: "".concat(serviceId, "-GET"),
        postEventKey: "".concat(serviceId, "-GET"),
        putEventKey: "".concat(serviceId, "-PUT"),
        deleteEventKey: "".concat(serviceId, "-DELETE"),
        headers: {}
      }, options),
          url = _Object$assign.url,
          format = _Object$assign.format,
          headers = _Object$assign.headers,
          rest = _objectWithoutProperties(_Object$assign, ["url", "format", "headers"]);
      var joki = connectJoki(serviceId, getState, handleMessage);
      joki.set(jokiInstance);
      var callHistory = [];

      function getState() {
        if (callHistory.length > 0) {
          return callHistory[0];
        }

        return {};
      }

      function handleMessage(sender, msg, eventKey) {
        // const { params, urlExtension, body, responseEventKey } = msg;
        switch (eventKey) {
          case rest.getEventKey:
            sendFetch(msg, "GET");
            break;

          case rest.postEventKey:
            sendFetch(msg, "POST");
            break;

          case rest.putEventKey:
            sendFetch(msg, "PUT"); // sendFetch(params, urlExtension, data, "PUT", responseEventKey);

            break;

          case rest.deleteEventKey:
            sendFetch(msg, "DELETE"); // sendFetch(params, urlExtension, data, "DELETE", responseEventKey);

            break;

          default:
            break;
        }
      }

      function _fetch(url) {
        var fetchParams = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        return new Promise(function (resolve, reject) {
          fetch(url, fetchParams).then(function (response) {
            switch (format) {
              case "json":
              default:
                resolve(response.json());
                break;
            }
          }).catch(function (err) {
            reject(err);
          });
        });
      }

      function _addToCallHistory(results) {
        callHistory.unshift(results);
      }

      function sendFetch(options) {
        var method = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "GET";

        var _Object$assign2 = Object.assign({}, {
          triggerEvent: true,
          urlExtension: "",
          body: null,
          header: null
        }, options),
            params = _Object$assign2.params,
            urlExtension = _Object$assign2.urlExtension,
            body = _Object$assign2.body,
            header = _Object$assign2.header,
            responseEventKey = _Object$assign2.responseEventKey;

        var fetchParams = {
          method: method
        };
        if (body !== null) fetchParams.body = body;
        if (header !== null) fetchParams.header = header;
        var fetchId = responseEventKey !== null ? responseEventKey : "".concat(Date.now(), "-").concat(Math.round(Math.random() * 10000));

        _fetch(urlParamParser(url, urlExtension, params), fetchParams).then(function (results) {
          receiveResults(results, fetchId);
        });

        return fetchId;
      }

      function receiveResults(results) {
        var fetchId = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

        _addToCallHistory(results);

        joki.send(results, fetchId);
      }

      function urlParamParser(url) {
        var urlExtension = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
        return "".concat(url).concat(urlExtension);
      }

      function fetchGET(options) {
        var _Object$assign3 = Object.assign({}, {
          triggerEvent: true,
          urlExtension: "",
          body: null,
          header: null
        }, options),
            params = _Object$assign3.params,
            urlExtension = _Object$assign3.urlExtension,
            body = _Object$assign3.body,
            triggerEvent = _Object$assign3.triggerEvent,
            header = _Object$assign3.header;

        return new Promise(function (resolve, reject) {
          var fetchParams = {
            method: "GET"
          };
          if (body !== null) fetchParams.body = body;
          if (header !== null) fetchParams.header = header;

          _fetch(urlParamParser(url, urlExtension, params), fetchParams).then(function (results) {
            if (triggerEvent) {
              setTimeout(function () {
                receiveResults(results, "FETCH-GET");
              }, 0);
            }

            resolve(results);
          }).catch(function (err) {
            reject(err);
          });
        });
      }

      function fetchPOST(options) {
        var _Object$assign4 = Object.assign({}, {
          triggerEvent: true,
          urlExtension: "",
          header: null,
          body: null
        }, options),
            params = _Object$assign4.params,
            urlExtension = _Object$assign4.urlExtension,
            body = _Object$assign4.body,
            triggerEvent = _Object$assign4.triggerEvent,
            header = _Object$assign4.header;

        return new Promise(function (resolve, reject) {
          var fetchParams = {
            method: "POST"
          };
          if (body !== null) fetchParams.body = body;
          if (header !== null) fetchParams.header = header;

          _fetch(urlParamParser(url, urlExtension, params), fetchParams).then(function (results) {
            if (triggerEvent) {
              setTimeout(function () {
                receiveResults(results, "FETCH-POST");
              }, 0);
            }

            resolve(results);
          }).catch(function (err) {
            reject(err);
          });
        });
      }

      return {
        get: fetchGET,
        post: fetchPOST
      };
    }

    function createJokiService(initOptions) {
      var serviceId = initOptions.id;
      var dataContainer = initOptions.container !== undefined ? initOptions.container : null;
      var serverConnection = initOptions.connection !== undefined ? initOptions.connection : null;
      var jokiConnection = initOptions.joki !== undefined ? initOptions.joki : null;
    }

    function MapContainer(mapOptions) {
      var data = new Map();
      var options = mapOptions;
      var idCounter = 0;
      var containerKey = options.key !== undefined ? options.key : Math.round(Math.random() * 1000);

      function _newKey() {
        return "id-".concat(containerKey, "-").concat(idCounter++);
      }

      function init() {}

      function get() {
        var rules = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

        // Return an array containing all values
        if (rules === null) {
          return Array.from(data.values());
        } // Return a value based on Joki Container Id


        if (typeof rules === "string") {
          if (data.has(rules)) {
            return data.get(rules);
          }

          return undefined;
        }

        var dataArr = Array.from(data.values());
        var ruleKeys = Object.keys(rules);
        return dataArr.filter(function (item) {
          return ruleKeys.every(function (key) {
            return item[key] !== undefined && item[key] === rules[key];
          });
        });
      }

      function set(item) {
        if (item._jokiContainerId === undefined) {
          item._jokiContainerId = _newKey();
        }

        data.set(item._jokiContainerId, item);
      }

      function del() {
      }

      function close() {}

      function stats() {
        return {
          size: data.size,
          modified: lastModified
        };
      }

      return {
        init: init,
        get: get,
        set: set,
        del: del,
        close: close,
        stats: stats
      };
    }

    function useListenJokiEvent(jokiInstance) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var _useState = react.useState({
        data: null,
        sender: null,
        eventKey: null
      }),
          _useState2 = _slicedToArray(_useState, 2),
          eventData = _useState2[0],
          updateData = _useState2[1];

      var targetEventKey = options.eventKey !== undefined ? options.eventKey : undefined;
      var targetSender = options.sender !== undefined ? options.sender : undefined;
      react.useEffect(function () {
        var listenerId = jokiInstance.listen(function (sender, msg, eventKey) {
          var eventKeyMatch = targetEventKey === undefined || targetEventKey === eventKey ? true : false;
          var senderMatch = targetSender === undefined || targetSender === sender ? true : false;

          if (eventKeyMatch && senderMatch) {
            updateData({
              data: msg,
              sender: sender,
              eventKey: eventKey
            });
          }
        }, targetEventKey);
        return function () {
          jokiInstance.stop(listenerId);
        };
      });
      return [eventData];
    }
    function useListenJokiService(jokiInstance, serviceId) {
      var _useState3 = react.useState({
        data: jokiInstance.getService(serviceId),
        listenerId: null
      }),
          _useState4 = _slicedToArray(_useState3, 2),
          data = _useState4[0],
          updateServiceData = _useState4[1];

      react.useEffect(function () {
        if (data.listenerId === null) {
          var listenerId = jokiInstance.listen(function (sender, msg, eventKey) {
            if (msg === "UPDATE" && eventKey === serviceId) {
              var newData = {
                data: jokiInstance.getService(serviceId),
                listenerId: data.listenerId
              };
              updateServiceData(newData);
            }
          }, serviceId);
          updateServiceData({
            data: data.data,
            listenerId: listenerId
          });
        }

        return function () {
          if (data.listenerId !== null) {
            jokiInstance.stop(data.listenerId);
          }
        };
      });
      return [data.data];
    }
    function trigger(jokiInstance) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var sender = options.sender !== undefined ? options.sender : "unknown-react-component";
      var eventKey = options.eventKey !== undefined ? options.eventKey : "all";
      var msg = options.data !== undefined ? options.data : options.msg !== undefined ? options.msg : {};
      var serviceId = options.serviceId !== undefined ? options.serviceId : null;

      if (serviceId !== null) {
        return sendToService(jokiInstance, serviceId, sender, msg, eventKey);
      }

      return sendToBus(jokiInstance, sender, msg, eventKey);
    }

    function sendToBus(jokiInstance, sender, msg, eventKey) {
      jokiInstance.send(sender, msg, eventKey);
    }

    function sendToService(jokiInstance, serviceId, sender, msg, eventKey) {
      jokiInstance.action(serviceId, sender, msg, eventKey);
    }

    exports.createJoki = createJoki;
    exports.connectJoki = connectJoki;
    exports.ClassService = ClassService;
    exports.createReducerService = createReducerService;
    exports.createFetchService = createFetchService;
    exports.useListenJokiEvent = useListenJokiEvent;
    exports.useListenJokiService = useListenJokiService;
    exports.useEvent = useListenJokiEvent;
    exports.useService = useListenJokiService;
    exports.trigger = trigger;
    exports.JokiService = createJokiService;
    exports.MapContainer = MapContainer;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
