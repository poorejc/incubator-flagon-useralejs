(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (process){
/* eslint-env browser */
/* eslint-disable import/newline-after-import */
// use higher-precision time than milliseconds
process.hrtime = require('browser-process-hrtime');

const theButton = document.getElementById('theButton');
// setup tracer
const {recorder} = require('./recorder');
const {Tracer, ExplicitContext} = require('zipkin');

const ctxImpl = new ExplicitContext();
const localServiceName = 'browser';
const tracer = new Tracer({ctxImpl, recorder: recorder(localServiceName), localServiceName});

// instrument fetch
const wrapFetch = require('zipkin-instrumentation-fetch');
const zipkinFetch = wrapFetch(fetch, {tracer});

const logEl = document.getElementById("log");
const log = text => logEl.innerHTML = `${logEl.innerHTML}\n${text}`;

// wrap fetch call so that it is traced
//  zipkinFetch('http://localhost:8081/')
//    .then(response => (response.text()))
//    .then(text => log(text))
//    .catch(err => log(`Failed:\n${err.stack}`));

function ziptest() {
  zipkinFetch('http://localhost:8081/')
    .then(response => (response.text()))
    .then(text => log(text))
    .catch(err => log(`Failed:\n${err.stack}`));
}

// test();

//document.getElementById('theButton').addEventListener('click', () => test, false);

}).call(this,require('_process'))
},{"./recorder":18,"_process":6,"browser-process-hrtime":2,"zipkin":17,"zipkin-instrumentation-fetch":13}],2:[function(require,module,exports){
(function (process,global){
module.exports = process.hrtime || hrtime

// polyfil for window.performance.now
var performance = global.performance || {}
var performanceNow =
  performance.now        ||
  performance.mozNow     ||
  performance.msNow      ||
  performance.oNow       ||
  performance.webkitNow  ||
  function(){ return (new Date()).getTime() }

// generate timestamp or delta
// see http://nodejs.org/api/process.html#process_process_hrtime
function hrtime(previousTimestamp){
  var clocktime = performanceNow.call(performance)*1e-3
  var seconds = Math.floor(clocktime)
  var nanoseconds = Math.floor((clocktime%1)*1e9)
  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0]
    nanoseconds = nanoseconds - previousTimestamp[1]
    if (nanoseconds<0) {
      seconds--
      nanoseconds += 1e9
    }
  }
  return [seconds,nanoseconds]
}
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":6}],3:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],4:[function(require,module,exports){
(function (global){
"use strict";

// ref: https://github.com/tc39/proposal-global
var getGlobal = function () {
	// the only reliable means to get the global object is
	// `Function('return this')()`
	// However, this causes CSP violations in Chrome apps.
	if (typeof self !== 'undefined') { return self; }
	if (typeof window !== 'undefined') { return window; }
	if (typeof global !== 'undefined') { return global; }
	throw new Error('unable to locate global object');
}

var global = getGlobal();

module.exports = exports = global.fetch;

// Needed for TypeScript and Webpack.
exports.default = global.fetch.bind(global);

exports.Headers = global.Headers;
exports.Request = global.Request;
exports.Response = global.Response;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(require,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

exports.homedir = function () {
	return '/'
};

},{}],6:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],7:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],8:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],9:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],10:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":8,"./encode":9}],11:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var punycode = require('punycode');
var util = require('./util');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.
      this.hostname = punycode.toASCII(this.hostname);
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1)
        continue;
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (util.isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      util.isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol')
        result[rkey] = relative[rkey];
    }

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especially happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

},{"./util":12,"punycode":7,"querystring":10}],12:[function(require,module,exports){
'use strict';

module.exports = {
  isString: function(arg) {
    return typeof(arg) === 'string';
  },
  isObject: function(arg) {
    return typeof(arg) === 'object' && arg !== null;
  },
  isNull: function(arg) {
    return arg === null;
  },
  isNullOrUndefined: function(arg) {
    return arg == null;
  }
};

},{}],13:[function(require,module,exports){
"use strict";

module.exports = require('./wrapFetch');
},{"./wrapFetch":14}],14:[function(require,module,exports){
"use strict";

var _require = require('zipkin'),
    Instrumentation = _require.Instrumentation;

function wrapFetch(fetch, _ref) {
  var tracer = _ref.tracer,
      serviceName = _ref.serviceName,
      remoteServiceName = _ref.remoteServiceName;
  var instrumentation = new Instrumentation.HttpClient({
    tracer: tracer,
    serviceName: serviceName,
    remoteServiceName: remoteServiceName
  });
  return function zipkinfetch(input) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return new Promise(function (resolve, reject) {
      tracer.scoped(function () {
        var url = typeof input === 'string' ? input : input.url;
        var method = opts.method || 'GET';
        var zipkinOpts = instrumentation.recordRequest(opts, url, method);
        var traceId = tracer.id;
        fetch(url, zipkinOpts).then(function (res) {
          tracer.scoped(function () {
            instrumentation.recordResponse(traceId, res.status);
          });
          resolve(res);
        })["catch"](function (err) {
          tracer.scoped(function () {
            instrumentation.recordError(traceId, err);
          });
          reject(err);
        });
      });
    });
  };
}

module.exports = wrapFetch;
},{"zipkin":17}],15:[function(require,module,exports){
(function (global){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

/* eslint-disable no-undef */
var globalFetch = typeof window !== 'undefined' && window.fetch || typeof global !== 'undefined' && global.fetch; // eslint-disable-next-line global-require

var fetch = globalFetch || require('node-fetch');

var _require = require('zipkin'),
    JSON_V1 = _require.jsonEncoder.JSON_V1;

var _require2 = require('events'),
    EventEmitter = _require2.EventEmitter;

var HttpLogger =
/*#__PURE__*/
function (_EventEmitter) {
  _inherits(HttpLogger, _EventEmitter);

  /**
   * @constructor
   * @param {Object} options
   * @param {string} options.endpoint HTTP endpoint which spans will be sent
   * @param {number} options.httpInterval How often to sync spans.
   * @param {JsonEncoder} options.jsonEncoder JSON encoder to use when sending spans.
   * @param {number} options.timeout Timeout for HTTP Post when sending spans.
   * @param {number} options.maxPayloadSize Max payload size for zipkin span.
   * @param {Object<string, string>} options.headers Additional HTTP headers to be sent with span.
   * @param {Agent|Function} options.agent HTTP(S) agent to use for any networking related options.
   * @param {ErrorLogger} options.log Internal error logger used within the transport.
   */
  function HttpLogger(_ref) {
    var _this;

    var endpoint = _ref.endpoint,
        _ref$headers = _ref.headers,
        headers = _ref$headers === void 0 ? {} : _ref$headers,
        _ref$agent = _ref.agent,
        agent = _ref$agent === void 0 ? null : _ref$agent,
        _ref$httpInterval = _ref.httpInterval,
        httpInterval = _ref$httpInterval === void 0 ? 1000 : _ref$httpInterval,
        _ref$jsonEncoder = _ref.jsonEncoder,
        jsonEncoder = _ref$jsonEncoder === void 0 ? JSON_V1 : _ref$jsonEncoder,
        _ref$timeout = _ref.timeout,
        timeout = _ref$timeout === void 0 ? 0 : _ref$timeout,
        _ref$maxPayloadSize = _ref.maxPayloadSize,
        maxPayloadSize = _ref$maxPayloadSize === void 0 ? 0 : _ref$maxPayloadSize,
        _ref$log = _ref.log,
        log = _ref$log === void 0 ? console : _ref$log;

    _classCallCheck(this, HttpLogger);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(HttpLogger).call(this)); // must be before any reference to *this*

    _this.log = log;
    _this.endpoint = endpoint;
    _this.agent = agent;
    _this.maxPayloadSize = maxPayloadSize;
    _this.queue = [];
    _this.queueBytes = 0;
    _this.jsonEncoder = jsonEncoder;
    _this.errorListenerSet = false;
    _this.headers = Object.assign({
      'Content-Type': 'application/json'
    }, headers); // req/res timeout in ms, it resets on redirect. 0 to disable (OS limit applies)
    // only supported by node-fetch; silently ignored by browser fetch clients
    // @see https://github.com/bitinn/node-fetch#fetch-options

    _this.timeout = timeout;
    var timer = setInterval(function () {
      _this.processQueue();
    }, httpInterval);

    if (timer.unref) {
      // unref might not be available in browsers
      timer.unref(); // Allows Node to terminate instead of blocking on timer
    }

    return _this;
  }

  _createClass(HttpLogger, [{
    key: "_getPayloadSize",
    value: function _getPayloadSize(nextSpan) {
      // Our payload is in format '[s1,s2,s3]', so we need to add 2 brackets and
      // one comma separator for each payload, including the next span if defined
      return nextSpan ? this.queueBytes + 2 + this.queue.length + nextSpan.length : this.queueBytes + 2 + Math.min(this.queue.length - 1, 0);
    }
  }, {
    key: "on",
    value: function on() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var eventName = args[0]; // if the instance has an error handler set then we don't need to
      // skips error logging

      if (eventName.toLowerCase() === 'error') this.errorListenerSet = true;

      _get(_getPrototypeOf(HttpLogger.prototype), "on", this).apply(this, args);
    }
  }, {
    key: "logSpan",
    value: function logSpan(span) {
      var encodedSpan = this.jsonEncoder.encode(span);

      if (this.maxPayloadSize && this._getPayloadSize(encodedSpan) > this.maxPayloadSize) {
        this.processQueue();

        if (this._getPayloadSize(encodedSpan) > this.maxPayloadSize) {
          // Payload size is too large even with an empty queue, we can only drop
          var err = 'Zipkin span got dropped, reason: payload too large';
          if (this.errorListenerSet) this.emit('error', new Error(err));else this.log.error(err);
          return;
        }
      }

      this.queue.push(encodedSpan);
      this.queueBytes += encodedSpan.length;
    }
  }, {
    key: "processQueue",
    value: function processQueue() {
      var _this2 = this;

      var self = this;

      if (self.queue.length > 0) {
        var postBody = "[".concat(self.queue.join(','), "]");
        fetch(self.endpoint, {
          method: 'POST',
          body: postBody,
          headers: self.headers,
          timeout: self.timeout,
          agent: self.agent
        }).then(function (response) {
          if (response.status !== 202 && response.status !== 200) {
            var err = 'Unexpected response while sending Zipkin data, status:' + "".concat(response.status, ", body: ").concat(postBody);
            if (self.errorListenerSet) _this2.emit('error', new Error(err));else _this2.log.error(err);
          } else {
            _this2.emit('success', response);
          }
        })["catch"](function (error) {
          var err = "Error sending Zipkin data ".concat(error);
          if (self.errorListenerSet) _this2.emit('error', new Error(err));else _this2.log.error(err);
        });
        self.queue.length = 0;
        self.queueBytes = 0;
      }
    }
  }]);

  return HttpLogger;
}(EventEmitter);

module.exports = HttpLogger;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"events":3,"node-fetch":4,"zipkin":17}],16:[function(require,module,exports){
"use strict";

module.exports.HttpLogger = require('./HttpLogger');
},{"./HttpLogger":15}],17:[function(require,module,exports){
(function (process){
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var os = _interopDefault(require('os'));
var url = _interopDefault(require('url'));

function _typeof(obj) {
  "@babel/helpers - typeof";

  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function (obj) {
      return typeof obj;
    };
  } else {
    _typeof = function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }

  return _typeof(obj);
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

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      writable: true,
      configurable: true
    }
  });
  if (superClass) _setPrototypeOf(subClass, superClass);
}

function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}

function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };

  return _setPrototypeOf(o, p);
}

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return self;
}

function _possibleConstructorReturn(self, call) {
  if (call && (typeof call === "object" || typeof call === "function")) {
    return call;
  }

  return _assertThisInitialized(self);
}

var None = {
  get type() {
    return 'None';
  },

  get present() {
    return false;
  },

  map: function map() {
    return this;
  },
  ifPresent: function ifPresent() {},
  flatMap: function flatMap() {
    return this;
  },
  getOrElse: function getOrElse(f) {
    return f instanceof Function ? f() : f;
  },
  equals: function equals(other) {
    return other === this;
  },
  toString: function toString() {
    return 'None';
  }
};

var Some =
/*#__PURE__*/
function () {
  function Some(value) {
    _classCallCheck(this, Some);

    this.value = value;
  }

  _createClass(Some, [{
    key: "map",
    value: function map(f) {
      return new Some(f(this.value));
    }
  }, {
    key: "ifPresent",
    value: function ifPresent(f) {
      f(this.value);
    }
  }, {
    key: "flatMap",
    value: function flatMap(f) {
      return f(this.value);
    }
  }, {
    key: "getOrElse",
    value: function getOrElse() {
      return this.value;
    }
  }, {
    key: "equals",
    value: function equals(other) {
      return other instanceof Some && other.value === this.value;
    }
  }, {
    key: "toString",
    value: function toString() {
      return "Some(".concat(this.value, ")");
    }
  }, {
    key: "type",
    get: function get() {
      // eslint-disable-line class-methods-use-this
      return 'Some';
    }
  }, {
    key: "present",
    get: function get() {
      // eslint-disable-line class-methods-use-this
      return true;
    }
  }]);

  return Some;
}(); // Used to validate input arguments


function isOptional(data) {
  return data instanceof Some || None.equals(data);
}

function verifyIsOptional(data) {
  if (data == null) {
    throw new Error('Error: data is not Optional - it\'s null');
  }

  if (isOptional(data)) {
    if (isOptional(data.value)) {
      throw new Error("Error: data (".concat(data.value, ") is wrapped in Option twice"));
    }
  } else {
    throw new Error("Error: data (".concat(data, ") is not an Option!"));
  }
}

function verifyIsNotOptional(data) {
  if (isOptional(data)) {
    throw new Error("Error: data (".concat(data, ") is an Option!"));
  }
}

function fromNullable(nullable) {
  return nullable == null ? None : new Some(nullable);
}

var Some_1 = Some;
var None_1 = None;
var isOptional_1 = isOptional;
var verifyIsOptional_1 = verifyIsOptional;
var verifyIsNotOptional_1 = verifyIsNotOptional;
var fromNullable_1 = fromNullable;
var option = {
  Some: Some_1,
  None: None_1,
  isOptional: isOptional_1,
  verifyIsOptional: verifyIsOptional_1,
  verifyIsNotOptional: verifyIsNotOptional_1,
  fromNullable: fromNullable_1
};

function pickInterface(interfaces, family) {
  /* eslint-disable */
  for (var i in interfaces) {
    /* eslint-enable */
    for (var j = interfaces[i].length - 1; j >= 0; j -= 1) {
      var face = interfaces[i][j];
      var reachable = family === 'IPv4' || face.scopeid === 0;
      if (!face.internal && face.family === family && reachable) return face.address;
    }
  }

  return family === 'IPv4' ? '127.0.0.1' : '::1';
}

function reduceInterfaces(interfaces, iface) {
  var ifaces = {};
  /*eslint-disable */

  for (var i in interfaces) {
    /* eslint-enable */
    if (i === iface) ifaces[i] = interfaces[i];
  }

  return ifaces;
}

function ipv4(iface) {
  var interfaces = os.networkInterfaces();
  if (iface) interfaces = reduceInterfaces(interfaces, iface);
  return pickInterface(interfaces, 'IPv4');
}

function ipv6(iface) {
  var interfaces = os.networkInterfaces();
  if (iface) interfaces = reduceInterfaces(interfaces, iface);
  return pickInterface(interfaces, 'IPv6');
}

ipv4.ipv4 = ipv4;
ipv4.ipv6 = ipv6;
var network = ipv4;

var InetAddress =
/*#__PURE__*/
function () {
  function InetAddress(addr) {
    _classCallCheck(this, InetAddress);

    this.addr = addr;
  } // returns undefined if this isn't an IPv4 string


  _createClass(InetAddress, [{
    key: "ipv4",
    value: function ipv4() {
      // coercing to int forces validation here
      var ipv4Int = this.toInt();

      if (ipv4Int && ipv4Int !== 0) {
        return this.addr;
      }

      return undefined;
    }
  }, {
    key: "toInt",
    value: function toInt() {
      // e.g. 10.57.50.83
      // should become
      // 171520595
      var parts = this.addr.split('.'); // The eslint tool always complains about using bitwise operators,
      // but in this case it's actually intentional, so we disable the warning:

      /* eslint-disable-next-line */

      return parts[0] << 24 | parts[1] << 16 | parts[2] << 8 | parts[3];
    }
  }, {
    key: "toString",
    value: function toString() {
      return "InetAddress(".concat(this.addr, ")");
    }
  }]);

  return InetAddress;
}(); // In non-node environments we fallback to 127.0.0.1


function getLocalAddress() {
  var isNode = (typeof process === "undefined" ? "undefined" : _typeof(process)) === 'object' && typeof process.on === 'function';

  if (!isNode) {
    return new InetAddress('127.0.0.1');
  } // eslint-disable-next-line global-require


  var networkAddress = network;
  return new InetAddress(networkAddress.ipv4());
} // Cache this value at import time so as to avoid network interface
// lookup on every call


var cachedLocalAddress = getLocalAddress();

InetAddress.getLocalAddress = function () {
  return cachedLocalAddress;
};

var InetAddress_1 = InetAddress;

var SimpleAnnotation =
/*#__PURE__*/
function () {
  function SimpleAnnotation() {
    _classCallCheck(this, SimpleAnnotation);
  }

  _createClass(SimpleAnnotation, [{
    key: "toString",
    value: function toString() {
      return "".concat(this.annotationType, "()");
    }
  }]);

  return SimpleAnnotation;
}();

var ClientSend =
/*#__PURE__*/
function (_SimpleAnnotation) {
  _inherits(ClientSend, _SimpleAnnotation);

  function ClientSend() {
    _classCallCheck(this, ClientSend);

    return _possibleConstructorReturn(this, _getPrototypeOf(ClientSend).apply(this, arguments));
  }

  return ClientSend;
}(SimpleAnnotation);

var ClientRecv =
/*#__PURE__*/
function (_SimpleAnnotation2) {
  _inherits(ClientRecv, _SimpleAnnotation2);

  function ClientRecv() {
    _classCallCheck(this, ClientRecv);

    return _possibleConstructorReturn(this, _getPrototypeOf(ClientRecv).apply(this, arguments));
  }

  return ClientRecv;
}(SimpleAnnotation);

var ServerSend =
/*#__PURE__*/
function (_SimpleAnnotation3) {
  _inherits(ServerSend, _SimpleAnnotation3);

  function ServerSend() {
    _classCallCheck(this, ServerSend);

    return _possibleConstructorReturn(this, _getPrototypeOf(ServerSend).apply(this, arguments));
  }

  return ServerSend;
}(SimpleAnnotation);

var ServerRecv =
/*#__PURE__*/
function (_SimpleAnnotation4) {
  _inherits(ServerRecv, _SimpleAnnotation4);

  function ServerRecv() {
    _classCallCheck(this, ServerRecv);

    return _possibleConstructorReturn(this, _getPrototypeOf(ServerRecv).apply(this, arguments));
  }

  return ServerRecv;
}(SimpleAnnotation);

var ProducerStart =
/*#__PURE__*/
function (_SimpleAnnotation5) {
  _inherits(ProducerStart, _SimpleAnnotation5);

  function ProducerStart() {
    _classCallCheck(this, ProducerStart);

    return _possibleConstructorReturn(this, _getPrototypeOf(ProducerStart).apply(this, arguments));
  }

  return ProducerStart;
}(SimpleAnnotation);

var ProducerStop =
/*#__PURE__*/
function (_SimpleAnnotation6) {
  _inherits(ProducerStop, _SimpleAnnotation6);

  function ProducerStop() {
    _classCallCheck(this, ProducerStop);

    return _possibleConstructorReturn(this, _getPrototypeOf(ProducerStop).apply(this, arguments));
  }

  return ProducerStop;
}(SimpleAnnotation);

var ConsumerStart =
/*#__PURE__*/
function (_SimpleAnnotation7) {
  _inherits(ConsumerStart, _SimpleAnnotation7);

  function ConsumerStart() {
    _classCallCheck(this, ConsumerStart);

    return _possibleConstructorReturn(this, _getPrototypeOf(ConsumerStart).apply(this, arguments));
  }

  return ConsumerStart;
}(SimpleAnnotation);

var ConsumerStop =
/*#__PURE__*/
function (_SimpleAnnotation8) {
  _inherits(ConsumerStop, _SimpleAnnotation8);

  function ConsumerStop() {
    _classCallCheck(this, ConsumerStop);

    return _possibleConstructorReturn(this, _getPrototypeOf(ConsumerStop).apply(this, arguments));
  }

  return ConsumerStop;
}(SimpleAnnotation);

function LocalOperationStart(name) {
  this.name = name;
}

LocalOperationStart.prototype.toString = function () {
  return "LocalOperationStart(\"".concat(this.name, "\")");
};

var LocalOperationStop =
/*#__PURE__*/
function (_SimpleAnnotation9) {
  _inherits(LocalOperationStop, _SimpleAnnotation9);

  function LocalOperationStop() {
    _classCallCheck(this, LocalOperationStop);

    return _possibleConstructorReturn(this, _getPrototypeOf(LocalOperationStop).apply(this, arguments));
  }

  return LocalOperationStop;
}(SimpleAnnotation);

function Message(message) {
  this.message = message;
}

Message.prototype.toString = function () {
  return "Message(\"".concat(this.message, "\")");
};

function ServiceName(serviceName) {
  this.serviceName = serviceName;
}

ServiceName.prototype.toString = function () {
  return "ServiceName(\"".concat(this.serviceName, "\")");
};

function Rpc(name) {
  this.name = name;
}

Rpc.prototype.toString = function () {
  return "Rpc(\"".concat(this.name, "\")");
};

function ClientAddr(_ref) {
  var host = _ref.host,
      port = _ref.port;
  this.host = host;
  this.port = port;
}

ClientAddr.prototype.toString = function () {
  return "ClientAddr(host=\"".concat(this.host, "\", port=").concat(this.port, ")");
};

function ServerAddr(_ref2) {
  var serviceName = _ref2.serviceName,
      host = _ref2.host,
      port = _ref2.port;
  this.serviceName = serviceName;
  this.host = host || undefined;
  this.port = port || 0;
}

ServerAddr.prototype.toString = function () {
  return "ServerAddr(serviceName=\"".concat(this.serviceName, "\", host=\"").concat(this.host, "\", port=").concat(this.port, ")");
};

function LocalAddr(_ref3) {
  var host = _ref3.host,
      port = _ref3.port;
  this.host = host || InetAddress_1.getLocalAddress();
  this.port = port || 0;
}

LocalAddr.prototype.toString = function () {
  return "LocalAddr(host=\"".concat(this.host.toString(), "\", port=").concat(this.port, ")");
};

function MessageAddr(_ref4) {
  var serviceName = _ref4.serviceName,
      host = _ref4.host,
      port = _ref4.port;
  this.serviceName = serviceName;
  this.host = host;
  this.port = port;
}

MessageAddr.prototype.toString = function () {
  return "MessageAddr(serviceName=\"".concat(this.serviceName, "\", host=\"").concat(this.host, "\", port=").concat(this.port, ")");
};

function BinaryAnnotation(key, value) {
  this.key = key;
  this.value = value;
}

BinaryAnnotation.prototype.toString = function () {
  return "BinaryAnnotation(".concat(this.key, "=\"").concat(this.value, "\")");
};

var annotation = {
  ClientSend: ClientSend,
  ClientRecv: ClientRecv,
  ServerSend: ServerSend,
  ServerRecv: ServerRecv,
  ProducerStart: ProducerStart,
  ProducerStop: ProducerStop,
  ConsumerStart: ConsumerStart,
  ConsumerStop: ConsumerStop,
  MessageAddr: MessageAddr,
  Message: Message,
  ServiceName: ServiceName,
  Rpc: Rpc,
  ClientAddr: ClientAddr,
  ServerAddr: ServerAddr,
  LocalAddr: LocalAddr,
  BinaryAnnotation: BinaryAnnotation,
  LocalOperationStart: LocalOperationStart,
  LocalOperationStop: LocalOperationStop
};
Object.keys(annotation).forEach(function (key) {
  annotation[key].prototype.annotationType = key;
});
var annotation_1 = annotation;

var isPromise_1 = isPromise;

function isPromise(obj) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

var Some$1 = option.Some; // Determines whether or not a traceId should be sampled.
// If no sample decision is already made (by a debug flag, or
// the "sampled" property is set), it will use evaluator,
// which is a function traceId => Boolean, and returns true if
// the traceId should be sampled (stored in Zipkin).

var Sampler =
/*#__PURE__*/
function () {
  function Sampler(evaluator) {
    _classCallCheck(this, Sampler);

    this.evaluator = evaluator;
  }

  _createClass(Sampler, [{
    key: "shouldSample",
    value: function shouldSample(traceId) {
      var _this = this;

      var result = traceId.sampled.getOrElse(function () {
        return _this.evaluator(traceId);
      });
      return new Some$1(result);
    }
  }, {
    key: "toString",
    value: function toString() {
      return "Sampler(".concat(this.evaluator.toString(), ")");
    }
  }]);

  return Sampler;
}();

function neverSample(traceId) {
  // eslint-disable-line no-unused-vars
  return false;
}

neverSample.toString = function () {
  return 'never sample';
};

function alwaysSample(traceId) {
  // eslint-disable-line no-unused-vars
  return true;
}

alwaysSample.toString = function () {
  return 'always sample';
};

function makeCountingEvaluator(sampleRate) {
  if (sampleRate <= 0) {
    return neverSample;
  } else if (sampleRate >= 1) {
    return alwaysSample;
  } else {
    var counter = 0;
    var limit = parseInt(1 / sampleRate);

    var counting = function counting(traceId) {
      // eslint-disable-line no-unused-vars
      counter %= limit;
      var shouldSample = counter === 0;
      counter += 1;
      return shouldSample;
    };

    counting.toString = function () {
      return "countingSampler: sampleRate=".concat(sampleRate);
    };

    return counting;
  }
}

var CountingSampler =
/*#__PURE__*/
function (_Sampler) {
  _inherits(CountingSampler, _Sampler);

  function CountingSampler() {
    var sampleRate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

    _classCallCheck(this, CountingSampler);

    return _possibleConstructorReturn(this, _getPrototypeOf(CountingSampler).call(this, makeCountingEvaluator(sampleRate < 1 ? sampleRate : 1)));
  }

  return CountingSampler;
}(Sampler);

var sampler = {
  Sampler: Sampler,
  CountingSampler: CountingSampler,
  neverSample: neverSample,
  alwaysSample: alwaysSample
};

var Record =
/*#__PURE__*/
function () {
  function Record(_ref) {
    var traceId = _ref.traceId,
        timestamp = _ref.timestamp,
        annotation = _ref.annotation;

    _classCallCheck(this, Record);

    this.traceId = traceId;
    this.timestamp = timestamp;
    this.annotation = annotation;
  }

  _createClass(Record, [{
    key: "toString",
    value: function toString() {
      return "Record(traceId=".concat(this.traceId.toString(), ", annotation=").concat(this.annotation.toString(), ")");
    }
  }]);

  return Record;
}();

var record = Record;

var Some$2 = option.Some,
    None$1 = option.None,
    verifyIsOptional$1 = option.verifyIsOptional,
    verifyIsNotOptional$1 = option.verifyIsNotOptional,
    isOptional$1 = option.isOptional;
var T = new Some$2(true);

var TraceId =
/*#__PURE__*/
function () {
  function TraceId(params) {
    _classCallCheck(this, TraceId);

    var spanId = params.spanId,
        _params$traceId = params.traceId,
        traceId = _params$traceId === void 0 ? spanId : _params$traceId,
        _params$parentId = params.parentId,
        parentId = _params$parentId === void 0 ? None$1 : _params$parentId,
        _params$flags = params.flags,
        flags = _params$flags === void 0 ? 0 : _params$flags,
        _params$debug = params.debug,
        debug = _params$debug === void 0 ? flags === 1 : _params$debug,
        _params$sampled = params.sampled,
        sampled = _params$sampled === void 0 ? None$1 : _params$sampled,
        _params$shared = params.shared,
        shared = _params$shared === void 0 ? false : _params$shared;
    verifyIsNotOptional$1(spanId);
    verifyIsOptional$1(parentId);
    verifyIsOptional$1(sampled); // support old signatures which allowed traceId to be optional

    if (isOptional$1(traceId)) {
      this._traceId = traceId.getOrElse(spanId);
    } else if (typeof traceId === 'undefined' || traceId === null) {
      this._traceId = spanId;
    } else {
      this._traceId = traceId;
    }

    this._parentId = parentId;
    this._spanId = spanId;
    this._sampled = debug ? T : sampled;
    this._debug = debug;
    this._shared = shared;
  }

  _createClass(TraceId, [{
    key: "isDebug",
    value: function isDebug() {
      return this._debug;
    }
  }, {
    key: "isShared",
    value: function isShared() {
      return this._shared;
    }
  }, {
    key: "toString",
    value: function toString() {
      return "TraceId(spanId=".concat(this.spanId.toString()) + ", parentSpanId=".concat(this.parentSpanId.toString()) + ", traceId=".concat(this.traceId.toString(), ")");
    }
  }, {
    key: "traceId",
    get: function get() {
      return this._traceId;
    }
  }, {
    key: "parentSpanId",
    get: function get() {
      return this._parentId;
    }
    /**
     * Please use parentSpanId instead as this can return confusing results (the span ID when absent).
     *
     * @deprecated since version v0.19
     */

  }, {
    key: "parentId",
    get: function get() {
      return this._parentId.getOrElse(this._spanId);
    }
  }, {
    key: "spanId",
    get: function get() {
      return this._spanId;
    }
  }, {
    key: "sampled",
    get: function get() {
      return this._sampled;
    }
    /**
     * Please use isDebug instead.
     *
     * @deprecated since version v0.19
     */

  }, {
    key: "flags",
    get: function get() {
      return this._debug ? 1 : 0;
    }
  }]);

  return TraceId;
}();

var TraceId_1 = TraceId;

// === Generate a random 64-bit number in fixed-length hex format
function randomTraceId() {
  var digits = '0123456789abcdef';
  var n = '';

  for (var i = 0; i < 16; i += 1) {
    var rand = Math.floor(Math.random() * 16);
    n += digits[rand];
  }

  return n;
}

var randomTraceId_1 = randomTraceId;

var hrTimeSupport = typeof process !== 'undefined' && process.hrtime; // since hrtime isn't available, we can ignore the input parameters

function nowLegacy() {
  return Date.now() * 1000;
}

function nowHrTime(startTimestamp, startTick) {
  if (startTimestamp && startTick) {
    var _hrtime = process.hrtime(startTick);

    var elapsedMicros = Math.floor(_hrtime[0] * 1000000 + _hrtime[1] / 1000);
    return startTimestamp + elapsedMicros;
  } else {
    return Date.now() * 1000;
  }
} // Returns the current time in epoch microseconds
// if startTimestamp and startTick are present, process.hrtime is used
// See https://nodejs.org/api/process.html#process_process_hrtime_time


var now = hrTimeSupport ? nowHrTime : nowLegacy;
var hrtime = hrTimeSupport ? function () {
  return process.hrtime();
} : function () {
  return undefined;
};
var time = {
  now: now,
  hrtime: hrtime
};

function Endpoint(_ref) {
  var serviceName = _ref.serviceName,
      ipv4 = _ref.ipv4,
      port = _ref.port;
  this.setServiceName(serviceName);
  this.setIpv4(ipv4);
  this.setPort(port);
}

Endpoint.prototype.setServiceName = function setServiceName(serviceName) {
  // In zipkin, names are lowercase. This eagerly converts to alert users early.
  this.serviceName = serviceName ? serviceName.toLocaleLowerCase() : undefined;
};

Endpoint.prototype.setIpv4 = function setIpv4(ipv4) {
  this.ipv4 = ipv4;
};

Endpoint.prototype.setPort = function setPort(port) {
  this.port = port || undefined;
};

Endpoint.prototype.isEmpty = function isEmpty() {
  return this.serviceName === undefined && this.ipv4 === undefined && this.port === undefined;
};

function Annotation(timestamp, value) {
  this.timestamp = timestamp;
  this.value = value.toString();
}

Annotation.prototype.toString = function toString() {
  return "Annotation(value=\"".concat(this.value, "\")");
};

function Span(traceId) {
  var _this = this;

  this.traceId = traceId.traceId;
  traceId.parentSpanId.ifPresent(function (id) {
    _this.parentId = id;
  });
  this.id = traceId.spanId;
  this.name = undefined; // no default

  this.kind = undefined; // no default

  this.timestamp = undefined;
  this.duration = undefined;
  this.localEndpoint = undefined; // no default

  this.remoteEndpoint = undefined; // no default

  this.annotations = [];
  this.tags = {};
  this.debug = traceId.isDebug();
  this.shared = traceId.isShared();
}

Span.prototype.setName = function setName(name) {
  // In zipkin, names are lowercase. This eagerly converts to alert users early.
  this.name = name ? name.toLocaleLowerCase() : undefined;
};

Span.prototype.setKind = function setKind(kind) {
  this.kind = kind;
};

Span.prototype.setTimestamp = function setTimestamp(timestamp) {
  this.timestamp = timestamp;
};

Span.prototype.setDuration = function setDuration(duration) {
  // Due to rounding errors, a fraction ends up as zero, so check undefined
  if (typeof duration !== 'undefined') {
    this.duration = Math.max(duration, 1);
  }
};

Span.prototype.setLocalEndpoint = function setLocalEndpoint(ep) {
  if (ep && !ep.isEmpty()) {
    this.localEndpoint = ep;
  } else {
    this.localEndpoint = undefined;
  }
};

Span.prototype.setRemoteEndpoint = function setRemoteEndpoint(ep) {
  if (ep && !ep.isEmpty()) {
    this.remoteEndpoint = ep;
  } else {
    this.remoteEndpoint = undefined;
  }
};

Span.prototype.addAnnotation = function addAnnotation(timestamp, value) {
  this.annotations.push(new Annotation(timestamp, value));
};

Span.prototype.putTag = function putTag(key, value) {
  this.tags[key] = value.toString();
};

Span.prototype.setDebug = function setDebug(debug) {
  this.debug = debug;
};

Span.prototype.setShared = function setShared(shared) {
  this.shared = shared;
};

Span.prototype.toString = function toString() {
  var annotations = this.annotations.map(function (a) {
    return a.toString();
  }).join(', ');
  return "Span(id=".concat(this.traceId, ", annotations=[").concat(annotations, "])");
};

var Endpoint_1 = Endpoint;
var Span_1 = Span;
var model = {
  Endpoint: Endpoint_1,
  Span: Span_1
};

var None$2 = option.None,
    Some$3 = option.Some;
var Sampler$1 = sampler.Sampler,
    alwaysSample$1 = sampler.alwaysSample;
var now$1 = time.now,
    hrtime$1 = time.hrtime;
var Endpoint$1 = model.Endpoint;

function requiredArg(name) {
  throw new Error("Tracer: Missing required argument ".concat(name, "."));
}

function isUndefinedOrNull(obj) {
  return typeof obj === 'undefined' || obj === null;
}

var Tracer =
/*#__PURE__*/
function () {
  function Tracer(_ref) {
    var _ref$ctxImpl = _ref.ctxImpl,
        ctxImpl = _ref$ctxImpl === void 0 ? requiredArg('ctxImpl') : _ref$ctxImpl,
        _ref$recorder = _ref.recorder,
        recorder = _ref$recorder === void 0 ? requiredArg('recorder') : _ref$recorder,
        _ref$sampler = _ref.sampler,
        sampler$$1 = _ref$sampler === void 0 ? new Sampler$1(alwaysSample$1) : _ref$sampler,
        _ref$traceId128Bit = _ref.traceId128Bit,
        traceId128Bit = _ref$traceId128Bit === void 0 ? false : _ref$traceId128Bit,
        _ref$supportsJoin = _ref.supportsJoin,
        supportsJoin = _ref$supportsJoin === void 0 ? true : _ref$supportsJoin,
        localServiceName = _ref.localServiceName,
        localEndpoint = _ref.localEndpoint,
        _ref$log = _ref.log,
        log = _ref$log === void 0 ? console : _ref$log,
        defaultTags = _ref.defaultTags;

    _classCallCheck(this, Tracer);

    this.log = log;
    this.recorder = recorder;
    this.sampler = sampler$$1;
    this.traceId128Bit = traceId128Bit;
    this.supportsJoin = supportsJoin;

    if (localEndpoint) {
      this._localEndpoint = localEndpoint;
    } else {
      this._localEndpoint = new Endpoint$1({
        serviceName: localServiceName || 'unknown'
      });
    }

    this._ctxImpl = ctxImpl; // The sentinel is used until there's a trace ID in scope.
    // Technically, this ID should have been unsampled, but it can break code to change that now.

    this._sentinelTraceId = this.createRootId();
    this._startTimestamp = now$1();
    this._startTick = hrtime$1(); // only set defaultTags in recorders which know about it

    if (this.recorder.setDefaultTags) {
      this.recorder.setDefaultTags(defaultTags);
    }
  }

  _createClass(Tracer, [{
    key: "scoped",
    value: function scoped(callback) {
      return this._ctxImpl.scoped(callback);
    }
  }, {
    key: "letId",
    value: function letId(id, callback) {
      return this._ctxImpl.letContext(id, callback);
    }
  }, {
    key: "createRootId",
    value: function createRootId() {
      var isSampled = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : None$2;
      var isDebug = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var rootSpanId = randomTraceId_1();
      var traceId = this.traceId128Bit ? randomTraceId_1() + rootSpanId : rootSpanId;
      var id = new TraceId_1({
        traceId: traceId,
        parentId: None$2,
        spanId: rootSpanId,
        sampled: isSampled,
        flags: isDebug ? 1 : 0
      });

      if (isSampled === None$2) {
        id._sampled = this.sampler.shouldSample(id);
      }

      return id;
    }
  }, {
    key: "createChildId",
    value: function createChildId(parentId) {
      if (isUndefinedOrNull(parentId)) {
        /* eslint-disable no-param-reassign */
        parentId = this._ctxImpl.getContext();
      }

      if (parentId === this._sentinelTraceId || isUndefinedOrNull(parentId)) {
        return this.createRootId();
      }

      var childId = new TraceId_1({
        traceId: parentId.traceId,
        parentId: new Some$3(parentId.spanId),
        spanId: randomTraceId_1(),
        debug: parentId.isDebug(),
        sampled: parentId.sampled
      });

      if (childId.sampled.present === false) {
        childId._sampled = this.sampler.shouldSample(childId);
      }

      return childId;
    } // this allows you to avoid use of implicit trace ID and defer implicit timestamp derivation

  }, {
    key: "_explicitRecord",
    value: function _explicitRecord(traceId, annotation) {
      var timestamp = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : now$1(this._startTimestamp, this._startTick);
      this.recorder.record(new record({
        traceId: traceId,
        timestamp: timestamp,
        annotation: annotation
      }));
    } // creates a span, timing the given callable, adding any error as a tag
    // if the callable returns a promise, a span stops after the promise resolves

  }, {
    key: "local",
    value: function local(operationName, callable) {
      var _this = this;

      if (typeof callable !== 'function') {
        throw new Error('you must pass a function');
      }

      return this.scoped(function () {
        var traceId = _this.createChildId();

        _this.setId(traceId);

        _this.recordServiceName(_this._localEndpoint.serviceName);

        _this.recordAnnotation(new annotation_1.LocalOperationStart(operationName));

        var result;

        try {
          result = callable();
        } catch (err) {
          _this.recordBinary('error', err.message ? err.message : err.toString());

          _this.recordAnnotation(new annotation_1.LocalOperationStop());

          throw err;
        } // Finish the span on a synchronous success


        if (!isPromise_1(result)) {
          _this.recordAnnotation(new annotation_1.LocalOperationStop());

          return result;
        }

        if (!traceId.sampled.getOrElse(false)) {
          return result; // no need to stop as it was never started
        } // At this point we know we are sampled. Explicitly record against the ID
        // Ensure the span representing the promise completes


        return result.then(function (output) {
          _this._explicitRecord(traceId, new annotation_1.LocalOperationStop());

          return output;
        })["catch"](function (err) {
          var message = err.message ? err.message : err.toString();

          _this._explicitRecord(traceId, new annotation_1.BinaryAnnotation('error', message));

          _this._explicitRecord(traceId, new annotation_1.LocalOperationStop());

          throw err;
        });
      });
    }
  }, {
    key: "join",
    value: function join(traceId) {
      if (isUndefinedOrNull(traceId)) {
        throw new Error('traceId is a required arg');
      } // duck type check until we sort out a better way. We don't want to break
      // transpiled usage ex. `traceId instanceof TraceId_1: false` See #422


      if (isUndefinedOrNull(traceId._spanId)) {
        throw new Error('Must be valid TraceId instance');
      }

      if (!this.supportsJoin) {
        return this.createChildId(traceId);
      }

      if (traceId.sampled === None$2) {
        /* eslint-disable no-param-reassign */
        traceId._sampled = this.sampler.shouldSample(traceId);
      } else {
        /* eslint-disable no-param-reassign */
        traceId._shared = true;
      }

      return traceId;
    }
  }, {
    key: "setId",
    value: function setId(traceId) {
      this._ctxImpl.setContext(traceId);
    } // Returns the current trace ID or a sentinel value indicating its absence.

  }, {
    key: "recordAnnotation",
    value: function recordAnnotation(annotation, timestamp) {
      if (this.id.sampled.getOrElse(false)) {
        this._explicitRecord(this.id, annotation, timestamp);
      }
    }
  }, {
    key: "recordMessage",
    value: function recordMessage(message) {
      this.recordAnnotation(new annotation_1.Message(message));
    }
  }, {
    key: "recordServiceName",
    value: function recordServiceName(serviceName) {
      this.recordAnnotation(new annotation_1.ServiceName(serviceName));
    }
  }, {
    key: "recordRpc",
    value: function recordRpc(name) {
      this.recordAnnotation(new annotation_1.Rpc(name));
    }
  }, {
    key: "recordClientAddr",
    value: function recordClientAddr(ia) {
      this.recordAnnotation(new annotation_1.ClientAddr(ia));
    }
  }, {
    key: "recordServerAddr",
    value: function recordServerAddr(ia) {
      this.recordAnnotation(new annotation_1.ServerAddr(ia));
    }
  }, {
    key: "recordLocalAddr",
    value: function recordLocalAddr(ia) {
      this.recordAnnotation(new annotation_1.LocalAddr(ia));
    }
  }, {
    key: "recordBinary",
    value: function recordBinary(key, value) {
      this.recordAnnotation(new annotation_1.BinaryAnnotation(key, value));
    }
  }, {
    key: "writeIdToConsole",
    value: function writeIdToConsole(message) {
      this.log.info("".concat(message, ": ").concat(this.id.toString()));
    }
  }, {
    key: "setTags",
    value: function setTags() {
      var tags = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      // eslint-disable-next-line no-restricted-syntax
      for (var tag in tags) {
        if (Object.prototype.hasOwnProperty.call(tags, tag)) {
          this.recordBinary(tag, tags[tag]);
        }
      }
    }
  }, {
    key: "id",
    get: function get() {
      return this._ctxImpl.getContext() || this._sentinelTraceId;
    }
  }, {
    key: "localEndpoint",
    get: function get() {
      return this._localEndpoint;
    }
  }]);

  return Tracer;
}();

var tracer = Tracer;

var explicitContext =
/*#__PURE__*/
function () {
  function ExplicitContext() {
    _classCallCheck(this, ExplicitContext);

    this.currentCtx = null;
  }

  _createClass(ExplicitContext, [{
    key: "setContext",
    value: function setContext(ctx) {
      this.currentCtx = ctx;
    }
  }, {
    key: "getContext",
    value: function getContext() {
      return this.currentCtx;
    }
  }, {
    key: "scoped",
    value: function scoped(callable) {
      var prevCtx = this.getContext();

      try {
        return callable();
      } finally {
        this.setContext(prevCtx);
      }
    }
  }, {
    key: "letContext",
    value: function letContext(ctx, callable) {
      var _this = this;

      return this.scoped(function () {
        _this.setContext(ctx);

        return callable();
      });
    }
  }]);

  return ExplicitContext;
}();

var noop = function createNoopTracer() {
  var recorder = {
    record: function record() {}
  };
  var ctxImpl = new explicitContext();
  return new tracer({
    recorder: recorder,
    ctxImpl: ctxImpl
  });
};

var httpHeaders = {
  TraceId: 'X-B3-TraceId',
  SpanId: 'X-B3-SpanId',
  ParentSpanId: 'X-B3-ParentSpanId',
  Sampled: 'X-B3-Sampled',
  Flags: 'X-B3-Flags'
};

var now$2 = time.now;
var Span$1 = model.Span,
    Endpoint$2 = model.Endpoint;
/**
 * defaultTags property name
 * @type {symbol}
 */

var defaultTagsSymbol = Symbol('defaultTags');

function _timedOut(span) {
  return span.timeoutTimestamp < now$2();
}
/**
 * @class PartialSpan
 */


var PartialSpan =
/*#__PURE__*/
function () {
  /**
   * @constructor
   * @param {TraceId} traceId
   * @param {number} timeoutTimestamp (epoch in microseconds) after this moment, data
   * should be forcibly flushed
   */
  function PartialSpan(traceId, timeoutTimestamp) {
    _classCallCheck(this, PartialSpan);

    this.traceId = traceId;
    this.timeoutTimestamp = timeoutTimestamp;
    this.delegate = new Span$1(traceId);
    this.localEndpoint = new Endpoint$2({});
    this.shouldFlush = false;
  }
  /**
   * Conditionally records the duration of the span, if it has a timestamp.
   *
   * @param {number} finishTimestamp (epoch in microseconds) to calculate the duration from
   */


  _createClass(PartialSpan, [{
    key: "setDuration",
    value: function setDuration(finishTimestamp) {
      if (this.shouldFlush) {
        return;
      }

      this.shouldFlush = true; // even if we can't derive duration, we should report on finish

      var startTimestamp = this.delegate.timestamp;

      if (typeof startTimestamp === 'undefined') {
        // We can't calculate duration without a start timestamp,
        // but an annotation is better than nothing
        this.delegate.addAnnotation(finishTimestamp, 'finish');
      } else {
        this.delegate.setDuration(finishTimestamp - startTimestamp);
      }
    }
  }]);

  return PartialSpan;
}();
/**
 * default timeout = 60 seconds (in microseconds)
 * @type {number}
 */


var defaultTimeout = 60 * 1000000;
/**
 * @class BatchRecorder
 */

var BatchRecorder =
/*#__PURE__*/
function () {
  /**
   * @constructor
   * @param {Object} options
   * @param {Logger} options.logger logs the data to zipkin server
   * @param {number} options.timeout timeout after which an unfinished span
   * is flushed to zipkin in **microseconds**. Passing this value has
   * implications in the reported data of the span so we discourage users
   * to pass a value for it unless there is a good reason for.
   */
  function BatchRecorder(_ref) {
    var _this = this;

    var logger = _ref.logger,
        _ref$timeout = _ref.timeout,
        timeout = _ref$timeout === void 0 ? defaultTimeout : _ref$timeout;

    _classCallCheck(this, BatchRecorder);

    this.logger = logger;
    this.timeout = timeout;
    /**
     * @type Map<string, PartialSpan>
     */

    this.partialSpans = new Map();
    this[defaultTagsSymbol] = {}; // read through the partials spans regularly
    // and collect any timed-out ones

    var timer = setInterval(function () {
      _this.partialSpans.forEach(function (span, id) {
        if (_timedOut(span)) {
          // the zipkin-js.flush annotation makes it explicit that
          // the span has been reported because of a timeout, even
          // when it is not finished yet (and thus enqueued for reporting)
          span.delegate.addAnnotation(now$2(), 'zipkin-js.flush');

          _this._writeSpan(id, span);
        }
      });
    }, 1000); // every second, this will flush to zipkin any spans that have timed out

    if (timer.unref) {
      // unref might not be available in browsers
      timer.unref(); // Allows Node to terminate instead of blocking on timer
    }
  }

  _createClass(BatchRecorder, [{
    key: "_addDefaultTagsAndLocalEndpoint",
    value: function _addDefaultTagsAndLocalEndpoint(span) {
      var defaultTags = this[defaultTagsSymbol]; // eslint-disable-next-line no-restricted-syntax

      for (var tag in defaultTags) {
        if (Object.prototype.hasOwnProperty.call(defaultTags, tag)) {
          span.delegate.putTag(tag, defaultTags[tag]);
        }
      }

      span.delegate.setLocalEndpoint(span.localEndpoint);
    }
  }, {
    key: "_writeSpan",
    value: function _writeSpan(id,
    /** @type PartialSpan */
    span) {
      var isNew = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      // TODO(adriancole) refactor so this responsibility isn't in writeSpan
      if (!isNew && typeof this.partialSpans.get(id) === 'undefined') {
        // Span not found. Could have been expired.
        return;
      } // ready for garbage collection


      this.partialSpans["delete"](id);
      var spanToWrite = span.delegate; // Only add default tags and local endpoint on the first report of a span

      if (span.delegate.timestamp) {
        this._addDefaultTagsAndLocalEndpoint(span);
      }

      this.logger.logSpan(spanToWrite);
    }
  }, {
    key: "_updateSpanMap",
    value: function _updateSpanMap(id, timestamp, updater) {
      var span;
      var isNew = false; // we need to special case late finish annotations

      if (this.partialSpans.has(id)) {
        span = this.partialSpans.get(id);
      } else {
        isNew = true;
        span = new PartialSpan(id, timestamp + this.timeout);
      }

      updater(span);

      if (span.shouldFlush) {
        this._writeSpan(id, span, isNew);
      } else {
        this.partialSpans.set(id, span);
      }
    }
    /**
     * Calling this will flush any pending spans to the transport.
     *
     * Note: the transport itself may be batching, in such case you may need to flush that also.
     */

  }, {
    key: "flush",
    value: function flush() {
      var _this2 = this;

      this.partialSpans.forEach(function (span, id) {
        _this2._writeSpan(id, span);
      });
    }
  }, {
    key: "record",
    value: function record(rec) {
      var id = rec.traceId;

      this._updateSpanMap(id, rec.timestamp, function (
      /** @type PartialSpan */
      span) {
        switch (rec.annotation.annotationType) {
          case 'ClientAddr':
            span.delegate.setKind('SERVER');
            span.delegate.setRemoteEndpoint(new Endpoint$2({
              serviceName: rec.annotation.serviceName,
              ipv4: rec.annotation.host && rec.annotation.host.ipv4(),
              port: rec.annotation.port
            }));
            break;

          case 'ClientSend':
            span.delegate.setKind('CLIENT');
            span.delegate.setTimestamp(rec.timestamp);
            break;

          case 'ClientRecv':
            span.delegate.setKind('CLIENT');
            span.setDuration(rec.timestamp);
            break;

          case 'ServerSend':
            span.delegate.setKind('SERVER');
            span.setDuration(rec.timestamp);
            break;

          case 'ServerRecv':
            span.delegate.setShared(id.isShared());
            span.delegate.setKind('SERVER');
            span.delegate.setTimestamp(rec.timestamp);
            break;

          case 'ProducerStart':
            span.delegate.setKind('PRODUCER');
            span.delegate.setTimestamp(rec.timestamp);
            break;

          case 'ProducerStop':
            span.delegate.setKind('PRODUCER');
            span.setDuration(rec.timestamp);
            break;

          case 'ConsumerStart':
            span.delegate.setKind('CONSUMER');
            span.delegate.setTimestamp(rec.timestamp);
            break;

          case 'ConsumerStop':
            span.delegate.setKind('CONSUMER');
            span.setDuration(rec.timestamp);
            break;

          case 'MessageAddr':
            span.delegate.setRemoteEndpoint(new Endpoint$2({
              serviceName: rec.annotation.serviceName,
              ipv4: rec.annotation.host && rec.annotation.host.ipv4(),
              port: rec.annotation.port
            }));
            break;

          case 'LocalOperationStart':
            span.delegate.setName(rec.annotation.name);
            span.delegate.setTimestamp(rec.timestamp);
            break;

          case 'LocalOperationStop':
            span.setDuration(rec.timestamp);
            break;

          case 'Message':
            span.delegate.addAnnotation(rec.timestamp, rec.annotation.message);
            break;

          case 'Rpc':
            span.delegate.setName(rec.annotation.name);
            break;

          case 'ServiceName':
            span.localEndpoint.setServiceName(rec.annotation.serviceName);
            break;

          case 'BinaryAnnotation':
            span.delegate.putTag(rec.annotation.key, rec.annotation.value);
            break;

          case 'LocalAddr':
            span.localEndpoint.setIpv4(rec.annotation.host && rec.annotation.host.ipv4());
            span.localEndpoint.setPort(rec.annotation.port);
            break;

          case 'ServerAddr':
            span.delegate.setKind('CLIENT');
            span.delegate.setRemoteEndpoint(new Endpoint$2({
              serviceName: rec.annotation.serviceName,
              ipv4: rec.annotation.host && rec.annotation.host.ipv4(),
              port: rec.annotation.port
            }));
            break;

          default:
            break;
        }
      });
    }
  }, {
    key: "setDefaultTags",
    value: function setDefaultTags(tags) {
      this[defaultTagsSymbol] = tags;
    }
  }, {
    key: "toString",
    value: function toString() {
      // eslint-disable-line class-methods-use-this
      return 'BatchRecorder()';
    }
  }]);

  return BatchRecorder;
}();

var batchRecorder = BatchRecorder;

/**
 * @class ConsoleRecorder
 */
var ConsoleRecorder =
/*#__PURE__*/
function () {
  /* eslint-disable no-console */
  function ConsoleRecorder() {
    var logger = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : console.log;

    _classCallCheck(this, ConsoleRecorder);

    this.logger = logger;
  }

  _createClass(ConsoleRecorder, [{
    key: "record",
    value: function record(rec) {
      var _rec$traceId = rec.traceId,
          spanId = _rec$traceId.spanId,
          parentId = _rec$traceId.parentId,
          traceId = _rec$traceId.traceId;
      this.logger("Record at (timestamp=".concat(rec.timestamp, ", spanId=").concat(spanId, ", parentId=").concat(parentId, ", ") + "traceId=".concat(traceId, "): ").concat(rec.annotation.toString()));
    }
  }, {
    key: "toString",
    value: function toString() {
      // eslint-disable-line class-methods-use-this
      return 'consoleTracer';
    }
  }]);

  return ConsoleRecorder;
}();

var consoleRecorder = ConsoleRecorder;

function parseRequestUrl(requestUrl) {
  var parsed = url.parse(requestUrl);
  return {
    host: parsed.hostname,
    path: parsed.pathname
  };
}

var parseUrl = parseRequestUrl;

var Some$4 = option.Some,
    None$3 = option.None;

function stringToBoolean(str) {
  return str === '1' || str === 'true';
}

function stringToIntOption(str) {
  try {
    return new Some$4(parseInt(str));
  } catch (err) {
    return None$3;
  }
}

function containsRequiredHeaders(readHeader) {
  return readHeader(httpHeaders.TraceId) !== None$3 && readHeader(httpHeaders.SpanId) !== None$3;
}

function requiredArg$1(name) {
  throw new Error("HttpServerInstrumentation: Missing required argument ".concat(name, "."));
}

var HttpServerInstrumentation =
/*#__PURE__*/
function () {
  function HttpServerInstrumentation(_ref) {
    var _ref$tracer = _ref.tracer,
        tracer = _ref$tracer === void 0 ? requiredArg$1('tracer') : _ref$tracer,
        _ref$serviceName = _ref.serviceName,
        serviceName = _ref$serviceName === void 0 ? tracer.localEndpoint.serviceName : _ref$serviceName,
        host = _ref.host,
        _ref$port = _ref.port,
        port = _ref$port === void 0 ? requiredArg$1('port') : _ref$port;

    _classCallCheck(this, HttpServerInstrumentation);

    this.tracer = tracer;
    this.serviceName = serviceName;
    this.host = host && new InetAddress_1(host);
    this.port = port;
  }

  _createClass(HttpServerInstrumentation, [{
    key: "_createIdFromHeaders",
    value: function _createIdFromHeaders(readHeader) {
      if (containsRequiredHeaders(readHeader)) {
        var spanId = readHeader(httpHeaders.SpanId);
        var parentId = spanId.map(function (sid) {
          var traceId = readHeader(httpHeaders.TraceId);
          var parentSpanId = readHeader(httpHeaders.ParentSpanId);
          var sampled = readHeader(httpHeaders.Sampled);
          var flags = readHeader(httpHeaders.Flags).flatMap(stringToIntOption).getOrElse(0);
          return new TraceId_1({
            traceId: traceId.getOrElse(),
            parentId: parentSpanId,
            spanId: sid,
            debug: flags === 1,
            sampled: sampled.map(stringToBoolean)
          });
        });
        return new Some$4(this.tracer.join(parentId.getOrElse()));
      } else if (readHeader(httpHeaders.Flags) !== None$3 || readHeader(httpHeaders.Sampled) !== None$3) {
        var sampled = readHeader(httpHeaders.Sampled) === None$3 ? None$3 : readHeader(httpHeaders.Sampled).map(stringToBoolean);
        var flags = readHeader(httpHeaders.Flags).flatMap(stringToIntOption).getOrElse(0);
        return new Some$4(this.tracer.createRootId(sampled, flags === 1));
      } else {
        return new Some$4(this.tracer.createRootId());
      }
    }
  }, {
    key: "spanNameFromRoute",
    value: function spanNameFromRoute(method, route, code) {
      // eslint-disable-line class-methods-use-this
      if (code > 299 && code < 400) return "".concat(method, " redirected");
      if (code === 404) return "".concat(method, " not_found");
      if (!route || route === '') return method;
      return "".concat(method, " ").concat(route);
    }
  }, {
    key: "recordRequest",
    value: function recordRequest(method, requestUrl, readHeader) {
      var _this = this;

      this._createIdFromHeaders(readHeader).ifPresent(function (id) {
        return _this.tracer.setId(id);
      });

      var id = this.tracer.id;

      var _parseRequestUrl = parseUrl(requestUrl),
          path = _parseRequestUrl.path;

      this.tracer.recordServiceName(this.serviceName);
      this.tracer.recordRpc(method.toUpperCase());
      this.tracer.recordBinary('http.path', path);
      this.tracer.recordAnnotation(new annotation_1.ServerRecv());
      this.tracer.recordAnnotation(new annotation_1.LocalAddr({
        host: this.host,
        port: this.port
      }));
      return id;
    }
  }, {
    key: "recordResponse",
    value: function recordResponse(id, statusCode, error) {
      this.tracer.setId(id);
      this.tracer.recordBinary('http.status_code', statusCode.toString());

      if (error) {
        this.tracer.recordBinary('error', error.toString());
      } else if (statusCode < 200 || statusCode > 399) {
        this.tracer.recordBinary('error', statusCode.toString());
      }

      this.tracer.recordAnnotation(new annotation_1.ServerSend());
    }
  }]);

  return HttpServerInstrumentation;
}();

var httpServer = HttpServerInstrumentation;

function appendZipkinHeaders(req, traceId) {
  var headers = req.headers || {};
  headers[httpHeaders.TraceId] = traceId.traceId;
  headers[httpHeaders.SpanId] = traceId.spanId;
  traceId.parentSpanId.ifPresent(function (psid) {
    headers[httpHeaders.ParentSpanId] = psid;
  });
  traceId.sampled.ifPresent(function (sampled) {
    headers[httpHeaders.Sampled] = sampled ? '1' : '0';
  });

  if (traceId.isDebug()) {
    headers[httpHeaders.Flags] = '1';
  }

  return headers;
}

function addZipkinHeaders(req, traceId) {
  var headers = appendZipkinHeaders(req, traceId);
  return Object.assign({}, req, {
    headers: headers
  });
}

var request = {
  addZipkinHeaders: addZipkinHeaders
};

function requiredArg$2(name) {
  throw new Error("HttpClientInstrumentation: Missing required argument ".concat(name, "."));
}

var HttpClientInstrumentation =
/*#__PURE__*/
function () {
  function HttpClientInstrumentation(_ref) {
    var _ref$tracer = _ref.tracer,
        tracer = _ref$tracer === void 0 ? requiredArg$2('tracer') : _ref$tracer,
        _ref$serviceName = _ref.serviceName,
        serviceName = _ref$serviceName === void 0 ? tracer.localEndpoint.serviceName : _ref$serviceName,
        remoteServiceName = _ref.remoteServiceName;

    _classCallCheck(this, HttpClientInstrumentation);

    this.tracer = tracer;
    this.serviceName = serviceName;
    this.remoteServiceName = remoteServiceName;
  }

  _createClass(HttpClientInstrumentation, [{
    key: "recordRequest",
    value: function recordRequest(request$$1, url$$1, method) {
      this.tracer.setId(this.tracer.createChildId());
      var traceId = this.tracer.id;

      var _parseRequestUrl = parseUrl(url$$1),
          path = _parseRequestUrl.path;

      this.tracer.recordServiceName(this.serviceName);
      this.tracer.recordRpc(method.toUpperCase());
      this.tracer.recordBinary('http.path', path);
      this.tracer.recordAnnotation(new annotation_1.ClientSend());

      if (this.remoteServiceName) {
        // TODO: can we get the host and port of the http connection?
        this.tracer.recordAnnotation(new annotation_1.ServerAddr({
          serviceName: this.remoteServiceName
        }));
      }

      return request.addZipkinHeaders(request$$1, traceId);
    }
  }, {
    key: "recordResponse",
    value: function recordResponse(traceId, statusCode) {
      this.tracer.setId(traceId);
      this.tracer.recordBinary('http.status_code', statusCode.toString());

      if (statusCode < 200 || statusCode > 399) {
        this.tracer.recordBinary('error', statusCode.toString());
      }

      this.tracer.recordAnnotation(new annotation_1.ClientRecv());
    }
  }, {
    key: "recordError",
    value: function recordError(traceId, error) {
      this.tracer.setId(traceId);
      this.tracer.recordBinary('error', error.toString());
      this.tracer.recordAnnotation(new annotation_1.ClientRecv());
    }
  }]);

  return HttpClientInstrumentation;
}();

var httpClient = HttpClientInstrumentation;

var instrumentation = {
  HttpServer: httpServer,
  HttpClient: httpClient
};

function toV1Endpoint(endpoint) {
  if (endpoint === undefined) {
    return undefined;
  }

  var res = {
    serviceName: endpoint.serviceName || '' // undefined is not allowed in v1

  };

  if (endpoint.ipv4) {
    res.ipv4 = endpoint.ipv4;
  }

  if (endpoint.port) {
    res.port = endpoint.port;
  }

  return res;
}

function toV1Annotation(ann, endpoint) {
  return {
    value: ann.value,
    timestamp: ann.timestamp,
    endpoint: endpoint
  };
}

function encodeV1(span) {
  var res = {
    traceId: span.traceId
  };

  if (span.parentId) {
    // instead of writing "parentId": NULL
    res.parentId = span.parentId;
  }

  res.id = span.id;
  res.name = span.name || ''; // undefined is not allowed in v1
  // Log timestamp and duration if this tracer started and completed this span.

  if (!span.shared) {
    res.timestamp = span.timestamp;
    res.duration = span.duration;
  }

  var jsonEndpoint = toV1Endpoint(span.localEndpoint);
  var beginAnnotation;
  var endAnnotation;
  var addressKey;

  switch (span.kind) {
    case 'CLIENT':
      beginAnnotation = span.timestamp ? 'cs' : undefined;
      endAnnotation = 'cr';
      addressKey = 'sa';
      break;

    case 'SERVER':
      beginAnnotation = span.timestamp ? 'sr' : undefined;
      endAnnotation = 'ss';
      addressKey = 'ca';
      break;

    case 'PRODUCER':
      beginAnnotation = span.timestamp ? 'ms' : undefined;
      endAnnotation = 'ws';
      addressKey = 'ma';
      break;

    case 'CONSUMER':
      if (span.timestamp && span.duration) {
        beginAnnotation = 'wr';
        endAnnotation = 'mr';
      } else if (span.timestamp) {
        beginAnnotation = 'mr';
      }

      addressKey = 'ma';
      break;

    default:
  }

  if (span.annotations.length > 0 || beginAnnotation) {
    // don't write empty array
    res.annotations = span.annotations.map(function (ann) {
      return toV1Annotation(ann, jsonEndpoint);
    });
  }

  if (beginAnnotation) {
    res.annotations.push({
      value: beginAnnotation,
      timestamp: span.timestamp,
      endpoint: jsonEndpoint
    });

    if (span.duration) {
      res.annotations.push({
        value: endAnnotation,
        timestamp: span.timestamp + span.duration,
        endpoint: jsonEndpoint
      });
    }
  }

  var keys = Object.keys(span.tags);

  if (keys.length > 0 || span.remoteEndpoint) {
    // don't write empty array
    res.binaryAnnotations = keys.map(function (key) {
      return {
        key: key,
        value: span.tags[key],
        endpoint: jsonEndpoint
      };
    });
  }

  if (span.remoteEndpoint) {
    var address = {
      key: addressKey,
      value: true,
      endpoint: toV1Endpoint(span.remoteEndpoint)
    };
    res.binaryAnnotations.push(address);
  }

  if (span.debug) {
    // instead of writing "debug": false
    res.debug = true;
  }

  return JSON.stringify(res);
}

function encodeV2(span) {
  var copy = {
    traceId: span.traceId
  };

  if (span.parentId) {
    copy.parentId = span.parentId;
  }

  copy.id = span.id;

  if (span.name) {
    copy.name = span.name;
  }

  if (span.kind) {
    copy.kind = span.kind;
  }

  if (span.timestamp) {
    copy.timestamp = span.timestamp;
  }

  if (span.duration) {
    copy.duration = span.duration;
  }

  if (span.localEndpoint) {
    copy.localEndpoint = span.localEndpoint;
  }

  if (span.remoteEndpoint) {
    copy.remoteEndpoint = span.remoteEndpoint;
  }

  if (span.annotations.length > 0) {
    copy.annotations = span.annotations;
  }

  if (Object.keys(span.tags).length > 0) {
    copy.tags = span.tags;
  }

  if (span.debug) {
    copy.debug = true;
  }

  if (span.shared) {
    copy.shared = true;
  }

  return JSON.stringify(copy);
}

var JSON_V1 = {
  encode: function encode(span) {
    return encodeV1(span);
  }
};
var JSON_V2 = {
  encode: function encode(span) {
    return encodeV2(span);
  }
};
var jsonEncoder = {
  JSON_V1: JSON_V1,
  JSON_V2: JSON_V2
};

exports.option = option;
exports.Annotation = annotation_1;
exports.Tracer = tracer;
exports.createNoopTracer = noop;
exports.randomTraceId = randomTraceId_1;
exports.sampler = sampler;
exports.TraceId = TraceId_1;
exports.HttpHeaders = httpHeaders;
exports.InetAddress = InetAddress_1;
exports.BatchRecorder = batchRecorder;
exports.ConsoleRecorder = consoleRecorder;
exports.ExplicitContext = explicitContext;
exports.Instrumentation = instrumentation;
exports.Request = request;
exports.jsonEncoder = jsonEncoder;
exports.model = model;
exports.parseRequestUrl = parseUrl;

}).call(this,require('_process'))
},{"_process":6,"os":5,"url":11}],18:[function(require,module,exports){
(function (process){
/* eslint-env browser */
const {
  BatchRecorder,
  jsonEncoder: {JSON_V2}
} = require('zipkin');
const {HttpLogger} = require('zipkin-transport-http');

const debug = 'undefined' !== typeof window
  ? window.location.search.indexOf('debug') !== -1
  : process.env.DEBUG;

// Send spans to Zipkin asynchronously over HTTP
const zipkinBaseUrl = 'http://localhost:9411';

const httpLogger = new HttpLogger({
  endpoint: `${zipkinBaseUrl}/api/v2/spans`,
  jsonEncoder: JSON_V2
});

function recorder(serviceName) {
  return debug ? debugRecorder(serviceName) : new BatchRecorder({logger: httpLogger});
}

function debugRecorder(serviceName) {
  // This is a hack that lets you see the data sent to Zipkin!
  const logger = {
    logSpan: (span) => {
      const json = JSON_V2.encode(span);
      console.log(`${serviceName} reporting: ${json}`);
      httpLogger.logSpan(span);
    }
  };

  const batchRecorder = new BatchRecorder({logger});

  // This is a hack that lets you see which annotations become which spans
  return ({
    record: (rec) => {
      const {spanId, traceId} = rec.traceId;
      console.log(`${serviceName} recording: ${traceId}/${spanId} ${rec.annotation.toString()}`);
      batchRecorder.record(rec);
    }
  });
}

module.exports.recorder = recorder;

}).call(this,require('_process'))
},{"_process":6,"zipkin":17,"zipkin-transport-http":16}]},{},[1]);
