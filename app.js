(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Promise = require('promise');
var type = require('component-type');
var localForage = require('localforage');

/**
 * Setup `localForage`.
 */

localForage.config({
  name: 'storage'
});

/**
 * Expose `storage()`.
 */

module.exports = storage;

/**
 * Facade to get/set/del/count methods.
 *
 * @param {String|Array|Object} key
 * @param {Mixed|Null} val
 * @param {Function} cb
 */

function storage(key, val, cb) {
  var length = arguments.length;
  if (type(arguments[length - 1]) != 'function') length += 1;

  switch (length) {
    case 3: return val === null
      ? del(key, cb)
      : set(key, val, cb);
    case 2: return type(key) == 'object'
      ? set(key, val)
      : get(key, val);
    default:
      return count(key);
  }
}

/**
 * Expose methods & properties.
 */

storage.get = get;
storage.set = set;
storage.del = del;
storage.count = count;
storage.clear = clear;
storage.development = false;
storage.forage = localForage;

/**
 * Get `key`.
 *
 * @param {Array|Mixed} key
 * @param {Function} cb
 */

function get(key, cb) {
  return type(key) != 'array'
    ? localForage.getItem(key).then(wrap(cb, true), cb)
    : Promise.all(key.map(getSubkey)).then(wrap(cb, true), cb);

  function getSubkey(key) {
    return get(key, function() {}); // noob function to prevent logs
  }
}

/**
 * Set `val` to `key`.
 *
 * @param {Array|Mixed} key
 * @param {Mixed} val
 * @param {Function} cb
 */

function set(key, val, cb) {
  return type(key) != 'object'
    ? localForage.setItem(key, val).then(wrap(cb), cb)
    : Promise.all(Object.keys(key).map(setSubkey)).then(wrap(val), val);

  function setSubkey(subkey, next) {
    return key[subkey] === null
      ? del(subkey, next)
      : set(subkey, key[subkey], next);
  }
}

/**
 * Delete `key`.
 *
 * @param {Array|Mixed} key
 * @param {Function} cb
 */

function del(key, cb) {
  return type(key) != 'array'
    ? localForage.removeItem(key).then(wrap(cb), cb)
    : Promise.all(key.map(del)).then(wrap(cb), cb);
}

/**
 * Clear.
 *
 * @param {Function} cb
 */

function clear(cb) {
  return localForage.clear().then(wrap(cb), cb);
}

/**
 * Count records.
 *
 * @param {Functionc} cb
 */

function count(cb) {
  return localForage.length().then(wrap(cb, true), cb);
}

/**
 * Wrap promise style response to callback style.
 * If `cb` does not specified, it uses console.log in development mode.
 *
 * @param {Function} cb
 * @param {Boolean} [hasResult]
 * @return {Function}
 */

function wrap(cb, hasResult) {
  return function(res) {
    if (type(cb) == 'function') {
      hasResult ? cb(null, res) : cb();
    } else if (hasResult && storage.development) {
      console.log(res);
    }
    return res;
  };
}

},{"component-type":2,"localforage":6,"promise":9}],2:[function(require,module,exports){
/**
 * toString ref.
 */

var toString = Object.prototype.toString;

/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = function(val){
  switch (toString.call(val)) {
    case '[object Date]': return 'date';
    case '[object RegExp]': return 'regexp';
    case '[object Arguments]': return 'arguments';
    case '[object Array]': return 'array';
    case '[object Error]': return 'error';
  }

  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val !== val) return 'nan';
  if (val && val.nodeType === 1) return 'element';

  val = val.valueOf
    ? val.valueOf()
    : Object.prototype.valueOf.apply(val)

  return typeof val;
};

},{}],3:[function(require,module,exports){
// Some code originally from async_storage.js in
// [Gaia](https://github.com/mozilla-b2g/gaia).
(function() {
    'use strict';

    // Originally found in https://github.com/mozilla-b2g/gaia/blob/e8f624e4cc9ea945727278039b3bc9bcb9f8667a/shared/js/async_storage.js

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
                  require('promise') : this.Promise;

    // Initialize IndexedDB; fall back to vendor-prefixed versions if needed.
    var indexedDB = indexedDB || this.indexedDB || this.webkitIndexedDB ||
                    this.mozIndexedDB || this.OIndexedDB ||
                    this.msIndexedDB;

    // If IndexedDB isn't available, we get outta here!
    if (!indexedDB) {
        return;
    }

    // Open the IndexedDB database (automatically creates one if one didn't
    // previously exist), using any options set in the config.
    function _initStorage(options) {
        var self = this;
        var dbInfo = {
            db: null
        };

        if (options) {
            for (var i in options) {
                dbInfo[i] = options[i];
            }
        }

        return new Promise(function(resolve, reject) {
            var openreq = indexedDB.open(dbInfo.name, dbInfo.version);
            openreq.onerror = function() {
                reject(openreq.error);
            };
            openreq.onupgradeneeded = function() {
                // First time setup: create an empty object store
                openreq.result.createObjectStore(dbInfo.storeName);
            };
            openreq.onsuccess = function() {
                dbInfo.db = openreq.result;
                self._dbInfo = dbInfo;
                resolve();
            };
        });
    }

    function getItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                    .objectStore(dbInfo.storeName);
                var req = store.get(key);

                req.onsuccess = function() {
                    var value = req.result;
                    if (value === undefined) {
                        value = null;
                    }

                    resolve(value);
                };

                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeDeferedCallback(promise, callback);
        return promise;
    }

    // Iterate over all items stored in database.
    function iterate(iterator, callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                                     .objectStore(dbInfo.storeName);

                var req = store.openCursor();
                var iterationNumber = 1;

                req.onsuccess = function() {
                    var cursor = req.result;

                    if (cursor) {
                        var result = iterator(cursor.value, cursor.key, iterationNumber++);

                        if (result !== void(0)) {
                            resolve(result);
                        } else {
                            cursor.continue();
                        }
                    } else {
                        resolve();
                    }
                };

                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeDeferedCallback(promise, callback);

        return promise;
    }

    function setItem(key, value, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
                var store = transaction.objectStore(dbInfo.storeName);

                // The reason we don't _save_ null is because IE 10 does
                // not support saving the `null` type in IndexedDB. How
                // ironic, given the bug below!
                // See: https://github.com/mozilla/localForage/issues/161
                if (value === null) {
                    value = undefined;
                }

                var req = store.put(value, key);
                transaction.oncomplete = function() {
                    // Cast to undefined so the value passed to
                    // callback/promise is the same as what one would get out
                    // of `getItem()` later. This leads to some weirdness
                    // (setItem('foo', undefined) will return `null`), but
                    // it's not my fault localStorage is our baseline and that
                    // it's weird.
                    if (value === undefined) {
                        value = null;
                    }

                    resolve(value);
                };
                transaction.onabort = transaction.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeDeferedCallback(promise, callback);
        return promise;
    }

    function removeItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
                var store = transaction.objectStore(dbInfo.storeName);

                // We use a Grunt task to make this safe for IE and some
                // versions of Android (including those used by Cordova).
                // Normally IE won't like `.delete()` and will insist on
                // using `['delete']()`, but we have a build step that
                // fixes this for us now.
                var req = store.delete(key);
                transaction.oncomplete = function() {
                    resolve();
                };

                transaction.onerror = function() {
                    reject(req.error);
                };

                // The request will be aborted if we've exceeded our storage
                // space. In this case, we will reject with a specific
                // "QuotaExceededError".
                transaction.onabort = function(event) {
                    var error = event.target.error;
                    if (error === 'QuotaExceededError') {
                        reject(error);
                    }
                };
            }).catch(reject);
        });

        executeDeferedCallback(promise, callback);
        return promise;
    }

    function clear(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
                var store = transaction.objectStore(dbInfo.storeName);
                var req = store.clear();

                transaction.oncomplete = function() {
                    resolve();
                };

                transaction.onabort = transaction.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeDeferedCallback(promise, callback);
        return promise;
    }

    function length(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                              .objectStore(dbInfo.storeName);
                var req = store.count();

                req.onsuccess = function() {
                    resolve(req.result);
                };

                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function key(n, callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            if (n < 0) {
                resolve(null);

                return;
            }

            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                              .objectStore(dbInfo.storeName);

                var advanced = false;
                var req = store.openCursor();
                req.onsuccess = function() {
                    var cursor = req.result;
                    if (!cursor) {
                        // this means there weren't enough keys
                        resolve(null);

                        return;
                    }

                    if (n === 0) {
                        // We have the first key, return it if that's what they
                        // wanted.
                        resolve(cursor.key);
                    } else {
                        if (!advanced) {
                            // Otherwise, ask the cursor to skip ahead n
                            // records.
                            advanced = true;
                            cursor.advance(n);
                        } else {
                            // When we get here, we've got the nth key.
                            resolve(cursor.key);
                        }
                    }
                };

                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function keys(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                              .objectStore(dbInfo.storeName);

                var req = store.openCursor();
                var keys = [];

                req.onsuccess = function() {
                    var cursor = req.result;

                    if (!cursor) {
                        resolve(keys);
                        return;
                    }

                    keys.push(cursor.key);
                    cursor.continue();
                };

                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function executeCallback(promise, callback) {
        if (callback) {
            promise.then(function(result) {
                callback(null, result);
            }, function(error) {
                callback(error);
            });
        }
    }

    function executeDeferedCallback(promise, callback) {
        if (callback) {
            promise.then(function(result) {
                deferCallback(callback, result);
            }, function(error) {
                callback(error);
            });
        }
    }

    // Under Chrome the callback is called before the changes (save, clear)
    // are actually made. So we use a defer function which wait that the
    // call stack to be empty.
    // For more info : https://github.com/mozilla/localForage/issues/175
    // Pull request : https://github.com/mozilla/localForage/pull/178
    function deferCallback(callback, result) {
        if (callback) {
            return setTimeout(function() {
                return callback(null, result);
            }, 0);
        }
    }

    var asyncStorage = {
        _driver: 'asyncStorage',
        _initStorage: _initStorage,
        iterate: iterate,
        getItem: getItem,
        setItem: setItem,
        removeItem: removeItem,
        clear: clear,
        length: length,
        key: key,
        keys: keys
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = asyncStorage;
    } else if (typeof define === 'function' && define.amd) {
        define('asyncStorage', function() {
            return asyncStorage;
        });
    } else {
        this.asyncStorage = asyncStorage;
    }
}).call(window);

},{"promise":9}],4:[function(require,module,exports){
// If IndexedDB isn't available, we'll fall back to localStorage.
// Note that this will have considerable performance and storage
// side-effects (all data will be serialized on save and only data that
// can be converted to a string via `JSON.stringify()` will be saved).
(function() {
    'use strict';

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
                  require('promise') : this.Promise;

    var globalObject = this;
    var serializer = null;
    var localStorage = null;

    // If the app is running inside a Google Chrome packaged webapp, or some
    // other context where localStorage isn't available, we don't use
    // localStorage. This feature detection is preferred over the old
    // `if (window.chrome && window.chrome.runtime)` code.
    // See: https://github.com/mozilla/localForage/issues/68
    try {
        // If localStorage isn't available, we get outta here!
        // This should be inside a try catch
        if (!this.localStorage || !('setItem' in this.localStorage)) {
            return;
        }
        // Initialize localStorage and create a variable to use throughout
        // the code.
        localStorage = this.localStorage;
    } catch (e) {
        return;
    }

    var ModuleType = {
        DEFINE: 1,
        EXPORT: 2,
        WINDOW: 3
    };

    // Attaching to window (i.e. no module loader) is the assumed,
    // simple default.
    var moduleType = ModuleType.WINDOW;

    // Find out what kind of module setup we have; if none, we'll just attach
    // localForage to the main window.
    if (typeof module !== 'undefined' && module.exports) {
        moduleType = ModuleType.EXPORT;
    } else if (typeof define === 'function' && define.amd) {
        moduleType = ModuleType.DEFINE;
    }

    // Config the localStorage backend, using options set in the config.
    function _initStorage(options) {
        var self = this;
        var dbInfo = {};
        if (options) {
            for (var i in options) {
                dbInfo[i] = options[i];
            }
        }

        dbInfo.keyPrefix = dbInfo.name + '/';

        self._dbInfo = dbInfo;

        var serializerPromise = new Promise(function(resolve/*, reject*/) {
            // We allow localForage to be declared as a module or as a
            // library available without AMD/require.js.
            if (moduleType === ModuleType.DEFINE) {
                require(['localforageSerializer'], resolve);
            } else if (moduleType === ModuleType.EXPORT) {
                // Making it browserify friendly
                resolve(require('./../utils/serializer'));
            } else {
                resolve(globalObject.localforageSerializer);
            }
        });

        return serializerPromise.then(function(lib) {
            serializer = lib;
            return Promise.resolve();
        });
    }

    // Remove all keys from the datastore, effectively destroying all data in
    // the app's key/value store!
    function clear(callback) {
        var self = this;
        var promise = self.ready().then(function() {
            var keyPrefix = self._dbInfo.keyPrefix;

            for (var i = localStorage.length - 1; i >= 0; i--) {
                var key = localStorage.key(i);

                if (key.indexOf(keyPrefix) === 0) {
                    localStorage.removeItem(key);
                }
            }
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Retrieve an item from the store. Unlike the original async_storage
    // library in Gaia, we don't modify return values at all. If a key's value
    // is `undefined`, we pass that value to the callback function.
    function getItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = self.ready().then(function() {
            var dbInfo = self._dbInfo;
            var result = localStorage.getItem(dbInfo.keyPrefix + key);

            // If a result was found, parse it from the serialized
            // string into a JS object. If result isn't truthy, the key
            // is likely undefined and we'll pass it straight to the
            // callback.
            if (result) {
                result = serializer.deserialize(result);
            }

            return result;
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Iterate over all items in the store.
    function iterate(iterator, callback) {
        var self = this;

        var promise = self.ready().then(function() {
            var keyPrefix = self._dbInfo.keyPrefix;
            var keyPrefixLength = keyPrefix.length;
            var length = localStorage.length;

            for (var i = 0; i < length; i++) {
                var key = localStorage.key(i);
                var value = localStorage.getItem(key);

                // If a result was found, parse it from the serialized
                // string into a JS object. If result isn't truthy, the
                // key is likely undefined and we'll pass it straight
                // to the iterator.
                if (value) {
                    value = serializer.deserialize(value);
                }

                value = iterator(value, key.substring(keyPrefixLength), i + 1);

                if (value !== void(0)) {
                    return value;
                }
            }
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Same as localStorage's key() method, except takes a callback.
    function key(n, callback) {
        var self = this;
        var promise = self.ready().then(function() {
            var dbInfo = self._dbInfo;
            var result;
            try {
                result = localStorage.key(n);
            } catch (error) {
                result = null;
            }

            // Remove the prefix from the key, if a key is found.
            if (result) {
                result = result.substring(dbInfo.keyPrefix.length);
            }

            return result;
        });

        executeCallback(promise, callback);
        return promise;
    }

    function keys(callback) {
        var self = this;
        var promise = self.ready().then(function() {
            var dbInfo = self._dbInfo;
            var length = localStorage.length;
            var keys = [];

            for (var i = 0; i < length; i++) {
                if (localStorage.key(i).indexOf(dbInfo.keyPrefix) === 0) {
                    keys.push(localStorage.key(i).substring(dbInfo.keyPrefix.length));
                }
            }

            return keys;
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Supply the number of keys in the datastore to the callback function.
    function length(callback) {
        var self = this;
        var promise = self.keys().then(function(keys) {
            return keys.length;
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Remove an item from the store, nice and simple.
    function removeItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = self.ready().then(function() {
            var dbInfo = self._dbInfo;
            localStorage.removeItem(dbInfo.keyPrefix + key);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Set a key's value and run an optional callback once the value is set.
    // Unlike Gaia's implementation, the callback function is passed the value,
    // in case you want to operate on that value only after you're sure it
    // saved, or something like that.
    function setItem(key, value, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = self.ready().then(function() {
            // Convert undefined values to null.
            // https://github.com/mozilla/localForage/pull/42
            if (value === undefined) {
                value = null;
            }

            // Save the original value to pass to the callback.
            var originalValue = value;

            return new Promise(function(resolve, reject) {
                serializer.serialize(value, function(value, error) {
                    if (error) {
                        reject(error);
                    } else {
                        try {
                            var dbInfo = self._dbInfo;
                            localStorage.setItem(dbInfo.keyPrefix + key, value);
                            resolve(originalValue);
                        } catch (e) {
                            // localStorage capacity exceeded.
                            // TODO: Make this a specific error/event.
                            if (e.name === 'QuotaExceededError' ||
                                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                                reject(e);
                            }
                            reject(e);
                        }
                    }
                });
            });
        });

        executeCallback(promise, callback);
        return promise;
    }

    function executeCallback(promise, callback) {
        if (callback) {
            promise.then(function(result) {
                callback(null, result);
            }, function(error) {
                callback(error);
            });
        }
    }

    var localStorageWrapper = {
        _driver: 'localStorageWrapper',
        _initStorage: _initStorage,
        // Default API, from Gaia/localStorage.
        iterate: iterate,
        getItem: getItem,
        setItem: setItem,
        removeItem: removeItem,
        clear: clear,
        length: length,
        key: key,
        keys: keys
    };

    if (moduleType === ModuleType.EXPORT) {
        module.exports = localStorageWrapper;
    } else if (moduleType === ModuleType.DEFINE) {
        define('localStorageWrapper', function() {
            return localStorageWrapper;
        });
    } else {
        this.localStorageWrapper = localStorageWrapper;
    }
}).call(window);

},{"./../utils/serializer":7,"promise":9}],5:[function(require,module,exports){
/*
 * Includes code from:
 *
 * base64-arraybuffer
 * https://github.com/niklasvh/base64-arraybuffer
 *
 * Copyright (c) 2012 Niklas von Hertzen
 * Licensed under the MIT license.
 */
(function() {
    'use strict';

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
                  require('promise') : this.Promise;

    var globalObject = this;
    var serializer = null;
    var openDatabase = this.openDatabase;

    // If WebSQL methods aren't available, we can stop now.
    if (!openDatabase) {
        return;
    }

    var ModuleType = {
        DEFINE: 1,
        EXPORT: 2,
        WINDOW: 3
    };

    // Attaching to window (i.e. no module loader) is the assumed,
    // simple default.
    var moduleType = ModuleType.WINDOW;

    // Find out what kind of module setup we have; if none, we'll just attach
    // localForage to the main window.
    if (typeof module !== 'undefined' && module.exports) {
        moduleType = ModuleType.EXPORT;
    } else if (typeof define === 'function' && define.amd) {
        moduleType = ModuleType.DEFINE;
    }

    // Open the WebSQL database (automatically creates one if one didn't
    // previously exist), using any options set in the config.
    function _initStorage(options) {
        var self = this;
        var dbInfo = {
            db: null
        };

        if (options) {
            for (var i in options) {
                dbInfo[i] = typeof(options[i]) !== 'string' ?
                            options[i].toString() : options[i];
            }
        }

        var serializerPromise = new Promise(function(resolve/*, reject*/) {
            // We allow localForage to be declared as a module or as a
            // library available without AMD/require.js.
            if (moduleType === ModuleType.DEFINE) {
                require(['localforageSerializer'], resolve);
            } else if (moduleType === ModuleType.EXPORT) {
                // Making it browserify friendly
                resolve(require('./../utils/serializer'));
            } else {
                resolve(globalObject.localforageSerializer);
            }
        });

        var dbInfoPromise = new Promise(function(resolve, reject) {
            // Open the database; the openDatabase API will automatically
            // create it for us if it doesn't exist.
            try {
                dbInfo.db = openDatabase(dbInfo.name, String(dbInfo.version),
                                         dbInfo.description, dbInfo.size);
            } catch (e) {
                return self.setDriver(self.LOCALSTORAGE).then(function() {
                    return self._initStorage(options);
                }).then(resolve).catch(reject);
            }

            // Create our key/value table if it doesn't exist.
            dbInfo.db.transaction(function(t) {
                t.executeSql('CREATE TABLE IF NOT EXISTS ' + dbInfo.storeName +
                             ' (id INTEGER PRIMARY KEY, key unique, value)', [],
                             function() {
                    self._dbInfo = dbInfo;
                    resolve();
                }, function(t, error) {
                    reject(error);
                });
            });
        });

        return serializerPromise.then(function(lib) {
            serializer = lib;
            return dbInfoPromise;
        });
    }

    function getItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('SELECT * FROM ' + dbInfo.storeName +
                                 ' WHERE key = ? LIMIT 1', [key],
                                 function(t, results) {
                        var result = results.rows.length ?
                                     results.rows.item(0).value : null;

                        // Check to see if this is serialized content we need to
                        // unpack.
                        if (result) {
                            result = serializer.deserialize(result);
                        }

                        resolve(result);
                    }, function(t, error) {

                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function iterate(iterator, callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;

                dbInfo.db.transaction(function(t) {
                    t.executeSql('SELECT * FROM ' + dbInfo.storeName, [],
                        function(t, results) {
                            var rows = results.rows;
                            var length = rows.length;

                            for (var i = 0; i < length; i++) {
                                var item = rows.item(i);
                                var result = item.value;

                                // Check to see if this is serialized content
                                // we need to unpack.
                                if (result) {
                                    result = serializer.deserialize(result);
                                }

                                result = iterator(result, item.key, i + 1);

                                // void(0) prevents problems with redefinition
                                // of `undefined`.
                                if (result !== void(0)) {
                                    resolve(result);
                                    return;
                                }
                            }

                            resolve();
                        }, function(t, error) {
                            reject(error);
                        });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function setItem(key, value, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                // The localStorage API doesn't return undefined values in an
                // "expected" way, so undefined is always cast to null in all
                // drivers. See: https://github.com/mozilla/localForage/pull/42
                if (value === undefined) {
                    value = null;
                }

                // Save the original value to pass to the callback.
                var originalValue = value;

                serializer.serialize(value, function(value, error) {
                    if (error) {
                        reject(error);
                    } else {
                        var dbInfo = self._dbInfo;
                        dbInfo.db.transaction(function(t) {
                            t.executeSql('INSERT OR REPLACE INTO ' +
                                         dbInfo.storeName +
                                         ' (key, value) VALUES (?, ?)',
                                         [key, value], function() {
                                resolve(originalValue);
                            }, function(t, error) {
                                reject(error);
                            });
                        }, function(sqlError) { // The transaction failed; check
                                                // to see if it's a quota error.
                            if (sqlError.code === sqlError.QUOTA_ERR) {
                                // We reject the callback outright for now, but
                                // it's worth trying to re-run the transaction.
                                // Even if the user accepts the prompt to use
                                // more storage on Safari, this error will
                                // be called.
                                //
                                // TODO: Try to re-run the transaction.
                                reject(sqlError);
                            }
                        });
                    }
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function removeItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('DELETE FROM ' + dbInfo.storeName +
                                 ' WHERE key = ?', [key], function() {

                        resolve();
                    }, function(t, error) {

                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Deletes every item in the table.
    // TODO: Find out if this resets the AUTO_INCREMENT number.
    function clear(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('DELETE FROM ' + dbInfo.storeName, [],
                                 function() {
                        resolve();
                    }, function(t, error) {
                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Does a simple `COUNT(key)` to get the number of items stored in
    // localForage.
    function length(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    // Ahhh, SQL makes this one soooooo easy.
                    t.executeSql('SELECT COUNT(key) as c FROM ' +
                                 dbInfo.storeName, [], function(t, results) {
                        var result = results.rows.item(0).c;

                        resolve(result);
                    }, function(t, error) {

                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Return the key located at key index X; essentially gets the key from a
    // `WHERE id = ?`. This is the most efficient way I can think to implement
    // this rarely-used (in my experience) part of the API, but it can seem
    // inconsistent, because we do `INSERT OR REPLACE INTO` on `setItem()`, so
    // the ID of each key will change every time it's updated. Perhaps a stored
    // procedure for the `setItem()` SQL would solve this problem?
    // TODO: Don't change ID on `setItem()`.
    function key(n, callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('SELECT key FROM ' + dbInfo.storeName +
                                 ' WHERE id = ? LIMIT 1', [n + 1],
                                 function(t, results) {
                        var result = results.rows.length ?
                                     results.rows.item(0).key : null;
                        resolve(result);
                    }, function(t, error) {
                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function keys(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('SELECT key FROM ' + dbInfo.storeName, [],
                                 function(t, results) {
                        var keys = [];

                        for (var i = 0; i < results.rows.length; i++) {
                            keys.push(results.rows.item(i).key);
                        }

                        resolve(keys);
                    }, function(t, error) {

                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function executeCallback(promise, callback) {
        if (callback) {
            promise.then(function(result) {
                callback(null, result);
            }, function(error) {
                callback(error);
            });
        }
    }

    var webSQLStorage = {
        _driver: 'webSQLStorage',
        _initStorage: _initStorage,
        iterate: iterate,
        getItem: getItem,
        setItem: setItem,
        removeItem: removeItem,
        clear: clear,
        length: length,
        key: key,
        keys: keys
    };

    if (moduleType === ModuleType.DEFINE) {
        define('webSQLStorage', function() {
            return webSQLStorage;
        });
    } else if (moduleType === ModuleType.EXPORT) {
        module.exports = webSQLStorage;
    } else {
        this.webSQLStorage = webSQLStorage;
    }
}).call(window);

},{"./../utils/serializer":7,"promise":9}],6:[function(require,module,exports){
(function() {
    'use strict';

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
                  require('promise') : this.Promise;

    // Custom drivers are stored here when `defineDriver()` is called.
    // They are shared across all instances of localForage.
    var CustomDrivers = {};

    var DriverType = {
        INDEXEDDB: 'asyncStorage',
        LOCALSTORAGE: 'localStorageWrapper',
        WEBSQL: 'webSQLStorage'
    };

    var DefaultDriverOrder = [
        DriverType.INDEXEDDB,
        DriverType.WEBSQL,
        DriverType.LOCALSTORAGE
    ];

    var LibraryMethods = [
        'clear',
        'getItem',
        'iterate',
        'key',
        'keys',
        'length',
        'removeItem',
        'setItem'
    ];

    var ModuleType = {
        DEFINE: 1,
        EXPORT: 2,
        WINDOW: 3
    };

    var DefaultConfig = {
        description: '',
        driver: DefaultDriverOrder.slice(),
        name: 'localforage',
        // Default DB size is _JUST UNDER_ 5MB, as it's the highest size
        // we can use without a prompt.
        size: 4980736,
        storeName: 'keyvaluepairs',
        version: 1.0
    };

    // Attaching to window (i.e. no module loader) is the assumed,
    // simple default.
    var moduleType = ModuleType.WINDOW;

    // Find out what kind of module setup we have; if none, we'll just attach
    // localForage to the main window.
    if (typeof module !== 'undefined' && module.exports) {
        moduleType = ModuleType.EXPORT;
    } else if (typeof define === 'function' && define.amd) {
        moduleType = ModuleType.DEFINE;
    }

    // Check to see if IndexedDB is available and if it is the latest
    // implementation; it's our preferred backend library. We use "_spec_test"
    // as the name of the database because it's not the one we'll operate on,
    // but it's useful to make sure its using the right spec.
    // See: https://github.com/mozilla/localForage/issues/128
    var driverSupport = (function(self) {
        // Initialize IndexedDB; fall back to vendor-prefixed versions
        // if needed.
        var indexedDB = indexedDB || self.indexedDB || self.webkitIndexedDB ||
                        self.mozIndexedDB || self.OIndexedDB ||
                        self.msIndexedDB;

        var result = {};

        result[DriverType.WEBSQL] = !!self.openDatabase;
        result[DriverType.INDEXEDDB] = !!(function() {
            // We mimic PouchDB here; just UA test for Safari (which, as of
            // iOS 8/Yosemite, doesn't properly support IndexedDB).
            // IndexedDB support is broken and different from Blink's.
            // This is faster than the test case (and it's sync), so we just
            // do this. *SIGH*
            // http://bl.ocks.org/nolanlawson/raw/c83e9039edf2278047e9/
            //
            // We test for openDatabase because IE Mobile identifies itself
            // as Safari. Oh the lulz...
            if (typeof self.openDatabase !== 'undefined' && self.navigator &&
                self.navigator.userAgent &&
                /Safari/.test(self.navigator.userAgent) &&
                !/Chrome/.test(self.navigator.userAgent)) {
                return false;
            }
            try {
                return indexedDB &&
                       typeof indexedDB.open === 'function' &&
                       // Some Samsung/HTC Android 4.0-4.3 devices
                       // have older IndexedDB specs; if this isn't available
                       // their IndexedDB is too old for us to use.
                       // (Replaces the onupgradeneeded test.)
                       typeof self.IDBKeyRange !== 'undefined';
            } catch (e) {
                return false;
            }
        })();

        result[DriverType.LOCALSTORAGE] = !!(function() {
            try {
                return (self.localStorage &&
                        ('setItem' in self.localStorage) &&
                        (self.localStorage.setItem));
            } catch (e) {
                return false;
            }
        })();

        return result;
    })(this);

    var isArray = Array.isArray || function(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };

    function callWhenReady(localForageInstance, libraryMethod) {
        localForageInstance[libraryMethod] = function() {
            var _args = arguments;
            return localForageInstance.ready().then(function() {
                return localForageInstance[libraryMethod].apply(localForageInstance, _args);
            });
        };
    }

    function extend() {
        for (var i = 1; i < arguments.length; i++) {
            var arg = arguments[i];

            if (arg) {
                for (var key in arg) {
                    if (arg.hasOwnProperty(key)) {
                        if (isArray(arg[key])) {
                            arguments[0][key] = arg[key].slice();
                        } else {
                            arguments[0][key] = arg[key];
                        }
                    }
                }
            }
        }

        return arguments[0];
    }

    function isLibraryDriver(driverName) {
        for (var driver in DriverType) {
            if (DriverType.hasOwnProperty(driver) &&
                DriverType[driver] === driverName) {
                return true;
            }
        }

        return false;
    }

    var globalObject = this;

    function LocalForage(options) {
        this._config = extend({}, DefaultConfig, options);
        this._driverSet = null;
        this._ready = false;
        this._dbInfo = null;

        // Add a stub for each driver API method that delays the call to the
        // corresponding driver method until localForage is ready. These stubs
        // will be replaced by the driver methods as soon as the driver is
        // loaded, so there is no performance impact.
        for (var i = 0; i < LibraryMethods.length; i++) {
            callWhenReady(this, LibraryMethods[i]);
        }

        this.setDriver(this._config.driver);
    }

    LocalForage.prototype.INDEXEDDB = DriverType.INDEXEDDB;
    LocalForage.prototype.LOCALSTORAGE = DriverType.LOCALSTORAGE;
    LocalForage.prototype.WEBSQL = DriverType.WEBSQL;

    // Set any config values for localForage; can be called anytime before
    // the first API call (e.g. `getItem`, `setItem`).
    // We loop through options so we don't overwrite existing config
    // values.
    LocalForage.prototype.config = function(options) {
        // If the options argument is an object, we use it to set values.
        // Otherwise, we return either a specified config value or all
        // config values.
        if (typeof(options) === 'object') {
            // If localforage is ready and fully initialized, we can't set
            // any new configuration values. Instead, we return an error.
            if (this._ready) {
                return new Error("Can't call config() after localforage " +
                                 'has been used.');
            }

            for (var i in options) {
                if (i === 'storeName') {
                    options[i] = options[i].replace(/\W/g, '_');
                }

                this._config[i] = options[i];
            }

            // after all config options are set and
            // the driver option is used, try setting it
            if ('driver' in options && options.driver) {
                this.setDriver(this._config.driver);
            }

            return true;
        } else if (typeof(options) === 'string') {
            return this._config[options];
        } else {
            return this._config;
        }
    };

    // Used to define a custom driver, shared across all instances of
    // localForage.
    LocalForage.prototype.defineDriver = function(driverObject, callback,
                                                  errorCallback) {
        var defineDriver = new Promise(function(resolve, reject) {
            try {
                var driverName = driverObject._driver;
                var complianceError = new Error(
                    'Custom driver not compliant; see ' +
                    'https://mozilla.github.io/localForage/#definedriver'
                );
                var namingError = new Error(
                    'Custom driver name already in use: ' + driverObject._driver
                );

                // A driver name should be defined and not overlap with the
                // library-defined, default drivers.
                if (!driverObject._driver) {
                    reject(complianceError);
                    return;
                }
                if (isLibraryDriver(driverObject._driver)) {
                    reject(namingError);
                    return;
                }

                var customDriverMethods = LibraryMethods.concat('_initStorage');
                for (var i = 0; i < customDriverMethods.length; i++) {
                    var customDriverMethod = customDriverMethods[i];
                    if (!customDriverMethod ||
                        !driverObject[customDriverMethod] ||
                        typeof driverObject[customDriverMethod] !== 'function') {
                        reject(complianceError);
                        return;
                    }
                }

                var supportPromise = Promise.resolve(true);
                if ('_support'  in driverObject) {
                    if (driverObject._support && typeof driverObject._support === 'function') {
                        supportPromise = driverObject._support();
                    } else {
                        supportPromise = Promise.resolve(!!driverObject._support);
                    }
                }

                supportPromise.then(function(supportResult) {
                    driverSupport[driverName] = supportResult;
                    CustomDrivers[driverName] = driverObject;
                    resolve();
                }, reject);
            } catch (e) {
                reject(e);
            }
        });

        defineDriver.then(callback, errorCallback);
        return defineDriver;
    };

    LocalForage.prototype.driver = function() {
        return this._driver || null;
    };

    LocalForage.prototype.ready = function(callback) {
        var self = this;

        var ready = new Promise(function(resolve, reject) {
            self._driverSet.then(function() {
                if (self._ready === null) {
                    self._ready = self._initStorage(self._config);
                }

                self._ready.then(resolve, reject);
            }).catch(reject);
        });

        ready.then(callback, callback);
        return ready;
    };

    LocalForage.prototype.setDriver = function(drivers, callback,
                                               errorCallback) {
        var self = this;

        if (typeof drivers === 'string') {
            drivers = [drivers];
        }

        this._driverSet = new Promise(function(resolve, reject) {
            var driverName = self._getFirstSupportedDriver(drivers);
            var error = new Error('No available storage method found.');

            if (!driverName) {
                self._driverSet = Promise.reject(error);
                reject(error);
                return;
            }

            self._dbInfo = null;
            self._ready = null;

            if (isLibraryDriver(driverName)) {
                // We allow localForage to be declared as a module or as a
                // library available without AMD/require.js.
                if (moduleType === ModuleType.DEFINE) {
                    require([driverName], function(lib) {
                        self._extend(lib);

                        resolve();
                    });

                    return;
                } else if (moduleType === ModuleType.EXPORT) {
                    // Making it browserify friendly
                    var driver;
                    switch (driverName) {
                        case self.INDEXEDDB:
                            driver = require('./drivers/indexeddb');
                            break;
                        case self.LOCALSTORAGE:
                            driver = require('./drivers/localstorage');
                            break;
                        case self.WEBSQL:
                            driver = require('./drivers/websql');
                    }

                    self._extend(driver);
                } else {
                    self._extend(globalObject[driverName]);
                }
            } else if (CustomDrivers[driverName]) {
                self._extend(CustomDrivers[driverName]);
            } else {
                self._driverSet = Promise.reject(error);
                reject(error);
                return;
            }

            resolve();
        });

        function setDriverToConfig() {
            self._config.driver = self.driver();
        }
        this._driverSet.then(setDriverToConfig, setDriverToConfig);

        this._driverSet.then(callback, errorCallback);
        return this._driverSet;
    };

    LocalForage.prototype.supports = function(driverName) {
        return !!driverSupport[driverName];
    };

    LocalForage.prototype._extend = function(libraryMethodsAndProperties) {
        extend(this, libraryMethodsAndProperties);
    };

    // Used to determine which driver we should use as the backend for this
    // instance of localForage.
    LocalForage.prototype._getFirstSupportedDriver = function(drivers) {
        if (drivers && isArray(drivers)) {
            for (var i = 0; i < drivers.length; i++) {
                var driver = drivers[i];

                if (this.supports(driver)) {
                    return driver;
                }
            }
        }

        return null;
    };

    LocalForage.prototype.createInstance = function(options) {
        return new LocalForage(options);
    };

    // The actual localForage object that we expose as a module or via a
    // global. It's extended by pulling in one of our other libraries.
    var localForage = new LocalForage();

    // We allow localForage to be declared as a module or as a library
    // available without AMD/require.js.
    if (moduleType === ModuleType.DEFINE) {
        define('localforage', function() {
            return localForage;
        });
    } else if (moduleType === ModuleType.EXPORT) {
        module.exports = localForage;
    } else {
        this.localforage = localForage;
    }
}).call(window);

},{"./drivers/indexeddb":3,"./drivers/localstorage":4,"./drivers/websql":5,"promise":9}],7:[function(require,module,exports){
(function() {
    'use strict';

    // Sadly, the best way to save binary data in WebSQL/localStorage is serializing
    // it to Base64, so this is how we store it to prevent very strange errors with less
    // verbose ways of binary <-> string data storage.
    var BASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    var SERIALIZED_MARKER = '__lfsc__:';
    var SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER.length;

    // OMG the serializations!
    var TYPE_ARRAYBUFFER = 'arbf';
    var TYPE_BLOB = 'blob';
    var TYPE_INT8ARRAY = 'si08';
    var TYPE_UINT8ARRAY = 'ui08';
    var TYPE_UINT8CLAMPEDARRAY = 'uic8';
    var TYPE_INT16ARRAY = 'si16';
    var TYPE_INT32ARRAY = 'si32';
    var TYPE_UINT16ARRAY = 'ur16';
    var TYPE_UINT32ARRAY = 'ui32';
    var TYPE_FLOAT32ARRAY = 'fl32';
    var TYPE_FLOAT64ARRAY = 'fl64';
    var TYPE_SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER_LENGTH +
                                        TYPE_ARRAYBUFFER.length;

    // Serialize a value, afterwards executing a callback (which usually
    // instructs the `setItem()` callback/promise to be executed). This is how
    // we store binary data with localStorage.
    function serialize(value, callback) {
        var valueString = '';
        if (value) {
            valueString = value.toString();
        }

        // Cannot use `value instanceof ArrayBuffer` or such here, as these
        // checks fail when running the tests using casper.js...
        //
        // TODO: See why those tests fail and use a better solution.
        if (value && (value.toString() === '[object ArrayBuffer]' ||
                      value.buffer &&
                      value.buffer.toString() === '[object ArrayBuffer]')) {
            // Convert binary arrays to a string and prefix the string with
            // a special marker.
            var buffer;
            var marker = SERIALIZED_MARKER;

            if (value instanceof ArrayBuffer) {
                buffer = value;
                marker += TYPE_ARRAYBUFFER;
            } else {
                buffer = value.buffer;

                if (valueString === '[object Int8Array]') {
                    marker += TYPE_INT8ARRAY;
                } else if (valueString === '[object Uint8Array]') {
                    marker += TYPE_UINT8ARRAY;
                } else if (valueString === '[object Uint8ClampedArray]') {
                    marker += TYPE_UINT8CLAMPEDARRAY;
                } else if (valueString === '[object Int16Array]') {
                    marker += TYPE_INT16ARRAY;
                } else if (valueString === '[object Uint16Array]') {
                    marker += TYPE_UINT16ARRAY;
                } else if (valueString === '[object Int32Array]') {
                    marker += TYPE_INT32ARRAY;
                } else if (valueString === '[object Uint32Array]') {
                    marker += TYPE_UINT32ARRAY;
                } else if (valueString === '[object Float32Array]') {
                    marker += TYPE_FLOAT32ARRAY;
                } else if (valueString === '[object Float64Array]') {
                    marker += TYPE_FLOAT64ARRAY;
                } else {
                    callback(new Error('Failed to get type for BinaryArray'));
                }
            }

            callback(marker + bufferToString(buffer));
        } else if (valueString === '[object Blob]') {
            // Conver the blob to a binaryArray and then to a string.
            var fileReader = new FileReader();

            fileReader.onload = function() {
                var str = bufferToString(this.result);

                callback(SERIALIZED_MARKER + TYPE_BLOB + str);
            };

            fileReader.readAsArrayBuffer(value);
        } else {
            try {
                callback(JSON.stringify(value));
            } catch (e) {
                window.console.error("Couldn't convert value into a JSON " +
                                     'string: ', value);

                callback(null, e);
            }
        }
    }

    // Deserialize data we've inserted into a value column/field. We place
    // special markers into our strings to mark them as encoded; this isn't
    // as nice as a meta field, but it's the only sane thing we can do whilst
    // keeping localStorage support intact.
    //
    // Oftentimes this will just deserialize JSON content, but if we have a
    // special marker (SERIALIZED_MARKER, defined above), we will extract
    // some kind of arraybuffer/binary data/typed array out of the string.
    function deserialize(value) {
        // If we haven't marked this string as being specially serialized (i.e.
        // something other than serialized JSON), we can just return it and be
        // done with it.
        if (value.substring(0,
            SERIALIZED_MARKER_LENGTH) !== SERIALIZED_MARKER) {
            return JSON.parse(value);
        }

        // The following code deals with deserializing some kind of Blob or
        // TypedArray. First we separate out the type of data we're dealing
        // with from the data itself.
        var serializedString = value.substring(TYPE_SERIALIZED_MARKER_LENGTH);
        var type = value.substring(SERIALIZED_MARKER_LENGTH,
                                   TYPE_SERIALIZED_MARKER_LENGTH);

        var buffer = stringToBuffer(serializedString);

        // Return the right type based on the code/type set during
        // serialization.
        switch (type) {
            case TYPE_ARRAYBUFFER:
                return buffer;
            case TYPE_BLOB:
                return new Blob([buffer]);
            case TYPE_INT8ARRAY:
                return new Int8Array(buffer);
            case TYPE_UINT8ARRAY:
                return new Uint8Array(buffer);
            case TYPE_UINT8CLAMPEDARRAY:
                return new Uint8ClampedArray(buffer);
            case TYPE_INT16ARRAY:
                return new Int16Array(buffer);
            case TYPE_UINT16ARRAY:
                return new Uint16Array(buffer);
            case TYPE_INT32ARRAY:
                return new Int32Array(buffer);
            case TYPE_UINT32ARRAY:
                return new Uint32Array(buffer);
            case TYPE_FLOAT32ARRAY:
                return new Float32Array(buffer);
            case TYPE_FLOAT64ARRAY:
                return new Float64Array(buffer);
            default:
                throw new Error('Unkown type: ' + type);
        }
    }

    function stringToBuffer(serializedString) {
        // Fill the string into a ArrayBuffer.
        var bufferLength = serializedString.length * 0.75;
        var len = serializedString.length;
        var i;
        var p = 0;
        var encoded1, encoded2, encoded3, encoded4;

        if (serializedString[serializedString.length - 1] === '=') {
            bufferLength--;
            if (serializedString[serializedString.length - 2] === '=') {
                bufferLength--;
            }
        }

        var buffer = new ArrayBuffer(bufferLength);
        var bytes = new Uint8Array(buffer);

        for (i = 0; i < len; i+=4) {
            encoded1 = BASE_CHARS.indexOf(serializedString[i]);
            encoded2 = BASE_CHARS.indexOf(serializedString[i+1]);
            encoded3 = BASE_CHARS.indexOf(serializedString[i+2]);
            encoded4 = BASE_CHARS.indexOf(serializedString[i+3]);

            /*jslint bitwise: true */
            bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
            bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
            bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }
        return buffer;
    }

    // Converts a buffer to a string to store, serialized, in the backend
    // storage library.
    function bufferToString(buffer) {
        // base64-arraybuffer
        var bytes = new Uint8Array(buffer);
        var base64String = '';
        var i;

        for (i = 0; i < bytes.length; i += 3) {
            /*jslint bitwise: true */
            base64String += BASE_CHARS[bytes[i] >> 2];
            base64String += BASE_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
            base64String += BASE_CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
            base64String += BASE_CHARS[bytes[i + 2] & 63];
        }

        if ((bytes.length % 3) === 2) {
            base64String = base64String.substring(0, base64String.length - 1) + '=';
        } else if (bytes.length % 3 === 1) {
            base64String = base64String.substring(0, base64String.length - 2) + '==';
        }

        return base64String;
    }

    var localforageSerializer = {
        serialize: serialize,
        deserialize: deserialize,
        stringToBuffer: stringToBuffer,
        bufferToString: bufferToString
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = localforageSerializer;
    } else if (typeof define === 'function' && define.amd) {
        define('localforageSerializer', function() {
            return localforageSerializer;
        });
    } else {
        this.localforageSerializer = localforageSerializer;
    }
}).call(window);

},{}],8:[function(require,module,exports){
'use strict';

var asap = require('asap')

module.exports = Promise
function Promise(fn) {
  if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new')
  if (typeof fn !== 'function') throw new TypeError('not a function')
  var state = null
  var value = null
  var deferreds = []
  var self = this

  this.then = function(onFulfilled, onRejected) {
    return new Promise(function(resolve, reject) {
      handle(new Handler(onFulfilled, onRejected, resolve, reject))
    })
  }

  function handle(deferred) {
    if (state === null) {
      deferreds.push(deferred)
      return
    }
    asap(function() {
      var cb = state ? deferred.onFulfilled : deferred.onRejected
      if (cb === null) {
        (state ? deferred.resolve : deferred.reject)(value)
        return
      }
      var ret
      try {
        ret = cb(value)
      }
      catch (e) {
        deferred.reject(e)
        return
      }
      deferred.resolve(ret)
    })
  }

  function resolve(newValue) {
    try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.')
      if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
        var then = newValue.then
        if (typeof then === 'function') {
          doResolve(then.bind(newValue), resolve, reject)
          return
        }
      }
      state = true
      value = newValue
      finale()
    } catch (e) { reject(e) }
  }

  function reject(newValue) {
    state = false
    value = newValue
    finale()
  }

  function finale() {
    for (var i = 0, len = deferreds.length; i < len; i++)
      handle(deferreds[i])
    deferreds = null
  }

  doResolve(fn, resolve, reject)
}


function Handler(onFulfilled, onRejected, resolve, reject){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
  this.onRejected = typeof onRejected === 'function' ? onRejected : null
  this.resolve = resolve
  this.reject = reject
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, onFulfilled, onRejected) {
  var done = false;
  try {
    fn(function (value) {
      if (done) return
      done = true
      onFulfilled(value)
    }, function (reason) {
      if (done) return
      done = true
      onRejected(reason)
    })
  } catch (ex) {
    if (done) return
    done = true
    onRejected(ex)
  }
}

},{"asap":10}],9:[function(require,module,exports){
'use strict';

//This file contains then/promise specific extensions to the core promise API

var Promise = require('./core.js')
var asap = require('asap')

module.exports = Promise

/* Static Functions */

function ValuePromise(value) {
  this.then = function (onFulfilled) {
    if (typeof onFulfilled !== 'function') return this
    return new Promise(function (resolve, reject) {
      asap(function () {
        try {
          resolve(onFulfilled(value))
        } catch (ex) {
          reject(ex);
        }
      })
    })
  }
}
ValuePromise.prototype = Object.create(Promise.prototype)

var TRUE = new ValuePromise(true)
var FALSE = new ValuePromise(false)
var NULL = new ValuePromise(null)
var UNDEFINED = new ValuePromise(undefined)
var ZERO = new ValuePromise(0)
var EMPTYSTRING = new ValuePromise('')

Promise.resolve = function (value) {
  if (value instanceof Promise) return value

  if (value === null) return NULL
  if (value === undefined) return UNDEFINED
  if (value === true) return TRUE
  if (value === false) return FALSE
  if (value === 0) return ZERO
  if (value === '') return EMPTYSTRING

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then
      if (typeof then === 'function') {
        return new Promise(then.bind(value))
      }
    } catch (ex) {
      return new Promise(function (resolve, reject) {
        reject(ex)
      })
    }
  }

  return new ValuePromise(value)
}

Promise.from = Promise.cast = function (value) {
  var err = new Error('Promise.from and Promise.cast are deprecated, use Promise.resolve instead')
  err.name = 'Warning'
  console.warn(err.stack)
  return Promise.resolve(value)
}

Promise.denodeify = function (fn, argumentCount) {
  argumentCount = argumentCount || Infinity
  return function () {
    var self = this
    var args = Array.prototype.slice.call(arguments)
    return new Promise(function (resolve, reject) {
      while (args.length && args.length > argumentCount) {
        args.pop()
      }
      args.push(function (err, res) {
        if (err) reject(err)
        else resolve(res)
      })
      fn.apply(self, args)
    })
  }
}
Promise.nodeify = function (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    var callback = typeof args[args.length - 1] === 'function' ? args.pop() : null
    try {
      return fn.apply(this, arguments).nodeify(callback)
    } catch (ex) {
      if (callback === null || typeof callback == 'undefined') {
        return new Promise(function (resolve, reject) { reject(ex) })
      } else {
        asap(function () {
          callback(ex)
        })
      }
    }
  }
}

Promise.all = function () {
  var calledWithArray = arguments.length === 1 && Array.isArray(arguments[0])
  var args = Array.prototype.slice.call(calledWithArray ? arguments[0] : arguments)

  if (!calledWithArray) {
    var err = new Error('Promise.all should be called with a single array, calling it with multiple arguments is deprecated')
    err.name = 'Warning'
    console.warn(err.stack)
  }

  return new Promise(function (resolve, reject) {
    if (args.length === 0) return resolve([])
    var remaining = args.length
    function res(i, val) {
      try {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then
          if (typeof then === 'function') {
            then.call(val, function (val) { res(i, val) }, reject)
            return
          }
        }
        args[i] = val
        if (--remaining === 0) {
          resolve(args);
        }
      } catch (ex) {
        reject(ex)
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i])
    }
  })
}

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) { 
    reject(value);
  });
}

Promise.race = function (values) {
  return new Promise(function (resolve, reject) { 
    values.forEach(function(value){
      Promise.resolve(value).then(resolve, reject);
    })
  });
}

/* Prototype Methods */

Promise.prototype.done = function (onFulfilled, onRejected) {
  var self = arguments.length ? this.then.apply(this, arguments) : this
  self.then(null, function (err) {
    asap(function () {
      throw err
    })
  })
}

Promise.prototype.nodeify = function (callback) {
  if (typeof callback != 'function') return this

  this.then(function (value) {
    asap(function () {
      callback(null, value)
    })
  }, function (err) {
    asap(function () {
      callback(err)
    })
  })
}

Promise.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected);
}

},{"./core.js":8,"asap":10}],10:[function(require,module,exports){
(function (process){

// Use the fastest possible means to execute a task in a future turn
// of the event loop.

// linked list of tasks (single, with head node)
var head = {task: void 0, next: null};
var tail = head;
var flushing = false;
var requestFlush = void 0;
var isNodeJS = false;

function flush() {
    /* jshint loopfunc: true */

    while (head.next) {
        head = head.next;
        var task = head.task;
        head.task = void 0;
        var domain = head.domain;

        if (domain) {
            head.domain = void 0;
            domain.enter();
        }

        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function() {
                   throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    flushing = false;
}

if (typeof process !== "undefined" && process.nextTick) {
    // Node.js before 0.9. Note that some fake-Node environments, like the
    // Mocha test runner, introduce a `process` global without a `nextTick`.
    isNodeJS = true;

    requestFlush = function () {
        process.nextTick(flush);
    };

} else if (typeof setImmediate === "function") {
    // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
    if (typeof window !== "undefined") {
        requestFlush = setImmediate.bind(window, flush);
    } else {
        requestFlush = function () {
            setImmediate(flush);
        };
    }

} else if (typeof MessageChannel !== "undefined") {
    // modern browsers
    // http://www.nonblocking.io/2011/06/windownexttick.html
    var channel = new MessageChannel();
    channel.port1.onmessage = flush;
    requestFlush = function () {
        channel.port2.postMessage(0);
    };

} else {
    // old browsers
    requestFlush = function () {
        setTimeout(flush, 0);
    };
}

function asap(task) {
    tail = tail.next = {
        task: task,
        domain: isNodeJS && process.domain,
        next: null
    };

    if (!flushing) {
        flushing = true;
        requestFlush();
    }
};

module.exports = asap;


}).call(this,require("1YiZ5S"))
},{"1YiZ5S":14}],11:[function(require,module,exports){

/**
 * slice() reference.
 */

var slice = Array.prototype.slice;

/**
 * Expose `co`.
 */

module.exports = co;

/**
 * Wrap the given generator `fn` and
 * return a thunk.
 *
 * @param {Function} fn
 * @return {Function}
 * @api public
 */

function co(fn) {
  var isGenFun = isGeneratorFunction(fn);

  return function (done) {
    var ctx = this;

    // in toThunk() below we invoke co()
    // with a generator, so optimize for
    // this case
    var gen = fn;

    // we only need to parse the arguments
    // if gen is a generator function.
    if (isGenFun) {
      var args = slice.call(arguments), len = args.length;
      var hasCallback = len && 'function' == typeof args[len - 1];
      done = hasCallback ? args.pop() : error;
      gen = fn.apply(this, args);
    } else {
      done = done || error;
    }

    next();

    // #92
    // wrap the callback in a setImmediate
    // so that any of its errors aren't caught by `co`
    function exit(err, res) {
      setImmediate(function(){
        done.call(ctx, err, res);
      });
    }

    function next(err, res) {
      var ret;

      // multiple args
      if (arguments.length > 2) res = slice.call(arguments, 1);

      // error
      if (err) {
        try {
          ret = gen.throw(err);
        } catch (e) {
          return exit(e);
        }
      }

      // ok
      if (!err) {
        try {
          ret = gen.next(res);
        } catch (e) {
          return exit(e);
        }
      }

      // done
      if (ret.done) return exit(null, ret.value);

      // normalize
      ret.value = toThunk(ret.value, ctx);

      // run
      if ('function' == typeof ret.value) {
        var called = false;
        try {
          ret.value.call(ctx, function(){
            if (called) return;
            called = true;
            next.apply(ctx, arguments);
          });
        } catch (e) {
          setImmediate(function(){
            if (called) return;
            called = true;
            next(e);
          });
        }
        return;
      }

      // invalid
      next(new TypeError('You may only yield a function, promise, generator, array, or object, '
        + 'but the following was passed: "' + String(ret.value) + '"'));
    }
  }
}

/**
 * Convert `obj` into a normalized thunk.
 *
 * @param {Mixed} obj
 * @param {Mixed} ctx
 * @return {Function}
 * @api private
 */

function toThunk(obj, ctx) {

  if (isGeneratorFunction(obj)) {
    return co(obj.call(ctx));
  }

  if (isGenerator(obj)) {
    return co(obj);
  }

  if (isPromise(obj)) {
    return promiseToThunk(obj);
  }

  if ('function' == typeof obj) {
    return obj;
  }

  if (isObject(obj) || Array.isArray(obj)) {
    return objectToThunk.call(ctx, obj);
  }

  return obj;
}

/**
 * Convert an object of yieldables to a thunk.
 *
 * @param {Object} obj
 * @return {Function}
 * @api private
 */

function objectToThunk(obj){
  var ctx = this;
  var isArray = Array.isArray(obj);

  return function(done){
    var keys = Object.keys(obj);
    var pending = keys.length;
    var results = isArray
      ? new Array(pending) // predefine the array length
      : new obj.constructor();
    var finished;

    if (!pending) {
      setImmediate(function(){
        done(null, results)
      });
      return;
    }

    // prepopulate object keys to preserve key ordering
    if (!isArray) {
      for (var i = 0; i < pending; i++) {
        results[keys[i]] = undefined;
      }
    }

    for (var i = 0; i < keys.length; i++) {
      run(obj[keys[i]], keys[i]);
    }

    function run(fn, key) {
      if (finished) return;
      try {
        fn = toThunk(fn, ctx);

        if ('function' != typeof fn) {
          results[key] = fn;
          return --pending || done(null, results);
        }

        fn.call(ctx, function(err, res){
          if (finished) return;

          if (err) {
            finished = true;
            return done(err);
          }

          results[key] = res;
          --pending || done(null, results);
        });
      } catch (err) {
        finished = true;
        done(err);
      }
    }
  }
}

/**
 * Convert `promise` to a thunk.
 *
 * @param {Object} promise
 * @return {Function}
 * @api private
 */

function promiseToThunk(promise) {
  return function(fn){
    promise.then(function(res) {
      fn(null, res);
    }, fn);
  }
}

/**
 * Check if `obj` is a promise.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isPromise(obj) {
  return obj && 'function' == typeof obj.then;
}

/**
 * Check if `obj` is a generator.
 *
 * @param {Mixed} obj
 * @return {Boolean}
 * @api private
 */

function isGenerator(obj) {
  return obj && 'function' == typeof obj.next && 'function' == typeof obj.throw;
}

/**
 * Check if `obj` is a generator function.
 *
 * @param {Mixed} obj
 * @return {Boolean}
 * @api private
 */

function isGeneratorFunction(obj) {
  return obj && obj.constructor && 'GeneratorFunction' == obj.constructor.name;
}

/**
 * Check for plain object.
 *
 * @param {Mixed} val
 * @return {Boolean}
 * @api private
 */

function isObject(val) {
  return val && Object == val.constructor;
}

/**
 * Throw `err` in a new stack.
 *
 * This is used when co() is invoked
 * without supplying a callback, which
 * should only be for demonstrational
 * purposes.
 *
 * @param {Error} err
 * @api private
 */

function error(err) {
  if (!err) return;
  setImmediate(function(){
    throw err;
  });
}

},{}],12:[function(require,module,exports){
(function (process,global){
(function(global) {
  'use strict';
  if (global.$traceurRuntime) {
    return;
  }
  var $Object = Object;
  var $TypeError = TypeError;
  var $create = $Object.create;
  var $defineProperties = $Object.defineProperties;
  var $defineProperty = $Object.defineProperty;
  var $freeze = $Object.freeze;
  var $getOwnPropertyDescriptor = $Object.getOwnPropertyDescriptor;
  var $getOwnPropertyNames = $Object.getOwnPropertyNames;
  var $keys = $Object.keys;
  var $hasOwnProperty = $Object.prototype.hasOwnProperty;
  var $toString = $Object.prototype.toString;
  var $preventExtensions = Object.preventExtensions;
  var $seal = Object.seal;
  var $isExtensible = Object.isExtensible;
  function nonEnum(value) {
    return {
      configurable: true,
      enumerable: false,
      value: value,
      writable: true
    };
  }
  var method = nonEnum;
  var counter = 0;
  function newUniqueString() {
    return '__$' + Math.floor(Math.random() * 1e9) + '$' + ++counter + '$__';
  }
  var symbolInternalProperty = newUniqueString();
  var symbolDescriptionProperty = newUniqueString();
  var symbolDataProperty = newUniqueString();
  var symbolValues = $create(null);
  var privateNames = $create(null);
  function isPrivateName(s) {
    return privateNames[s];
  }
  function createPrivateName() {
    var s = newUniqueString();
    privateNames[s] = true;
    return s;
  }
  function isShimSymbol(symbol) {
    return typeof symbol === 'object' && symbol instanceof SymbolValue;
  }
  function typeOf(v) {
    if (isShimSymbol(v))
      return 'symbol';
    return typeof v;
  }
  function Symbol(description) {
    var value = new SymbolValue(description);
    if (!(this instanceof Symbol))
      return value;
    throw new TypeError('Symbol cannot be new\'ed');
  }
  $defineProperty(Symbol.prototype, 'constructor', nonEnum(Symbol));
  $defineProperty(Symbol.prototype, 'toString', method(function() {
    var symbolValue = this[symbolDataProperty];
    if (!getOption('symbols'))
      return symbolValue[symbolInternalProperty];
    if (!symbolValue)
      throw TypeError('Conversion from symbol to string');
    var desc = symbolValue[symbolDescriptionProperty];
    if (desc === undefined)
      desc = '';
    return 'Symbol(' + desc + ')';
  }));
  $defineProperty(Symbol.prototype, 'valueOf', method(function() {
    var symbolValue = this[symbolDataProperty];
    if (!symbolValue)
      throw TypeError('Conversion from symbol to string');
    if (!getOption('symbols'))
      return symbolValue[symbolInternalProperty];
    return symbolValue;
  }));
  function SymbolValue(description) {
    var key = newUniqueString();
    $defineProperty(this, symbolDataProperty, {value: this});
    $defineProperty(this, symbolInternalProperty, {value: key});
    $defineProperty(this, symbolDescriptionProperty, {value: description});
    freeze(this);
    symbolValues[key] = this;
  }
  $defineProperty(SymbolValue.prototype, 'constructor', nonEnum(Symbol));
  $defineProperty(SymbolValue.prototype, 'toString', {
    value: Symbol.prototype.toString,
    enumerable: false
  });
  $defineProperty(SymbolValue.prototype, 'valueOf', {
    value: Symbol.prototype.valueOf,
    enumerable: false
  });
  var hashProperty = createPrivateName();
  var hashPropertyDescriptor = {value: undefined};
  var hashObjectProperties = {
    hash: {value: undefined},
    self: {value: undefined}
  };
  var hashCounter = 0;
  function getOwnHashObject(object) {
    var hashObject = object[hashProperty];
    if (hashObject && hashObject.self === object)
      return hashObject;
    if ($isExtensible(object)) {
      hashObjectProperties.hash.value = hashCounter++;
      hashObjectProperties.self.value = object;
      hashPropertyDescriptor.value = $create(null, hashObjectProperties);
      $defineProperty(object, hashProperty, hashPropertyDescriptor);
      return hashPropertyDescriptor.value;
    }
    return undefined;
  }
  function freeze(object) {
    getOwnHashObject(object);
    return $freeze.apply(this, arguments);
  }
  function preventExtensions(object) {
    getOwnHashObject(object);
    return $preventExtensions.apply(this, arguments);
  }
  function seal(object) {
    getOwnHashObject(object);
    return $seal.apply(this, arguments);
  }
  freeze(SymbolValue.prototype);
  function isSymbolString(s) {
    return symbolValues[s] || privateNames[s];
  }
  function toProperty(name) {
    if (isShimSymbol(name))
      return name[symbolInternalProperty];
    return name;
  }
  function removeSymbolKeys(array) {
    var rv = [];
    for (var i = 0; i < array.length; i++) {
      if (!isSymbolString(array[i])) {
        rv.push(array[i]);
      }
    }
    return rv;
  }
  function getOwnPropertyNames(object) {
    return removeSymbolKeys($getOwnPropertyNames(object));
  }
  function keys(object) {
    return removeSymbolKeys($keys(object));
  }
  function getOwnPropertySymbols(object) {
    var rv = [];
    var names = $getOwnPropertyNames(object);
    for (var i = 0; i < names.length; i++) {
      var symbol = symbolValues[names[i]];
      if (symbol) {
        rv.push(symbol);
      }
    }
    return rv;
  }
  function getOwnPropertyDescriptor(object, name) {
    return $getOwnPropertyDescriptor(object, toProperty(name));
  }
  function hasOwnProperty(name) {
    return $hasOwnProperty.call(this, toProperty(name));
  }
  function getOption(name) {
    return global.traceur && global.traceur.options[name];
  }
  function defineProperty(object, name, descriptor) {
    if (isShimSymbol(name)) {
      name = name[symbolInternalProperty];
    }
    $defineProperty(object, name, descriptor);
    return object;
  }
  function polyfillObject(Object) {
    $defineProperty(Object, 'defineProperty', {value: defineProperty});
    $defineProperty(Object, 'getOwnPropertyNames', {value: getOwnPropertyNames});
    $defineProperty(Object, 'getOwnPropertyDescriptor', {value: getOwnPropertyDescriptor});
    $defineProperty(Object.prototype, 'hasOwnProperty', {value: hasOwnProperty});
    $defineProperty(Object, 'freeze', {value: freeze});
    $defineProperty(Object, 'preventExtensions', {value: preventExtensions});
    $defineProperty(Object, 'seal', {value: seal});
    $defineProperty(Object, 'keys', {value: keys});
  }
  function exportStar(object) {
    for (var i = 1; i < arguments.length; i++) {
      var names = $getOwnPropertyNames(arguments[i]);
      for (var j = 0; j < names.length; j++) {
        var name = names[j];
        if (isSymbolString(name))
          continue;
        (function(mod, name) {
          $defineProperty(object, name, {
            get: function() {
              return mod[name];
            },
            enumerable: true
          });
        })(arguments[i], names[j]);
      }
    }
    return object;
  }
  function isObject(x) {
    return x != null && (typeof x === 'object' || typeof x === 'function');
  }
  function toObject(x) {
    if (x == null)
      throw $TypeError();
    return $Object(x);
  }
  function checkObjectCoercible(argument) {
    if (argument == null) {
      throw new TypeError('Value cannot be converted to an Object');
    }
    return argument;
  }
  function polyfillSymbol(global, Symbol) {
    if (!global.Symbol) {
      global.Symbol = Symbol;
      Object.getOwnPropertySymbols = getOwnPropertySymbols;
    }
    if (!global.Symbol.iterator) {
      global.Symbol.iterator = Symbol('Symbol.iterator');
    }
  }
  function setupGlobals(global) {
    polyfillSymbol(global, Symbol);
    global.Reflect = global.Reflect || {};
    global.Reflect.global = global.Reflect.global || global;
    polyfillObject(global.Object);
  }
  setupGlobals(global);
  global.$traceurRuntime = {
    checkObjectCoercible: checkObjectCoercible,
    createPrivateName: createPrivateName,
    defineProperties: $defineProperties,
    defineProperty: $defineProperty,
    exportStar: exportStar,
    getOwnHashObject: getOwnHashObject,
    getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
    getOwnPropertyNames: $getOwnPropertyNames,
    isObject: isObject,
    isPrivateName: isPrivateName,
    isSymbolString: isSymbolString,
    keys: $keys,
    setupGlobals: setupGlobals,
    toObject: toObject,
    toProperty: toProperty,
    typeof: typeOf
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : this);
(function() {
  'use strict';
  var path;
  function relativeRequire(callerPath, requiredPath) {
    path = path || typeof require !== 'undefined' && require('path');
    function isDirectory(path) {
      return path.slice(-1) === '/';
    }
    function isAbsolute(path) {
      return path[0] === '/';
    }
    function isRelative(path) {
      return path[0] === '.';
    }
    if (isDirectory(requiredPath) || isAbsolute(requiredPath))
      return;
    return isRelative(requiredPath) ? require(path.resolve(path.dirname(callerPath), requiredPath)) : require(requiredPath);
  }
  $traceurRuntime.require = relativeRequire;
})();
(function() {
  'use strict';
  function spread() {
    var rv = [],
        j = 0,
        iterResult;
    for (var i = 0; i < arguments.length; i++) {
      var valueToSpread = $traceurRuntime.checkObjectCoercible(arguments[i]);
      if (typeof valueToSpread[$traceurRuntime.toProperty(Symbol.iterator)] !== 'function') {
        throw new TypeError('Cannot spread non-iterable object.');
      }
      var iter = valueToSpread[$traceurRuntime.toProperty(Symbol.iterator)]();
      while (!(iterResult = iter.next()).done) {
        rv[j++] = iterResult.value;
      }
    }
    return rv;
  }
  $traceurRuntime.spread = spread;
})();
(function() {
  'use strict';
  var $Object = Object;
  var $TypeError = TypeError;
  var $create = $Object.create;
  var $defineProperties = $traceurRuntime.defineProperties;
  var $defineProperty = $traceurRuntime.defineProperty;
  var $getOwnPropertyDescriptor = $traceurRuntime.getOwnPropertyDescriptor;
  var $getOwnPropertyNames = $traceurRuntime.getOwnPropertyNames;
  var $getPrototypeOf = Object.getPrototypeOf;
  var $__0 = Object,
      getOwnPropertyNames = $__0.getOwnPropertyNames,
      getOwnPropertySymbols = $__0.getOwnPropertySymbols;
  function superDescriptor(homeObject, name) {
    var proto = $getPrototypeOf(homeObject);
    do {
      var result = $getOwnPropertyDescriptor(proto, name);
      if (result)
        return result;
      proto = $getPrototypeOf(proto);
    } while (proto);
    return undefined;
  }
  function superConstructor(ctor) {
    return ctor.__proto__;
  }
  function superCall(self, homeObject, name, args) {
    return superGet(self, homeObject, name).apply(self, args);
  }
  function superGet(self, homeObject, name) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor) {
      if (!descriptor.get)
        return descriptor.value;
      return descriptor.get.call(self);
    }
    return undefined;
  }
  function superSet(self, homeObject, name, value) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor && descriptor.set) {
      descriptor.set.call(self, value);
      return value;
    }
    throw $TypeError(("super has no setter '" + name + "'."));
  }
  function getDescriptors(object) {
    var descriptors = {};
    var names = getOwnPropertyNames(object);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      descriptors[name] = $getOwnPropertyDescriptor(object, name);
    }
    var symbols = getOwnPropertySymbols(object);
    for (var i = 0; i < symbols.length; i++) {
      var symbol = symbols[i];
      descriptors[$traceurRuntime.toProperty(symbol)] = $getOwnPropertyDescriptor(object, $traceurRuntime.toProperty(symbol));
    }
    return descriptors;
  }
  function createClass(ctor, object, staticObject, superClass) {
    $defineProperty(object, 'constructor', {
      value: ctor,
      configurable: true,
      enumerable: false,
      writable: true
    });
    if (arguments.length > 3) {
      if (typeof superClass === 'function')
        ctor.__proto__ = superClass;
      ctor.prototype = $create(getProtoParent(superClass), getDescriptors(object));
    } else {
      ctor.prototype = object;
    }
    $defineProperty(ctor, 'prototype', {
      configurable: false,
      writable: false
    });
    return $defineProperties(ctor, getDescriptors(staticObject));
  }
  function getProtoParent(superClass) {
    if (typeof superClass === 'function') {
      var prototype = superClass.prototype;
      if ($Object(prototype) === prototype || prototype === null)
        return superClass.prototype;
      throw new $TypeError('super prototype must be an Object or null');
    }
    if (superClass === null)
      return null;
    throw new $TypeError(("Super expression must either be null or a function, not " + typeof superClass + "."));
  }
  function defaultSuperCall(self, homeObject, args) {
    if ($getPrototypeOf(homeObject) !== null)
      superCall(self, homeObject, 'constructor', args);
  }
  $traceurRuntime.createClass = createClass;
  $traceurRuntime.defaultSuperCall = defaultSuperCall;
  $traceurRuntime.superCall = superCall;
  $traceurRuntime.superConstructor = superConstructor;
  $traceurRuntime.superGet = superGet;
  $traceurRuntime.superSet = superSet;
})();
(function() {
  'use strict';
  if (typeof $traceurRuntime !== 'object') {
    throw new Error('traceur runtime not found.');
  }
  var createPrivateName = $traceurRuntime.createPrivateName;
  var $defineProperties = $traceurRuntime.defineProperties;
  var $defineProperty = $traceurRuntime.defineProperty;
  var $create = Object.create;
  var $TypeError = TypeError;
  function nonEnum(value) {
    return {
      configurable: true,
      enumerable: false,
      value: value,
      writable: true
    };
  }
  var ST_NEWBORN = 0;
  var ST_EXECUTING = 1;
  var ST_SUSPENDED = 2;
  var ST_CLOSED = 3;
  var END_STATE = -2;
  var RETHROW_STATE = -3;
  function getInternalError(state) {
    return new Error('Traceur compiler bug: invalid state in state machine: ' + state);
  }
  function GeneratorContext() {
    this.state = 0;
    this.GState = ST_NEWBORN;
    this.storedException = undefined;
    this.finallyFallThrough = undefined;
    this.sent_ = undefined;
    this.returnValue = undefined;
    this.tryStack_ = [];
  }
  GeneratorContext.prototype = {
    pushTry: function(catchState, finallyState) {
      if (finallyState !== null) {
        var finallyFallThrough = null;
        for (var i = this.tryStack_.length - 1; i >= 0; i--) {
          if (this.tryStack_[i].catch !== undefined) {
            finallyFallThrough = this.tryStack_[i].catch;
            break;
          }
        }
        if (finallyFallThrough === null)
          finallyFallThrough = RETHROW_STATE;
        this.tryStack_.push({
          finally: finallyState,
          finallyFallThrough: finallyFallThrough
        });
      }
      if (catchState !== null) {
        this.tryStack_.push({catch: catchState});
      }
    },
    popTry: function() {
      this.tryStack_.pop();
    },
    get sent() {
      this.maybeThrow();
      return this.sent_;
    },
    set sent(v) {
      this.sent_ = v;
    },
    get sentIgnoreThrow() {
      return this.sent_;
    },
    maybeThrow: function() {
      if (this.action === 'throw') {
        this.action = 'next';
        throw this.sent_;
      }
    },
    end: function() {
      switch (this.state) {
        case END_STATE:
          return this;
        case RETHROW_STATE:
          throw this.storedException;
        default:
          throw getInternalError(this.state);
      }
    },
    handleException: function(ex) {
      this.GState = ST_CLOSED;
      this.state = END_STATE;
      throw ex;
    }
  };
  function nextOrThrow(ctx, moveNext, action, x) {
    switch (ctx.GState) {
      case ST_EXECUTING:
        throw new Error(("\"" + action + "\" on executing generator"));
      case ST_CLOSED:
        if (action == 'next') {
          return {
            value: undefined,
            done: true
          };
        }
        throw x;
      case ST_NEWBORN:
        if (action === 'throw') {
          ctx.GState = ST_CLOSED;
          throw x;
        }
        if (x !== undefined)
          throw $TypeError('Sent value to newborn generator');
      case ST_SUSPENDED:
        ctx.GState = ST_EXECUTING;
        ctx.action = action;
        ctx.sent = x;
        var value = moveNext(ctx);
        var done = value === ctx;
        if (done)
          value = ctx.returnValue;
        ctx.GState = done ? ST_CLOSED : ST_SUSPENDED;
        return {
          value: value,
          done: done
        };
    }
  }
  var ctxName = createPrivateName();
  var moveNextName = createPrivateName();
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}
  GeneratorFunction.prototype = GeneratorFunctionPrototype;
  $defineProperty(GeneratorFunctionPrototype, 'constructor', nonEnum(GeneratorFunction));
  GeneratorFunctionPrototype.prototype = {
    constructor: GeneratorFunctionPrototype,
    next: function(v) {
      return nextOrThrow(this[ctxName], this[moveNextName], 'next', v);
    },
    throw: function(v) {
      return nextOrThrow(this[ctxName], this[moveNextName], 'throw', v);
    }
  };
  $defineProperties(GeneratorFunctionPrototype.prototype, {
    constructor: {enumerable: false},
    next: {enumerable: false},
    throw: {enumerable: false}
  });
  Object.defineProperty(GeneratorFunctionPrototype.prototype, Symbol.iterator, nonEnum(function() {
    return this;
  }));
  function createGeneratorInstance(innerFunction, functionObject, self) {
    var moveNext = getMoveNext(innerFunction, self);
    var ctx = new GeneratorContext();
    var object = $create(functionObject.prototype);
    object[ctxName] = ctx;
    object[moveNextName] = moveNext;
    return object;
  }
  function initGeneratorFunction(functionObject) {
    functionObject.prototype = $create(GeneratorFunctionPrototype.prototype);
    functionObject.__proto__ = GeneratorFunctionPrototype;
    return functionObject;
  }
  function AsyncFunctionContext() {
    GeneratorContext.call(this);
    this.err = undefined;
    var ctx = this;
    ctx.result = new Promise(function(resolve, reject) {
      ctx.resolve = resolve;
      ctx.reject = reject;
    });
  }
  AsyncFunctionContext.prototype = $create(GeneratorContext.prototype);
  AsyncFunctionContext.prototype.end = function() {
    switch (this.state) {
      case END_STATE:
        this.resolve(this.returnValue);
        break;
      case RETHROW_STATE:
        this.reject(this.storedException);
        break;
      default:
        this.reject(getInternalError(this.state));
    }
  };
  AsyncFunctionContext.prototype.handleException = function() {
    this.state = RETHROW_STATE;
  };
  function asyncWrap(innerFunction, self) {
    var moveNext = getMoveNext(innerFunction, self);
    var ctx = new AsyncFunctionContext();
    ctx.createCallback = function(newState) {
      return function(value) {
        ctx.state = newState;
        ctx.value = value;
        moveNext(ctx);
      };
    };
    ctx.errback = function(err) {
      handleCatch(ctx, err);
      moveNext(ctx);
    };
    moveNext(ctx);
    return ctx.result;
  }
  function getMoveNext(innerFunction, self) {
    return function(ctx) {
      while (true) {
        try {
          return innerFunction.call(self, ctx);
        } catch (ex) {
          handleCatch(ctx, ex);
        }
      }
    };
  }
  function handleCatch(ctx, ex) {
    ctx.storedException = ex;
    var last = ctx.tryStack_[ctx.tryStack_.length - 1];
    if (!last) {
      ctx.handleException(ex);
      return;
    }
    ctx.state = last.catch !== undefined ? last.catch : last.finally;
    if (last.finallyFallThrough !== undefined)
      ctx.finallyFallThrough = last.finallyFallThrough;
  }
  $traceurRuntime.asyncWrap = asyncWrap;
  $traceurRuntime.initGeneratorFunction = initGeneratorFunction;
  $traceurRuntime.createGeneratorInstance = createGeneratorInstance;
})();
(function() {
  function buildFromEncodedParts(opt_scheme, opt_userInfo, opt_domain, opt_port, opt_path, opt_queryData, opt_fragment) {
    var out = [];
    if (opt_scheme) {
      out.push(opt_scheme, ':');
    }
    if (opt_domain) {
      out.push('//');
      if (opt_userInfo) {
        out.push(opt_userInfo, '@');
      }
      out.push(opt_domain);
      if (opt_port) {
        out.push(':', opt_port);
      }
    }
    if (opt_path) {
      out.push(opt_path);
    }
    if (opt_queryData) {
      out.push('?', opt_queryData);
    }
    if (opt_fragment) {
      out.push('#', opt_fragment);
    }
    return out.join('');
  }
  ;
  var splitRe = new RegExp('^' + '(?:' + '([^:/?#.]+)' + ':)?' + '(?://' + '(?:([^/?#]*)@)?' + '([\\w\\d\\-\\u0100-\\uffff.%]*)' + '(?::([0-9]+))?' + ')?' + '([^?#]+)?' + '(?:\\?([^#]*))?' + '(?:#(.*))?' + '$');
  var ComponentIndex = {
    SCHEME: 1,
    USER_INFO: 2,
    DOMAIN: 3,
    PORT: 4,
    PATH: 5,
    QUERY_DATA: 6,
    FRAGMENT: 7
  };
  function split(uri) {
    return (uri.match(splitRe));
  }
  function removeDotSegments(path) {
    if (path === '/')
      return '/';
    var leadingSlash = path[0] === '/' ? '/' : '';
    var trailingSlash = path.slice(-1) === '/' ? '/' : '';
    var segments = path.split('/');
    var out = [];
    var up = 0;
    for (var pos = 0; pos < segments.length; pos++) {
      var segment = segments[pos];
      switch (segment) {
        case '':
        case '.':
          break;
        case '..':
          if (out.length)
            out.pop();
          else
            up++;
          break;
        default:
          out.push(segment);
      }
    }
    if (!leadingSlash) {
      while (up-- > 0) {
        out.unshift('..');
      }
      if (out.length === 0)
        out.push('.');
    }
    return leadingSlash + out.join('/') + trailingSlash;
  }
  function joinAndCanonicalizePath(parts) {
    var path = parts[ComponentIndex.PATH] || '';
    path = removeDotSegments(path);
    parts[ComponentIndex.PATH] = path;
    return buildFromEncodedParts(parts[ComponentIndex.SCHEME], parts[ComponentIndex.USER_INFO], parts[ComponentIndex.DOMAIN], parts[ComponentIndex.PORT], parts[ComponentIndex.PATH], parts[ComponentIndex.QUERY_DATA], parts[ComponentIndex.FRAGMENT]);
  }
  function canonicalizeUrl(url) {
    var parts = split(url);
    return joinAndCanonicalizePath(parts);
  }
  function resolveUrl(base, url) {
    var parts = split(url);
    var baseParts = split(base);
    if (parts[ComponentIndex.SCHEME]) {
      return joinAndCanonicalizePath(parts);
    } else {
      parts[ComponentIndex.SCHEME] = baseParts[ComponentIndex.SCHEME];
    }
    for (var i = ComponentIndex.SCHEME; i <= ComponentIndex.PORT; i++) {
      if (!parts[i]) {
        parts[i] = baseParts[i];
      }
    }
    if (parts[ComponentIndex.PATH][0] == '/') {
      return joinAndCanonicalizePath(parts);
    }
    var path = baseParts[ComponentIndex.PATH];
    var index = path.lastIndexOf('/');
    path = path.slice(0, index + 1) + parts[ComponentIndex.PATH];
    parts[ComponentIndex.PATH] = path;
    return joinAndCanonicalizePath(parts);
  }
  function isAbsolute(name) {
    if (!name)
      return false;
    if (name[0] === '/')
      return true;
    var parts = split(name);
    if (parts[ComponentIndex.SCHEME])
      return true;
    return false;
  }
  $traceurRuntime.canonicalizeUrl = canonicalizeUrl;
  $traceurRuntime.isAbsolute = isAbsolute;
  $traceurRuntime.removeDotSegments = removeDotSegments;
  $traceurRuntime.resolveUrl = resolveUrl;
})();
(function() {
  'use strict';
  var types = {
    any: {name: 'any'},
    boolean: {name: 'boolean'},
    number: {name: 'number'},
    string: {name: 'string'},
    symbol: {name: 'symbol'},
    void: {name: 'void'}
  };
  var GenericType = function GenericType(type, argumentTypes) {
    this.type = type;
    this.argumentTypes = argumentTypes;
  };
  ($traceurRuntime.createClass)(GenericType, {}, {});
  var typeRegister = Object.create(null);
  function genericType(type) {
    for (var argumentTypes = [],
        $__1 = 1; $__1 < arguments.length; $__1++)
      argumentTypes[$__1 - 1] = arguments[$__1];
    var typeMap = typeRegister;
    var key = $traceurRuntime.getOwnHashObject(type).hash;
    if (!typeMap[key]) {
      typeMap[key] = Object.create(null);
    }
    typeMap = typeMap[key];
    for (var i = 0; i < argumentTypes.length - 1; i++) {
      key = $traceurRuntime.getOwnHashObject(argumentTypes[i]).hash;
      if (!typeMap[key]) {
        typeMap[key] = Object.create(null);
      }
      typeMap = typeMap[key];
    }
    var tail = argumentTypes[argumentTypes.length - 1];
    key = $traceurRuntime.getOwnHashObject(tail).hash;
    if (!typeMap[key]) {
      typeMap[key] = new GenericType(type, argumentTypes);
    }
    return typeMap[key];
  }
  $traceurRuntime.GenericType = GenericType;
  $traceurRuntime.genericType = genericType;
  $traceurRuntime.type = types;
})();
(function(global) {
  'use strict';
  var $__2 = $traceurRuntime,
      canonicalizeUrl = $__2.canonicalizeUrl,
      resolveUrl = $__2.resolveUrl,
      isAbsolute = $__2.isAbsolute;
  var moduleInstantiators = Object.create(null);
  var baseURL;
  if (global.location && global.location.href)
    baseURL = resolveUrl(global.location.href, './');
  else
    baseURL = '';
  var UncoatedModuleEntry = function UncoatedModuleEntry(url, uncoatedModule) {
    this.url = url;
    this.value_ = uncoatedModule;
  };
  ($traceurRuntime.createClass)(UncoatedModuleEntry, {}, {});
  var ModuleEvaluationError = function ModuleEvaluationError(erroneousModuleName, cause) {
    this.message = this.constructor.name + ': ' + this.stripCause(cause) + ' in ' + erroneousModuleName;
    if (!(cause instanceof $ModuleEvaluationError) && cause.stack)
      this.stack = this.stripStack(cause.stack);
    else
      this.stack = '';
  };
  var $ModuleEvaluationError = ModuleEvaluationError;
  ($traceurRuntime.createClass)(ModuleEvaluationError, {
    stripError: function(message) {
      return message.replace(/.*Error:/, this.constructor.name + ':');
    },
    stripCause: function(cause) {
      if (!cause)
        return '';
      if (!cause.message)
        return cause + '';
      return this.stripError(cause.message);
    },
    loadedBy: function(moduleName) {
      this.stack += '\n loaded by ' + moduleName;
    },
    stripStack: function(causeStack) {
      var stack = [];
      causeStack.split('\n').some((function(frame) {
        if (/UncoatedModuleInstantiator/.test(frame))
          return true;
        stack.push(frame);
      }));
      stack[0] = this.stripError(stack[0]);
      return stack.join('\n');
    }
  }, {}, Error);
  function beforeLines(lines, number) {
    var result = [];
    var first = number - 3;
    if (first < 0)
      first = 0;
    for (var i = first; i < number; i++) {
      result.push(lines[i]);
    }
    return result;
  }
  function afterLines(lines, number) {
    var last = number + 1;
    if (last > lines.length - 1)
      last = lines.length - 1;
    var result = [];
    for (var i = number; i <= last; i++) {
      result.push(lines[i]);
    }
    return result;
  }
  function columnSpacing(columns) {
    var result = '';
    for (var i = 0; i < columns - 1; i++) {
      result += '-';
    }
    return result;
  }
  var UncoatedModuleInstantiator = function UncoatedModuleInstantiator(url, func) {
    $traceurRuntime.superConstructor($UncoatedModuleInstantiator).call(this, url, null);
    this.func = func;
  };
  var $UncoatedModuleInstantiator = UncoatedModuleInstantiator;
  ($traceurRuntime.createClass)(UncoatedModuleInstantiator, {getUncoatedModule: function() {
      if (this.value_)
        return this.value_;
      try {
        var relativeRequire;
        if (typeof $traceurRuntime !== undefined) {
          relativeRequire = $traceurRuntime.require.bind(null, this.url);
        }
        return this.value_ = this.func.call(global, relativeRequire);
      } catch (ex) {
        if (ex instanceof ModuleEvaluationError) {
          ex.loadedBy(this.url);
          throw ex;
        }
        if (ex.stack) {
          var lines = this.func.toString().split('\n');
          var evaled = [];
          ex.stack.split('\n').some(function(frame) {
            if (frame.indexOf('UncoatedModuleInstantiator.getUncoatedModule') > 0)
              return true;
            var m = /(at\s[^\s]*\s).*>:(\d*):(\d*)\)/.exec(frame);
            if (m) {
              var line = parseInt(m[2], 10);
              evaled = evaled.concat(beforeLines(lines, line));
              evaled.push(columnSpacing(m[3]) + '^');
              evaled = evaled.concat(afterLines(lines, line));
              evaled.push('= = = = = = = = =');
            } else {
              evaled.push(frame);
            }
          });
          ex.stack = evaled.join('\n');
        }
        throw new ModuleEvaluationError(this.url, ex);
      }
    }}, {}, UncoatedModuleEntry);
  function getUncoatedModuleInstantiator(name) {
    if (!name)
      return;
    var url = ModuleStore.normalize(name);
    return moduleInstantiators[url];
  }
  ;
  var moduleInstances = Object.create(null);
  var liveModuleSentinel = {};
  function Module(uncoatedModule) {
    var isLive = arguments[1];
    var coatedModule = Object.create(null);
    Object.getOwnPropertyNames(uncoatedModule).forEach((function(name) {
      var getter,
          value;
      if (isLive === liveModuleSentinel) {
        var descr = Object.getOwnPropertyDescriptor(uncoatedModule, name);
        if (descr.get)
          getter = descr.get;
      }
      if (!getter) {
        value = uncoatedModule[name];
        getter = function() {
          return value;
        };
      }
      Object.defineProperty(coatedModule, name, {
        get: getter,
        enumerable: true
      });
    }));
    Object.preventExtensions(coatedModule);
    return coatedModule;
  }
  var ModuleStore = {
    normalize: function(name, refererName, refererAddress) {
      if (typeof name !== 'string')
        throw new TypeError('module name must be a string, not ' + typeof name);
      if (isAbsolute(name))
        return canonicalizeUrl(name);
      if (/[^\.]\/\.\.\//.test(name)) {
        throw new Error('module name embeds /../: ' + name);
      }
      if (name[0] === '.' && refererName)
        return resolveUrl(refererName, name);
      return canonicalizeUrl(name);
    },
    get: function(normalizedName) {
      var m = getUncoatedModuleInstantiator(normalizedName);
      if (!m)
        return undefined;
      var moduleInstance = moduleInstances[m.url];
      if (moduleInstance)
        return moduleInstance;
      moduleInstance = Module(m.getUncoatedModule(), liveModuleSentinel);
      return moduleInstances[m.url] = moduleInstance;
    },
    set: function(normalizedName, module) {
      normalizedName = String(normalizedName);
      moduleInstantiators[normalizedName] = new UncoatedModuleInstantiator(normalizedName, (function() {
        return module;
      }));
      moduleInstances[normalizedName] = module;
    },
    get baseURL() {
      return baseURL;
    },
    set baseURL(v) {
      baseURL = String(v);
    },
    registerModule: function(name, deps, func) {
      var normalizedName = ModuleStore.normalize(name);
      if (moduleInstantiators[normalizedName])
        throw new Error('duplicate module named ' + normalizedName);
      moduleInstantiators[normalizedName] = new UncoatedModuleInstantiator(normalizedName, func);
    },
    bundleStore: Object.create(null),
    register: function(name, deps, func) {
      if (!deps || !deps.length && !func.length) {
        this.registerModule(name, deps, func);
      } else {
        this.bundleStore[name] = {
          deps: deps,
          execute: function() {
            var $__0 = arguments;
            var depMap = {};
            deps.forEach((function(dep, index) {
              return depMap[dep] = $__0[index];
            }));
            var registryEntry = func.call(this, depMap);
            registryEntry.execute.call(this);
            return registryEntry.exports;
          }
        };
      }
    },
    getAnonymousModule: function(func) {
      return new Module(func.call(global), liveModuleSentinel);
    },
    getForTesting: function(name) {
      var $__0 = this;
      if (!this.testingPrefix_) {
        Object.keys(moduleInstances).some((function(key) {
          var m = /(traceur@[^\/]*\/)/.exec(key);
          if (m) {
            $__0.testingPrefix_ = m[1];
            return true;
          }
        }));
      }
      return this.get(this.testingPrefix_ + name);
    }
  };
  var moduleStoreModule = new Module({ModuleStore: ModuleStore});
  ModuleStore.set('@traceur/src/runtime/ModuleStore', moduleStoreModule);
  ModuleStore.set('@traceur/src/runtime/ModuleStore.js', moduleStoreModule);
  var setupGlobals = $traceurRuntime.setupGlobals;
  $traceurRuntime.setupGlobals = function(global) {
    setupGlobals(global);
  };
  $traceurRuntime.ModuleStore = ModuleStore;
  global.System = {
    register: ModuleStore.register.bind(ModuleStore),
    registerModule: ModuleStore.registerModule.bind(ModuleStore),
    get: ModuleStore.get,
    set: ModuleStore.set,
    normalize: ModuleStore.normalize
  };
  $traceurRuntime.getModuleImpl = function(name) {
    var instantiator = getUncoatedModuleInstantiator(name);
    return instantiator && instantiator.getUncoatedModule();
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : this);
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/utils.js";
  var $ceil = Math.ceil;
  var $floor = Math.floor;
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var $pow = Math.pow;
  var $min = Math.min;
  var toObject = $traceurRuntime.toObject;
  function toUint32(x) {
    return x >>> 0;
  }
  function isObject(x) {
    return x && (typeof x === 'object' || typeof x === 'function');
  }
  function isCallable(x) {
    return typeof x === 'function';
  }
  function isNumber(x) {
    return typeof x === 'number';
  }
  function toInteger(x) {
    x = +x;
    if ($isNaN(x))
      return 0;
    if (x === 0 || !$isFinite(x))
      return x;
    return x > 0 ? $floor(x) : $ceil(x);
  }
  var MAX_SAFE_LENGTH = $pow(2, 53) - 1;
  function toLength(x) {
    var len = toInteger(x);
    return len < 0 ? 0 : $min(len, MAX_SAFE_LENGTH);
  }
  function checkIterable(x) {
    return !isObject(x) ? undefined : x[Symbol.iterator];
  }
  function isConstructor(x) {
    return isCallable(x);
  }
  function createIteratorResultObject(value, done) {
    return {
      value: value,
      done: done
    };
  }
  function maybeDefine(object, name, descr) {
    if (!(name in object)) {
      Object.defineProperty(object, name, descr);
    }
  }
  function maybeDefineMethod(object, name, value) {
    maybeDefine(object, name, {
      value: value,
      configurable: true,
      enumerable: false,
      writable: true
    });
  }
  function maybeDefineConst(object, name, value) {
    maybeDefine(object, name, {
      value: value,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
  function maybeAddFunctions(object, functions) {
    for (var i = 0; i < functions.length; i += 2) {
      var name = functions[i];
      var value = functions[i + 1];
      maybeDefineMethod(object, name, value);
    }
  }
  function maybeAddConsts(object, consts) {
    for (var i = 0; i < consts.length; i += 2) {
      var name = consts[i];
      var value = consts[i + 1];
      maybeDefineConst(object, name, value);
    }
  }
  function maybeAddIterator(object, func, Symbol) {
    if (!Symbol || !Symbol.iterator || object[Symbol.iterator])
      return;
    if (object['@@iterator'])
      func = object['@@iterator'];
    Object.defineProperty(object, Symbol.iterator, {
      value: func,
      configurable: true,
      enumerable: false,
      writable: true
    });
  }
  var polyfills = [];
  function registerPolyfill(func) {
    polyfills.push(func);
  }
  function polyfillAll(global) {
    polyfills.forEach((function(f) {
      return f(global);
    }));
  }
  return {
    get toObject() {
      return toObject;
    },
    get toUint32() {
      return toUint32;
    },
    get isObject() {
      return isObject;
    },
    get isCallable() {
      return isCallable;
    },
    get isNumber() {
      return isNumber;
    },
    get toInteger() {
      return toInteger;
    },
    get toLength() {
      return toLength;
    },
    get checkIterable() {
      return checkIterable;
    },
    get isConstructor() {
      return isConstructor;
    },
    get createIteratorResultObject() {
      return createIteratorResultObject;
    },
    get maybeDefine() {
      return maybeDefine;
    },
    get maybeDefineMethod() {
      return maybeDefineMethod;
    },
    get maybeDefineConst() {
      return maybeDefineConst;
    },
    get maybeAddFunctions() {
      return maybeAddFunctions;
    },
    get maybeAddConsts() {
      return maybeAddConsts;
    },
    get maybeAddIterator() {
      return maybeAddIterator;
    },
    get registerPolyfill() {
      return registerPolyfill;
    },
    get polyfillAll() {
      return polyfillAll;
    }
  };
});
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/Map.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/Map.js";
  var $__0 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js"),
      isObject = $__0.isObject,
      maybeAddIterator = $__0.maybeAddIterator,
      registerPolyfill = $__0.registerPolyfill;
  var getOwnHashObject = $traceurRuntime.getOwnHashObject;
  var $hasOwnProperty = Object.prototype.hasOwnProperty;
  var deletedSentinel = {};
  function lookupIndex(map, key) {
    if (isObject(key)) {
      var hashObject = getOwnHashObject(key);
      return hashObject && map.objectIndex_[hashObject.hash];
    }
    if (typeof key === 'string')
      return map.stringIndex_[key];
    return map.primitiveIndex_[key];
  }
  function initMap(map) {
    map.entries_ = [];
    map.objectIndex_ = Object.create(null);
    map.stringIndex_ = Object.create(null);
    map.primitiveIndex_ = Object.create(null);
    map.deletedCount_ = 0;
  }
  var Map = function Map() {
    var iterable = arguments[0];
    if (!isObject(this))
      throw new TypeError('Map called on incompatible type');
    if ($hasOwnProperty.call(this, 'entries_')) {
      throw new TypeError('Map can not be reentrantly initialised');
    }
    initMap(this);
    if (iterable !== null && iterable !== undefined) {
      for (var $__2 = iterable[$traceurRuntime.toProperty(Symbol.iterator)](),
          $__3; !($__3 = $__2.next()).done; ) {
        var $__4 = $__3.value,
            key = $__4[0],
            value = $__4[1];
        {
          this.set(key, value);
        }
      }
    }
  };
  ($traceurRuntime.createClass)(Map, {
    get size() {
      return this.entries_.length / 2 - this.deletedCount_;
    },
    get: function(key) {
      var index = lookupIndex(this, key);
      if (index !== undefined)
        return this.entries_[index + 1];
    },
    set: function(key, value) {
      var objectMode = isObject(key);
      var stringMode = typeof key === 'string';
      var index = lookupIndex(this, key);
      if (index !== undefined) {
        this.entries_[index + 1] = value;
      } else {
        index = this.entries_.length;
        this.entries_[index] = key;
        this.entries_[index + 1] = value;
        if (objectMode) {
          var hashObject = getOwnHashObject(key);
          var hash = hashObject.hash;
          this.objectIndex_[hash] = index;
        } else if (stringMode) {
          this.stringIndex_[key] = index;
        } else {
          this.primitiveIndex_[key] = index;
        }
      }
      return this;
    },
    has: function(key) {
      return lookupIndex(this, key) !== undefined;
    },
    delete: function(key) {
      var objectMode = isObject(key);
      var stringMode = typeof key === 'string';
      var index;
      var hash;
      if (objectMode) {
        var hashObject = getOwnHashObject(key);
        if (hashObject) {
          index = this.objectIndex_[hash = hashObject.hash];
          delete this.objectIndex_[hash];
        }
      } else if (stringMode) {
        index = this.stringIndex_[key];
        delete this.stringIndex_[key];
      } else {
        index = this.primitiveIndex_[key];
        delete this.primitiveIndex_[key];
      }
      if (index !== undefined) {
        this.entries_[index] = deletedSentinel;
        this.entries_[index + 1] = undefined;
        this.deletedCount_++;
        return true;
      }
      return false;
    },
    clear: function() {
      initMap(this);
    },
    forEach: function(callbackFn) {
      var thisArg = arguments[1];
      for (var i = 0; i < this.entries_.length; i += 2) {
        var key = this.entries_[i];
        var value = this.entries_[i + 1];
        if (key === deletedSentinel)
          continue;
        callbackFn.call(thisArg, value, key, this);
      }
    },
    entries: $traceurRuntime.initGeneratorFunction(function $__5() {
      var i,
          key,
          value;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              i = 0;
              $ctx.state = 12;
              break;
            case 12:
              $ctx.state = (i < this.entries_.length) ? 8 : -2;
              break;
            case 4:
              i += 2;
              $ctx.state = 12;
              break;
            case 8:
              key = this.entries_[i];
              value = this.entries_[i + 1];
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = (key === deletedSentinel) ? 4 : 6;
              break;
            case 6:
              $ctx.state = 2;
              return [key, value];
            case 2:
              $ctx.maybeThrow();
              $ctx.state = 4;
              break;
            default:
              return $ctx.end();
          }
      }, $__5, this);
    }),
    keys: $traceurRuntime.initGeneratorFunction(function $__6() {
      var i,
          key,
          value;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              i = 0;
              $ctx.state = 12;
              break;
            case 12:
              $ctx.state = (i < this.entries_.length) ? 8 : -2;
              break;
            case 4:
              i += 2;
              $ctx.state = 12;
              break;
            case 8:
              key = this.entries_[i];
              value = this.entries_[i + 1];
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = (key === deletedSentinel) ? 4 : 6;
              break;
            case 6:
              $ctx.state = 2;
              return key;
            case 2:
              $ctx.maybeThrow();
              $ctx.state = 4;
              break;
            default:
              return $ctx.end();
          }
      }, $__6, this);
    }),
    values: $traceurRuntime.initGeneratorFunction(function $__7() {
      var i,
          key,
          value;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              i = 0;
              $ctx.state = 12;
              break;
            case 12:
              $ctx.state = (i < this.entries_.length) ? 8 : -2;
              break;
            case 4:
              i += 2;
              $ctx.state = 12;
              break;
            case 8:
              key = this.entries_[i];
              value = this.entries_[i + 1];
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = (key === deletedSentinel) ? 4 : 6;
              break;
            case 6:
              $ctx.state = 2;
              return value;
            case 2:
              $ctx.maybeThrow();
              $ctx.state = 4;
              break;
            default:
              return $ctx.end();
          }
      }, $__7, this);
    })
  }, {});
  Object.defineProperty(Map.prototype, Symbol.iterator, {
    configurable: true,
    writable: true,
    value: Map.prototype.entries
  });
  function polyfillMap(global) {
    var $__4 = global,
        Object = $__4.Object,
        Symbol = $__4.Symbol;
    if (!global.Map)
      global.Map = Map;
    var mapPrototype = global.Map.prototype;
    if (mapPrototype.entries === undefined)
      global.Map = Map;
    if (mapPrototype.entries) {
      maybeAddIterator(mapPrototype, mapPrototype.entries, Symbol);
      maybeAddIterator(Object.getPrototypeOf(new global.Map().entries()), function() {
        return this;
      }, Symbol);
    }
  }
  registerPolyfill(polyfillMap);
  return {
    get Map() {
      return Map;
    },
    get polyfillMap() {
      return polyfillMap;
    }
  };
});
System.get("traceur-runtime@0.0.79/src/runtime/polyfills/Map.js" + '');
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/Set.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/Set.js";
  var $__0 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js"),
      isObject = $__0.isObject,
      maybeAddIterator = $__0.maybeAddIterator,
      registerPolyfill = $__0.registerPolyfill;
  var Map = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/Map.js").Map;
  var getOwnHashObject = $traceurRuntime.getOwnHashObject;
  var $hasOwnProperty = Object.prototype.hasOwnProperty;
  function initSet(set) {
    set.map_ = new Map();
  }
  var Set = function Set() {
    var iterable = arguments[0];
    if (!isObject(this))
      throw new TypeError('Set called on incompatible type');
    if ($hasOwnProperty.call(this, 'map_')) {
      throw new TypeError('Set can not be reentrantly initialised');
    }
    initSet(this);
    if (iterable !== null && iterable !== undefined) {
      for (var $__4 = iterable[$traceurRuntime.toProperty(Symbol.iterator)](),
          $__5; !($__5 = $__4.next()).done; ) {
        var item = $__5.value;
        {
          this.add(item);
        }
      }
    }
  };
  ($traceurRuntime.createClass)(Set, {
    get size() {
      return this.map_.size;
    },
    has: function(key) {
      return this.map_.has(key);
    },
    add: function(key) {
      this.map_.set(key, key);
      return this;
    },
    delete: function(key) {
      return this.map_.delete(key);
    },
    clear: function() {
      return this.map_.clear();
    },
    forEach: function(callbackFn) {
      var thisArg = arguments[1];
      var $__2 = this;
      return this.map_.forEach((function(value, key) {
        callbackFn.call(thisArg, key, key, $__2);
      }));
    },
    values: $traceurRuntime.initGeneratorFunction(function $__7() {
      var $__8,
          $__9;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              $__8 = this.map_.keys()[Symbol.iterator]();
              $ctx.sent = void 0;
              $ctx.action = 'next';
              $ctx.state = 12;
              break;
            case 12:
              $__9 = $__8[$ctx.action]($ctx.sentIgnoreThrow);
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = ($__9.done) ? 3 : 2;
              break;
            case 3:
              $ctx.sent = $__9.value;
              $ctx.state = -2;
              break;
            case 2:
              $ctx.state = 12;
              return $__9.value;
            default:
              return $ctx.end();
          }
      }, $__7, this);
    }),
    entries: $traceurRuntime.initGeneratorFunction(function $__10() {
      var $__11,
          $__12;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              $__11 = this.map_.entries()[Symbol.iterator]();
              $ctx.sent = void 0;
              $ctx.action = 'next';
              $ctx.state = 12;
              break;
            case 12:
              $__12 = $__11[$ctx.action]($ctx.sentIgnoreThrow);
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = ($__12.done) ? 3 : 2;
              break;
            case 3:
              $ctx.sent = $__12.value;
              $ctx.state = -2;
              break;
            case 2:
              $ctx.state = 12;
              return $__12.value;
            default:
              return $ctx.end();
          }
      }, $__10, this);
    })
  }, {});
  Object.defineProperty(Set.prototype, Symbol.iterator, {
    configurable: true,
    writable: true,
    value: Set.prototype.values
  });
  Object.defineProperty(Set.prototype, 'keys', {
    configurable: true,
    writable: true,
    value: Set.prototype.values
  });
  function polyfillSet(global) {
    var $__6 = global,
        Object = $__6.Object,
        Symbol = $__6.Symbol;
    if (!global.Set)
      global.Set = Set;
    var setPrototype = global.Set.prototype;
    if (setPrototype.values) {
      maybeAddIterator(setPrototype, setPrototype.values, Symbol);
      maybeAddIterator(Object.getPrototypeOf(new global.Set().values()), function() {
        return this;
      }, Symbol);
    }
  }
  registerPolyfill(polyfillSet);
  return {
    get Set() {
      return Set;
    },
    get polyfillSet() {
      return polyfillSet;
    }
  };
});
System.get("traceur-runtime@0.0.79/src/runtime/polyfills/Set.js" + '');
System.registerModule("traceur-runtime@0.0.79/node_modules/rsvp/lib/rsvp/asap.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/node_modules/rsvp/lib/rsvp/asap.js";
  var len = 0;
  function asap(callback, arg) {
    queue[len] = callback;
    queue[len + 1] = arg;
    len += 2;
    if (len === 2) {
      scheduleFlush();
    }
  }
  var $__default = asap;
  var browserGlobal = (typeof window !== 'undefined') ? window : {};
  var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
  var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';
  function useNextTick() {
    return function() {
      process.nextTick(flush);
    };
  }
  function useMutationObserver() {
    var iterations = 0;
    var observer = new BrowserMutationObserver(flush);
    var node = document.createTextNode('');
    observer.observe(node, {characterData: true});
    return function() {
      node.data = (iterations = ++iterations % 2);
    };
  }
  function useMessageChannel() {
    var channel = new MessageChannel();
    channel.port1.onmessage = flush;
    return function() {
      channel.port2.postMessage(0);
    };
  }
  function useSetTimeout() {
    return function() {
      setTimeout(flush, 1);
    };
  }
  var queue = new Array(1000);
  function flush() {
    for (var i = 0; i < len; i += 2) {
      var callback = queue[i];
      var arg = queue[i + 1];
      callback(arg);
      queue[i] = undefined;
      queue[i + 1] = undefined;
    }
    len = 0;
  }
  var scheduleFlush;
  if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
    scheduleFlush = useNextTick();
  } else if (BrowserMutationObserver) {
    scheduleFlush = useMutationObserver();
  } else if (isWorker) {
    scheduleFlush = useMessageChannel();
  } else {
    scheduleFlush = useSetTimeout();
  }
  return {get default() {
      return $__default;
    }};
});
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/Promise.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/Promise.js";
  var async = System.get("traceur-runtime@0.0.79/node_modules/rsvp/lib/rsvp/asap.js").default;
  var registerPolyfill = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js").registerPolyfill;
  var promiseRaw = {};
  function isPromise(x) {
    return x && typeof x === 'object' && x.status_ !== undefined;
  }
  function idResolveHandler(x) {
    return x;
  }
  function idRejectHandler(x) {
    throw x;
  }
  function chain(promise) {
    var onResolve = arguments[1] !== (void 0) ? arguments[1] : idResolveHandler;
    var onReject = arguments[2] !== (void 0) ? arguments[2] : idRejectHandler;
    var deferred = getDeferred(promise.constructor);
    switch (promise.status_) {
      case undefined:
        throw TypeError;
      case 0:
        promise.onResolve_.push(onResolve, deferred);
        promise.onReject_.push(onReject, deferred);
        break;
      case +1:
        promiseEnqueue(promise.value_, [onResolve, deferred]);
        break;
      case -1:
        promiseEnqueue(promise.value_, [onReject, deferred]);
        break;
    }
    return deferred.promise;
  }
  function getDeferred(C) {
    if (this === $Promise) {
      var promise = promiseInit(new $Promise(promiseRaw));
      return {
        promise: promise,
        resolve: (function(x) {
          promiseResolve(promise, x);
        }),
        reject: (function(r) {
          promiseReject(promise, r);
        })
      };
    } else {
      var result = {};
      result.promise = new C((function(resolve, reject) {
        result.resolve = resolve;
        result.reject = reject;
      }));
      return result;
    }
  }
  function promiseSet(promise, status, value, onResolve, onReject) {
    promise.status_ = status;
    promise.value_ = value;
    promise.onResolve_ = onResolve;
    promise.onReject_ = onReject;
    return promise;
  }
  function promiseInit(promise) {
    return promiseSet(promise, 0, undefined, [], []);
  }
  var Promise = function Promise(resolver) {
    if (resolver === promiseRaw)
      return;
    if (typeof resolver !== 'function')
      throw new TypeError;
    var promise = promiseInit(this);
    try {
      resolver((function(x) {
        promiseResolve(promise, x);
      }), (function(r) {
        promiseReject(promise, r);
      }));
    } catch (e) {
      promiseReject(promise, e);
    }
  };
  ($traceurRuntime.createClass)(Promise, {
    catch: function(onReject) {
      return this.then(undefined, onReject);
    },
    then: function(onResolve, onReject) {
      if (typeof onResolve !== 'function')
        onResolve = idResolveHandler;
      if (typeof onReject !== 'function')
        onReject = idRejectHandler;
      var that = this;
      var constructor = this.constructor;
      return chain(this, function(x) {
        x = promiseCoerce(constructor, x);
        return x === that ? onReject(new TypeError) : isPromise(x) ? x.then(onResolve, onReject) : onResolve(x);
      }, onReject);
    }
  }, {
    resolve: function(x) {
      if (this === $Promise) {
        if (isPromise(x)) {
          return x;
        }
        return promiseSet(new $Promise(promiseRaw), +1, x);
      } else {
        return new this(function(resolve, reject) {
          resolve(x);
        });
      }
    },
    reject: function(r) {
      if (this === $Promise) {
        return promiseSet(new $Promise(promiseRaw), -1, r);
      } else {
        return new this((function(resolve, reject) {
          reject(r);
        }));
      }
    },
    all: function(values) {
      var deferred = getDeferred(this);
      var resolutions = [];
      try {
        var count = values.length;
        if (count === 0) {
          deferred.resolve(resolutions);
        } else {
          for (var i = 0; i < values.length; i++) {
            this.resolve(values[i]).then(function(i, x) {
              resolutions[i] = x;
              if (--count === 0)
                deferred.resolve(resolutions);
            }.bind(undefined, i), (function(r) {
              deferred.reject(r);
            }));
          }
        }
      } catch (e) {
        deferred.reject(e);
      }
      return deferred.promise;
    },
    race: function(values) {
      var deferred = getDeferred(this);
      try {
        for (var i = 0; i < values.length; i++) {
          this.resolve(values[i]).then((function(x) {
            deferred.resolve(x);
          }), (function(r) {
            deferred.reject(r);
          }));
        }
      } catch (e) {
        deferred.reject(e);
      }
      return deferred.promise;
    }
  });
  var $Promise = Promise;
  var $PromiseReject = $Promise.reject;
  function promiseResolve(promise, x) {
    promiseDone(promise, +1, x, promise.onResolve_);
  }
  function promiseReject(promise, r) {
    promiseDone(promise, -1, r, promise.onReject_);
  }
  function promiseDone(promise, status, value, reactions) {
    if (promise.status_ !== 0)
      return;
    promiseEnqueue(value, reactions);
    promiseSet(promise, status, value);
  }
  function promiseEnqueue(value, tasks) {
    async((function() {
      for (var i = 0; i < tasks.length; i += 2) {
        promiseHandle(value, tasks[i], tasks[i + 1]);
      }
    }));
  }
  function promiseHandle(value, handler, deferred) {
    try {
      var result = handler(value);
      if (result === deferred.promise)
        throw new TypeError;
      else if (isPromise(result))
        chain(result, deferred.resolve, deferred.reject);
      else
        deferred.resolve(result);
    } catch (e) {
      try {
        deferred.reject(e);
      } catch (e) {}
    }
  }
  var thenableSymbol = '@@thenable';
  function isObject(x) {
    return x && (typeof x === 'object' || typeof x === 'function');
  }
  function promiseCoerce(constructor, x) {
    if (!isPromise(x) && isObject(x)) {
      var then;
      try {
        then = x.then;
      } catch (r) {
        var promise = $PromiseReject.call(constructor, r);
        x[thenableSymbol] = promise;
        return promise;
      }
      if (typeof then === 'function') {
        var p = x[thenableSymbol];
        if (p) {
          return p;
        } else {
          var deferred = getDeferred(constructor);
          x[thenableSymbol] = deferred.promise;
          try {
            then.call(x, deferred.resolve, deferred.reject);
          } catch (r) {
            deferred.reject(r);
          }
          return deferred.promise;
        }
      }
    }
    return x;
  }
  function polyfillPromise(global) {
    if (!global.Promise)
      global.Promise = Promise;
  }
  registerPolyfill(polyfillPromise);
  return {
    get Promise() {
      return Promise;
    },
    get polyfillPromise() {
      return polyfillPromise;
    }
  };
});
System.get("traceur-runtime@0.0.79/src/runtime/polyfills/Promise.js" + '');
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/StringIterator.js", [], function() {
  "use strict";
  var $__2;
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/StringIterator.js";
  var $__0 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js"),
      createIteratorResultObject = $__0.createIteratorResultObject,
      isObject = $__0.isObject;
  var toProperty = $traceurRuntime.toProperty;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var iteratedString = Symbol('iteratedString');
  var stringIteratorNextIndex = Symbol('stringIteratorNextIndex');
  var StringIterator = function StringIterator() {};
  ($traceurRuntime.createClass)(StringIterator, ($__2 = {}, Object.defineProperty($__2, "next", {
    value: function() {
      var o = this;
      if (!isObject(o) || !hasOwnProperty.call(o, iteratedString)) {
        throw new TypeError('this must be a StringIterator object');
      }
      var s = o[toProperty(iteratedString)];
      if (s === undefined) {
        return createIteratorResultObject(undefined, true);
      }
      var position = o[toProperty(stringIteratorNextIndex)];
      var len = s.length;
      if (position >= len) {
        o[toProperty(iteratedString)] = undefined;
        return createIteratorResultObject(undefined, true);
      }
      var first = s.charCodeAt(position);
      var resultString;
      if (first < 0xD800 || first > 0xDBFF || position + 1 === len) {
        resultString = String.fromCharCode(first);
      } else {
        var second = s.charCodeAt(position + 1);
        if (second < 0xDC00 || second > 0xDFFF) {
          resultString = String.fromCharCode(first);
        } else {
          resultString = String.fromCharCode(first) + String.fromCharCode(second);
        }
      }
      o[toProperty(stringIteratorNextIndex)] = position + resultString.length;
      return createIteratorResultObject(resultString, false);
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), Object.defineProperty($__2, Symbol.iterator, {
    value: function() {
      return this;
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), $__2), {});
  function createStringIterator(string) {
    var s = String(string);
    var iterator = Object.create(StringIterator.prototype);
    iterator[toProperty(iteratedString)] = s;
    iterator[toProperty(stringIteratorNextIndex)] = 0;
    return iterator;
  }
  return {get createStringIterator() {
      return createStringIterator;
    }};
});
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/String.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/String.js";
  var createStringIterator = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/StringIterator.js").createStringIterator;
  var $__1 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js"),
      maybeAddFunctions = $__1.maybeAddFunctions,
      maybeAddIterator = $__1.maybeAddIterator,
      registerPolyfill = $__1.registerPolyfill;
  var $toString = Object.prototype.toString;
  var $indexOf = String.prototype.indexOf;
  var $lastIndexOf = String.prototype.lastIndexOf;
  function startsWith(search) {
    var string = String(this);
    if (this == null || $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var position = arguments.length > 1 ? arguments[1] : undefined;
    var pos = position ? Number(position) : 0;
    if (isNaN(pos)) {
      pos = 0;
    }
    var start = Math.min(Math.max(pos, 0), stringLength);
    return $indexOf.call(string, searchString, pos) == start;
  }
  function endsWith(search) {
    var string = String(this);
    if (this == null || $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var pos = stringLength;
    if (arguments.length > 1) {
      var position = arguments[1];
      if (position !== undefined) {
        pos = position ? Number(position) : 0;
        if (isNaN(pos)) {
          pos = 0;
        }
      }
    }
    var end = Math.min(Math.max(pos, 0), stringLength);
    var start = end - searchLength;
    if (start < 0) {
      return false;
    }
    return $lastIndexOf.call(string, searchString, start) == start;
  }
  function includes(search) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    if (search && $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var position = arguments.length > 1 ? arguments[1] : undefined;
    var pos = position ? Number(position) : 0;
    if (pos != pos) {
      pos = 0;
    }
    var start = Math.min(Math.max(pos, 0), stringLength);
    if (searchLength + start > stringLength) {
      return false;
    }
    return $indexOf.call(string, searchString, pos) != -1;
  }
  function repeat(count) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var n = count ? Number(count) : 0;
    if (isNaN(n)) {
      n = 0;
    }
    if (n < 0 || n == Infinity) {
      throw RangeError();
    }
    if (n == 0) {
      return '';
    }
    var result = '';
    while (n--) {
      result += string;
    }
    return result;
  }
  function codePointAt(position) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var size = string.length;
    var index = position ? Number(position) : 0;
    if (isNaN(index)) {
      index = 0;
    }
    if (index < 0 || index >= size) {
      return undefined;
    }
    var first = string.charCodeAt(index);
    var second;
    if (first >= 0xD800 && first <= 0xDBFF && size > index + 1) {
      second = string.charCodeAt(index + 1);
      if (second >= 0xDC00 && second <= 0xDFFF) {
        return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
      }
    }
    return first;
  }
  function raw(callsite) {
    var raw = callsite.raw;
    var len = raw.length >>> 0;
    if (len === 0)
      return '';
    var s = '';
    var i = 0;
    while (true) {
      s += raw[i];
      if (i + 1 === len)
        return s;
      s += arguments[++i];
    }
  }
  function fromCodePoint() {
    var codeUnits = [];
    var floor = Math.floor;
    var highSurrogate;
    var lowSurrogate;
    var index = -1;
    var length = arguments.length;
    if (!length) {
      return '';
    }
    while (++index < length) {
      var codePoint = Number(arguments[index]);
      if (!isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF || floor(codePoint) != codePoint) {
        throw RangeError('Invalid code point: ' + codePoint);
      }
      if (codePoint <= 0xFFFF) {
        codeUnits.push(codePoint);
      } else {
        codePoint -= 0x10000;
        highSurrogate = (codePoint >> 10) + 0xD800;
        lowSurrogate = (codePoint % 0x400) + 0xDC00;
        codeUnits.push(highSurrogate, lowSurrogate);
      }
    }
    return String.fromCharCode.apply(null, codeUnits);
  }
  function stringPrototypeIterator() {
    var o = $traceurRuntime.checkObjectCoercible(this);
    var s = String(o);
    return createStringIterator(s);
  }
  function polyfillString(global) {
    var String = global.String;
    maybeAddFunctions(String.prototype, ['codePointAt', codePointAt, 'endsWith', endsWith, 'includes', includes, 'repeat', repeat, 'startsWith', startsWith]);
    maybeAddFunctions(String, ['fromCodePoint', fromCodePoint, 'raw', raw]);
    maybeAddIterator(String.prototype, stringPrototypeIterator, Symbol);
  }
  registerPolyfill(polyfillString);
  return {
    get startsWith() {
      return startsWith;
    },
    get endsWith() {
      return endsWith;
    },
    get includes() {
      return includes;
    },
    get repeat() {
      return repeat;
    },
    get codePointAt() {
      return codePointAt;
    },
    get raw() {
      return raw;
    },
    get fromCodePoint() {
      return fromCodePoint;
    },
    get stringPrototypeIterator() {
      return stringPrototypeIterator;
    },
    get polyfillString() {
      return polyfillString;
    }
  };
});
System.get("traceur-runtime@0.0.79/src/runtime/polyfills/String.js" + '');
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/ArrayIterator.js", [], function() {
  "use strict";
  var $__2;
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/ArrayIterator.js";
  var $__0 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js"),
      toObject = $__0.toObject,
      toUint32 = $__0.toUint32,
      createIteratorResultObject = $__0.createIteratorResultObject;
  var ARRAY_ITERATOR_KIND_KEYS = 1;
  var ARRAY_ITERATOR_KIND_VALUES = 2;
  var ARRAY_ITERATOR_KIND_ENTRIES = 3;
  var ArrayIterator = function ArrayIterator() {};
  ($traceurRuntime.createClass)(ArrayIterator, ($__2 = {}, Object.defineProperty($__2, "next", {
    value: function() {
      var iterator = toObject(this);
      var array = iterator.iteratorObject_;
      if (!array) {
        throw new TypeError('Object is not an ArrayIterator');
      }
      var index = iterator.arrayIteratorNextIndex_;
      var itemKind = iterator.arrayIterationKind_;
      var length = toUint32(array.length);
      if (index >= length) {
        iterator.arrayIteratorNextIndex_ = Infinity;
        return createIteratorResultObject(undefined, true);
      }
      iterator.arrayIteratorNextIndex_ = index + 1;
      if (itemKind == ARRAY_ITERATOR_KIND_VALUES)
        return createIteratorResultObject(array[index], false);
      if (itemKind == ARRAY_ITERATOR_KIND_ENTRIES)
        return createIteratorResultObject([index, array[index]], false);
      return createIteratorResultObject(index, false);
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), Object.defineProperty($__2, Symbol.iterator, {
    value: function() {
      return this;
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), $__2), {});
  function createArrayIterator(array, kind) {
    var object = toObject(array);
    var iterator = new ArrayIterator;
    iterator.iteratorObject_ = object;
    iterator.arrayIteratorNextIndex_ = 0;
    iterator.arrayIterationKind_ = kind;
    return iterator;
  }
  function entries() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_ENTRIES);
  }
  function keys() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_KEYS);
  }
  function values() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_VALUES);
  }
  return {
    get entries() {
      return entries;
    },
    get keys() {
      return keys;
    },
    get values() {
      return values;
    }
  };
});
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/Array.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/Array.js";
  var $__0 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/ArrayIterator.js"),
      entries = $__0.entries,
      keys = $__0.keys,
      values = $__0.values;
  var $__1 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js"),
      checkIterable = $__1.checkIterable,
      isCallable = $__1.isCallable,
      isConstructor = $__1.isConstructor,
      maybeAddFunctions = $__1.maybeAddFunctions,
      maybeAddIterator = $__1.maybeAddIterator,
      registerPolyfill = $__1.registerPolyfill,
      toInteger = $__1.toInteger,
      toLength = $__1.toLength,
      toObject = $__1.toObject;
  function from(arrLike) {
    var mapFn = arguments[1];
    var thisArg = arguments[2];
    var C = this;
    var items = toObject(arrLike);
    var mapping = mapFn !== undefined;
    var k = 0;
    var arr,
        len;
    if (mapping && !isCallable(mapFn)) {
      throw TypeError();
    }
    if (checkIterable(items)) {
      arr = isConstructor(C) ? new C() : [];
      for (var $__2 = items[$traceurRuntime.toProperty(Symbol.iterator)](),
          $__3; !($__3 = $__2.next()).done; ) {
        var item = $__3.value;
        {
          if (mapping) {
            arr[k] = mapFn.call(thisArg, item, k);
          } else {
            arr[k] = item;
          }
          k++;
        }
      }
      arr.length = k;
      return arr;
    }
    len = toLength(items.length);
    arr = isConstructor(C) ? new C(len) : new Array(len);
    for (; k < len; k++) {
      if (mapping) {
        arr[k] = typeof thisArg === 'undefined' ? mapFn(items[k], k) : mapFn.call(thisArg, items[k], k);
      } else {
        arr[k] = items[k];
      }
    }
    arr.length = len;
    return arr;
  }
  function of() {
    for (var items = [],
        $__4 = 0; $__4 < arguments.length; $__4++)
      items[$__4] = arguments[$__4];
    var C = this;
    var len = items.length;
    var arr = isConstructor(C) ? new C(len) : new Array(len);
    for (var k = 0; k < len; k++) {
      arr[k] = items[k];
    }
    arr.length = len;
    return arr;
  }
  function fill(value) {
    var start = arguments[1] !== (void 0) ? arguments[1] : 0;
    var end = arguments[2];
    var object = toObject(this);
    var len = toLength(object.length);
    var fillStart = toInteger(start);
    var fillEnd = end !== undefined ? toInteger(end) : len;
    fillStart = fillStart < 0 ? Math.max(len + fillStart, 0) : Math.min(fillStart, len);
    fillEnd = fillEnd < 0 ? Math.max(len + fillEnd, 0) : Math.min(fillEnd, len);
    while (fillStart < fillEnd) {
      object[fillStart] = value;
      fillStart++;
    }
    return object;
  }
  function find(predicate) {
    var thisArg = arguments[1];
    return findHelper(this, predicate, thisArg);
  }
  function findIndex(predicate) {
    var thisArg = arguments[1];
    return findHelper(this, predicate, thisArg, true);
  }
  function findHelper(self, predicate) {
    var thisArg = arguments[2];
    var returnIndex = arguments[3] !== (void 0) ? arguments[3] : false;
    var object = toObject(self);
    var len = toLength(object.length);
    if (!isCallable(predicate)) {
      throw TypeError();
    }
    for (var i = 0; i < len; i++) {
      var value = object[i];
      if (predicate.call(thisArg, value, i, object)) {
        return returnIndex ? i : value;
      }
    }
    return returnIndex ? -1 : undefined;
  }
  function polyfillArray(global) {
    var $__5 = global,
        Array = $__5.Array,
        Object = $__5.Object,
        Symbol = $__5.Symbol;
    maybeAddFunctions(Array.prototype, ['entries', entries, 'keys', keys, 'values', values, 'fill', fill, 'find', find, 'findIndex', findIndex]);
    maybeAddFunctions(Array, ['from', from, 'of', of]);
    maybeAddIterator(Array.prototype, values, Symbol);
    maybeAddIterator(Object.getPrototypeOf([].values()), function() {
      return this;
    }, Symbol);
  }
  registerPolyfill(polyfillArray);
  return {
    get from() {
      return from;
    },
    get of() {
      return of;
    },
    get fill() {
      return fill;
    },
    get find() {
      return find;
    },
    get findIndex() {
      return findIndex;
    },
    get polyfillArray() {
      return polyfillArray;
    }
  };
});
System.get("traceur-runtime@0.0.79/src/runtime/polyfills/Array.js" + '');
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/Object.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/Object.js";
  var $__0 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js"),
      maybeAddFunctions = $__0.maybeAddFunctions,
      registerPolyfill = $__0.registerPolyfill;
  var $__1 = $traceurRuntime,
      defineProperty = $__1.defineProperty,
      getOwnPropertyDescriptor = $__1.getOwnPropertyDescriptor,
      getOwnPropertyNames = $__1.getOwnPropertyNames,
      isPrivateName = $__1.isPrivateName,
      keys = $__1.keys;
  function is(left, right) {
    if (left === right)
      return left !== 0 || 1 / left === 1 / right;
    return left !== left && right !== right;
  }
  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      var props = source == null ? [] : keys(source);
      var p,
          length = props.length;
      for (p = 0; p < length; p++) {
        var name = props[p];
        if (isPrivateName(name))
          continue;
        target[name] = source[name];
      }
    }
    return target;
  }
  function mixin(target, source) {
    var props = getOwnPropertyNames(source);
    var p,
        descriptor,
        length = props.length;
    for (p = 0; p < length; p++) {
      var name = props[p];
      if (isPrivateName(name))
        continue;
      descriptor = getOwnPropertyDescriptor(source, props[p]);
      defineProperty(target, props[p], descriptor);
    }
    return target;
  }
  function polyfillObject(global) {
    var Object = global.Object;
    maybeAddFunctions(Object, ['assign', assign, 'is', is, 'mixin', mixin]);
  }
  registerPolyfill(polyfillObject);
  return {
    get is() {
      return is;
    },
    get assign() {
      return assign;
    },
    get mixin() {
      return mixin;
    },
    get polyfillObject() {
      return polyfillObject;
    }
  };
});
System.get("traceur-runtime@0.0.79/src/runtime/polyfills/Object.js" + '');
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/Number.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/Number.js";
  var $__0 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js"),
      isNumber = $__0.isNumber,
      maybeAddConsts = $__0.maybeAddConsts,
      maybeAddFunctions = $__0.maybeAddFunctions,
      registerPolyfill = $__0.registerPolyfill,
      toInteger = $__0.toInteger;
  var $abs = Math.abs;
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;
  var MIN_SAFE_INTEGER = -Math.pow(2, 53) + 1;
  var EPSILON = Math.pow(2, -52);
  function NumberIsFinite(number) {
    return isNumber(number) && $isFinite(number);
  }
  ;
  function isInteger(number) {
    return NumberIsFinite(number) && toInteger(number) === number;
  }
  function NumberIsNaN(number) {
    return isNumber(number) && $isNaN(number);
  }
  ;
  function isSafeInteger(number) {
    if (NumberIsFinite(number)) {
      var integral = toInteger(number);
      if (integral === number)
        return $abs(integral) <= MAX_SAFE_INTEGER;
    }
    return false;
  }
  function polyfillNumber(global) {
    var Number = global.Number;
    maybeAddConsts(Number, ['MAX_SAFE_INTEGER', MAX_SAFE_INTEGER, 'MIN_SAFE_INTEGER', MIN_SAFE_INTEGER, 'EPSILON', EPSILON]);
    maybeAddFunctions(Number, ['isFinite', NumberIsFinite, 'isInteger', isInteger, 'isNaN', NumberIsNaN, 'isSafeInteger', isSafeInteger]);
  }
  registerPolyfill(polyfillNumber);
  return {
    get MAX_SAFE_INTEGER() {
      return MAX_SAFE_INTEGER;
    },
    get MIN_SAFE_INTEGER() {
      return MIN_SAFE_INTEGER;
    },
    get EPSILON() {
      return EPSILON;
    },
    get isFinite() {
      return NumberIsFinite;
    },
    get isInteger() {
      return isInteger;
    },
    get isNaN() {
      return NumberIsNaN;
    },
    get isSafeInteger() {
      return isSafeInteger;
    },
    get polyfillNumber() {
      return polyfillNumber;
    }
  };
});
System.get("traceur-runtime@0.0.79/src/runtime/polyfills/Number.js" + '');
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/polyfills.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/polyfills.js";
  var polyfillAll = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js").polyfillAll;
  polyfillAll(Reflect.global);
  var setupGlobals = $traceurRuntime.setupGlobals;
  $traceurRuntime.setupGlobals = function(global) {
    setupGlobals(global);
    polyfillAll(global);
  };
  return {};
});
System.get("traceur-runtime@0.0.79/src/runtime/polyfills/polyfills.js" + '');

}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"1YiZ5S":14,"path":13}],13:[function(require,module,exports){
(function (process){
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

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require("1YiZ5S"))
},{"1YiZ5S":14}],14:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],15:[function(require,module,exports){
/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/sole/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/sole/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */

// Date.now shim for (ahem) Internet Explo(d|r)er
if ( Date.now === undefined ) {

	Date.now = function () {

		return new Date().valueOf();

	};

}

var TWEEN = TWEEN || ( function () {

	var _tweens = [];

	return {

		REVISION: '14',

		getAll: function () {

			return _tweens;

		},

		removeAll: function () {

			_tweens = [];

		},

		add: function ( tween ) {

			_tweens.push( tween );

		},

		remove: function ( tween ) {

			var i = _tweens.indexOf( tween );

			if ( i !== -1 ) {

				_tweens.splice( i, 1 );

			}

		},

		update: function ( time ) {

			if ( _tweens.length === 0 ) return false;

			var i = 0;

			time = time !== undefined ? time : ( typeof window !== 'undefined' && window.performance !== undefined && window.performance.now !== undefined ? window.performance.now() : Date.now() );

			while ( i < _tweens.length ) {

				if ( _tweens[ i ].update( time ) ) {

					i++;

				} else {

					_tweens.splice( i, 1 );

				}

			}

			return true;

		}
	};

} )();

TWEEN.Tween = function ( object ) {

	var _object = object;
	var _valuesStart = {};
	var _valuesEnd = {};
	var _valuesStartRepeat = {};
	var _duration = 1000;
	var _repeat = 0;
	var _yoyo = false;
	var _isPlaying = false;
	var _reversed = false;
	var _delayTime = 0;
	var _startTime = null;
	var _easingFunction = TWEEN.Easing.Linear.None;
	var _interpolationFunction = TWEEN.Interpolation.Linear;
	var _chainedTweens = [];
	var _onStartCallback = null;
	var _onStartCallbackFired = false;
	var _onUpdateCallback = null;
	var _onCompleteCallback = null;
	var _onStopCallback = null;

	// Set all starting values present on the target object
	for ( var field in object ) {

		_valuesStart[ field ] = parseFloat(object[field], 10);

	}

	this.to = function ( properties, duration ) {

		if ( duration !== undefined ) {

			_duration = duration;

		}

		_valuesEnd = properties;

		return this;

	};

	this.start = function ( time ) {

		TWEEN.add( this );

		_isPlaying = true;

		_onStartCallbackFired = false;

		_startTime = time !== undefined ? time : ( typeof window !== 'undefined' && window.performance !== undefined && window.performance.now !== undefined ? window.performance.now() : Date.now() );
		_startTime += _delayTime;

		for ( var property in _valuesEnd ) {

			// check if an Array was provided as property value
			if ( _valuesEnd[ property ] instanceof Array ) {

				if ( _valuesEnd[ property ].length === 0 ) {

					continue;

				}

				// create a local copy of the Array with the start value at the front
				_valuesEnd[ property ] = [ _object[ property ] ].concat( _valuesEnd[ property ] );

			}

			_valuesStart[ property ] = _object[ property ];

			if( ( _valuesStart[ property ] instanceof Array ) === false ) {
				_valuesStart[ property ] *= 1.0; // Ensures we're using numbers, not strings
			}

			_valuesStartRepeat[ property ] = _valuesStart[ property ] || 0;

		}

		return this;

	};

	this.stop = function () {

		if ( !_isPlaying ) {
			return this;
		}

		TWEEN.remove( this );
		_isPlaying = false;

		if ( _onStopCallback !== null ) {

			_onStopCallback.call( _object );

		}

		this.stopChainedTweens();
		return this;

	};

	this.stopChainedTweens = function () {

		for ( var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++ ) {

			_chainedTweens[ i ].stop();

		}

	};

	this.delay = function ( amount ) {

		_delayTime = amount;
		return this;

	};

	this.repeat = function ( times ) {

		_repeat = times;
		return this;

	};

	this.yoyo = function( yoyo ) {

		_yoyo = yoyo;
		return this;

	};


	this.easing = function ( easing ) {

		_easingFunction = easing;
		return this;

	};

	this.interpolation = function ( interpolation ) {

		_interpolationFunction = interpolation;
		return this;

	};

	this.chain = function () {

		_chainedTweens = arguments;
		return this;

	};

	this.onStart = function ( callback ) {

		_onStartCallback = callback;
		return this;

	};

	this.onUpdate = function ( callback ) {

		_onUpdateCallback = callback;
		return this;

	};

	this.onComplete = function ( callback ) {

		_onCompleteCallback = callback;
		return this;

	};

	this.onStop = function ( callback ) {

		_onStopCallback = callback;
		return this;

	};

	this.update = function ( time ) {

		var property;

		if ( time < _startTime ) {

			return true;

		}

		if ( _onStartCallbackFired === false ) {

			if ( _onStartCallback !== null ) {

				_onStartCallback.call( _object );

			}

			_onStartCallbackFired = true;

		}

		var elapsed = ( time - _startTime ) / _duration;
		elapsed = elapsed > 1 ? 1 : elapsed;

		var value = _easingFunction( elapsed );

		for ( property in _valuesEnd ) {

			var start = _valuesStart[ property ] || 0;
			var end = _valuesEnd[ property ];

			if ( end instanceof Array ) {

				_object[ property ] = _interpolationFunction( end, value );

			} else {

				// Parses relative end values with start as base (e.g.: +10, -3)
				if ( typeof(end) === "string" ) {
					end = start + parseFloat(end, 10);
				}

				// protect against non numeric properties.
				if ( typeof(end) === "number" ) {
					_object[ property ] = start + ( end - start ) * value;
				}

			}

		}

		if ( _onUpdateCallback !== null ) {

			_onUpdateCallback.call( _object, value );

		}

		if ( elapsed == 1 ) {

			if ( _repeat > 0 ) {

				if( isFinite( _repeat ) ) {
					_repeat--;
				}

				// reassign starting values, restart by making startTime = now
				for( property in _valuesStartRepeat ) {

					if ( typeof( _valuesEnd[ property ] ) === "string" ) {
						_valuesStartRepeat[ property ] = _valuesStartRepeat[ property ] + parseFloat(_valuesEnd[ property ], 10);
					}

					if (_yoyo) {
						var tmp = _valuesStartRepeat[ property ];
						_valuesStartRepeat[ property ] = _valuesEnd[ property ];
						_valuesEnd[ property ] = tmp;
					}

					_valuesStart[ property ] = _valuesStartRepeat[ property ];

				}

				if (_yoyo) {
					_reversed = !_reversed;
				}

				_startTime = time + _delayTime;

				return true;

			} else {

				if ( _onCompleteCallback !== null ) {

					_onCompleteCallback.call( _object );

				}

				for ( var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++ ) {

					_chainedTweens[ i ].start( time );

				}

				return false;

			}

		}

		return true;

	};

};


TWEEN.Easing = {

	Linear: {

		None: function ( k ) {

			return k;

		}

	},

	Quadratic: {

		In: function ( k ) {

			return k * k;

		},

		Out: function ( k ) {

			return k * ( 2 - k );

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1 ) return 0.5 * k * k;
			return - 0.5 * ( --k * ( k - 2 ) - 1 );

		}

	},

	Cubic: {

		In: function ( k ) {

			return k * k * k;

		},

		Out: function ( k ) {

			return --k * k * k + 1;

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k;
			return 0.5 * ( ( k -= 2 ) * k * k + 2 );

		}

	},

	Quartic: {

		In: function ( k ) {

			return k * k * k * k;

		},

		Out: function ( k ) {

			return 1 - ( --k * k * k * k );

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1) return 0.5 * k * k * k * k;
			return - 0.5 * ( ( k -= 2 ) * k * k * k - 2 );

		}

	},

	Quintic: {

		In: function ( k ) {

			return k * k * k * k * k;

		},

		Out: function ( k ) {

			return --k * k * k * k * k + 1;

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k * k * k;
			return 0.5 * ( ( k -= 2 ) * k * k * k * k + 2 );

		}

	},

	Sinusoidal: {

		In: function ( k ) {

			return 1 - Math.cos( k * Math.PI / 2 );

		},

		Out: function ( k ) {

			return Math.sin( k * Math.PI / 2 );

		},

		InOut: function ( k ) {

			return 0.5 * ( 1 - Math.cos( Math.PI * k ) );

		}

	},

	Exponential: {

		In: function ( k ) {

			return k === 0 ? 0 : Math.pow( 1024, k - 1 );

		},

		Out: function ( k ) {

			return k === 1 ? 1 : 1 - Math.pow( 2, - 10 * k );

		},

		InOut: function ( k ) {

			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( ( k *= 2 ) < 1 ) return 0.5 * Math.pow( 1024, k - 1 );
			return 0.5 * ( - Math.pow( 2, - 10 * ( k - 1 ) ) + 2 );

		}

	},

	Circular: {

		In: function ( k ) {

			return 1 - Math.sqrt( 1 - k * k );

		},

		Out: function ( k ) {

			return Math.sqrt( 1 - ( --k * k ) );

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1) return - 0.5 * ( Math.sqrt( 1 - k * k) - 1);
			return 0.5 * ( Math.sqrt( 1 - ( k -= 2) * k) + 1);

		}

	},

	Elastic: {

		In: function ( k ) {

			var s, a = 0.1, p = 0.4;
			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( !a || a < 1 ) { a = 1; s = p / 4; }
			else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
			return - ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );

		},

		Out: function ( k ) {

			var s, a = 0.1, p = 0.4;
			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( !a || a < 1 ) { a = 1; s = p / 4; }
			else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
			return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );

		},

		InOut: function ( k ) {

			var s, a = 0.1, p = 0.4;
			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( !a || a < 1 ) { a = 1; s = p / 4; }
			else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
			if ( ( k *= 2 ) < 1 ) return - 0.5 * ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );
			return a * Math.pow( 2, -10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) * 0.5 + 1;

		}

	},

	Back: {

		In: function ( k ) {

			var s = 1.70158;
			return k * k * ( ( s + 1 ) * k - s );

		},

		Out: function ( k ) {

			var s = 1.70158;
			return --k * k * ( ( s + 1 ) * k + s ) + 1;

		},

		InOut: function ( k ) {

			var s = 1.70158 * 1.525;
			if ( ( k *= 2 ) < 1 ) return 0.5 * ( k * k * ( ( s + 1 ) * k - s ) );
			return 0.5 * ( ( k -= 2 ) * k * ( ( s + 1 ) * k + s ) + 2 );

		}

	},

	Bounce: {

		In: function ( k ) {

			return 1 - TWEEN.Easing.Bounce.Out( 1 - k );

		},

		Out: function ( k ) {

			if ( k < ( 1 / 2.75 ) ) {

				return 7.5625 * k * k;

			} else if ( k < ( 2 / 2.75 ) ) {

				return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;

			} else if ( k < ( 2.5 / 2.75 ) ) {

				return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;

			} else {

				return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;

			}

		},

		InOut: function ( k ) {

			if ( k < 0.5 ) return TWEEN.Easing.Bounce.In( k * 2 ) * 0.5;
			return TWEEN.Easing.Bounce.Out( k * 2 - 1 ) * 0.5 + 0.5;

		}

	}

};

TWEEN.Interpolation = {

	Linear: function ( v, k ) {

		var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.Linear;

		if ( k < 0 ) return fn( v[ 0 ], v[ 1 ], f );
		if ( k > 1 ) return fn( v[ m ], v[ m - 1 ], m - f );

		return fn( v[ i ], v[ i + 1 > m ? m : i + 1 ], f - i );

	},

	Bezier: function ( v, k ) {

		var b = 0, n = v.length - 1, pw = Math.pow, bn = TWEEN.Interpolation.Utils.Bernstein, i;

		for ( i = 0; i <= n; i++ ) {
			b += pw( 1 - k, n - i ) * pw( k, i ) * v[ i ] * bn( n, i );
		}

		return b;

	},

	CatmullRom: function ( v, k ) {

		var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.CatmullRom;

		if ( v[ 0 ] === v[ m ] ) {

			if ( k < 0 ) i = Math.floor( f = m * ( 1 + k ) );

			return fn( v[ ( i - 1 + m ) % m ], v[ i ], v[ ( i + 1 ) % m ], v[ ( i + 2 ) % m ], f - i );

		} else {

			if ( k < 0 ) return v[ 0 ] - ( fn( v[ 0 ], v[ 0 ], v[ 1 ], v[ 1 ], -f ) - v[ 0 ] );
			if ( k > 1 ) return v[ m ] - ( fn( v[ m ], v[ m ], v[ m - 1 ], v[ m - 1 ], f - m ) - v[ m ] );

			return fn( v[ i ? i - 1 : 0 ], v[ i ], v[ m < i + 1 ? m : i + 1 ], v[ m < i + 2 ? m : i + 2 ], f - i );

		}

	},

	Utils: {

		Linear: function ( p0, p1, t ) {

			return ( p1 - p0 ) * t + p0;

		},

		Bernstein: function ( n , i ) {

			var fc = TWEEN.Interpolation.Utils.Factorial;
			return fc( n ) / fc( i ) / fc( n - i );

		},

		Factorial: ( function () {

			var a = [ 1 ];

			return function ( n ) {

				var s = 1, i;
				if ( a[ n ] ) return a[ n ];
				for ( i = n; i > 1; i-- ) s *= i;
				return a[ n ] = s;

			};

		} )(),

		CatmullRom: function ( p0, p1, p2, p3, t ) {

			var v0 = ( p2 - p0 ) * 0.5, v1 = ( p3 - p1 ) * 0.5, t2 = t * t, t3 = t * t2;
			return ( 2 * p1 - 2 * p2 + v0 + v1 ) * t3 + ( - 3 * p1 + 3 * p2 - 2 * v0 - v1 ) * t2 + v0 * t + p1;

		}

	}

};

module.exports=TWEEN;
},{}],16:[function(require,module,exports){
var utils = require('./utils')

function Batcher () {
    this.reset()
}

var BatcherProto = Batcher.prototype

BatcherProto.push = function (job) {
    if (!job.id || !this.has[job.id]) {
        this.queue.push(job)
        this.has[job.id] = job
        if (!this.waiting) {
            this.waiting = true
            utils.nextTick(utils.bind(this.flush, this))
        }
    } else if (job.override) {
        var oldJob = this.has[job.id]
        oldJob.cancelled = true
        this.queue.push(job)
        this.has[job.id] = job
    }
}

BatcherProto.flush = function () {
    // before flush hook
    if (this._preFlush) this._preFlush()
    // do not cache length because more jobs might be pushed
    // as we execute existing jobs
    for (var i = 0; i < this.queue.length; i++) {
        var job = this.queue[i]
        if (!job.cancelled) {
            job.execute()
        }
    }
    this.reset()
}

BatcherProto.reset = function () {
    this.has = utils.hash()
    this.queue = []
    this.waiting = false
}

module.exports = Batcher
},{"./utils":41}],17:[function(require,module,exports){
var Batcher        = require('./batcher'),
    bindingBatcher = new Batcher(),
    bindingId      = 1

/**
 *  Binding class.
 *
 *  each property on the viewmodel has one corresponding Binding object
 *  which has multiple directive instances on the DOM
 *  and multiple computed property dependents
 */
function Binding (compiler, key, isExp, isFn) {
    this.id = bindingId++
    this.value = undefined
    this.isExp = !!isExp
    this.isFn = isFn
    this.root = !this.isExp && key.indexOf('.') === -1
    this.compiler = compiler
    this.key = key
    this.dirs = []
    this.subs = []
    this.deps = []
    this.unbound = false
}

var BindingProto = Binding.prototype

/**
 *  Update value and queue instance updates.
 */
BindingProto.update = function (value) {
    if (!this.isComputed || this.isFn) {
        this.value = value
    }
    if (this.dirs.length || this.subs.length) {
        var self = this
        bindingBatcher.push({
            id: this.id,
            execute: function () {
                if (!self.unbound) {
                    self._update()
                }
            }
        })
    }
}

/**
 *  Actually update the directives.
 */
BindingProto._update = function () {
    var i = this.dirs.length,
        value = this.val()
    while (i--) {
        this.dirs[i].$update(value)
    }
    this.pub()
}

/**
 *  Return the valuated value regardless
 *  of whether it is computed or not
 */
BindingProto.val = function () {
    return this.isComputed && !this.isFn
        ? this.value.$get()
        : this.value
}

/**
 *  Notify computed properties that depend on this binding
 *  to update themselves
 */
BindingProto.pub = function () {
    var i = this.subs.length
    while (i--) {
        this.subs[i].update()
    }
}

/**
 *  Unbind the binding, remove itself from all of its dependencies
 */
BindingProto.unbind = function () {
    // Indicate this has been unbound.
    // It's possible this binding will be in
    // the batcher's flush queue when its owner
    // compiler has already been destroyed.
    this.unbound = true
    var i = this.dirs.length
    while (i--) {
        this.dirs[i].$unbind()
    }
    i = this.deps.length
    var subs
    while (i--) {
        subs = this.deps[i].subs
        var j = subs.indexOf(this)
        if (j > -1) subs.splice(j, 1)
    }
}

module.exports = Binding
},{"./batcher":16}],18:[function(require,module,exports){
var Emitter     = require('./emitter'),
    Observer    = require('./observer'),
    config      = require('./config'),
    utils       = require('./utils'),
    Binding     = require('./binding'),
    Directive   = require('./directive'),
    TextParser  = require('./text-parser'),
    DepsParser  = require('./deps-parser'),
    ExpParser   = require('./exp-parser'),
    ViewModel,
    
    // cache methods
    slice       = [].slice,
    extend      = utils.extend,
    hasOwn      = ({}).hasOwnProperty,
    def         = Object.defineProperty,

    // hooks to register
    hooks = [
        'created', 'ready',
        'beforeDestroy', 'afterDestroy',
        'attached', 'detached'
    ],

    // list of priority directives
    // that needs to be checked in specific order
    priorityDirectives = [
        'if',
        'repeat',
        'view',
        'component'
    ]

/**
 *  The DOM compiler
 *  scans a DOM node and compile bindings for a ViewModel
 */
function Compiler (vm, options) {

    var compiler = this,
        key, i

    // default state
    compiler.init       = true
    compiler.destroyed  = false

    // process and extend options
    options = compiler.options = options || {}
    utils.processOptions(options)

    // copy compiler options
    extend(compiler, options.compilerOptions)
    // repeat indicates this is a v-repeat instance
    compiler.repeat   = compiler.repeat || false
    // expCache will be shared between v-repeat instances
    compiler.expCache = compiler.expCache || {}

    // initialize element
    var el = compiler.el = compiler.setupElement(options)
    utils.log('\nnew VM instance: ' + el.tagName + '\n')

    // set other compiler properties
    compiler.vm       = el.vue_vm = vm
    compiler.bindings = utils.hash()
    compiler.dirs     = []
    compiler.deferred = []
    compiler.computed = []
    compiler.children = []
    compiler.emitter  = new Emitter(vm)

    // VM ---------------------------------------------------------------------

    // set VM properties
    vm.$         = {}
    vm.$el       = el
    vm.$options  = options
    vm.$compiler = compiler
    vm.$event    = null

    // set parent & root
    var parentVM = options.parent
    if (parentVM) {
        compiler.parent = parentVM.$compiler
        parentVM.$compiler.children.push(compiler)
        vm.$parent = parentVM
        // inherit lazy option
        if (!('lazy' in options)) {
            options.lazy = compiler.parent.options.lazy
        }
    }
    vm.$root = getRoot(compiler).vm

    // DATA -------------------------------------------------------------------

    // setup observer
    // this is necesarry for all hooks and data observation events
    compiler.setupObserver()

    // create bindings for computed properties
    if (options.methods) {
        for (key in options.methods) {
            compiler.createBinding(key)
        }
    }

    // create bindings for methods
    if (options.computed) {
        for (key in options.computed) {
            compiler.createBinding(key)
        }
    }

    // initialize data
    var data = compiler.data = options.data || {},
        defaultData = options.defaultData
    if (defaultData) {
        for (key in defaultData) {
            if (!hasOwn.call(data, key)) {
                data[key] = defaultData[key]
            }
        }
    }

    // copy paramAttributes
    var params = options.paramAttributes
    if (params) {
        i = params.length
        while (i--) {
            data[params[i]] = utils.checkNumber(
                compiler.eval(
                    el.getAttribute(params[i])
                )
            )
        }
    }

    // copy data properties to vm
    // so user can access them in the created hook
    extend(vm, data)
    vm.$data = data

    // beforeCompile hook
    compiler.execHook('created')

    // the user might have swapped the data ...
    data = compiler.data = vm.$data

    // user might also set some properties on the vm
    // in which case we should copy back to $data
    var vmProp
    for (key in vm) {
        vmProp = vm[key]
        if (
            key.charAt(0) !== '$' &&
            data[key] !== vmProp &&
            typeof vmProp !== 'function'
        ) {
            data[key] = vmProp
        }
    }

    // now we can observe the data.
    // this will convert data properties to getter/setters
    // and emit the first batch of set events, which will
    // in turn create the corresponding bindings.
    compiler.observeData(data)

    // COMPILE ----------------------------------------------------------------

    // before compiling, resolve content insertion points
    if (options.template) {
        this.resolveContent()
    }

    // now parse the DOM and bind directives.
    // During this stage, we will also create bindings for
    // encountered keypaths that don't have a binding yet.
    compiler.compile(el, true)

    // Any directive that creates child VMs are deferred
    // so that when they are compiled, all bindings on the
    // parent VM have been created.
    i = compiler.deferred.length
    while (i--) {
        compiler.bindDirective(compiler.deferred[i])
    }
    compiler.deferred = null

    // extract dependencies for computed properties.
    // this will evaluated all collected computed bindings
    // and collect get events that are emitted.
    if (this.computed.length) {
        DepsParser.parse(this.computed)
    }

    // done!
    compiler.init = false

    // post compile / ready hook
    compiler.execHook('ready')
}

var CompilerProto = Compiler.prototype

/**
 *  Initialize the VM/Compiler's element.
 *  Fill it in with the template if necessary.
 */
CompilerProto.setupElement = function (options) {
    // create the node first
    var el = typeof options.el === 'string'
        ? document.querySelector(options.el)
        : options.el || document.createElement(options.tagName || 'div')

    var template = options.template,
        child, replacer, i, attr, attrs

    if (template) {
        // collect anything already in there
        if (el.hasChildNodes()) {
            this.rawContent = document.createElement('div')
            /* jshint boss: true */
            while (child = el.firstChild) {
                this.rawContent.appendChild(child)
            }
        }
        // replace option: use the first node in
        // the template directly
        if (options.replace && template.firstChild === template.lastChild) {
            replacer = template.firstChild.cloneNode(true)
            if (el.parentNode) {
                el.parentNode.insertBefore(replacer, el)
                el.parentNode.removeChild(el)
            }
            // copy over attributes
            if (el.hasAttributes()) {
                i = el.attributes.length
                while (i--) {
                    attr = el.attributes[i]
                    replacer.setAttribute(attr.name, attr.value)
                }
            }
            // replace
            el = replacer
        } else {
            el.appendChild(template.cloneNode(true))
        }

    }

    // apply element options
    if (options.id) el.id = options.id
    if (options.className) el.className = options.className
    attrs = options.attributes
    if (attrs) {
        for (attr in attrs) {
            el.setAttribute(attr, attrs[attr])
        }
    }

    return el
}

/**
 *  Deal with <content> insertion points
 *  per the Web Components spec
 */
CompilerProto.resolveContent = function () {

    var outlets = slice.call(this.el.getElementsByTagName('content')),
        raw = this.rawContent,
        outlet, select, i, j, main

    i = outlets.length
    if (i) {
        // first pass, collect corresponding content
        // for each outlet.
        while (i--) {
            outlet = outlets[i]
            if (raw) {
                select = outlet.getAttribute('select')
                if (select) { // select content
                    outlet.content =
                        slice.call(raw.querySelectorAll(select))
                } else { // default content
                    main = outlet
                }
            } else { // fallback content
                outlet.content =
                    slice.call(outlet.childNodes)
            }
        }
        // second pass, actually insert the contents
        for (i = 0, j = outlets.length; i < j; i++) {
            outlet = outlets[i]
            if (outlet === main) continue
            insert(outlet, outlet.content)
        }
        // finally insert the main content
        if (raw && main) {
            insert(main, slice.call(raw.childNodes))
        }
    }

    function insert (outlet, contents) {
        var parent = outlet.parentNode,
            i = 0, j = contents.length
        for (; i < j; i++) {
            parent.insertBefore(contents[i], outlet)
        }
        parent.removeChild(outlet)
    }

    this.rawContent = null
}

/**
 *  Setup observer.
 *  The observer listens for get/set/mutate events on all VM
 *  values/objects and trigger corresponding binding updates.
 *  It also listens for lifecycle hooks.
 */
CompilerProto.setupObserver = function () {

    var compiler = this,
        bindings = compiler.bindings,
        options  = compiler.options,
        observer = compiler.observer = new Emitter(compiler.vm)

    // a hash to hold event proxies for each root level key
    // so they can be referenced and removed later
    observer.proxies = {}

    // add own listeners which trigger binding updates
    observer
        .on('get', onGet)
        .on('set', onSet)
        .on('mutate', onSet)

    // register hooks
    var i = hooks.length, j, hook, fns
    while (i--) {
        hook = hooks[i]
        fns = options[hook]
        if (Array.isArray(fns)) {
            j = fns.length
            // since hooks were merged with child at head,
            // we loop reversely.
            while (j--) {
                registerHook(hook, fns[j])
            }
        } else if (fns) {
            registerHook(hook, fns)
        }
    }

    // broadcast attached/detached hooks
    observer
        .on('hook:attached', function () {
            broadcast(1)
        })
        .on('hook:detached', function () {
            broadcast(0)
        })

    function onGet (key) {
        check(key)
        DepsParser.catcher.emit('get', bindings[key])
    }

    function onSet (key, val, mutation) {
        observer.emit('change:' + key, val, mutation)
        check(key)
        bindings[key].update(val)
    }

    function registerHook (hook, fn) {
        observer.on('hook:' + hook, function () {
            fn.call(compiler.vm)
        })
    }

    function broadcast (event) {
        var children = compiler.children
        if (children) {
            var child, i = children.length
            while (i--) {
                child = children[i]
                if (child.el.parentNode) {
                    event = 'hook:' + (event ? 'attached' : 'detached')
                    child.observer.emit(event)
                    child.emitter.emit(event)
                }
            }
        }
    }

    function check (key) {
        if (!bindings[key]) {
            compiler.createBinding(key)
        }
    }
}

CompilerProto.observeData = function (data) {

    var compiler = this,
        observer = compiler.observer

    // recursively observe nested properties
    Observer.observe(data, '', observer)

    // also create binding for top level $data
    // so it can be used in templates too
    var $dataBinding = compiler.bindings['$data'] = new Binding(compiler, '$data')
    $dataBinding.update(data)

    // allow $data to be swapped
    def(compiler.vm, '$data', {
        get: function () {
            compiler.observer.emit('get', '$data')
            return compiler.data
        },
        set: function (newData) {
            var oldData = compiler.data
            Observer.unobserve(oldData, '', observer)
            compiler.data = newData
            Observer.copyPaths(newData, oldData)
            Observer.observe(newData, '', observer)
            update()
        }
    })

    // emit $data change on all changes
    observer
        .on('set', onSet)
        .on('mutate', onSet)

    function onSet (key) {
        if (key !== '$data') update()
    }

    function update () {
        $dataBinding.update(compiler.data)
        observer.emit('change:$data', compiler.data)
    }
}

/**
 *  Compile a DOM node (recursive)
 */
CompilerProto.compile = function (node, root) {
    var nodeType = node.nodeType
    if (nodeType === 1 && node.tagName !== 'SCRIPT') { // a normal node
        this.compileElement(node, root)
    } else if (nodeType === 3 && config.interpolate) {
        this.compileTextNode(node)
    }
}

/**
 *  Check for a priority directive
 *  If it is present and valid, return true to skip the rest
 */
CompilerProto.checkPriorityDir = function (dirname, node, root) {
    var expression, directive, Ctor
    if (
        dirname === 'component' &&
        root !== true &&
        (Ctor = this.resolveComponent(node, undefined, true))
    ) {
        directive = this.parseDirective(dirname, '', node)
        directive.Ctor = Ctor
    } else {
        expression = utils.attr(node, dirname)
        directive = expression && this.parseDirective(dirname, expression, node)
    }
    if (directive) {
        if (root === true) {
            utils.warn(
                'Directive v-' + dirname + ' cannot be used on an already instantiated ' +
                'VM\'s root node. Use it from the parent\'s template instead.'
            )
            return
        }
        this.deferred.push(directive)
        return true
    }
}

/**
 *  Compile normal directives on a node
 */
CompilerProto.compileElement = function (node, root) {

    // textarea is pretty annoying
    // because its value creates childNodes which
    // we don't want to compile.
    if (node.tagName === 'TEXTAREA' && node.value) {
        node.value = this.eval(node.value)
    }

    // only compile if this element has attributes
    // or its tagName contains a hyphen (which means it could
    // potentially be a custom element)
    if (node.hasAttributes() || node.tagName.indexOf('-') > -1) {

        // skip anything with v-pre
        if (utils.attr(node, 'pre') !== null) {
            return
        }

        var i, l, j, k

        // check priority directives.
        // if any of them are present, it will take over the node with a childVM
        // so we can skip the rest
        for (i = 0, l = priorityDirectives.length; i < l; i++) {
            if (this.checkPriorityDir(priorityDirectives[i], node, root)) {
                return
            }
        }

        // check transition & animation properties
        node.vue_trans  = utils.attr(node, 'transition')
        node.vue_anim   = utils.attr(node, 'animation')
        node.vue_effect = this.eval(utils.attr(node, 'effect'))

        var prefix = config.prefix + '-',
            params = this.options.paramAttributes,
            attr, attrname, isDirective, exp, directives, directive, dirname

        // v-with has special priority among the rest
        // it needs to pull in the value from the parent before
        // computed properties are evaluated, because at this stage
        // the computed properties have not set up their dependencies yet.
        if (root) {
            var withExp = utils.attr(node, 'with')
            if (withExp) {
                directives = this.parseDirective('with', withExp, node, true)
                for (j = 0, k = directives.length; j < k; j++) {
                    this.bindDirective(directives[j], this.parent)
                }
            }
        }

        var attrs = slice.call(node.attributes)
        for (i = 0, l = attrs.length; i < l; i++) {

            attr = attrs[i]
            attrname = attr.name
            isDirective = false

            if (attrname.indexOf(prefix) === 0) {
                // a directive - split, parse and bind it.
                isDirective = true
                dirname = attrname.slice(prefix.length)
                // build with multiple: true
                directives = this.parseDirective(dirname, attr.value, node, true)
                // loop through clauses (separated by ",")
                // inside each attribute
                for (j = 0, k = directives.length; j < k; j++) {
                    this.bindDirective(directives[j])
                }
            } else if (config.interpolate) {
                // non directive attribute, check interpolation tags
                exp = TextParser.parseAttr(attr.value)
                if (exp) {
                    directive = this.parseDirective('attr', exp, node)
                    directive.arg = attrname
                    if (params && params.indexOf(attrname) > -1) {
                        // a param attribute... we should use the parent binding
                        // to avoid circular updates like size={{size}}
                        this.bindDirective(directive, this.parent)
                    } else {
                        this.bindDirective(directive)
                    }
                }
            }

            if (isDirective && dirname !== 'cloak') {
                node.removeAttribute(attrname)
            }
        }

    }

    // recursively compile childNodes
    if (node.hasChildNodes()) {
        slice.call(node.childNodes).forEach(this.compile, this)
    }
}

/**
 *  Compile a text node
 */
CompilerProto.compileTextNode = function (node) {

    var tokens = TextParser.parse(node.nodeValue)
    if (!tokens) return
    var el, token, directive

    for (var i = 0, l = tokens.length; i < l; i++) {

        token = tokens[i]
        directive = null

        if (token.key) { // a binding
            if (token.key.charAt(0) === '>') { // a partial
                el = document.createComment('ref')
                directive = this.parseDirective('partial', token.key.slice(1), el)
            } else {
                if (!token.html) { // text binding
                    el = document.createTextNode('')
                    directive = this.parseDirective('text', token.key, el)
                } else { // html binding
                    el = document.createComment(config.prefix + '-html')
                    directive = this.parseDirective('html', token.key, el)
                }
            }
        } else { // a plain string
            el = document.createTextNode(token)
        }

        // insert node
        node.parentNode.insertBefore(el, node)
        // bind directive
        this.bindDirective(directive)

    }
    node.parentNode.removeChild(node)
}

/**
 *  Parse a directive name/value pair into one or more
 *  directive instances
 */
CompilerProto.parseDirective = function (name, value, el, multiple) {
    var compiler = this,
        definition = compiler.getOption('directives', name)
    if (definition) {
        // parse into AST-like objects
        var asts = Directive.parse(value)
        return multiple
            ? asts.map(build)
            : build(asts[0])
    }
    function build (ast) {
        return new Directive(name, ast, definition, compiler, el)
    }
}

/**
 *  Add a directive instance to the correct binding & viewmodel
 */
CompilerProto.bindDirective = function (directive, bindingOwner) {

    if (!directive) return

    // keep track of it so we can unbind() later
    this.dirs.push(directive)

    // for empty or literal directives, simply call its bind()
    // and we're done.
    if (directive.isEmpty || directive.isLiteral) {
        if (directive.bind) directive.bind()
        return
    }

    // otherwise, we got more work to do...
    var binding,
        compiler = bindingOwner || this,
        key      = directive.key

    if (directive.isExp) {
        // expression bindings are always created on current compiler
        binding = compiler.createBinding(key, directive)
    } else {
        // recursively locate which compiler owns the binding
        while (compiler) {
            if (compiler.hasKey(key)) {
                break
            } else {
                compiler = compiler.parent
            }
        }
        compiler = compiler || this
        binding = compiler.bindings[key] || compiler.createBinding(key)
    }
    binding.dirs.push(directive)
    directive.binding = binding

    var value = binding.val()
    // invoke bind hook if exists
    if (directive.bind) {
        directive.bind(value)
    }
    // set initial value
    directive.$update(value, true)
}

/**
 *  Create binding and attach getter/setter for a key to the viewmodel object
 */
CompilerProto.createBinding = function (key, directive) {

    utils.log('  created binding: ' + key)

    var compiler = this,
        methods  = compiler.options.methods,
        isExp    = directive && directive.isExp,
        isFn     = (directive && directive.isFn) || (methods && methods[key]),
        bindings = compiler.bindings,
        computed = compiler.options.computed,
        binding  = new Binding(compiler, key, isExp, isFn)

    if (isExp) {
        // expression bindings are anonymous
        compiler.defineExp(key, binding, directive)
    } else if (isFn) {
        bindings[key] = binding
        compiler.defineVmProp(key, binding, methods[key])
    } else {
        bindings[key] = binding
        if (binding.root) {
            // this is a root level binding. we need to define getter/setters for it.
            if (computed && computed[key]) {
                // computed property
                compiler.defineComputed(key, binding, computed[key])
            } else if (key.charAt(0) !== '$') {
                // normal property
                compiler.defineDataProp(key, binding)
            } else {
                // properties that start with $ are meta properties
                // they should be kept on the vm but not in the data object.
                compiler.defineVmProp(key, binding, compiler.data[key])
                delete compiler.data[key]
            }
        } else if (computed && computed[utils.baseKey(key)]) {
            // nested path on computed property
            compiler.defineExp(key, binding)
        } else {
            // ensure path in data so that computed properties that
            // access the path don't throw an error and can collect
            // dependencies
            Observer.ensurePath(compiler.data, key)
            var parentKey = key.slice(0, key.lastIndexOf('.'))
            if (!bindings[parentKey]) {
                // this is a nested value binding, but the binding for its parent
                // has not been created yet. We better create that one too.
                compiler.createBinding(parentKey)
            }
        }
    }
    return binding
}

/**
 *  Define the getter/setter to proxy a root-level
 *  data property on the VM
 */
CompilerProto.defineDataProp = function (key, binding) {
    var compiler = this,
        data     = compiler.data,
        ob       = data.__emitter__

    // make sure the key is present in data
    // so it can be observed
    if (!(hasOwn.call(data, key))) {
        data[key] = undefined
    }

    // if the data object is already observed, but the key
    // is not observed, we need to add it to the observed keys.
    if (ob && !(hasOwn.call(ob.values, key))) {
        Observer.convertKey(data, key)
    }

    binding.value = data[key]

    def(compiler.vm, key, {
        get: function () {
            return compiler.data[key]
        },
        set: function (val) {
            compiler.data[key] = val
        }
    })
}

/**
 *  Define a vm property, e.g. $index, $key, or mixin methods
 *  which are bindable but only accessible on the VM,
 *  not in the data.
 */
CompilerProto.defineVmProp = function (key, binding, value) {
    var ob = this.observer
    binding.value = value
    def(this.vm, key, {
        get: function () {
            if (Observer.shouldGet) ob.emit('get', key)
            return binding.value
        },
        set: function (val) {
            ob.emit('set', key, val)
        }
    })
}

/**
 *  Define an expression binding, which is essentially
 *  an anonymous computed property
 */
CompilerProto.defineExp = function (key, binding, directive) {
    var computedKey = directive && directive.computedKey,
        exp         = computedKey ? directive.expression : key,
        getter      = this.expCache[exp]
    if (!getter) {
        getter = this.expCache[exp] = ExpParser.parse(computedKey || key, this)
    }
    if (getter) {
        this.markComputed(binding, getter)
    }
}

/**
 *  Define a computed property on the VM
 */
CompilerProto.defineComputed = function (key, binding, value) {
    this.markComputed(binding, value)
    def(this.vm, key, {
        get: binding.value.$get,
        set: binding.value.$set
    })
}

/**
 *  Process a computed property binding
 *  so its getter/setter are bound to proper context
 */
CompilerProto.markComputed = function (binding, value) {
    binding.isComputed = true
    // bind the accessors to the vm
    if (binding.isFn) {
        binding.value = value
    } else {
        if (typeof value === 'function') {
            value = { $get: value }
        }
        binding.value = {
            $get: utils.bind(value.$get, this.vm),
            $set: value.$set
                ? utils.bind(value.$set, this.vm)
                : undefined
        }
    }
    // keep track for dep parsing later
    this.computed.push(binding)
}

/**
 *  Retrive an option from the compiler
 */
CompilerProto.getOption = function (type, id, silent) {
    var opts = this.options,
        parent = this.parent,
        globalAssets = config.globalAssets,
        res = (opts[type] && opts[type][id]) || (
            parent
                ? parent.getOption(type, id, silent)
                : globalAssets[type] && globalAssets[type][id]
        )
    if (!res && !silent && typeof id === 'string') {
        utils.warn('Unknown ' + type.slice(0, -1) + ': ' + id)
    }
    return res
}

/**
 *  Emit lifecycle events to trigger hooks
 */
CompilerProto.execHook = function (event) {
    event = 'hook:' + event
    this.observer.emit(event)
    this.emitter.emit(event)
}

/**
 *  Check if a compiler's data contains a keypath
 */
CompilerProto.hasKey = function (key) {
    var baseKey = utils.baseKey(key)
    return hasOwn.call(this.data, baseKey) ||
        hasOwn.call(this.vm, baseKey)
}

/**
 *  Do a one-time eval of a string that potentially
 *  includes bindings. It accepts additional raw data
 *  because we need to dynamically resolve v-component
 *  before a childVM is even compiled...
 */
CompilerProto.eval = function (exp, data) {
    var parsed = TextParser.parseAttr(exp)
    return parsed
        ? ExpParser.eval(parsed, this, data)
        : exp
}

/**
 *  Resolve a Component constructor for an element
 *  with the data to be used
 */
CompilerProto.resolveComponent = function (node, data, test) {

    // late require to avoid circular deps
    ViewModel = ViewModel || require('./viewmodel')

    var exp     = utils.attr(node, 'component'),
        tagName = node.tagName,
        id      = this.eval(exp, data),
        tagId   = (tagName.indexOf('-') > 0 && tagName.toLowerCase()),
        Ctor    = this.getOption('components', id || tagId, true)

    if (id && !Ctor) {
        utils.warn('Unknown component: ' + id)
    }

    return test
        ? exp === ''
            ? ViewModel
            : Ctor
        : Ctor || ViewModel
}

/**
 *  Unbind and remove element
 */
CompilerProto.destroy = function (noRemove) {

    // avoid being called more than once
    // this is irreversible!
    if (this.destroyed) return

    var compiler = this,
        i, j, key, dir, dirs, binding,
        vm          = compiler.vm,
        el          = compiler.el,
        directives  = compiler.dirs,
        computed    = compiler.computed,
        bindings    = compiler.bindings,
        children    = compiler.children,
        parent      = compiler.parent

    compiler.execHook('beforeDestroy')

    // unobserve data
    Observer.unobserve(compiler.data, '', compiler.observer)

    // destroy all children
    // do not remove their elements since the parent
    // may have transitions and the children may not
    i = children.length
    while (i--) {
        children[i].destroy(true)
    }

    // unbind all direcitves
    i = directives.length
    while (i--) {
        dir = directives[i]
        // if this directive is an instance of an external binding
        // e.g. a directive that refers to a variable on the parent VM
        // we need to remove it from that binding's directives
        // * empty and literal bindings do not have binding.
        if (dir.binding && dir.binding.compiler !== compiler) {
            dirs = dir.binding.dirs
            if (dirs) {
                j = dirs.indexOf(dir)
                if (j > -1) dirs.splice(j, 1)
            }
        }
        dir.$unbind()
    }

    // unbind all computed, anonymous bindings
    i = computed.length
    while (i--) {
        computed[i].unbind()
    }

    // unbind all keypath bindings
    for (key in bindings) {
        binding = bindings[key]
        if (binding) {
            binding.unbind()
        }
    }

    // remove self from parent
    if (parent) {
        j = parent.children.indexOf(compiler)
        if (j > -1) parent.children.splice(j, 1)
    }

    // finally remove dom element
    if (!noRemove) {
        if (el === document.body) {
            el.innerHTML = ''
        } else {
            vm.$remove()
        }
    }
    el.vue_vm = null

    compiler.destroyed = true
    // emit destroy hook
    compiler.execHook('afterDestroy')

    // finally, unregister all listeners
    compiler.observer.off()
    compiler.emitter.off()
}

// Helpers --------------------------------------------------------------------

/**
 *  shorthand for getting root compiler
 */
function getRoot (compiler) {
    while (compiler.parent) {
        compiler = compiler.parent
    }
    return compiler
}

module.exports = Compiler
},{"./binding":17,"./config":19,"./deps-parser":20,"./directive":21,"./emitter":32,"./exp-parser":33,"./observer":37,"./text-parser":39,"./utils":41,"./viewmodel":42}],19:[function(require,module,exports){
var TextParser = require('./text-parser')

module.exports = {
    prefix         : 'v',
    debug          : false,
    silent         : false,
    enterClass     : 'v-enter',
    leaveClass     : 'v-leave',
    interpolate    : true
}

Object.defineProperty(module.exports, 'delimiters', {
    get: function () {
        return TextParser.delimiters
    },
    set: function (delimiters) {
        TextParser.setDelimiters(delimiters)
    }
})
},{"./text-parser":39}],20:[function(require,module,exports){
var Emitter  = require('./emitter'),
    utils    = require('./utils'),
    Observer = require('./observer'),
    catcher  = new Emitter()

/**
 *  Auto-extract the dependencies of a computed property
 *  by recording the getters triggered when evaluating it.
 */
function catchDeps (binding) {
    if (binding.isFn) return
    utils.log('\n- ' + binding.key)
    var got = utils.hash()
    binding.deps = []
    catcher.on('get', function (dep) {
        var has = got[dep.key]
        if (
            // avoid duplicate bindings
            (has && has.compiler === dep.compiler) ||
            // avoid repeated items as dependency
            // only when the binding is from self or the parent chain
            (dep.compiler.repeat && !isParentOf(dep.compiler, binding.compiler))
        ) {
            return
        }
        got[dep.key] = dep
        utils.log('  - ' + dep.key)
        binding.deps.push(dep)
        dep.subs.push(binding)
    })
    binding.value.$get()
    catcher.off('get')
}

/**
 *  Test if A is a parent of or equals B
 */
function isParentOf (a, b) {
    while (b) {
        if (a === b) {
            return true
        }
        b = b.parent
    }
}

module.exports = {

    /**
     *  the observer that catches events triggered by getters
     */
    catcher: catcher,

    /**
     *  parse a list of computed property bindings
     */
    parse: function (bindings) {
        utils.log('\nparsing dependencies...')
        Observer.shouldGet = true
        bindings.forEach(catchDeps)
        Observer.shouldGet = false
        utils.log('\ndone.')
    }
    
}
},{"./emitter":32,"./observer":37,"./utils":41}],21:[function(require,module,exports){
var dirId           = 1,
    ARG_RE          = /^[\w\$-]+$/,
    FILTER_TOKEN_RE = /[^\s'"]+|'[^']+'|"[^"]+"/g,
    NESTING_RE      = /^\$(parent|root)\./,
    SINGLE_VAR_RE   = /^[\w\.$]+$/,
    QUOTE_RE        = /"/g,
    TextParser      = require('./text-parser')

/**
 *  Directive class
 *  represents a single directive instance in the DOM
 */
function Directive (name, ast, definition, compiler, el) {

    this.id             = dirId++
    this.name           = name
    this.compiler       = compiler
    this.vm             = compiler.vm
    this.el             = el
    this.computeFilters = false
    this.key            = ast.key
    this.arg            = ast.arg
    this.expression     = ast.expression

    var isEmpty = this.expression === ''

    // mix in properties from the directive definition
    if (typeof definition === 'function') {
        this[isEmpty ? 'bind' : 'update'] = definition
    } else {
        for (var prop in definition) {
            this[prop] = definition[prop]
        }
    }

    // empty expression, we're done.
    if (isEmpty || this.isEmpty) {
        this.isEmpty = true
        return
    }

    if (TextParser.Regex.test(this.key)) {
        this.key = compiler.eval(this.key)
        if (this.isLiteral) {
            this.expression = this.key
        }
    }

    var filters = ast.filters,
        filter, fn, i, l, computed
    if (filters) {
        this.filters = []
        for (i = 0, l = filters.length; i < l; i++) {
            filter = filters[i]
            fn = this.compiler.getOption('filters', filter.name)
            if (fn) {
                filter.apply = fn
                this.filters.push(filter)
                if (fn.computed) {
                    computed = true
                }
            }
        }
    }

    if (!this.filters || !this.filters.length) {
        this.filters = null
    }

    if (computed) {
        this.computedKey = Directive.inlineFilters(this.key, this.filters)
        this.filters = null
    }

    this.isExp =
        computed ||
        !SINGLE_VAR_RE.test(this.key) ||
        NESTING_RE.test(this.key)

}

var DirProto = Directive.prototype

/**
 *  called when a new value is set 
 *  for computed properties, this will only be called once
 *  during initialization.
 */
DirProto.$update = function (value, init) {
    if (this.$lock) return
    if (init || value !== this.value || (value && typeof value === 'object')) {
        this.value = value
        if (this.update) {
            this.update(
                this.filters && !this.computeFilters
                    ? this.$applyFilters(value)
                    : value,
                init
            )
        }
    }
}

/**
 *  pipe the value through filters
 */
DirProto.$applyFilters = function (value) {
    var filtered = value, filter
    for (var i = 0, l = this.filters.length; i < l; i++) {
        filter = this.filters[i]
        filtered = filter.apply.apply(this.vm, [filtered].concat(filter.args))
    }
    return filtered
}

/**
 *  Unbind diretive
 */
DirProto.$unbind = function () {
    // this can be called before the el is even assigned...
    if (!this.el || !this.vm) return
    if (this.unbind) this.unbind()
    this.vm = this.el = this.binding = this.compiler = null
}

// Exposed static methods -----------------------------------------------------

/**
 *  Parse a directive string into an Array of
 *  AST-like objects representing directives
 */
Directive.parse = function (str) {

    var inSingle = false,
        inDouble = false,
        curly    = 0,
        square   = 0,
        paren    = 0,
        begin    = 0,
        argIndex = 0,
        dirs     = [],
        dir      = {},
        lastFilterIndex = 0,
        arg

    for (var c, i = 0, l = str.length; i < l; i++) {
        c = str.charAt(i)
        if (inSingle) {
            // check single quote
            if (c === "'") inSingle = !inSingle
        } else if (inDouble) {
            // check double quote
            if (c === '"') inDouble = !inDouble
        } else if (c === ',' && !paren && !curly && !square) {
            // reached the end of a directive
            pushDir()
            // reset & skip the comma
            dir = {}
            begin = argIndex = lastFilterIndex = i + 1
        } else if (c === ':' && !dir.key && !dir.arg) {
            // argument
            arg = str.slice(begin, i).trim()
            if (ARG_RE.test(arg)) {
                argIndex = i + 1
                dir.arg = arg
            }
        } else if (c === '|' && str.charAt(i + 1) !== '|' && str.charAt(i - 1) !== '|') {
            if (dir.key === undefined) {
                // first filter, end of key
                lastFilterIndex = i + 1
                dir.key = str.slice(argIndex, i).trim()
            } else {
                // already has filter
                pushFilter()
            }
        } else if (c === '"') {
            inDouble = true
        } else if (c === "'") {
            inSingle = true
        } else if (c === '(') {
            paren++
        } else if (c === ')') {
            paren--
        } else if (c === '[') {
            square++
        } else if (c === ']') {
            square--
        } else if (c === '{') {
            curly++
        } else if (c === '}') {
            curly--
        }
    }
    if (i === 0 || begin !== i) {
        pushDir()
    }

    function pushDir () {
        dir.expression = str.slice(begin, i).trim()
        if (dir.key === undefined) {
            dir.key = str.slice(argIndex, i).trim()
        } else if (lastFilterIndex !== begin) {
            pushFilter()
        }
        if (i === 0 || dir.key) {
            dirs.push(dir)
        }
    }

    function pushFilter () {
        var exp = str.slice(lastFilterIndex, i).trim(),
            filter
        if (exp) {
            filter = {}
            var tokens = exp.match(FILTER_TOKEN_RE)
            filter.name = tokens[0]
            filter.args = tokens.length > 1 ? tokens.slice(1) : null
        }
        if (filter) {
            (dir.filters = dir.filters || []).push(filter)
        }
        lastFilterIndex = i + 1
    }

    return dirs
}

/**
 *  Inline computed filters so they become part
 *  of the expression
 */
Directive.inlineFilters = function (key, filters) {
    var args, filter
    for (var i = 0, l = filters.length; i < l; i++) {
        filter = filters[i]
        args = filter.args
            ? ',"' + filter.args.map(escapeQuote).join('","') + '"'
            : ''
        key = 'this.$compiler.getOption("filters", "' +
                filter.name +
            '").call(this,' +
                key + args +
            ')'
    }
    return key
}

/**
 *  Convert double quotes to single quotes
 *  so they don't mess up the generated function body
 */
function escapeQuote (v) {
    return v.indexOf('"') > -1
        ? v.replace(QUOTE_RE, '\'')
        : v
}

module.exports = Directive
},{"./text-parser":39}],22:[function(require,module,exports){
var utils = require('../utils'),
    slice = [].slice

/**
 *  Binding for innerHTML
 */
module.exports = {

    bind: function () {
        // a comment node means this is a binding for
        // {{{ inline unescaped html }}}
        if (this.el.nodeType === 8) {
            // hold nodes
            this.nodes = []
        }
    },

    update: function (value) {
        value = utils.guard(value)
        if (this.nodes) {
            this.swap(value)
        } else {
            this.el.innerHTML = value
        }
    },

    swap: function (value) {
        var parent = this.el.parentNode,
            nodes  = this.nodes,
            i      = nodes.length
        // remove old nodes
        while (i--) {
            parent.removeChild(nodes[i])
        }
        // convert new value to a fragment
        var frag = utils.toFragment(value)
        // save a reference to these nodes so we can remove later
        this.nodes = slice.call(frag.childNodes)
        parent.insertBefore(frag, this.el)
    }
}
},{"../utils":41}],23:[function(require,module,exports){
var utils    = require('../utils')

/**
 *  Manages a conditional child VM
 */
module.exports = {

    bind: function () {
        
        this.parent = this.el.parentNode
        this.ref    = document.createComment('vue-if')
        this.Ctor   = this.compiler.resolveComponent(this.el)

        // insert ref
        this.parent.insertBefore(this.ref, this.el)
        this.parent.removeChild(this.el)

        if (utils.attr(this.el, 'view')) {
            utils.warn(
                'Conflict: v-if cannot be used together with v-view. ' +
                'Just set v-view\'s binding value to empty string to empty it.'
            )
        }
        if (utils.attr(this.el, 'repeat')) {
            utils.warn(
                'Conflict: v-if cannot be used together with v-repeat. ' +
                'Use `v-show` or the `filterBy` filter instead.'
            )
        }
    },

    update: function (value) {

        if (!value) {
            this.unbind()
        } else if (!this.childVM) {
            this.childVM = new this.Ctor({
                el: this.el.cloneNode(true),
                parent: this.vm
            })
            if (this.compiler.init) {
                this.parent.insertBefore(this.childVM.$el, this.ref)
            } else {
                this.childVM.$before(this.ref)
            }
        }
        
    },

    unbind: function () {
        if (this.childVM) {
            this.childVM.$destroy()
            this.childVM = null
        }
    }
}
},{"../utils":41}],24:[function(require,module,exports){
var utils      = require('../utils'),
    config     = require('../config'),
    transition = require('../transition'),
    directives = module.exports = utils.hash()

/**
 *  Nest and manage a Child VM
 */
directives.component = {
    isLiteral: true,
    bind: function () {
        if (!this.el.vue_vm) {
            this.childVM = new this.Ctor({
                el: this.el,
                parent: this.vm
            })
        }
    },
    unbind: function () {
        if (this.childVM) {
            this.childVM.$destroy()
        }
    }
}

/**
 *  Binding HTML attributes
 */
directives.attr = {
    bind: function () {
        var params = this.vm.$options.paramAttributes
        this.isParam = params && params.indexOf(this.arg) > -1
    },
    update: function (value) {
        if (value || value === 0) {
            this.el.setAttribute(this.arg, value)
        } else {
            this.el.removeAttribute(this.arg)
        }
        if (this.isParam) {
            this.vm[this.arg] = utils.checkNumber(value)
        }
    }
}

/**
 *  Binding textContent
 */
directives.text = {
    bind: function () {
        this.attr = this.el.nodeType === 3
            ? 'nodeValue'
            : 'textContent'
    },
    update: function (value) {
        this.el[this.attr] = utils.guard(value)
    }
}

/**
 *  Binding CSS display property
 */
directives.show = function (value) {
    var el = this.el,
        target = value ? '' : 'none',
        change = function () {
            el.style.display = target
        }
    transition(el, value ? 1 : -1, change, this.compiler)
}

/**
 *  Binding CSS classes
 */
directives['class'] = function (value) {
    if (this.arg) {
        utils[value ? 'addClass' : 'removeClass'](this.el, this.arg)
    } else {
        if (this.lastVal) {
            utils.removeClass(this.el, this.lastVal)
        }
        if (value) {
            utils.addClass(this.el, value)
            this.lastVal = value
        }
    }
}

/**
 *  Only removed after the owner VM is ready
 */
directives.cloak = {
    isEmpty: true,
    bind: function () {
        var el = this.el
        this.compiler.observer.once('hook:ready', function () {
            el.removeAttribute(config.prefix + '-cloak')
        })
    }
}

/**
 *  Store a reference to self in parent VM's $
 */
directives.ref = {
    isLiteral: true,
    bind: function () {
        var id = this.expression
        if (id) {
            this.vm.$parent.$[id] = this.vm
        }
    },
    unbind: function () {
        var id = this.expression
        if (id) {
            delete this.vm.$parent.$[id]
        }
    }
}

directives.on      = require('./on')
directives.repeat  = require('./repeat')
directives.model   = require('./model')
directives['if']   = require('./if')
directives['with'] = require('./with')
directives.html    = require('./html')
directives.style   = require('./style')
directives.partial = require('./partial')
directives.view    = require('./view')
},{"../config":19,"../transition":40,"../utils":41,"./html":22,"./if":23,"./model":25,"./on":26,"./partial":27,"./repeat":28,"./style":29,"./view":30,"./with":31}],25:[function(require,module,exports){
var utils = require('../utils'),
    isIE9 = navigator.userAgent.indexOf('MSIE 9.0') > 0,
    filter = [].filter

/**
 *  Returns an array of values from a multiple select
 */
function getMultipleSelectOptions (select) {
    return filter
        .call(select.options, function (option) {
            return option.selected
        })
        .map(function (option) {
            return option.value || option.text
        })
}

/**
 *  Two-way binding for form input elements
 */
module.exports = {

    bind: function () {

        var self = this,
            el   = self.el,
            type = el.type,
            tag  = el.tagName

        self.lock = false
        self.ownerVM = self.binding.compiler.vm

        // determine what event to listen to
        self.event =
            (self.compiler.options.lazy ||
            tag === 'SELECT' ||
            type === 'checkbox' || type === 'radio')
                ? 'change'
                : 'input'

        // determine the attribute to change when updating
        self.attr = type === 'checkbox'
            ? 'checked'
            : (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA')
                ? 'value'
                : 'innerHTML'

        // select[multiple] support
        if(tag === 'SELECT' && el.hasAttribute('multiple')) {
            this.multi = true
        }

        var compositionLock = false
        self.cLock = function () {
            compositionLock = true
        }
        self.cUnlock = function () {
            compositionLock = false
        }
        el.addEventListener('compositionstart', this.cLock)
        el.addEventListener('compositionend', this.cUnlock)

        // attach listener
        self.set = self.filters
            ? function () {
                if (compositionLock) return
                // if this directive has filters
                // we need to let the vm.$set trigger
                // update() so filters are applied.
                // therefore we have to record cursor position
                // so that after vm.$set changes the input
                // value we can put the cursor back at where it is
                var cursorPos
                try { cursorPos = el.selectionStart } catch (e) {}

                self._set()

                // since updates are async
                // we need to reset cursor position async too
                utils.nextTick(function () {
                    if (cursorPos !== undefined) {
                        el.setSelectionRange(cursorPos, cursorPos)
                    }
                })
            }
            : function () {
                if (compositionLock) return
                // no filters, don't let it trigger update()
                self.lock = true

                self._set()

                utils.nextTick(function () {
                    self.lock = false
                })
            }
        el.addEventListener(self.event, self.set)

        // fix shit for IE9
        // since it doesn't fire input on backspace / del / cut
        if (isIE9) {
            self.onCut = function () {
                // cut event fires before the value actually changes
                utils.nextTick(function () {
                    self.set()
                })
            }
            self.onDel = function (e) {
                if (e.keyCode === 46 || e.keyCode === 8) {
                    self.set()
                }
            }
            el.addEventListener('cut', self.onCut)
            el.addEventListener('keyup', self.onDel)
        }
    },

    _set: function () {
        this.ownerVM.$set(
            this.key, this.multi
                ? getMultipleSelectOptions(this.el)
                : this.el[this.attr]
        )
    },

    update: function (value, init) {
        /* jshint eqeqeq: false */
        // sync back inline value if initial data is undefined
        if (init && value === undefined) {
            return this._set()
        }
        if (this.lock) return
        var el = this.el
        if (el.tagName === 'SELECT') { // select dropdown
            el.selectedIndex = -1
            if(this.multi && Array.isArray(value)) {
                value.forEach(this.updateSelect, this)
            } else {
                this.updateSelect(value)
            }
        } else if (el.type === 'radio') { // radio button
            el.checked = value == el.value
        } else if (el.type === 'checkbox') { // checkbox
            el.checked = !!value
        } else {
            el[this.attr] = utils.guard(value)
        }
    },

    updateSelect: function (value) {
        /* jshint eqeqeq: false */
        // setting <select>'s value in IE9 doesn't work
        // we have to manually loop through the options
        var options = this.el.options,
            i = options.length
        while (i--) {
            if (options[i].value == value) {
                options[i].selected = true
                break
            }
        }
    },

    unbind: function () {
        var el = this.el
        el.removeEventListener(this.event, this.set)
        el.removeEventListener('compositionstart', this.cLock)
        el.removeEventListener('compositionend', this.cUnlock)
        if (isIE9) {
            el.removeEventListener('cut', this.onCut)
            el.removeEventListener('keyup', this.onDel)
        }
    }
}
},{"../utils":41}],26:[function(require,module,exports){
var utils    = require('../utils')

/**
 *  Binding for event listeners
 */
module.exports = {

    isFn: true,

    bind: function () {
        this.context = this.binding.isExp
            ? this.vm
            : this.binding.compiler.vm
        if (this.el.tagName === 'IFRAME' && this.arg !== 'load') {
            var self = this
            this.iframeBind = function () {
                self.el.contentWindow.addEventListener(self.arg, self.handler)
            }
            this.el.addEventListener('load', this.iframeBind)
        }
    },

    update: function (handler) {
        if (typeof handler !== 'function') {
            utils.warn('Directive "v-on:' + this.expression + '" expects a method.')
            return
        }
        this.reset()
        var vm = this.vm,
            context = this.context
        this.handler = function (e) {
            e.targetVM = vm
            context.$event = e
            var res = handler.call(context, e)
            context.$event = null
            return res
        }
        if (this.iframeBind) {
            this.iframeBind()
        } else {
            this.el.addEventListener(this.arg, this.handler)
        }
    },

    reset: function () {
        var el = this.iframeBind
            ? this.el.contentWindow
            : this.el
        if (this.handler) {
            el.removeEventListener(this.arg, this.handler)
        }
    },

    unbind: function () {
        this.reset()
        this.el.removeEventListener('load', this.iframeBind)
    }
}
},{"../utils":41}],27:[function(require,module,exports){
var utils = require('../utils')

/**
 *  Binding for partials
 */
module.exports = {

    isLiteral: true,

    bind: function () {

        var id = this.expression
        if (!id) return

        var el       = this.el,
            compiler = this.compiler,
            partial  = compiler.getOption('partials', id)

        if (!partial) {
            if (id === 'yield') {
                utils.warn('{{>yield}} syntax has been deprecated. Use <content> tag instead.')
            }
            return
        }

        partial = partial.cloneNode(true)

        // comment ref node means inline partial
        if (el.nodeType === 8) {

            // keep a ref for the partial's content nodes
            var nodes = [].slice.call(partial.childNodes),
                parent = el.parentNode
            parent.insertBefore(partial, el)
            parent.removeChild(el)
            // compile partial after appending, because its children's parentNode
            // will change from the fragment to the correct parentNode.
            // This could affect directives that need access to its element's parentNode.
            nodes.forEach(compiler.compile, compiler)

        } else {

            // just set innerHTML...
            el.innerHTML = ''
            el.appendChild(partial)

        }
    }

}
},{"../utils":41}],28:[function(require,module,exports){
var utils      = require('../utils'),
    config     = require('../config')

/**
 *  Binding that manages VMs based on an Array
 */
module.exports = {

    bind: function () {

        this.identifier = '$r' + this.id

        // a hash to cache the same expressions on repeated instances
        // so they don't have to be compiled for every single instance
        this.expCache = utils.hash()

        var el   = this.el,
            ctn  = this.container = el.parentNode

        // extract child Id, if any
        this.childId = this.compiler.eval(utils.attr(el, 'ref'))

        // create a comment node as a reference node for DOM insertions
        this.ref = document.createComment(config.prefix + '-repeat-' + this.key)
        ctn.insertBefore(this.ref, el)
        ctn.removeChild(el)

        this.collection = null
        this.vms = null

    },

    update: function (collection) {

        if (!Array.isArray(collection)) {
            if (utils.isObject(collection)) {
                collection = utils.objectToArray(collection)
            } else {
                utils.warn('v-repeat only accepts Array or Object values.')
            }
        }

        // keep reference of old data and VMs
        // so we can reuse them if possible
        this.oldVMs = this.vms
        this.oldCollection = this.collection
        collection = this.collection = collection || []

        var isObject = collection[0] && utils.isObject(collection[0])
        this.vms = this.oldCollection
            ? this.diff(collection, isObject)
            : this.init(collection, isObject)

        if (this.childId) {
            this.vm.$[this.childId] = this.vms
        }

    },

    init: function (collection, isObject) {
        var vm, vms = []
        for (var i = 0, l = collection.length; i < l; i++) {
            vm = this.build(collection[i], i, isObject)
            vms.push(vm)
            if (this.compiler.init) {
                this.container.insertBefore(vm.$el, this.ref)
            } else {
                vm.$before(this.ref)
            }
        }
        return vms
    },

    /**
     *  Diff the new array with the old
     *  and determine the minimum amount of DOM manipulations.
     */
    diff: function (newCollection, isObject) {

        var i, l, item, vm,
            oldIndex,
            targetNext,
            currentNext,
            nextEl,
            ctn    = this.container,
            oldVMs = this.oldVMs,
            vms    = []

        vms.length = newCollection.length

        // first pass, collect new reused and new created
        for (i = 0, l = newCollection.length; i < l; i++) {
            item = newCollection[i]
            if (isObject) {
                item.$index = i
                if (item.__emitter__ && item.__emitter__[this.identifier]) {
                    // this piece of data is being reused.
                    // record its final position in reused vms
                    item.$reused = true
                } else {
                    vms[i] = this.build(item, i, isObject)
                }
            } else {
                // we can't attach an identifier to primitive values
                // so have to do an indexOf...
                oldIndex = indexOf(oldVMs, item)
                if (oldIndex > -1) {
                    // record the position on the existing vm
                    oldVMs[oldIndex].$reused = true
                    oldVMs[oldIndex].$data.$index = i
                } else {
                    vms[i] = this.build(item, i, isObject)
                }
            }
        }

        // second pass, collect old reused and destroy unused
        for (i = 0, l = oldVMs.length; i < l; i++) {
            vm = oldVMs[i]
            item = this.arg
                ? vm.$data[this.arg]
                : vm.$data
            if (item.$reused) {
                vm.$reused = true
                delete item.$reused
            }
            if (vm.$reused) {
                // update the index to latest
                vm.$index = item.$index
                // the item could have had a new key
                if (item.$key && item.$key !== vm.$key) {
                    vm.$key = item.$key
                }
                vms[vm.$index] = vm
            } else {
                // this one can be destroyed.
                if (item.__emitter__) {
                    delete item.__emitter__[this.identifier]
                }
                vm.$destroy()
            }
        }

        // final pass, move/insert DOM elements
        i = vms.length
        while (i--) {
            vm = vms[i]
            item = vm.$data
            targetNext = vms[i + 1]
            if (vm.$reused) {
                nextEl = vm.$el.nextSibling
                // destroyed VMs' element might still be in the DOM
                // due to transitions
                while (!nextEl.vue_vm && nextEl !== this.ref) {
                    nextEl = nextEl.nextSibling
                }
                currentNext = nextEl.vue_vm
                if (currentNext !== targetNext) {
                    if (!targetNext) {
                        ctn.insertBefore(vm.$el, this.ref)
                    } else {
                        nextEl = targetNext.$el
                        // new VMs' element might not be in the DOM yet
                        // due to transitions
                        while (!nextEl.parentNode) {
                            targetNext = vms[nextEl.vue_vm.$index + 1]
                            nextEl = targetNext
                                ? targetNext.$el
                                : this.ref
                        }
                        ctn.insertBefore(vm.$el, nextEl)
                    }
                }
                delete vm.$reused
                delete item.$index
                delete item.$key
            } else { // a new vm
                vm.$before(targetNext ? targetNext.$el : this.ref)
            }
        }

        return vms
    },

    build: function (data, index, isObject) {

        // wrap non-object values
        var raw, alias,
            wrap = !isObject || this.arg
        if (wrap) {
            raw = data
            alias = this.arg || '$value'
            data = {}
            data[alias] = raw
        }
        data.$index = index

        var el = this.el.cloneNode(true),
            Ctor = this.compiler.resolveComponent(el, data),
            vm = new Ctor({
                el: el,
                data: data,
                parent: this.vm,
                compilerOptions: {
                    repeat: true,
                    expCache: this.expCache
                }
            })

        if (isObject) {
            // attach an ienumerable identifier to the raw data
            (raw || data).__emitter__[this.identifier] = true
        }

        return vm

    },

    unbind: function () {
        if (this.childId) {
            delete this.vm.$[this.childId]
        }
        if (this.vms) {
            var i = this.vms.length
            while (i--) {
                this.vms[i].$destroy()
            }
        }
    }
}

// Helpers --------------------------------------------------------------------

/**
 *  Find an object or a wrapped data object
 *  from an Array
 */
function indexOf (vms, obj) {
    for (var vm, i = 0, l = vms.length; i < l; i++) {
        vm = vms[i]
        if (!vm.$reused && vm.$value === obj) {
            return i
        }
    }
    return -1
}
},{"../config":19,"../utils":41}],29:[function(require,module,exports){
var prefixes = ['-webkit-', '-moz-', '-ms-']

/**
 *  Binding for CSS styles
 */
module.exports = {

    bind: function () {
        var prop = this.arg
        if (!prop) return
        if (prop.charAt(0) === '$') {
            // properties that start with $ will be auto-prefixed
            prop = prop.slice(1)
            this.prefixed = true
        }
        this.prop = prop
    },

    update: function (value) {
        var prop = this.prop,
            isImportant
        /* jshint eqeqeq: true */
        // cast possible numbers/booleans into strings
        if (value != null) value += ''
        if (prop) {
            if (value) {
                isImportant = value.slice(-10) === '!important'
                    ? 'important'
                    : ''
                if (isImportant) {
                    value = value.slice(0, -10).trim()
                }
            }
            this.el.style.setProperty(prop, value, isImportant)
            if (this.prefixed) {
                var i = prefixes.length
                while (i--) {
                    this.el.style.setProperty(prefixes[i] + prop, value, isImportant)
                }
            }
        } else {
            this.el.style.cssText = value
        }
    }

}
},{}],30:[function(require,module,exports){
/**
 *  Manages a conditional child VM using the
 *  binding's value as the component ID.
 */
module.exports = {

    bind: function () {

        // track position in DOM with a ref node
        var el       = this.raw = this.el,
            parent   = el.parentNode,
            ref      = this.ref = document.createComment('v-view')
        parent.insertBefore(ref, el)
        parent.removeChild(el)

        // cache original content
        /* jshint boss: true */
        var node,
            frag = this.inner = document.createElement('div')
        while (node = el.firstChild) {
            frag.appendChild(node)
        }

    },

    update: function(value) {

        this.unbind()

        var Ctor  = this.compiler.getOption('components', value)
        if (!Ctor) return

        this.childVM = new Ctor({
            el: this.raw.cloneNode(true),
            parent: this.vm,
            compilerOptions: {
                rawContent: this.inner.cloneNode(true)
            }
        })

        this.el = this.childVM.$el
        if (this.compiler.init) {
            this.ref.parentNode.insertBefore(this.el, this.ref)
        } else {
            this.childVM.$before(this.ref)
        }

    },

    unbind: function() {
        if (this.childVM) {
            this.childVM.$destroy()
        }
    }

}
},{}],31:[function(require,module,exports){
var utils = require('../utils')

/**
 *  Binding for inheriting data from parent VMs.
 */
module.exports = {

    bind: function () {

        var self      = this,
            childKey  = self.arg,
            parentKey = self.key,
            compiler  = self.compiler,
            owner     = self.binding.compiler

        if (compiler === owner) {
            this.alone = true
            return
        }

        if (childKey) {
            if (!compiler.bindings[childKey]) {
                compiler.createBinding(childKey)
            }
            // sync changes on child back to parent
            compiler.observer.on('change:' + childKey, function (val) {
                if (compiler.init) return
                if (!self.lock) {
                    self.lock = true
                    utils.nextTick(function () {
                        self.lock = false
                    })
                }
                owner.vm.$set(parentKey, val)
            })
        }
    },

    update: function (value) {
        // sync from parent
        if (!this.alone && !this.lock) {
            if (this.arg) {
                this.vm.$set(this.arg, value)
            } else if (this.vm.$data !== value) {
                this.vm.$data = value
            }
        }
    }

}
},{"../utils":41}],32:[function(require,module,exports){
var slice = [].slice

function Emitter (ctx) {
    this._ctx = ctx || this
}

var EmitterProto = Emitter.prototype

EmitterProto.on = function (event, fn) {
    this._cbs = this._cbs || {}
    ;(this._cbs[event] = this._cbs[event] || [])
        .push(fn)
    return this
}

EmitterProto.once = function (event, fn) {
    var self = this
    this._cbs = this._cbs || {}

    function on () {
        self.off(event, on)
        fn.apply(this, arguments)
    }

    on.fn = fn
    this.on(event, on)
    return this
}

EmitterProto.off = function (event, fn) {
    this._cbs = this._cbs || {}

    // all
    if (!arguments.length) {
        this._cbs = {}
        return this
    }

    // specific event
    var callbacks = this._cbs[event]
    if (!callbacks) return this

    // remove all handlers
    if (arguments.length === 1) {
        delete this._cbs[event]
        return this
    }

    // remove specific handler
    var cb
    for (var i = 0; i < callbacks.length; i++) {
        cb = callbacks[i]
        if (cb === fn || cb.fn === fn) {
            callbacks.splice(i, 1)
            break
        }
    }
    return this
}

/**
 *  The internal, faster emit with fixed amount of arguments
 *  using Function.call
 */
EmitterProto.emit = function (event, a, b, c) {
    this._cbs = this._cbs || {}
    var callbacks = this._cbs[event]

    if (callbacks) {
        callbacks = callbacks.slice(0)
        for (var i = 0, len = callbacks.length; i < len; i++) {
            callbacks[i].call(this._ctx, a, b, c)
        }
    }

    return this
}

/**
 *  The external emit using Function.apply
 */
EmitterProto.applyEmit = function (event) {
    this._cbs = this._cbs || {}
    var callbacks = this._cbs[event], args

    if (callbacks) {
        callbacks = callbacks.slice(0)
        args = slice.call(arguments, 1)
        for (var i = 0, len = callbacks.length; i < len; i++) {
            callbacks[i].apply(this._ctx, args)
        }
    }

    return this
}

module.exports = Emitter
},{}],33:[function(require,module,exports){
var utils           = require('./utils'),
    STR_SAVE_RE     = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,
    STR_RESTORE_RE  = /"(\d+)"/g,
    NEWLINE_RE      = /\n/g,
    CTOR_RE         = new RegExp('constructor'.split('').join('[\'"+, ]*')),
    UNICODE_RE      = /\\u\d\d\d\d/

// Variable extraction scooped from https://github.com/RubyLouvre/avalon

var KEYWORDS =
        // keywords
        'break,case,catch,continue,debugger,default,delete,do,else,false' +
        ',finally,for,function,if,in,instanceof,new,null,return,switch,this' +
        ',throw,true,try,typeof,var,void,while,with,undefined' +
        // reserved
        ',abstract,boolean,byte,char,class,const,double,enum,export,extends' +
        ',final,float,goto,implements,import,int,interface,long,native' +
        ',package,private,protected,public,short,static,super,synchronized' +
        ',throws,transient,volatile' +
        // ECMA 5 - use strict
        ',arguments,let,yield' +
        // allow using Math in expressions
        ',Math',
        
    KEYWORDS_RE = new RegExp(["\\b" + KEYWORDS.replace(/,/g, '\\b|\\b') + "\\b"].join('|'), 'g'),
    REMOVE_RE   = /\/\*(?:.|\n)*?\*\/|\/\/[^\n]*\n|\/\/[^\n]*$|'[^']*'|"[^"]*"|[\s\t\n]*\.[\s\t\n]*[$\w\.]+|[\{,]\s*[\w\$_]+\s*:/g,
    SPLIT_RE    = /[^\w$]+/g,
    NUMBER_RE   = /\b\d[^,]*/g,
    BOUNDARY_RE = /^,+|,+$/g

/**
 *  Strip top level variable names from a snippet of JS expression
 */
function getVariables (code) {
    code = code
        .replace(REMOVE_RE, '')
        .replace(SPLIT_RE, ',')
        .replace(KEYWORDS_RE, '')
        .replace(NUMBER_RE, '')
        .replace(BOUNDARY_RE, '')
    return code
        ? code.split(/,+/)
        : []
}

/**
 *  A given path could potentially exist not on the
 *  current compiler, but up in the parent chain somewhere.
 *  This function generates an access relationship string
 *  that can be used in the getter function by walking up
 *  the parent chain to check for key existence.
 *
 *  It stops at top parent if no vm in the chain has the
 *  key. It then creates any missing bindings on the
 *  final resolved vm.
 */
function traceScope (path, compiler, data) {
    var rel  = '',
        dist = 0,
        self = compiler

    if (data && utils.get(data, path) !== undefined) {
        // hack: temporarily attached data
        return '$temp.'
    }

    while (compiler) {
        if (compiler.hasKey(path)) {
            break
        } else {
            compiler = compiler.parent
            dist++
        }
    }
    if (compiler) {
        while (dist--) {
            rel += '$parent.'
        }
        if (!compiler.bindings[path] && path.charAt(0) !== '$') {
            compiler.createBinding(path)
        }
    } else {
        self.createBinding(path)
    }
    return rel
}

/**
 *  Create a function from a string...
 *  this looks like evil magic but since all variables are limited
 *  to the VM's data it's actually properly sandboxed
 */
function makeGetter (exp, raw) {
    var fn
    try {
        fn = new Function(exp)
    } catch (e) {
        utils.warn('Error parsing expression: ' + raw)
    }
    return fn
}

/**
 *  Escape a leading dollar sign for regex construction
 */
function escapeDollar (v) {
    return v.charAt(0) === '$'
        ? '\\' + v
        : v
}

/**
 *  Parse and return an anonymous computed property getter function
 *  from an arbitrary expression, together with a list of paths to be
 *  created as bindings.
 */
exports.parse = function (exp, compiler, data) {
    // unicode and 'constructor' are not allowed for XSS security.
    if (UNICODE_RE.test(exp) || CTOR_RE.test(exp)) {
        utils.warn('Unsafe expression: ' + exp)
        return
    }
    // extract variable names
    var vars = getVariables(exp)
    if (!vars.length) {
        return makeGetter('return ' + exp, exp)
    }
    vars = utils.unique(vars)

    var accessors = '',
        has       = utils.hash(),
        strings   = [],
        // construct a regex to extract all valid variable paths
        // ones that begin with "$" are particularly tricky
        // because we can't use \b for them
        pathRE = new RegExp(
            "[^$\\w\\.](" +
            vars.map(escapeDollar).join('|') +
            ")[$\\w\\.]*\\b", 'g'
        ),
        body = (' ' + exp)
            .replace(STR_SAVE_RE, saveStrings)
            .replace(pathRE, replacePath)
            .replace(STR_RESTORE_RE, restoreStrings)

    body = accessors + 'return ' + body

    function saveStrings (str) {
        var i = strings.length
        // escape newlines in strings so the expression
        // can be correctly evaluated
        strings[i] = str.replace(NEWLINE_RE, '\\n')
        return '"' + i + '"'
    }

    function replacePath (path) {
        // keep track of the first char
        var c = path.charAt(0)
        path = path.slice(1)
        var val = 'this.' + traceScope(path, compiler, data) + path
        if (!has[path]) {
            accessors += val + ';'
            has[path] = 1
        }
        // don't forget to put that first char back
        return c + val
    }

    function restoreStrings (str, i) {
        return strings[i]
    }

    return makeGetter(body, exp)
}

/**
 *  Evaluate an expression in the context of a compiler.
 *  Accepts additional data.
 */
exports.eval = function (exp, compiler, data) {
    var getter = exports.parse(exp, compiler, data), res
    if (getter) {
        // hack: temporarily attach the additional data so
        // it can be accessed in the getter
        compiler.vm.$temp = data
        res = getter.call(compiler.vm)
        delete compiler.vm.$temp
    }
    return res
}
},{"./utils":41}],34:[function(require,module,exports){
var utils    = require('./utils'),
    get      = utils.get,
    slice    = [].slice,
    QUOTE_RE = /^'.*'$/,
    filters  = module.exports = utils.hash()

/**
 *  'abc' => 'Abc'
 */
filters.capitalize = function (value) {
    if (!value && value !== 0) return ''
    value = value.toString()
    return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 *  'abc' => 'ABC'
 */
filters.uppercase = function (value) {
    return (value || value === 0)
        ? value.toString().toUpperCase()
        : ''
}

/**
 *  'AbC' => 'abc'
 */
filters.lowercase = function (value) {
    return (value || value === 0)
        ? value.toString().toLowerCase()
        : ''
}

/**
 *  12345 => $12,345.00
 */
filters.currency = function (value, sign) {
    value = parseFloat(value)
    if (!value && value !== 0) return ''
    sign = sign || '$'
    var s = Math.floor(value).toString(),
        i = s.length % 3,
        h = i > 0 ? (s.slice(0, i) + (s.length > 3 ? ',' : '')) : '',
        f = '.' + value.toFixed(2).slice(-2)
    return sign + h + s.slice(i).replace(/(\d{3})(?=\d)/g, '$1,') + f
}

/**
 *  args: an array of strings corresponding to
 *  the single, double, triple ... forms of the word to
 *  be pluralized. When the number to be pluralized
 *  exceeds the length of the args, it will use the last
 *  entry in the array.
 *
 *  e.g. ['single', 'double', 'triple', 'multiple']
 */
filters.pluralize = function (value) {
    var args = slice.call(arguments, 1)
    return args.length > 1
        ? (args[value - 1] || args[args.length - 1])
        : (args[value - 1] || args[0] + 's')
}

/**
 *  A special filter that takes a handler function,
 *  wraps it so it only gets triggered on specific keypresses.
 *
 *  v-on only
 */

var keyCodes = {
    enter    : 13,
    tab      : 9,
    'delete' : 46,
    up       : 38,
    left     : 37,
    right    : 39,
    down     : 40,
    esc      : 27
}

filters.key = function (handler, key) {
    if (!handler) return
    var code = keyCodes[key]
    if (!code) {
        code = parseInt(key, 10)
    }
    return function (e) {
        if (e.keyCode === code) {
            return handler.call(this, e)
        }
    }
}

/**
 *  Filter filter for v-repeat
 */
filters.filterBy = function (arr, searchKey, delimiter, dataKey) {

    // allow optional `in` delimiter
    // because why not
    if (delimiter && delimiter !== 'in') {
        dataKey = delimiter
    }

    // get the search string
    var search = stripQuotes(searchKey) || this.$get(searchKey)
    if (!search) return arr
    search = search.toLowerCase()

    // get the optional dataKey
    dataKey = dataKey && (stripQuotes(dataKey) || this.$get(dataKey))

    // convert object to array
    if (!Array.isArray(arr)) {
        arr = utils.objectToArray(arr)
    }

    return arr.filter(function (item) {
        return dataKey
            ? contains(get(item, dataKey), search)
            : contains(item, search)
    })

}

filters.filterBy.computed = true

/**
 *  Sort fitler for v-repeat
 */
filters.orderBy = function (arr, sortKey, reverseKey) {

    var key = stripQuotes(sortKey) || this.$get(sortKey)
    if (!key) return arr

    // convert object to array
    if (!Array.isArray(arr)) {
        arr = utils.objectToArray(arr)
    }

    var order = 1
    if (reverseKey) {
        if (reverseKey === '-1') {
            order = -1
        } else if (reverseKey.charAt(0) === '!') {
            reverseKey = reverseKey.slice(1)
            order = this.$get(reverseKey) ? 1 : -1
        } else {
            order = this.$get(reverseKey) ? -1 : 1
        }
    }

    // sort on a copy to avoid mutating original array
    return arr.slice().sort(function (a, b) {
        a = get(a, key)
        b = get(b, key)
        return a === b ? 0 : a > b ? order : -order
    })

}

filters.orderBy.computed = true

// Array filter helpers -------------------------------------------------------

/**
 *  String contain helper
 */
function contains (val, search) {
    /* jshint eqeqeq: false */
    if (utils.isObject(val)) {
        for (var key in val) {
            if (contains(val[key], search)) {
                return true
            }
        }
    } else if (val != null) {
        return val.toString().toLowerCase().indexOf(search) > -1
    }
}

/**
 *  Test whether a string is in quotes,
 *  if yes return stripped string
 */
function stripQuotes (str) {
    if (QUOTE_RE.test(str)) {
        return str.slice(1, -1)
    }
}
},{"./utils":41}],35:[function(require,module,exports){
// string -> DOM conversion
// wrappers originally from jQuery, scooped from component/domify
var map = {
    legend   : [1, '<fieldset>', '</fieldset>'],
    tr       : [2, '<table><tbody>', '</tbody></table>'],
    col      : [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
    _default : [0, '', '']
}

map.td =
map.th = [3, '<table><tbody><tr>', '</tr></tbody></table>']

map.option =
map.optgroup = [1, '<select multiple="multiple">', '</select>']

map.thead =
map.tbody =
map.colgroup =
map.caption =
map.tfoot = [1, '<table>', '</table>']

map.text =
map.circle =
map.ellipse =
map.line =
map.path =
map.polygon =
map.polyline =
map.rect = [1, '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">','</svg>']

var TAG_RE = /<([\w:]+)/

module.exports = function (templateString) {
    var frag = document.createDocumentFragment(),
        m = TAG_RE.exec(templateString)
    // text only
    if (!m) {
        frag.appendChild(document.createTextNode(templateString))
        return frag
    }

    var tag = m[1],
        wrap = map[tag] || map._default,
        depth = wrap[0],
        prefix = wrap[1],
        suffix = wrap[2],
        node = document.createElement('div')

    node.innerHTML = prefix + templateString.trim() + suffix
    while (depth--) node = node.lastChild

    // one element
    if (node.firstChild === node.lastChild) {
        frag.appendChild(node.firstChild)
        return frag
    }

    // multiple nodes, return a fragment
    var child
    /* jshint boss: true */
    while (child = node.firstChild) {
        if (node.nodeType === 1) {
            frag.appendChild(child)
        }
    }
    return frag
}
},{}],36:[function(require,module,exports){
var config      = require('./config'),
    ViewModel   = require('./viewmodel'),
    utils       = require('./utils'),
    makeHash    = utils.hash,
    assetTypes  = ['directive', 'filter', 'partial', 'effect', 'component'],
    // Internal modules that are exposed for plugins
    pluginAPI   = {
        utils: utils,
        config: config,
        transition: require('./transition'),
        observer: require('./observer')
    }

ViewModel.options = config.globalAssets = {
    directives  : require('./directives'),
    filters     : require('./filters'),
    partials    : makeHash(),
    effects     : makeHash(),
    components  : makeHash()
}

/**
 *  Expose asset registration methods
 */
assetTypes.forEach(function (type) {
    ViewModel[type] = function (id, value) {
        var hash = this.options[type + 's']
        if (!hash) {
            hash = this.options[type + 's'] = makeHash()
        }
        if (!value) return hash[id]
        if (type === 'partial') {
            value = utils.parseTemplateOption(value)
        } else if (type === 'component') {
            value = utils.toConstructor(value)
        } else if (type === 'filter') {
            utils.checkFilter(value)
        }
        hash[id] = value
        return this
    }
})

/**
 *  Set config options
 */
ViewModel.config = function (opts, val) {
    if (typeof opts === 'string') {
        if (val === undefined) {
            return config[opts]
        } else {
            config[opts] = val
        }
    } else {
        utils.extend(config, opts)
    }
    return this
}

/**
 *  Expose an interface for plugins
 */
ViewModel.use = function (plugin) {
    if (typeof plugin === 'string') {
        try {
            plugin = require(plugin)
        } catch (e) {
            utils.warn('Cannot find plugin: ' + plugin)
            return
        }
    }

    // additional parameters
    var args = [].slice.call(arguments, 1)
    args.unshift(this)

    if (typeof plugin.install === 'function') {
        plugin.install.apply(plugin, args)
    } else {
        plugin.apply(null, args)
    }
    return this
}

/**
 *  Expose internal modules for plugins
 */
ViewModel.require = function (module) {
    return pluginAPI[module]
}

ViewModel.extend = extend
ViewModel.nextTick = utils.nextTick

/**
 *  Expose the main ViewModel class
 *  and add extend method
 */
function extend (options) {

    var ParentVM = this

    // extend data options need to be copied
    // on instantiation
    if (options.data) {
        options.defaultData = options.data
        delete options.data
    }

    // inherit options
    // but only when the super class is not the native Vue.
    if (ParentVM !== ViewModel) {
        options = inheritOptions(options, ParentVM.options, true)
    }
    utils.processOptions(options)

    var ExtendedVM = function (opts, asParent) {
        if (!asParent) {
            opts = inheritOptions(opts, options, true)
        }
        ParentVM.call(this, opts, true)
    }

    // inherit prototype props
    var proto = ExtendedVM.prototype = Object.create(ParentVM.prototype)
    utils.defProtected(proto, 'constructor', ExtendedVM)

    // allow extended VM to be further extended
    ExtendedVM.extend  = extend
    ExtendedVM.super   = ParentVM
    ExtendedVM.options = options

    // allow extended VM to add its own assets
    assetTypes.forEach(function (type) {
        ExtendedVM[type] = ViewModel[type]
    })

    // allow extended VM to use plugins
    ExtendedVM.use     = ViewModel.use
    ExtendedVM.require = ViewModel.require

    return ExtendedVM
}

/**
 *  Inherit options
 *
 *  For options such as `data`, `vms`, `directives`, 'partials',
 *  they should be further extended. However extending should only
 *  be done at top level.
 *  
 *  `proto` is an exception because it's handled directly on the
 *  prototype.
 *
 *  `el` is an exception because it's not allowed as an
 *  extension option, but only as an instance option.
 */
function inheritOptions (child, parent, topLevel) {
    child = child || {}
    if (!parent) return child
    for (var key in parent) {
        if (key === 'el') continue
        var val = child[key],
            parentVal = parent[key]
        if (topLevel && typeof val === 'function' && parentVal) {
            // merge hook functions into an array
            child[key] = [val]
            if (Array.isArray(parentVal)) {
                child[key] = child[key].concat(parentVal)
            } else {
                child[key].push(parentVal)
            }
        } else if (
            topLevel &&
            (utils.isTrueObject(val) || utils.isTrueObject(parentVal))
            && !(parentVal instanceof ViewModel)
        ) {
            // merge toplevel object options
            child[key] = inheritOptions(val, parentVal)
        } else if (val === undefined) {
            // inherit if child doesn't override
            child[key] = parentVal
        }
    }
    return child
}

module.exports = ViewModel
},{"./config":19,"./directives":24,"./filters":34,"./observer":37,"./transition":40,"./utils":41,"./viewmodel":42}],37:[function(require,module,exports){
/* jshint proto:true */

var Emitter  = require('./emitter'),
    utils    = require('./utils'),
    // cache methods
    def      = utils.defProtected,
    isObject = utils.isObject,
    isArray  = Array.isArray,
    hasOwn   = ({}).hasOwnProperty,
    oDef     = Object.defineProperty,
    slice    = [].slice,
    // fix for IE + __proto__ problem
    // define methods as inenumerable if __proto__ is present,
    // otherwise enumerable so we can loop through and manually
    // attach to array instances
    hasProto = ({}).__proto__

// Array Mutation Handlers & Augmentations ------------------------------------

// The proxy prototype to replace the __proto__ of
// an observed array
var ArrayProxy = Object.create(Array.prototype)

// intercept mutation methods
;[
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'sort',
    'reverse'
].forEach(watchMutation)

// Augment the ArrayProxy with convenience methods
def(ArrayProxy, '$set', function (index, data) {
    return this.splice(index, 1, data)[0]
}, !hasProto)

def(ArrayProxy, '$remove', function (index) {
    if (typeof index !== 'number') {
        index = this.indexOf(index)
    }
    if (index > -1) {
        return this.splice(index, 1)[0]
    }
}, !hasProto)

/**
 *  Intercep a mutation event so we can emit the mutation info.
 *  we also analyze what elements are added/removed and link/unlink
 *  them with the parent Array.
 */
function watchMutation (method) {
    def(ArrayProxy, method, function () {

        var args = slice.call(arguments),
            result = Array.prototype[method].apply(this, args),
            inserted, removed

        // determine new / removed elements
        if (method === 'push' || method === 'unshift') {
            inserted = args
        } else if (method === 'pop' || method === 'shift') {
            removed = [result]
        } else if (method === 'splice') {
            inserted = args.slice(2)
            removed = result
        }
        
        // link & unlink
        linkArrayElements(this, inserted)
        unlinkArrayElements(this, removed)

        // emit the mutation event
        this.__emitter__.emit('mutate', '', this, {
            method   : method,
            args     : args,
            result   : result,
            inserted : inserted,
            removed  : removed
        })

        return result
        
    }, !hasProto)
}

/**
 *  Link new elements to an Array, so when they change
 *  and emit events, the owner Array can be notified.
 */
function linkArrayElements (arr, items) {
    if (items) {
        var i = items.length, item, owners
        while (i--) {
            item = items[i]
            if (isWatchable(item)) {
                // if object is not converted for observing
                // convert it...
                if (!item.__emitter__) {
                    convert(item)
                    watch(item)
                }
                owners = item.__emitter__.owners
                if (owners.indexOf(arr) < 0) {
                    owners.push(arr)
                }
            }
        }
    }
}

/**
 *  Unlink removed elements from the ex-owner Array.
 */
function unlinkArrayElements (arr, items) {
    if (items) {
        var i = items.length, item
        while (i--) {
            item = items[i]
            if (item && item.__emitter__) {
                var owners = item.__emitter__.owners
                if (owners) owners.splice(owners.indexOf(arr))
            }
        }
    }
}

// Object add/delete key augmentation -----------------------------------------

var ObjProxy = Object.create(Object.prototype)

def(ObjProxy, '$add', function (key, val) {
    if (hasOwn.call(this, key)) return
    this[key] = val
    convertKey(this, key, true)
}, !hasProto)

def(ObjProxy, '$delete', function (key) {
    if (!(hasOwn.call(this, key))) return
    // trigger set events
    this[key] = undefined
    delete this[key]
    this.__emitter__.emit('delete', key)
}, !hasProto)

// Watch Helpers --------------------------------------------------------------

/**
 *  Check if a value is watchable
 */
function isWatchable (obj) {
    return typeof obj === 'object' && obj && !obj.$compiler
}

/**
 *  Convert an Object/Array to give it a change emitter.
 */
function convert (obj) {
    if (obj.__emitter__) return true
    var emitter = new Emitter()
    def(obj, '__emitter__', emitter)
    emitter
        .on('set', function (key, val, propagate) {
            if (propagate) propagateChange(obj)
        })
        .on('mutate', function () {
            propagateChange(obj)
        })
    emitter.values = utils.hash()
    emitter.owners = []
    return false
}

/**
 *  Propagate an array element's change to its owner arrays
 */
function propagateChange (obj) {
    var owners = obj.__emitter__.owners,
        i = owners.length
    while (i--) {
        owners[i].__emitter__.emit('set', '', '', true)
    }
}

/**
 *  Watch target based on its type
 */
function watch (obj) {
    if (isArray(obj)) {
        watchArray(obj)
    } else {
        watchObject(obj)
    }
}

/**
 *  Augment target objects with modified
 *  methods
 */
function augment (target, src) {
    if (hasProto) {
        target.__proto__ = src
    } else {
        for (var key in src) {
            def(target, key, src[key])
        }
    }
}

/**
 *  Watch an Object, recursive.
 */
function watchObject (obj) {
    augment(obj, ObjProxy)
    for (var key in obj) {
        convertKey(obj, key)
    }
}

/**
 *  Watch an Array, overload mutation methods
 *  and add augmentations by intercepting the prototype chain
 */
function watchArray (arr) {
    augment(arr, ArrayProxy)
    linkArrayElements(arr, arr)
}

/**
 *  Define accessors for a property on an Object
 *  so it emits get/set events.
 *  Then watch the value itself.
 */
function convertKey (obj, key, propagate) {
    var keyPrefix = key.charAt(0)
    if (keyPrefix === '$' || keyPrefix === '_') {
        return
    }
    // emit set on bind
    // this means when an object is observed it will emit
    // a first batch of set events.
    var emitter = obj.__emitter__,
        values  = emitter.values

    init(obj[key], propagate)

    oDef(obj, key, {
        enumerable: true,
        configurable: true,
        get: function () {
            var value = values[key]
            // only emit get on tip values
            if (pub.shouldGet) {
                emitter.emit('get', key)
            }
            return value
        },
        set: function (newVal) {
            var oldVal = values[key]
            unobserve(oldVal, key, emitter)
            copyPaths(newVal, oldVal)
            // an immediate property should notify its parent
            // to emit set for itself too
            init(newVal, true)
        }
    })

    function init (val, propagate) {
        values[key] = val
        emitter.emit('set', key, val, propagate)
        if (isArray(val)) {
            emitter.emit('set', key + '.length', val.length, propagate)
        }
        observe(val, key, emitter)
    }
}

/**
 *  When a value that is already converted is
 *  observed again by another observer, we can skip
 *  the watch conversion and simply emit set event for
 *  all of its properties.
 */
function emitSet (obj) {
    var emitter = obj && obj.__emitter__
    if (!emitter) return
    if (isArray(obj)) {
        emitter.emit('set', 'length', obj.length)
    } else {
        var key, val
        for (key in obj) {
            val = obj[key]
            emitter.emit('set', key, val)
            emitSet(val)
        }
    }
}

/**
 *  Make sure all the paths in an old object exists
 *  in a new object.
 *  So when an object changes, all missing keys will
 *  emit a set event with undefined value.
 */
function copyPaths (newObj, oldObj) {
    if (!isObject(newObj) || !isObject(oldObj)) {
        return
    }
    var path, oldVal, newVal
    for (path in oldObj) {
        if (!(hasOwn.call(newObj, path))) {
            oldVal = oldObj[path]
            if (isArray(oldVal)) {
                newObj[path] = []
            } else if (isObject(oldVal)) {
                newVal = newObj[path] = {}
                copyPaths(newVal, oldVal)
            } else {
                newObj[path] = undefined
            }
        }
    }
}

/**
 *  walk along a path and make sure it can be accessed
 *  and enumerated in that object
 */
function ensurePath (obj, key) {
    var path = key.split('.'), sec
    for (var i = 0, d = path.length - 1; i < d; i++) {
        sec = path[i]
        if (!obj[sec]) {
            obj[sec] = {}
            if (obj.__emitter__) convertKey(obj, sec)
        }
        obj = obj[sec]
    }
    if (isObject(obj)) {
        sec = path[i]
        if (!(hasOwn.call(obj, sec))) {
            obj[sec] = undefined
            if (obj.__emitter__) convertKey(obj, sec)
        }
    }
}

// Main API Methods -----------------------------------------------------------

/**
 *  Observe an object with a given path,
 *  and proxy get/set/mutate events to the provided observer.
 */
function observe (obj, rawPath, observer) {

    if (!isWatchable(obj)) return

    var path = rawPath ? rawPath + '.' : '',
        alreadyConverted = convert(obj),
        emitter = obj.__emitter__

    // setup proxy listeners on the parent observer.
    // we need to keep reference to them so that they
    // can be removed when the object is un-observed.
    observer.proxies = observer.proxies || {}
    var proxies = observer.proxies[path] = {
        get: function (key) {
            observer.emit('get', path + key)
        },
        set: function (key, val, propagate) {
            if (key) observer.emit('set', path + key, val)
            // also notify observer that the object itself changed
            // but only do so when it's a immediate property. this
            // avoids duplicate event firing.
            if (rawPath && propagate) {
                observer.emit('set', rawPath, obj, true)
            }
        },
        mutate: function (key, val, mutation) {
            // if the Array is a root value
            // the key will be null
            var fixedPath = key ? path + key : rawPath
            observer.emit('mutate', fixedPath, val, mutation)
            // also emit set for Array's length when it mutates
            var m = mutation.method
            if (m !== 'sort' && m !== 'reverse') {
                observer.emit('set', fixedPath + '.length', val.length)
            }
        }
    }

    // attach the listeners to the child observer.
    // now all the events will propagate upwards.
    emitter
        .on('get', proxies.get)
        .on('set', proxies.set)
        .on('mutate', proxies.mutate)

    if (alreadyConverted) {
        // for objects that have already been converted,
        // emit set events for everything inside
        emitSet(obj)
    } else {
        watch(obj)
    }
}

/**
 *  Cancel observation, turn off the listeners.
 */
function unobserve (obj, path, observer) {

    if (!obj || !obj.__emitter__) return

    path = path ? path + '.' : ''
    var proxies = observer.proxies[path]
    if (!proxies) return

    // turn off listeners
    obj.__emitter__
        .off('get', proxies.get)
        .off('set', proxies.set)
        .off('mutate', proxies.mutate)

    // remove reference
    observer.proxies[path] = null
}

// Expose API -----------------------------------------------------------------

var pub = module.exports = {

    // whether to emit get events
    // only enabled during dependency parsing
    shouldGet   : false,

    observe     : observe,
    unobserve   : unobserve,
    ensurePath  : ensurePath,
    copyPaths   : copyPaths,
    watch       : watch,
    convert     : convert,
    convertKey  : convertKey
}
},{"./emitter":32,"./utils":41}],38:[function(require,module,exports){
var toFragment = require('./fragment');

/**
 * Parses a template string or node and normalizes it into a
 * a node that can be used as a partial of a template option
 *
 * Possible values include
 * id selector: '#some-template-id'
 * template string: '<div><span>my template</span></div>'
 * DocumentFragment object
 * Node object of type Template
 */
module.exports = function(template) {
    var templateNode;

    if (template instanceof window.DocumentFragment) {
        // if the template is already a document fragment -- do nothing
        return template
    }

    if (typeof template === 'string') {
        // template by ID
        if (template.charAt(0) === '#') {
            templateNode = document.getElementById(template.slice(1))
            if (!templateNode) return
        } else {
            return toFragment(template)
        }
    } else if (template.nodeType) {
        templateNode = template
    } else {
        return
    }

    // if its a template tag and the browser supports it,
    // its content is already a document fragment!
    if (templateNode.tagName === 'TEMPLATE' && templateNode.content) {
        return templateNode.content
    }

    if (templateNode.tagName === 'SCRIPT') {
        return toFragment(templateNode.innerHTML)
    }

    return toFragment(templateNode.outerHTML);
}

},{"./fragment":35}],39:[function(require,module,exports){
var openChar        = '{',
    endChar         = '}',
    ESCAPE_RE       = /[-.*+?^${}()|[\]\/\\]/g,
    // lazy require
    Directive

exports.Regex = buildInterpolationRegex()

function buildInterpolationRegex () {
    var open = escapeRegex(openChar),
        end  = escapeRegex(endChar)
    return new RegExp(open + open + open + '?(.+?)' + end + '?' + end + end)
}

function escapeRegex (str) {
    return str.replace(ESCAPE_RE, '\\$&')
}

function setDelimiters (delimiters) {
    openChar = delimiters[0]
    endChar = delimiters[1]
    exports.delimiters = delimiters
    exports.Regex = buildInterpolationRegex()
}

/** 
 *  Parse a piece of text, return an array of tokens
 *  token types:
 *  1. plain string
 *  2. object with key = binding key
 *  3. object with key & html = true
 */
function parse (text) {
    if (!exports.Regex.test(text)) return null
    var m, i, token, match, tokens = []
    /* jshint boss: true */
    while (m = text.match(exports.Regex)) {
        i = m.index
        if (i > 0) tokens.push(text.slice(0, i))
        token = { key: m[1].trim() }
        match = m[0]
        token.html =
            match.charAt(2) === openChar &&
            match.charAt(match.length - 3) === endChar
        tokens.push(token)
        text = text.slice(i + m[0].length)
    }
    if (text.length) tokens.push(text)
    return tokens
}

/**
 *  Parse an attribute value with possible interpolation tags
 *  return a Directive-friendly expression
 *
 *  e.g.  a {{b}} c  =>  "a " + b + " c"
 */
function parseAttr (attr) {
    Directive = Directive || require('./directive')
    var tokens = parse(attr)
    if (!tokens) return null
    if (tokens.length === 1) return tokens[0].key
    var res = [], token
    for (var i = 0, l = tokens.length; i < l; i++) {
        token = tokens[i]
        res.push(
            token.key
                ? inlineFilters(token.key)
                : ('"' + token + '"')
        )
    }
    return res.join('+')
}

/**
 *  Inlines any possible filters in a binding
 *  so that we can combine everything into a huge expression
 */
function inlineFilters (key) {
    if (key.indexOf('|') > -1) {
        var dirs = Directive.parse(key),
            dir = dirs && dirs[0]
        if (dir && dir.filters) {
            key = Directive.inlineFilters(
                dir.key,
                dir.filters
            )
        }
    }
    return '(' + key + ')'
}

exports.parse         = parse
exports.parseAttr     = parseAttr
exports.setDelimiters = setDelimiters
exports.delimiters    = [openChar, endChar]
},{"./directive":21}],40:[function(require,module,exports){
var endEvents  = sniffEndEvents(),
    config     = require('./config'),
    // batch enter animations so we only force the layout once
    Batcher    = require('./batcher'),
    batcher    = new Batcher(),
    // cache timer functions
    setTO      = window.setTimeout,
    clearTO    = window.clearTimeout,
    // exit codes for testing
    codes = {
        CSS_E     : 1,
        CSS_L     : 2,
        JS_E      : 3,
        JS_L      : 4,
        CSS_SKIP  : -1,
        JS_SKIP   : -2,
        JS_SKIP_E : -3,
        JS_SKIP_L : -4,
        INIT      : -5,
        SKIP      : -6
    }

// force layout before triggering transitions/animations
batcher._preFlush = function () {
    /* jshint unused: false */
    var f = document.body.offsetHeight
}

/**
 *  stage:
 *    1 = enter
 *    2 = leave
 */
var transition = module.exports = function (el, stage, cb, compiler) {

    var changeState = function () {
        cb()
        compiler.execHook(stage > 0 ? 'attached' : 'detached')
    }

    if (compiler.init) {
        changeState()
        return codes.INIT
    }

    var hasTransition = el.vue_trans === '',
        hasAnimation  = el.vue_anim === '',
        effectId      = el.vue_effect

    if (effectId) {
        return applyTransitionFunctions(
            el,
            stage,
            changeState,
            effectId,
            compiler
        )
    } else if (hasTransition || hasAnimation) {
        return applyTransitionClass(
            el,
            stage,
            changeState,
            hasAnimation
        )
    } else {
        changeState()
        return codes.SKIP
    }

}

/**
 *  Togggle a CSS class to trigger transition
 */
function applyTransitionClass (el, stage, changeState, hasAnimation) {

    if (!endEvents.trans) {
        changeState()
        return codes.CSS_SKIP
    }

    // if the browser supports transition,
    // it must have classList...
    var onEnd,
        classList        = el.classList,
        existingCallback = el.vue_trans_cb,
        enterClass       = config.enterClass,
        leaveClass       = config.leaveClass,
        endEvent         = hasAnimation ? endEvents.anim : endEvents.trans

    // cancel unfinished callbacks and jobs
    if (existingCallback) {
        el.removeEventListener(endEvent, existingCallback)
        classList.remove(enterClass)
        classList.remove(leaveClass)
        el.vue_trans_cb = null
    }

    if (stage > 0) { // enter

        // set to enter state before appending
        classList.add(enterClass)
        // append
        changeState()
        // trigger transition
        if (!hasAnimation) {
            batcher.push({
                execute: function () {
                    classList.remove(enterClass)
                }
            })
        } else {
            onEnd = function (e) {
                if (e.target === el) {
                    el.removeEventListener(endEvent, onEnd)
                    el.vue_trans_cb = null
                    classList.remove(enterClass)
                }
            }
            el.addEventListener(endEvent, onEnd)
            el.vue_trans_cb = onEnd
        }
        return codes.CSS_E

    } else { // leave

        if (el.offsetWidth || el.offsetHeight) {
            // trigger hide transition
            classList.add(leaveClass)
            onEnd = function (e) {
                if (e.target === el) {
                    el.removeEventListener(endEvent, onEnd)
                    el.vue_trans_cb = null
                    // actually remove node here
                    changeState()
                    classList.remove(leaveClass)
                }
            }
            // attach transition end listener
            el.addEventListener(endEvent, onEnd)
            el.vue_trans_cb = onEnd
        } else {
            // directly remove invisible elements
            changeState()
        }
        return codes.CSS_L
        
    }

}

function applyTransitionFunctions (el, stage, changeState, effectId, compiler) {

    var funcs = compiler.getOption('effects', effectId)
    if (!funcs) {
        changeState()
        return codes.JS_SKIP
    }

    var enter = funcs.enter,
        leave = funcs.leave,
        timeouts = el.vue_timeouts

    // clear previous timeouts
    if (timeouts) {
        var i = timeouts.length
        while (i--) {
            clearTO(timeouts[i])
        }
    }

    timeouts = el.vue_timeouts = []
    function timeout (cb, delay) {
        var id = setTO(function () {
            cb()
            timeouts.splice(timeouts.indexOf(id), 1)
            if (!timeouts.length) {
                el.vue_timeouts = null
            }
        }, delay)
        timeouts.push(id)
    }

    if (stage > 0) { // enter
        if (typeof enter !== 'function') {
            changeState()
            return codes.JS_SKIP_E
        }
        enter(el, changeState, timeout)
        return codes.JS_E
    } else { // leave
        if (typeof leave !== 'function') {
            changeState()
            return codes.JS_SKIP_L
        }
        leave(el, changeState, timeout)
        return codes.JS_L
    }

}

/**
 *  Sniff proper transition end event name
 */
function sniffEndEvents () {
    var el = document.createElement('vue'),
        defaultEvent = 'transitionend',
        events = {
            'webkitTransition' : 'webkitTransitionEnd',
            'transition'       : defaultEvent,
            'mozTransition'    : defaultEvent
        },
        ret = {}
    for (var name in events) {
        if (el.style[name] !== undefined) {
            ret.trans = events[name]
            break
        }
    }
    ret.anim = el.style.animation === ''
        ? 'animationend'
        : 'webkitAnimationEnd'
    return ret
}

// Expose some stuff for testing purposes
transition.codes = codes
transition.sniff = sniffEndEvents
},{"./batcher":16,"./config":19}],41:[function(require,module,exports){
var config       = require('./config'),
    toString     = ({}).toString,
    win          = window,
    console      = win.console,
    def          = Object.defineProperty,
    OBJECT       = 'object',
    THIS_RE      = /[^\w]this[^\w]/,
    BRACKET_RE_S = /\['([^']+)'\]/g,
    BRACKET_RE_D = /\["([^"]+)"\]/g,
    hasClassList = 'classList' in document.documentElement,
    ViewModel // late def

var defer =
    win.requestAnimationFrame ||
    win.webkitRequestAnimationFrame ||
    win.setTimeout

/**
 *  Normalize keypath with possible brackets into dot notations
 */
function normalizeKeypath (key) {
    return key.indexOf('[') < 0
        ? key
        : key.replace(BRACKET_RE_S, '.$1')
             .replace(BRACKET_RE_D, '.$1')
}

var utils = module.exports = {

    /**
     *  Convert a string template to a dom fragment
     */
    toFragment: require('./fragment'),

    /**
     *  Parse the various types of template options
     */
    parseTemplateOption: require('./template-parser.js'),

    /**
     *  get a value from an object keypath
     */
    get: function (obj, key) {
        /* jshint eqeqeq: false */
        key = normalizeKeypath(key)
        if (key.indexOf('.') < 0) {
            return obj[key]
        }
        var path = key.split('.'),
            d = -1, l = path.length
        while (++d < l && obj != null) {
            obj = obj[path[d]]
        }
        return obj
    },

    /**
     *  set a value to an object keypath
     */
    set: function (obj, key, val) {
        /* jshint eqeqeq: false */
        key = normalizeKeypath(key)
        if (key.indexOf('.') < 0) {
            obj[key] = val
            return
        }
        var path = key.split('.'),
            d = -1, l = path.length - 1
        while (++d < l) {
            if (obj[path[d]] == null) {
                obj[path[d]] = {}
            }
            obj = obj[path[d]]
        }
        obj[path[d]] = val
    },

    /**
     *  return the base segment of a keypath
     */
    baseKey: function (key) {
        return key.indexOf('.') > 0
            ? key.split('.')[0]
            : key
    },

    /**
     *  Create a prototype-less object
     *  which is a better hash/map
     */
    hash: function () {
        return Object.create(null)
    },

    /**
     *  get an attribute and remove it.
     */
    attr: function (el, type) {
        var attr = config.prefix + '-' + type,
            val = el.getAttribute(attr)
        if (val !== null) {
            el.removeAttribute(attr)
        }
        return val
    },

    /**
     *  Define an ienumerable property
     *  This avoids it being included in JSON.stringify
     *  or for...in loops.
     */
    defProtected: function (obj, key, val, enumerable, writable) {
        def(obj, key, {
            value        : val,
            enumerable   : enumerable,
            writable     : writable,
            configurable : true
        })
    },

    /**
     *  A less bullet-proof but more efficient type check
     *  than Object.prototype.toString
     */
    isObject: function (obj) {
        return typeof obj === OBJECT && obj && !Array.isArray(obj)
    },

    /**
     *  A more accurate but less efficient type check
     */
    isTrueObject: function (obj) {
        return toString.call(obj) === '[object Object]'
    },

    /**
     *  Most simple bind
     *  enough for the usecase and fast than native bind()
     */
    bind: function (fn, ctx) {
        return function (arg) {
            return fn.call(ctx, arg)
        }
    },

    /**
     *  Make sure null and undefined output empty string
     */
    guard: function (value) {
        /* jshint eqeqeq: false, eqnull: true */
        return value == null
            ? ''
            : (typeof value == 'object')
                ? JSON.stringify(value)
                : value
    },

    /**
     *  When setting value on the VM, parse possible numbers
     */
    checkNumber: function (value) {
        return (isNaN(value) || value === null || typeof value === 'boolean')
            ? value
            : Number(value)
    },

    /**
     *  simple extend
     */
    extend: function (obj, ext) {
        for (var key in ext) {
            if (obj[key] !== ext[key]) {
                obj[key] = ext[key]
            }
        }
        return obj
    },

    /**
     *  filter an array with duplicates into uniques
     */
    unique: function (arr) {
        var hash = utils.hash(),
            i = arr.length,
            key, res = []
        while (i--) {
            key = arr[i]
            if (hash[key]) continue
            hash[key] = 1
            res.push(key)
        }
        return res
    },

    /**
     *  Convert the object to a ViewModel constructor
     *  if it is not already one
     */
    toConstructor: function (obj) {
        ViewModel = ViewModel || require('./viewmodel')
        return utils.isObject(obj)
            ? ViewModel.extend(obj)
            : typeof obj === 'function'
                ? obj
                : null
    },

    /**
     *  Check if a filter function contains references to `this`
     *  If yes, mark it as a computed filter.
     */
    checkFilter: function (filter) {
        if (THIS_RE.test(filter.toString())) {
            filter.computed = true
        }
    },

    /**
     *  convert certain option values to the desired format.
     */
    processOptions: function (options) {
        var components = options.components,
            partials   = options.partials,
            template   = options.template,
            filters    = options.filters,
            key
        if (components) {
            for (key in components) {
                components[key] = utils.toConstructor(components[key])
            }
        }
        if (partials) {
            for (key in partials) {
                partials[key] = utils.parseTemplateOption(partials[key])
            }
        }
        if (filters) {
            for (key in filters) {
                utils.checkFilter(filters[key])
            }
        }
        if (template) {
            options.template = utils.parseTemplateOption(template)
        }
    },

    /**
     *  used to defer batch updates
     */
    nextTick: function (cb) {
        defer(cb, 0)
    },

    /**
     *  add class for IE9
     *  uses classList if available
     */
    addClass: function (el, cls) {
        if (hasClassList) {
            el.classList.add(cls)
        } else {
            var cur = ' ' + el.className + ' '
            if (cur.indexOf(' ' + cls + ' ') < 0) {
                el.className = (cur + cls).trim()
            }
        }
    },

    /**
     *  remove class for IE9
     */
    removeClass: function (el, cls) {
        if (hasClassList) {
            el.classList.remove(cls)
        } else {
            var cur = ' ' + el.className + ' ',
                tar = ' ' + cls + ' '
            while (cur.indexOf(tar) >= 0) {
                cur = cur.replace(tar, ' ')
            }
            el.className = cur.trim()
        }
    },

    /**
     *  Convert an object to Array
     *  used in v-repeat and array filters
     */
    objectToArray: function (obj) {
        var res = [], val, data
        for (var key in obj) {
            val = obj[key]
            data = utils.isObject(val)
                ? val
                : { $value: val }
            data.$key = key
            res.push(data)
        }
        return res
    }
}

enableDebug()
function enableDebug () {
    /**
     *  log for debugging
     */
    utils.log = function (msg) {
        if (config.debug && console) {
            console.log(msg)
        }
    }
    
    /**
     *  warnings, traces by default
     *  can be suppressed by `silent` option.
     */
    utils.warn = function (msg) {
        if (!config.silent && console) {
            console.warn(msg)
            if (config.debug && console.trace) {
                console.trace()
            }
        }
    }
}
},{"./config":19,"./fragment":35,"./template-parser.js":38,"./viewmodel":42}],42:[function(require,module,exports){
var Compiler   = require('./compiler'),
    utils      = require('./utils'),
    transition = require('./transition'),
    Batcher    = require('./batcher'),
    slice      = [].slice,
    def        = utils.defProtected,
    nextTick   = utils.nextTick,

    // batch $watch callbacks
    watcherBatcher = new Batcher(),
    watcherId      = 1

/**
 *  ViewModel exposed to the user that holds data,
 *  computed properties, event handlers
 *  and a few reserved methods
 */
function ViewModel (options) {
    // compile if options passed, if false return. options are passed directly to compiler
    if (options === false) return
    new Compiler(this, options)
}

// All VM prototype methods are inenumerable
// so it can be stringified/looped through as raw data
var VMProto = ViewModel.prototype

/**
 *  init allows config compilation after instantiation:
 *    var a = new Vue(false)
 *    a.init(config)
 */
def(VMProto, '$init', function (options) {
    new Compiler(this, options)
})

/**
 *  Convenience function to get a value from
 *  a keypath
 */
def(VMProto, '$get', function (key) {
    var val = utils.get(this, key)
    return val === undefined && this.$parent
        ? this.$parent.$get(key)
        : val
})

/**
 *  Convenience function to set an actual nested value
 *  from a flat key string. Used in directives.
 */
def(VMProto, '$set', function (key, value) {
    utils.set(this, key, value)
})

/**
 *  watch a key on the viewmodel for changes
 *  fire callback with new value
 */
def(VMProto, '$watch', function (key, callback) {
    // save a unique id for each watcher
    var id = watcherId++,
        self = this
    function on () {
        var args = slice.call(arguments)
        watcherBatcher.push({
            id: id,
            override: true,
            execute: function () {
                callback.apply(self, args)
            }
        })
    }
    callback._fn = on
    self.$compiler.observer.on('change:' + key, on)
})

/**
 *  unwatch a key
 */
def(VMProto, '$unwatch', function (key, callback) {
    // workaround here
    // since the emitter module checks callback existence
    // by checking the length of arguments
    var args = ['change:' + key],
        ob = this.$compiler.observer
    if (callback) args.push(callback._fn)
    ob.off.apply(ob, args)
})

/**
 *  unbind everything, remove everything
 */
def(VMProto, '$destroy', function (noRemove) {
    this.$compiler.destroy(noRemove)
})

/**
 *  broadcast an event to all child VMs recursively.
 */
def(VMProto, '$broadcast', function () {
    var children = this.$compiler.children,
        i = children.length,
        child
    while (i--) {
        child = children[i]
        child.emitter.applyEmit.apply(child.emitter, arguments)
        child.vm.$broadcast.apply(child.vm, arguments)
    }
})

/**
 *  emit an event that propagates all the way up to parent VMs.
 */
def(VMProto, '$dispatch', function () {
    var compiler = this.$compiler,
        emitter = compiler.emitter,
        parent = compiler.parent
    emitter.applyEmit.apply(emitter, arguments)
    if (parent) {
        parent.vm.$dispatch.apply(parent.vm, arguments)
    }
})

/**
 *  delegate on/off/once to the compiler's emitter
 */
;['emit', 'on', 'off', 'once'].forEach(function (method) {
    // internal emit has fixed number of arguments.
    // exposed emit uses the external version
    // with fn.apply.
    var realMethod = method === 'emit'
        ? 'applyEmit'
        : method
    def(VMProto, '$' + method, function () {
        var emitter = this.$compiler.emitter
        emitter[realMethod].apply(emitter, arguments)
    })
})

// DOM convenience methods

def(VMProto, '$appendTo', function (target, cb) {
    target = query(target)
    var el = this.$el
    transition(el, 1, function () {
        target.appendChild(el)
        if (cb) nextTick(cb)
    }, this.$compiler)
})

def(VMProto, '$remove', function (cb) {
    var el = this.$el
    transition(el, -1, function () {
        if (el.parentNode) {
            el.parentNode.removeChild(el)
        }
        if (cb) nextTick(cb)
    }, this.$compiler)
})

def(VMProto, '$before', function (target, cb) {
    target = query(target)
    var el = this.$el
    transition(el, 1, function () {
        target.parentNode.insertBefore(el, target)
        if (cb) nextTick(cb)
    }, this.$compiler)
})

def(VMProto, '$after', function (target, cb) {
    target = query(target)
    var el = this.$el
    transition(el, 1, function () {
        if (target.nextSibling) {
            target.parentNode.insertBefore(el, target.nextSibling)
        } else {
            target.parentNode.appendChild(el)
        }
        if (cb) nextTick(cb)
    }, this.$compiler)
})

function query (el) {
    return typeof el === 'string'
        ? document.querySelector(el)
        : el
}

module.exports = ViewModel

},{"./batcher":16,"./compiler":18,"./transition":40,"./utils":41}],43:[function(require,module,exports){
"use strict";
var co = require('co'),
    storage = require('asyncstorage'),
    vkApi = require('./lib/_vkApi_mod.js'),
    StationEngine = require('./lib/_stationEngine.js'),
    adviceDog = require('./lib/_adviceDog.js');
var ownTracks = Promise.all([vkApi('audio.get', {count: 100})]).then((function($__3) {
  var items = $__3[0].items;
  return Promise.resolve(items);
}));
var MIN_STATION_POST_TRACK_RATIO = 1;
var MIN_STATION_MUSICAL_POST_RATIO = .5;
var genreCompatibilityUserGroupsCounter = 1;
module.exports = function registerGroup(group, additionalOpts, self) {
  var opts = arguments[3] !== (void 0) ? arguments[3] : {};
  if (self.stationsMap[group.id])
    return;
  var obj = self.stationsMap[group.id] = getGroupObj(group, additionalOpts);
  Object.defineProperty(obj, '_engine', {
    configurable: true,
    get: function() {
      delete obj._engine;
      obj._engine = new StationEngine(obj.tracks, (function(track) {
        return obj.currentTrack = self.currentTrack = track;
      }));
      return obj._engine;
    }
  });
  co($traceurRuntime.initGeneratorFunction(function $__6() {
    var isMusicalCached,
        priorityIncrement,
        $__0,
        $__1,
        loadCount,
        priority,
        posts,
        postsWithTracks,
        groupTracks,
        groupTags,
        userTracks,
        userTags,
        isTrackCountEnough,
        isPostCountEnough,
        isMusical,
        genreCompatibility,
        definitelyBadThreshold,
        $__7,
        $__8,
        $__9,
        $__10,
        $__11,
        $__12,
        $__13,
        $__14,
        $__15,
        $__16,
        $__17,
        $__18,
        $__19,
        $__20,
        $__21,
        $__22,
        $__23,
        $__24,
        $__25,
        $__26,
        $__27,
        $__28,
        $__29,
        $__30,
        $__31,
        $__32,
        $__33,
        $__34,
        $__35,
        $__36;
    return $traceurRuntime.createGeneratorInstance(function($ctx) {
      while (true)
        switch ($ctx.state) {
          case 0:
            $__7 = storage.get;
            $__8 = obj.id;
            $__9 = $__7.call(storage, 'groups::byId::' + $__8 + '::isMusical');
            $ctx.state = 6;
            break;
          case 6:
            $ctx.state = 2;
            return $__9;
          case 2:
            $__10 = $ctx.sent;
            $ctx.state = 4;
            break;
          case 4:
            isMusicalCached = $__10;
            priorityIncrement = 0;
            $ctx.state = 8;
            break;
          case 8:
            $__0 = ((isMusicalCached || opts.autoplay) ? [40] : [5, 20])[$traceurRuntime.toProperty(Symbol.iterator)]();
            $ctx.state = 29;
            break;
          case 29:
            $ctx.state = (!($__1 = $__0.next()).done) ? 30 : 32;
            break;
          case 30:
            loadCount = $__1.value;
            $ctx.state = 31;
            break;
          case 31:
            $__11 = opts.autoplay;
            $__12 = obj.is_member;
            $__13 = getBoolPriority($__11, isMusicalCached, $__12);
            priority = $__13;
            $__14 = obj.id;
            $__15 = getGroupPosts($__14, loadCount, priority + priorityIncrement * 30);
            $ctx.state = 18;
            break;
          case 18:
            $ctx.state = 10;
            return $__15;
          case 10:
            $__16 = $ctx.sent;
            $ctx.state = 12;
            break;
          case 12:
            posts = $__16;
            $__17 = posts.filter;
            $__25 = function(post) {
              return $__18 = post.attachments, $__18 ? ($__19 = $__18) : ($__19 = []), $__20 = $__19.filter, $__22 = function(a) {
                return $__21 = a.audio, $__21;
              }, $__23 = $__20.call($__19, $__22), $__24 = $__23.length, $__24;
            };
            $__26 = $__17.call(posts, $__25);
            postsWithTracks = $__26;
            $__27 = getTracksFromPosts(posts);
            groupTracks = $__27;
            $__28 = getTagsForAdviceDog(groupTracks);
            groupTags = $__28;
            $ctx.state = 20;
            break;
          case 20:
            $ctx.state = 14;
            return ownTracks;
          case 14:
            $__29 = $ctx.sent;
            $ctx.state = 16;
            break;
          case 16:
            userTracks = $__29;
            $__30 = getTagsForAdviceDog(userTracks);
            userTags = $__30;
            $__31 = groupTracks.length;
            $__32 = posts.length;
            $__33 = $__31 / $__32;
            isTrackCountEnough = $__33 >= MIN_STATION_POST_TRACK_RATIO;
            $__34 = postsWithTracks.length;
            $__35 = posts.length;
            $__36 = $__34 / $__35;
            isPostCountEnough = $__36 >= MIN_STATION_MUSICAL_POST_RATIO;
            obj.isMusical = isTrackCountEnough && isPostCountEnough;
            isMusical = isTrackCountEnough && isPostCountEnough;
            $ctx.state = 22;
            break;
          case 22:
            if (opts.autoplay && groupTracks.length > 5)
              isMusical = true;
            $ctx.state = 27;
            break;
          case 27:
            $ctx.state = (!isMusical) ? 32 : 24;
            break;
          case 24:
            priorityIncrement++;
            $ctx.state = 29;
            break;
          case 32:
            $ctx.state = (isMusical) ? 52 : 56;
            break;
          case 52:
            genreCompatibility = obj._originalGenreCompatibility = obj.genreCompatibility = 1 - getScaledAngleForVectors(userTags, groupTags);
            $ctx.state = 53;
            break;
          case 53:
            $ctx.state = (obj.is_member) ? 49 : 48;
            break;
          case 49:
            adviceDog(obj.id, groupTags, .9);
            obj.genreCompatibility = 2 + 1 / genreCompatibilityUserGroupsCounter++;
            $ctx.state = 50;
            break;
          case 48:
            $ctx.state = (opts.autoplay) ? 50 : 44;
            break;
          case 44:
            definitelyBadThreshold = .4;
            $ctx.state = 45;
            break;
          case 45:
            $ctx.state = (genreCompatibility >= .9) ? 41 : 40;
            break;
          case 41:
            adviceDog(obj.id, groupTags, .9, (function(genreCompatibility) {
              return obj.genreCompatibility = Math.max(.7, genreCompatibility);
            }));
            $ctx.state = 50;
            break;
          case 40:
            $ctx.state = (genreCompatibility < definitelyBadThreshold) ? 36 : 38;
            break;
          case 36:
            adviceDog(obj.id, groupTags, Math.pow(genreCompatibility / definitelyBadThreshold, 2) * definitelyBadThreshold);
            self.stationsMap[group.id] = true;
            self.stations.$remove(obj);
            $ctx.state = 37;
            break;
          case 37:
            $ctx.state = -2;
            break;
          case 38:
            adviceDog(obj.id, groupTags, genreCompatibility, (function(genreCompatibility) {
              return obj.genreCompatibility = Math.min(.9, genreCompatibility);
            }));
            $ctx.state = 50;
            break;
          case 50:
            obj.tracks = groupTracks;
            obj.genres = groupTags;
            storage.set('groups::byId::' + obj.id + '::isMusical', isMusical);
            if (opts.autoplay) {
              self.stations.push(obj);
              self.$emit('stationChange', {station: obj});
            } else
              show(obj);
            $ctx.state = -2;
            break;
          case 56:
            self.stationsMap[group.id] = true;
            self.stations.$remove(obj);
            $ctx.state = -2;
            break;
          default:
            return $ctx.end();
        }
    }, $__6, this);
  })())();
  function show(obj) {
    if (obj._show !== undefined)
      return;
    obj._show = false;
    var albumImage = new Image();
    albumImage.onload = function() {
      albumImage.onload = function() {};
      obj._show = true;
      self.stations.push(obj);
    };
    albumImage.src = obj.avatar;
    if (albumImage.complete)
      albumImage.onload();
  }
};
module.exports.bad = function markGroupAsBad(obj) {
  getGroupPosts(obj.id, 20, -20).then(function(posts) {
    adviceDog(obj.id, getTagsForAdviceDog(getTracksFromPosts(posts)), 0);
  });
};
function getTagsForAdviceDog(tracks) {
  var filteredTracks = tracks.filter((function($__3) {
    var genre_id = $__3.genre_id;
    return genre_id && genre_id != 18 && genre_id <= 22;
  }));
  var genreMap = filteredTracks.map((function($__3) {
    var genre_id = $__3.genre_id;
    return genre_id;
  })).reduce((function(acc, id) {
    return (acc[id] = (acc[id] || 0) + 1) && acc;
  }), {});
  var out = [];
  for (var i = 0; i <= 22; i++)
    out[i] = (genreMap[i] || 0) / filteredTracks.length;
  return out;
}
function getBoolPriority(bool) {
  for (var bools = [],
      $__2 = 1; $__2 < arguments.length; $__2++)
    bools[$__2 - 1] = arguments[$__2];
  if (bools.length > 0)
    return getBoolPriority(bool) + getBoolPriority.apply(null, $traceurRuntime.spread([bools.shift()], bools));
  if (bool === false)
    return -10;
  if (bool === true)
    return 10;
  return 0;
}
function getGroupPosts(id) {
  var count = arguments[1] !== (void 0) ? arguments[1] : 10;
  var priority = arguments[2] !== (void 0) ? arguments[2] : 0;
  return vkApi('wall.get', {
    owner_id: -id,
    count: Math.floor(count)
  }, priority).then((function($__3) {
    var items = $__3.items;
    return Promise.resolve(items);
  }));
}
function getTracksFromPosts(posts) {
  return posts.map(function(post) {
    if (!post.attachments)
      return [];
    return post.attachments.filter((function($__3) {
      var audio = $__3.audio;
      return audio;
    })).map((function($__3) {
      var audio = $__3.audio;
      return audio;
    })).map(function(audio) {
      audio._post = post;
      audio.art = post.attachments.map((function($__3) {
        var photo = $__3.photo;
        return photo;
      })).filter((function(a) {
        return a;
      }))[0];
      audio.added = false;
      return audio;
    });
  }).reduce((function(a, b) {
    return a.concat(b);
  }), []);
}
function getScaledAngleForVectors(vec1, vec2) {
  var length = Math.max(vec1.length, vec2.length);
  var scalarMulti = 0;
  for (var i = 0; i < length; i++)
    scalarMulti += vec1[i] * vec2[i] || 0;
  var cosAlpha = scalarMulti / (getLength(vec1) * getLength(vec2));
  var alpha = Math.acos(cosAlpha);
  return 1 - cosAlpha;
}
function getLength(vec) {
  var n = vec.length;
  var length = 0;
  for (var i = 0; i < n; i++)
    length += Math.pow(vec[i] || 0, 2);
  return Math.pow(length, .5);
}
function getTagsForTracks(trackList) {
  var genre_ids = trackList.map((function(el) {
    return el.genre_id;
  })).filter((function(id) {
    return id !== 18;
  })).filter((function(id) {
    return id;
  }));
  var vector_scale = 22;
  var vector = [];
  for (var i = 0; i < vector_scale; i++) {
    vector[i] = genre_ids;
  }
  return trackList.map((function(el) {
    return el.genre_id;
  })).filter((function(id) {
    return id !== 18;
  })).filter((function(id) {
    return id;
  }));
}
function getTopTags(list) {
  var tagsMap = {},
      tags = [];
  for (var $__0 = list[$traceurRuntime.toProperty(Symbol.iterator)](),
      $__1; !($__1 = $__0.next()).done; ) {
    var tag = $__1.value;
    {
      if (tagsMap[tag])
        tagsMap[tag].count++;
      else
        tags.push(tagsMap[tag] = {
          count: 1,
          name: tag
        });
    }
  }
  return tags.sort((function(a, b) {
    return b.count - a.count;
  })).map((function(a) {
    return a.name;
  }));
}
function getGroupObj(group, additionalOpts) {
  var obj = {
    id: group.id,
    avatar: group.photo_200,
    name: group.name,
    screen_name: group.screen_name,
    group_type: group.type,
    is_member: group.is_member,
    shown: false,
    genreCompatibility: 0
  };
  if (additionalOpts instanceof Object)
    for (var $__0 = Object.keys(additionalOpts)[$traceurRuntime.toProperty(Symbol.iterator)](),
        $__1; !($__1 = $__0.next()).done; ) {
      var key = $__1.value;
      obj[key] = additionalOpts[key];
    }
  return obj;
}


//# sourceURL=/Users/rodionov/publicradio/src/_group.js
},{"./lib/_adviceDog.js":48,"./lib/_stationEngine.js":50,"./lib/_vkApi_mod.js":51,"asyncstorage":1,"co":11}],44:[function(require,module,exports){
"use strict";
require('es6ify/node_modules/traceur/bin/traceur-runtime');
var TWEEN = require('tween.js');
requestAnimationFrame(function animate(time) {
  requestAnimationFrame(animate, document.body);
  TWEEN.update(time);
}, document.body);
window.setImmediate = (function() {
  var canPost = typeof window !== 'undefined' && window.postMessage && window.addEventListener;
  if (canPost) {
    var queue = [];
    window.addEventListener('message', function(ev) {
      var source = ev.source;
      if ((source === window || source === null) && ev.data === 'process-tick') {
        ev.stopPropagation();
        if (queue.length > 0) {
          var fn = queue.shift();
          fn();
        }
      }
    }, true);
    return function nextTick(fn) {
      queue.push(fn);
      window.postMessage('process-tick', '*');
    };
  }
  return function nextTick(fn) {
    setTimeout(fn, 0);
  };
})();
var body = document.body,
    timer;
window.addEventListener('scroll', function() {
  clearTimeout(timer);
  if (!body.classList.contains('disable-hover'))
    body.classList.add('disable-hover');
  timer = setTimeout(function() {
    body.classList.remove('disable-hover');
  }, 500);
}, false);
if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: function(searchString, position) {
      position = position || 0;
      return this.lastIndexOf(searchString, position) === position;
    }
  });
}
if (!String.prototype.endsWith) {
  Object.defineProperty(String.prototype, 'endsWith', {value: function(searchString, position) {
      var subjectString = this.toString();
      if (position === undefined || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
    }});
}


//# sourceURL=/Users/rodionov/publicradio/src/_prepare-enviroment.js
},{"es6ify/node_modules/traceur/bin/traceur-runtime":12,"tween.js":15}],45:[function(require,module,exports){
"use strict";
require('./_station.js');


//# sourceURL=/Users/rodionov/publicradio/src/components/_index.js
},{"./_station.js":46}],46:[function(require,module,exports){
"use strict";
var Vue = require('vue'),
    storage = require('asyncstorage');
Vue.component('station', {
  data: {currentTrack: null},
  template: require('../templates/_station.html.jade'),
  ready: function() {
    var self = this;
    var shownTimeout;
    this.$watch('show', function() {
      clearTimeout(shownTimeout);
      shownTimeout = setTimeout(function() {
        self.shown = self.show;
      }, 750);
    });
  },
  methods: {setAsCurrent: function() {
      this.$dispatch('stationChange', {station: this.$data});
    }}
});


//# sourceURL=/Users/rodionov/publicradio/src/components/_station.js
},{"../templates/_station.html.jade":53,"asyncstorage":1,"vue":36}],47:[function(require,module,exports){
"use strict";
"use strict";
require('./_prepare-enviroment');
require('./components/_index');
var Vue = require('vue'),
    co = require('co'),
    Group = require('./_group'),
    storage = require('asyncstorage'),
    vkApi = require('./lib/_vkApi_mod.js'),
    adviceDog = require('./lib/_adviceDog.js');
var badGroups = {
  get: function() {
    return storage.get('groups::bad').then((function(a) {
      return Array.isArray(a) ? a : [];
    }));
  },
  add: function(id) {
    var station = vm.stationMap[id];
    if (station) {
      delete vm.stationMap[id];
      vm.stations.remove(station);
      if (!station.is_member)
        adviceDog(id, getTagsForAdviceDog(station.tracks), 0);
    }
    return storage.get('groups::bad').then(function(groups) {
      if (groups.indexOf(id) === -1) {
        groups.push(id);
        return storage.set('groups::bad', groups);
      } else
        return Promise.resolve();
    });
  }
};
function getTagsForAdviceDog(tracks) {
  var filteredTracks = tracks.filter((function($__4) {
    var genre_id = $__4.genre_id;
    return genre_id && genre_id != 18 && genre_id <= 22;
  }));
  var genreMap = filteredTracks.map((function($__4) {
    var genre_id = $__4.genre_id;
    return genre_id;
  })).reduce((function(acc, id) {
    return (acc[id] = (acc[id] || 0) + 1) && acc;
  }), {});
  var out = [];
  for (var i = 0; i <= 22; i++)
    out[i] = (genreMap[i] || 0) / filteredTracks.length;
  return out;
}
Vue.filter('threshold', function(array, param, count) {
  return array.sort((function(a, b) {
    return b[param] - a[param];
  })).slice(0, Number(count));
});
Vue.directive('tooltip-current-station', {
  isEmpty: true,
  bind: function() {
    var self = this,
        $el = $(this.el);
    $el.tooltipster({
      contentAsHTML: true,
      interactive: true
    }).tooltipster('disable');
    $el.mouseover(function() {
      if (self.vm.currentStation.id)
        $el.tooltipster('enable').tooltipster('content', '<iframe height=440px src=https://vk.com/widget_community.php?app=0&width=300px&_ver=1&gid=' + self.vm.currentStation.id + '&mode=2&color3=ff6d00&height=40000 ></iframe>');
    });
  }
});
Vue.directive('tooltip', {
  isLiteral: true,
  bind: function() {
    var self = this,
        $el = $(this.el);
    $el.tooltipster({
      contentAsHTML: true,
      interactive: true
    }).tooltipster('disable');
    $el.mouseover(function() {
      if (self.vm.currentStation.id)
        $el.tooltipster('enable').tooltipster('content', '<iframe height=440px src=https://vk.com/widget_community.php?app=0&width=300px&_ver=1&gid=' + self.vm.currentStation.id + '&mode=2&color3=ff6d00&height=40000 ></iframe>');
    });
  }
});
var vm = new Vue({
  el: document.querySelector('#content'),
  template: require('./templates/_app.html.jade'),
  data: {
    stations: [],
    suggestedStations: [],
    stationsMap: {},
    currentStation: null,
    currentTrack: null,
    currentProgress: 0,
    anchor: '',
    volume: 100,
    mute: false,
    likedTracks: []
  },
  methods: {
    likeCurrentTrack: function() {
      var self = this;
      var track = this.currentTrack;
      self.likedTracks.push(track);
      co(($traceurRuntime.initGeneratorFunction(function $__7() {
        var session,
            currentAlbum,
            title,
            album_id,
            aid,
            data,
            $__8,
            $__9,
            $__10;
        return $traceurRuntime.createGeneratorInstance(function($ctx) {
          while (true)
            switch ($ctx.state) {
              case 0:
                $ctx.state = 2;
                return vkApi.session;
              case 2:
                session = $ctx.sent;
                $ctx.state = 4;
                break;
              case 4:
                track.added = true;
                window.ga('send', 'event', 'social', 'like', 'track', {
                  group_id: self.currentStation.id,
                  artist: track.artist,
                  genre: track.genre_id,
                  genre_compatibility: self.currentStation.genreCompatibility
                });
                if (!self.currentStation.is_member)
                  self.currentStation.genreCompatibility = Math.max(1, self.currentStation.genreCompatibility + .05);
                $ctx.state = 35;
                break;
              case 35:
                $ctx.state = 6;
                return self.userAlbumsPromise;
              case 6:
                $ctx.maybeThrow();
                $ctx.state = 8;
                break;
              case 8:
                title = 'publicRadio.io // ' + self.currentStation.name + ' (' + self.currentStation.screen_name + ')';
                $ctx.state = 37;
                break;
              case 37:
                $ctx.state = (currentAlbum = self.userAlbums.filter((function($__4) {
                  var title = $__4.title;
                  return title.startsWith('publicRadio.io') && title.endsWith('(' + self.currentStation.screen_name + ')');
                }))[0]) ? 13 : 19;
                break;
              case 13:
                currentAlbum.title = title;
                currentAlbum.album_id = currentAlbum.album_id || currentAlbum.id;
                $ctx.state = 14;
                break;
              case 14:
                $ctx.state = 10;
                return vkApi('audio.editAlbum', currentAlbum, 100);
              case 10:
                $ctx.maybeThrow();
                $ctx.state = 12;
                break;
              case 19:
                $__8 = vkApi('audio.addAlbum', {title: title}, 100);
                $ctx.state = 20;
                break;
              case 20:
                $ctx.state = 16;
                return $__8;
              case 16:
                $__9 = $ctx.sent;
                $ctx.state = 18;
                break;
              case 18:
                $__10 = $__9.album_id;
                album_id = $__10;
                $ctx.state = 22;
                break;
              case 22:
                self.userAlbums.push(currentAlbum = {
                  album_id: album_id,
                  title: title
                });
                $ctx.state = 12;
                break;
              case 12:
                $ctx.state = 27;
                return vkApi('audio.add', {
                  audio_id: track.id,
                  owner_id: track.owner_id
                }, 100);
              case 27:
                aid = $ctx.sent;
                $ctx.state = 29;
                break;
              case 29:
                $ctx.state = 31;
                return [vkApi('audio.moveToAlbum', {
                  album_id: currentAlbum.album_id,
                  audio_ids: aid
                }, 100), vkApi('audio.edit', {
                  owner_id: currentAlbum.owner_id || session.mid,
                  audio_id: aid,
                  title: self.currentTrack.title + ' (найдено на PublicRadio.io)'
                }, 100)];
              case 31:
                data = $ctx.sent;
                $ctx.state = -2;
                break;
              default:
                return $ctx.end();
            }
        }, $__7, this);
      }))())();
    },
    setGroupAsBad: function(groupId) {
      badGroups.add(groupId);
    },
    doMute: function() {
      if (this.volume == 0) {
        this.volume = this._volume != 0 ? this._volume : 100;
      } else {
        this._volume = this.volume;
        this.volume = 0;
      }
    }
  },
  created: function() {
    this.$on('stationChange', function($__4) {
      var station = $__4.station;
      history.replaceState({}, station.name + ' at Public Radio', '?' + station.screen_name);
      this.currentStation = station;
    });
  },
  ready: function() {
    var self = this,
        updateVolume = function() {
          window.globalVolumeLevel = Number(self.volume) * 0.01;
          localStorage.globalVolumeLevel = self.volume;
          if (self.currentStation && self.currentStation._engine && self.currentStation._engine._audio)
            self.currentStation._engine._audio.volume = window.globalVolumeLevel;
        };
    this.$watch('volume', updateVolume);
    this.$watch('mute', updateVolume);
    if (localStorage.globalVolumeLevel && localStorage.globalVolumeLevel != 0)
      self.volume = localStorage.globalVolumeLevel;
    updateVolume();
    window.addEventListener("hashchange", function() {
      self.anchor = document.location.hash.replace('#', '');
    }, false);
    this.$watch('currentStation', function() {
      this.currentStation._engine.enabled = true;
      document.querySelector('#subscribeToGroup').innerHTML = '';
      VK.Widgets.Subscribe("subscribeToGroup", {
        mode: 1,
        soft: 1
      }, -this.currentStation.id);
    });
    VK.Observer.subscribe("widgets.subscribed", function f() {
      self.currentStation.is_member = true;
      window.ga('send', 'event', 'social', 'like', 'group', {
        group_id: self.currentStation.id,
        genre_compatibility: self.currentStation.genreCompatibility
      });
    });
    VK.Observer.subscribe("widgets.unsubscribed", function f() {
      self.currentStation.is_member = false;
      window.ga('send', 'event', 'social', 'dislike', 'group', {
        group_id: self.currentStation.id,
        genre_compatibility: self.currentStation.genreCompatibility
      });
    });
    var group;
    requestAnimationFrame(function tick() {
      requestAnimationFrame(tick, self.$el);
      if (self.currentStation && self.currentStation._engine && self.currentStation._engine._audio)
        self.currentProgress = self.currentStation._engine._audio.currentTime / self.currentStation._engine._audio.duration;
    }, self.$el);
    co(($traceurRuntime.initGeneratorFunction(function $__7() {
      var currentStationName,
          queries,
          $__4,
          badGroupList,
          userGroups,
          popularGroups,
          pickedGroup,
          userGroupIDs,
          group,
          $__0,
          $__1,
          $__2,
          $__3,
          $__11,
          $__12,
          $__13,
          $__14,
          $__15,
          $__16,
          $__17,
          $__18,
          $__19,
          $__20,
          $__21;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              currentStationName = location.search.split('?').slice(-1)[0];
              queries = [badGroups.get(), getUserGroups(), getPopularGroups()];
              if (currentStationName)
                queries.push(vkApi('groups.getById', {
                  group_id: currentStationName,
                  v: '5.25'
                }));
              $ctx.state = 8;
              break;
            case 8:
              $ctx.state = 2;
              return queries;
            case 2:
              $__11 = $ctx.sent;
              $ctx.state = 4;
              break;
            case 4:
              $__4 = $__11;
              $__12 = $__4[0];
              badGroupList = $__12;
              $__13 = $__4[1];
              $__14 = $__13.items;
              userGroups = $__14;
              $__15 = $__4[2];
              $__16 = $__15.items;
              popularGroups = $__16;
              $__17 = $__4[3];
              pickedGroup = $__17;
              $__18 = userGroups.map;
              $__20 = function(group) {
                return $__19 = group.id, $__19;
              };
              $__21 = $__18.call(userGroups, $__20);
              userGroupIDs = $__21;
              $ctx.state = 6;
              break;
            case 6:
              self.badGroups = badGroupList;
              if (Array.isArray(pickedGroup)) {
                group = pickedGroup[0];
                new Group(group, {is_member: userGroups.map((function(el) {
                    return el.id;
                  })).indexOf(group.id) !== -1}, self, {
                  forced: true,
                  autoplay: true
                });
              }
              for ($__0 = userGroups[$traceurRuntime.toProperty(Symbol.iterator)](); !($__1 = $__0.next()).done; ) {
                group = $__1.value;
                if (badGroupList.indexOf(group.id) === -1)
                  new Group(group, {is_member: true}, self);
              }
              for ($__2 = popularGroups[$traceurRuntime.toProperty(Symbol.iterator)](); !($__3 = $__2.next()).done; ) {
                group = $__3.value;
                if (badGroupList.indexOf(group.id) === -1)
                  new Group(group, {is_member: false}, self);
                else
                  Group.bad(group);
              }
              $ctx.state = -2;
              break;
            default:
              return $ctx.end();
          }
      }, $__7, this);
    }))())();
    this.userAlbums = [];
    var r;
    this.userAlbumsPromise = new Promise((function(resolve) {
      return self.userAlbumsPromiseResolve = resolve;
    }));
    co($traceurRuntime.initGeneratorFunction(function $__22() {
      var result,
          requests,
          offset,
          otherResults;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              $ctx.state = 2;
              return vkApi('audio.getAlbums', {
                offset: 0,
                count: 100
              }, 100);
            case 2:
              result = $ctx.sent;
              $ctx.state = 4;
              break;
            case 4:
              requests = [], offset = 0;
              while ((++offset) * 100 < result.count) {
                requests.push(vkApi('audio.getAlbums', {
                  offset: offset * 100,
                  count: 100
                }, 100));
              }
              $ctx.state = 10;
              break;
            case 10:
              $ctx.state = 6;
              return requests;
            case 6:
              otherResults = $ctx.sent;
              $ctx.state = 8;
              break;
            case 8:
              self.userAlbums = [result].concat(otherResults).map((function(result) {
                return result.items;
              })).reduce((function(a, b) {
                return a.concat(b);
              }));
              self.userAlbumsPromiseResolve();
              $ctx.state = -2;
              break;
            default:
              return $ctx.end();
          }
      }, $__22, this);
    })())();
  }
});
var o = {};
Object.defineProperty(window, '$s', {value: o});
window['v' + 'm'] = function(k) {
  if (k === o)
    return this;
}.bind(vm);
function getPopularGroups() {
  return vkApi('groups.search', {
    q: 'music',
    count: 500,
    sort: 1
  }, -20);
}
function getUserGroups() {
  return vkApi('groups.get', {
    filter: 'groups,publics',
    count: 1000,
    extended: 1
  }, 100);
}


//# sourceURL=/Users/rodionov/publicradio/src/fake_e5469746.js
},{"./_group":43,"./_prepare-enviroment":44,"./components/_index":45,"./lib/_adviceDog.js":48,"./lib/_vkApi_mod.js":51,"./templates/_app.html.jade":52,"asyncstorage":1,"co":11,"vue":36}],48:[function(require,module,exports){
"use strict";
var dataMap = {},
    callbackMap = {},
    needUpdate = false;
module.exports = function(id, criteria, result, updateCallback) {
  if (!criteria) {
    delete dataMap[id];
    delete callbackMap[id];
  }
  if (result === true) {
    result = dataMap[id].output[0];
  }
  dataMap[id] = {
    input: criteria,
    output: result !== undefined ? [result] : null,
    id: id
  };
  if (updateCallback)
    callbackMap[id] = updateCallback;
  needUpdate = true;
};


//# sourceURL=/Users/rodionov/publicradio/src/lib/_adviceDog.js
},{}],49:[function(require,module,exports){
"use strict";
module.exports = function player(overrides) {
  var defaults = {
    playerConstructor: function playerConstructor() {
      var audio = document.createElement('audio');
      audio.toJSON = function toJSON() {
        return {
          src: this.src,
          duration: this.duration
        };
      };
      return audio;
    },
    transformSrc: function(src) {
      return src;
    },
    onlyMetadata: false,
    eventInterval: 1000 / 60,
    volume: 1,
    autoplay: true
  };
  if (overrides instanceof Object) {
    Object.keys(overrides).forEach(function(key) {
      defaults[key] = overrides[key];
    });
  }
  return function play(src, opts, cb) {
    if (arguments[arguments.length - 1] instanceof Function) {
      cb = arguments[arguments.length - 1];
      if (cb === opts)
        opts = void 0;
    }
    if (!(opts instanceof Object))
      opts = {};
    var listeners = [],
        interval;
    Object.keys(defaults).forEach(function(key) {
      if (key in opts) {} else
        opts[key] = defaults[key];
    });
    var player = opts.playerConstructor(),
        done = function(event) {
          if (cb instanceof Function)
            cb(event);
        };
    player.addEventListener('ended', ended);
    player.addEventListener('error', error);
    if (opts.autoplay !== false)
      player.autoplay = true;
    player.volume = opts.volume;
    if (opts.onlyMetadata === true)
      player.preload = 'metadata';
    if (src instanceof Function) {
      var alledgedSrc = src();
      if (alledgedSrc && alledgedSrc.then instanceof Function)
        alledgedSrc.then(setSrc);
      else
        setSrc(alledgedSrc);
    } else
      setSrc(src);
    if (opts.error instanceof Function)
      player.addEventListener('playerError', error);
    return Object.create({
      emit: emit,
      play: player.play.bind(player),
      pause: player.pause.bind(player),
      toJSON: player.toJSON.bind(player),
      on: function(event, callback) {
        callback.callback = callback.callback || callback;
        if (event instanceof Function)
          addFnEventListener(event, callback.callback);
        else
          player.addEventListener.apply(player, [arguments[0], arguments[1].callback, arguments[2]]);
      },
      off: function(event) {
        if (event instanceof Function)
          removeFnEventListener(event);
        else
          player.removeEventListener.apply(player, [arguments[0], arguments[1].callback, arguments[2]]);
      },
      one: function(event, callback) {
        var self = this;
        callback.callback = function(e) {
          callback(e);
          self.off(event, callback);
        };
        self.on(event, callback);
      },
      destroy: function() {
        stopEventInterval();
        player.src = '';
        delete player.src;
        player.removeEventListener('ended', ended);
        player.removeEventListener('error', error);
      }
    }, {
      volume: {
        get: function() {
          return player.volume;
        },
        set: function(val) {
          if (Number.isFinite(val) && (val >= 0) && (val <= 1))
            player.volume = val;
          else
            emit('playerError', {
              type: 'validationFailed',
              value: val,
              field: 'volume'
            });
        }
      },
      currentTime: {
        get: function() {
          return player.currentTime;
        },
        set: function(val) {
          if (Number.isFinite(val))
            if (player.readyState > 2)
              player.currentTime = val;
            else
              player.addEventListener('canplay', function oncanplay() {
                player.currentTime = val;
                player.removeEventListener('canplay', oncanplay);
              });
          else
            emit('playerError', {
              type: 'validationFailed',
              value: val,
              field: 'currentTime'
            });
        }
      },
      done: {
        get: function() {
          return cb;
        },
        set: function(val) {
          if (val instanceof Function || val === null)
            cb = val;
          else
            emit('playerError', {
              type: 'validationFailed',
              value: val,
              field: 'done'
            });
        }
      },
      src: {get: function() {
          return player.src;
        }},
      originalSrc: {get: function() {
          return player.originalSrc;
        }},
      duration: {get: function() {
          return player.duration;
        }}
    });
    function emit(type, data) {
      player.dispatchEvent(new CustomEvent(type, {detail: data}));
    }
    function setSrc(src) {
      player.src = opts.transformSrc(player.originalSrc = (opts.srcMod instanceof Function ? opts.srcMod(src) : src));
    }
    function ended(event) {
      done(event);
    }
    function error(event) {
      console.warn(event);
      done(event);
    }
    function stopEventInterval() {
      clearInterval(interval);
    }
    function startEventInterval() {
      stopEventInterval();
      interval = setInterval(function() {
        for (var i = 0; i < listeners.length; i++)
          if (listeners[i]())
            listeners[i].callback();
      }, opts.eventInterval);
    }
    function addFnEventListener(event, callback) {
      if (listeners.length === 0)
        startEventInterval();
      event.callback = callback;
      if (listeners.indexOf(event) === -1)
        listeners.push(event);
    }
    function removeFnEventListener(event) {
      var indexOf;
      while ((indexOf = listeners.indexOf(event)) !== -1)
        listeners = listeners.slice(0, indexOf).concat(listeners.slice(indexOf + 1));
      if (listeners.length === 0)
        stopEventInterval();
    }
  };
};


//# sourceURL=/Users/rodionov/publicradio/src/lib/_player.js
},{}],50:[function(require,module,exports){
"use strict";
"use strict";
var TWEEN = require('tween.js');
var Player = require('./_player');
var Play = new Player({
  playerConstructor: function() {
    var audio = document.createElement('audio');
    audio.toJSON = function toJSON() {
      return {
        src: this.src,
        duration: this.duration
      };
    };
    return audio;
  },
  transformSrc: function(track) {
    return track.url;
  }
});
module.exports = StationEngine;
var currentEngine;
function Seeker(generator) {
  getAt.history = [];
  getAt.cursor = -1;
  return getAt;
  function getAbsolute(index) {
    while (getAt.history.length <= index)
      getAt.history.push(generator(getAt.history));
    getAt.history = getAt.history.filter((function(el) {
      return el instanceof Object;
    }));
    getAt.cursor = getAt.history.length - 1;
    return getAt.history[index];
  }
  function getAt(index) {
    return getAbsolute(getAt.cursor + index || 0);
  }
}
function getRandom(arr) {
  return arr[(arr.length * Math.random()) >> 0];
}
function StationEngine(trackList, onTrackChange) {
  if (!(this instanceof StationEngine))
    throw new Error();
  var self = this;
  this.onTrackChange = onTrackChange;
  this._enabled = false;
  this._volumeTween = new TWEEN.Tween({volume: 0}).easing(TWEEN.Easing.Quintic.InOut).onUpdate(function() {
    if (self._audio)
      self._audio.volume = this.volume * window.globalVolumeLevel;
  });
  var probability = function(track, history) {
    switch (true) {
      case (history.indexOf(track) === -1):
      case (history.indexOf(track) > trackList.length):
        return 1;
      case (history.indexOf(track) < trackList.length * 0.5):
        return 0;
      default:
        return 1 - (history.indexOf(track) / trackList.length);
    }
  };
  this._seeker = new Seeker(function getNextTrack(list) {
    list = list.slice().reverse();
    var nextTrack;
    do
      nextTrack = getRandom(trackList);
 while (Math.random() > probability(nextTrack, list));
    return nextTrack;
  });
}
StationEngine.prototype = {
  nextTrack: function() {
    return this._seeker(1);
  },
  next: function() {
    var nextTrack = this.nextTrack();
    if (!nextTrack)
      return false;
    this.currentTrack = nextTrack;
    this._audio = new Play(this.currentTrack, {volume: this._audio ? this._audio.volume : window.globalVolumeLevel}, this.next.bind(this));
    this.onTrackChange(nextTrack);
  },
  enable: function() {
    if (this._enabled)
      return;
    if (currentEngine && currentEngine !== this)
      currentEngine.enabled = false;
    currentEngine = this;
    clearTimeout(this._disableTimeout);
    this._volumeTween.stop().to({volume: 1}, 500).onComplete((function() {})).start();
    if (this.currentTrack) {
      if (this.currentTrack.startTime)
        this._audio.currentTime = (Date.now() - this.currentTrack.startTime) / 1000;
      this._audio.play();
    } else {
      if (this.next() !== false)
        this._audio.currentTime = this.currentTrack.duration * (0.05 + 0.20 * Math.random());
    }
    this._enabled = true;
  },
  disable: function() {
    var $__0 = this;
    if (!this._enabled)
      return;
    var self = this;
    this._volumeTween.stop().to({volume: 0}, 500).onComplete((function() {
      return $__0._audio.pause();
    })).start();
    this.currentTrack.startTime = Date.now() - this._audio.currentTime * 1000;
    this._disableTimeout = setTimeout(function() {
      self._audio.destroy();
      self.currentTrack = null;
    }, (this.currentTrack.duration - this._audio.currentTime) * 1000);
    this._enabled = false;
  },
  currentTrack: null,
  get enabled() {
    return this._enabled;
  },
  set enabled(val) {
    if (val)
      this.enable();
    else
      this.disable();
  }
};


//# sourceURL=/Users/rodionov/publicradio/src/lib/_stationEngine.js
},{"./_player":49,"tween.js":15}],51:[function(require,module,exports){
"use strict";
"use strict";
var co = require('co');
var stack = [],
    cache = {};
var v = '5.25';
Object.defineProperty(window, 'stack', {get: function() {
    return stack;
  }});
module.exports = function vkApi(method, args) {
  var priority = arguments[2] !== (void 0) ? arguments[2] : 0;
  var created_at = arguments[3] !== (void 0) ? arguments[3] : Date.now();
  var queryDump = JSON.stringify({
    method: method,
    args: args
  });
  var cached = cache[queryDump];
  if (cached) {
    cache[queryDump].query.priority = Math.max(cache[queryDump].query.priority, priority);
    return cached;
  } else {
    var query = {
      method: method,
      args: args,
      priority: priority,
      created_at: created_at
    };
    cache[queryDump] = new Promise((function(resolve) {
      return (query.callback = resolve) && stack.push(query);
    }));
    cache[queryDump].query = query;
    return cache[queryDump];
  }
};
var resolveSessionFn;
module.exports.session = new Promise((function(res) {
  return resolveSessionFn = res;
}));
co($traceurRuntime.initGeneratorFunction(function mainApiCallLoop() {
  var session,
      executeQueryList,
      maxQueryCount,
      slice,
      query,
      result,
      code,
      processResult;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          $ctx.state = (window.VK === undefined) ? 1 : 5;
          break;
        case 1:
          $ctx.state = 2;
          return sleep(100);
        case 2:
          $ctx.maybeThrow();
          $ctx.state = 0;
          break;
        case 5:
          $ctx.state = 7;
          return auth;
        case 7:
          session = $ctx.sent;
          $ctx.state = 9;
          break;
        case 9:
          window.ga('set', '&uid', session.mid);
          resolveSessionFn(session);
          console.info('authorised', session);
          $ctx.state = 39;
          break;
        case 39:
          $ctx.state = (true) ? 35 : -2;
          break;
        case 35:
          maxQueryCount = [];
          $ctx.state = 36;
          break;
        case 36:
          $ctx.state = (true) ? 17 : 19;
          break;
        case 17:
          stack = stack.filter((function(el) {
            return el.priority > -100;
          })).sort((function(a, b) {
            return a.created_at - b.created_at;
          })).sort((function(a, b) {
            return b.priority - a.priority;
          }));
          slice = 10;
          if (stack && stack[20] && stack[20].priority > 30)
            slice = 25;
          executeQueryList = stack.splice(0, slice);
          $ctx.state = 18;
          break;
        case 18:
          $ctx.state = (executeQueryList.length > 0) ? 19 : 15;
          break;
        case 15:
          $ctx.state = 11;
          return sleep(100);
        case 11:
          $ctx.maybeThrow();
          $ctx.state = 36;
          break;
        case 19:
          $ctx.state = (executeQueryList.length === 1) ? 24 : 28;
          break;
        case 24:
          query = executeQueryList[0];
          if (!query.args.v)
            query.args.v = v;
          $ctx.state = 25;
          break;
        case 25:
          $ctx.state = 21;
          return call(query.method, query.args);
        case 21:
          result = $ctx.sent;
          $ctx.state = 23;
          break;
        case 23:
          if (result.error) {
            query.createdAt = Date.now();
            query.priority = Math.min(0, query.priority - 10);
            stack.push(query);
          } else {
            query.callback(result.response);
          }
          $ctx.state = 27;
          break;
        case 28:
          code = ['var result = []', executeQueryList.map((function(query) {
            return ("result.push(API." + query.method + "(" + JSON.stringify(query.args) + "))");
          })).join(';\n'), 'return result;'].join(';'), processResult = function(executeQueryList, result) {
            var failList = [];
            if (result.execute_errors)
              console.warn(new Error('VK Execute Error'), executeQueryList, result);
            if (result.error)
              console.warn(new Error('VK Execute Error'), executeQueryList, result);
            if (result.response)
              executeQueryList.forEach(function(query, index) {
                if (result.response[index] || result.response[index] === '')
                  query.callback(result.response[index]);
                else
                  failList.push(query);
              });
            for (var $__0 = failList[$traceurRuntime.toProperty(Symbol.iterator)](),
                $__1; !($__1 = $__0.next()).done; ) {
              var query = $__1.value;
              {
                query.createdAt = Date.now();
                query.priority = Math.min(0, query.priority - 10);
                stack.push(query);
              }
            }
          };
          (function(list) {
            call('execute', {
              v: v,
              code: code
            })((function(e, res) {
              return processResult(list, res);
            }));
          })(executeQueryList);
          $ctx.state = 27;
          break;
        case 27:
          $ctx.state = 32;
          return sleep(350);
        case 32:
          $ctx.maybeThrow();
          $ctx.state = 39;
          break;
        default:
          return $ctx.end();
      }
  }, mainApiCallLoop, this);
})())();
function sleep(duration) {
  return function(callback) {
    setTimeout(callback, duration);
  };
}
function auth(callback) {
  var appIDMap = {
    '91.239.26.189': 4524233,
    'publicradio.io': 4597732
  };
  VK.init({apiId: appIDMap[location.hostname]});
  VK.Auth.getLoginStatus(function getStatusCb($__2) {
    var session = $__2.session;
    if (session) {
      document.location.hash = '';
      callback(null, session);
    } else {
      VK.Observer.subscribe('auth.login', getStatusCb);
      document.location.hash = 'needAuth';
    }
  });
}
function call(method, opts) {
  return function(callback) {
    VK.api(method, opts, function(data) {
      callback(null, data);
    });
  };
}


//# sourceURL=/Users/rodionov/publicradio/src/lib/_vkApi_mod.js
},{"co":11}],52:[function(require,module,exports){
module.exports = "<div class=\"popups\"><div v-if=\"anchor === &quot;needAuth&quot;\" class=\"popup\"><p>Public Radio - это экспериментальный музыкальный проект.</p><p>Он превращает музыкальные группы и паблики из Вконтакте в музыкальные радиостанции, отсортированные по вашим музыкальным вкусам.</p><p>Все воспроизводимые композиции взяты из соответствующих групп Вконтакте, Public Radio лишь воспроизводит их в порядке, создающем ощущение почти настоящего радио.</p><p>Он подбирает подходящие станции как из ваших, так и из специально отобранных для этой цели групп.</p><p>Public Radio - некоммерческий проект. Он создан исключительно для того, чтобы получать еще больше удовольствия от новой музыки.</p><p>Обратите внимание: для нормальной работы Public Radio необходимо высокоскоростное подключение к сети.</p><a onclick=\"VK.Auth.login(function(){}, 10)\" class=\"popup-button is-vk\">Войти через ВК</a></div></div><header class=\"header\"><span><span v-show=\"currentStation.name\"><a href=\"http://vk.com/{{currentStation.screen_name}}\" target=\"_blank\">{{currentStation.name}}</a>&nbsp;on&nbsp;</span><a href=\"https://vk.com/public.radio\" target=\"_blank\">Public Radio</a></span><div v-show=\"currentStation.id\" v-class=\"icon-like:!currentStation.is_member, icon-dislike: currentStation.is_member\" data-tooltip=\"{{currentStation.is_member ? 'Отменить подписку' : 'Подписаться'}}\" class=\"like\"><div id=\"subscribeToGroup\" style=\"opacity: 0; -webkit-transform: scale(2);-moz-transform: scale(2);transform: scale(2);width: 2em;height: 2em;margin: 12px 0 0 0px;\"></div></div><div v-class=\"icon-volume-mute: volume == 0, icon-volume: volume != 0\" v-if=\"currentStation.id\" class=\"volume\"><!--v-show='currentStation.id',--><div style=\"width:100%;height:100%;cursor:pointer;position:relative;z-index:100\" v-on=\"click: doMute\"></div><div class=\"overlay\"><input type=\"range\" v-model=\"volume\" max=\"100\"/></div></div><div v-style=\"background-image: 'url('+ currentStation.avatar + ')'\" v-tooltip-current-station=\"v-tooltip-current-station\" class=\"stationArt\"></div></header><main><article v-repeat=\"stations | threshold genreCompatibility 60\" v-component=\"station\" class=\"station-container\"></article><div class=\"preload-container\"><div style=\"margin: -24px 20px 48px;\" class=\"csspinner\"></div><div style=\"text-align:center\" class=\"announce\"><p>Public radio получает необходимые данные из VK.</p><p>Через 10-15 секунд вы уже сможете начать слушать станции, созданные из ваших групп VK.</p><br/><p>Загрузка музыкальных групп, которые могут вам понравиться, и расчет персональных рекомендаций может занять какое-то время.</p><p>Первые несколько минут некоторые из предложенных станций могут не соответствовать вашим музыкальным вкусам.</p></div></div></main><footer v-show=\"currentStation &amp;&amp; currentTrack\" class=\"player\"><div class=\"player-container\"><div v-style=\"background-image: 'url('+ currentTrack.art.photo_604 + ')'\" class=\"albumArt\"></div><div class=\"player-track-info\"><span class=\"player-track-info-title\">{{currentTrack.title}}</span><div class=\"player-track-info-artist\">by {{currentTrack.artist || '???'}}</div></div><div v-class=\"icon-like:!currentTrack.added, icon-liked: currentTrack.added, disabled: currentTrack.added\" v-on=\"click: likeCurrentTrack\" class=\"like\"></div><div v-style=\"width: currentProgress * 100 + &quot;%&quot;\" class=\"player-progress\"></div></div></footer>"

},{}],53:[function(require,module,exports){
module.exports = "<a v-style=\"background-image: 'url('+ avatar + ')'\" data-name=\"{{screen_name}}\" v-on=\"click: setAsCurrent\" v-class=\"current: id === currentStation.id, noAnimation: shown\" class=\"station\"><div v-if=\"id !== currentStation.id\" class=\"station-action-play\"></div><div class=\"station-info is-has-only-child\"><div class=\"station-info-line\">{{name}}</div></div></a>"

},{}]},{},[47])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vbm9kZV9tb2R1bGVzL2FzeW5jc3RvcmFnZS9saWIvaW5kZXguanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vbm9kZV9tb2R1bGVzL2FzeW5jc3RvcmFnZS9ub2RlX21vZHVsZXMvY29tcG9uZW50LXR5cGUvaW5kZXguanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vbm9kZV9tb2R1bGVzL2FzeW5jc3RvcmFnZS9ub2RlX21vZHVsZXMvbG9jYWxmb3JhZ2Uvc3JjL2RyaXZlcnMvaW5kZXhlZGRiLmpzIiwiL1VzZXJzL3JvZGlvbm92L3B1YmxpY3JhZGlvL25vZGVfbW9kdWxlcy9hc3luY3N0b3JhZ2Uvbm9kZV9tb2R1bGVzL2xvY2FsZm9yYWdlL3NyYy9kcml2ZXJzL2xvY2Fsc3RvcmFnZS5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvYXN5bmNzdG9yYWdlL25vZGVfbW9kdWxlcy9sb2NhbGZvcmFnZS9zcmMvZHJpdmVycy93ZWJzcWwuanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vbm9kZV9tb2R1bGVzL2FzeW5jc3RvcmFnZS9ub2RlX21vZHVsZXMvbG9jYWxmb3JhZ2Uvc3JjL2xvY2FsZm9yYWdlLmpzIiwiL1VzZXJzL3JvZGlvbm92L3B1YmxpY3JhZGlvL25vZGVfbW9kdWxlcy9hc3luY3N0b3JhZ2Uvbm9kZV9tb2R1bGVzL2xvY2FsZm9yYWdlL3NyYy91dGlscy9zZXJpYWxpemVyLmpzIiwiL1VzZXJzL3JvZGlvbm92L3B1YmxpY3JhZGlvL25vZGVfbW9kdWxlcy9hc3luY3N0b3JhZ2Uvbm9kZV9tb2R1bGVzL3Byb21pc2UvY29yZS5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvYXN5bmNzdG9yYWdlL25vZGVfbW9kdWxlcy9wcm9taXNlL2luZGV4LmpzIiwiL1VzZXJzL3JvZGlvbm92L3B1YmxpY3JhZGlvL25vZGVfbW9kdWxlcy9hc3luY3N0b3JhZ2Uvbm9kZV9tb2R1bGVzL3Byb21pc2Uvbm9kZV9tb2R1bGVzL2FzYXAvYXNhcC5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvY28vaW5kZXguanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vbm9kZV9tb2R1bGVzL2VzNmlmeS9ub2RlX21vZHVsZXMvdHJhY2V1ci9iaW4vdHJhY2V1ci1ydW50aW1lLmpzIiwiL1VzZXJzL3JvZGlvbm92L3B1YmxpY3JhZGlvL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3BhdGgtYnJvd3NlcmlmeS9pbmRleC5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vbm9kZV9tb2R1bGVzL3R3ZWVuLmpzL2luZGV4LmpzIiwiL1VzZXJzL3JvZGlvbm92L3B1YmxpY3JhZGlvL25vZGVfbW9kdWxlcy92dWUvc3JjL2JhdGNoZXIuanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vbm9kZV9tb2R1bGVzL3Z1ZS9zcmMvYmluZGluZy5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvdnVlL3NyYy9jb21waWxlci5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvdnVlL3NyYy9jb25maWcuanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vbm9kZV9tb2R1bGVzL3Z1ZS9zcmMvZGVwcy1wYXJzZXIuanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vbm9kZV9tb2R1bGVzL3Z1ZS9zcmMvZGlyZWN0aXZlLmpzIiwiL1VzZXJzL3JvZGlvbm92L3B1YmxpY3JhZGlvL25vZGVfbW9kdWxlcy92dWUvc3JjL2RpcmVjdGl2ZXMvaHRtbC5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvdnVlL3NyYy9kaXJlY3RpdmVzL2lmLmpzIiwiL1VzZXJzL3JvZGlvbm92L3B1YmxpY3JhZGlvL25vZGVfbW9kdWxlcy92dWUvc3JjL2RpcmVjdGl2ZXMvaW5kZXguanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vbm9kZV9tb2R1bGVzL3Z1ZS9zcmMvZGlyZWN0aXZlcy9tb2RlbC5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvdnVlL3NyYy9kaXJlY3RpdmVzL29uLmpzIiwiL1VzZXJzL3JvZGlvbm92L3B1YmxpY3JhZGlvL25vZGVfbW9kdWxlcy92dWUvc3JjL2RpcmVjdGl2ZXMvcGFydGlhbC5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvdnVlL3NyYy9kaXJlY3RpdmVzL3JlcGVhdC5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvdnVlL3NyYy9kaXJlY3RpdmVzL3N0eWxlLmpzIiwiL1VzZXJzL3JvZGlvbm92L3B1YmxpY3JhZGlvL25vZGVfbW9kdWxlcy92dWUvc3JjL2RpcmVjdGl2ZXMvdmlldy5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvdnVlL3NyYy9kaXJlY3RpdmVzL3dpdGguanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vbm9kZV9tb2R1bGVzL3Z1ZS9zcmMvZW1pdHRlci5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvdnVlL3NyYy9leHAtcGFyc2VyLmpzIiwiL1VzZXJzL3JvZGlvbm92L3B1YmxpY3JhZGlvL25vZGVfbW9kdWxlcy92dWUvc3JjL2ZpbHRlcnMuanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vbm9kZV9tb2R1bGVzL3Z1ZS9zcmMvZnJhZ21lbnQuanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vbm9kZV9tb2R1bGVzL3Z1ZS9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvdnVlL3NyYy9vYnNlcnZlci5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvdnVlL3NyYy90ZW1wbGF0ZS1wYXJzZXIuanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vbm9kZV9tb2R1bGVzL3Z1ZS9zcmMvdGV4dC1wYXJzZXIuanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vbm9kZV9tb2R1bGVzL3Z1ZS9zcmMvdHJhbnNpdGlvbi5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvdnVlL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9ub2RlX21vZHVsZXMvdnVlL3NyYy92aWV3bW9kZWwuanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vc3JjL19ncm91cC5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9zcmMvX3ByZXBhcmUtZW52aXJvbWVudC5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9zcmMvY29tcG9uZW50cy9faW5kZXguanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vc3JjL2NvbXBvbmVudHMvX3N0YXRpb24uanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vc3JjL2Zha2VfZTU0Njk3NDYuanMiLCIvVXNlcnMvcm9kaW9ub3YvcHVibGljcmFkaW8vc3JjL2xpYi9fYWR2aWNlRG9nLmpzIiwiL1VzZXJzL3JvZGlvbm92L3B1YmxpY3JhZGlvL3NyYy9saWIvX3BsYXllci5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9zcmMvbGliL19zdGF0aW9uRW5naW5lLmpzIiwiL1VzZXJzL3JvZGlvbm92L3B1YmxpY3JhZGlvL3NyYy9saWIvX3ZrQXBpX21vZC5qcyIsIi9Vc2Vycy9yb2Rpb25vdi9wdWJsaWNyYWRpby9zcmMvdGVtcGxhdGVzL19hcHAuaHRtbC5qYWRlIiwiL1VzZXJzL3JvZGlvbm92L3B1YmxpY3JhZGlvL3NyYy90ZW1wbGF0ZXMvX3N0YXRpb24uaHRtbC5qYWRlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hhQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwYUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdmdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcHZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVnQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBQcm9taXNlID0gcmVxdWlyZSgncHJvbWlzZScpO1xudmFyIHR5cGUgPSByZXF1aXJlKCdjb21wb25lbnQtdHlwZScpO1xudmFyIGxvY2FsRm9yYWdlID0gcmVxdWlyZSgnbG9jYWxmb3JhZ2UnKTtcblxuLyoqXG4gKiBTZXR1cCBgbG9jYWxGb3JhZ2VgLlxuICovXG5cbmxvY2FsRm9yYWdlLmNvbmZpZyh7XG4gIG5hbWU6ICdzdG9yYWdlJ1xufSk7XG5cbi8qKlxuICogRXhwb3NlIGBzdG9yYWdlKClgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gc3RvcmFnZTtcblxuLyoqXG4gKiBGYWNhZGUgdG8gZ2V0L3NldC9kZWwvY291bnQgbWV0aG9kcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xBcnJheXxPYmplY3R9IGtleVxuICogQHBhcmFtIHtNaXhlZHxOdWxsfSB2YWxcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiXG4gKi9cblxuZnVuY3Rpb24gc3RvcmFnZShrZXksIHZhbCwgY2IpIHtcbiAgdmFyIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gIGlmICh0eXBlKGFyZ3VtZW50c1tsZW5ndGggLSAxXSkgIT0gJ2Z1bmN0aW9uJykgbGVuZ3RoICs9IDE7XG5cbiAgc3dpdGNoIChsZW5ndGgpIHtcbiAgICBjYXNlIDM6IHJldHVybiB2YWwgPT09IG51bGxcbiAgICAgID8gZGVsKGtleSwgY2IpXG4gICAgICA6IHNldChrZXksIHZhbCwgY2IpO1xuICAgIGNhc2UgMjogcmV0dXJuIHR5cGUoa2V5KSA9PSAnb2JqZWN0J1xuICAgICAgPyBzZXQoa2V5LCB2YWwpXG4gICAgICA6IGdldChrZXksIHZhbCk7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBjb3VudChrZXkpO1xuICB9XG59XG5cbi8qKlxuICogRXhwb3NlIG1ldGhvZHMgJiBwcm9wZXJ0aWVzLlxuICovXG5cbnN0b3JhZ2UuZ2V0ID0gZ2V0O1xuc3RvcmFnZS5zZXQgPSBzZXQ7XG5zdG9yYWdlLmRlbCA9IGRlbDtcbnN0b3JhZ2UuY291bnQgPSBjb3VudDtcbnN0b3JhZ2UuY2xlYXIgPSBjbGVhcjtcbnN0b3JhZ2UuZGV2ZWxvcG1lbnQgPSBmYWxzZTtcbnN0b3JhZ2UuZm9yYWdlID0gbG9jYWxGb3JhZ2U7XG5cbi8qKlxuICogR2V0IGBrZXlgLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl8TWl4ZWR9IGtleVxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2JcbiAqL1xuXG5mdW5jdGlvbiBnZXQoa2V5LCBjYikge1xuICByZXR1cm4gdHlwZShrZXkpICE9ICdhcnJheSdcbiAgICA/IGxvY2FsRm9yYWdlLmdldEl0ZW0oa2V5KS50aGVuKHdyYXAoY2IsIHRydWUpLCBjYilcbiAgICA6IFByb21pc2UuYWxsKGtleS5tYXAoZ2V0U3Via2V5KSkudGhlbih3cmFwKGNiLCB0cnVlKSwgY2IpO1xuXG4gIGZ1bmN0aW9uIGdldFN1YmtleShrZXkpIHtcbiAgICByZXR1cm4gZ2V0KGtleSwgZnVuY3Rpb24oKSB7fSk7IC8vIG5vb2IgZnVuY3Rpb24gdG8gcHJldmVudCBsb2dzXG4gIH1cbn1cblxuLyoqXG4gKiBTZXQgYHZhbGAgdG8gYGtleWAuXG4gKlxuICogQHBhcmFtIHtBcnJheXxNaXhlZH0ga2V5XG4gKiBAcGFyYW0ge01peGVkfSB2YWxcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiXG4gKi9cblxuZnVuY3Rpb24gc2V0KGtleSwgdmFsLCBjYikge1xuICByZXR1cm4gdHlwZShrZXkpICE9ICdvYmplY3QnXG4gICAgPyBsb2NhbEZvcmFnZS5zZXRJdGVtKGtleSwgdmFsKS50aGVuKHdyYXAoY2IpLCBjYilcbiAgICA6IFByb21pc2UuYWxsKE9iamVjdC5rZXlzKGtleSkubWFwKHNldFN1YmtleSkpLnRoZW4od3JhcCh2YWwpLCB2YWwpO1xuXG4gIGZ1bmN0aW9uIHNldFN1YmtleShzdWJrZXksIG5leHQpIHtcbiAgICByZXR1cm4ga2V5W3N1YmtleV0gPT09IG51bGxcbiAgICAgID8gZGVsKHN1YmtleSwgbmV4dClcbiAgICAgIDogc2V0KHN1YmtleSwga2V5W3N1YmtleV0sIG5leHQpO1xuICB9XG59XG5cbi8qKlxuICogRGVsZXRlIGBrZXlgLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl8TWl4ZWR9IGtleVxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2JcbiAqL1xuXG5mdW5jdGlvbiBkZWwoa2V5LCBjYikge1xuICByZXR1cm4gdHlwZShrZXkpICE9ICdhcnJheSdcbiAgICA/IGxvY2FsRm9yYWdlLnJlbW92ZUl0ZW0oa2V5KS50aGVuKHdyYXAoY2IpLCBjYilcbiAgICA6IFByb21pc2UuYWxsKGtleS5tYXAoZGVsKSkudGhlbih3cmFwKGNiKSwgY2IpO1xufVxuXG4vKipcbiAqIENsZWFyLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiXG4gKi9cblxuZnVuY3Rpb24gY2xlYXIoY2IpIHtcbiAgcmV0dXJuIGxvY2FsRm9yYWdlLmNsZWFyKCkudGhlbih3cmFwKGNiKSwgY2IpO1xufVxuXG4vKipcbiAqIENvdW50IHJlY29yZHMuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbmN9IGNiXG4gKi9cblxuZnVuY3Rpb24gY291bnQoY2IpIHtcbiAgcmV0dXJuIGxvY2FsRm9yYWdlLmxlbmd0aCgpLnRoZW4od3JhcChjYiwgdHJ1ZSksIGNiKTtcbn1cblxuLyoqXG4gKiBXcmFwIHByb21pc2Ugc3R5bGUgcmVzcG9uc2UgdG8gY2FsbGJhY2sgc3R5bGUuXG4gKiBJZiBgY2JgIGRvZXMgbm90IHNwZWNpZmllZCwgaXQgdXNlcyBjb25zb2xlLmxvZyBpbiBkZXZlbG9wbWVudCBtb2RlLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtoYXNSZXN1bHRdXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuXG5mdW5jdGlvbiB3cmFwKGNiLCBoYXNSZXN1bHQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHJlcykge1xuICAgIGlmICh0eXBlKGNiKSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBoYXNSZXN1bHQgPyBjYihudWxsLCByZXMpIDogY2IoKTtcbiAgICB9IGVsc2UgaWYgKGhhc1Jlc3VsdCAmJiBzdG9yYWdlLmRldmVsb3BtZW50KSB7XG4gICAgICBjb25zb2xlLmxvZyhyZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9O1xufVxuIiwiLyoqXG4gKiB0b1N0cmluZyByZWYuXG4gKi9cblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqXG4gKiBSZXR1cm4gdGhlIHR5cGUgb2YgYHZhbGAuXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gdmFsXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsKXtcbiAgc3dpdGNoICh0b1N0cmluZy5jYWxsKHZhbCkpIHtcbiAgICBjYXNlICdbb2JqZWN0IERhdGVdJzogcmV0dXJuICdkYXRlJztcbiAgICBjYXNlICdbb2JqZWN0IFJlZ0V4cF0nOiByZXR1cm4gJ3JlZ2V4cCc7XG4gICAgY2FzZSAnW29iamVjdCBBcmd1bWVudHNdJzogcmV0dXJuICdhcmd1bWVudHMnO1xuICAgIGNhc2UgJ1tvYmplY3QgQXJyYXldJzogcmV0dXJuICdhcnJheSc7XG4gICAgY2FzZSAnW29iamVjdCBFcnJvcl0nOiByZXR1cm4gJ2Vycm9yJztcbiAgfVxuXG4gIGlmICh2YWwgPT09IG51bGwpIHJldHVybiAnbnVsbCc7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuICd1bmRlZmluZWQnO1xuICBpZiAodmFsICE9PSB2YWwpIHJldHVybiAnbmFuJztcbiAgaWYgKHZhbCAmJiB2YWwubm9kZVR5cGUgPT09IDEpIHJldHVybiAnZWxlbWVudCc7XG5cbiAgdmFsID0gdmFsLnZhbHVlT2ZcbiAgICA/IHZhbC52YWx1ZU9mKClcbiAgICA6IE9iamVjdC5wcm90b3R5cGUudmFsdWVPZi5hcHBseSh2YWwpXG5cbiAgcmV0dXJuIHR5cGVvZiB2YWw7XG59O1xuIiwiLy8gU29tZSBjb2RlIG9yaWdpbmFsbHkgZnJvbSBhc3luY19zdG9yYWdlLmpzIGluXG4vLyBbR2FpYV0oaHR0cHM6Ly9naXRodWIuY29tL21vemlsbGEtYjJnL2dhaWEpLlxuKGZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIE9yaWdpbmFsbHkgZm91bmQgaW4gaHR0cHM6Ly9naXRodWIuY29tL21vemlsbGEtYjJnL2dhaWEvYmxvYi9lOGY2MjRlNGNjOWVhOTQ1NzI3Mjc4MDM5YjNiYzliY2I5Zjg2NjdhL3NoYXJlZC9qcy9hc3luY19zdG9yYWdlLmpzXG5cbiAgICAvLyBQcm9taXNlcyFcbiAgICB2YXIgUHJvbWlzZSA9ICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykgP1xuICAgICAgICAgICAgICAgICAgcmVxdWlyZSgncHJvbWlzZScpIDogdGhpcy5Qcm9taXNlO1xuXG4gICAgLy8gSW5pdGlhbGl6ZSBJbmRleGVkREI7IGZhbGwgYmFjayB0byB2ZW5kb3ItcHJlZml4ZWQgdmVyc2lvbnMgaWYgbmVlZGVkLlxuICAgIHZhciBpbmRleGVkREIgPSBpbmRleGVkREIgfHwgdGhpcy5pbmRleGVkREIgfHwgdGhpcy53ZWJraXRJbmRleGVkREIgfHxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3pJbmRleGVkREIgfHwgdGhpcy5PSW5kZXhlZERCIHx8XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubXNJbmRleGVkREI7XG5cbiAgICAvLyBJZiBJbmRleGVkREIgaXNuJ3QgYXZhaWxhYmxlLCB3ZSBnZXQgb3V0dGEgaGVyZSFcbiAgICBpZiAoIWluZGV4ZWREQikge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gT3BlbiB0aGUgSW5kZXhlZERCIGRhdGFiYXNlIChhdXRvbWF0aWNhbGx5IGNyZWF0ZXMgb25lIGlmIG9uZSBkaWRuJ3RcbiAgICAvLyBwcmV2aW91c2x5IGV4aXN0KSwgdXNpbmcgYW55IG9wdGlvbnMgc2V0IGluIHRoZSBjb25maWcuXG4gICAgZnVuY3Rpb24gX2luaXRTdG9yYWdlKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgZGJJbmZvID0ge1xuICAgICAgICAgICAgZGI6IG51bGxcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAob3B0aW9ucykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgZGJJbmZvW2ldID0gb3B0aW9uc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHZhciBvcGVucmVxID0gaW5kZXhlZERCLm9wZW4oZGJJbmZvLm5hbWUsIGRiSW5mby52ZXJzaW9uKTtcbiAgICAgICAgICAgIG9wZW5yZXEub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJlamVjdChvcGVucmVxLmVycm9yKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBvcGVucmVxLm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIEZpcnN0IHRpbWUgc2V0dXA6IGNyZWF0ZSBhbiBlbXB0eSBvYmplY3Qgc3RvcmVcbiAgICAgICAgICAgICAgICBvcGVucmVxLnJlc3VsdC5jcmVhdGVPYmplY3RTdG9yZShkYkluZm8uc3RvcmVOYW1lKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBvcGVucmVxLm9uc3VjY2VzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGRiSW5mby5kYiA9IG9wZW5yZXEucmVzdWx0O1xuICAgICAgICAgICAgICAgIHNlbGYuX2RiSW5mbyA9IGRiSW5mbztcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRJdGVtKGtleSwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIC8vIENhc3QgdGhlIGtleSB0byBhIHN0cmluZywgYXMgdGhhdCdzIGFsbCB3ZSBjYW4gc2V0IGFzIGEga2V5LlxuICAgICAgICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHdpbmRvdy5jb25zb2xlLndhcm4oa2V5ICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyB1c2VkIGFzIGEga2V5LCBidXQgaXQgaXMgbm90IGEgc3RyaW5nLicpO1xuICAgICAgICAgICAga2V5ID0gU3RyaW5nKGtleSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcbiAgICAgICAgICAgICAgICB2YXIgc3RvcmUgPSBkYkluZm8uZGIudHJhbnNhY3Rpb24oZGJJbmZvLnN0b3JlTmFtZSwgJ3JlYWRvbmx5JylcbiAgICAgICAgICAgICAgICAgICAgLm9iamVjdFN0b3JlKGRiSW5mby5zdG9yZU5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciByZXEgPSBzdG9yZS5nZXQoa2V5KTtcblxuICAgICAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gcmVxLnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodmFsdWUpO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVxLmVycm9yKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXhlY3V0ZURlZmVyZWRDYWxsYmFjayhwcm9taXNlLCBjYWxsYmFjayk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cblxuICAgIC8vIEl0ZXJhdGUgb3ZlciBhbGwgaXRlbXMgc3RvcmVkIGluIGRhdGFiYXNlLlxuICAgIGZ1bmN0aW9uIGl0ZXJhdGUoaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcbiAgICAgICAgICAgICAgICB2YXIgc3RvcmUgPSBkYkluZm8uZGIudHJhbnNhY3Rpb24oZGJJbmZvLnN0b3JlTmFtZSwgJ3JlYWRvbmx5JylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAub2JqZWN0U3RvcmUoZGJJbmZvLnN0b3JlTmFtZSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcmVxID0gc3RvcmUub3BlbkN1cnNvcigpO1xuICAgICAgICAgICAgICAgIHZhciBpdGVyYXRpb25OdW1iZXIgPSAxO1xuXG4gICAgICAgICAgICAgICAgcmVxLm9uc3VjY2VzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY3Vyc29yID0gcmVxLnJlc3VsdDtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoY3Vyc29yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gaXRlcmF0b3IoY3Vyc29yLnZhbHVlLCBjdXJzb3Iua2V5LCBpdGVyYXRpb25OdW1iZXIrKyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgIT09IHZvaWQoMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXEuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcblxuICAgICAgICBleGVjdXRlRGVmZXJlZENhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcblxuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRJdGVtKGtleSwgdmFsdWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAvLyBDYXN0IHRoZSBrZXkgdG8gYSBzdHJpbmcsIGFzIHRoYXQncyBhbGwgd2UgY2FuIHNldCBhcyBhIGtleS5cbiAgICAgICAgaWYgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB3aW5kb3cuY29uc29sZS53YXJuKGtleSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgdXNlZCBhcyBhIGtleSwgYnV0IGl0IGlzIG5vdCBhIHN0cmluZy4nKTtcbiAgICAgICAgICAgIGtleSA9IFN0cmluZyhrZXkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBkYkluZm8gPSBzZWxmLl9kYkluZm87XG4gICAgICAgICAgICAgICAgdmFyIHRyYW5zYWN0aW9uID0gZGJJbmZvLmRiLnRyYW5zYWN0aW9uKGRiSW5mby5zdG9yZU5hbWUsICdyZWFkd3JpdGUnKTtcbiAgICAgICAgICAgICAgICB2YXIgc3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShkYkluZm8uc3RvcmVOYW1lKTtcblxuICAgICAgICAgICAgICAgIC8vIFRoZSByZWFzb24gd2UgZG9uJ3QgX3NhdmVfIG51bGwgaXMgYmVjYXVzZSBJRSAxMCBkb2VzXG4gICAgICAgICAgICAgICAgLy8gbm90IHN1cHBvcnQgc2F2aW5nIHRoZSBgbnVsbGAgdHlwZSBpbiBJbmRleGVkREIuIEhvd1xuICAgICAgICAgICAgICAgIC8vIGlyb25pYywgZ2l2ZW4gdGhlIGJ1ZyBiZWxvdyFcbiAgICAgICAgICAgICAgICAvLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9tb3ppbGxhL2xvY2FsRm9yYWdlL2lzc3Vlcy8xNjFcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHJlcSA9IHN0b3JlLnB1dCh2YWx1ZSwga2V5KTtcbiAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENhc3QgdG8gdW5kZWZpbmVkIHNvIHRoZSB2YWx1ZSBwYXNzZWQgdG9cbiAgICAgICAgICAgICAgICAgICAgLy8gY2FsbGJhY2svcHJvbWlzZSBpcyB0aGUgc2FtZSBhcyB3aGF0IG9uZSB3b3VsZCBnZXQgb3V0XG4gICAgICAgICAgICAgICAgICAgIC8vIG9mIGBnZXRJdGVtKClgIGxhdGVyLiBUaGlzIGxlYWRzIHRvIHNvbWUgd2VpcmRuZXNzXG4gICAgICAgICAgICAgICAgICAgIC8vIChzZXRJdGVtKCdmb28nLCB1bmRlZmluZWQpIHdpbGwgcmV0dXJuIGBudWxsYCksIGJ1dFxuICAgICAgICAgICAgICAgICAgICAvLyBpdCdzIG5vdCBteSBmYXVsdCBsb2NhbFN0b3JhZ2UgaXMgb3VyIGJhc2VsaW5lIGFuZCB0aGF0XG4gICAgICAgICAgICAgICAgICAgIC8vIGl0J3Mgd2VpcmQuXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLm9uYWJvcnQgPSB0cmFuc2FjdGlvbi5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXEuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcblxuICAgICAgICBleGVjdXRlRGVmZXJlZENhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVtb3ZlSXRlbShrZXksIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAvLyBDYXN0IHRoZSBrZXkgdG8gYSBzdHJpbmcsIGFzIHRoYXQncyBhbGwgd2UgY2FuIHNldCBhcyBhIGtleS5cbiAgICAgICAgaWYgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB3aW5kb3cuY29uc29sZS53YXJuKGtleSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgdXNlZCBhcyBhIGtleSwgYnV0IGl0IGlzIG5vdCBhIHN0cmluZy4nKTtcbiAgICAgICAgICAgIGtleSA9IFN0cmluZyhrZXkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBkYkluZm8gPSBzZWxmLl9kYkluZm87XG4gICAgICAgICAgICAgICAgdmFyIHRyYW5zYWN0aW9uID0gZGJJbmZvLmRiLnRyYW5zYWN0aW9uKGRiSW5mby5zdG9yZU5hbWUsICdyZWFkd3JpdGUnKTtcbiAgICAgICAgICAgICAgICB2YXIgc3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShkYkluZm8uc3RvcmVOYW1lKTtcblxuICAgICAgICAgICAgICAgIC8vIFdlIHVzZSBhIEdydW50IHRhc2sgdG8gbWFrZSB0aGlzIHNhZmUgZm9yIElFIGFuZCBzb21lXG4gICAgICAgICAgICAgICAgLy8gdmVyc2lvbnMgb2YgQW5kcm9pZCAoaW5jbHVkaW5nIHRob3NlIHVzZWQgYnkgQ29yZG92YSkuXG4gICAgICAgICAgICAgICAgLy8gTm9ybWFsbHkgSUUgd29uJ3QgbGlrZSBgLmRlbGV0ZSgpYCBhbmQgd2lsbCBpbnNpc3Qgb25cbiAgICAgICAgICAgICAgICAvLyB1c2luZyBgWydkZWxldGUnXSgpYCwgYnV0IHdlIGhhdmUgYSBidWlsZCBzdGVwIHRoYXRcbiAgICAgICAgICAgICAgICAvLyBmaXhlcyB0aGlzIGZvciB1cyBub3cuXG4gICAgICAgICAgICAgICAgdmFyIHJlcSA9IHN0b3JlLmRlbGV0ZShrZXkpO1xuICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLm9uY29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXEuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAvLyBUaGUgcmVxdWVzdCB3aWxsIGJlIGFib3J0ZWQgaWYgd2UndmUgZXhjZWVkZWQgb3VyIHN0b3JhZ2VcbiAgICAgICAgICAgICAgICAvLyBzcGFjZS4gSW4gdGhpcyBjYXNlLCB3ZSB3aWxsIHJlamVjdCB3aXRoIGEgc3BlY2lmaWNcbiAgICAgICAgICAgICAgICAvLyBcIlF1b3RhRXhjZWVkZWRFcnJvclwiLlxuICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLm9uYWJvcnQgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSBldmVudC50YXJnZXQuZXJyb3I7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvciA9PT0gJ1F1b3RhRXhjZWVkZWRFcnJvcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXhlY3V0ZURlZmVyZWRDYWxsYmFjayhwcm9taXNlLCBjYWxsYmFjayk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFyKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcbiAgICAgICAgICAgICAgICB2YXIgdHJhbnNhY3Rpb24gPSBkYkluZm8uZGIudHJhbnNhY3Rpb24oZGJJbmZvLnN0b3JlTmFtZSwgJ3JlYWR3cml0ZScpO1xuICAgICAgICAgICAgICAgIHZhciBzdG9yZSA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKGRiSW5mby5zdG9yZU5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciByZXEgPSBzdG9yZS5jbGVhcigpO1xuXG4gICAgICAgICAgICAgICAgdHJhbnNhY3Rpb24ub25jb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLm9uYWJvcnQgPSB0cmFuc2FjdGlvbi5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXEuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcblxuICAgICAgICBleGVjdXRlRGVmZXJlZENhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGVuZ3RoKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcbiAgICAgICAgICAgICAgICB2YXIgc3RvcmUgPSBkYkluZm8uZGIudHJhbnNhY3Rpb24oZGJJbmZvLnN0b3JlTmFtZSwgJ3JlYWRvbmx5JylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5vYmplY3RTdG9yZShkYkluZm8uc3RvcmVOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgcmVxID0gc3RvcmUuY291bnQoKTtcblxuICAgICAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXEucmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcS5lcnJvcik7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4ZWN1dGVDYWxsYmFjayhwcm9taXNlLCBjYWxsYmFjayk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGtleShuLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGlmIChuIDwgMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBkYkluZm8gPSBzZWxmLl9kYkluZm87XG4gICAgICAgICAgICAgICAgdmFyIHN0b3JlID0gZGJJbmZvLmRiLnRyYW5zYWN0aW9uKGRiSW5mby5zdG9yZU5hbWUsICdyZWFkb25seScpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAub2JqZWN0U3RvcmUoZGJJbmZvLnN0b3JlTmFtZSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgYWR2YW5jZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgcmVxID0gc3RvcmUub3BlbkN1cnNvcigpO1xuICAgICAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1cnNvciA9IHJlcS5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIGlmICghY3Vyc29yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIG1lYW5zIHRoZXJlIHdlcmVuJ3QgZW5vdWdoIGtleXNcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChuID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSBoYXZlIHRoZSBmaXJzdCBrZXksIHJldHVybiBpdCBpZiB0aGF0J3Mgd2hhdCB0aGV5XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3YW50ZWQuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGN1cnNvci5rZXkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFhZHZhbmNlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE90aGVyd2lzZSwgYXNrIHRoZSBjdXJzb3IgdG8gc2tpcCBhaGVhZCBuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVjb3Jkcy5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZHZhbmNlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yLmFkdmFuY2Uobik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gd2UgZ2V0IGhlcmUsIHdlJ3ZlIGdvdCB0aGUgbnRoIGtleS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGN1cnNvci5rZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXEuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcblxuICAgICAgICBleGVjdXRlQ2FsbGJhY2socHJvbWlzZSwgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBrZXlzKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcbiAgICAgICAgICAgICAgICB2YXIgc3RvcmUgPSBkYkluZm8uZGIudHJhbnNhY3Rpb24oZGJJbmZvLnN0b3JlTmFtZSwgJ3JlYWRvbmx5JylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5vYmplY3RTdG9yZShkYkluZm8uc3RvcmVOYW1lKTtcblxuICAgICAgICAgICAgICAgIHZhciByZXEgPSBzdG9yZS5vcGVuQ3Vyc29yKCk7XG4gICAgICAgICAgICAgICAgdmFyIGtleXMgPSBbXTtcblxuICAgICAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1cnNvciA9IHJlcS5yZXN1bHQ7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjdXJzb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoa2V5cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goY3Vyc29yLmtleSk7XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVxLmVycm9yKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXhlY3V0ZURlZmVyZWRDYWxsYmFjayhwcm9taXNlLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBkZWZlckNhbGxiYWNrKGNhbGxiYWNrLCByZXN1bHQpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFVuZGVyIENocm9tZSB0aGUgY2FsbGJhY2sgaXMgY2FsbGVkIGJlZm9yZSB0aGUgY2hhbmdlcyAoc2F2ZSwgY2xlYXIpXG4gICAgLy8gYXJlIGFjdHVhbGx5IG1hZGUuIFNvIHdlIHVzZSBhIGRlZmVyIGZ1bmN0aW9uIHdoaWNoIHdhaXQgdGhhdCB0aGVcbiAgICAvLyBjYWxsIHN0YWNrIHRvIGJlIGVtcHR5LlxuICAgIC8vIEZvciBtb3JlIGluZm8gOiBodHRwczovL2dpdGh1Yi5jb20vbW96aWxsYS9sb2NhbEZvcmFnZS9pc3N1ZXMvMTc1XG4gICAgLy8gUHVsbCByZXF1ZXN0IDogaHR0cHM6Ly9naXRodWIuY29tL21vemlsbGEvbG9jYWxGb3JhZ2UvcHVsbC8xNzhcbiAgICBmdW5jdGlvbiBkZWZlckNhbGxiYWNrKGNhbGxiYWNrLCByZXN1bHQpIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICAgICAgICAgIH0sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGFzeW5jU3RvcmFnZSA9IHtcbiAgICAgICAgX2RyaXZlcjogJ2FzeW5jU3RvcmFnZScsXG4gICAgICAgIF9pbml0U3RvcmFnZTogX2luaXRTdG9yYWdlLFxuICAgICAgICBpdGVyYXRlOiBpdGVyYXRlLFxuICAgICAgICBnZXRJdGVtOiBnZXRJdGVtLFxuICAgICAgICBzZXRJdGVtOiBzZXRJdGVtLFxuICAgICAgICByZW1vdmVJdGVtOiByZW1vdmVJdGVtLFxuICAgICAgICBjbGVhcjogY2xlYXIsXG4gICAgICAgIGxlbmd0aDogbGVuZ3RoLFxuICAgICAgICBrZXk6IGtleSxcbiAgICAgICAga2V5czoga2V5c1xuICAgIH07XG5cbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBhc3luY1N0b3JhZ2U7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKCdhc3luY1N0b3JhZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBhc3luY1N0b3JhZ2U7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYXN5bmNTdG9yYWdlID0gYXN5bmNTdG9yYWdlO1xuICAgIH1cbn0pLmNhbGwod2luZG93KTtcbiIsIi8vIElmIEluZGV4ZWREQiBpc24ndCBhdmFpbGFibGUsIHdlJ2xsIGZhbGwgYmFjayB0byBsb2NhbFN0b3JhZ2UuXG4vLyBOb3RlIHRoYXQgdGhpcyB3aWxsIGhhdmUgY29uc2lkZXJhYmxlIHBlcmZvcm1hbmNlIGFuZCBzdG9yYWdlXG4vLyBzaWRlLWVmZmVjdHMgKGFsbCBkYXRhIHdpbGwgYmUgc2VyaWFsaXplZCBvbiBzYXZlIGFuZCBvbmx5IGRhdGEgdGhhdFxuLy8gY2FuIGJlIGNvbnZlcnRlZCB0byBhIHN0cmluZyB2aWEgYEpTT04uc3RyaW5naWZ5KClgIHdpbGwgYmUgc2F2ZWQpLlxuKGZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIFByb21pc2VzIVxuICAgIHZhciBQcm9taXNlID0gKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSA/XG4gICAgICAgICAgICAgICAgICByZXF1aXJlKCdwcm9taXNlJykgOiB0aGlzLlByb21pc2U7XG5cbiAgICB2YXIgZ2xvYmFsT2JqZWN0ID0gdGhpcztcbiAgICB2YXIgc2VyaWFsaXplciA9IG51bGw7XG4gICAgdmFyIGxvY2FsU3RvcmFnZSA9IG51bGw7XG5cbiAgICAvLyBJZiB0aGUgYXBwIGlzIHJ1bm5pbmcgaW5zaWRlIGEgR29vZ2xlIENocm9tZSBwYWNrYWdlZCB3ZWJhcHAsIG9yIHNvbWVcbiAgICAvLyBvdGhlciBjb250ZXh0IHdoZXJlIGxvY2FsU3RvcmFnZSBpc24ndCBhdmFpbGFibGUsIHdlIGRvbid0IHVzZVxuICAgIC8vIGxvY2FsU3RvcmFnZS4gVGhpcyBmZWF0dXJlIGRldGVjdGlvbiBpcyBwcmVmZXJyZWQgb3ZlciB0aGUgb2xkXG4gICAgLy8gYGlmICh3aW5kb3cuY2hyb21lICYmIHdpbmRvdy5jaHJvbWUucnVudGltZSlgIGNvZGUuXG4gICAgLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vbW96aWxsYS9sb2NhbEZvcmFnZS9pc3N1ZXMvNjhcbiAgICB0cnkge1xuICAgICAgICAvLyBJZiBsb2NhbFN0b3JhZ2UgaXNuJ3QgYXZhaWxhYmxlLCB3ZSBnZXQgb3V0dGEgaGVyZSFcbiAgICAgICAgLy8gVGhpcyBzaG91bGQgYmUgaW5zaWRlIGEgdHJ5IGNhdGNoXG4gICAgICAgIGlmICghdGhpcy5sb2NhbFN0b3JhZ2UgfHwgISgnc2V0SXRlbScgaW4gdGhpcy5sb2NhbFN0b3JhZ2UpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBsb2NhbFN0b3JhZ2UgYW5kIGNyZWF0ZSBhIHZhcmlhYmxlIHRvIHVzZSB0aHJvdWdob3V0XG4gICAgICAgIC8vIHRoZSBjb2RlLlxuICAgICAgICBsb2NhbFN0b3JhZ2UgPSB0aGlzLmxvY2FsU3RvcmFnZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgTW9kdWxlVHlwZSA9IHtcbiAgICAgICAgREVGSU5FOiAxLFxuICAgICAgICBFWFBPUlQ6IDIsXG4gICAgICAgIFdJTkRPVzogM1xuICAgIH07XG5cbiAgICAvLyBBdHRhY2hpbmcgdG8gd2luZG93IChpLmUuIG5vIG1vZHVsZSBsb2FkZXIpIGlzIHRoZSBhc3N1bWVkLFxuICAgIC8vIHNpbXBsZSBkZWZhdWx0LlxuICAgIHZhciBtb2R1bGVUeXBlID0gTW9kdWxlVHlwZS5XSU5ET1c7XG5cbiAgICAvLyBGaW5kIG91dCB3aGF0IGtpbmQgb2YgbW9kdWxlIHNldHVwIHdlIGhhdmU7IGlmIG5vbmUsIHdlJ2xsIGp1c3QgYXR0YWNoXG4gICAgLy8gbG9jYWxGb3JhZ2UgdG8gdGhlIG1haW4gd2luZG93LlxuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICBtb2R1bGVUeXBlID0gTW9kdWxlVHlwZS5FWFBPUlQ7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgbW9kdWxlVHlwZSA9IE1vZHVsZVR5cGUuREVGSU5FO1xuICAgIH1cblxuICAgIC8vIENvbmZpZyB0aGUgbG9jYWxTdG9yYWdlIGJhY2tlbmQsIHVzaW5nIG9wdGlvbnMgc2V0IGluIHRoZSBjb25maWcuXG4gICAgZnVuY3Rpb24gX2luaXRTdG9yYWdlKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgZGJJbmZvID0ge307XG4gICAgICAgIGlmIChvcHRpb25zKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBkYkluZm9baV0gPSBvcHRpb25zW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZGJJbmZvLmtleVByZWZpeCA9IGRiSW5mby5uYW1lICsgJy8nO1xuXG4gICAgICAgIHNlbGYuX2RiSW5mbyA9IGRiSW5mbztcblxuICAgICAgICB2YXIgc2VyaWFsaXplclByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLyosIHJlamVjdCovKSB7XG4gICAgICAgICAgICAvLyBXZSBhbGxvdyBsb2NhbEZvcmFnZSB0byBiZSBkZWNsYXJlZCBhcyBhIG1vZHVsZSBvciBhcyBhXG4gICAgICAgICAgICAvLyBsaWJyYXJ5IGF2YWlsYWJsZSB3aXRob3V0IEFNRC9yZXF1aXJlLmpzLlxuICAgICAgICAgICAgaWYgKG1vZHVsZVR5cGUgPT09IE1vZHVsZVR5cGUuREVGSU5FKSB7XG4gICAgICAgICAgICAgICAgcmVxdWlyZShbJ2xvY2FsZm9yYWdlU2VyaWFsaXplciddLCByZXNvbHZlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobW9kdWxlVHlwZSA9PT0gTW9kdWxlVHlwZS5FWFBPUlQpIHtcbiAgICAgICAgICAgICAgICAvLyBNYWtpbmcgaXQgYnJvd3NlcmlmeSBmcmllbmRseVxuICAgICAgICAgICAgICAgIHJlc29sdmUocmVxdWlyZSgnLi8uLi91dGlscy9zZXJpYWxpemVyJykpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGdsb2JhbE9iamVjdC5sb2NhbGZvcmFnZVNlcmlhbGl6ZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gc2VyaWFsaXplclByb21pc2UudGhlbihmdW5jdGlvbihsaWIpIHtcbiAgICAgICAgICAgIHNlcmlhbGl6ZXIgPSBsaWI7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFJlbW92ZSBhbGwga2V5cyBmcm9tIHRoZSBkYXRhc3RvcmUsIGVmZmVjdGl2ZWx5IGRlc3Ryb3lpbmcgYWxsIGRhdGEgaW5cbiAgICAvLyB0aGUgYXBwJ3Mga2V5L3ZhbHVlIHN0b3JlIVxuICAgIGZ1bmN0aW9uIGNsZWFyKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIHByb21pc2UgPSBzZWxmLnJlYWR5KCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBrZXlQcmVmaXggPSBzZWxmLl9kYkluZm8ua2V5UHJlZml4O1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gbG9jYWxTdG9yYWdlLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICAgICAgdmFyIGtleSA9IGxvY2FsU3RvcmFnZS5rZXkoaSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoa2V5LmluZGV4T2Yoa2V5UHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShrZXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuXG4gICAgLy8gUmV0cmlldmUgYW4gaXRlbSBmcm9tIHRoZSBzdG9yZS4gVW5saWtlIHRoZSBvcmlnaW5hbCBhc3luY19zdG9yYWdlXG4gICAgLy8gbGlicmFyeSBpbiBHYWlhLCB3ZSBkb24ndCBtb2RpZnkgcmV0dXJuIHZhbHVlcyBhdCBhbGwuIElmIGEga2V5J3MgdmFsdWVcbiAgICAvLyBpcyBgdW5kZWZpbmVkYCwgd2UgcGFzcyB0aGF0IHZhbHVlIHRvIHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICBmdW5jdGlvbiBnZXRJdGVtKGtleSwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIC8vIENhc3QgdGhlIGtleSB0byBhIHN0cmluZywgYXMgdGhhdCdzIGFsbCB3ZSBjYW4gc2V0IGFzIGEga2V5LlxuICAgICAgICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHdpbmRvdy5jb25zb2xlLndhcm4oa2V5ICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyB1c2VkIGFzIGEga2V5LCBidXQgaXQgaXMgbm90IGEgc3RyaW5nLicpO1xuICAgICAgICAgICAga2V5ID0gU3RyaW5nKGtleSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcHJvbWlzZSA9IHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShkYkluZm8ua2V5UHJlZml4ICsga2V5KTtcblxuICAgICAgICAgICAgLy8gSWYgYSByZXN1bHQgd2FzIGZvdW5kLCBwYXJzZSBpdCBmcm9tIHRoZSBzZXJpYWxpemVkXG4gICAgICAgICAgICAvLyBzdHJpbmcgaW50byBhIEpTIG9iamVjdC4gSWYgcmVzdWx0IGlzbid0IHRydXRoeSwgdGhlIGtleVxuICAgICAgICAgICAgLy8gaXMgbGlrZWx5IHVuZGVmaW5lZCBhbmQgd2UnbGwgcGFzcyBpdCBzdHJhaWdodCB0byB0aGVcbiAgICAgICAgICAgIC8vIGNhbGxiYWNrLlxuICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHNlcmlhbGl6ZXIuZGVzZXJpYWxpemUocmVzdWx0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIGFsbCBpdGVtcyBpbiB0aGUgc3RvcmUuXG4gICAgZnVuY3Rpb24gaXRlcmF0ZShpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBwcm9taXNlID0gc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIga2V5UHJlZml4ID0gc2VsZi5fZGJJbmZvLmtleVByZWZpeDtcbiAgICAgICAgICAgIHZhciBrZXlQcmVmaXhMZW5ndGggPSBrZXlQcmVmaXgubGVuZ3RoO1xuICAgICAgICAgICAgdmFyIGxlbmd0aCA9IGxvY2FsU3RvcmFnZS5sZW5ndGg7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIga2V5ID0gbG9jYWxTdG9yYWdlLmtleShpKTtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpO1xuXG4gICAgICAgICAgICAgICAgLy8gSWYgYSByZXN1bHQgd2FzIGZvdW5kLCBwYXJzZSBpdCBmcm9tIHRoZSBzZXJpYWxpemVkXG4gICAgICAgICAgICAgICAgLy8gc3RyaW5nIGludG8gYSBKUyBvYmplY3QuIElmIHJlc3VsdCBpc24ndCB0cnV0aHksIHRoZVxuICAgICAgICAgICAgICAgIC8vIGtleSBpcyBsaWtlbHkgdW5kZWZpbmVkIGFuZCB3ZSdsbCBwYXNzIGl0IHN0cmFpZ2h0XG4gICAgICAgICAgICAgICAgLy8gdG8gdGhlIGl0ZXJhdG9yLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHNlcmlhbGl6ZXIuZGVzZXJpYWxpemUodmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhbHVlID0gaXRlcmF0b3IodmFsdWUsIGtleS5zdWJzdHJpbmcoa2V5UHJlZml4TGVuZ3RoKSwgaSArIDEpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlICE9PSB2b2lkKDApKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4ZWN1dGVDYWxsYmFjayhwcm9taXNlLCBjYWxsYmFjayk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cblxuICAgIC8vIFNhbWUgYXMgbG9jYWxTdG9yYWdlJ3Mga2V5KCkgbWV0aG9kLCBleGNlcHQgdGFrZXMgYSBjYWxsYmFjay5cbiAgICBmdW5jdGlvbiBrZXkobiwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgcHJvbWlzZSA9IHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcbiAgICAgICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGxvY2FsU3RvcmFnZS5rZXkobik7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgcHJlZml4IGZyb20gdGhlIGtleSwgaWYgYSBrZXkgaXMgZm91bmQuXG4gICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0LnN1YnN0cmluZyhkYkluZm8ua2V5UHJlZml4Lmxlbmd0aCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4ZWN1dGVDYWxsYmFjayhwcm9taXNlLCBjYWxsYmFjayk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGtleXMoY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgcHJvbWlzZSA9IHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcbiAgICAgICAgICAgIHZhciBsZW5ndGggPSBsb2NhbFN0b3JhZ2UubGVuZ3RoO1xuICAgICAgICAgICAgdmFyIGtleXMgPSBbXTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChsb2NhbFN0b3JhZ2Uua2V5KGkpLmluZGV4T2YoZGJJbmZvLmtleVByZWZpeCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKGxvY2FsU3RvcmFnZS5rZXkoaSkuc3Vic3RyaW5nKGRiSW5mby5rZXlQcmVmaXgubGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ga2V5cztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuXG4gICAgLy8gU3VwcGx5IHRoZSBudW1iZXIgb2Yga2V5cyBpbiB0aGUgZGF0YXN0b3JlIHRvIHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICBmdW5jdGlvbiBsZW5ndGgoY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgcHJvbWlzZSA9IHNlbGYua2V5cygpLnRoZW4oZnVuY3Rpb24oa2V5cykge1xuICAgICAgICAgICAgcmV0dXJuIGtleXMubGVuZ3RoO1xuICAgICAgICB9KTtcblxuICAgICAgICBleGVjdXRlQ2FsbGJhY2socHJvbWlzZSwgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgYW4gaXRlbSBmcm9tIHRoZSBzdG9yZSwgbmljZSBhbmQgc2ltcGxlLlxuICAgIGZ1bmN0aW9uIHJlbW92ZUl0ZW0oa2V5LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgLy8gQ2FzdCB0aGUga2V5IHRvIGEgc3RyaW5nLCBhcyB0aGF0J3MgYWxsIHdlIGNhbiBzZXQgYXMgYSBrZXkuXG4gICAgICAgIGlmICh0eXBlb2Yga2V5ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgd2luZG93LmNvbnNvbGUud2FybihrZXkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnIHVzZWQgYXMgYSBrZXksIGJ1dCBpdCBpcyBub3QgYSBzdHJpbmcuJyk7XG4gICAgICAgICAgICBrZXkgPSBTdHJpbmcoa2V5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwcm9taXNlID0gc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZGJJbmZvID0gc2VsZi5fZGJJbmZvO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oZGJJbmZvLmtleVByZWZpeCArIGtleSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4ZWN1dGVDYWxsYmFjayhwcm9taXNlLCBjYWxsYmFjayk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cblxuICAgIC8vIFNldCBhIGtleSdzIHZhbHVlIGFuZCBydW4gYW4gb3B0aW9uYWwgY2FsbGJhY2sgb25jZSB0aGUgdmFsdWUgaXMgc2V0LlxuICAgIC8vIFVubGlrZSBHYWlhJ3MgaW1wbGVtZW50YXRpb24sIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBpcyBwYXNzZWQgdGhlIHZhbHVlLFxuICAgIC8vIGluIGNhc2UgeW91IHdhbnQgdG8gb3BlcmF0ZSBvbiB0aGF0IHZhbHVlIG9ubHkgYWZ0ZXIgeW91J3JlIHN1cmUgaXRcbiAgICAvLyBzYXZlZCwgb3Igc29tZXRoaW5nIGxpa2UgdGhhdC5cbiAgICBmdW5jdGlvbiBzZXRJdGVtKGtleSwgdmFsdWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAvLyBDYXN0IHRoZSBrZXkgdG8gYSBzdHJpbmcsIGFzIHRoYXQncyBhbGwgd2UgY2FuIHNldCBhcyBhIGtleS5cbiAgICAgICAgaWYgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB3aW5kb3cuY29uc29sZS53YXJuKGtleSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgdXNlZCBhcyBhIGtleSwgYnV0IGl0IGlzIG5vdCBhIHN0cmluZy4nKTtcbiAgICAgICAgICAgIGtleSA9IFN0cmluZyhrZXkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHByb21pc2UgPSBzZWxmLnJlYWR5KCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIENvbnZlcnQgdW5kZWZpbmVkIHZhbHVlcyB0byBudWxsLlxuICAgICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21vemlsbGEvbG9jYWxGb3JhZ2UvcHVsbC80MlxuICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNhdmUgdGhlIG9yaWdpbmFsIHZhbHVlIHRvIHBhc3MgdG8gdGhlIGNhbGxiYWNrLlxuICAgICAgICAgICAgdmFyIG9yaWdpbmFsVmFsdWUgPSB2YWx1ZTtcblxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICAgIHNlcmlhbGl6ZXIuc2VyaWFsaXplKHZhbHVlLCBmdW5jdGlvbih2YWx1ZSwgZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGJJbmZvID0gc2VsZi5fZGJJbmZvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGRiSW5mby5rZXlQcmVmaXggKyBrZXksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG9yaWdpbmFsVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxvY2FsU3RvcmFnZSBjYXBhY2l0eSBleGNlZWRlZC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBNYWtlIHRoaXMgYSBzcGVjaWZpYyBlcnJvci9ldmVudC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS5uYW1lID09PSAnUXVvdGFFeGNlZWRlZEVycm9yJyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLm5hbWUgPT09ICdOU19FUlJPUl9ET01fUVVPVEFfUkVBQ0hFRCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBleGVjdXRlQ2FsbGJhY2socHJvbWlzZSwgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleGVjdXRlQ2FsbGJhY2socHJvbWlzZSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgbG9jYWxTdG9yYWdlV3JhcHBlciA9IHtcbiAgICAgICAgX2RyaXZlcjogJ2xvY2FsU3RvcmFnZVdyYXBwZXInLFxuICAgICAgICBfaW5pdFN0b3JhZ2U6IF9pbml0U3RvcmFnZSxcbiAgICAgICAgLy8gRGVmYXVsdCBBUEksIGZyb20gR2FpYS9sb2NhbFN0b3JhZ2UuXG4gICAgICAgIGl0ZXJhdGU6IGl0ZXJhdGUsXG4gICAgICAgIGdldEl0ZW06IGdldEl0ZW0sXG4gICAgICAgIHNldEl0ZW06IHNldEl0ZW0sXG4gICAgICAgIHJlbW92ZUl0ZW06IHJlbW92ZUl0ZW0sXG4gICAgICAgIGNsZWFyOiBjbGVhcixcbiAgICAgICAgbGVuZ3RoOiBsZW5ndGgsXG4gICAgICAgIGtleToga2V5LFxuICAgICAgICBrZXlzOiBrZXlzXG4gICAgfTtcblxuICAgIGlmIChtb2R1bGVUeXBlID09PSBNb2R1bGVUeXBlLkVYUE9SVCkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGxvY2FsU3RvcmFnZVdyYXBwZXI7XG4gICAgfSBlbHNlIGlmIChtb2R1bGVUeXBlID09PSBNb2R1bGVUeXBlLkRFRklORSkge1xuICAgICAgICBkZWZpbmUoJ2xvY2FsU3RvcmFnZVdyYXBwZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBsb2NhbFN0b3JhZ2VXcmFwcGVyO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxvY2FsU3RvcmFnZVdyYXBwZXIgPSBsb2NhbFN0b3JhZ2VXcmFwcGVyO1xuICAgIH1cbn0pLmNhbGwod2luZG93KTtcbiIsIi8qXG4gKiBJbmNsdWRlcyBjb2RlIGZyb206XG4gKlxuICogYmFzZTY0LWFycmF5YnVmZmVyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbmlrbGFzdmgvYmFzZTY0LWFycmF5YnVmZmVyXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEyIE5pa2xhcyB2b24gSGVydHplblxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuICovXG4oZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gUHJvbWlzZXMhXG4gICAgdmFyIFByb21pc2UgPSAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpID9cbiAgICAgICAgICAgICAgICAgIHJlcXVpcmUoJ3Byb21pc2UnKSA6IHRoaXMuUHJvbWlzZTtcblxuICAgIHZhciBnbG9iYWxPYmplY3QgPSB0aGlzO1xuICAgIHZhciBzZXJpYWxpemVyID0gbnVsbDtcbiAgICB2YXIgb3BlbkRhdGFiYXNlID0gdGhpcy5vcGVuRGF0YWJhc2U7XG5cbiAgICAvLyBJZiBXZWJTUUwgbWV0aG9kcyBhcmVuJ3QgYXZhaWxhYmxlLCB3ZSBjYW4gc3RvcCBub3cuXG4gICAgaWYgKCFvcGVuRGF0YWJhc2UpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBNb2R1bGVUeXBlID0ge1xuICAgICAgICBERUZJTkU6IDEsXG4gICAgICAgIEVYUE9SVDogMixcbiAgICAgICAgV0lORE9XOiAzXG4gICAgfTtcblxuICAgIC8vIEF0dGFjaGluZyB0byB3aW5kb3cgKGkuZS4gbm8gbW9kdWxlIGxvYWRlcikgaXMgdGhlIGFzc3VtZWQsXG4gICAgLy8gc2ltcGxlIGRlZmF1bHQuXG4gICAgdmFyIG1vZHVsZVR5cGUgPSBNb2R1bGVUeXBlLldJTkRPVztcblxuICAgIC8vIEZpbmQgb3V0IHdoYXQga2luZCBvZiBtb2R1bGUgc2V0dXAgd2UgaGF2ZTsgaWYgbm9uZSwgd2UnbGwganVzdCBhdHRhY2hcbiAgICAvLyBsb2NhbEZvcmFnZSB0byB0aGUgbWFpbiB3aW5kb3cuXG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIG1vZHVsZVR5cGUgPSBNb2R1bGVUeXBlLkVYUE9SVDtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBtb2R1bGVUeXBlID0gTW9kdWxlVHlwZS5ERUZJTkU7XG4gICAgfVxuXG4gICAgLy8gT3BlbiB0aGUgV2ViU1FMIGRhdGFiYXNlIChhdXRvbWF0aWNhbGx5IGNyZWF0ZXMgb25lIGlmIG9uZSBkaWRuJ3RcbiAgICAvLyBwcmV2aW91c2x5IGV4aXN0KSwgdXNpbmcgYW55IG9wdGlvbnMgc2V0IGluIHRoZSBjb25maWcuXG4gICAgZnVuY3Rpb24gX2luaXRTdG9yYWdlKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgZGJJbmZvID0ge1xuICAgICAgICAgICAgZGI6IG51bGxcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAob3B0aW9ucykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgZGJJbmZvW2ldID0gdHlwZW9mKG9wdGlvbnNbaV0pICE9PSAnc3RyaW5nJyA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uc1tpXS50b1N0cmluZygpIDogb3B0aW9uc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzZXJpYWxpemVyUHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUvKiwgcmVqZWN0Ki8pIHtcbiAgICAgICAgICAgIC8vIFdlIGFsbG93IGxvY2FsRm9yYWdlIHRvIGJlIGRlY2xhcmVkIGFzIGEgbW9kdWxlIG9yIGFzIGFcbiAgICAgICAgICAgIC8vIGxpYnJhcnkgYXZhaWxhYmxlIHdpdGhvdXQgQU1EL3JlcXVpcmUuanMuXG4gICAgICAgICAgICBpZiAobW9kdWxlVHlwZSA9PT0gTW9kdWxlVHlwZS5ERUZJTkUpIHtcbiAgICAgICAgICAgICAgICByZXF1aXJlKFsnbG9jYWxmb3JhZ2VTZXJpYWxpemVyJ10sIHJlc29sdmUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtb2R1bGVUeXBlID09PSBNb2R1bGVUeXBlLkVYUE9SVCkge1xuICAgICAgICAgICAgICAgIC8vIE1ha2luZyBpdCBicm93c2VyaWZ5IGZyaWVuZGx5XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXF1aXJlKCcuLy4uL3V0aWxzL3NlcmlhbGl6ZXInKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZ2xvYmFsT2JqZWN0LmxvY2FsZm9yYWdlU2VyaWFsaXplcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBkYkluZm9Qcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAvLyBPcGVuIHRoZSBkYXRhYmFzZTsgdGhlIG9wZW5EYXRhYmFzZSBBUEkgd2lsbCBhdXRvbWF0aWNhbGx5XG4gICAgICAgICAgICAvLyBjcmVhdGUgaXQgZm9yIHVzIGlmIGl0IGRvZXNuJ3QgZXhpc3QuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGRiSW5mby5kYiA9IG9wZW5EYXRhYmFzZShkYkluZm8ubmFtZSwgU3RyaW5nKGRiSW5mby52ZXJzaW9uKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGJJbmZvLmRlc2NyaXB0aW9uLCBkYkluZm8uc2l6ZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuc2V0RHJpdmVyKHNlbGYuTE9DQUxTVE9SQUdFKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5faW5pdFN0b3JhZ2Uob3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfSkudGhlbihyZXNvbHZlKS5jYXRjaChyZWplY3QpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDcmVhdGUgb3VyIGtleS92YWx1ZSB0YWJsZSBpZiBpdCBkb2Vzbid0IGV4aXN0LlxuICAgICAgICAgICAgZGJJbmZvLmRiLnRyYW5zYWN0aW9uKGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgICAgICAgICB0LmV4ZWN1dGVTcWwoJ0NSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTICcgKyBkYkluZm8uc3RvcmVOYW1lICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAoaWQgSU5URUdFUiBQUklNQVJZIEtFWSwga2V5IHVuaXF1ZSwgdmFsdWUpJywgW10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9kYkluZm8gPSBkYkluZm87XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbih0LCBlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzZXJpYWxpemVyUHJvbWlzZS50aGVuKGZ1bmN0aW9uKGxpYikge1xuICAgICAgICAgICAgc2VyaWFsaXplciA9IGxpYjtcbiAgICAgICAgICAgIHJldHVybiBkYkluZm9Qcm9taXNlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRJdGVtKGtleSwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIC8vIENhc3QgdGhlIGtleSB0byBhIHN0cmluZywgYXMgdGhhdCdzIGFsbCB3ZSBjYW4gc2V0IGFzIGEga2V5LlxuICAgICAgICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHdpbmRvdy5jb25zb2xlLndhcm4oa2V5ICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyB1c2VkIGFzIGEga2V5LCBidXQgaXQgaXMgbm90IGEgc3RyaW5nLicpO1xuICAgICAgICAgICAga2V5ID0gU3RyaW5nKGtleSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcbiAgICAgICAgICAgICAgICBkYkluZm8uZGIudHJhbnNhY3Rpb24oZnVuY3Rpb24odCkge1xuICAgICAgICAgICAgICAgICAgICB0LmV4ZWN1dGVTcWwoJ1NFTEVDVCAqIEZST00gJyArIGRiSW5mby5zdG9yZU5hbWUgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyBXSEVSRSBrZXkgPSA/IExJTUlUIDEnLCBba2V5XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKHQsIHJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSByZXN1bHRzLnJvd3MubGVuZ3RoID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnJvd3MuaXRlbSgwKS52YWx1ZSA6IG51bGw7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIHRvIHNlZSBpZiB0aGlzIGlzIHNlcmlhbGl6ZWQgY29udGVudCB3ZSBuZWVkIHRvXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB1bnBhY2suXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gc2VyaWFsaXplci5kZXNlcmlhbGl6ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHQsIGVycm9yKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXRlcmF0ZShpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBzZWxmLnJlYWR5KCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGJJbmZvID0gc2VsZi5fZGJJbmZvO1xuXG4gICAgICAgICAgICAgICAgZGJJbmZvLmRiLnRyYW5zYWN0aW9uKGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdC5leGVjdXRlU3FsKCdTRUxFQ1QgKiBGUk9NICcgKyBkYkluZm8uc3RvcmVOYW1lLCBbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKHQsIHJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcm93cyA9IHJlc3VsdHMucm93cztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGVuZ3RoID0gcm93cy5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpdGVtID0gcm93cy5pdGVtKGkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gaXRlbS52YWx1ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayB0byBzZWUgaWYgdGhpcyBpcyBzZXJpYWxpemVkIGNvbnRlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2UgbmVlZCB0byB1bnBhY2suXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHNlcmlhbGl6ZXIuZGVzZXJpYWxpemUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGl0ZXJhdG9yKHJlc3VsdCwgaXRlbS5rZXksIGkgKyAxKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB2b2lkKDApIHByZXZlbnRzIHByb2JsZW1zIHdpdGggcmVkZWZpbml0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9mIGB1bmRlZmluZWRgLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICE9PSB2b2lkKDApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbih0LCBlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4ZWN1dGVDYWxsYmFjayhwcm9taXNlLCBjYWxsYmFjayk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldEl0ZW0oa2V5LCB2YWx1ZSwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIC8vIENhc3QgdGhlIGtleSB0byBhIHN0cmluZywgYXMgdGhhdCdzIGFsbCB3ZSBjYW4gc2V0IGFzIGEga2V5LlxuICAgICAgICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHdpbmRvdy5jb25zb2xlLndhcm4oa2V5ICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyB1c2VkIGFzIGEga2V5LCBidXQgaXQgaXMgbm90IGEgc3RyaW5nLicpO1xuICAgICAgICAgICAga2V5ID0gU3RyaW5nKGtleSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhlIGxvY2FsU3RvcmFnZSBBUEkgZG9lc24ndCByZXR1cm4gdW5kZWZpbmVkIHZhbHVlcyBpbiBhblxuICAgICAgICAgICAgICAgIC8vIFwiZXhwZWN0ZWRcIiB3YXksIHNvIHVuZGVmaW5lZCBpcyBhbHdheXMgY2FzdCB0byBudWxsIGluIGFsbFxuICAgICAgICAgICAgICAgIC8vIGRyaXZlcnMuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL21vemlsbGEvbG9jYWxGb3JhZ2UvcHVsbC80MlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTYXZlIHRoZSBvcmlnaW5hbCB2YWx1ZSB0byBwYXNzIHRvIHRoZSBjYWxsYmFjay5cbiAgICAgICAgICAgICAgICB2YXIgb3JpZ2luYWxWYWx1ZSA9IHZhbHVlO1xuXG4gICAgICAgICAgICAgICAgc2VyaWFsaXplci5zZXJpYWxpemUodmFsdWUsIGZ1bmN0aW9uKHZhbHVlLCBlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGJJbmZvID0gc2VsZi5fZGJJbmZvO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGJJbmZvLmRiLnRyYW5zYWN0aW9uKGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmV4ZWN1dGVTcWwoJ0lOU0VSVCBPUiBSRVBMQUNFIElOVE8gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRiSW5mby5zdG9yZU5hbWUgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnIChrZXksIHZhbHVlKSBWQUxVRVMgKD8sID8pJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW2tleSwgdmFsdWVdLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShvcmlnaW5hbFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbih0LCBlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oc3FsRXJyb3IpIHsgLy8gVGhlIHRyYW5zYWN0aW9uIGZhaWxlZDsgY2hlY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvIHNlZSBpZiBpdCdzIGEgcXVvdGEgZXJyb3IuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNxbEVycm9yLmNvZGUgPT09IHNxbEVycm9yLlFVT1RBX0VSUikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSByZWplY3QgdGhlIGNhbGxiYWNrIG91dHJpZ2h0IGZvciBub3csIGJ1dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpdCdzIHdvcnRoIHRyeWluZyB0byByZS1ydW4gdGhlIHRyYW5zYWN0aW9uLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBFdmVuIGlmIHRoZSB1c2VyIGFjY2VwdHMgdGhlIHByb21wdCB0byB1c2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbW9yZSBzdG9yYWdlIG9uIFNhZmFyaSwgdGhpcyBlcnJvciB3aWxsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJlIGNhbGxlZC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogVHJ5IHRvIHJlLXJ1biB0aGUgdHJhbnNhY3Rpb24uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChzcWxFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4ZWN1dGVDYWxsYmFjayhwcm9taXNlLCBjYWxsYmFjayk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbW92ZUl0ZW0oa2V5LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgLy8gQ2FzdCB0aGUga2V5IHRvIGEgc3RyaW5nLCBhcyB0aGF0J3MgYWxsIHdlIGNhbiBzZXQgYXMgYSBrZXkuXG4gICAgICAgIGlmICh0eXBlb2Yga2V5ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgd2luZG93LmNvbnNvbGUud2FybihrZXkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnIHVzZWQgYXMgYSBrZXksIGJ1dCBpdCBpcyBub3QgYSBzdHJpbmcuJyk7XG4gICAgICAgICAgICBrZXkgPSBTdHJpbmcoa2V5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBzZWxmLnJlYWR5KCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGJJbmZvID0gc2VsZi5fZGJJbmZvO1xuICAgICAgICAgICAgICAgIGRiSW5mby5kYi50cmFuc2FjdGlvbihmdW5jdGlvbih0KSB7XG4gICAgICAgICAgICAgICAgICAgIHQuZXhlY3V0ZVNxbCgnREVMRVRFIEZST00gJyArIGRiSW5mby5zdG9yZU5hbWUgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyBXSEVSRSBrZXkgPSA/JywgW2tleV0sIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHQsIGVycm9yKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuXG4gICAgLy8gRGVsZXRlcyBldmVyeSBpdGVtIGluIHRoZSB0YWJsZS5cbiAgICAvLyBUT0RPOiBGaW5kIG91dCBpZiB0aGlzIHJlc2V0cyB0aGUgQVVUT19JTkNSRU1FTlQgbnVtYmVyLlxuICAgIGZ1bmN0aW9uIGNsZWFyKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgc2VsZi5yZWFkeSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRiSW5mbyA9IHNlbGYuX2RiSW5mbztcbiAgICAgICAgICAgICAgICBkYkluZm8uZGIudHJhbnNhY3Rpb24oZnVuY3Rpb24odCkge1xuICAgICAgICAgICAgICAgICAgICB0LmV4ZWN1dGVTcWwoJ0RFTEVURSBGUk9NICcgKyBkYkluZm8uc3RvcmVOYW1lLCBbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbih0LCBlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcblxuICAgICAgICBleGVjdXRlQ2FsbGJhY2socHJvbWlzZSwgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG5cbiAgICAvLyBEb2VzIGEgc2ltcGxlIGBDT1VOVChrZXkpYCB0byBnZXQgdGhlIG51bWJlciBvZiBpdGVtcyBzdG9yZWQgaW5cbiAgICAvLyBsb2NhbEZvcmFnZS5cbiAgICBmdW5jdGlvbiBsZW5ndGgoY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBzZWxmLnJlYWR5KCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGJJbmZvID0gc2VsZi5fZGJJbmZvO1xuICAgICAgICAgICAgICAgIGRiSW5mby5kYi50cmFuc2FjdGlvbihmdW5jdGlvbih0KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFoaGgsIFNRTCBtYWtlcyB0aGlzIG9uZSBzb29vb29vIGVhc3kuXG4gICAgICAgICAgICAgICAgICAgIHQuZXhlY3V0ZVNxbCgnU0VMRUNUIENPVU5UKGtleSkgYXMgYyBGUk9NICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGJJbmZvLnN0b3JlTmFtZSwgW10sIGZ1bmN0aW9uKHQsIHJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSByZXN1bHRzLnJvd3MuaXRlbSgwKS5jO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHQsIGVycm9yKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRoZSBrZXkgbG9jYXRlZCBhdCBrZXkgaW5kZXggWDsgZXNzZW50aWFsbHkgZ2V0cyB0aGUga2V5IGZyb20gYVxuICAgIC8vIGBXSEVSRSBpZCA9ID9gLiBUaGlzIGlzIHRoZSBtb3N0IGVmZmljaWVudCB3YXkgSSBjYW4gdGhpbmsgdG8gaW1wbGVtZW50XG4gICAgLy8gdGhpcyByYXJlbHktdXNlZCAoaW4gbXkgZXhwZXJpZW5jZSkgcGFydCBvZiB0aGUgQVBJLCBidXQgaXQgY2FuIHNlZW1cbiAgICAvLyBpbmNvbnNpc3RlbnQsIGJlY2F1c2Ugd2UgZG8gYElOU0VSVCBPUiBSRVBMQUNFIElOVE9gIG9uIGBzZXRJdGVtKClgLCBzb1xuICAgIC8vIHRoZSBJRCBvZiBlYWNoIGtleSB3aWxsIGNoYW5nZSBldmVyeSB0aW1lIGl0J3MgdXBkYXRlZC4gUGVyaGFwcyBhIHN0b3JlZFxuICAgIC8vIHByb2NlZHVyZSBmb3IgdGhlIGBzZXRJdGVtKClgIFNRTCB3b3VsZCBzb2x2ZSB0aGlzIHByb2JsZW0/XG4gICAgLy8gVE9ETzogRG9uJ3QgY2hhbmdlIElEIG9uIGBzZXRJdGVtKClgLlxuICAgIGZ1bmN0aW9uIGtleShuLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBkYkluZm8gPSBzZWxmLl9kYkluZm87XG4gICAgICAgICAgICAgICAgZGJJbmZvLmRiLnRyYW5zYWN0aW9uKGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdC5leGVjdXRlU3FsKCdTRUxFQ1Qga2V5IEZST00gJyArIGRiSW5mby5zdG9yZU5hbWUgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyBXSEVSRSBpZCA9ID8gTElNSVQgMScsIFtuICsgMV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbih0LCByZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gcmVzdWx0cy5yb3dzLmxlbmd0aCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5yb3dzLml0ZW0oMCkua2V5IDogbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24odCwgZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXhlY3V0ZUNhbGxiYWNrKHByb21pc2UsIGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24ga2V5cyhjYWxsYmFjaykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHNlbGYucmVhZHkoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBkYkluZm8gPSBzZWxmLl9kYkluZm87XG4gICAgICAgICAgICAgICAgZGJJbmZvLmRiLnRyYW5zYWN0aW9uKGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdC5leGVjdXRlU3FsKCdTRUxFQ1Qga2V5IEZST00gJyArIGRiSW5mby5zdG9yZU5hbWUsIFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24odCwgcmVzdWx0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGtleXMgPSBbXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXN1bHRzLnJvd3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2gocmVzdWx0cy5yb3dzLml0ZW0oaSkua2V5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShrZXlzKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24odCwgZXJyb3IpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcblxuICAgICAgICBleGVjdXRlQ2FsbGJhY2socHJvbWlzZSwgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleGVjdXRlQ2FsbGJhY2socHJvbWlzZSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgd2ViU1FMU3RvcmFnZSA9IHtcbiAgICAgICAgX2RyaXZlcjogJ3dlYlNRTFN0b3JhZ2UnLFxuICAgICAgICBfaW5pdFN0b3JhZ2U6IF9pbml0U3RvcmFnZSxcbiAgICAgICAgaXRlcmF0ZTogaXRlcmF0ZSxcbiAgICAgICAgZ2V0SXRlbTogZ2V0SXRlbSxcbiAgICAgICAgc2V0SXRlbTogc2V0SXRlbSxcbiAgICAgICAgcmVtb3ZlSXRlbTogcmVtb3ZlSXRlbSxcbiAgICAgICAgY2xlYXI6IGNsZWFyLFxuICAgICAgICBsZW5ndGg6IGxlbmd0aCxcbiAgICAgICAga2V5OiBrZXksXG4gICAgICAgIGtleXM6IGtleXNcbiAgICB9O1xuXG4gICAgaWYgKG1vZHVsZVR5cGUgPT09IE1vZHVsZVR5cGUuREVGSU5FKSB7XG4gICAgICAgIGRlZmluZSgnd2ViU1FMU3RvcmFnZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHdlYlNRTFN0b3JhZ2U7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAobW9kdWxlVHlwZSA9PT0gTW9kdWxlVHlwZS5FWFBPUlQpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSB3ZWJTUUxTdG9yYWdlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMud2ViU1FMU3RvcmFnZSA9IHdlYlNRTFN0b3JhZ2U7XG4gICAgfVxufSkuY2FsbCh3aW5kb3cpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIFByb21pc2VzIVxuICAgIHZhciBQcm9taXNlID0gKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSA/XG4gICAgICAgICAgICAgICAgICByZXF1aXJlKCdwcm9taXNlJykgOiB0aGlzLlByb21pc2U7XG5cbiAgICAvLyBDdXN0b20gZHJpdmVycyBhcmUgc3RvcmVkIGhlcmUgd2hlbiBgZGVmaW5lRHJpdmVyKClgIGlzIGNhbGxlZC5cbiAgICAvLyBUaGV5IGFyZSBzaGFyZWQgYWNyb3NzIGFsbCBpbnN0YW5jZXMgb2YgbG9jYWxGb3JhZ2UuXG4gICAgdmFyIEN1c3RvbURyaXZlcnMgPSB7fTtcblxuICAgIHZhciBEcml2ZXJUeXBlID0ge1xuICAgICAgICBJTkRFWEVEREI6ICdhc3luY1N0b3JhZ2UnLFxuICAgICAgICBMT0NBTFNUT1JBR0U6ICdsb2NhbFN0b3JhZ2VXcmFwcGVyJyxcbiAgICAgICAgV0VCU1FMOiAnd2ViU1FMU3RvcmFnZSdcbiAgICB9O1xuXG4gICAgdmFyIERlZmF1bHREcml2ZXJPcmRlciA9IFtcbiAgICAgICAgRHJpdmVyVHlwZS5JTkRFWEVEREIsXG4gICAgICAgIERyaXZlclR5cGUuV0VCU1FMLFxuICAgICAgICBEcml2ZXJUeXBlLkxPQ0FMU1RPUkFHRVxuICAgIF07XG5cbiAgICB2YXIgTGlicmFyeU1ldGhvZHMgPSBbXG4gICAgICAgICdjbGVhcicsXG4gICAgICAgICdnZXRJdGVtJyxcbiAgICAgICAgJ2l0ZXJhdGUnLFxuICAgICAgICAna2V5JyxcbiAgICAgICAgJ2tleXMnLFxuICAgICAgICAnbGVuZ3RoJyxcbiAgICAgICAgJ3JlbW92ZUl0ZW0nLFxuICAgICAgICAnc2V0SXRlbSdcbiAgICBdO1xuXG4gICAgdmFyIE1vZHVsZVR5cGUgPSB7XG4gICAgICAgIERFRklORTogMSxcbiAgICAgICAgRVhQT1JUOiAyLFxuICAgICAgICBXSU5ET1c6IDNcbiAgICB9O1xuXG4gICAgdmFyIERlZmF1bHRDb25maWcgPSB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiAnJyxcbiAgICAgICAgZHJpdmVyOiBEZWZhdWx0RHJpdmVyT3JkZXIuc2xpY2UoKSxcbiAgICAgICAgbmFtZTogJ2xvY2FsZm9yYWdlJyxcbiAgICAgICAgLy8gRGVmYXVsdCBEQiBzaXplIGlzIF9KVVNUIFVOREVSXyA1TUIsIGFzIGl0J3MgdGhlIGhpZ2hlc3Qgc2l6ZVxuICAgICAgICAvLyB3ZSBjYW4gdXNlIHdpdGhvdXQgYSBwcm9tcHQuXG4gICAgICAgIHNpemU6IDQ5ODA3MzYsXG4gICAgICAgIHN0b3JlTmFtZTogJ2tleXZhbHVlcGFpcnMnLFxuICAgICAgICB2ZXJzaW9uOiAxLjBcbiAgICB9O1xuXG4gICAgLy8gQXR0YWNoaW5nIHRvIHdpbmRvdyAoaS5lLiBubyBtb2R1bGUgbG9hZGVyKSBpcyB0aGUgYXNzdW1lZCxcbiAgICAvLyBzaW1wbGUgZGVmYXVsdC5cbiAgICB2YXIgbW9kdWxlVHlwZSA9IE1vZHVsZVR5cGUuV0lORE9XO1xuXG4gICAgLy8gRmluZCBvdXQgd2hhdCBraW5kIG9mIG1vZHVsZSBzZXR1cCB3ZSBoYXZlOyBpZiBub25lLCB3ZSdsbCBqdXN0IGF0dGFjaFxuICAgIC8vIGxvY2FsRm9yYWdlIHRvIHRoZSBtYWluIHdpbmRvdy5cbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgbW9kdWxlVHlwZSA9IE1vZHVsZVR5cGUuRVhQT1JUO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIG1vZHVsZVR5cGUgPSBNb2R1bGVUeXBlLkRFRklORTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayB0byBzZWUgaWYgSW5kZXhlZERCIGlzIGF2YWlsYWJsZSBhbmQgaWYgaXQgaXMgdGhlIGxhdGVzdFxuICAgIC8vIGltcGxlbWVudGF0aW9uOyBpdCdzIG91ciBwcmVmZXJyZWQgYmFja2VuZCBsaWJyYXJ5LiBXZSB1c2UgXCJfc3BlY190ZXN0XCJcbiAgICAvLyBhcyB0aGUgbmFtZSBvZiB0aGUgZGF0YWJhc2UgYmVjYXVzZSBpdCdzIG5vdCB0aGUgb25lIHdlJ2xsIG9wZXJhdGUgb24sXG4gICAgLy8gYnV0IGl0J3MgdXNlZnVsIHRvIG1ha2Ugc3VyZSBpdHMgdXNpbmcgdGhlIHJpZ2h0IHNwZWMuXG4gICAgLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vbW96aWxsYS9sb2NhbEZvcmFnZS9pc3N1ZXMvMTI4XG4gICAgdmFyIGRyaXZlclN1cHBvcnQgPSAoZnVuY3Rpb24oc2VsZikge1xuICAgICAgICAvLyBJbml0aWFsaXplIEluZGV4ZWREQjsgZmFsbCBiYWNrIHRvIHZlbmRvci1wcmVmaXhlZCB2ZXJzaW9uc1xuICAgICAgICAvLyBpZiBuZWVkZWQuXG4gICAgICAgIHZhciBpbmRleGVkREIgPSBpbmRleGVkREIgfHwgc2VsZi5pbmRleGVkREIgfHwgc2VsZi53ZWJraXRJbmRleGVkREIgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYubW96SW5kZXhlZERCIHx8IHNlbGYuT0luZGV4ZWREQiB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5tc0luZGV4ZWREQjtcblxuICAgICAgICB2YXIgcmVzdWx0ID0ge307XG5cbiAgICAgICAgcmVzdWx0W0RyaXZlclR5cGUuV0VCU1FMXSA9ICEhc2VsZi5vcGVuRGF0YWJhc2U7XG4gICAgICAgIHJlc3VsdFtEcml2ZXJUeXBlLklOREVYRUREQl0gPSAhIShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIFdlIG1pbWljIFBvdWNoREIgaGVyZTsganVzdCBVQSB0ZXN0IGZvciBTYWZhcmkgKHdoaWNoLCBhcyBvZlxuICAgICAgICAgICAgLy8gaU9TIDgvWW9zZW1pdGUsIGRvZXNuJ3QgcHJvcGVybHkgc3VwcG9ydCBJbmRleGVkREIpLlxuICAgICAgICAgICAgLy8gSW5kZXhlZERCIHN1cHBvcnQgaXMgYnJva2VuIGFuZCBkaWZmZXJlbnQgZnJvbSBCbGluaydzLlxuICAgICAgICAgICAgLy8gVGhpcyBpcyBmYXN0ZXIgdGhhbiB0aGUgdGVzdCBjYXNlIChhbmQgaXQncyBzeW5jKSwgc28gd2UganVzdFxuICAgICAgICAgICAgLy8gZG8gdGhpcy4gKlNJR0gqXG4gICAgICAgICAgICAvLyBodHRwOi8vYmwub2Nrcy5vcmcvbm9sYW5sYXdzb24vcmF3L2M4M2U5MDM5ZWRmMjI3ODA0N2U5L1xuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIFdlIHRlc3QgZm9yIG9wZW5EYXRhYmFzZSBiZWNhdXNlIElFIE1vYmlsZSBpZGVudGlmaWVzIGl0c2VsZlxuICAgICAgICAgICAgLy8gYXMgU2FmYXJpLiBPaCB0aGUgbHVsei4uLlxuICAgICAgICAgICAgaWYgKHR5cGVvZiBzZWxmLm9wZW5EYXRhYmFzZSAhPT0gJ3VuZGVmaW5lZCcgJiYgc2VsZi5uYXZpZ2F0b3IgJiZcbiAgICAgICAgICAgICAgICBzZWxmLm5hdmlnYXRvci51c2VyQWdlbnQgJiZcbiAgICAgICAgICAgICAgICAvU2FmYXJpLy50ZXN0KHNlbGYubmF2aWdhdG9yLnVzZXJBZ2VudCkgJiZcbiAgICAgICAgICAgICAgICAhL0Nocm9tZS8udGVzdChzZWxmLm5hdmlnYXRvci51c2VyQWdlbnQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaW5kZXhlZERCICYmXG4gICAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiBpbmRleGVkREIub3BlbiA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgICAgICAgICAgICAgICAgICAvLyBTb21lIFNhbXN1bmcvSFRDIEFuZHJvaWQgNC4wLTQuMyBkZXZpY2VzXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIGhhdmUgb2xkZXIgSW5kZXhlZERCIHNwZWNzOyBpZiB0aGlzIGlzbid0IGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGVpciBJbmRleGVkREIgaXMgdG9vIG9sZCBmb3IgdXMgdG8gdXNlLlxuICAgICAgICAgICAgICAgICAgICAgICAvLyAoUmVwbGFjZXMgdGhlIG9udXBncmFkZW5lZWRlZCB0ZXN0LilcbiAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIHNlbGYuSURCS2V5UmFuZ2UgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcblxuICAgICAgICByZXN1bHRbRHJpdmVyVHlwZS5MT0NBTFNUT1JBR0VdID0gISEoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoc2VsZi5sb2NhbFN0b3JhZ2UgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICgnc2V0SXRlbScgaW4gc2VsZi5sb2NhbFN0b3JhZ2UpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAoc2VsZi5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSkpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0pKHRoaXMpO1xuXG4gICAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKGFyZykge1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFyZykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNhbGxXaGVuUmVhZHkobG9jYWxGb3JhZ2VJbnN0YW5jZSwgbGlicmFyeU1ldGhvZCkge1xuICAgICAgICBsb2NhbEZvcmFnZUluc3RhbmNlW2xpYnJhcnlNZXRob2RdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgX2FyZ3MgPSBhcmd1bWVudHM7XG4gICAgICAgICAgICByZXR1cm4gbG9jYWxGb3JhZ2VJbnN0YW5jZS5yZWFkeSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxvY2FsRm9yYWdlSW5zdGFuY2VbbGlicmFyeU1ldGhvZF0uYXBwbHkobG9jYWxGb3JhZ2VJbnN0YW5jZSwgX2FyZ3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGFyZyA9IGFyZ3VtZW50c1tpXTtcblxuICAgICAgICAgICAgaWYgKGFyZykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBhcmcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNBcnJheShhcmdba2V5XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHNbMF1ba2V5XSA9IGFyZ1trZXldLnNsaWNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50c1swXVtrZXldID0gYXJnW2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXJndW1lbnRzWzBdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzTGlicmFyeURyaXZlcihkcml2ZXJOYW1lKSB7XG4gICAgICAgIGZvciAodmFyIGRyaXZlciBpbiBEcml2ZXJUeXBlKSB7XG4gICAgICAgICAgICBpZiAoRHJpdmVyVHlwZS5oYXNPd25Qcm9wZXJ0eShkcml2ZXIpICYmXG4gICAgICAgICAgICAgICAgRHJpdmVyVHlwZVtkcml2ZXJdID09PSBkcml2ZXJOYW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIGdsb2JhbE9iamVjdCA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBMb2NhbEZvcmFnZShvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IGV4dGVuZCh7fSwgRGVmYXVsdENvbmZpZywgb3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX2RyaXZlclNldCA9IG51bGw7XG4gICAgICAgIHRoaXMuX3JlYWR5ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2RiSW5mbyA9IG51bGw7XG5cbiAgICAgICAgLy8gQWRkIGEgc3R1YiBmb3IgZWFjaCBkcml2ZXIgQVBJIG1ldGhvZCB0aGF0IGRlbGF5cyB0aGUgY2FsbCB0byB0aGVcbiAgICAgICAgLy8gY29ycmVzcG9uZGluZyBkcml2ZXIgbWV0aG9kIHVudGlsIGxvY2FsRm9yYWdlIGlzIHJlYWR5LiBUaGVzZSBzdHVic1xuICAgICAgICAvLyB3aWxsIGJlIHJlcGxhY2VkIGJ5IHRoZSBkcml2ZXIgbWV0aG9kcyBhcyBzb29uIGFzIHRoZSBkcml2ZXIgaXNcbiAgICAgICAgLy8gbG9hZGVkLCBzbyB0aGVyZSBpcyBubyBwZXJmb3JtYW5jZSBpbXBhY3QuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgTGlicmFyeU1ldGhvZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNhbGxXaGVuUmVhZHkodGhpcywgTGlicmFyeU1ldGhvZHNbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZXREcml2ZXIodGhpcy5fY29uZmlnLmRyaXZlcik7XG4gICAgfVxuXG4gICAgTG9jYWxGb3JhZ2UucHJvdG90eXBlLklOREVYRUREQiA9IERyaXZlclR5cGUuSU5ERVhFRERCO1xuICAgIExvY2FsRm9yYWdlLnByb3RvdHlwZS5MT0NBTFNUT1JBR0UgPSBEcml2ZXJUeXBlLkxPQ0FMU1RPUkFHRTtcbiAgICBMb2NhbEZvcmFnZS5wcm90b3R5cGUuV0VCU1FMID0gRHJpdmVyVHlwZS5XRUJTUUw7XG5cbiAgICAvLyBTZXQgYW55IGNvbmZpZyB2YWx1ZXMgZm9yIGxvY2FsRm9yYWdlOyBjYW4gYmUgY2FsbGVkIGFueXRpbWUgYmVmb3JlXG4gICAgLy8gdGhlIGZpcnN0IEFQSSBjYWxsIChlLmcuIGBnZXRJdGVtYCwgYHNldEl0ZW1gKS5cbiAgICAvLyBXZSBsb29wIHRocm91Z2ggb3B0aW9ucyBzbyB3ZSBkb24ndCBvdmVyd3JpdGUgZXhpc3RpbmcgY29uZmlnXG4gICAgLy8gdmFsdWVzLlxuICAgIExvY2FsRm9yYWdlLnByb3RvdHlwZS5jb25maWcgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIC8vIElmIHRoZSBvcHRpb25zIGFyZ3VtZW50IGlzIGFuIG9iamVjdCwgd2UgdXNlIGl0IHRvIHNldCB2YWx1ZXMuXG4gICAgICAgIC8vIE90aGVyd2lzZSwgd2UgcmV0dXJuIGVpdGhlciBhIHNwZWNpZmllZCBjb25maWcgdmFsdWUgb3IgYWxsXG4gICAgICAgIC8vIGNvbmZpZyB2YWx1ZXMuXG4gICAgICAgIGlmICh0eXBlb2Yob3B0aW9ucykgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBJZiBsb2NhbGZvcmFnZSBpcyByZWFkeSBhbmQgZnVsbHkgaW5pdGlhbGl6ZWQsIHdlIGNhbid0IHNldFxuICAgICAgICAgICAgLy8gYW55IG5ldyBjb25maWd1cmF0aW9uIHZhbHVlcy4gSW5zdGVhZCwgd2UgcmV0dXJuIGFuIGVycm9yLlxuICAgICAgICAgICAgaWYgKHRoaXMuX3JlYWR5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBFcnJvcihcIkNhbid0IGNhbGwgY29uZmlnKCkgYWZ0ZXIgbG9jYWxmb3JhZ2UgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2hhcyBiZWVuIHVzZWQuJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIGlmIChpID09PSAnc3RvcmVOYW1lJykge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zW2ldID0gb3B0aW9uc1tpXS5yZXBsYWNlKC9cXFcvZywgJ18nKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLl9jb25maWdbaV0gPSBvcHRpb25zW2ldO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBhZnRlciBhbGwgY29uZmlnIG9wdGlvbnMgYXJlIHNldCBhbmRcbiAgICAgICAgICAgIC8vIHRoZSBkcml2ZXIgb3B0aW9uIGlzIHVzZWQsIHRyeSBzZXR0aW5nIGl0XG4gICAgICAgICAgICBpZiAoJ2RyaXZlcicgaW4gb3B0aW9ucyAmJiBvcHRpb25zLmRyaXZlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0RHJpdmVyKHRoaXMuX2NvbmZpZy5kcml2ZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Yob3B0aW9ucykgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnW29wdGlvbnNdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZztcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBVc2VkIHRvIGRlZmluZSBhIGN1c3RvbSBkcml2ZXIsIHNoYXJlZCBhY3Jvc3MgYWxsIGluc3RhbmNlcyBvZlxuICAgIC8vIGxvY2FsRm9yYWdlLlxuICAgIExvY2FsRm9yYWdlLnByb3RvdHlwZS5kZWZpbmVEcml2ZXIgPSBmdW5jdGlvbihkcml2ZXJPYmplY3QsIGNhbGxiYWNrLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvckNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBkZWZpbmVEcml2ZXIgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIGRyaXZlck5hbWUgPSBkcml2ZXJPYmplY3QuX2RyaXZlcjtcbiAgICAgICAgICAgICAgICB2YXIgY29tcGxpYW5jZUVycm9yID0gbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgICAgICAnQ3VzdG9tIGRyaXZlciBub3QgY29tcGxpYW50OyBzZWUgJyArXG4gICAgICAgICAgICAgICAgICAgICdodHRwczovL21vemlsbGEuZ2l0aHViLmlvL2xvY2FsRm9yYWdlLyNkZWZpbmVkcml2ZXInXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB2YXIgbmFtaW5nRXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICdDdXN0b20gZHJpdmVyIG5hbWUgYWxyZWFkeSBpbiB1c2U6ICcgKyBkcml2ZXJPYmplY3QuX2RyaXZlclxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAvLyBBIGRyaXZlciBuYW1lIHNob3VsZCBiZSBkZWZpbmVkIGFuZCBub3Qgb3ZlcmxhcCB3aXRoIHRoZVxuICAgICAgICAgICAgICAgIC8vIGxpYnJhcnktZGVmaW5lZCwgZGVmYXVsdCBkcml2ZXJzLlxuICAgICAgICAgICAgICAgIGlmICghZHJpdmVyT2JqZWN0Ll9kcml2ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGNvbXBsaWFuY2VFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGlzTGlicmFyeURyaXZlcihkcml2ZXJPYmplY3QuX2RyaXZlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5hbWluZ0Vycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBjdXN0b21Ecml2ZXJNZXRob2RzID0gTGlicmFyeU1ldGhvZHMuY29uY2F0KCdfaW5pdFN0b3JhZ2UnKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGN1c3RvbURyaXZlck1ldGhvZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1c3RvbURyaXZlck1ldGhvZCA9IGN1c3RvbURyaXZlck1ldGhvZHNbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmICghY3VzdG9tRHJpdmVyTWV0aG9kIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAhZHJpdmVyT2JqZWN0W2N1c3RvbURyaXZlck1ldGhvZF0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiBkcml2ZXJPYmplY3RbY3VzdG9tRHJpdmVyTWV0aG9kXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGNvbXBsaWFuY2VFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgc3VwcG9ydFByb21pc2UgPSBQcm9taXNlLnJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKCdfc3VwcG9ydCcgIGluIGRyaXZlck9iamVjdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZHJpdmVyT2JqZWN0Ll9zdXBwb3J0ICYmIHR5cGVvZiBkcml2ZXJPYmplY3QuX3N1cHBvcnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1cHBvcnRQcm9taXNlID0gZHJpdmVyT2JqZWN0Ll9zdXBwb3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdXBwb3J0UHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSghIWRyaXZlck9iamVjdC5fc3VwcG9ydCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzdXBwb3J0UHJvbWlzZS50aGVuKGZ1bmN0aW9uKHN1cHBvcnRSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZHJpdmVyU3VwcG9ydFtkcml2ZXJOYW1lXSA9IHN1cHBvcnRSZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIEN1c3RvbURyaXZlcnNbZHJpdmVyTmFtZV0gPSBkcml2ZXJPYmplY3Q7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9LCByZWplY3QpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZGVmaW5lRHJpdmVyLnRoZW4oY2FsbGJhY2ssIGVycm9yQ2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gZGVmaW5lRHJpdmVyO1xuICAgIH07XG5cbiAgICBMb2NhbEZvcmFnZS5wcm90b3R5cGUuZHJpdmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kcml2ZXIgfHwgbnVsbDtcbiAgICB9O1xuXG4gICAgTG9jYWxGb3JhZ2UucHJvdG90eXBlLnJlYWR5ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciByZWFkeSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgc2VsZi5fZHJpdmVyU2V0LnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuX3JlYWR5ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlYWR5ID0gc2VsZi5faW5pdFN0b3JhZ2Uoc2VsZi5fY29uZmlnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzZWxmLl9yZWFkeS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZWFkeS50aGVuKGNhbGxiYWNrLCBjYWxsYmFjayk7XG4gICAgICAgIHJldHVybiByZWFkeTtcbiAgICB9O1xuXG4gICAgTG9jYWxGb3JhZ2UucHJvdG90eXBlLnNldERyaXZlciA9IGZ1bmN0aW9uKGRyaXZlcnMsIGNhbGxiYWNrLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvckNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICBpZiAodHlwZW9mIGRyaXZlcnMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBkcml2ZXJzID0gW2RyaXZlcnNdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fZHJpdmVyU2V0ID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgZHJpdmVyTmFtZSA9IHNlbGYuX2dldEZpcnN0U3VwcG9ydGVkRHJpdmVyKGRyaXZlcnMpO1xuICAgICAgICAgICAgdmFyIGVycm9yID0gbmV3IEVycm9yKCdObyBhdmFpbGFibGUgc3RvcmFnZSBtZXRob2QgZm91bmQuJyk7XG5cbiAgICAgICAgICAgIGlmICghZHJpdmVyTmFtZSkge1xuICAgICAgICAgICAgICAgIHNlbGYuX2RyaXZlclNldCA9IFByb21pc2UucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2VsZi5fZGJJbmZvID0gbnVsbDtcbiAgICAgICAgICAgIHNlbGYuX3JlYWR5ID0gbnVsbDtcblxuICAgICAgICAgICAgaWYgKGlzTGlicmFyeURyaXZlcihkcml2ZXJOYW1lKSkge1xuICAgICAgICAgICAgICAgIC8vIFdlIGFsbG93IGxvY2FsRm9yYWdlIHRvIGJlIGRlY2xhcmVkIGFzIGEgbW9kdWxlIG9yIGFzIGFcbiAgICAgICAgICAgICAgICAvLyBsaWJyYXJ5IGF2YWlsYWJsZSB3aXRob3V0IEFNRC9yZXF1aXJlLmpzLlxuICAgICAgICAgICAgICAgIGlmIChtb2R1bGVUeXBlID09PSBNb2R1bGVUeXBlLkRFRklORSkge1xuICAgICAgICAgICAgICAgICAgICByZXF1aXJlKFtkcml2ZXJOYW1lXSwgZnVuY3Rpb24obGliKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9leHRlbmQobGliKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtb2R1bGVUeXBlID09PSBNb2R1bGVUeXBlLkVYUE9SVCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBNYWtpbmcgaXQgYnJvd3NlcmlmeSBmcmllbmRseVxuICAgICAgICAgICAgICAgICAgICB2YXIgZHJpdmVyO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGRyaXZlck5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2Ugc2VsZi5JTkRFWEVEREI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJpdmVyID0gcmVxdWlyZSgnLi9kcml2ZXJzL2luZGV4ZWRkYicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBzZWxmLkxPQ0FMU1RPUkFHRTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcml2ZXIgPSByZXF1aXJlKCcuL2RyaXZlcnMvbG9jYWxzdG9yYWdlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHNlbGYuV0VCU1FMOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyaXZlciA9IHJlcXVpcmUoJy4vZHJpdmVycy93ZWJzcWwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX2V4dGVuZChkcml2ZXIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX2V4dGVuZChnbG9iYWxPYmplY3RbZHJpdmVyTmFtZV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQ3VzdG9tRHJpdmVyc1tkcml2ZXJOYW1lXSkge1xuICAgICAgICAgICAgICAgIHNlbGYuX2V4dGVuZChDdXN0b21Ecml2ZXJzW2RyaXZlck5hbWVdKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fZHJpdmVyU2V0ID0gUHJvbWlzZS5yZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIHNldERyaXZlclRvQ29uZmlnKCkge1xuICAgICAgICAgICAgc2VsZi5fY29uZmlnLmRyaXZlciA9IHNlbGYuZHJpdmVyKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZHJpdmVyU2V0LnRoZW4oc2V0RHJpdmVyVG9Db25maWcsIHNldERyaXZlclRvQ29uZmlnKTtcblxuICAgICAgICB0aGlzLl9kcml2ZXJTZXQudGhlbihjYWxsYmFjaywgZXJyb3JDYWxsYmFjayk7XG4gICAgICAgIHJldHVybiB0aGlzLl9kcml2ZXJTZXQ7XG4gICAgfTtcblxuICAgIExvY2FsRm9yYWdlLnByb3RvdHlwZS5zdXBwb3J0cyA9IGZ1bmN0aW9uKGRyaXZlck5hbWUpIHtcbiAgICAgICAgcmV0dXJuICEhZHJpdmVyU3VwcG9ydFtkcml2ZXJOYW1lXTtcbiAgICB9O1xuXG4gICAgTG9jYWxGb3JhZ2UucHJvdG90eXBlLl9leHRlbmQgPSBmdW5jdGlvbihsaWJyYXJ5TWV0aG9kc0FuZFByb3BlcnRpZXMpIHtcbiAgICAgICAgZXh0ZW5kKHRoaXMsIGxpYnJhcnlNZXRob2RzQW5kUHJvcGVydGllcyk7XG4gICAgfTtcblxuICAgIC8vIFVzZWQgdG8gZGV0ZXJtaW5lIHdoaWNoIGRyaXZlciB3ZSBzaG91bGQgdXNlIGFzIHRoZSBiYWNrZW5kIGZvciB0aGlzXG4gICAgLy8gaW5zdGFuY2Ugb2YgbG9jYWxGb3JhZ2UuXG4gICAgTG9jYWxGb3JhZ2UucHJvdG90eXBlLl9nZXRGaXJzdFN1cHBvcnRlZERyaXZlciA9IGZ1bmN0aW9uKGRyaXZlcnMpIHtcbiAgICAgICAgaWYgKGRyaXZlcnMgJiYgaXNBcnJheShkcml2ZXJzKSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkcml2ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRyaXZlciA9IGRyaXZlcnNbaV07XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zdXBwb3J0cyhkcml2ZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkcml2ZXI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcblxuICAgIExvY2FsRm9yYWdlLnByb3RvdHlwZS5jcmVhdGVJbnN0YW5jZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBMb2NhbEZvcmFnZShvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLy8gVGhlIGFjdHVhbCBsb2NhbEZvcmFnZSBvYmplY3QgdGhhdCB3ZSBleHBvc2UgYXMgYSBtb2R1bGUgb3IgdmlhIGFcbiAgICAvLyBnbG9iYWwuIEl0J3MgZXh0ZW5kZWQgYnkgcHVsbGluZyBpbiBvbmUgb2Ygb3VyIG90aGVyIGxpYnJhcmllcy5cbiAgICB2YXIgbG9jYWxGb3JhZ2UgPSBuZXcgTG9jYWxGb3JhZ2UoKTtcblxuICAgIC8vIFdlIGFsbG93IGxvY2FsRm9yYWdlIHRvIGJlIGRlY2xhcmVkIGFzIGEgbW9kdWxlIG9yIGFzIGEgbGlicmFyeVxuICAgIC8vIGF2YWlsYWJsZSB3aXRob3V0IEFNRC9yZXF1aXJlLmpzLlxuICAgIGlmIChtb2R1bGVUeXBlID09PSBNb2R1bGVUeXBlLkRFRklORSkge1xuICAgICAgICBkZWZpbmUoJ2xvY2FsZm9yYWdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gbG9jYWxGb3JhZ2U7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAobW9kdWxlVHlwZSA9PT0gTW9kdWxlVHlwZS5FWFBPUlQpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBsb2NhbEZvcmFnZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxvY2FsZm9yYWdlID0gbG9jYWxGb3JhZ2U7XG4gICAgfVxufSkuY2FsbCh3aW5kb3cpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIFNhZGx5LCB0aGUgYmVzdCB3YXkgdG8gc2F2ZSBiaW5hcnkgZGF0YSBpbiBXZWJTUUwvbG9jYWxTdG9yYWdlIGlzIHNlcmlhbGl6aW5nXG4gICAgLy8gaXQgdG8gQmFzZTY0LCBzbyB0aGlzIGlzIGhvdyB3ZSBzdG9yZSBpdCB0byBwcmV2ZW50IHZlcnkgc3RyYW5nZSBlcnJvcnMgd2l0aCBsZXNzXG4gICAgLy8gdmVyYm9zZSB3YXlzIG9mIGJpbmFyeSA8LT4gc3RyaW5nIGRhdGEgc3RvcmFnZS5cbiAgICB2YXIgQkFTRV9DSEFSUyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuICAgIHZhciBTRVJJQUxJWkVEX01BUktFUiA9ICdfX2xmc2NfXzonO1xuICAgIHZhciBTRVJJQUxJWkVEX01BUktFUl9MRU5HVEggPSBTRVJJQUxJWkVEX01BUktFUi5sZW5ndGg7XG5cbiAgICAvLyBPTUcgdGhlIHNlcmlhbGl6YXRpb25zIVxuICAgIHZhciBUWVBFX0FSUkFZQlVGRkVSID0gJ2FyYmYnO1xuICAgIHZhciBUWVBFX0JMT0IgPSAnYmxvYic7XG4gICAgdmFyIFRZUEVfSU5UOEFSUkFZID0gJ3NpMDgnO1xuICAgIHZhciBUWVBFX1VJTlQ4QVJSQVkgPSAndWkwOCc7XG4gICAgdmFyIFRZUEVfVUlOVDhDTEFNUEVEQVJSQVkgPSAndWljOCc7XG4gICAgdmFyIFRZUEVfSU5UMTZBUlJBWSA9ICdzaTE2JztcbiAgICB2YXIgVFlQRV9JTlQzMkFSUkFZID0gJ3NpMzInO1xuICAgIHZhciBUWVBFX1VJTlQxNkFSUkFZID0gJ3VyMTYnO1xuICAgIHZhciBUWVBFX1VJTlQzMkFSUkFZID0gJ3VpMzInO1xuICAgIHZhciBUWVBFX0ZMT0FUMzJBUlJBWSA9ICdmbDMyJztcbiAgICB2YXIgVFlQRV9GTE9BVDY0QVJSQVkgPSAnZmw2NCc7XG4gICAgdmFyIFRZUEVfU0VSSUFMSVpFRF9NQVJLRVJfTEVOR1RIID0gU0VSSUFMSVpFRF9NQVJLRVJfTEVOR1RIICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBUWVBFX0FSUkFZQlVGRkVSLmxlbmd0aDtcblxuICAgIC8vIFNlcmlhbGl6ZSBhIHZhbHVlLCBhZnRlcndhcmRzIGV4ZWN1dGluZyBhIGNhbGxiYWNrICh3aGljaCB1c3VhbGx5XG4gICAgLy8gaW5zdHJ1Y3RzIHRoZSBgc2V0SXRlbSgpYCBjYWxsYmFjay9wcm9taXNlIHRvIGJlIGV4ZWN1dGVkKS4gVGhpcyBpcyBob3dcbiAgICAvLyB3ZSBzdG9yZSBiaW5hcnkgZGF0YSB3aXRoIGxvY2FsU3RvcmFnZS5cbiAgICBmdW5jdGlvbiBzZXJpYWxpemUodmFsdWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciB2YWx1ZVN0cmluZyA9ICcnO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIHZhbHVlU3RyaW5nID0gdmFsdWUudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbm5vdCB1c2UgYHZhbHVlIGluc3RhbmNlb2YgQXJyYXlCdWZmZXJgIG9yIHN1Y2ggaGVyZSwgYXMgdGhlc2VcbiAgICAgICAgLy8gY2hlY2tzIGZhaWwgd2hlbiBydW5uaW5nIHRoZSB0ZXN0cyB1c2luZyBjYXNwZXIuanMuLi5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVE9ETzogU2VlIHdoeSB0aG9zZSB0ZXN0cyBmYWlsIGFuZCB1c2UgYSBiZXR0ZXIgc29sdXRpb24uXG4gICAgICAgIGlmICh2YWx1ZSAmJiAodmFsdWUudG9TdHJpbmcoKSA9PT0gJ1tvYmplY3QgQXJyYXlCdWZmZXJdJyB8fFxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLmJ1ZmZlciAmJlxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLmJ1ZmZlci50b1N0cmluZygpID09PSAnW29iamVjdCBBcnJheUJ1ZmZlcl0nKSkge1xuICAgICAgICAgICAgLy8gQ29udmVydCBiaW5hcnkgYXJyYXlzIHRvIGEgc3RyaW5nIGFuZCBwcmVmaXggdGhlIHN0cmluZyB3aXRoXG4gICAgICAgICAgICAvLyBhIHNwZWNpYWwgbWFya2VyLlxuICAgICAgICAgICAgdmFyIGJ1ZmZlcjtcbiAgICAgICAgICAgIHZhciBtYXJrZXIgPSBTRVJJQUxJWkVEX01BUktFUjtcblxuICAgICAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICAgICAgICBidWZmZXIgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBtYXJrZXIgKz0gVFlQRV9BUlJBWUJVRkZFUjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyID0gdmFsdWUuYnVmZmVyO1xuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlU3RyaW5nID09PSAnW29iamVjdCBJbnQ4QXJyYXldJykge1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXIgKz0gVFlQRV9JTlQ4QVJSQVk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZVN0cmluZyA9PT0gJ1tvYmplY3QgVWludDhBcnJheV0nKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcmtlciArPSBUWVBFX1VJTlQ4QVJSQVk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZVN0cmluZyA9PT0gJ1tvYmplY3QgVWludDhDbGFtcGVkQXJyYXldJykge1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXIgKz0gVFlQRV9VSU5UOENMQU1QRURBUlJBWTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlU3RyaW5nID09PSAnW29iamVjdCBJbnQxNkFycmF5XScpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyICs9IFRZUEVfSU5UMTZBUlJBWTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlU3RyaW5nID09PSAnW29iamVjdCBVaW50MTZBcnJheV0nKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcmtlciArPSBUWVBFX1VJTlQxNkFSUkFZO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWVTdHJpbmcgPT09ICdbb2JqZWN0IEludDMyQXJyYXldJykge1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXIgKz0gVFlQRV9JTlQzMkFSUkFZO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWVTdHJpbmcgPT09ICdbb2JqZWN0IFVpbnQzMkFycmF5XScpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyICs9IFRZUEVfVUlOVDMyQVJSQVk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZVN0cmluZyA9PT0gJ1tvYmplY3QgRmxvYXQzMkFycmF5XScpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyICs9IFRZUEVfRkxPQVQzMkFSUkFZO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWVTdHJpbmcgPT09ICdbb2JqZWN0IEZsb2F0NjRBcnJheV0nKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcmtlciArPSBUWVBFX0ZMT0FUNjRBUlJBWTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoJ0ZhaWxlZCB0byBnZXQgdHlwZSBmb3IgQmluYXJ5QXJyYXknKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWxsYmFjayhtYXJrZXIgKyBidWZmZXJUb1N0cmluZyhidWZmZXIpKTtcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZVN0cmluZyA9PT0gJ1tvYmplY3QgQmxvYl0nKSB7XG4gICAgICAgICAgICAvLyBDb252ZXIgdGhlIGJsb2IgdG8gYSBiaW5hcnlBcnJheSBhbmQgdGhlbiB0byBhIHN0cmluZy5cbiAgICAgICAgICAgIHZhciBmaWxlUmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgICAgICAgZmlsZVJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgc3RyID0gYnVmZmVyVG9TdHJpbmcodGhpcy5yZXN1bHQpO1xuXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soU0VSSUFMSVpFRF9NQVJLRVIgKyBUWVBFX0JMT0IgKyBzdHIpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZmlsZVJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcih2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKEpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmNvbnNvbGUuZXJyb3IoXCJDb3VsZG4ndCBjb252ZXJ0IHZhbHVlIGludG8gYSBKU09OIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc3RyaW5nOiAnLCB2YWx1ZSk7XG5cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIERlc2VyaWFsaXplIGRhdGEgd2UndmUgaW5zZXJ0ZWQgaW50byBhIHZhbHVlIGNvbHVtbi9maWVsZC4gV2UgcGxhY2VcbiAgICAvLyBzcGVjaWFsIG1hcmtlcnMgaW50byBvdXIgc3RyaW5ncyB0byBtYXJrIHRoZW0gYXMgZW5jb2RlZDsgdGhpcyBpc24ndFxuICAgIC8vIGFzIG5pY2UgYXMgYSBtZXRhIGZpZWxkLCBidXQgaXQncyB0aGUgb25seSBzYW5lIHRoaW5nIHdlIGNhbiBkbyB3aGlsc3RcbiAgICAvLyBrZWVwaW5nIGxvY2FsU3RvcmFnZSBzdXBwb3J0IGludGFjdC5cbiAgICAvL1xuICAgIC8vIE9mdGVudGltZXMgdGhpcyB3aWxsIGp1c3QgZGVzZXJpYWxpemUgSlNPTiBjb250ZW50LCBidXQgaWYgd2UgaGF2ZSBhXG4gICAgLy8gc3BlY2lhbCBtYXJrZXIgKFNFUklBTElaRURfTUFSS0VSLCBkZWZpbmVkIGFib3ZlKSwgd2Ugd2lsbCBleHRyYWN0XG4gICAgLy8gc29tZSBraW5kIG9mIGFycmF5YnVmZmVyL2JpbmFyeSBkYXRhL3R5cGVkIGFycmF5IG91dCBvZiB0aGUgc3RyaW5nLlxuICAgIGZ1bmN0aW9uIGRlc2VyaWFsaXplKHZhbHVlKSB7XG4gICAgICAgIC8vIElmIHdlIGhhdmVuJ3QgbWFya2VkIHRoaXMgc3RyaW5nIGFzIGJlaW5nIHNwZWNpYWxseSBzZXJpYWxpemVkIChpLmUuXG4gICAgICAgIC8vIHNvbWV0aGluZyBvdGhlciB0aGFuIHNlcmlhbGl6ZWQgSlNPTiksIHdlIGNhbiBqdXN0IHJldHVybiBpdCBhbmQgYmVcbiAgICAgICAgLy8gZG9uZSB3aXRoIGl0LlxuICAgICAgICBpZiAodmFsdWUuc3Vic3RyaW5nKDAsXG4gICAgICAgICAgICBTRVJJQUxJWkVEX01BUktFUl9MRU5HVEgpICE9PSBTRVJJQUxJWkVEX01BUktFUikge1xuICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UodmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBjb2RlIGRlYWxzIHdpdGggZGVzZXJpYWxpemluZyBzb21lIGtpbmQgb2YgQmxvYiBvclxuICAgICAgICAvLyBUeXBlZEFycmF5LiBGaXJzdCB3ZSBzZXBhcmF0ZSBvdXQgdGhlIHR5cGUgb2YgZGF0YSB3ZSdyZSBkZWFsaW5nXG4gICAgICAgIC8vIHdpdGggZnJvbSB0aGUgZGF0YSBpdHNlbGYuXG4gICAgICAgIHZhciBzZXJpYWxpemVkU3RyaW5nID0gdmFsdWUuc3Vic3RyaW5nKFRZUEVfU0VSSUFMSVpFRF9NQVJLRVJfTEVOR1RIKTtcbiAgICAgICAgdmFyIHR5cGUgPSB2YWx1ZS5zdWJzdHJpbmcoU0VSSUFMSVpFRF9NQVJLRVJfTEVOR1RILFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBUWVBFX1NFUklBTElaRURfTUFSS0VSX0xFTkdUSCk7XG5cbiAgICAgICAgdmFyIGJ1ZmZlciA9IHN0cmluZ1RvQnVmZmVyKHNlcmlhbGl6ZWRTdHJpbmcpO1xuXG4gICAgICAgIC8vIFJldHVybiB0aGUgcmlnaHQgdHlwZSBiYXNlZCBvbiB0aGUgY29kZS90eXBlIHNldCBkdXJpbmdcbiAgICAgICAgLy8gc2VyaWFsaXphdGlvbi5cbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFRZUEVfQVJSQVlCVUZGRVI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICAgICAgICAgIGNhc2UgVFlQRV9CTE9COlxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQmxvYihbYnVmZmVyXSk7XG4gICAgICAgICAgICBjYXNlIFRZUEVfSU5UOEFSUkFZOlxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgSW50OEFycmF5KGJ1ZmZlcik7XG4gICAgICAgICAgICBjYXNlIFRZUEVfVUlOVDhBUlJBWTpcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcbiAgICAgICAgICAgIGNhc2UgVFlQRV9VSU5UOENMQU1QRURBUlJBWTpcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVpbnQ4Q2xhbXBlZEFycmF5KGJ1ZmZlcik7XG4gICAgICAgICAgICBjYXNlIFRZUEVfSU5UMTZBUlJBWTpcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEludDE2QXJyYXkoYnVmZmVyKTtcbiAgICAgICAgICAgIGNhc2UgVFlQRV9VSU5UMTZBUlJBWTpcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVpbnQxNkFycmF5KGJ1ZmZlcik7XG4gICAgICAgICAgICBjYXNlIFRZUEVfSU5UMzJBUlJBWTpcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEludDMyQXJyYXkoYnVmZmVyKTtcbiAgICAgICAgICAgIGNhc2UgVFlQRV9VSU5UMzJBUlJBWTpcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVpbnQzMkFycmF5KGJ1ZmZlcik7XG4gICAgICAgICAgICBjYXNlIFRZUEVfRkxPQVQzMkFSUkFZOlxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlcik7XG4gICAgICAgICAgICBjYXNlIFRZUEVfRkxPQVQ2NEFSUkFZOlxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRmxvYXQ2NEFycmF5KGJ1ZmZlcik7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rb3duIHR5cGU6ICcgKyB0eXBlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN0cmluZ1RvQnVmZmVyKHNlcmlhbGl6ZWRTdHJpbmcpIHtcbiAgICAgICAgLy8gRmlsbCB0aGUgc3RyaW5nIGludG8gYSBBcnJheUJ1ZmZlci5cbiAgICAgICAgdmFyIGJ1ZmZlckxlbmd0aCA9IHNlcmlhbGl6ZWRTdHJpbmcubGVuZ3RoICogMC43NTtcbiAgICAgICAgdmFyIGxlbiA9IHNlcmlhbGl6ZWRTdHJpbmcubGVuZ3RoO1xuICAgICAgICB2YXIgaTtcbiAgICAgICAgdmFyIHAgPSAwO1xuICAgICAgICB2YXIgZW5jb2RlZDEsIGVuY29kZWQyLCBlbmNvZGVkMywgZW5jb2RlZDQ7XG5cbiAgICAgICAgaWYgKHNlcmlhbGl6ZWRTdHJpbmdbc2VyaWFsaXplZFN0cmluZy5sZW5ndGggLSAxXSA9PT0gJz0nKSB7XG4gICAgICAgICAgICBidWZmZXJMZW5ndGgtLTtcbiAgICAgICAgICAgIGlmIChzZXJpYWxpemVkU3RyaW5nW3NlcmlhbGl6ZWRTdHJpbmcubGVuZ3RoIC0gMl0gPT09ICc9Jykge1xuICAgICAgICAgICAgICAgIGJ1ZmZlckxlbmd0aC0tO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihidWZmZXJMZW5ndGgpO1xuICAgICAgICB2YXIgYnl0ZXMgPSBuZXcgVWludDhBcnJheShidWZmZXIpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrPTQpIHtcbiAgICAgICAgICAgIGVuY29kZWQxID0gQkFTRV9DSEFSUy5pbmRleE9mKHNlcmlhbGl6ZWRTdHJpbmdbaV0pO1xuICAgICAgICAgICAgZW5jb2RlZDIgPSBCQVNFX0NIQVJTLmluZGV4T2Yoc2VyaWFsaXplZFN0cmluZ1tpKzFdKTtcbiAgICAgICAgICAgIGVuY29kZWQzID0gQkFTRV9DSEFSUy5pbmRleE9mKHNlcmlhbGl6ZWRTdHJpbmdbaSsyXSk7XG4gICAgICAgICAgICBlbmNvZGVkNCA9IEJBU0VfQ0hBUlMuaW5kZXhPZihzZXJpYWxpemVkU3RyaW5nW2krM10pO1xuXG4gICAgICAgICAgICAvKmpzbGludCBiaXR3aXNlOiB0cnVlICovXG4gICAgICAgICAgICBieXRlc1twKytdID0gKGVuY29kZWQxIDw8IDIpIHwgKGVuY29kZWQyID4+IDQpO1xuICAgICAgICAgICAgYnl0ZXNbcCsrXSA9ICgoZW5jb2RlZDIgJiAxNSkgPDwgNCkgfCAoZW5jb2RlZDMgPj4gMik7XG4gICAgICAgICAgICBieXRlc1twKytdID0gKChlbmNvZGVkMyAmIDMpIDw8IDYpIHwgKGVuY29kZWQ0ICYgNjMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4gICAgLy8gQ29udmVydHMgYSBidWZmZXIgdG8gYSBzdHJpbmcgdG8gc3RvcmUsIHNlcmlhbGl6ZWQsIGluIHRoZSBiYWNrZW5kXG4gICAgLy8gc3RvcmFnZSBsaWJyYXJ5LlxuICAgIGZ1bmN0aW9uIGJ1ZmZlclRvU3RyaW5nKGJ1ZmZlcikge1xuICAgICAgICAvLyBiYXNlNjQtYXJyYXlidWZmZXJcbiAgICAgICAgdmFyIGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcbiAgICAgICAgdmFyIGJhc2U2NFN0cmluZyA9ICcnO1xuICAgICAgICB2YXIgaTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgICAgIC8qanNsaW50IGJpdHdpc2U6IHRydWUgKi9cbiAgICAgICAgICAgIGJhc2U2NFN0cmluZyArPSBCQVNFX0NIQVJTW2J5dGVzW2ldID4+IDJdO1xuICAgICAgICAgICAgYmFzZTY0U3RyaW5nICs9IEJBU0VfQ0hBUlNbKChieXRlc1tpXSAmIDMpIDw8IDQpIHwgKGJ5dGVzW2kgKyAxXSA+PiA0KV07XG4gICAgICAgICAgICBiYXNlNjRTdHJpbmcgKz0gQkFTRV9DSEFSU1soKGJ5dGVzW2kgKyAxXSAmIDE1KSA8PCAyKSB8IChieXRlc1tpICsgMl0gPj4gNildO1xuICAgICAgICAgICAgYmFzZTY0U3RyaW5nICs9IEJBU0VfQ0hBUlNbYnl0ZXNbaSArIDJdICYgNjNdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKChieXRlcy5sZW5ndGggJSAzKSA9PT0gMikge1xuICAgICAgICAgICAgYmFzZTY0U3RyaW5nID0gYmFzZTY0U3RyaW5nLnN1YnN0cmluZygwLCBiYXNlNjRTdHJpbmcubGVuZ3RoIC0gMSkgKyAnPSc7XG4gICAgICAgIH0gZWxzZSBpZiAoYnl0ZXMubGVuZ3RoICUgMyA9PT0gMSkge1xuICAgICAgICAgICAgYmFzZTY0U3RyaW5nID0gYmFzZTY0U3RyaW5nLnN1YnN0cmluZygwLCBiYXNlNjRTdHJpbmcubGVuZ3RoIC0gMikgKyAnPT0nO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGJhc2U2NFN0cmluZztcbiAgICB9XG5cbiAgICB2YXIgbG9jYWxmb3JhZ2VTZXJpYWxpemVyID0ge1xuICAgICAgICBzZXJpYWxpemU6IHNlcmlhbGl6ZSxcbiAgICAgICAgZGVzZXJpYWxpemU6IGRlc2VyaWFsaXplLFxuICAgICAgICBzdHJpbmdUb0J1ZmZlcjogc3RyaW5nVG9CdWZmZXIsXG4gICAgICAgIGJ1ZmZlclRvU3RyaW5nOiBidWZmZXJUb1N0cmluZ1xuICAgIH07XG5cbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBsb2NhbGZvcmFnZVNlcmlhbGl6ZXI7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKCdsb2NhbGZvcmFnZVNlcmlhbGl6ZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBsb2NhbGZvcmFnZVNlcmlhbGl6ZXI7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9jYWxmb3JhZ2VTZXJpYWxpemVyID0gbG9jYWxmb3JhZ2VTZXJpYWxpemVyO1xuICAgIH1cbn0pLmNhbGwod2luZG93KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGFzYXAgPSByZXF1aXJlKCdhc2FwJylcblxubW9kdWxlLmV4cG9ydHMgPSBQcm9taXNlXG5mdW5jdGlvbiBQcm9taXNlKGZuKSB7XG4gIGlmICh0eXBlb2YgdGhpcyAhPT0gJ29iamVjdCcpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Byb21pc2VzIG11c3QgYmUgY29uc3RydWN0ZWQgdmlhIG5ldycpXG4gIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHRocm93IG5ldyBUeXBlRXJyb3IoJ25vdCBhIGZ1bmN0aW9uJylcbiAgdmFyIHN0YXRlID0gbnVsbFxuICB2YXIgdmFsdWUgPSBudWxsXG4gIHZhciBkZWZlcnJlZHMgPSBbXVxuICB2YXIgc2VsZiA9IHRoaXNcblxuICB0aGlzLnRoZW4gPSBmdW5jdGlvbihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGhhbmRsZShuZXcgSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcmVzb2x2ZSwgcmVqZWN0KSlcbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlKGRlZmVycmVkKSB7XG4gICAgaWYgKHN0YXRlID09PSBudWxsKSB7XG4gICAgICBkZWZlcnJlZHMucHVzaChkZWZlcnJlZClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBhc2FwKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGNiID0gc3RhdGUgPyBkZWZlcnJlZC5vbkZ1bGZpbGxlZCA6IGRlZmVycmVkLm9uUmVqZWN0ZWRcbiAgICAgIGlmIChjYiA9PT0gbnVsbCkge1xuICAgICAgICAoc3RhdGUgPyBkZWZlcnJlZC5yZXNvbHZlIDogZGVmZXJyZWQucmVqZWN0KSh2YWx1ZSlcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgcmV0XG4gICAgICB0cnkge1xuICAgICAgICByZXQgPSBjYih2YWx1ZSlcbiAgICAgIH1cbiAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdChlKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGRlZmVycmVkLnJlc29sdmUocmV0KVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiByZXNvbHZlKG5ld1ZhbHVlKSB7XG4gICAgdHJ5IHsgLy9Qcm9taXNlIFJlc29sdXRpb24gUHJvY2VkdXJlOiBodHRwczovL2dpdGh1Yi5jb20vcHJvbWlzZXMtYXBsdXMvcHJvbWlzZXMtc3BlYyN0aGUtcHJvbWlzZS1yZXNvbHV0aW9uLXByb2NlZHVyZVxuICAgICAgaWYgKG5ld1ZhbHVlID09PSBzZWxmKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBIHByb21pc2UgY2Fubm90IGJlIHJlc29sdmVkIHdpdGggaXRzZWxmLicpXG4gICAgICBpZiAobmV3VmFsdWUgJiYgKHR5cGVvZiBuZXdWYWx1ZSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIG5ld1ZhbHVlID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgICB2YXIgdGhlbiA9IG5ld1ZhbHVlLnRoZW5cbiAgICAgICAgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgZG9SZXNvbHZlKHRoZW4uYmluZChuZXdWYWx1ZSksIHJlc29sdmUsIHJlamVjdClcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc3RhdGUgPSB0cnVlXG4gICAgICB2YWx1ZSA9IG5ld1ZhbHVlXG4gICAgICBmaW5hbGUoKVxuICAgIH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlamVjdChuZXdWYWx1ZSkge1xuICAgIHN0YXRlID0gZmFsc2VcbiAgICB2YWx1ZSA9IG5ld1ZhbHVlXG4gICAgZmluYWxlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmFsZSgpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gZGVmZXJyZWRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKVxuICAgICAgaGFuZGxlKGRlZmVycmVkc1tpXSlcbiAgICBkZWZlcnJlZHMgPSBudWxsXG4gIH1cblxuICBkb1Jlc29sdmUoZm4sIHJlc29sdmUsIHJlamVjdClcbn1cblxuXG5mdW5jdGlvbiBIYW5kbGVyKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkLCByZXNvbHZlLCByZWplY3Qpe1xuICB0aGlzLm9uRnVsZmlsbGVkID0gdHlwZW9mIG9uRnVsZmlsbGVkID09PSAnZnVuY3Rpb24nID8gb25GdWxmaWxsZWQgOiBudWxsXG4gIHRoaXMub25SZWplY3RlZCA9IHR5cGVvZiBvblJlamVjdGVkID09PSAnZnVuY3Rpb24nID8gb25SZWplY3RlZCA6IG51bGxcbiAgdGhpcy5yZXNvbHZlID0gcmVzb2x2ZVxuICB0aGlzLnJlamVjdCA9IHJlamVjdFxufVxuXG4vKipcbiAqIFRha2UgYSBwb3RlbnRpYWxseSBtaXNiZWhhdmluZyByZXNvbHZlciBmdW5jdGlvbiBhbmQgbWFrZSBzdXJlXG4gKiBvbkZ1bGZpbGxlZCBhbmQgb25SZWplY3RlZCBhcmUgb25seSBjYWxsZWQgb25jZS5cbiAqXG4gKiBNYWtlcyBubyBndWFyYW50ZWVzIGFib3V0IGFzeW5jaHJvbnkuXG4gKi9cbmZ1bmN0aW9uIGRvUmVzb2x2ZShmbiwgb25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcbiAgdmFyIGRvbmUgPSBmYWxzZTtcbiAgdHJ5IHtcbiAgICBmbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIGlmIChkb25lKSByZXR1cm5cbiAgICAgIGRvbmUgPSB0cnVlXG4gICAgICBvbkZ1bGZpbGxlZCh2YWx1ZSlcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICBpZiAoZG9uZSkgcmV0dXJuXG4gICAgICBkb25lID0gdHJ1ZVxuICAgICAgb25SZWplY3RlZChyZWFzb24pXG4gICAgfSlcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBpZiAoZG9uZSkgcmV0dXJuXG4gICAgZG9uZSA9IHRydWVcbiAgICBvblJlamVjdGVkKGV4KVxuICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vVGhpcyBmaWxlIGNvbnRhaW5zIHRoZW4vcHJvbWlzZSBzcGVjaWZpYyBleHRlbnNpb25zIHRvIHRoZSBjb3JlIHByb21pc2UgQVBJXG5cbnZhciBQcm9taXNlID0gcmVxdWlyZSgnLi9jb3JlLmpzJylcbnZhciBhc2FwID0gcmVxdWlyZSgnYXNhcCcpXG5cbm1vZHVsZS5leHBvcnRzID0gUHJvbWlzZVxuXG4vKiBTdGF0aWMgRnVuY3Rpb25zICovXG5cbmZ1bmN0aW9uIFZhbHVlUHJvbWlzZSh2YWx1ZSkge1xuICB0aGlzLnRoZW4gPSBmdW5jdGlvbiAob25GdWxmaWxsZWQpIHtcbiAgICBpZiAodHlwZW9mIG9uRnVsZmlsbGVkICE9PSAnZnVuY3Rpb24nKSByZXR1cm4gdGhpc1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBhc2FwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXNvbHZlKG9uRnVsZmlsbGVkKHZhbHVlKSlcbiAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICByZWplY3QoZXgpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pXG4gIH1cbn1cblZhbHVlUHJvbWlzZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFByb21pc2UucHJvdG90eXBlKVxuXG52YXIgVFJVRSA9IG5ldyBWYWx1ZVByb21pc2UodHJ1ZSlcbnZhciBGQUxTRSA9IG5ldyBWYWx1ZVByb21pc2UoZmFsc2UpXG52YXIgTlVMTCA9IG5ldyBWYWx1ZVByb21pc2UobnVsbClcbnZhciBVTkRFRklORUQgPSBuZXcgVmFsdWVQcm9taXNlKHVuZGVmaW5lZClcbnZhciBaRVJPID0gbmV3IFZhbHVlUHJvbWlzZSgwKVxudmFyIEVNUFRZU1RSSU5HID0gbmV3IFZhbHVlUHJvbWlzZSgnJylcblxuUHJvbWlzZS5yZXNvbHZlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFByb21pc2UpIHJldHVybiB2YWx1ZVxuXG4gIGlmICh2YWx1ZSA9PT0gbnVsbCkgcmV0dXJuIE5VTExcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHJldHVybiBVTkRFRklORURcbiAgaWYgKHZhbHVlID09PSB0cnVlKSByZXR1cm4gVFJVRVxuICBpZiAodmFsdWUgPT09IGZhbHNlKSByZXR1cm4gRkFMU0VcbiAgaWYgKHZhbHVlID09PSAwKSByZXR1cm4gWkVST1xuICBpZiAodmFsdWUgPT09ICcnKSByZXR1cm4gRU1QVFlTVFJJTkdcblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIHRoZW4gPSB2YWx1ZS50aGVuXG4gICAgICBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHRoZW4uYmluZCh2YWx1ZSkpXG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHJlamVjdChleClcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBWYWx1ZVByb21pc2UodmFsdWUpXG59XG5cblByb21pc2UuZnJvbSA9IFByb21pc2UuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICB2YXIgZXJyID0gbmV3IEVycm9yKCdQcm9taXNlLmZyb20gYW5kIFByb21pc2UuY2FzdCBhcmUgZGVwcmVjYXRlZCwgdXNlIFByb21pc2UucmVzb2x2ZSBpbnN0ZWFkJylcbiAgZXJyLm5hbWUgPSAnV2FybmluZydcbiAgY29uc29sZS53YXJuKGVyci5zdGFjaylcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh2YWx1ZSlcbn1cblxuUHJvbWlzZS5kZW5vZGVpZnkgPSBmdW5jdGlvbiAoZm4sIGFyZ3VtZW50Q291bnQpIHtcbiAgYXJndW1lbnRDb3VudCA9IGFyZ3VtZW50Q291bnQgfHwgSW5maW5pdHlcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgd2hpbGUgKGFyZ3MubGVuZ3RoICYmIGFyZ3MubGVuZ3RoID4gYXJndW1lbnRDb3VudCkge1xuICAgICAgICBhcmdzLnBvcCgpXG4gICAgICB9XG4gICAgICBhcmdzLnB1c2goZnVuY3Rpb24gKGVyciwgcmVzKSB7XG4gICAgICAgIGlmIChlcnIpIHJlamVjdChlcnIpXG4gICAgICAgIGVsc2UgcmVzb2x2ZShyZXMpXG4gICAgICB9KVxuICAgICAgZm4uYXBwbHkoc2VsZiwgYXJncylcbiAgICB9KVxuICB9XG59XG5Qcm9taXNlLm5vZGVpZnkgPSBmdW5jdGlvbiAoZm4pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICB2YXIgY2FsbGJhY2sgPSB0eXBlb2YgYXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSAnZnVuY3Rpb24nID8gYXJncy5wb3AoKSA6IG51bGxcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykubm9kZWlmeShjYWxsYmFjaylcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgaWYgKGNhbGxiYWNrID09PSBudWxsIHx8IHR5cGVvZiBjYWxsYmFjayA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyByZWplY3QoZXgpIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhc2FwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBjYWxsYmFjayhleClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuUHJvbWlzZS5hbGwgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBjYWxsZWRXaXRoQXJyYXkgPSBhcmd1bWVudHMubGVuZ3RoID09PSAxICYmIEFycmF5LmlzQXJyYXkoYXJndW1lbnRzWzBdKVxuICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGNhbGxlZFdpdGhBcnJheSA/IGFyZ3VtZW50c1swXSA6IGFyZ3VtZW50cylcblxuICBpZiAoIWNhbGxlZFdpdGhBcnJheSkge1xuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoJ1Byb21pc2UuYWxsIHNob3VsZCBiZSBjYWxsZWQgd2l0aCBhIHNpbmdsZSBhcnJheSwgY2FsbGluZyBpdCB3aXRoIG11bHRpcGxlIGFyZ3VtZW50cyBpcyBkZXByZWNhdGVkJylcbiAgICBlcnIubmFtZSA9ICdXYXJuaW5nJ1xuICAgIGNvbnNvbGUud2FybihlcnIuc3RhY2spXG4gIH1cblxuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHJlc29sdmUoW10pXG4gICAgdmFyIHJlbWFpbmluZyA9IGFyZ3MubGVuZ3RoXG4gICAgZnVuY3Rpb24gcmVzKGksIHZhbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKHZhbCAmJiAodHlwZW9mIHZhbCA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHZhbCA9PT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgICAgICB2YXIgdGhlbiA9IHZhbC50aGVuXG4gICAgICAgICAgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aGVuLmNhbGwodmFsLCBmdW5jdGlvbiAodmFsKSB7IHJlcyhpLCB2YWwpIH0sIHJlamVjdClcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhcmdzW2ldID0gdmFsXG4gICAgICAgIGlmICgtLXJlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgIHJlc29sdmUoYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgIHJlamVjdChleClcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICByZXMoaSwgYXJnc1tpXSlcbiAgICB9XG4gIH0pXG59XG5cblByb21pc2UucmVqZWN0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IFxuICAgIHJlamVjdCh2YWx1ZSk7XG4gIH0pO1xufVxuXG5Qcm9taXNlLnJhY2UgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IFxuICAgIHZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgIFByb21pc2UucmVzb2x2ZSh2YWx1ZSkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIH0pXG4gIH0pO1xufVxuXG4vKiBQcm90b3R5cGUgTWV0aG9kcyAqL1xuXG5Qcm9taXNlLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24gKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gIHZhciBzZWxmID0gYXJndW1lbnRzLmxlbmd0aCA/IHRoaXMudGhlbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpIDogdGhpc1xuICBzZWxmLnRoZW4obnVsbCwgZnVuY3Rpb24gKGVycikge1xuICAgIGFzYXAoZnVuY3Rpb24gKCkge1xuICAgICAgdGhyb3cgZXJyXG4gICAgfSlcbiAgfSlcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUubm9kZWlmeSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIGNhbGxiYWNrICE9ICdmdW5jdGlvbicpIHJldHVybiB0aGlzXG5cbiAgdGhpcy50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGFzYXAoZnVuY3Rpb24gKCkge1xuICAgICAgY2FsbGJhY2sobnVsbCwgdmFsdWUpXG4gICAgfSlcbiAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgIGFzYXAoZnVuY3Rpb24gKCkge1xuICAgICAgY2FsbGJhY2soZXJyKVxuICAgIH0pXG4gIH0pXG59XG5cblByb21pc2UucHJvdG90eXBlWydjYXRjaCddID0gZnVuY3Rpb24gKG9uUmVqZWN0ZWQpIHtcbiAgcmV0dXJuIHRoaXMudGhlbihudWxsLCBvblJlamVjdGVkKTtcbn1cbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG5cbi8vIFVzZSB0aGUgZmFzdGVzdCBwb3NzaWJsZSBtZWFucyB0byBleGVjdXRlIGEgdGFzayBpbiBhIGZ1dHVyZSB0dXJuXG4vLyBvZiB0aGUgZXZlbnQgbG9vcC5cblxuLy8gbGlua2VkIGxpc3Qgb2YgdGFza3MgKHNpbmdsZSwgd2l0aCBoZWFkIG5vZGUpXG52YXIgaGVhZCA9IHt0YXNrOiB2b2lkIDAsIG5leHQ6IG51bGx9O1xudmFyIHRhaWwgPSBoZWFkO1xudmFyIGZsdXNoaW5nID0gZmFsc2U7XG52YXIgcmVxdWVzdEZsdXNoID0gdm9pZCAwO1xudmFyIGlzTm9kZUpTID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGZsdXNoKCkge1xuICAgIC8qIGpzaGludCBsb29wZnVuYzogdHJ1ZSAqL1xuXG4gICAgd2hpbGUgKGhlYWQubmV4dCkge1xuICAgICAgICBoZWFkID0gaGVhZC5uZXh0O1xuICAgICAgICB2YXIgdGFzayA9IGhlYWQudGFzaztcbiAgICAgICAgaGVhZC50YXNrID0gdm9pZCAwO1xuICAgICAgICB2YXIgZG9tYWluID0gaGVhZC5kb21haW47XG5cbiAgICAgICAgaWYgKGRvbWFpbikge1xuICAgICAgICAgICAgaGVhZC5kb21haW4gPSB2b2lkIDA7XG4gICAgICAgICAgICBkb21haW4uZW50ZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0YXNrKCk7XG5cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUpTKSB7XG4gICAgICAgICAgICAgICAgLy8gSW4gbm9kZSwgdW5jYXVnaHQgZXhjZXB0aW9ucyBhcmUgY29uc2lkZXJlZCBmYXRhbCBlcnJvcnMuXG4gICAgICAgICAgICAgICAgLy8gUmUtdGhyb3cgdGhlbSBzeW5jaHJvbm91c2x5IHRvIGludGVycnVwdCBmbHVzaGluZyFcblxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBjb250aW51YXRpb24gaWYgdGhlIHVuY2F1Z2h0IGV4Y2VwdGlvbiBpcyBzdXBwcmVzc2VkXG4gICAgICAgICAgICAgICAgLy8gbGlzdGVuaW5nIFwidW5jYXVnaHRFeGNlcHRpb25cIiBldmVudHMgKGFzIGRvbWFpbnMgZG9lcykuXG4gICAgICAgICAgICAgICAgLy8gQ29udGludWUgaW4gbmV4dCBldmVudCB0byBhdm9pZCB0aWNrIHJlY3Vyc2lvbi5cbiAgICAgICAgICAgICAgICBpZiAoZG9tYWluKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbWFpbi5leGl0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDApO1xuICAgICAgICAgICAgICAgIGlmIChkb21haW4pIHtcbiAgICAgICAgICAgICAgICAgICAgZG9tYWluLmVudGVyKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJbiBicm93c2VycywgdW5jYXVnaHQgZXhjZXB0aW9ucyBhcmUgbm90IGZhdGFsLlxuICAgICAgICAgICAgICAgIC8vIFJlLXRocm93IHRoZW0gYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgc2xvdy1kb3ducy5cbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZG9tYWluKSB7XG4gICAgICAgICAgICBkb21haW4uZXhpdCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZmx1c2hpbmcgPSBmYWxzZTtcbn1cblxuaWYgKHR5cGVvZiBwcm9jZXNzICE9PSBcInVuZGVmaW5lZFwiICYmIHByb2Nlc3MubmV4dFRpY2spIHtcbiAgICAvLyBOb2RlLmpzIGJlZm9yZSAwLjkuIE5vdGUgdGhhdCBzb21lIGZha2UtTm9kZSBlbnZpcm9ubWVudHMsIGxpa2UgdGhlXG4gICAgLy8gTW9jaGEgdGVzdCBydW5uZXIsIGludHJvZHVjZSBhIGBwcm9jZXNzYCBnbG9iYWwgd2l0aG91dCBhIGBuZXh0VGlja2AuXG4gICAgaXNOb2RlSlMgPSB0cnVlO1xuXG4gICAgcmVxdWVzdEZsdXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGZsdXNoKTtcbiAgICB9O1xuXG59IGVsc2UgaWYgKHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIC8vIEluIElFMTAsIE5vZGUuanMgMC45Kywgb3IgaHR0cHM6Ly9naXRodWIuY29tL05vYmxlSlMvc2V0SW1tZWRpYXRlXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgcmVxdWVzdEZsdXNoID0gc2V0SW1tZWRpYXRlLmJpbmQod2luZG93LCBmbHVzaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWVzdEZsdXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2V0SW1tZWRpYXRlKGZsdXNoKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbn0gZWxzZSBpZiAodHlwZW9mIE1lc3NhZ2VDaGFubmVsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgLy8gbW9kZXJuIGJyb3dzZXJzXG4gICAgLy8gaHR0cDovL3d3dy5ub25ibG9ja2luZy5pby8yMDExLzA2L3dpbmRvd25leHR0aWNrLmh0bWxcbiAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gZmx1c2g7XG4gICAgcmVxdWVzdEZsdXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKDApO1xuICAgIH07XG5cbn0gZWxzZSB7XG4gICAgLy8gb2xkIGJyb3dzZXJzXG4gICAgcmVxdWVzdEZsdXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZsdXNoLCAwKTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBhc2FwKHRhc2spIHtcbiAgICB0YWlsID0gdGFpbC5uZXh0ID0ge1xuICAgICAgICB0YXNrOiB0YXNrLFxuICAgICAgICBkb21haW46IGlzTm9kZUpTICYmIHByb2Nlc3MuZG9tYWluLFxuICAgICAgICBuZXh0OiBudWxsXG4gICAgfTtcblxuICAgIGlmICghZmx1c2hpbmcpIHtcbiAgICAgICAgZmx1c2hpbmcgPSB0cnVlO1xuICAgICAgICByZXF1ZXN0Rmx1c2goKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFzYXA7XG5cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIxWWlaNVNcIikpIiwiXG4vKipcbiAqIHNsaWNlKCkgcmVmZXJlbmNlLlxuICovXG5cbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLyoqXG4gKiBFeHBvc2UgYGNvYC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvO1xuXG4vKipcbiAqIFdyYXAgdGhlIGdpdmVuIGdlbmVyYXRvciBgZm5gIGFuZFxuICogcmV0dXJuIGEgdGh1bmsuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBjbyhmbikge1xuICB2YXIgaXNHZW5GdW4gPSBpc0dlbmVyYXRvckZ1bmN0aW9uKGZuKTtcblxuICByZXR1cm4gZnVuY3Rpb24gKGRvbmUpIHtcbiAgICB2YXIgY3R4ID0gdGhpcztcblxuICAgIC8vIGluIHRvVGh1bmsoKSBiZWxvdyB3ZSBpbnZva2UgY28oKVxuICAgIC8vIHdpdGggYSBnZW5lcmF0b3IsIHNvIG9wdGltaXplIGZvclxuICAgIC8vIHRoaXMgY2FzZVxuICAgIHZhciBnZW4gPSBmbjtcblxuICAgIC8vIHdlIG9ubHkgbmVlZCB0byBwYXJzZSB0aGUgYXJndW1lbnRzXG4gICAgLy8gaWYgZ2VuIGlzIGEgZ2VuZXJhdG9yIGZ1bmN0aW9uLlxuICAgIGlmIChpc0dlbkZ1bikge1xuICAgICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cyksIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICAgICAgdmFyIGhhc0NhbGxiYWNrID0gbGVuICYmICdmdW5jdGlvbicgPT0gdHlwZW9mIGFyZ3NbbGVuIC0gMV07XG4gICAgICBkb25lID0gaGFzQ2FsbGJhY2sgPyBhcmdzLnBvcCgpIDogZXJyb3I7XG4gICAgICBnZW4gPSBmbi5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZG9uZSA9IGRvbmUgfHwgZXJyb3I7XG4gICAgfVxuXG4gICAgbmV4dCgpO1xuXG4gICAgLy8gIzkyXG4gICAgLy8gd3JhcCB0aGUgY2FsbGJhY2sgaW4gYSBzZXRJbW1lZGlhdGVcbiAgICAvLyBzbyB0aGF0IGFueSBvZiBpdHMgZXJyb3JzIGFyZW4ndCBjYXVnaHQgYnkgYGNvYFxuICAgIGZ1bmN0aW9uIGV4aXQoZXJyLCByZXMpIHtcbiAgICAgIHNldEltbWVkaWF0ZShmdW5jdGlvbigpe1xuICAgICAgICBkb25lLmNhbGwoY3R4LCBlcnIsIHJlcyk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBuZXh0KGVyciwgcmVzKSB7XG4gICAgICB2YXIgcmV0O1xuXG4gICAgICAvLyBtdWx0aXBsZSBhcmdzXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHJlcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICAgICAgLy8gZXJyb3JcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXQgPSBnZW4udGhyb3coZXJyKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHJldHVybiBleGl0KGUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIG9rXG4gICAgICBpZiAoIWVycikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldCA9IGdlbi5uZXh0KHJlcyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICByZXR1cm4gZXhpdChlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBkb25lXG4gICAgICBpZiAocmV0LmRvbmUpIHJldHVybiBleGl0KG51bGwsIHJldC52YWx1ZSk7XG5cbiAgICAgIC8vIG5vcm1hbGl6ZVxuICAgICAgcmV0LnZhbHVlID0gdG9UaHVuayhyZXQudmFsdWUsIGN0eCk7XG5cbiAgICAgIC8vIHJ1blxuICAgICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIHJldC52YWx1ZSkge1xuICAgICAgICB2YXIgY2FsbGVkID0gZmFsc2U7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0LnZhbHVlLmNhbGwoY3R4LCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgaWYgKGNhbGxlZCkgcmV0dXJuO1xuICAgICAgICAgICAgY2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIG5leHQuYXBwbHkoY3R4LCBhcmd1bWVudHMpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZiAoY2FsbGVkKSByZXR1cm47XG4gICAgICAgICAgICBjYWxsZWQgPSB0cnVlO1xuICAgICAgICAgICAgbmV4dChlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGludmFsaWRcbiAgICAgIG5leHQobmV3IFR5cGVFcnJvcignWW91IG1heSBvbmx5IHlpZWxkIGEgZnVuY3Rpb24sIHByb21pc2UsIGdlbmVyYXRvciwgYXJyYXksIG9yIG9iamVjdCwgJ1xuICAgICAgICArICdidXQgdGhlIGZvbGxvd2luZyB3YXMgcGFzc2VkOiBcIicgKyBTdHJpbmcocmV0LnZhbHVlKSArICdcIicpKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBDb252ZXJ0IGBvYmpgIGludG8gYSBub3JtYWxpemVkIHRodW5rLlxuICpcbiAqIEBwYXJhbSB7TWl4ZWR9IG9ialxuICogQHBhcmFtIHtNaXhlZH0gY3R4XG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHRvVGh1bmsob2JqLCBjdHgpIHtcblxuICBpZiAoaXNHZW5lcmF0b3JGdW5jdGlvbihvYmopKSB7XG4gICAgcmV0dXJuIGNvKG9iai5jYWxsKGN0eCkpO1xuICB9XG5cbiAgaWYgKGlzR2VuZXJhdG9yKG9iaikpIHtcbiAgICByZXR1cm4gY28ob2JqKTtcbiAgfVxuXG4gIGlmIChpc1Byb21pc2Uob2JqKSkge1xuICAgIHJldHVybiBwcm9taXNlVG9UaHVuayhvYmopO1xuICB9XG5cbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIG9iaikge1xuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICBpZiAoaXNPYmplY3Qob2JqKSB8fCBBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICByZXR1cm4gb2JqZWN0VG9UaHVuay5jYWxsKGN0eCwgb2JqKTtcbiAgfVxuXG4gIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogQ29udmVydCBhbiBvYmplY3Qgb2YgeWllbGRhYmxlcyB0byBhIHRodW5rLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gb2JqZWN0VG9UaHVuayhvYmope1xuICB2YXIgY3R4ID0gdGhpcztcbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5KG9iaik7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGRvbmUpe1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgICB2YXIgcGVuZGluZyA9IGtleXMubGVuZ3RoO1xuICAgIHZhciByZXN1bHRzID0gaXNBcnJheVxuICAgICAgPyBuZXcgQXJyYXkocGVuZGluZykgLy8gcHJlZGVmaW5lIHRoZSBhcnJheSBsZW5ndGhcbiAgICAgIDogbmV3IG9iai5jb25zdHJ1Y3RvcigpO1xuICAgIHZhciBmaW5pc2hlZDtcblxuICAgIGlmICghcGVuZGluZykge1xuICAgICAgc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCl7XG4gICAgICAgIGRvbmUobnVsbCwgcmVzdWx0cylcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHByZXBvcHVsYXRlIG9iamVjdCBrZXlzIHRvIHByZXNlcnZlIGtleSBvcmRlcmluZ1xuICAgIGlmICghaXNBcnJheSkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwZW5kaW5nOyBpKyspIHtcbiAgICAgICAgcmVzdWx0c1trZXlzW2ldXSA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJ1bihvYmpba2V5c1tpXV0sIGtleXNbaV0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJ1bihmbiwga2V5KSB7XG4gICAgICBpZiAoZmluaXNoZWQpIHJldHVybjtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZuID0gdG9UaHVuayhmbiwgY3R4KTtcblxuICAgICAgICBpZiAoJ2Z1bmN0aW9uJyAhPSB0eXBlb2YgZm4pIHtcbiAgICAgICAgICByZXN1bHRzW2tleV0gPSBmbjtcbiAgICAgICAgICByZXR1cm4gLS1wZW5kaW5nIHx8IGRvbmUobnVsbCwgcmVzdWx0cyk7XG4gICAgICAgIH1cblxuICAgICAgICBmbi5jYWxsKGN0eCwgZnVuY3Rpb24oZXJyLCByZXMpe1xuICAgICAgICAgIGlmIChmaW5pc2hlZCkgcmV0dXJuO1xuXG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgZmluaXNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuIGRvbmUoZXJyKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXN1bHRzW2tleV0gPSByZXM7XG4gICAgICAgICAgLS1wZW5kaW5nIHx8IGRvbmUobnVsbCwgcmVzdWx0cyk7XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGZpbmlzaGVkID0gdHJ1ZTtcbiAgICAgICAgZG9uZShlcnIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIENvbnZlcnQgYHByb21pc2VgIHRvIGEgdGh1bmsuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHByb21pc2VcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcHJvbWlzZVRvVGh1bmsocHJvbWlzZSkge1xuICByZXR1cm4gZnVuY3Rpb24oZm4pe1xuICAgIHByb21pc2UudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICAgIGZuKG51bGwsIHJlcyk7XG4gICAgfSwgZm4pO1xuICB9XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYG9iamAgaXMgYSBwcm9taXNlLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBpc1Byb21pc2Uob2JqKSB7XG4gIHJldHVybiBvYmogJiYgJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygb2JqLnRoZW47XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYG9iamAgaXMgYSBnZW5lcmF0b3IuXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gb2JqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gaXNHZW5lcmF0b3Iob2JqKSB7XG4gIHJldHVybiBvYmogJiYgJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygb2JqLm5leHQgJiYgJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygb2JqLnRocm93O1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGBvYmpgIGlzIGEgZ2VuZXJhdG9yIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSB7TWl4ZWR9IG9ialxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGlzR2VuZXJhdG9yRnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBvYmogJiYgb2JqLmNvbnN0cnVjdG9yICYmICdHZW5lcmF0b3JGdW5jdGlvbicgPT0gb2JqLmNvbnN0cnVjdG9yLm5hbWU7XG59XG5cbi8qKlxuICogQ2hlY2sgZm9yIHBsYWluIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge01peGVkfSB2YWxcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBpc09iamVjdCh2YWwpIHtcbiAgcmV0dXJuIHZhbCAmJiBPYmplY3QgPT0gdmFsLmNvbnN0cnVjdG9yO1xufVxuXG4vKipcbiAqIFRocm93IGBlcnJgIGluIGEgbmV3IHN0YWNrLlxuICpcbiAqIFRoaXMgaXMgdXNlZCB3aGVuIGNvKCkgaXMgaW52b2tlZFxuICogd2l0aG91dCBzdXBwbHlpbmcgYSBjYWxsYmFjaywgd2hpY2hcbiAqIHNob3VsZCBvbmx5IGJlIGZvciBkZW1vbnN0cmF0aW9uYWxcbiAqIHB1cnBvc2VzLlxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVyclxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gZXJyb3IoZXJyKSB7XG4gIGlmICghZXJyKSByZXR1cm47XG4gIHNldEltbWVkaWF0ZShmdW5jdGlvbigpe1xuICAgIHRocm93IGVycjtcbiAgfSk7XG59XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsKXtcbihmdW5jdGlvbihnbG9iYWwpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBpZiAoZ2xvYmFsLiR0cmFjZXVyUnVudGltZSkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgJE9iamVjdCA9IE9iamVjdDtcbiAgdmFyICRUeXBlRXJyb3IgPSBUeXBlRXJyb3I7XG4gIHZhciAkY3JlYXRlID0gJE9iamVjdC5jcmVhdGU7XG4gIHZhciAkZGVmaW5lUHJvcGVydGllcyA9ICRPYmplY3QuZGVmaW5lUHJvcGVydGllcztcbiAgdmFyICRkZWZpbmVQcm9wZXJ0eSA9ICRPYmplY3QuZGVmaW5lUHJvcGVydHk7XG4gIHZhciAkZnJlZXplID0gJE9iamVjdC5mcmVlemU7XG4gIHZhciAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID0gJE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7XG4gIHZhciAkZ2V0T3duUHJvcGVydHlOYW1lcyA9ICRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcztcbiAgdmFyICRrZXlzID0gJE9iamVjdC5rZXlzO1xuICB2YXIgJGhhc093blByb3BlcnR5ID0gJE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG4gIHZhciAkdG9TdHJpbmcgPSAkT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgdmFyICRwcmV2ZW50RXh0ZW5zaW9ucyA9IE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucztcbiAgdmFyICRzZWFsID0gT2JqZWN0LnNlYWw7XG4gIHZhciAkaXNFeHRlbnNpYmxlID0gT2JqZWN0LmlzRXh0ZW5zaWJsZTtcbiAgZnVuY3Rpb24gbm9uRW51bSh2YWx1ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfTtcbiAgfVxuICB2YXIgbWV0aG9kID0gbm9uRW51bTtcbiAgdmFyIGNvdW50ZXIgPSAwO1xuICBmdW5jdGlvbiBuZXdVbmlxdWVTdHJpbmcoKSB7XG4gICAgcmV0dXJuICdfXyQnICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMWU5KSArICckJyArICsrY291bnRlciArICckX18nO1xuICB9XG4gIHZhciBzeW1ib2xJbnRlcm5hbFByb3BlcnR5ID0gbmV3VW5pcXVlU3RyaW5nKCk7XG4gIHZhciBzeW1ib2xEZXNjcmlwdGlvblByb3BlcnR5ID0gbmV3VW5pcXVlU3RyaW5nKCk7XG4gIHZhciBzeW1ib2xEYXRhUHJvcGVydHkgPSBuZXdVbmlxdWVTdHJpbmcoKTtcbiAgdmFyIHN5bWJvbFZhbHVlcyA9ICRjcmVhdGUobnVsbCk7XG4gIHZhciBwcml2YXRlTmFtZXMgPSAkY3JlYXRlKG51bGwpO1xuICBmdW5jdGlvbiBpc1ByaXZhdGVOYW1lKHMpIHtcbiAgICByZXR1cm4gcHJpdmF0ZU5hbWVzW3NdO1xuICB9XG4gIGZ1bmN0aW9uIGNyZWF0ZVByaXZhdGVOYW1lKCkge1xuICAgIHZhciBzID0gbmV3VW5pcXVlU3RyaW5nKCk7XG4gICAgcHJpdmF0ZU5hbWVzW3NdID0gdHJ1ZTtcbiAgICByZXR1cm4gcztcbiAgfVxuICBmdW5jdGlvbiBpc1NoaW1TeW1ib2woc3ltYm9sKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBzeW1ib2wgPT09ICdvYmplY3QnICYmIHN5bWJvbCBpbnN0YW5jZW9mIFN5bWJvbFZhbHVlO1xuICB9XG4gIGZ1bmN0aW9uIHR5cGVPZih2KSB7XG4gICAgaWYgKGlzU2hpbVN5bWJvbCh2KSlcbiAgICAgIHJldHVybiAnc3ltYm9sJztcbiAgICByZXR1cm4gdHlwZW9mIHY7XG4gIH1cbiAgZnVuY3Rpb24gU3ltYm9sKGRlc2NyaXB0aW9uKSB7XG4gICAgdmFyIHZhbHVlID0gbmV3IFN5bWJvbFZhbHVlKGRlc2NyaXB0aW9uKTtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU3ltYm9sKSlcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdTeW1ib2wgY2Fubm90IGJlIG5ld1xcJ2VkJyk7XG4gIH1cbiAgJGRlZmluZVByb3BlcnR5KFN5bWJvbC5wcm90b3R5cGUsICdjb25zdHJ1Y3RvcicsIG5vbkVudW0oU3ltYm9sKSk7XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2wucHJvdG90eXBlLCAndG9TdHJpbmcnLCBtZXRob2QoZnVuY3Rpb24oKSB7XG4gICAgdmFyIHN5bWJvbFZhbHVlID0gdGhpc1tzeW1ib2xEYXRhUHJvcGVydHldO1xuICAgIGlmICghZ2V0T3B0aW9uKCdzeW1ib2xzJykpXG4gICAgICByZXR1cm4gc3ltYm9sVmFsdWVbc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eV07XG4gICAgaWYgKCFzeW1ib2xWYWx1ZSlcbiAgICAgIHRocm93IFR5cGVFcnJvcignQ29udmVyc2lvbiBmcm9tIHN5bWJvbCB0byBzdHJpbmcnKTtcbiAgICB2YXIgZGVzYyA9IHN5bWJvbFZhbHVlW3N5bWJvbERlc2NyaXB0aW9uUHJvcGVydHldO1xuICAgIGlmIChkZXNjID09PSB1bmRlZmluZWQpXG4gICAgICBkZXNjID0gJyc7XG4gICAgcmV0dXJuICdTeW1ib2woJyArIGRlc2MgKyAnKSc7XG4gIH0pKTtcbiAgJGRlZmluZVByb3BlcnR5KFN5bWJvbC5wcm90b3R5cGUsICd2YWx1ZU9mJywgbWV0aG9kKGZ1bmN0aW9uKCkge1xuICAgIHZhciBzeW1ib2xWYWx1ZSA9IHRoaXNbc3ltYm9sRGF0YVByb3BlcnR5XTtcbiAgICBpZiAoIXN5bWJvbFZhbHVlKVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdDb252ZXJzaW9uIGZyb20gc3ltYm9sIHRvIHN0cmluZycpO1xuICAgIGlmICghZ2V0T3B0aW9uKCdzeW1ib2xzJykpXG4gICAgICByZXR1cm4gc3ltYm9sVmFsdWVbc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eV07XG4gICAgcmV0dXJuIHN5bWJvbFZhbHVlO1xuICB9KSk7XG4gIGZ1bmN0aW9uIFN5bWJvbFZhbHVlKGRlc2NyaXB0aW9uKSB7XG4gICAgdmFyIGtleSA9IG5ld1VuaXF1ZVN0cmluZygpO1xuICAgICRkZWZpbmVQcm9wZXJ0eSh0aGlzLCBzeW1ib2xEYXRhUHJvcGVydHksIHt2YWx1ZTogdGhpc30pO1xuICAgICRkZWZpbmVQcm9wZXJ0eSh0aGlzLCBzeW1ib2xJbnRlcm5hbFByb3BlcnR5LCB7dmFsdWU6IGtleX0pO1xuICAgICRkZWZpbmVQcm9wZXJ0eSh0aGlzLCBzeW1ib2xEZXNjcmlwdGlvblByb3BlcnR5LCB7dmFsdWU6IGRlc2NyaXB0aW9ufSk7XG4gICAgZnJlZXplKHRoaXMpO1xuICAgIHN5bWJvbFZhbHVlc1trZXldID0gdGhpcztcbiAgfVxuICAkZGVmaW5lUHJvcGVydHkoU3ltYm9sVmFsdWUucHJvdG90eXBlLCAnY29uc3RydWN0b3InLCBub25FbnVtKFN5bWJvbCkpO1xuICAkZGVmaW5lUHJvcGVydHkoU3ltYm9sVmFsdWUucHJvdG90eXBlLCAndG9TdHJpbmcnLCB7XG4gICAgdmFsdWU6IFN5bWJvbC5wcm90b3R5cGUudG9TdHJpbmcsXG4gICAgZW51bWVyYWJsZTogZmFsc2VcbiAgfSk7XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2xWYWx1ZS5wcm90b3R5cGUsICd2YWx1ZU9mJywge1xuICAgIHZhbHVlOiBTeW1ib2wucHJvdG90eXBlLnZhbHVlT2YsXG4gICAgZW51bWVyYWJsZTogZmFsc2VcbiAgfSk7XG4gIHZhciBoYXNoUHJvcGVydHkgPSBjcmVhdGVQcml2YXRlTmFtZSgpO1xuICB2YXIgaGFzaFByb3BlcnR5RGVzY3JpcHRvciA9IHt2YWx1ZTogdW5kZWZpbmVkfTtcbiAgdmFyIGhhc2hPYmplY3RQcm9wZXJ0aWVzID0ge1xuICAgIGhhc2g6IHt2YWx1ZTogdW5kZWZpbmVkfSxcbiAgICBzZWxmOiB7dmFsdWU6IHVuZGVmaW5lZH1cbiAgfTtcbiAgdmFyIGhhc2hDb3VudGVyID0gMDtcbiAgZnVuY3Rpb24gZ2V0T3duSGFzaE9iamVjdChvYmplY3QpIHtcbiAgICB2YXIgaGFzaE9iamVjdCA9IG9iamVjdFtoYXNoUHJvcGVydHldO1xuICAgIGlmIChoYXNoT2JqZWN0ICYmIGhhc2hPYmplY3Quc2VsZiA9PT0gb2JqZWN0KVxuICAgICAgcmV0dXJuIGhhc2hPYmplY3Q7XG4gICAgaWYgKCRpc0V4dGVuc2libGUob2JqZWN0KSkge1xuICAgICAgaGFzaE9iamVjdFByb3BlcnRpZXMuaGFzaC52YWx1ZSA9IGhhc2hDb3VudGVyKys7XG4gICAgICBoYXNoT2JqZWN0UHJvcGVydGllcy5zZWxmLnZhbHVlID0gb2JqZWN0O1xuICAgICAgaGFzaFByb3BlcnR5RGVzY3JpcHRvci52YWx1ZSA9ICRjcmVhdGUobnVsbCwgaGFzaE9iamVjdFByb3BlcnRpZXMpO1xuICAgICAgJGRlZmluZVByb3BlcnR5KG9iamVjdCwgaGFzaFByb3BlcnR5LCBoYXNoUHJvcGVydHlEZXNjcmlwdG9yKTtcbiAgICAgIHJldHVybiBoYXNoUHJvcGVydHlEZXNjcmlwdG9yLnZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGZ1bmN0aW9uIGZyZWV6ZShvYmplY3QpIHtcbiAgICBnZXRPd25IYXNoT2JqZWN0KG9iamVjdCk7XG4gICAgcmV0dXJuICRmcmVlemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuICBmdW5jdGlvbiBwcmV2ZW50RXh0ZW5zaW9ucyhvYmplY3QpIHtcbiAgICBnZXRPd25IYXNoT2JqZWN0KG9iamVjdCk7XG4gICAgcmV0dXJuICRwcmV2ZW50RXh0ZW5zaW9ucy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG4gIGZ1bmN0aW9uIHNlYWwob2JqZWN0KSB7XG4gICAgZ2V0T3duSGFzaE9iamVjdChvYmplY3QpO1xuICAgIHJldHVybiAkc2VhbC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG4gIGZyZWV6ZShTeW1ib2xWYWx1ZS5wcm90b3R5cGUpO1xuICBmdW5jdGlvbiBpc1N5bWJvbFN0cmluZyhzKSB7XG4gICAgcmV0dXJuIHN5bWJvbFZhbHVlc1tzXSB8fCBwcml2YXRlTmFtZXNbc107XG4gIH1cbiAgZnVuY3Rpb24gdG9Qcm9wZXJ0eShuYW1lKSB7XG4gICAgaWYgKGlzU2hpbVN5bWJvbChuYW1lKSlcbiAgICAgIHJldHVybiBuYW1lW3N5bWJvbEludGVybmFsUHJvcGVydHldO1xuICAgIHJldHVybiBuYW1lO1xuICB9XG4gIGZ1bmN0aW9uIHJlbW92ZVN5bWJvbEtleXMoYXJyYXkpIHtcbiAgICB2YXIgcnYgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIWlzU3ltYm9sU3RyaW5nKGFycmF5W2ldKSkge1xuICAgICAgICBydi5wdXNoKGFycmF5W2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJ2O1xuICB9XG4gIGZ1bmN0aW9uIGdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KSB7XG4gICAgcmV0dXJuIHJlbW92ZVN5bWJvbEtleXMoJGdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KSk7XG4gIH1cbiAgZnVuY3Rpb24ga2V5cyhvYmplY3QpIHtcbiAgICByZXR1cm4gcmVtb3ZlU3ltYm9sS2V5cygka2V5cyhvYmplY3QpKTtcbiAgfVxuICBmdW5jdGlvbiBnZXRPd25Qcm9wZXJ0eVN5bWJvbHMob2JqZWN0KSB7XG4gICAgdmFyIHJ2ID0gW107XG4gICAgdmFyIG5hbWVzID0gJGdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgc3ltYm9sID0gc3ltYm9sVmFsdWVzW25hbWVzW2ldXTtcbiAgICAgIGlmIChzeW1ib2wpIHtcbiAgICAgICAgcnYucHVzaChzeW1ib2wpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcnY7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgbmFtZSkge1xuICAgIHJldHVybiAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgdG9Qcm9wZXJ0eShuYW1lKSk7XG4gIH1cbiAgZnVuY3Rpb24gaGFzT3duUHJvcGVydHkobmFtZSkge1xuICAgIHJldHVybiAkaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCB0b1Byb3BlcnR5KG5hbWUpKTtcbiAgfVxuICBmdW5jdGlvbiBnZXRPcHRpb24obmFtZSkge1xuICAgIHJldHVybiBnbG9iYWwudHJhY2V1ciAmJiBnbG9iYWwudHJhY2V1ci5vcHRpb25zW25hbWVdO1xuICB9XG4gIGZ1bmN0aW9uIGRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwgZGVzY3JpcHRvcikge1xuICAgIGlmIChpc1NoaW1TeW1ib2wobmFtZSkpIHtcbiAgICAgIG5hbWUgPSBuYW1lW3N5bWJvbEludGVybmFsUHJvcGVydHldO1xuICAgIH1cbiAgICAkZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCBkZXNjcmlwdG9yKTtcbiAgICByZXR1cm4gb2JqZWN0O1xuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsT2JqZWN0KE9iamVjdCkge1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QsICdkZWZpbmVQcm9wZXJ0eScsIHt2YWx1ZTogZGVmaW5lUHJvcGVydHl9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnZ2V0T3duUHJvcGVydHlOYW1lcycsIHt2YWx1ZTogZ2V0T3duUHJvcGVydHlOYW1lc30pO1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QsICdnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3InLCB7dmFsdWU6IGdldE93blByb3BlcnR5RGVzY3JpcHRvcn0pO1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QucHJvdG90eXBlLCAnaGFzT3duUHJvcGVydHknLCB7dmFsdWU6IGhhc093blByb3BlcnR5fSk7XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ2ZyZWV6ZScsIHt2YWx1ZTogZnJlZXplfSk7XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ3ByZXZlbnRFeHRlbnNpb25zJywge3ZhbHVlOiBwcmV2ZW50RXh0ZW5zaW9uc30pO1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QsICdzZWFsJywge3ZhbHVlOiBzZWFsfSk7XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ2tleXMnLCB7dmFsdWU6IGtleXN9KTtcbiAgfVxuICBmdW5jdGlvbiBleHBvcnRTdGFyKG9iamVjdCkge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbmFtZXMgPSAkZ2V0T3duUHJvcGVydHlOYW1lcyhhcmd1bWVudHNbaV0pO1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBuYW1lcy5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIgbmFtZSA9IG5hbWVzW2pdO1xuICAgICAgICBpZiAoaXNTeW1ib2xTdHJpbmcobmFtZSkpXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIChmdW5jdGlvbihtb2QsIG5hbWUpIHtcbiAgICAgICAgICAkZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICByZXR1cm4gbW9kW25hbWVdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSkoYXJndW1lbnRzW2ldLCBuYW1lc1tqXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmplY3Q7XG4gIH1cbiAgZnVuY3Rpb24gaXNPYmplY3QoeCkge1xuICAgIHJldHVybiB4ICE9IG51bGwgJiYgKHR5cGVvZiB4ID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyk7XG4gIH1cbiAgZnVuY3Rpb24gdG9PYmplY3QoeCkge1xuICAgIGlmICh4ID09IG51bGwpXG4gICAgICB0aHJvdyAkVHlwZUVycm9yKCk7XG4gICAgcmV0dXJuICRPYmplY3QoeCk7XG4gIH1cbiAgZnVuY3Rpb24gY2hlY2tPYmplY3RDb2VyY2libGUoYXJndW1lbnQpIHtcbiAgICBpZiAoYXJndW1lbnQgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVmFsdWUgY2Fubm90IGJlIGNvbnZlcnRlZCB0byBhbiBPYmplY3QnKTtcbiAgICB9XG4gICAgcmV0dXJuIGFyZ3VtZW50O1xuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsU3ltYm9sKGdsb2JhbCwgU3ltYm9sKSB7XG4gICAgaWYgKCFnbG9iYWwuU3ltYm9sKSB7XG4gICAgICBnbG9iYWwuU3ltYm9sID0gU3ltYm9sO1xuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9IGdldE93blByb3BlcnR5U3ltYm9scztcbiAgICB9XG4gICAgaWYgKCFnbG9iYWwuU3ltYm9sLml0ZXJhdG9yKSB7XG4gICAgICBnbG9iYWwuU3ltYm9sLml0ZXJhdG9yID0gU3ltYm9sKCdTeW1ib2wuaXRlcmF0b3InKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gc2V0dXBHbG9iYWxzKGdsb2JhbCkge1xuICAgIHBvbHlmaWxsU3ltYm9sKGdsb2JhbCwgU3ltYm9sKTtcbiAgICBnbG9iYWwuUmVmbGVjdCA9IGdsb2JhbC5SZWZsZWN0IHx8IHt9O1xuICAgIGdsb2JhbC5SZWZsZWN0Lmdsb2JhbCA9IGdsb2JhbC5SZWZsZWN0Lmdsb2JhbCB8fCBnbG9iYWw7XG4gICAgcG9seWZpbGxPYmplY3QoZ2xvYmFsLk9iamVjdCk7XG4gIH1cbiAgc2V0dXBHbG9iYWxzKGdsb2JhbCk7XG4gIGdsb2JhbC4kdHJhY2V1clJ1bnRpbWUgPSB7XG4gICAgY2hlY2tPYmplY3RDb2VyY2libGU6IGNoZWNrT2JqZWN0Q29lcmNpYmxlLFxuICAgIGNyZWF0ZVByaXZhdGVOYW1lOiBjcmVhdGVQcml2YXRlTmFtZSxcbiAgICBkZWZpbmVQcm9wZXJ0aWVzOiAkZGVmaW5lUHJvcGVydGllcyxcbiAgICBkZWZpbmVQcm9wZXJ0eTogJGRlZmluZVByb3BlcnR5LFxuICAgIGV4cG9ydFN0YXI6IGV4cG9ydFN0YXIsXG4gICAgZ2V0T3duSGFzaE9iamVjdDogZ2V0T3duSGFzaE9iamVjdCxcbiAgICBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I6ICRnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IsXG4gICAgZ2V0T3duUHJvcGVydHlOYW1lczogJGdldE93blByb3BlcnR5TmFtZXMsXG4gICAgaXNPYmplY3Q6IGlzT2JqZWN0LFxuICAgIGlzUHJpdmF0ZU5hbWU6IGlzUHJpdmF0ZU5hbWUsXG4gICAgaXNTeW1ib2xTdHJpbmc6IGlzU3ltYm9sU3RyaW5nLFxuICAgIGtleXM6ICRrZXlzLFxuICAgIHNldHVwR2xvYmFsczogc2V0dXBHbG9iYWxzLFxuICAgIHRvT2JqZWN0OiB0b09iamVjdCxcbiAgICB0b1Byb3BlcnR5OiB0b1Byb3BlcnR5LFxuICAgIHR5cGVvZjogdHlwZU9mXG4gIH07XG59KSh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHRoaXMpO1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBwYXRoO1xuICBmdW5jdGlvbiByZWxhdGl2ZVJlcXVpcmUoY2FsbGVyUGF0aCwgcmVxdWlyZWRQYXRoKSB7XG4gICAgcGF0aCA9IHBhdGggfHwgdHlwZW9mIHJlcXVpcmUgIT09ICd1bmRlZmluZWQnICYmIHJlcXVpcmUoJ3BhdGgnKTtcbiAgICBmdW5jdGlvbiBpc0RpcmVjdG9yeShwYXRoKSB7XG4gICAgICByZXR1cm4gcGF0aC5zbGljZSgtMSkgPT09ICcvJztcbiAgICB9XG4gICAgZnVuY3Rpb24gaXNBYnNvbHV0ZShwYXRoKSB7XG4gICAgICByZXR1cm4gcGF0aFswXSA9PT0gJy8nO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpc1JlbGF0aXZlKHBhdGgpIHtcbiAgICAgIHJldHVybiBwYXRoWzBdID09PSAnLic7XG4gICAgfVxuICAgIGlmIChpc0RpcmVjdG9yeShyZXF1aXJlZFBhdGgpIHx8IGlzQWJzb2x1dGUocmVxdWlyZWRQYXRoKSlcbiAgICAgIHJldHVybjtcbiAgICByZXR1cm4gaXNSZWxhdGl2ZShyZXF1aXJlZFBhdGgpID8gcmVxdWlyZShwYXRoLnJlc29sdmUocGF0aC5kaXJuYW1lKGNhbGxlclBhdGgpLCByZXF1aXJlZFBhdGgpKSA6IHJlcXVpcmUocmVxdWlyZWRQYXRoKTtcbiAgfVxuICAkdHJhY2V1clJ1bnRpbWUucmVxdWlyZSA9IHJlbGF0aXZlUmVxdWlyZTtcbn0pKCk7XG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgZnVuY3Rpb24gc3ByZWFkKCkge1xuICAgIHZhciBydiA9IFtdLFxuICAgICAgICBqID0gMCxcbiAgICAgICAgaXRlclJlc3VsdDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHZhbHVlVG9TcHJlYWQgPSAkdHJhY2V1clJ1bnRpbWUuY2hlY2tPYmplY3RDb2VyY2libGUoYXJndW1lbnRzW2ldKTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWVUb1NwcmVhZFskdHJhY2V1clJ1bnRpbWUudG9Qcm9wZXJ0eShTeW1ib2wuaXRlcmF0b3IpXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3Qgc3ByZWFkIG5vbi1pdGVyYWJsZSBvYmplY3QuJyk7XG4gICAgICB9XG4gICAgICB2YXIgaXRlciA9IHZhbHVlVG9TcHJlYWRbJHRyYWNldXJSdW50aW1lLnRvUHJvcGVydHkoU3ltYm9sLml0ZXJhdG9yKV0oKTtcbiAgICAgIHdoaWxlICghKGl0ZXJSZXN1bHQgPSBpdGVyLm5leHQoKSkuZG9uZSkge1xuICAgICAgICBydltqKytdID0gaXRlclJlc3VsdC52YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJ2O1xuICB9XG4gICR0cmFjZXVyUnVudGltZS5zcHJlYWQgPSBzcHJlYWQ7XG59KSgpO1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciAkT2JqZWN0ID0gT2JqZWN0O1xuICB2YXIgJFR5cGVFcnJvciA9IFR5cGVFcnJvcjtcbiAgdmFyICRjcmVhdGUgPSAkT2JqZWN0LmNyZWF0ZTtcbiAgdmFyICRkZWZpbmVQcm9wZXJ0aWVzID0gJHRyYWNldXJSdW50aW1lLmRlZmluZVByb3BlcnRpZXM7XG4gIHZhciAkZGVmaW5lUHJvcGVydHkgPSAkdHJhY2V1clJ1bnRpbWUuZGVmaW5lUHJvcGVydHk7XG4gIHZhciAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID0gJHRyYWNldXJSdW50aW1lLmdldE93blByb3BlcnR5RGVzY3JpcHRvcjtcbiAgdmFyICRnZXRPd25Qcm9wZXJ0eU5hbWVzID0gJHRyYWNldXJSdW50aW1lLmdldE93blByb3BlcnR5TmFtZXM7XG4gIHZhciAkZ2V0UHJvdG90eXBlT2YgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Y7XG4gIHZhciAkX18wID0gT2JqZWN0LFxuICAgICAgZ2V0T3duUHJvcGVydHlOYW1lcyA9ICRfXzAuZ2V0T3duUHJvcGVydHlOYW1lcyxcbiAgICAgIGdldE93blByb3BlcnR5U3ltYm9scyA9ICRfXzAuZ2V0T3duUHJvcGVydHlTeW1ib2xzO1xuICBmdW5jdGlvbiBzdXBlckRlc2NyaXB0b3IoaG9tZU9iamVjdCwgbmFtZSkge1xuICAgIHZhciBwcm90byA9ICRnZXRQcm90b3R5cGVPZihob21lT2JqZWN0KTtcbiAgICBkbyB7XG4gICAgICB2YXIgcmVzdWx0ID0gJGdldE93blByb3BlcnR5RGVzY3JpcHRvcihwcm90bywgbmFtZSk7XG4gICAgICBpZiAocmVzdWx0KVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgcHJvdG8gPSAkZ2V0UHJvdG90eXBlT2YocHJvdG8pO1xuICAgIH0gd2hpbGUgKHByb3RvKTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGZ1bmN0aW9uIHN1cGVyQ29uc3RydWN0b3IoY3Rvcikge1xuICAgIHJldHVybiBjdG9yLl9fcHJvdG9fXztcbiAgfVxuICBmdW5jdGlvbiBzdXBlckNhbGwoc2VsZiwgaG9tZU9iamVjdCwgbmFtZSwgYXJncykge1xuICAgIHJldHVybiBzdXBlckdldChzZWxmLCBob21lT2JqZWN0LCBuYW1lKS5hcHBseShzZWxmLCBhcmdzKTtcbiAgfVxuICBmdW5jdGlvbiBzdXBlckdldChzZWxmLCBob21lT2JqZWN0LCBuYW1lKSB7XG4gICAgdmFyIGRlc2NyaXB0b3IgPSBzdXBlckRlc2NyaXB0b3IoaG9tZU9iamVjdCwgbmFtZSk7XG4gICAgaWYgKGRlc2NyaXB0b3IpIHtcbiAgICAgIGlmICghZGVzY3JpcHRvci5nZXQpXG4gICAgICAgIHJldHVybiBkZXNjcmlwdG9yLnZhbHVlO1xuICAgICAgcmV0dXJuIGRlc2NyaXB0b3IuZ2V0LmNhbGwoc2VsZik7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgZnVuY3Rpb24gc3VwZXJTZXQoc2VsZiwgaG9tZU9iamVjdCwgbmFtZSwgdmFsdWUpIHtcbiAgICB2YXIgZGVzY3JpcHRvciA9IHN1cGVyRGVzY3JpcHRvcihob21lT2JqZWN0LCBuYW1lKTtcbiAgICBpZiAoZGVzY3JpcHRvciAmJiBkZXNjcmlwdG9yLnNldCkge1xuICAgICAgZGVzY3JpcHRvci5zZXQuY2FsbChzZWxmLCB2YWx1ZSk7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHRocm93ICRUeXBlRXJyb3IoKFwic3VwZXIgaGFzIG5vIHNldHRlciAnXCIgKyBuYW1lICsgXCInLlwiKSk7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0RGVzY3JpcHRvcnMob2JqZWN0KSB7XG4gICAgdmFyIGRlc2NyaXB0b3JzID0ge307XG4gICAgdmFyIG5hbWVzID0gZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBuYW1lID0gbmFtZXNbaV07XG4gICAgICBkZXNjcmlwdG9yc1tuYW1lXSA9ICRnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBuYW1lKTtcbiAgICB9XG4gICAgdmFyIHN5bWJvbHMgPSBnZXRPd25Qcm9wZXJ0eVN5bWJvbHMob2JqZWN0KTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN5bWJvbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBzeW1ib2wgPSBzeW1ib2xzW2ldO1xuICAgICAgZGVzY3JpcHRvcnNbJHRyYWNldXJSdW50aW1lLnRvUHJvcGVydHkoc3ltYm9sKV0gPSAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgJHRyYWNldXJSdW50aW1lLnRvUHJvcGVydHkoc3ltYm9sKSk7XG4gICAgfVxuICAgIHJldHVybiBkZXNjcmlwdG9ycztcbiAgfVxuICBmdW5jdGlvbiBjcmVhdGVDbGFzcyhjdG9yLCBvYmplY3QsIHN0YXRpY09iamVjdCwgc3VwZXJDbGFzcykge1xuICAgICRkZWZpbmVQcm9wZXJ0eShvYmplY3QsICdjb25zdHJ1Y3RvcicsIHtcbiAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMykge1xuICAgICAgaWYgKHR5cGVvZiBzdXBlckNsYXNzID09PSAnZnVuY3Rpb24nKVxuICAgICAgICBjdG9yLl9fcHJvdG9fXyA9IHN1cGVyQ2xhc3M7XG4gICAgICBjdG9yLnByb3RvdHlwZSA9ICRjcmVhdGUoZ2V0UHJvdG9QYXJlbnQoc3VwZXJDbGFzcyksIGdldERlc2NyaXB0b3JzKG9iamVjdCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjdG9yLnByb3RvdHlwZSA9IG9iamVjdDtcbiAgICB9XG4gICAgJGRlZmluZVByb3BlcnR5KGN0b3IsICdwcm90b3R5cGUnLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlXG4gICAgfSk7XG4gICAgcmV0dXJuICRkZWZpbmVQcm9wZXJ0aWVzKGN0b3IsIGdldERlc2NyaXB0b3JzKHN0YXRpY09iamVjdCkpO1xuICB9XG4gIGZ1bmN0aW9uIGdldFByb3RvUGFyZW50KHN1cGVyQ2xhc3MpIHtcbiAgICBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHZhciBwcm90b3R5cGUgPSBzdXBlckNsYXNzLnByb3RvdHlwZTtcbiAgICAgIGlmICgkT2JqZWN0KHByb3RvdHlwZSkgPT09IHByb3RvdHlwZSB8fCBwcm90b3R5cGUgPT09IG51bGwpXG4gICAgICAgIHJldHVybiBzdXBlckNsYXNzLnByb3RvdHlwZTtcbiAgICAgIHRocm93IG5ldyAkVHlwZUVycm9yKCdzdXBlciBwcm90b3R5cGUgbXVzdCBiZSBhbiBPYmplY3Qgb3IgbnVsbCcpO1xuICAgIH1cbiAgICBpZiAoc3VwZXJDbGFzcyA9PT0gbnVsbClcbiAgICAgIHJldHVybiBudWxsO1xuICAgIHRocm93IG5ldyAkVHlwZUVycm9yKChcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uLCBub3QgXCIgKyB0eXBlb2Ygc3VwZXJDbGFzcyArIFwiLlwiKSk7XG4gIH1cbiAgZnVuY3Rpb24gZGVmYXVsdFN1cGVyQ2FsbChzZWxmLCBob21lT2JqZWN0LCBhcmdzKSB7XG4gICAgaWYgKCRnZXRQcm90b3R5cGVPZihob21lT2JqZWN0KSAhPT0gbnVsbClcbiAgICAgIHN1cGVyQ2FsbChzZWxmLCBob21lT2JqZWN0LCAnY29uc3RydWN0b3InLCBhcmdzKTtcbiAgfVxuICAkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MgPSBjcmVhdGVDbGFzcztcbiAgJHRyYWNldXJSdW50aW1lLmRlZmF1bHRTdXBlckNhbGwgPSBkZWZhdWx0U3VwZXJDYWxsO1xuICAkdHJhY2V1clJ1bnRpbWUuc3VwZXJDYWxsID0gc3VwZXJDYWxsO1xuICAkdHJhY2V1clJ1bnRpbWUuc3VwZXJDb25zdHJ1Y3RvciA9IHN1cGVyQ29uc3RydWN0b3I7XG4gICR0cmFjZXVyUnVudGltZS5zdXBlckdldCA9IHN1cGVyR2V0O1xuICAkdHJhY2V1clJ1bnRpbWUuc3VwZXJTZXQgPSBzdXBlclNldDtcbn0pKCk7XG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgaWYgKHR5cGVvZiAkdHJhY2V1clJ1bnRpbWUgIT09ICdvYmplY3QnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd0cmFjZXVyIHJ1bnRpbWUgbm90IGZvdW5kLicpO1xuICB9XG4gIHZhciBjcmVhdGVQcml2YXRlTmFtZSA9ICR0cmFjZXVyUnVudGltZS5jcmVhdGVQcml2YXRlTmFtZTtcbiAgdmFyICRkZWZpbmVQcm9wZXJ0aWVzID0gJHRyYWNldXJSdW50aW1lLmRlZmluZVByb3BlcnRpZXM7XG4gIHZhciAkZGVmaW5lUHJvcGVydHkgPSAkdHJhY2V1clJ1bnRpbWUuZGVmaW5lUHJvcGVydHk7XG4gIHZhciAkY3JlYXRlID0gT2JqZWN0LmNyZWF0ZTtcbiAgdmFyICRUeXBlRXJyb3IgPSBUeXBlRXJyb3I7XG4gIGZ1bmN0aW9uIG5vbkVudW0odmFsdWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH07XG4gIH1cbiAgdmFyIFNUX05FV0JPUk4gPSAwO1xuICB2YXIgU1RfRVhFQ1VUSU5HID0gMTtcbiAgdmFyIFNUX1NVU1BFTkRFRCA9IDI7XG4gIHZhciBTVF9DTE9TRUQgPSAzO1xuICB2YXIgRU5EX1NUQVRFID0gLTI7XG4gIHZhciBSRVRIUk9XX1NUQVRFID0gLTM7XG4gIGZ1bmN0aW9uIGdldEludGVybmFsRXJyb3Ioc3RhdGUpIHtcbiAgICByZXR1cm4gbmV3IEVycm9yKCdUcmFjZXVyIGNvbXBpbGVyIGJ1ZzogaW52YWxpZCBzdGF0ZSBpbiBzdGF0ZSBtYWNoaW5lOiAnICsgc3RhdGUpO1xuICB9XG4gIGZ1bmN0aW9uIEdlbmVyYXRvckNvbnRleHQoKSB7XG4gICAgdGhpcy5zdGF0ZSA9IDA7XG4gICAgdGhpcy5HU3RhdGUgPSBTVF9ORVdCT1JOO1xuICAgIHRoaXMuc3RvcmVkRXhjZXB0aW9uID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuZmluYWxseUZhbGxUaHJvdWdoID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuc2VudF8gPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5yZXR1cm5WYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnRyeVN0YWNrXyA9IFtdO1xuICB9XG4gIEdlbmVyYXRvckNvbnRleHQucHJvdG90eXBlID0ge1xuICAgIHB1c2hUcnk6IGZ1bmN0aW9uKGNhdGNoU3RhdGUsIGZpbmFsbHlTdGF0ZSkge1xuICAgICAgaWYgKGZpbmFsbHlTdGF0ZSAhPT0gbnVsbCkge1xuICAgICAgICB2YXIgZmluYWxseUZhbGxUaHJvdWdoID0gbnVsbDtcbiAgICAgICAgZm9yICh2YXIgaSA9IHRoaXMudHJ5U3RhY2tfLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgaWYgKHRoaXMudHJ5U3RhY2tfW2ldLmNhdGNoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGZpbmFsbHlGYWxsVGhyb3VnaCA9IHRoaXMudHJ5U3RhY2tfW2ldLmNhdGNoO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmaW5hbGx5RmFsbFRocm91Z2ggPT09IG51bGwpXG4gICAgICAgICAgZmluYWxseUZhbGxUaHJvdWdoID0gUkVUSFJPV19TVEFURTtcbiAgICAgICAgdGhpcy50cnlTdGFja18ucHVzaCh7XG4gICAgICAgICAgZmluYWxseTogZmluYWxseVN0YXRlLFxuICAgICAgICAgIGZpbmFsbHlGYWxsVGhyb3VnaDogZmluYWxseUZhbGxUaHJvdWdoXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgaWYgKGNhdGNoU3RhdGUgIT09IG51bGwpIHtcbiAgICAgICAgdGhpcy50cnlTdGFja18ucHVzaCh7Y2F0Y2g6IGNhdGNoU3RhdGV9KTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHBvcFRyeTogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnRyeVN0YWNrXy5wb3AoKTtcbiAgICB9LFxuICAgIGdldCBzZW50KCkge1xuICAgICAgdGhpcy5tYXliZVRocm93KCk7XG4gICAgICByZXR1cm4gdGhpcy5zZW50XztcbiAgICB9LFxuICAgIHNldCBzZW50KHYpIHtcbiAgICAgIHRoaXMuc2VudF8gPSB2O1xuICAgIH0sXG4gICAgZ2V0IHNlbnRJZ25vcmVUaHJvdygpIHtcbiAgICAgIHJldHVybiB0aGlzLnNlbnRfO1xuICAgIH0sXG4gICAgbWF5YmVUaHJvdzogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5hY3Rpb24gPT09ICd0aHJvdycpIHtcbiAgICAgICAgdGhpcy5hY3Rpb24gPSAnbmV4dCc7XG4gICAgICAgIHRocm93IHRoaXMuc2VudF87XG4gICAgICB9XG4gICAgfSxcbiAgICBlbmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICAgIGNhc2UgRU5EX1NUQVRFOlxuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICBjYXNlIFJFVEhST1dfU1RBVEU6XG4gICAgICAgICAgdGhyb3cgdGhpcy5zdG9yZWRFeGNlcHRpb247XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgZ2V0SW50ZXJuYWxFcnJvcih0aGlzLnN0YXRlKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGhhbmRsZUV4Y2VwdGlvbjogZnVuY3Rpb24oZXgpIHtcbiAgICAgIHRoaXMuR1N0YXRlID0gU1RfQ0xPU0VEO1xuICAgICAgdGhpcy5zdGF0ZSA9IEVORF9TVEFURTtcbiAgICAgIHRocm93IGV4O1xuICAgIH1cbiAgfTtcbiAgZnVuY3Rpb24gbmV4dE9yVGhyb3coY3R4LCBtb3ZlTmV4dCwgYWN0aW9uLCB4KSB7XG4gICAgc3dpdGNoIChjdHguR1N0YXRlKSB7XG4gICAgICBjYXNlIFNUX0VYRUNVVElORzpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKChcIlxcXCJcIiArIGFjdGlvbiArIFwiXFxcIiBvbiBleGVjdXRpbmcgZ2VuZXJhdG9yXCIpKTtcbiAgICAgIGNhc2UgU1RfQ0xPU0VEOlxuICAgICAgICBpZiAoYWN0aW9uID09ICduZXh0Jykge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkLFxuICAgICAgICAgICAgZG9uZTogdHJ1ZVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgeDtcbiAgICAgIGNhc2UgU1RfTkVXQk9STjpcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ3Rocm93Jykge1xuICAgICAgICAgIGN0eC5HU3RhdGUgPSBTVF9DTE9TRUQ7XG4gICAgICAgICAgdGhyb3cgeDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoeCAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgIHRocm93ICRUeXBlRXJyb3IoJ1NlbnQgdmFsdWUgdG8gbmV3Ym9ybiBnZW5lcmF0b3InKTtcbiAgICAgIGNhc2UgU1RfU1VTUEVOREVEOlxuICAgICAgICBjdHguR1N0YXRlID0gU1RfRVhFQ1VUSU5HO1xuICAgICAgICBjdHguYWN0aW9uID0gYWN0aW9uO1xuICAgICAgICBjdHguc2VudCA9IHg7XG4gICAgICAgIHZhciB2YWx1ZSA9IG1vdmVOZXh0KGN0eCk7XG4gICAgICAgIHZhciBkb25lID0gdmFsdWUgPT09IGN0eDtcbiAgICAgICAgaWYgKGRvbmUpXG4gICAgICAgICAgdmFsdWUgPSBjdHgucmV0dXJuVmFsdWU7XG4gICAgICAgIGN0eC5HU3RhdGUgPSBkb25lID8gU1RfQ0xPU0VEIDogU1RfU1VTUEVOREVEO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICBkb25lOiBkb25lXG4gICAgICAgIH07XG4gICAgfVxuICB9XG4gIHZhciBjdHhOYW1lID0gY3JlYXRlUHJpdmF0ZU5hbWUoKTtcbiAgdmFyIG1vdmVOZXh0TmFtZSA9IGNyZWF0ZVByaXZhdGVOYW1lKCk7XG4gIGZ1bmN0aW9uIEdlbmVyYXRvckZ1bmN0aW9uKCkge31cbiAgZnVuY3Rpb24gR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGUoKSB7fVxuICBHZW5lcmF0b3JGdW5jdGlvbi5wcm90b3R5cGUgPSBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZTtcbiAgJGRlZmluZVByb3BlcnR5KEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlLCAnY29uc3RydWN0b3InLCBub25FbnVtKEdlbmVyYXRvckZ1bmN0aW9uKSk7XG4gIEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlLnByb3RvdHlwZSA9IHtcbiAgICBjb25zdHJ1Y3RvcjogR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGUsXG4gICAgbmV4dDogZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIG5leHRPclRocm93KHRoaXNbY3R4TmFtZV0sIHRoaXNbbW92ZU5leHROYW1lXSwgJ25leHQnLCB2KTtcbiAgICB9LFxuICAgIHRocm93OiBmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4gbmV4dE9yVGhyb3codGhpc1tjdHhOYW1lXSwgdGhpc1ttb3ZlTmV4dE5hbWVdLCAndGhyb3cnLCB2KTtcbiAgICB9XG4gIH07XG4gICRkZWZpbmVQcm9wZXJ0aWVzKEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlLnByb3RvdHlwZSwge1xuICAgIGNvbnN0cnVjdG9yOiB7ZW51bWVyYWJsZTogZmFsc2V9LFxuICAgIG5leHQ6IHtlbnVtZXJhYmxlOiBmYWxzZX0sXG4gICAgdGhyb3c6IHtlbnVtZXJhYmxlOiBmYWxzZX1cbiAgfSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZS5wcm90b3R5cGUsIFN5bWJvbC5pdGVyYXRvciwgbm9uRW51bShmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfSkpO1xuICBmdW5jdGlvbiBjcmVhdGVHZW5lcmF0b3JJbnN0YW5jZShpbm5lckZ1bmN0aW9uLCBmdW5jdGlvbk9iamVjdCwgc2VsZikge1xuICAgIHZhciBtb3ZlTmV4dCA9IGdldE1vdmVOZXh0KGlubmVyRnVuY3Rpb24sIHNlbGYpO1xuICAgIHZhciBjdHggPSBuZXcgR2VuZXJhdG9yQ29udGV4dCgpO1xuICAgIHZhciBvYmplY3QgPSAkY3JlYXRlKGZ1bmN0aW9uT2JqZWN0LnByb3RvdHlwZSk7XG4gICAgb2JqZWN0W2N0eE5hbWVdID0gY3R4O1xuICAgIG9iamVjdFttb3ZlTmV4dE5hbWVdID0gbW92ZU5leHQ7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuICBmdW5jdGlvbiBpbml0R2VuZXJhdG9yRnVuY3Rpb24oZnVuY3Rpb25PYmplY3QpIHtcbiAgICBmdW5jdGlvbk9iamVjdC5wcm90b3R5cGUgPSAkY3JlYXRlKEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlLnByb3RvdHlwZSk7XG4gICAgZnVuY3Rpb25PYmplY3QuX19wcm90b19fID0gR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGU7XG4gICAgcmV0dXJuIGZ1bmN0aW9uT2JqZWN0O1xuICB9XG4gIGZ1bmN0aW9uIEFzeW5jRnVuY3Rpb25Db250ZXh0KCkge1xuICAgIEdlbmVyYXRvckNvbnRleHQuY2FsbCh0aGlzKTtcbiAgICB0aGlzLmVyciA9IHVuZGVmaW5lZDtcbiAgICB2YXIgY3R4ID0gdGhpcztcbiAgICBjdHgucmVzdWx0ID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBjdHgucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICBjdHgucmVqZWN0ID0gcmVqZWN0O1xuICAgIH0pO1xuICB9XG4gIEFzeW5jRnVuY3Rpb25Db250ZXh0LnByb3RvdHlwZSA9ICRjcmVhdGUoR2VuZXJhdG9yQ29udGV4dC5wcm90b3R5cGUpO1xuICBBc3luY0Z1bmN0aW9uQ29udGV4dC5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oKSB7XG4gICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICBjYXNlIEVORF9TVEFURTpcbiAgICAgICAgdGhpcy5yZXNvbHZlKHRoaXMucmV0dXJuVmFsdWUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgUkVUSFJPV19TVEFURTpcbiAgICAgICAgdGhpcy5yZWplY3QodGhpcy5zdG9yZWRFeGNlcHRpb24pO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRoaXMucmVqZWN0KGdldEludGVybmFsRXJyb3IodGhpcy5zdGF0ZSkpO1xuICAgIH1cbiAgfTtcbiAgQXN5bmNGdW5jdGlvbkNvbnRleHQucHJvdG90eXBlLmhhbmRsZUV4Y2VwdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3RhdGUgPSBSRVRIUk9XX1NUQVRFO1xuICB9O1xuICBmdW5jdGlvbiBhc3luY1dyYXAoaW5uZXJGdW5jdGlvbiwgc2VsZikge1xuICAgIHZhciBtb3ZlTmV4dCA9IGdldE1vdmVOZXh0KGlubmVyRnVuY3Rpb24sIHNlbGYpO1xuICAgIHZhciBjdHggPSBuZXcgQXN5bmNGdW5jdGlvbkNvbnRleHQoKTtcbiAgICBjdHguY3JlYXRlQ2FsbGJhY2sgPSBmdW5jdGlvbihuZXdTdGF0ZSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGN0eC5zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgICBjdHgudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgbW92ZU5leHQoY3R4KTtcbiAgICAgIH07XG4gICAgfTtcbiAgICBjdHguZXJyYmFjayA9IGZ1bmN0aW9uKGVycikge1xuICAgICAgaGFuZGxlQ2F0Y2goY3R4LCBlcnIpO1xuICAgICAgbW92ZU5leHQoY3R4KTtcbiAgICB9O1xuICAgIG1vdmVOZXh0KGN0eCk7XG4gICAgcmV0dXJuIGN0eC5yZXN1bHQ7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0TW92ZU5leHQoaW5uZXJGdW5jdGlvbiwgc2VsZikge1xuICAgIHJldHVybiBmdW5jdGlvbihjdHgpIHtcbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIGlubmVyRnVuY3Rpb24uY2FsbChzZWxmLCBjdHgpO1xuICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgIGhhbmRsZUNhdGNoKGN0eCwgZXgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBoYW5kbGVDYXRjaChjdHgsIGV4KSB7XG4gICAgY3R4LnN0b3JlZEV4Y2VwdGlvbiA9IGV4O1xuICAgIHZhciBsYXN0ID0gY3R4LnRyeVN0YWNrX1tjdHgudHJ5U3RhY2tfLmxlbmd0aCAtIDFdO1xuICAgIGlmICghbGFzdCkge1xuICAgICAgY3R4LmhhbmRsZUV4Y2VwdGlvbihleCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGN0eC5zdGF0ZSA9IGxhc3QuY2F0Y2ggIT09IHVuZGVmaW5lZCA/IGxhc3QuY2F0Y2ggOiBsYXN0LmZpbmFsbHk7XG4gICAgaWYgKGxhc3QuZmluYWxseUZhbGxUaHJvdWdoICE9PSB1bmRlZmluZWQpXG4gICAgICBjdHguZmluYWxseUZhbGxUaHJvdWdoID0gbGFzdC5maW5hbGx5RmFsbFRocm91Z2g7XG4gIH1cbiAgJHRyYWNldXJSdW50aW1lLmFzeW5jV3JhcCA9IGFzeW5jV3JhcDtcbiAgJHRyYWNldXJSdW50aW1lLmluaXRHZW5lcmF0b3JGdW5jdGlvbiA9IGluaXRHZW5lcmF0b3JGdW5jdGlvbjtcbiAgJHRyYWNldXJSdW50aW1lLmNyZWF0ZUdlbmVyYXRvckluc3RhbmNlID0gY3JlYXRlR2VuZXJhdG9ySW5zdGFuY2U7XG59KSgpO1xuKGZ1bmN0aW9uKCkge1xuICBmdW5jdGlvbiBidWlsZEZyb21FbmNvZGVkUGFydHMob3B0X3NjaGVtZSwgb3B0X3VzZXJJbmZvLCBvcHRfZG9tYWluLCBvcHRfcG9ydCwgb3B0X3BhdGgsIG9wdF9xdWVyeURhdGEsIG9wdF9mcmFnbWVudCkge1xuICAgIHZhciBvdXQgPSBbXTtcbiAgICBpZiAob3B0X3NjaGVtZSkge1xuICAgICAgb3V0LnB1c2gob3B0X3NjaGVtZSwgJzonKTtcbiAgICB9XG4gICAgaWYgKG9wdF9kb21haW4pIHtcbiAgICAgIG91dC5wdXNoKCcvLycpO1xuICAgICAgaWYgKG9wdF91c2VySW5mbykge1xuICAgICAgICBvdXQucHVzaChvcHRfdXNlckluZm8sICdAJyk7XG4gICAgICB9XG4gICAgICBvdXQucHVzaChvcHRfZG9tYWluKTtcbiAgICAgIGlmIChvcHRfcG9ydCkge1xuICAgICAgICBvdXQucHVzaCgnOicsIG9wdF9wb3J0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG9wdF9wYXRoKSB7XG4gICAgICBvdXQucHVzaChvcHRfcGF0aCk7XG4gICAgfVxuICAgIGlmIChvcHRfcXVlcnlEYXRhKSB7XG4gICAgICBvdXQucHVzaCgnPycsIG9wdF9xdWVyeURhdGEpO1xuICAgIH1cbiAgICBpZiAob3B0X2ZyYWdtZW50KSB7XG4gICAgICBvdXQucHVzaCgnIycsIG9wdF9mcmFnbWVudCk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuam9pbignJyk7XG4gIH1cbiAgO1xuICB2YXIgc3BsaXRSZSA9IG5ldyBSZWdFeHAoJ14nICsgJyg/OicgKyAnKFteOi8/Iy5dKyknICsgJzopPycgKyAnKD86Ly8nICsgJyg/OihbXi8/I10qKUApPycgKyAnKFtcXFxcd1xcXFxkXFxcXC1cXFxcdTAxMDAtXFxcXHVmZmZmLiVdKiknICsgJyg/OjooWzAtOV0rKSk/JyArICcpPycgKyAnKFtePyNdKyk/JyArICcoPzpcXFxcPyhbXiNdKikpPycgKyAnKD86IyguKikpPycgKyAnJCcpO1xuICB2YXIgQ29tcG9uZW50SW5kZXggPSB7XG4gICAgU0NIRU1FOiAxLFxuICAgIFVTRVJfSU5GTzogMixcbiAgICBET01BSU46IDMsXG4gICAgUE9SVDogNCxcbiAgICBQQVRIOiA1LFxuICAgIFFVRVJZX0RBVEE6IDYsXG4gICAgRlJBR01FTlQ6IDdcbiAgfTtcbiAgZnVuY3Rpb24gc3BsaXQodXJpKSB7XG4gICAgcmV0dXJuICh1cmkubWF0Y2goc3BsaXRSZSkpO1xuICB9XG4gIGZ1bmN0aW9uIHJlbW92ZURvdFNlZ21lbnRzKHBhdGgpIHtcbiAgICBpZiAocGF0aCA9PT0gJy8nKVxuICAgICAgcmV0dXJuICcvJztcbiAgICB2YXIgbGVhZGluZ1NsYXNoID0gcGF0aFswXSA9PT0gJy8nID8gJy8nIDogJyc7XG4gICAgdmFyIHRyYWlsaW5nU2xhc2ggPSBwYXRoLnNsaWNlKC0xKSA9PT0gJy8nID8gJy8nIDogJyc7XG4gICAgdmFyIHNlZ21lbnRzID0gcGF0aC5zcGxpdCgnLycpO1xuICAgIHZhciBvdXQgPSBbXTtcbiAgICB2YXIgdXAgPSAwO1xuICAgIGZvciAodmFyIHBvcyA9IDA7IHBvcyA8IHNlZ21lbnRzLmxlbmd0aDsgcG9zKyspIHtcbiAgICAgIHZhciBzZWdtZW50ID0gc2VnbWVudHNbcG9zXTtcbiAgICAgIHN3aXRjaCAoc2VnbWVudCkge1xuICAgICAgICBjYXNlICcnOlxuICAgICAgICBjYXNlICcuJzpcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnLi4nOlxuICAgICAgICAgIGlmIChvdXQubGVuZ3RoKVxuICAgICAgICAgICAgb3V0LnBvcCgpO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHVwKys7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgb3V0LnB1c2goc2VnbWVudCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghbGVhZGluZ1NsYXNoKSB7XG4gICAgICB3aGlsZSAodXAtLSA+IDApIHtcbiAgICAgICAgb3V0LnVuc2hpZnQoJy4uJyk7XG4gICAgICB9XG4gICAgICBpZiAob3V0Lmxlbmd0aCA9PT0gMClcbiAgICAgICAgb3V0LnB1c2goJy4nKTtcbiAgICB9XG4gICAgcmV0dXJuIGxlYWRpbmdTbGFzaCArIG91dC5qb2luKCcvJykgKyB0cmFpbGluZ1NsYXNoO1xuICB9XG4gIGZ1bmN0aW9uIGpvaW5BbmRDYW5vbmljYWxpemVQYXRoKHBhcnRzKSB7XG4gICAgdmFyIHBhdGggPSBwYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXSB8fCAnJztcbiAgICBwYXRoID0gcmVtb3ZlRG90U2VnbWVudHMocGF0aCk7XG4gICAgcGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF0gPSBwYXRoO1xuICAgIHJldHVybiBidWlsZEZyb21FbmNvZGVkUGFydHMocGFydHNbQ29tcG9uZW50SW5kZXguU0NIRU1FXSwgcGFydHNbQ29tcG9uZW50SW5kZXguVVNFUl9JTkZPXSwgcGFydHNbQ29tcG9uZW50SW5kZXguRE9NQUlOXSwgcGFydHNbQ29tcG9uZW50SW5kZXguUE9SVF0sIHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdLCBwYXJ0c1tDb21wb25lbnRJbmRleC5RVUVSWV9EQVRBXSwgcGFydHNbQ29tcG9uZW50SW5kZXguRlJBR01FTlRdKTtcbiAgfVxuICBmdW5jdGlvbiBjYW5vbmljYWxpemVVcmwodXJsKSB7XG4gICAgdmFyIHBhcnRzID0gc3BsaXQodXJsKTtcbiAgICByZXR1cm4gam9pbkFuZENhbm9uaWNhbGl6ZVBhdGgocGFydHMpO1xuICB9XG4gIGZ1bmN0aW9uIHJlc29sdmVVcmwoYmFzZSwgdXJsKSB7XG4gICAgdmFyIHBhcnRzID0gc3BsaXQodXJsKTtcbiAgICB2YXIgYmFzZVBhcnRzID0gc3BsaXQoYmFzZSk7XG4gICAgaWYgKHBhcnRzW0NvbXBvbmVudEluZGV4LlNDSEVNRV0pIHtcbiAgICAgIHJldHVybiBqb2luQW5kQ2Fub25pY2FsaXplUGF0aChwYXJ0cyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcnRzW0NvbXBvbmVudEluZGV4LlNDSEVNRV0gPSBiYXNlUGFydHNbQ29tcG9uZW50SW5kZXguU0NIRU1FXTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IENvbXBvbmVudEluZGV4LlNDSEVNRTsgaSA8PSBDb21wb25lbnRJbmRleC5QT1JUOyBpKyspIHtcbiAgICAgIGlmICghcGFydHNbaV0pIHtcbiAgICAgICAgcGFydHNbaV0gPSBiYXNlUGFydHNbaV07XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChwYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXVswXSA9PSAnLycpIHtcbiAgICAgIHJldHVybiBqb2luQW5kQ2Fub25pY2FsaXplUGF0aChwYXJ0cyk7XG4gICAgfVxuICAgIHZhciBwYXRoID0gYmFzZVBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdO1xuICAgIHZhciBpbmRleCA9IHBhdGgubGFzdEluZGV4T2YoJy8nKTtcbiAgICBwYXRoID0gcGF0aC5zbGljZSgwLCBpbmRleCArIDEpICsgcGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF07XG4gICAgcGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF0gPSBwYXRoO1xuICAgIHJldHVybiBqb2luQW5kQ2Fub25pY2FsaXplUGF0aChwYXJ0cyk7XG4gIH1cbiAgZnVuY3Rpb24gaXNBYnNvbHV0ZShuYW1lKSB7XG4gICAgaWYgKCFuYW1lKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChuYW1lWzBdID09PSAnLycpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB2YXIgcGFydHMgPSBzcGxpdChuYW1lKTtcbiAgICBpZiAocGFydHNbQ29tcG9uZW50SW5kZXguU0NIRU1FXSlcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAkdHJhY2V1clJ1bnRpbWUuY2Fub25pY2FsaXplVXJsID0gY2Fub25pY2FsaXplVXJsO1xuICAkdHJhY2V1clJ1bnRpbWUuaXNBYnNvbHV0ZSA9IGlzQWJzb2x1dGU7XG4gICR0cmFjZXVyUnVudGltZS5yZW1vdmVEb3RTZWdtZW50cyA9IHJlbW92ZURvdFNlZ21lbnRzO1xuICAkdHJhY2V1clJ1bnRpbWUucmVzb2x2ZVVybCA9IHJlc29sdmVVcmw7XG59KSgpO1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciB0eXBlcyA9IHtcbiAgICBhbnk6IHtuYW1lOiAnYW55J30sXG4gICAgYm9vbGVhbjoge25hbWU6ICdib29sZWFuJ30sXG4gICAgbnVtYmVyOiB7bmFtZTogJ251bWJlcid9LFxuICAgIHN0cmluZzoge25hbWU6ICdzdHJpbmcnfSxcbiAgICBzeW1ib2w6IHtuYW1lOiAnc3ltYm9sJ30sXG4gICAgdm9pZDoge25hbWU6ICd2b2lkJ31cbiAgfTtcbiAgdmFyIEdlbmVyaWNUeXBlID0gZnVuY3Rpb24gR2VuZXJpY1R5cGUodHlwZSwgYXJndW1lbnRUeXBlcykge1xuICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgdGhpcy5hcmd1bWVudFR5cGVzID0gYXJndW1lbnRUeXBlcztcbiAgfTtcbiAgKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoR2VuZXJpY1R5cGUsIHt9LCB7fSk7XG4gIHZhciB0eXBlUmVnaXN0ZXIgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICBmdW5jdGlvbiBnZW5lcmljVHlwZSh0eXBlKSB7XG4gICAgZm9yICh2YXIgYXJndW1lbnRUeXBlcyA9IFtdLFxuICAgICAgICAkX18xID0gMTsgJF9fMSA8IGFyZ3VtZW50cy5sZW5ndGg7ICRfXzErKylcbiAgICAgIGFyZ3VtZW50VHlwZXNbJF9fMSAtIDFdID0gYXJndW1lbnRzWyRfXzFdO1xuICAgIHZhciB0eXBlTWFwID0gdHlwZVJlZ2lzdGVyO1xuICAgIHZhciBrZXkgPSAkdHJhY2V1clJ1bnRpbWUuZ2V0T3duSGFzaE9iamVjdCh0eXBlKS5oYXNoO1xuICAgIGlmICghdHlwZU1hcFtrZXldKSB7XG4gICAgICB0eXBlTWFwW2tleV0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIH1cbiAgICB0eXBlTWFwID0gdHlwZU1hcFtrZXldO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRUeXBlcy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgIGtleSA9ICR0cmFjZXVyUnVudGltZS5nZXRPd25IYXNoT2JqZWN0KGFyZ3VtZW50VHlwZXNbaV0pLmhhc2g7XG4gICAgICBpZiAoIXR5cGVNYXBba2V5XSkge1xuICAgICAgICB0eXBlTWFwW2tleV0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgfVxuICAgICAgdHlwZU1hcCA9IHR5cGVNYXBba2V5XTtcbiAgICB9XG4gICAgdmFyIHRhaWwgPSBhcmd1bWVudFR5cGVzW2FyZ3VtZW50VHlwZXMubGVuZ3RoIC0gMV07XG4gICAga2V5ID0gJHRyYWNldXJSdW50aW1lLmdldE93bkhhc2hPYmplY3QodGFpbCkuaGFzaDtcbiAgICBpZiAoIXR5cGVNYXBba2V5XSkge1xuICAgICAgdHlwZU1hcFtrZXldID0gbmV3IEdlbmVyaWNUeXBlKHR5cGUsIGFyZ3VtZW50VHlwZXMpO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZU1hcFtrZXldO1xuICB9XG4gICR0cmFjZXVyUnVudGltZS5HZW5lcmljVHlwZSA9IEdlbmVyaWNUeXBlO1xuICAkdHJhY2V1clJ1bnRpbWUuZ2VuZXJpY1R5cGUgPSBnZW5lcmljVHlwZTtcbiAgJHRyYWNldXJSdW50aW1lLnR5cGUgPSB0eXBlcztcbn0pKCk7XG4oZnVuY3Rpb24oZ2xvYmFsKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyICRfXzIgPSAkdHJhY2V1clJ1bnRpbWUsXG4gICAgICBjYW5vbmljYWxpemVVcmwgPSAkX18yLmNhbm9uaWNhbGl6ZVVybCxcbiAgICAgIHJlc29sdmVVcmwgPSAkX18yLnJlc29sdmVVcmwsXG4gICAgICBpc0Fic29sdXRlID0gJF9fMi5pc0Fic29sdXRlO1xuICB2YXIgbW9kdWxlSW5zdGFudGlhdG9ycyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIHZhciBiYXNlVVJMO1xuICBpZiAoZ2xvYmFsLmxvY2F0aW9uICYmIGdsb2JhbC5sb2NhdGlvbi5ocmVmKVxuICAgIGJhc2VVUkwgPSByZXNvbHZlVXJsKGdsb2JhbC5sb2NhdGlvbi5ocmVmLCAnLi8nKTtcbiAgZWxzZVxuICAgIGJhc2VVUkwgPSAnJztcbiAgdmFyIFVuY29hdGVkTW9kdWxlRW50cnkgPSBmdW5jdGlvbiBVbmNvYXRlZE1vZHVsZUVudHJ5KHVybCwgdW5jb2F0ZWRNb2R1bGUpIHtcbiAgICB0aGlzLnVybCA9IHVybDtcbiAgICB0aGlzLnZhbHVlXyA9IHVuY29hdGVkTW9kdWxlO1xuICB9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShVbmNvYXRlZE1vZHVsZUVudHJ5LCB7fSwge30pO1xuICB2YXIgTW9kdWxlRXZhbHVhdGlvbkVycm9yID0gZnVuY3Rpb24gTW9kdWxlRXZhbHVhdGlvbkVycm9yKGVycm9uZW91c01vZHVsZU5hbWUsIGNhdXNlKSB7XG4gICAgdGhpcy5tZXNzYWdlID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lICsgJzogJyArIHRoaXMuc3RyaXBDYXVzZShjYXVzZSkgKyAnIGluICcgKyBlcnJvbmVvdXNNb2R1bGVOYW1lO1xuICAgIGlmICghKGNhdXNlIGluc3RhbmNlb2YgJE1vZHVsZUV2YWx1YXRpb25FcnJvcikgJiYgY2F1c2Uuc3RhY2spXG4gICAgICB0aGlzLnN0YWNrID0gdGhpcy5zdHJpcFN0YWNrKGNhdXNlLnN0YWNrKTtcbiAgICBlbHNlXG4gICAgICB0aGlzLnN0YWNrID0gJyc7XG4gIH07XG4gIHZhciAkTW9kdWxlRXZhbHVhdGlvbkVycm9yID0gTW9kdWxlRXZhbHVhdGlvbkVycm9yO1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShNb2R1bGVFdmFsdWF0aW9uRXJyb3IsIHtcbiAgICBzdHJpcEVycm9yOiBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZS5yZXBsYWNlKC8uKkVycm9yOi8sIHRoaXMuY29uc3RydWN0b3IubmFtZSArICc6Jyk7XG4gICAgfSxcbiAgICBzdHJpcENhdXNlOiBmdW5jdGlvbihjYXVzZSkge1xuICAgICAgaWYgKCFjYXVzZSlcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgaWYgKCFjYXVzZS5tZXNzYWdlKVxuICAgICAgICByZXR1cm4gY2F1c2UgKyAnJztcbiAgICAgIHJldHVybiB0aGlzLnN0cmlwRXJyb3IoY2F1c2UubWVzc2FnZSk7XG4gICAgfSxcbiAgICBsb2FkZWRCeTogZnVuY3Rpb24obW9kdWxlTmFtZSkge1xuICAgICAgdGhpcy5zdGFjayArPSAnXFxuIGxvYWRlZCBieSAnICsgbW9kdWxlTmFtZTtcbiAgICB9LFxuICAgIHN0cmlwU3RhY2s6IGZ1bmN0aW9uKGNhdXNlU3RhY2spIHtcbiAgICAgIHZhciBzdGFjayA9IFtdO1xuICAgICAgY2F1c2VTdGFjay5zcGxpdCgnXFxuJykuc29tZSgoZnVuY3Rpb24oZnJhbWUpIHtcbiAgICAgICAgaWYgKC9VbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvci8udGVzdChmcmFtZSkpXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIHN0YWNrLnB1c2goZnJhbWUpO1xuICAgICAgfSkpO1xuICAgICAgc3RhY2tbMF0gPSB0aGlzLnN0cmlwRXJyb3Ioc3RhY2tbMF0pO1xuICAgICAgcmV0dXJuIHN0YWNrLmpvaW4oJ1xcbicpO1xuICAgIH1cbiAgfSwge30sIEVycm9yKTtcbiAgZnVuY3Rpb24gYmVmb3JlTGluZXMobGluZXMsIG51bWJlcikge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgZmlyc3QgPSBudW1iZXIgLSAzO1xuICAgIGlmIChmaXJzdCA8IDApXG4gICAgICBmaXJzdCA9IDA7XG4gICAgZm9yICh2YXIgaSA9IGZpcnN0OyBpIDwgbnVtYmVyOyBpKyspIHtcbiAgICAgIHJlc3VsdC5wdXNoKGxpbmVzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBmdW5jdGlvbiBhZnRlckxpbmVzKGxpbmVzLCBudW1iZXIpIHtcbiAgICB2YXIgbGFzdCA9IG51bWJlciArIDE7XG4gICAgaWYgKGxhc3QgPiBsaW5lcy5sZW5ndGggLSAxKVxuICAgICAgbGFzdCA9IGxpbmVzLmxlbmd0aCAtIDE7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSBudW1iZXI7IGkgPD0gbGFzdDsgaSsrKSB7XG4gICAgICByZXN1bHQucHVzaChsaW5lc1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZnVuY3Rpb24gY29sdW1uU3BhY2luZyhjb2x1bW5zKSB7XG4gICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sdW1ucyAtIDE7IGkrKykge1xuICAgICAgcmVzdWx0ICs9ICctJztcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICB2YXIgVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IgPSBmdW5jdGlvbiBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcih1cmwsIGZ1bmMpIHtcbiAgICAkdHJhY2V1clJ1bnRpbWUuc3VwZXJDb25zdHJ1Y3RvcigkVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IpLmNhbGwodGhpcywgdXJsLCBudWxsKTtcbiAgICB0aGlzLmZ1bmMgPSBmdW5jO1xuICB9O1xuICB2YXIgJFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yID0gVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3I7XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yLCB7Z2V0VW5jb2F0ZWRNb2R1bGU6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMudmFsdWVfKVxuICAgICAgICByZXR1cm4gdGhpcy52YWx1ZV87XG4gICAgICB0cnkge1xuICAgICAgICB2YXIgcmVsYXRpdmVSZXF1aXJlO1xuICAgICAgICBpZiAodHlwZW9mICR0cmFjZXVyUnVudGltZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmVsYXRpdmVSZXF1aXJlID0gJHRyYWNldXJSdW50aW1lLnJlcXVpcmUuYmluZChudWxsLCB0aGlzLnVybCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVfID0gdGhpcy5mdW5jLmNhbGwoZ2xvYmFsLCByZWxhdGl2ZVJlcXVpcmUpO1xuICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgaWYgKGV4IGluc3RhbmNlb2YgTW9kdWxlRXZhbHVhdGlvbkVycm9yKSB7XG4gICAgICAgICAgZXgubG9hZGVkQnkodGhpcy51cmwpO1xuICAgICAgICAgIHRocm93IGV4O1xuICAgICAgICB9XG4gICAgICAgIGlmIChleC5zdGFjaykge1xuICAgICAgICAgIHZhciBsaW5lcyA9IHRoaXMuZnVuYy50b1N0cmluZygpLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgICB2YXIgZXZhbGVkID0gW107XG4gICAgICAgICAgZXguc3RhY2suc3BsaXQoJ1xcbicpLnNvbWUoZnVuY3Rpb24oZnJhbWUpIHtcbiAgICAgICAgICAgIGlmIChmcmFtZS5pbmRleE9mKCdVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvci5nZXRVbmNvYXRlZE1vZHVsZScpID4gMClcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB2YXIgbSA9IC8oYXRcXHNbXlxcc10qXFxzKS4qPjooXFxkKik6KFxcZCopXFwpLy5leGVjKGZyYW1lKTtcbiAgICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAgIHZhciBsaW5lID0gcGFyc2VJbnQobVsyXSwgMTApO1xuICAgICAgICAgICAgICBldmFsZWQgPSBldmFsZWQuY29uY2F0KGJlZm9yZUxpbmVzKGxpbmVzLCBsaW5lKSk7XG4gICAgICAgICAgICAgIGV2YWxlZC5wdXNoKGNvbHVtblNwYWNpbmcobVszXSkgKyAnXicpO1xuICAgICAgICAgICAgICBldmFsZWQgPSBldmFsZWQuY29uY2F0KGFmdGVyTGluZXMobGluZXMsIGxpbmUpKTtcbiAgICAgICAgICAgICAgZXZhbGVkLnB1c2goJz0gPSA9ID0gPSA9ID0gPSA9Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBldmFsZWQucHVzaChmcmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgZXguc3RhY2sgPSBldmFsZWQuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IE1vZHVsZUV2YWx1YXRpb25FcnJvcih0aGlzLnVybCwgZXgpO1xuICAgICAgfVxuICAgIH19LCB7fSwgVW5jb2F0ZWRNb2R1bGVFbnRyeSk7XG4gIGZ1bmN0aW9uIGdldFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yKG5hbWUpIHtcbiAgICBpZiAoIW5hbWUpXG4gICAgICByZXR1cm47XG4gICAgdmFyIHVybCA9IE1vZHVsZVN0b3JlLm5vcm1hbGl6ZShuYW1lKTtcbiAgICByZXR1cm4gbW9kdWxlSW5zdGFudGlhdG9yc1t1cmxdO1xuICB9XG4gIDtcbiAgdmFyIG1vZHVsZUluc3RhbmNlcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIHZhciBsaXZlTW9kdWxlU2VudGluZWwgPSB7fTtcbiAgZnVuY3Rpb24gTW9kdWxlKHVuY29hdGVkTW9kdWxlKSB7XG4gICAgdmFyIGlzTGl2ZSA9IGFyZ3VtZW50c1sxXTtcbiAgICB2YXIgY29hdGVkTW9kdWxlID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh1bmNvYXRlZE1vZHVsZSkuZm9yRWFjaCgoZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGdldHRlcixcbiAgICAgICAgICB2YWx1ZTtcbiAgICAgIGlmIChpc0xpdmUgPT09IGxpdmVNb2R1bGVTZW50aW5lbCkge1xuICAgICAgICB2YXIgZGVzY3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHVuY29hdGVkTW9kdWxlLCBuYW1lKTtcbiAgICAgICAgaWYgKGRlc2NyLmdldClcbiAgICAgICAgICBnZXR0ZXIgPSBkZXNjci5nZXQ7XG4gICAgICB9XG4gICAgICBpZiAoIWdldHRlcikge1xuICAgICAgICB2YWx1ZSA9IHVuY29hdGVkTW9kdWxlW25hbWVdO1xuICAgICAgICBnZXR0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29hdGVkTW9kdWxlLCBuYW1lLCB7XG4gICAgICAgIGdldDogZ2V0dGVyLFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXG4gICAgICB9KTtcbiAgICB9KSk7XG4gICAgT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKGNvYXRlZE1vZHVsZSk7XG4gICAgcmV0dXJuIGNvYXRlZE1vZHVsZTtcbiAgfVxuICB2YXIgTW9kdWxlU3RvcmUgPSB7XG4gICAgbm9ybWFsaXplOiBmdW5jdGlvbihuYW1lLCByZWZlcmVyTmFtZSwgcmVmZXJlckFkZHJlc3MpIHtcbiAgICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ21vZHVsZSBuYW1lIG11c3QgYmUgYSBzdHJpbmcsIG5vdCAnICsgdHlwZW9mIG5hbWUpO1xuICAgICAgaWYgKGlzQWJzb2x1dGUobmFtZSkpXG4gICAgICAgIHJldHVybiBjYW5vbmljYWxpemVVcmwobmFtZSk7XG4gICAgICBpZiAoL1teXFwuXVxcL1xcLlxcLlxcLy8udGVzdChuYW1lKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ21vZHVsZSBuYW1lIGVtYmVkcyAvLi4vOiAnICsgbmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAobmFtZVswXSA9PT0gJy4nICYmIHJlZmVyZXJOYW1lKVxuICAgICAgICByZXR1cm4gcmVzb2x2ZVVybChyZWZlcmVyTmFtZSwgbmFtZSk7XG4gICAgICByZXR1cm4gY2Fub25pY2FsaXplVXJsKG5hbWUpO1xuICAgIH0sXG4gICAgZ2V0OiBmdW5jdGlvbihub3JtYWxpemVkTmFtZSkge1xuICAgICAgdmFyIG0gPSBnZXRVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihub3JtYWxpemVkTmFtZSk7XG4gICAgICBpZiAoIW0pXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB2YXIgbW9kdWxlSW5zdGFuY2UgPSBtb2R1bGVJbnN0YW5jZXNbbS51cmxdO1xuICAgICAgaWYgKG1vZHVsZUluc3RhbmNlKVxuICAgICAgICByZXR1cm4gbW9kdWxlSW5zdGFuY2U7XG4gICAgICBtb2R1bGVJbnN0YW5jZSA9IE1vZHVsZShtLmdldFVuY29hdGVkTW9kdWxlKCksIGxpdmVNb2R1bGVTZW50aW5lbCk7XG4gICAgICByZXR1cm4gbW9kdWxlSW5zdGFuY2VzW20udXJsXSA9IG1vZHVsZUluc3RhbmNlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihub3JtYWxpemVkTmFtZSwgbW9kdWxlKSB7XG4gICAgICBub3JtYWxpemVkTmFtZSA9IFN0cmluZyhub3JtYWxpemVkTmFtZSk7XG4gICAgICBtb2R1bGVJbnN0YW50aWF0b3JzW25vcm1hbGl6ZWROYW1lXSA9IG5ldyBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihub3JtYWxpemVkTmFtZSwgKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbW9kdWxlO1xuICAgICAgfSkpO1xuICAgICAgbW9kdWxlSW5zdGFuY2VzW25vcm1hbGl6ZWROYW1lXSA9IG1vZHVsZTtcbiAgICB9LFxuICAgIGdldCBiYXNlVVJMKCkge1xuICAgICAgcmV0dXJuIGJhc2VVUkw7XG4gICAgfSxcbiAgICBzZXQgYmFzZVVSTCh2KSB7XG4gICAgICBiYXNlVVJMID0gU3RyaW5nKHYpO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJNb2R1bGU6IGZ1bmN0aW9uKG5hbWUsIGRlcHMsIGZ1bmMpIHtcbiAgICAgIHZhciBub3JtYWxpemVkTmFtZSA9IE1vZHVsZVN0b3JlLm5vcm1hbGl6ZShuYW1lKTtcbiAgICAgIGlmIChtb2R1bGVJbnN0YW50aWF0b3JzW25vcm1hbGl6ZWROYW1lXSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdkdXBsaWNhdGUgbW9kdWxlIG5hbWVkICcgKyBub3JtYWxpemVkTmFtZSk7XG4gICAgICBtb2R1bGVJbnN0YW50aWF0b3JzW25vcm1hbGl6ZWROYW1lXSA9IG5ldyBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihub3JtYWxpemVkTmFtZSwgZnVuYyk7XG4gICAgfSxcbiAgICBidW5kbGVTdG9yZTogT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICByZWdpc3RlcjogZnVuY3Rpb24obmFtZSwgZGVwcywgZnVuYykge1xuICAgICAgaWYgKCFkZXBzIHx8ICFkZXBzLmxlbmd0aCAmJiAhZnVuYy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5yZWdpc3Rlck1vZHVsZShuYW1lLCBkZXBzLCBmdW5jKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYnVuZGxlU3RvcmVbbmFtZV0gPSB7XG4gICAgICAgICAgZGVwczogZGVwcyxcbiAgICAgICAgICBleGVjdXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciAkX18wID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgdmFyIGRlcE1hcCA9IHt9O1xuICAgICAgICAgICAgZGVwcy5mb3JFYWNoKChmdW5jdGlvbihkZXAsIGluZGV4KSB7XG4gICAgICAgICAgICAgIHJldHVybiBkZXBNYXBbZGVwXSA9ICRfXzBbaW5kZXhdO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgdmFyIHJlZ2lzdHJ5RW50cnkgPSBmdW5jLmNhbGwodGhpcywgZGVwTWFwKTtcbiAgICAgICAgICAgIHJlZ2lzdHJ5RW50cnkuZXhlY3V0ZS5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlZ2lzdHJ5RW50cnkuZXhwb3J0cztcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSxcbiAgICBnZXRBbm9ueW1vdXNNb2R1bGU6IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgIHJldHVybiBuZXcgTW9kdWxlKGZ1bmMuY2FsbChnbG9iYWwpLCBsaXZlTW9kdWxlU2VudGluZWwpO1xuICAgIH0sXG4gICAgZ2V0Rm9yVGVzdGluZzogZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyICRfXzAgPSB0aGlzO1xuICAgICAgaWYgKCF0aGlzLnRlc3RpbmdQcmVmaXhfKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKG1vZHVsZUluc3RhbmNlcykuc29tZSgoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgdmFyIG0gPSAvKHRyYWNldXJAW15cXC9dKlxcLykvLmV4ZWMoa2V5KTtcbiAgICAgICAgICBpZiAobSkge1xuICAgICAgICAgICAgJF9fMC50ZXN0aW5nUHJlZml4XyA9IG1bMV07XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmdldCh0aGlzLnRlc3RpbmdQcmVmaXhfICsgbmFtZSk7XG4gICAgfVxuICB9O1xuICB2YXIgbW9kdWxlU3RvcmVNb2R1bGUgPSBuZXcgTW9kdWxlKHtNb2R1bGVTdG9yZTogTW9kdWxlU3RvcmV9KTtcbiAgTW9kdWxlU3RvcmUuc2V0KCdAdHJhY2V1ci9zcmMvcnVudGltZS9Nb2R1bGVTdG9yZScsIG1vZHVsZVN0b3JlTW9kdWxlKTtcbiAgTW9kdWxlU3RvcmUuc2V0KCdAdHJhY2V1ci9zcmMvcnVudGltZS9Nb2R1bGVTdG9yZS5qcycsIG1vZHVsZVN0b3JlTW9kdWxlKTtcbiAgdmFyIHNldHVwR2xvYmFscyA9ICR0cmFjZXVyUnVudGltZS5zZXR1cEdsb2JhbHM7XG4gICR0cmFjZXVyUnVudGltZS5zZXR1cEdsb2JhbHMgPSBmdW5jdGlvbihnbG9iYWwpIHtcbiAgICBzZXR1cEdsb2JhbHMoZ2xvYmFsKTtcbiAgfTtcbiAgJHRyYWNldXJSdW50aW1lLk1vZHVsZVN0b3JlID0gTW9kdWxlU3RvcmU7XG4gIGdsb2JhbC5TeXN0ZW0gPSB7XG4gICAgcmVnaXN0ZXI6IE1vZHVsZVN0b3JlLnJlZ2lzdGVyLmJpbmQoTW9kdWxlU3RvcmUpLFxuICAgIHJlZ2lzdGVyTW9kdWxlOiBNb2R1bGVTdG9yZS5yZWdpc3Rlck1vZHVsZS5iaW5kKE1vZHVsZVN0b3JlKSxcbiAgICBnZXQ6IE1vZHVsZVN0b3JlLmdldCxcbiAgICBzZXQ6IE1vZHVsZVN0b3JlLnNldCxcbiAgICBub3JtYWxpemU6IE1vZHVsZVN0b3JlLm5vcm1hbGl6ZVxuICB9O1xuICAkdHJhY2V1clJ1bnRpbWUuZ2V0TW9kdWxlSW1wbCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgaW5zdGFudGlhdG9yID0gZ2V0VW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IobmFtZSk7XG4gICAgcmV0dXJuIGluc3RhbnRpYXRvciAmJiBpbnN0YW50aWF0b3IuZ2V0VW5jb2F0ZWRNb2R1bGUoKTtcbiAgfTtcbn0pKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDogdGhpcyk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiO1xuICB2YXIgJGNlaWwgPSBNYXRoLmNlaWw7XG4gIHZhciAkZmxvb3IgPSBNYXRoLmZsb29yO1xuICB2YXIgJGlzRmluaXRlID0gaXNGaW5pdGU7XG4gIHZhciAkaXNOYU4gPSBpc05hTjtcbiAgdmFyICRwb3cgPSBNYXRoLnBvdztcbiAgdmFyICRtaW4gPSBNYXRoLm1pbjtcbiAgdmFyIHRvT2JqZWN0ID0gJHRyYWNldXJSdW50aW1lLnRvT2JqZWN0O1xuICBmdW5jdGlvbiB0b1VpbnQzMih4KSB7XG4gICAgcmV0dXJuIHggPj4+IDA7XG4gIH1cbiAgZnVuY3Rpb24gaXNPYmplY3QoeCkge1xuICAgIHJldHVybiB4ICYmICh0eXBlb2YgeCA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHggPT09ICdmdW5jdGlvbicpO1xuICB9XG4gIGZ1bmN0aW9uIGlzQ2FsbGFibGUoeCkge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbiAgfVxuICBmdW5jdGlvbiBpc051bWJlcih4KSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnbnVtYmVyJztcbiAgfVxuICBmdW5jdGlvbiB0b0ludGVnZXIoeCkge1xuICAgIHggPSAreDtcbiAgICBpZiAoJGlzTmFOKHgpKVxuICAgICAgcmV0dXJuIDA7XG4gICAgaWYgKHggPT09IDAgfHwgISRpc0Zpbml0ZSh4KSlcbiAgICAgIHJldHVybiB4O1xuICAgIHJldHVybiB4ID4gMCA/ICRmbG9vcih4KSA6ICRjZWlsKHgpO1xuICB9XG4gIHZhciBNQVhfU0FGRV9MRU5HVEggPSAkcG93KDIsIDUzKSAtIDE7XG4gIGZ1bmN0aW9uIHRvTGVuZ3RoKHgpIHtcbiAgICB2YXIgbGVuID0gdG9JbnRlZ2VyKHgpO1xuICAgIHJldHVybiBsZW4gPCAwID8gMCA6ICRtaW4obGVuLCBNQVhfU0FGRV9MRU5HVEgpO1xuICB9XG4gIGZ1bmN0aW9uIGNoZWNrSXRlcmFibGUoeCkge1xuICAgIHJldHVybiAhaXNPYmplY3QoeCkgPyB1bmRlZmluZWQgOiB4W1N5bWJvbC5pdGVyYXRvcl07XG4gIH1cbiAgZnVuY3Rpb24gaXNDb25zdHJ1Y3Rvcih4KSB7XG4gICAgcmV0dXJuIGlzQ2FsbGFibGUoeCk7XG4gIH1cbiAgZnVuY3Rpb24gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QodmFsdWUsIGRvbmUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgZG9uZTogZG9uZVxuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVEZWZpbmUob2JqZWN0LCBuYW1lLCBkZXNjcikge1xuICAgIGlmICghKG5hbWUgaW4gb2JqZWN0KSkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwgZGVzY3IpO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBtYXliZURlZmluZU1ldGhvZChvYmplY3QsIG5hbWUsIHZhbHVlKSB7XG4gICAgbWF5YmVEZWZpbmUob2JqZWN0LCBuYW1lLCB7XG4gICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVEZWZpbmVDb25zdChvYmplY3QsIG5hbWUsIHZhbHVlKSB7XG4gICAgbWF5YmVEZWZpbmUob2JqZWN0LCBuYW1lLCB7XG4gICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2VcbiAgICB9KTtcbiAgfVxuICBmdW5jdGlvbiBtYXliZUFkZEZ1bmN0aW9ucyhvYmplY3QsIGZ1bmN0aW9ucykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZnVuY3Rpb25zLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICB2YXIgbmFtZSA9IGZ1bmN0aW9uc1tpXTtcbiAgICAgIHZhciB2YWx1ZSA9IGZ1bmN0aW9uc1tpICsgMV07XG4gICAgICBtYXliZURlZmluZU1ldGhvZChvYmplY3QsIG5hbWUsIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVBZGRDb25zdHMob2JqZWN0LCBjb25zdHMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbnN0cy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgdmFyIG5hbWUgPSBjb25zdHNbaV07XG4gICAgICB2YXIgdmFsdWUgPSBjb25zdHNbaSArIDFdO1xuICAgICAgbWF5YmVEZWZpbmVDb25zdChvYmplY3QsIG5hbWUsIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVBZGRJdGVyYXRvcihvYmplY3QsIGZ1bmMsIFN5bWJvbCkge1xuICAgIGlmICghU3ltYm9sIHx8ICFTeW1ib2wuaXRlcmF0b3IgfHwgb2JqZWN0W1N5bWJvbC5pdGVyYXRvcl0pXG4gICAgICByZXR1cm47XG4gICAgaWYgKG9iamVjdFsnQEBpdGVyYXRvciddKVxuICAgICAgZnVuYyA9IG9iamVjdFsnQEBpdGVyYXRvciddO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFN5bWJvbC5pdGVyYXRvciwge1xuICAgICAgdmFsdWU6IGZ1bmMsXG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gIH1cbiAgdmFyIHBvbHlmaWxscyA9IFtdO1xuICBmdW5jdGlvbiByZWdpc3RlclBvbHlmaWxsKGZ1bmMpIHtcbiAgICBwb2x5ZmlsbHMucHVzaChmdW5jKTtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbEFsbChnbG9iYWwpIHtcbiAgICBwb2x5ZmlsbHMuZm9yRWFjaCgoZnVuY3Rpb24oZikge1xuICAgICAgcmV0dXJuIGYoZ2xvYmFsKTtcbiAgICB9KSk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBnZXQgdG9PYmplY3QoKSB7XG4gICAgICByZXR1cm4gdG9PYmplY3Q7XG4gICAgfSxcbiAgICBnZXQgdG9VaW50MzIoKSB7XG4gICAgICByZXR1cm4gdG9VaW50MzI7XG4gICAgfSxcbiAgICBnZXQgaXNPYmplY3QoKSB7XG4gICAgICByZXR1cm4gaXNPYmplY3Q7XG4gICAgfSxcbiAgICBnZXQgaXNDYWxsYWJsZSgpIHtcbiAgICAgIHJldHVybiBpc0NhbGxhYmxlO1xuICAgIH0sXG4gICAgZ2V0IGlzTnVtYmVyKCkge1xuICAgICAgcmV0dXJuIGlzTnVtYmVyO1xuICAgIH0sXG4gICAgZ2V0IHRvSW50ZWdlcigpIHtcbiAgICAgIHJldHVybiB0b0ludGVnZXI7XG4gICAgfSxcbiAgICBnZXQgdG9MZW5ndGgoKSB7XG4gICAgICByZXR1cm4gdG9MZW5ndGg7XG4gICAgfSxcbiAgICBnZXQgY2hlY2tJdGVyYWJsZSgpIHtcbiAgICAgIHJldHVybiBjaGVja0l0ZXJhYmxlO1xuICAgIH0sXG4gICAgZ2V0IGlzQ29uc3RydWN0b3IoKSB7XG4gICAgICByZXR1cm4gaXNDb25zdHJ1Y3RvcjtcbiAgICB9LFxuICAgIGdldCBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdCgpIHtcbiAgICAgIHJldHVybiBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdDtcbiAgICB9LFxuICAgIGdldCBtYXliZURlZmluZSgpIHtcbiAgICAgIHJldHVybiBtYXliZURlZmluZTtcbiAgICB9LFxuICAgIGdldCBtYXliZURlZmluZU1ldGhvZCgpIHtcbiAgICAgIHJldHVybiBtYXliZURlZmluZU1ldGhvZDtcbiAgICB9LFxuICAgIGdldCBtYXliZURlZmluZUNvbnN0KCkge1xuICAgICAgcmV0dXJuIG1heWJlRGVmaW5lQ29uc3Q7XG4gICAgfSxcbiAgICBnZXQgbWF5YmVBZGRGdW5jdGlvbnMoKSB7XG4gICAgICByZXR1cm4gbWF5YmVBZGRGdW5jdGlvbnM7XG4gICAgfSxcbiAgICBnZXQgbWF5YmVBZGRDb25zdHMoKSB7XG4gICAgICByZXR1cm4gbWF5YmVBZGRDb25zdHM7XG4gICAgfSxcbiAgICBnZXQgbWF5YmVBZGRJdGVyYXRvcigpIHtcbiAgICAgIHJldHVybiBtYXliZUFkZEl0ZXJhdG9yO1xuICAgIH0sXG4gICAgZ2V0IHJlZ2lzdGVyUG9seWZpbGwoKSB7XG4gICAgICByZXR1cm4gcmVnaXN0ZXJQb2x5ZmlsbDtcbiAgICB9LFxuICAgIGdldCBwb2x5ZmlsbEFsbCgpIHtcbiAgICAgIHJldHVybiBwb2x5ZmlsbEFsbDtcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL01hcC5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9NYXAuanNcIjtcbiAgdmFyICRfXzAgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiksXG4gICAgICBpc09iamVjdCA9ICRfXzAuaXNPYmplY3QsXG4gICAgICBtYXliZUFkZEl0ZXJhdG9yID0gJF9fMC5tYXliZUFkZEl0ZXJhdG9yLFxuICAgICAgcmVnaXN0ZXJQb2x5ZmlsbCA9ICRfXzAucmVnaXN0ZXJQb2x5ZmlsbDtcbiAgdmFyIGdldE93bkhhc2hPYmplY3QgPSAkdHJhY2V1clJ1bnRpbWUuZ2V0T3duSGFzaE9iamVjdDtcbiAgdmFyICRoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG4gIHZhciBkZWxldGVkU2VudGluZWwgPSB7fTtcbiAgZnVuY3Rpb24gbG9va3VwSW5kZXgobWFwLCBrZXkpIHtcbiAgICBpZiAoaXNPYmplY3Qoa2V5KSkge1xuICAgICAgdmFyIGhhc2hPYmplY3QgPSBnZXRPd25IYXNoT2JqZWN0KGtleSk7XG4gICAgICByZXR1cm4gaGFzaE9iamVjdCAmJiBtYXAub2JqZWN0SW5kZXhfW2hhc2hPYmplY3QuaGFzaF07XG4gICAgfVxuICAgIGlmICh0eXBlb2Yga2V5ID09PSAnc3RyaW5nJylcbiAgICAgIHJldHVybiBtYXAuc3RyaW5nSW5kZXhfW2tleV07XG4gICAgcmV0dXJuIG1hcC5wcmltaXRpdmVJbmRleF9ba2V5XTtcbiAgfVxuICBmdW5jdGlvbiBpbml0TWFwKG1hcCkge1xuICAgIG1hcC5lbnRyaWVzXyA9IFtdO1xuICAgIG1hcC5vYmplY3RJbmRleF8gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIG1hcC5zdHJpbmdJbmRleF8gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIG1hcC5wcmltaXRpdmVJbmRleF8gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIG1hcC5kZWxldGVkQ291bnRfID0gMDtcbiAgfVxuICB2YXIgTWFwID0gZnVuY3Rpb24gTWFwKCkge1xuICAgIHZhciBpdGVyYWJsZSA9IGFyZ3VtZW50c1swXTtcbiAgICBpZiAoIWlzT2JqZWN0KHRoaXMpKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTWFwIGNhbGxlZCBvbiBpbmNvbXBhdGlibGUgdHlwZScpO1xuICAgIGlmICgkaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCAnZW50cmllc18nKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTWFwIGNhbiBub3QgYmUgcmVlbnRyYW50bHkgaW5pdGlhbGlzZWQnKTtcbiAgICB9XG4gICAgaW5pdE1hcCh0aGlzKTtcbiAgICBpZiAoaXRlcmFibGUgIT09IG51bGwgJiYgaXRlcmFibGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZm9yICh2YXIgJF9fMiA9IGl0ZXJhYmxlWyR0cmFjZXVyUnVudGltZS50b1Byb3BlcnR5KFN5bWJvbC5pdGVyYXRvcildKCksXG4gICAgICAgICAgJF9fMzsgISgkX18zID0gJF9fMi5uZXh0KCkpLmRvbmU7ICkge1xuICAgICAgICB2YXIgJF9fNCA9ICRfXzMudmFsdWUsXG4gICAgICAgICAgICBrZXkgPSAkX180WzBdLFxuICAgICAgICAgICAgdmFsdWUgPSAkX180WzFdO1xuICAgICAgICB7XG4gICAgICAgICAgdGhpcy5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKE1hcCwge1xuICAgIGdldCBzaXplKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZW50cmllc18ubGVuZ3RoIC8gMiAtIHRoaXMuZGVsZXRlZENvdW50XztcbiAgICB9LFxuICAgIGdldDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXIgaW5kZXggPSBsb29rdXBJbmRleCh0aGlzLCBrZXkpO1xuICAgICAgaWYgKGluZGV4ICE9PSB1bmRlZmluZWQpXG4gICAgICAgIHJldHVybiB0aGlzLmVudHJpZXNfW2luZGV4ICsgMV07XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgIHZhciBvYmplY3RNb2RlID0gaXNPYmplY3Qoa2V5KTtcbiAgICAgIHZhciBzdHJpbmdNb2RlID0gdHlwZW9mIGtleSA9PT0gJ3N0cmluZyc7XG4gICAgICB2YXIgaW5kZXggPSBsb29rdXBJbmRleCh0aGlzLCBrZXkpO1xuICAgICAgaWYgKGluZGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5lbnRyaWVzX1tpbmRleCArIDFdID0gdmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbmRleCA9IHRoaXMuZW50cmllc18ubGVuZ3RoO1xuICAgICAgICB0aGlzLmVudHJpZXNfW2luZGV4XSA9IGtleTtcbiAgICAgICAgdGhpcy5lbnRyaWVzX1tpbmRleCArIDFdID0gdmFsdWU7XG4gICAgICAgIGlmIChvYmplY3RNb2RlKSB7XG4gICAgICAgICAgdmFyIGhhc2hPYmplY3QgPSBnZXRPd25IYXNoT2JqZWN0KGtleSk7XG4gICAgICAgICAgdmFyIGhhc2ggPSBoYXNoT2JqZWN0Lmhhc2g7XG4gICAgICAgICAgdGhpcy5vYmplY3RJbmRleF9baGFzaF0gPSBpbmRleDtcbiAgICAgICAgfSBlbHNlIGlmIChzdHJpbmdNb2RlKSB7XG4gICAgICAgICAgdGhpcy5zdHJpbmdJbmRleF9ba2V5XSA9IGluZGV4O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMucHJpbWl0aXZlSW5kZXhfW2tleV0gPSBpbmRleDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBoYXM6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGxvb2t1cEluZGV4KHRoaXMsIGtleSkgIT09IHVuZGVmaW5lZDtcbiAgICB9LFxuICAgIGRlbGV0ZTogZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXIgb2JqZWN0TW9kZSA9IGlzT2JqZWN0KGtleSk7XG4gICAgICB2YXIgc3RyaW5nTW9kZSA9IHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnO1xuICAgICAgdmFyIGluZGV4O1xuICAgICAgdmFyIGhhc2g7XG4gICAgICBpZiAob2JqZWN0TW9kZSkge1xuICAgICAgICB2YXIgaGFzaE9iamVjdCA9IGdldE93bkhhc2hPYmplY3Qoa2V5KTtcbiAgICAgICAgaWYgKGhhc2hPYmplY3QpIHtcbiAgICAgICAgICBpbmRleCA9IHRoaXMub2JqZWN0SW5kZXhfW2hhc2ggPSBoYXNoT2JqZWN0Lmhhc2hdO1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLm9iamVjdEluZGV4X1toYXNoXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzdHJpbmdNb2RlKSB7XG4gICAgICAgIGluZGV4ID0gdGhpcy5zdHJpbmdJbmRleF9ba2V5XTtcbiAgICAgICAgZGVsZXRlIHRoaXMuc3RyaW5nSW5kZXhfW2tleV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbmRleCA9IHRoaXMucHJpbWl0aXZlSW5kZXhfW2tleV07XG4gICAgICAgIGRlbGV0ZSB0aGlzLnByaW1pdGl2ZUluZGV4X1trZXldO1xuICAgICAgfVxuICAgICAgaWYgKGluZGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5lbnRyaWVzX1tpbmRleF0gPSBkZWxldGVkU2VudGluZWw7XG4gICAgICAgIHRoaXMuZW50cmllc19baW5kZXggKyAxXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5kZWxldGVkQ291bnRfKys7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgICAgaW5pdE1hcCh0aGlzKTtcbiAgICB9LFxuICAgIGZvckVhY2g6IGZ1bmN0aW9uKGNhbGxiYWNrRm4pIHtcbiAgICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzFdO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmVudHJpZXNfLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgIHZhciBrZXkgPSB0aGlzLmVudHJpZXNfW2ldO1xuICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLmVudHJpZXNfW2kgKyAxXTtcbiAgICAgICAgaWYgKGtleSA9PT0gZGVsZXRlZFNlbnRpbmVsKVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICBjYWxsYmFja0ZuLmNhbGwodGhpc0FyZywgdmFsdWUsIGtleSwgdGhpcyk7XG4gICAgICB9XG4gICAgfSxcbiAgICBlbnRyaWVzOiAkdHJhY2V1clJ1bnRpbWUuaW5pdEdlbmVyYXRvckZ1bmN0aW9uKGZ1bmN0aW9uICRfXzUoKSB7XG4gICAgICB2YXIgaSxcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgdmFsdWU7XG4gICAgICByZXR1cm4gJHRyYWNldXJSdW50aW1lLmNyZWF0ZUdlbmVyYXRvckluc3RhbmNlKGZ1bmN0aW9uKCRjdHgpIHtcbiAgICAgICAgd2hpbGUgKHRydWUpXG4gICAgICAgICAgc3dpdGNoICgkY3R4LnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgIGkgPSAwO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxMjpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IChpIDwgdGhpcy5lbnRyaWVzXy5sZW5ndGgpID8gOCA6IC0yO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgICAgaSArPSAyO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAgICBrZXkgPSB0aGlzLmVudHJpZXNfW2ldO1xuICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMuZW50cmllc19baSArIDFdO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gOTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDk6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAoa2V5ID09PSBkZWxldGVkU2VudGluZWwpID8gNCA6IDY7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA2OlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMjtcbiAgICAgICAgICAgICAgcmV0dXJuIFtrZXksIHZhbHVlXTtcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgJGN0eC5tYXliZVRocm93KCk7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSA0O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHJldHVybiAkY3R4LmVuZCgpO1xuICAgICAgICAgIH1cbiAgICAgIH0sICRfXzUsIHRoaXMpO1xuICAgIH0pLFxuICAgIGtleXM6ICR0cmFjZXVyUnVudGltZS5pbml0R2VuZXJhdG9yRnVuY3Rpb24oZnVuY3Rpb24gJF9fNigpIHtcbiAgICAgIHZhciBpLFxuICAgICAgICAgIGtleSxcbiAgICAgICAgICB2YWx1ZTtcbiAgICAgIHJldHVybiAkdHJhY2V1clJ1bnRpbWUuY3JlYXRlR2VuZXJhdG9ySW5zdGFuY2UoZnVuY3Rpb24oJGN0eCkge1xuICAgICAgICB3aGlsZSAodHJ1ZSlcbiAgICAgICAgICBzd2l0Y2ggKCRjdHguc3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgaSA9IDA7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAxMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDEyOlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gKGkgPCB0aGlzLmVudHJpZXNfLmxlbmd0aCkgPyA4IDogLTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICBpICs9IDI7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAxMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgICAgIGtleSA9IHRoaXMuZW50cmllc19baV07XG4gICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5lbnRyaWVzX1tpICsgMV07XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSA5O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IChrZXkgPT09IGRlbGV0ZWRTZW50aW5lbCkgPyA0IDogNjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDY6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAyO1xuICAgICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAkY3R4Lm1heWJlVGhyb3coKTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDQ7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgcmV0dXJuICRjdHguZW5kKCk7XG4gICAgICAgICAgfVxuICAgICAgfSwgJF9fNiwgdGhpcyk7XG4gICAgfSksXG4gICAgdmFsdWVzOiAkdHJhY2V1clJ1bnRpbWUuaW5pdEdlbmVyYXRvckZ1bmN0aW9uKGZ1bmN0aW9uICRfXzcoKSB7XG4gICAgICB2YXIgaSxcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgdmFsdWU7XG4gICAgICByZXR1cm4gJHRyYWNldXJSdW50aW1lLmNyZWF0ZUdlbmVyYXRvckluc3RhbmNlKGZ1bmN0aW9uKCRjdHgpIHtcbiAgICAgICAgd2hpbGUgKHRydWUpXG4gICAgICAgICAgc3dpdGNoICgkY3R4LnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgIGkgPSAwO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxMjpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IChpIDwgdGhpcy5lbnRyaWVzXy5sZW5ndGgpID8gOCA6IC0yO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgICAgaSArPSAyO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAgICBrZXkgPSB0aGlzLmVudHJpZXNfW2ldO1xuICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMuZW50cmllc19baSArIDFdO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gOTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDk6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAoa2V5ID09PSBkZWxldGVkU2VudGluZWwpID8gNCA6IDY7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA2OlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMjtcbiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAkY3R4Lm1heWJlVGhyb3coKTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDQ7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgcmV0dXJuICRjdHguZW5kKCk7XG4gICAgICAgICAgfVxuICAgICAgfSwgJF9fNywgdGhpcyk7XG4gICAgfSlcbiAgfSwge30pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoTWFwLnByb3RvdHlwZSwgU3ltYm9sLml0ZXJhdG9yLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiBNYXAucHJvdG90eXBlLmVudHJpZXNcbiAgfSk7XG4gIGZ1bmN0aW9uIHBvbHlmaWxsTWFwKGdsb2JhbCkge1xuICAgIHZhciAkX180ID0gZ2xvYmFsLFxuICAgICAgICBPYmplY3QgPSAkX180Lk9iamVjdCxcbiAgICAgICAgU3ltYm9sID0gJF9fNC5TeW1ib2w7XG4gICAgaWYgKCFnbG9iYWwuTWFwKVxuICAgICAgZ2xvYmFsLk1hcCA9IE1hcDtcbiAgICB2YXIgbWFwUHJvdG90eXBlID0gZ2xvYmFsLk1hcC5wcm90b3R5cGU7XG4gICAgaWYgKG1hcFByb3RvdHlwZS5lbnRyaWVzID09PSB1bmRlZmluZWQpXG4gICAgICBnbG9iYWwuTWFwID0gTWFwO1xuICAgIGlmIChtYXBQcm90b3R5cGUuZW50cmllcykge1xuICAgICAgbWF5YmVBZGRJdGVyYXRvcihtYXBQcm90b3R5cGUsIG1hcFByb3RvdHlwZS5lbnRyaWVzLCBTeW1ib2wpO1xuICAgICAgbWF5YmVBZGRJdGVyYXRvcihPYmplY3QuZ2V0UHJvdG90eXBlT2YobmV3IGdsb2JhbC5NYXAoKS5lbnRyaWVzKCkpLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9LCBTeW1ib2wpO1xuICAgIH1cbiAgfVxuICByZWdpc3RlclBvbHlmaWxsKHBvbHlmaWxsTWFwKTtcbiAgcmV0dXJuIHtcbiAgICBnZXQgTWFwKCkge1xuICAgICAgcmV0dXJuIE1hcDtcbiAgICB9LFxuICAgIGdldCBwb2x5ZmlsbE1hcCgpIHtcbiAgICAgIHJldHVybiBwb2x5ZmlsbE1hcDtcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9NYXAuanNcIiArICcnKTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1NldC5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9TZXQuanNcIjtcbiAgdmFyICRfXzAgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiksXG4gICAgICBpc09iamVjdCA9ICRfXzAuaXNPYmplY3QsXG4gICAgICBtYXliZUFkZEl0ZXJhdG9yID0gJF9fMC5tYXliZUFkZEl0ZXJhdG9yLFxuICAgICAgcmVnaXN0ZXJQb2x5ZmlsbCA9ICRfXzAucmVnaXN0ZXJQb2x5ZmlsbDtcbiAgdmFyIE1hcCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9NYXAuanNcIikuTWFwO1xuICB2YXIgZ2V0T3duSGFzaE9iamVjdCA9ICR0cmFjZXVyUnVudGltZS5nZXRPd25IYXNoT2JqZWN0O1xuICB2YXIgJGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbiAgZnVuY3Rpb24gaW5pdFNldChzZXQpIHtcbiAgICBzZXQubWFwXyA9IG5ldyBNYXAoKTtcbiAgfVxuICB2YXIgU2V0ID0gZnVuY3Rpb24gU2V0KCkge1xuICAgIHZhciBpdGVyYWJsZSA9IGFyZ3VtZW50c1swXTtcbiAgICBpZiAoIWlzT2JqZWN0KHRoaXMpKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignU2V0IGNhbGxlZCBvbiBpbmNvbXBhdGlibGUgdHlwZScpO1xuICAgIGlmICgkaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCAnbWFwXycpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdTZXQgY2FuIG5vdCBiZSByZWVudHJhbnRseSBpbml0aWFsaXNlZCcpO1xuICAgIH1cbiAgICBpbml0U2V0KHRoaXMpO1xuICAgIGlmIChpdGVyYWJsZSAhPT0gbnVsbCAmJiBpdGVyYWJsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBmb3IgKHZhciAkX180ID0gaXRlcmFibGVbJHRyYWNldXJSdW50aW1lLnRvUHJvcGVydHkoU3ltYm9sLml0ZXJhdG9yKV0oKSxcbiAgICAgICAgICAkX181OyAhKCRfXzUgPSAkX180Lm5leHQoKSkuZG9uZTsgKSB7XG4gICAgICAgIHZhciBpdGVtID0gJF9fNS52YWx1ZTtcbiAgICAgICAge1xuICAgICAgICAgIHRoaXMuYWRkKGl0ZW0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShTZXQsIHtcbiAgICBnZXQgc2l6ZSgpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hcF8uc2l6ZTtcbiAgICB9LFxuICAgIGhhczogZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXBfLmhhcyhrZXkpO1xuICAgIH0sXG4gICAgYWRkOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHRoaXMubWFwXy5zZXQoa2V5LCBrZXkpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBkZWxldGU6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIHRoaXMubWFwXy5kZWxldGUoa2V5KTtcbiAgICB9LFxuICAgIGNsZWFyOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hcF8uY2xlYXIoKTtcbiAgICB9LFxuICAgIGZvckVhY2g6IGZ1bmN0aW9uKGNhbGxiYWNrRm4pIHtcbiAgICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzFdO1xuICAgICAgdmFyICRfXzIgPSB0aGlzO1xuICAgICAgcmV0dXJuIHRoaXMubWFwXy5mb3JFYWNoKChmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIGNhbGxiYWNrRm4uY2FsbCh0aGlzQXJnLCBrZXksIGtleSwgJF9fMik7XG4gICAgICB9KSk7XG4gICAgfSxcbiAgICB2YWx1ZXM6ICR0cmFjZXVyUnVudGltZS5pbml0R2VuZXJhdG9yRnVuY3Rpb24oZnVuY3Rpb24gJF9fNygpIHtcbiAgICAgIHZhciAkX184LFxuICAgICAgICAgICRfXzk7XG4gICAgICByZXR1cm4gJHRyYWNldXJSdW50aW1lLmNyZWF0ZUdlbmVyYXRvckluc3RhbmNlKGZ1bmN0aW9uKCRjdHgpIHtcbiAgICAgICAgd2hpbGUgKHRydWUpXG4gICAgICAgICAgc3dpdGNoICgkY3R4LnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICRfXzggPSB0aGlzLm1hcF8ua2V5cygpW1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgICAgICAgICAgICAgJGN0eC5zZW50ID0gdm9pZCAwO1xuICAgICAgICAgICAgICAkY3R4LmFjdGlvbiA9ICduZXh0JztcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTI6XG4gICAgICAgICAgICAgICRfXzkgPSAkX184WyRjdHguYWN0aW9uXSgkY3R4LnNlbnRJZ25vcmVUaHJvdyk7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSA5O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9ICgkX185LmRvbmUpID8gMyA6IDI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAkY3R4LnNlbnQgPSAkX185LnZhbHVlO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gLTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIHJldHVybiAkX185LnZhbHVlO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgcmV0dXJuICRjdHguZW5kKCk7XG4gICAgICAgICAgfVxuICAgICAgfSwgJF9fNywgdGhpcyk7XG4gICAgfSksXG4gICAgZW50cmllczogJHRyYWNldXJSdW50aW1lLmluaXRHZW5lcmF0b3JGdW5jdGlvbihmdW5jdGlvbiAkX18xMCgpIHtcbiAgICAgIHZhciAkX18xMSxcbiAgICAgICAgICAkX18xMjtcbiAgICAgIHJldHVybiAkdHJhY2V1clJ1bnRpbWUuY3JlYXRlR2VuZXJhdG9ySW5zdGFuY2UoZnVuY3Rpb24oJGN0eCkge1xuICAgICAgICB3aGlsZSAodHJ1ZSlcbiAgICAgICAgICBzd2l0Y2ggKCRjdHguc3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgJF9fMTEgPSB0aGlzLm1hcF8uZW50cmllcygpW1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgICAgICAgICAgICAgJGN0eC5zZW50ID0gdm9pZCAwO1xuICAgICAgICAgICAgICAkY3R4LmFjdGlvbiA9ICduZXh0JztcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTI6XG4gICAgICAgICAgICAgICRfXzEyID0gJF9fMTFbJGN0eC5hY3Rpb25dKCRjdHguc2VudElnbm9yZVRocm93KTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA5OlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gKCRfXzEyLmRvbmUpID8gMyA6IDI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAkY3R4LnNlbnQgPSAkX18xMi52YWx1ZTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IC0yO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICByZXR1cm4gJF9fMTIudmFsdWU7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICByZXR1cm4gJGN0eC5lbmQoKTtcbiAgICAgICAgICB9XG4gICAgICB9LCAkX18xMCwgdGhpcyk7XG4gICAgfSlcbiAgfSwge30pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoU2V0LnByb3RvdHlwZSwgU3ltYm9sLml0ZXJhdG9yLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiBTZXQucHJvdG90eXBlLnZhbHVlc1xuICB9KTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFNldC5wcm90b3R5cGUsICdrZXlzJywge1xuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICB2YWx1ZTogU2V0LnByb3RvdHlwZS52YWx1ZXNcbiAgfSk7XG4gIGZ1bmN0aW9uIHBvbHlmaWxsU2V0KGdsb2JhbCkge1xuICAgIHZhciAkX182ID0gZ2xvYmFsLFxuICAgICAgICBPYmplY3QgPSAkX182Lk9iamVjdCxcbiAgICAgICAgU3ltYm9sID0gJF9fNi5TeW1ib2w7XG4gICAgaWYgKCFnbG9iYWwuU2V0KVxuICAgICAgZ2xvYmFsLlNldCA9IFNldDtcbiAgICB2YXIgc2V0UHJvdG90eXBlID0gZ2xvYmFsLlNldC5wcm90b3R5cGU7XG4gICAgaWYgKHNldFByb3RvdHlwZS52YWx1ZXMpIHtcbiAgICAgIG1heWJlQWRkSXRlcmF0b3Ioc2V0UHJvdG90eXBlLCBzZXRQcm90b3R5cGUudmFsdWVzLCBTeW1ib2wpO1xuICAgICAgbWF5YmVBZGRJdGVyYXRvcihPYmplY3QuZ2V0UHJvdG90eXBlT2YobmV3IGdsb2JhbC5TZXQoKS52YWx1ZXMoKSksIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH0sIFN5bWJvbCk7XG4gICAgfVxuICB9XG4gIHJlZ2lzdGVyUG9seWZpbGwocG9seWZpbGxTZXQpO1xuICByZXR1cm4ge1xuICAgIGdldCBTZXQoKSB7XG4gICAgICByZXR1cm4gU2V0O1xuICAgIH0sXG4gICAgZ2V0IHBvbHlmaWxsU2V0KCkge1xuICAgICAgcmV0dXJuIHBvbHlmaWxsU2V0O1xuICAgIH1cbiAgfTtcbn0pO1xuU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1NldC5qc1wiICsgJycpO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9ub2RlX21vZHVsZXMvcnN2cC9saWIvcnN2cC9hc2FwLmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvbm9kZV9tb2R1bGVzL3JzdnAvbGliL3JzdnAvYXNhcC5qc1wiO1xuICB2YXIgbGVuID0gMDtcbiAgZnVuY3Rpb24gYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gICAgcXVldWVbbGVuXSA9IGNhbGxiYWNrO1xuICAgIHF1ZXVlW2xlbiArIDFdID0gYXJnO1xuICAgIGxlbiArPSAyO1xuICAgIGlmIChsZW4gPT09IDIpIHtcbiAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICB9XG4gIH1cbiAgdmFyICRfX2RlZmF1bHQgPSBhc2FwO1xuICB2YXIgYnJvd3Nlckdsb2JhbCA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgPyB3aW5kb3cgOiB7fTtcbiAgdmFyIEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID0gYnJvd3Nlckdsb2JhbC5NdXRhdGlvbk9ic2VydmVyIHx8IGJyb3dzZXJHbG9iYWwuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcbiAgdmFyIGlzV29ya2VyID0gdHlwZW9mIFVpbnQ4Q2xhbXBlZEFycmF5ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgaW1wb3J0U2NyaXB0cyAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIE1lc3NhZ2VDaGFubmVsICE9PSAndW5kZWZpbmVkJztcbiAgZnVuY3Rpb24gdXNlTmV4dFRpY2soKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcHJvY2Vzcy5uZXh0VGljayhmbHVzaCk7XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiB1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoZmx1c2gpO1xuICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgIG9ic2VydmVyLm9ic2VydmUobm9kZSwge2NoYXJhY3RlckRhdGE6IHRydWV9KTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBub2RlLmRhdGEgPSAoaXRlcmF0aW9ucyA9ICsraXRlcmF0aW9ucyAlIDIpO1xuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gdXNlTWVzc2FnZUNoYW5uZWwoKSB7XG4gICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZsdXNoO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiB1c2VTZXRUaW1lb3V0KCkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDEpO1xuICAgIH07XG4gIH1cbiAgdmFyIHF1ZXVlID0gbmV3IEFycmF5KDEwMDApO1xuICBmdW5jdGlvbiBmbHVzaCgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSAyKSB7XG4gICAgICB2YXIgY2FsbGJhY2sgPSBxdWV1ZVtpXTtcbiAgICAgIHZhciBhcmcgPSBxdWV1ZVtpICsgMV07XG4gICAgICBjYWxsYmFjayhhcmcpO1xuICAgICAgcXVldWVbaV0gPSB1bmRlZmluZWQ7XG4gICAgICBxdWV1ZVtpICsgMV0gPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGxlbiA9IDA7XG4gIH1cbiAgdmFyIHNjaGVkdWxlRmx1c2g7XG4gIGlmICh0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYge30udG9TdHJpbmcuY2FsbChwcm9jZXNzKSA9PT0gJ1tvYmplY3QgcHJvY2Vzc10nKSB7XG4gICAgc2NoZWR1bGVGbHVzaCA9IHVzZU5leHRUaWNrKCk7XG4gIH0gZWxzZSBpZiAoQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICBzY2hlZHVsZUZsdXNoID0gdXNlTXV0YXRpb25PYnNlcnZlcigpO1xuICB9IGVsc2UgaWYgKGlzV29ya2VyKSB7XG4gICAgc2NoZWR1bGVGbHVzaCA9IHVzZU1lc3NhZ2VDaGFubmVsKCk7XG4gIH0gZWxzZSB7XG4gICAgc2NoZWR1bGVGbHVzaCA9IHVzZVNldFRpbWVvdXQoKTtcbiAgfVxuICByZXR1cm4ge2dldCBkZWZhdWx0KCkge1xuICAgICAgcmV0dXJuICRfX2RlZmF1bHQ7XG4gICAgfX07XG59KTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1Byb21pc2UuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvUHJvbWlzZS5qc1wiO1xuICB2YXIgYXN5bmMgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9ub2RlX21vZHVsZXMvcnN2cC9saWIvcnN2cC9hc2FwLmpzXCIpLmRlZmF1bHQ7XG4gIHZhciByZWdpc3RlclBvbHlmaWxsID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCIpLnJlZ2lzdGVyUG9seWZpbGw7XG4gIHZhciBwcm9taXNlUmF3ID0ge307XG4gIGZ1bmN0aW9uIGlzUHJvbWlzZSh4KSB7XG4gICAgcmV0dXJuIHggJiYgdHlwZW9mIHggPT09ICdvYmplY3QnICYmIHguc3RhdHVzXyAhPT0gdW5kZWZpbmVkO1xuICB9XG4gIGZ1bmN0aW9uIGlkUmVzb2x2ZUhhbmRsZXIoeCkge1xuICAgIHJldHVybiB4O1xuICB9XG4gIGZ1bmN0aW9uIGlkUmVqZWN0SGFuZGxlcih4KSB7XG4gICAgdGhyb3cgeDtcbiAgfVxuICBmdW5jdGlvbiBjaGFpbihwcm9taXNlKSB7XG4gICAgdmFyIG9uUmVzb2x2ZSA9IGFyZ3VtZW50c1sxXSAhPT0gKHZvaWQgMCkgPyBhcmd1bWVudHNbMV0gOiBpZFJlc29sdmVIYW5kbGVyO1xuICAgIHZhciBvblJlamVjdCA9IGFyZ3VtZW50c1syXSAhPT0gKHZvaWQgMCkgPyBhcmd1bWVudHNbMl0gOiBpZFJlamVjdEhhbmRsZXI7XG4gICAgdmFyIGRlZmVycmVkID0gZ2V0RGVmZXJyZWQocHJvbWlzZS5jb25zdHJ1Y3Rvcik7XG4gICAgc3dpdGNoIChwcm9taXNlLnN0YXR1c18pIHtcbiAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICB0aHJvdyBUeXBlRXJyb3I7XG4gICAgICBjYXNlIDA6XG4gICAgICAgIHByb21pc2Uub25SZXNvbHZlXy5wdXNoKG9uUmVzb2x2ZSwgZGVmZXJyZWQpO1xuICAgICAgICBwcm9taXNlLm9uUmVqZWN0Xy5wdXNoKG9uUmVqZWN0LCBkZWZlcnJlZCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSArMTpcbiAgICAgICAgcHJvbWlzZUVucXVldWUocHJvbWlzZS52YWx1ZV8sIFtvblJlc29sdmUsIGRlZmVycmVkXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAtMTpcbiAgICAgICAgcHJvbWlzZUVucXVldWUocHJvbWlzZS52YWx1ZV8sIFtvblJlamVjdCwgZGVmZXJyZWRdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICB9XG4gIGZ1bmN0aW9uIGdldERlZmVycmVkKEMpIHtcbiAgICBpZiAodGhpcyA9PT0gJFByb21pc2UpIHtcbiAgICAgIHZhciBwcm9taXNlID0gcHJvbWlzZUluaXQobmV3ICRQcm9taXNlKHByb21pc2VSYXcpKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHByb21pc2U6IHByb21pc2UsXG4gICAgICAgIHJlc29sdmU6IChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgcHJvbWlzZVJlc29sdmUocHJvbWlzZSwgeCk7XG4gICAgICAgIH0pLFxuICAgICAgICByZWplY3Q6IChmdW5jdGlvbihyKSB7XG4gICAgICAgICAgcHJvbWlzZVJlamVjdChwcm9taXNlLCByKTtcbiAgICAgICAgfSlcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICAgIHJlc3VsdC5wcm9taXNlID0gbmV3IEMoKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICByZXN1bHQucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICAgIHJlc3VsdC5yZWplY3QgPSByZWplY3Q7XG4gICAgICB9KSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlU2V0KHByb21pc2UsIHN0YXR1cywgdmFsdWUsIG9uUmVzb2x2ZSwgb25SZWplY3QpIHtcbiAgICBwcm9taXNlLnN0YXR1c18gPSBzdGF0dXM7XG4gICAgcHJvbWlzZS52YWx1ZV8gPSB2YWx1ZTtcbiAgICBwcm9taXNlLm9uUmVzb2x2ZV8gPSBvblJlc29sdmU7XG4gICAgcHJvbWlzZS5vblJlamVjdF8gPSBvblJlamVjdDtcbiAgICByZXR1cm4gcHJvbWlzZTtcbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlSW5pdChwcm9taXNlKSB7XG4gICAgcmV0dXJuIHByb21pc2VTZXQocHJvbWlzZSwgMCwgdW5kZWZpbmVkLCBbXSwgW10pO1xuICB9XG4gIHZhciBQcm9taXNlID0gZnVuY3Rpb24gUHJvbWlzZShyZXNvbHZlcikge1xuICAgIGlmIChyZXNvbHZlciA9PT0gcHJvbWlzZVJhdylcbiAgICAgIHJldHVybjtcbiAgICBpZiAodHlwZW9mIHJlc29sdmVyICE9PSAnZnVuY3Rpb24nKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgICB2YXIgcHJvbWlzZSA9IHByb21pc2VJbml0KHRoaXMpO1xuICAgIHRyeSB7XG4gICAgICByZXNvbHZlcigoZnVuY3Rpb24oeCkge1xuICAgICAgICBwcm9taXNlUmVzb2x2ZShwcm9taXNlLCB4KTtcbiAgICAgIH0pLCAoZnVuY3Rpb24ocikge1xuICAgICAgICBwcm9taXNlUmVqZWN0KHByb21pc2UsIHIpO1xuICAgICAgfSkpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHByb21pc2VSZWplY3QocHJvbWlzZSwgZSk7XG4gICAgfVxuICB9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShQcm9taXNlLCB7XG4gICAgY2F0Y2g6IGZ1bmN0aW9uKG9uUmVqZWN0KSB7XG4gICAgICByZXR1cm4gdGhpcy50aGVuKHVuZGVmaW5lZCwgb25SZWplY3QpO1xuICAgIH0sXG4gICAgdGhlbjogZnVuY3Rpb24ob25SZXNvbHZlLCBvblJlamVjdCkge1xuICAgICAgaWYgKHR5cGVvZiBvblJlc29sdmUgIT09ICdmdW5jdGlvbicpXG4gICAgICAgIG9uUmVzb2x2ZSA9IGlkUmVzb2x2ZUhhbmRsZXI7XG4gICAgICBpZiAodHlwZW9mIG9uUmVqZWN0ICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICBvblJlamVjdCA9IGlkUmVqZWN0SGFuZGxlcjtcbiAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgIHZhciBjb25zdHJ1Y3RvciA9IHRoaXMuY29uc3RydWN0b3I7XG4gICAgICByZXR1cm4gY2hhaW4odGhpcywgZnVuY3Rpb24oeCkge1xuICAgICAgICB4ID0gcHJvbWlzZUNvZXJjZShjb25zdHJ1Y3RvciwgeCk7XG4gICAgICAgIHJldHVybiB4ID09PSB0aGF0ID8gb25SZWplY3QobmV3IFR5cGVFcnJvcikgOiBpc1Byb21pc2UoeCkgPyB4LnRoZW4ob25SZXNvbHZlLCBvblJlamVjdCkgOiBvblJlc29sdmUoeCk7XG4gICAgICB9LCBvblJlamVjdCk7XG4gICAgfVxuICB9LCB7XG4gICAgcmVzb2x2ZTogZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKHRoaXMgPT09ICRQcm9taXNlKSB7XG4gICAgICAgIGlmIChpc1Byb21pc2UoeCkpIHtcbiAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJvbWlzZVNldChuZXcgJFByb21pc2UocHJvbWlzZVJhdyksICsxLCB4KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgdGhpcyhmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICByZXNvbHZlKHgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHJlamVjdDogZnVuY3Rpb24ocikge1xuICAgICAgaWYgKHRoaXMgPT09ICRQcm9taXNlKSB7XG4gICAgICAgIHJldHVybiBwcm9taXNlU2V0KG5ldyAkUHJvbWlzZShwcm9taXNlUmF3KSwgLTEsIHIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyB0aGlzKChmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICByZWplY3Qocik7XG4gICAgICAgIH0pKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFsbDogZnVuY3Rpb24odmFsdWVzKSB7XG4gICAgICB2YXIgZGVmZXJyZWQgPSBnZXREZWZlcnJlZCh0aGlzKTtcbiAgICAgIHZhciByZXNvbHV0aW9ucyA9IFtdO1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIGNvdW50ID0gdmFsdWVzLmxlbmd0aDtcbiAgICAgICAgaWYgKGNvdW50ID09PSAwKSB7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXNvbHV0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMucmVzb2x2ZSh2YWx1ZXNbaV0pLnRoZW4oZnVuY3Rpb24oaSwgeCkge1xuICAgICAgICAgICAgICByZXNvbHV0aW9uc1tpXSA9IHg7XG4gICAgICAgICAgICAgIGlmICgtLWNvdW50ID09PSAwKVxuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzb2x1dGlvbnMpO1xuICAgICAgICAgICAgfS5iaW5kKHVuZGVmaW5lZCwgaSksIChmdW5jdGlvbihyKSB7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChyKTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfSxcbiAgICByYWNlOiBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgICAgIHZhciBkZWZlcnJlZCA9IGdldERlZmVycmVkKHRoaXMpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB0aGlzLnJlc29sdmUodmFsdWVzW2ldKS50aGVuKChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHgpO1xuICAgICAgICAgIH0pLCAoZnVuY3Rpb24ocikge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHIpO1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9XG4gIH0pO1xuICB2YXIgJFByb21pc2UgPSBQcm9taXNlO1xuICB2YXIgJFByb21pc2VSZWplY3QgPSAkUHJvbWlzZS5yZWplY3Q7XG4gIGZ1bmN0aW9uIHByb21pc2VSZXNvbHZlKHByb21pc2UsIHgpIHtcbiAgICBwcm9taXNlRG9uZShwcm9taXNlLCArMSwgeCwgcHJvbWlzZS5vblJlc29sdmVfKTtcbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlUmVqZWN0KHByb21pc2UsIHIpIHtcbiAgICBwcm9taXNlRG9uZShwcm9taXNlLCAtMSwgciwgcHJvbWlzZS5vblJlamVjdF8pO1xuICB9XG4gIGZ1bmN0aW9uIHByb21pc2VEb25lKHByb21pc2UsIHN0YXR1cywgdmFsdWUsIHJlYWN0aW9ucykge1xuICAgIGlmIChwcm9taXNlLnN0YXR1c18gIT09IDApXG4gICAgICByZXR1cm47XG4gICAgcHJvbWlzZUVucXVldWUodmFsdWUsIHJlYWN0aW9ucyk7XG4gICAgcHJvbWlzZVNldChwcm9taXNlLCBzdGF0dXMsIHZhbHVlKTtcbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlRW5xdWV1ZSh2YWx1ZSwgdGFza3MpIHtcbiAgICBhc3luYygoZnVuY3Rpb24oKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhc2tzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgIHByb21pc2VIYW5kbGUodmFsdWUsIHRhc2tzW2ldLCB0YXNrc1tpICsgMV0pO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlSGFuZGxlKHZhbHVlLCBoYW5kbGVyLCBkZWZlcnJlZCkge1xuICAgIHRyeSB7XG4gICAgICB2YXIgcmVzdWx0ID0gaGFuZGxlcih2YWx1ZSk7XG4gICAgICBpZiAocmVzdWx0ID09PSBkZWZlcnJlZC5wcm9taXNlKVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICAgICAgZWxzZSBpZiAoaXNQcm9taXNlKHJlc3VsdCkpXG4gICAgICAgIGNoYWluKHJlc3VsdCwgZGVmZXJyZWQucmVzb2x2ZSwgZGVmZXJyZWQucmVqZWN0KTtcbiAgICAgIGVsc2VcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXN1bHQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdChlKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgfVxuICB9XG4gIHZhciB0aGVuYWJsZVN5bWJvbCA9ICdAQHRoZW5hYmxlJztcbiAgZnVuY3Rpb24gaXNPYmplY3QoeCkge1xuICAgIHJldHVybiB4ICYmICh0eXBlb2YgeCA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHggPT09ICdmdW5jdGlvbicpO1xuICB9XG4gIGZ1bmN0aW9uIHByb21pc2VDb2VyY2UoY29uc3RydWN0b3IsIHgpIHtcbiAgICBpZiAoIWlzUHJvbWlzZSh4KSAmJiBpc09iamVjdCh4KSkge1xuICAgICAgdmFyIHRoZW47XG4gICAgICB0cnkge1xuICAgICAgICB0aGVuID0geC50aGVuO1xuICAgICAgfSBjYXRjaCAocikge1xuICAgICAgICB2YXIgcHJvbWlzZSA9ICRQcm9taXNlUmVqZWN0LmNhbGwoY29uc3RydWN0b3IsIHIpO1xuICAgICAgICB4W3RoZW5hYmxlU3ltYm9sXSA9IHByb21pc2U7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHZhciBwID0geFt0aGVuYWJsZVN5bWJvbF07XG4gICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgcmV0dXJuIHA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGRlZmVycmVkID0gZ2V0RGVmZXJyZWQoY29uc3RydWN0b3IpO1xuICAgICAgICAgIHhbdGhlbmFibGVTeW1ib2xdID0gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhlbi5jYWxsKHgsIGRlZmVycmVkLnJlc29sdmUsIGRlZmVycmVkLnJlamVjdCk7XG4gICAgICAgICAgfSBjYXRjaCAocikge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4geDtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbFByb21pc2UoZ2xvYmFsKSB7XG4gICAgaWYgKCFnbG9iYWwuUHJvbWlzZSlcbiAgICAgIGdsb2JhbC5Qcm9taXNlID0gUHJvbWlzZTtcbiAgfVxuICByZWdpc3RlclBvbHlmaWxsKHBvbHlmaWxsUHJvbWlzZSk7XG4gIHJldHVybiB7XG4gICAgZ2V0IFByb21pc2UoKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZTtcbiAgICB9LFxuICAgIGdldCBwb2x5ZmlsbFByb21pc2UoKSB7XG4gICAgICByZXR1cm4gcG9seWZpbGxQcm9taXNlO1xuICAgIH1cbiAgfTtcbn0pO1xuU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1Byb21pc2UuanNcIiArICcnKTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1N0cmluZ0l0ZXJhdG9yLmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciAkX18yO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9TdHJpbmdJdGVyYXRvci5qc1wiO1xuICB2YXIgJF9fMCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKSxcbiAgICAgIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0ID0gJF9fMC5jcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdCxcbiAgICAgIGlzT2JqZWN0ID0gJF9fMC5pc09iamVjdDtcbiAgdmFyIHRvUHJvcGVydHkgPSAkdHJhY2V1clJ1bnRpbWUudG9Qcm9wZXJ0eTtcbiAgdmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbiAgdmFyIGl0ZXJhdGVkU3RyaW5nID0gU3ltYm9sKCdpdGVyYXRlZFN0cmluZycpO1xuICB2YXIgc3RyaW5nSXRlcmF0b3JOZXh0SW5kZXggPSBTeW1ib2woJ3N0cmluZ0l0ZXJhdG9yTmV4dEluZGV4Jyk7XG4gIHZhciBTdHJpbmdJdGVyYXRvciA9IGZ1bmN0aW9uIFN0cmluZ0l0ZXJhdG9yKCkge307XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFN0cmluZ0l0ZXJhdG9yLCAoJF9fMiA9IHt9LCBPYmplY3QuZGVmaW5lUHJvcGVydHkoJF9fMiwgXCJuZXh0XCIsIHtcbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbyA9IHRoaXM7XG4gICAgICBpZiAoIWlzT2JqZWN0KG8pIHx8ICFoYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIGl0ZXJhdGVkU3RyaW5nKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCd0aGlzIG11c3QgYmUgYSBTdHJpbmdJdGVyYXRvciBvYmplY3QnKTtcbiAgICAgIH1cbiAgICAgIHZhciBzID0gb1t0b1Byb3BlcnR5KGl0ZXJhdGVkU3RyaW5nKV07XG4gICAgICBpZiAocyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdCh1bmRlZmluZWQsIHRydWUpO1xuICAgICAgfVxuICAgICAgdmFyIHBvc2l0aW9uID0gb1t0b1Byb3BlcnR5KHN0cmluZ0l0ZXJhdG9yTmV4dEluZGV4KV07XG4gICAgICB2YXIgbGVuID0gcy5sZW5ndGg7XG4gICAgICBpZiAocG9zaXRpb24gPj0gbGVuKSB7XG4gICAgICAgIG9bdG9Qcm9wZXJ0eShpdGVyYXRlZFN0cmluZyldID0gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QodW5kZWZpbmVkLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIHZhciBmaXJzdCA9IHMuY2hhckNvZGVBdChwb3NpdGlvbik7XG4gICAgICB2YXIgcmVzdWx0U3RyaW5nO1xuICAgICAgaWYgKGZpcnN0IDwgMHhEODAwIHx8IGZpcnN0ID4gMHhEQkZGIHx8IHBvc2l0aW9uICsgMSA9PT0gbGVuKSB7XG4gICAgICAgIHJlc3VsdFN0cmluZyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZmlyc3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHNlY29uZCA9IHMuY2hhckNvZGVBdChwb3NpdGlvbiArIDEpO1xuICAgICAgICBpZiAoc2Vjb25kIDwgMHhEQzAwIHx8IHNlY29uZCA+IDB4REZGRikge1xuICAgICAgICAgIHJlc3VsdFN0cmluZyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZmlyc3QpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdFN0cmluZyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZmlyc3QpICsgU3RyaW5nLmZyb21DaGFyQ29kZShzZWNvbmQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBvW3RvUHJvcGVydHkoc3RyaW5nSXRlcmF0b3JOZXh0SW5kZXgpXSA9IHBvc2l0aW9uICsgcmVzdWx0U3RyaW5nLmxlbmd0aDtcbiAgICAgIHJldHVybiBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdChyZXN1bHRTdHJpbmcsIGZhbHNlKTtcbiAgICB9LFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlXG4gIH0pLCBPYmplY3QuZGVmaW5lUHJvcGVydHkoJF9fMiwgU3ltYm9sLml0ZXJhdG9yLCB7XG4gICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZVxuICB9KSwgJF9fMiksIHt9KTtcbiAgZnVuY3Rpb24gY3JlYXRlU3RyaW5nSXRlcmF0b3Ioc3RyaW5nKSB7XG4gICAgdmFyIHMgPSBTdHJpbmcoc3RyaW5nKTtcbiAgICB2YXIgaXRlcmF0b3IgPSBPYmplY3QuY3JlYXRlKFN0cmluZ0l0ZXJhdG9yLnByb3RvdHlwZSk7XG4gICAgaXRlcmF0b3JbdG9Qcm9wZXJ0eShpdGVyYXRlZFN0cmluZyldID0gcztcbiAgICBpdGVyYXRvclt0b1Byb3BlcnR5KHN0cmluZ0l0ZXJhdG9yTmV4dEluZGV4KV0gPSAwO1xuICAgIHJldHVybiBpdGVyYXRvcjtcbiAgfVxuICByZXR1cm4ge2dldCBjcmVhdGVTdHJpbmdJdGVyYXRvcigpIHtcbiAgICAgIHJldHVybiBjcmVhdGVTdHJpbmdJdGVyYXRvcjtcbiAgICB9fTtcbn0pO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvU3RyaW5nLmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1N0cmluZy5qc1wiO1xuICB2YXIgY3JlYXRlU3RyaW5nSXRlcmF0b3IgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvU3RyaW5nSXRlcmF0b3IuanNcIikuY3JlYXRlU3RyaW5nSXRlcmF0b3I7XG4gIHZhciAkX18xID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCIpLFxuICAgICAgbWF5YmVBZGRGdW5jdGlvbnMgPSAkX18xLm1heWJlQWRkRnVuY3Rpb25zLFxuICAgICAgbWF5YmVBZGRJdGVyYXRvciA9ICRfXzEubWF5YmVBZGRJdGVyYXRvcixcbiAgICAgIHJlZ2lzdGVyUG9seWZpbGwgPSAkX18xLnJlZ2lzdGVyUG9seWZpbGw7XG4gIHZhciAkdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICB2YXIgJGluZGV4T2YgPSBTdHJpbmcucHJvdG90eXBlLmluZGV4T2Y7XG4gIHZhciAkbGFzdEluZGV4T2YgPSBTdHJpbmcucHJvdG90eXBlLmxhc3RJbmRleE9mO1xuICBmdW5jdGlvbiBzdGFydHNXaXRoKHNlYXJjaCkge1xuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCB8fCAkdG9TdHJpbmcuY2FsbChzZWFyY2gpID09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZ0xlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHNlYXJjaFN0cmluZyA9IFN0cmluZyhzZWFyY2gpO1xuICAgIHZhciBzZWFyY2hMZW5ndGggPSBzZWFyY2hTdHJpbmcubGVuZ3RoO1xuICAgIHZhciBwb3NpdGlvbiA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogdW5kZWZpbmVkO1xuICAgIHZhciBwb3MgPSBwb3NpdGlvbiA/IE51bWJlcihwb3NpdGlvbikgOiAwO1xuICAgIGlmIChpc05hTihwb3MpKSB7XG4gICAgICBwb3MgPSAwO1xuICAgIH1cbiAgICB2YXIgc3RhcnQgPSBNYXRoLm1pbihNYXRoLm1heChwb3MsIDApLCBzdHJpbmdMZW5ndGgpO1xuICAgIHJldHVybiAkaW5kZXhPZi5jYWxsKHN0cmluZywgc2VhcmNoU3RyaW5nLCBwb3MpID09IHN0YXJ0O1xuICB9XG4gIGZ1bmN0aW9uIGVuZHNXaXRoKHNlYXJjaCkge1xuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCB8fCAkdG9TdHJpbmcuY2FsbChzZWFyY2gpID09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZ0xlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHNlYXJjaFN0cmluZyA9IFN0cmluZyhzZWFyY2gpO1xuICAgIHZhciBzZWFyY2hMZW5ndGggPSBzZWFyY2hTdHJpbmcubGVuZ3RoO1xuICAgIHZhciBwb3MgPSBzdHJpbmdMZW5ndGg7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICB2YXIgcG9zaXRpb24gPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAocG9zaXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwb3MgPSBwb3NpdGlvbiA/IE51bWJlcihwb3NpdGlvbikgOiAwO1xuICAgICAgICBpZiAoaXNOYU4ocG9zKSkge1xuICAgICAgICAgIHBvcyA9IDA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGVuZCA9IE1hdGgubWluKE1hdGgubWF4KHBvcywgMCksIHN0cmluZ0xlbmd0aCk7XG4gICAgdmFyIHN0YXJ0ID0gZW5kIC0gc2VhcmNoTGVuZ3RoO1xuICAgIGlmIChzdGFydCA8IDApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuICRsYXN0SW5kZXhPZi5jYWxsKHN0cmluZywgc2VhcmNoU3RyaW5nLCBzdGFydCkgPT0gc3RhcnQ7XG4gIH1cbiAgZnVuY3Rpb24gaW5jbHVkZXMoc2VhcmNoKSB7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgaWYgKHNlYXJjaCAmJiAkdG9TdHJpbmcuY2FsbChzZWFyY2gpID09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZ0xlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHNlYXJjaFN0cmluZyA9IFN0cmluZyhzZWFyY2gpO1xuICAgIHZhciBzZWFyY2hMZW5ndGggPSBzZWFyY2hTdHJpbmcubGVuZ3RoO1xuICAgIHZhciBwb3NpdGlvbiA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogdW5kZWZpbmVkO1xuICAgIHZhciBwb3MgPSBwb3NpdGlvbiA/IE51bWJlcihwb3NpdGlvbikgOiAwO1xuICAgIGlmIChwb3MgIT0gcG9zKSB7XG4gICAgICBwb3MgPSAwO1xuICAgIH1cbiAgICB2YXIgc3RhcnQgPSBNYXRoLm1pbihNYXRoLm1heChwb3MsIDApLCBzdHJpbmdMZW5ndGgpO1xuICAgIGlmIChzZWFyY2hMZW5ndGggKyBzdGFydCA+IHN0cmluZ0xlbmd0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gJGluZGV4T2YuY2FsbChzdHJpbmcsIHNlYXJjaFN0cmluZywgcG9zKSAhPSAtMTtcbiAgfVxuICBmdW5jdGlvbiByZXBlYXQoY291bnQpIHtcbiAgICBpZiAodGhpcyA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZyA9IFN0cmluZyh0aGlzKTtcbiAgICB2YXIgbiA9IGNvdW50ID8gTnVtYmVyKGNvdW50KSA6IDA7XG4gICAgaWYgKGlzTmFOKG4pKSB7XG4gICAgICBuID0gMDtcbiAgICB9XG4gICAgaWYgKG4gPCAwIHx8IG4gPT0gSW5maW5pdHkpIHtcbiAgICAgIHRocm93IFJhbmdlRXJyb3IoKTtcbiAgICB9XG4gICAgaWYgKG4gPT0gMCkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gJyc7XG4gICAgd2hpbGUgKG4tLSkge1xuICAgICAgcmVzdWx0ICs9IHN0cmluZztcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBmdW5jdGlvbiBjb2RlUG9pbnRBdChwb3NpdGlvbikge1xuICAgIGlmICh0aGlzID09IG51bGwpIHtcbiAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgIH1cbiAgICB2YXIgc3RyaW5nID0gU3RyaW5nKHRoaXMpO1xuICAgIHZhciBzaXplID0gc3RyaW5nLmxlbmd0aDtcbiAgICB2YXIgaW5kZXggPSBwb3NpdGlvbiA/IE51bWJlcihwb3NpdGlvbikgOiAwO1xuICAgIGlmIChpc05hTihpbmRleCkpIHtcbiAgICAgIGluZGV4ID0gMDtcbiAgICB9XG4gICAgaWYgKGluZGV4IDwgMCB8fCBpbmRleCA+PSBzaXplKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgZmlyc3QgPSBzdHJpbmcuY2hhckNvZGVBdChpbmRleCk7XG4gICAgdmFyIHNlY29uZDtcbiAgICBpZiAoZmlyc3QgPj0gMHhEODAwICYmIGZpcnN0IDw9IDB4REJGRiAmJiBzaXplID4gaW5kZXggKyAxKSB7XG4gICAgICBzZWNvbmQgPSBzdHJpbmcuY2hhckNvZGVBdChpbmRleCArIDEpO1xuICAgICAgaWYgKHNlY29uZCA+PSAweERDMDAgJiYgc2Vjb25kIDw9IDB4REZGRikge1xuICAgICAgICByZXR1cm4gKGZpcnN0IC0gMHhEODAwKSAqIDB4NDAwICsgc2Vjb25kIC0gMHhEQzAwICsgMHgxMDAwMDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZpcnN0O1xuICB9XG4gIGZ1bmN0aW9uIHJhdyhjYWxsc2l0ZSkge1xuICAgIHZhciByYXcgPSBjYWxsc2l0ZS5yYXc7XG4gICAgdmFyIGxlbiA9IHJhdy5sZW5ndGggPj4+IDA7XG4gICAgaWYgKGxlbiA9PT0gMClcbiAgICAgIHJldHVybiAnJztcbiAgICB2YXIgcyA9ICcnO1xuICAgIHZhciBpID0gMDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgcyArPSByYXdbaV07XG4gICAgICBpZiAoaSArIDEgPT09IGxlbilcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgICBzICs9IGFyZ3VtZW50c1srK2ldO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBmcm9tQ29kZVBvaW50KCkge1xuICAgIHZhciBjb2RlVW5pdHMgPSBbXTtcbiAgICB2YXIgZmxvb3IgPSBNYXRoLmZsb29yO1xuICAgIHZhciBoaWdoU3Vycm9nYXRlO1xuICAgIHZhciBsb3dTdXJyb2dhdGU7XG4gICAgdmFyIGluZGV4ID0gLTE7XG4gICAgdmFyIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgaWYgKCFsZW5ndGgpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgIHZhciBjb2RlUG9pbnQgPSBOdW1iZXIoYXJndW1lbnRzW2luZGV4XSk7XG4gICAgICBpZiAoIWlzRmluaXRlKGNvZGVQb2ludCkgfHwgY29kZVBvaW50IDwgMCB8fCBjb2RlUG9pbnQgPiAweDEwRkZGRiB8fCBmbG9vcihjb2RlUG9pbnQpICE9IGNvZGVQb2ludCkge1xuICAgICAgICB0aHJvdyBSYW5nZUVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQ6ICcgKyBjb2RlUG9pbnQpO1xuICAgICAgfVxuICAgICAgaWYgKGNvZGVQb2ludCA8PSAweEZGRkYpIHtcbiAgICAgICAgY29kZVVuaXRzLnB1c2goY29kZVBvaW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvZGVQb2ludCAtPSAweDEwMDAwO1xuICAgICAgICBoaWdoU3Vycm9nYXRlID0gKGNvZGVQb2ludCA+PiAxMCkgKyAweEQ4MDA7XG4gICAgICAgIGxvd1N1cnJvZ2F0ZSA9IChjb2RlUG9pbnQgJSAweDQwMCkgKyAweERDMDA7XG4gICAgICAgIGNvZGVVbml0cy5wdXNoKGhpZ2hTdXJyb2dhdGUsIGxvd1N1cnJvZ2F0ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIGNvZGVVbml0cyk7XG4gIH1cbiAgZnVuY3Rpb24gc3RyaW5nUHJvdG90eXBlSXRlcmF0b3IoKSB7XG4gICAgdmFyIG8gPSAkdHJhY2V1clJ1bnRpbWUuY2hlY2tPYmplY3RDb2VyY2libGUodGhpcyk7XG4gICAgdmFyIHMgPSBTdHJpbmcobyk7XG4gICAgcmV0dXJuIGNyZWF0ZVN0cmluZ0l0ZXJhdG9yKHMpO1xuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsU3RyaW5nKGdsb2JhbCkge1xuICAgIHZhciBTdHJpbmcgPSBnbG9iYWwuU3RyaW5nO1xuICAgIG1heWJlQWRkRnVuY3Rpb25zKFN0cmluZy5wcm90b3R5cGUsIFsnY29kZVBvaW50QXQnLCBjb2RlUG9pbnRBdCwgJ2VuZHNXaXRoJywgZW5kc1dpdGgsICdpbmNsdWRlcycsIGluY2x1ZGVzLCAncmVwZWF0JywgcmVwZWF0LCAnc3RhcnRzV2l0aCcsIHN0YXJ0c1dpdGhdKTtcbiAgICBtYXliZUFkZEZ1bmN0aW9ucyhTdHJpbmcsIFsnZnJvbUNvZGVQb2ludCcsIGZyb21Db2RlUG9pbnQsICdyYXcnLCByYXddKTtcbiAgICBtYXliZUFkZEl0ZXJhdG9yKFN0cmluZy5wcm90b3R5cGUsIHN0cmluZ1Byb3RvdHlwZUl0ZXJhdG9yLCBTeW1ib2wpO1xuICB9XG4gIHJlZ2lzdGVyUG9seWZpbGwocG9seWZpbGxTdHJpbmcpO1xuICByZXR1cm4ge1xuICAgIGdldCBzdGFydHNXaXRoKCkge1xuICAgICAgcmV0dXJuIHN0YXJ0c1dpdGg7XG4gICAgfSxcbiAgICBnZXQgZW5kc1dpdGgoKSB7XG4gICAgICByZXR1cm4gZW5kc1dpdGg7XG4gICAgfSxcbiAgICBnZXQgaW5jbHVkZXMoKSB7XG4gICAgICByZXR1cm4gaW5jbHVkZXM7XG4gICAgfSxcbiAgICBnZXQgcmVwZWF0KCkge1xuICAgICAgcmV0dXJuIHJlcGVhdDtcbiAgICB9LFxuICAgIGdldCBjb2RlUG9pbnRBdCgpIHtcbiAgICAgIHJldHVybiBjb2RlUG9pbnRBdDtcbiAgICB9LFxuICAgIGdldCByYXcoKSB7XG4gICAgICByZXR1cm4gcmF3O1xuICAgIH0sXG4gICAgZ2V0IGZyb21Db2RlUG9pbnQoKSB7XG4gICAgICByZXR1cm4gZnJvbUNvZGVQb2ludDtcbiAgICB9LFxuICAgIGdldCBzdHJpbmdQcm90b3R5cGVJdGVyYXRvcigpIHtcbiAgICAgIHJldHVybiBzdHJpbmdQcm90b3R5cGVJdGVyYXRvcjtcbiAgICB9LFxuICAgIGdldCBwb2x5ZmlsbFN0cmluZygpIHtcbiAgICAgIHJldHVybiBwb2x5ZmlsbFN0cmluZztcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9TdHJpbmcuanNcIiArICcnKTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL0FycmF5SXRlcmF0b3IuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyICRfXzI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL0FycmF5SXRlcmF0b3IuanNcIjtcbiAgdmFyICRfXzAgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiksXG4gICAgICB0b09iamVjdCA9ICRfXzAudG9PYmplY3QsXG4gICAgICB0b1VpbnQzMiA9ICRfXzAudG9VaW50MzIsXG4gICAgICBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdCA9ICRfXzAuY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3Q7XG4gIHZhciBBUlJBWV9JVEVSQVRPUl9LSU5EX0tFWVMgPSAxO1xuICB2YXIgQVJSQVlfSVRFUkFUT1JfS0lORF9WQUxVRVMgPSAyO1xuICB2YXIgQVJSQVlfSVRFUkFUT1JfS0lORF9FTlRSSUVTID0gMztcbiAgdmFyIEFycmF5SXRlcmF0b3IgPSBmdW5jdGlvbiBBcnJheUl0ZXJhdG9yKCkge307XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEFycmF5SXRlcmF0b3IsICgkX18yID0ge30sIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkX18yLCBcIm5leHRcIiwge1xuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBpdGVyYXRvciA9IHRvT2JqZWN0KHRoaXMpO1xuICAgICAgdmFyIGFycmF5ID0gaXRlcmF0b3IuaXRlcmF0b3JPYmplY3RfO1xuICAgICAgaWYgKCFhcnJheSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdPYmplY3QgaXMgbm90IGFuIEFycmF5SXRlcmF0b3InKTtcbiAgICAgIH1cbiAgICAgIHZhciBpbmRleCA9IGl0ZXJhdG9yLmFycmF5SXRlcmF0b3JOZXh0SW5kZXhfO1xuICAgICAgdmFyIGl0ZW1LaW5kID0gaXRlcmF0b3IuYXJyYXlJdGVyYXRpb25LaW5kXztcbiAgICAgIHZhciBsZW5ndGggPSB0b1VpbnQzMihhcnJheS5sZW5ndGgpO1xuICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICBpdGVyYXRvci5hcnJheUl0ZXJhdG9yTmV4dEluZGV4XyA9IEluZmluaXR5O1xuICAgICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QodW5kZWZpbmVkLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIGl0ZXJhdG9yLmFycmF5SXRlcmF0b3JOZXh0SW5kZXhfID0gaW5kZXggKyAxO1xuICAgICAgaWYgKGl0ZW1LaW5kID09IEFSUkFZX0lURVJBVE9SX0tJTkRfVkFMVUVTKVxuICAgICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QoYXJyYXlbaW5kZXhdLCBmYWxzZSk7XG4gICAgICBpZiAoaXRlbUtpbmQgPT0gQVJSQVlfSVRFUkFUT1JfS0lORF9FTlRSSUVTKVxuICAgICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QoW2luZGV4LCBhcnJheVtpbmRleF1dLCBmYWxzZSk7XG4gICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QoaW5kZXgsIGZhbHNlKTtcbiAgICB9LFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlXG4gIH0pLCBPYmplY3QuZGVmaW5lUHJvcGVydHkoJF9fMiwgU3ltYm9sLml0ZXJhdG9yLCB7XG4gICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZVxuICB9KSwgJF9fMiksIHt9KTtcbiAgZnVuY3Rpb24gY3JlYXRlQXJyYXlJdGVyYXRvcihhcnJheSwga2luZCkge1xuICAgIHZhciBvYmplY3QgPSB0b09iamVjdChhcnJheSk7XG4gICAgdmFyIGl0ZXJhdG9yID0gbmV3IEFycmF5SXRlcmF0b3I7XG4gICAgaXRlcmF0b3IuaXRlcmF0b3JPYmplY3RfID0gb2JqZWN0O1xuICAgIGl0ZXJhdG9yLmFycmF5SXRlcmF0b3JOZXh0SW5kZXhfID0gMDtcbiAgICBpdGVyYXRvci5hcnJheUl0ZXJhdGlvbktpbmRfID0ga2luZDtcbiAgICByZXR1cm4gaXRlcmF0b3I7XG4gIH1cbiAgZnVuY3Rpb24gZW50cmllcygpIHtcbiAgICByZXR1cm4gY3JlYXRlQXJyYXlJdGVyYXRvcih0aGlzLCBBUlJBWV9JVEVSQVRPUl9LSU5EX0VOVFJJRVMpO1xuICB9XG4gIGZ1bmN0aW9uIGtleXMoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUFycmF5SXRlcmF0b3IodGhpcywgQVJSQVlfSVRFUkFUT1JfS0lORF9LRVlTKTtcbiAgfVxuICBmdW5jdGlvbiB2YWx1ZXMoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUFycmF5SXRlcmF0b3IodGhpcywgQVJSQVlfSVRFUkFUT1JfS0lORF9WQUxVRVMpO1xuICB9XG4gIHJldHVybiB7XG4gICAgZ2V0IGVudHJpZXMoKSB7XG4gICAgICByZXR1cm4gZW50cmllcztcbiAgICB9LFxuICAgIGdldCBrZXlzKCkge1xuICAgICAgcmV0dXJuIGtleXM7XG4gICAgfSxcbiAgICBnZXQgdmFsdWVzKCkge1xuICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL0FycmF5LmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL0FycmF5LmpzXCI7XG4gIHZhciAkX18wID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL0FycmF5SXRlcmF0b3IuanNcIiksXG4gICAgICBlbnRyaWVzID0gJF9fMC5lbnRyaWVzLFxuICAgICAga2V5cyA9ICRfXzAua2V5cyxcbiAgICAgIHZhbHVlcyA9ICRfXzAudmFsdWVzO1xuICB2YXIgJF9fMSA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKSxcbiAgICAgIGNoZWNrSXRlcmFibGUgPSAkX18xLmNoZWNrSXRlcmFibGUsXG4gICAgICBpc0NhbGxhYmxlID0gJF9fMS5pc0NhbGxhYmxlLFxuICAgICAgaXNDb25zdHJ1Y3RvciA9ICRfXzEuaXNDb25zdHJ1Y3RvcixcbiAgICAgIG1heWJlQWRkRnVuY3Rpb25zID0gJF9fMS5tYXliZUFkZEZ1bmN0aW9ucyxcbiAgICAgIG1heWJlQWRkSXRlcmF0b3IgPSAkX18xLm1heWJlQWRkSXRlcmF0b3IsXG4gICAgICByZWdpc3RlclBvbHlmaWxsID0gJF9fMS5yZWdpc3RlclBvbHlmaWxsLFxuICAgICAgdG9JbnRlZ2VyID0gJF9fMS50b0ludGVnZXIsXG4gICAgICB0b0xlbmd0aCA9ICRfXzEudG9MZW5ndGgsXG4gICAgICB0b09iamVjdCA9ICRfXzEudG9PYmplY3Q7XG4gIGZ1bmN0aW9uIGZyb20oYXJyTGlrZSkge1xuICAgIHZhciBtYXBGbiA9IGFyZ3VtZW50c1sxXTtcbiAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1syXTtcbiAgICB2YXIgQyA9IHRoaXM7XG4gICAgdmFyIGl0ZW1zID0gdG9PYmplY3QoYXJyTGlrZSk7XG4gICAgdmFyIG1hcHBpbmcgPSBtYXBGbiAhPT0gdW5kZWZpbmVkO1xuICAgIHZhciBrID0gMDtcbiAgICB2YXIgYXJyLFxuICAgICAgICBsZW47XG4gICAgaWYgKG1hcHBpbmcgJiYgIWlzQ2FsbGFibGUobWFwRm4pKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgaWYgKGNoZWNrSXRlcmFibGUoaXRlbXMpKSB7XG4gICAgICBhcnIgPSBpc0NvbnN0cnVjdG9yKEMpID8gbmV3IEMoKSA6IFtdO1xuICAgICAgZm9yICh2YXIgJF9fMiA9IGl0ZW1zWyR0cmFjZXVyUnVudGltZS50b1Byb3BlcnR5KFN5bWJvbC5pdGVyYXRvcildKCksXG4gICAgICAgICAgJF9fMzsgISgkX18zID0gJF9fMi5uZXh0KCkpLmRvbmU7ICkge1xuICAgICAgICB2YXIgaXRlbSA9ICRfXzMudmFsdWU7XG4gICAgICAgIHtcbiAgICAgICAgICBpZiAobWFwcGluZykge1xuICAgICAgICAgICAgYXJyW2tdID0gbWFwRm4uY2FsbCh0aGlzQXJnLCBpdGVtLCBrKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXJyW2tdID0gaXRlbTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaysrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhcnIubGVuZ3RoID0gaztcbiAgICAgIHJldHVybiBhcnI7XG4gICAgfVxuICAgIGxlbiA9IHRvTGVuZ3RoKGl0ZW1zLmxlbmd0aCk7XG4gICAgYXJyID0gaXNDb25zdHJ1Y3RvcihDKSA/IG5ldyBDKGxlbikgOiBuZXcgQXJyYXkobGVuKTtcbiAgICBmb3IgKDsgayA8IGxlbjsgaysrKSB7XG4gICAgICBpZiAobWFwcGluZykge1xuICAgICAgICBhcnJba10gPSB0eXBlb2YgdGhpc0FyZyA9PT0gJ3VuZGVmaW5lZCcgPyBtYXBGbihpdGVtc1trXSwgaykgOiBtYXBGbi5jYWxsKHRoaXNBcmcsIGl0ZW1zW2tdLCBrKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFycltrXSA9IGl0ZW1zW2tdO1xuICAgICAgfVxuICAgIH1cbiAgICBhcnIubGVuZ3RoID0gbGVuO1xuICAgIHJldHVybiBhcnI7XG4gIH1cbiAgZnVuY3Rpb24gb2YoKSB7XG4gICAgZm9yICh2YXIgaXRlbXMgPSBbXSxcbiAgICAgICAgJF9fNCA9IDA7ICRfXzQgPCBhcmd1bWVudHMubGVuZ3RoOyAkX180KyspXG4gICAgICBpdGVtc1skX180XSA9IGFyZ3VtZW50c1skX180XTtcbiAgICB2YXIgQyA9IHRoaXM7XG4gICAgdmFyIGxlbiA9IGl0ZW1zLmxlbmd0aDtcbiAgICB2YXIgYXJyID0gaXNDb25zdHJ1Y3RvcihDKSA/IG5ldyBDKGxlbikgOiBuZXcgQXJyYXkobGVuKTtcbiAgICBmb3IgKHZhciBrID0gMDsgayA8IGxlbjsgaysrKSB7XG4gICAgICBhcnJba10gPSBpdGVtc1trXTtcbiAgICB9XG4gICAgYXJyLmxlbmd0aCA9IGxlbjtcbiAgICByZXR1cm4gYXJyO1xuICB9XG4gIGZ1bmN0aW9uIGZpbGwodmFsdWUpIHtcbiAgICB2YXIgc3RhcnQgPSBhcmd1bWVudHNbMV0gIT09ICh2b2lkIDApID8gYXJndW1lbnRzWzFdIDogMDtcbiAgICB2YXIgZW5kID0gYXJndW1lbnRzWzJdO1xuICAgIHZhciBvYmplY3QgPSB0b09iamVjdCh0aGlzKTtcbiAgICB2YXIgbGVuID0gdG9MZW5ndGgob2JqZWN0Lmxlbmd0aCk7XG4gICAgdmFyIGZpbGxTdGFydCA9IHRvSW50ZWdlcihzdGFydCk7XG4gICAgdmFyIGZpbGxFbmQgPSBlbmQgIT09IHVuZGVmaW5lZCA/IHRvSW50ZWdlcihlbmQpIDogbGVuO1xuICAgIGZpbGxTdGFydCA9IGZpbGxTdGFydCA8IDAgPyBNYXRoLm1heChsZW4gKyBmaWxsU3RhcnQsIDApIDogTWF0aC5taW4oZmlsbFN0YXJ0LCBsZW4pO1xuICAgIGZpbGxFbmQgPSBmaWxsRW5kIDwgMCA/IE1hdGgubWF4KGxlbiArIGZpbGxFbmQsIDApIDogTWF0aC5taW4oZmlsbEVuZCwgbGVuKTtcbiAgICB3aGlsZSAoZmlsbFN0YXJ0IDwgZmlsbEVuZCkge1xuICAgICAgb2JqZWN0W2ZpbGxTdGFydF0gPSB2YWx1ZTtcbiAgICAgIGZpbGxTdGFydCsrO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0O1xuICB9XG4gIGZ1bmN0aW9uIGZpbmQocHJlZGljYXRlKSB7XG4gICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMV07XG4gICAgcmV0dXJuIGZpbmRIZWxwZXIodGhpcywgcHJlZGljYXRlLCB0aGlzQXJnKTtcbiAgfVxuICBmdW5jdGlvbiBmaW5kSW5kZXgocHJlZGljYXRlKSB7XG4gICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMV07XG4gICAgcmV0dXJuIGZpbmRIZWxwZXIodGhpcywgcHJlZGljYXRlLCB0aGlzQXJnLCB0cnVlKTtcbiAgfVxuICBmdW5jdGlvbiBmaW5kSGVscGVyKHNlbGYsIHByZWRpY2F0ZSkge1xuICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzJdO1xuICAgIHZhciByZXR1cm5JbmRleCA9IGFyZ3VtZW50c1szXSAhPT0gKHZvaWQgMCkgPyBhcmd1bWVudHNbM10gOiBmYWxzZTtcbiAgICB2YXIgb2JqZWN0ID0gdG9PYmplY3Qoc2VsZik7XG4gICAgdmFyIGxlbiA9IHRvTGVuZ3RoKG9iamVjdC5sZW5ndGgpO1xuICAgIGlmICghaXNDYWxsYWJsZShwcmVkaWNhdGUpKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyIHZhbHVlID0gb2JqZWN0W2ldO1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKHRoaXNBcmcsIHZhbHVlLCBpLCBvYmplY3QpKSB7XG4gICAgICAgIHJldHVybiByZXR1cm5JbmRleCA/IGkgOiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldHVybkluZGV4ID8gLTEgOiB1bmRlZmluZWQ7XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxBcnJheShnbG9iYWwpIHtcbiAgICB2YXIgJF9fNSA9IGdsb2JhbCxcbiAgICAgICAgQXJyYXkgPSAkX181LkFycmF5LFxuICAgICAgICBPYmplY3QgPSAkX181Lk9iamVjdCxcbiAgICAgICAgU3ltYm9sID0gJF9fNS5TeW1ib2w7XG4gICAgbWF5YmVBZGRGdW5jdGlvbnMoQXJyYXkucHJvdG90eXBlLCBbJ2VudHJpZXMnLCBlbnRyaWVzLCAna2V5cycsIGtleXMsICd2YWx1ZXMnLCB2YWx1ZXMsICdmaWxsJywgZmlsbCwgJ2ZpbmQnLCBmaW5kLCAnZmluZEluZGV4JywgZmluZEluZGV4XSk7XG4gICAgbWF5YmVBZGRGdW5jdGlvbnMoQXJyYXksIFsnZnJvbScsIGZyb20sICdvZicsIG9mXSk7XG4gICAgbWF5YmVBZGRJdGVyYXRvcihBcnJheS5wcm90b3R5cGUsIHZhbHVlcywgU3ltYm9sKTtcbiAgICBtYXliZUFkZEl0ZXJhdG9yKE9iamVjdC5nZXRQcm90b3R5cGVPZihbXS52YWx1ZXMoKSksIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSwgU3ltYm9sKTtcbiAgfVxuICByZWdpc3RlclBvbHlmaWxsKHBvbHlmaWxsQXJyYXkpO1xuICByZXR1cm4ge1xuICAgIGdldCBmcm9tKCkge1xuICAgICAgcmV0dXJuIGZyb207XG4gICAgfSxcbiAgICBnZXQgb2YoKSB7XG4gICAgICByZXR1cm4gb2Y7XG4gICAgfSxcbiAgICBnZXQgZmlsbCgpIHtcbiAgICAgIHJldHVybiBmaWxsO1xuICAgIH0sXG4gICAgZ2V0IGZpbmQoKSB7XG4gICAgICByZXR1cm4gZmluZDtcbiAgICB9LFxuICAgIGdldCBmaW5kSW5kZXgoKSB7XG4gICAgICByZXR1cm4gZmluZEluZGV4O1xuICAgIH0sXG4gICAgZ2V0IHBvbHlmaWxsQXJyYXkoKSB7XG4gICAgICByZXR1cm4gcG9seWZpbGxBcnJheTtcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9BcnJheS5qc1wiICsgJycpO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvT2JqZWN0LmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL09iamVjdC5qc1wiO1xuICB2YXIgJF9fMCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKSxcbiAgICAgIG1heWJlQWRkRnVuY3Rpb25zID0gJF9fMC5tYXliZUFkZEZ1bmN0aW9ucyxcbiAgICAgIHJlZ2lzdGVyUG9seWZpbGwgPSAkX18wLnJlZ2lzdGVyUG9seWZpbGw7XG4gIHZhciAkX18xID0gJHRyYWNldXJSdW50aW1lLFxuICAgICAgZGVmaW5lUHJvcGVydHkgPSAkX18xLmRlZmluZVByb3BlcnR5LFxuICAgICAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID0gJF9fMS5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IsXG4gICAgICBnZXRPd25Qcm9wZXJ0eU5hbWVzID0gJF9fMS5nZXRPd25Qcm9wZXJ0eU5hbWVzLFxuICAgICAgaXNQcml2YXRlTmFtZSA9ICRfXzEuaXNQcml2YXRlTmFtZSxcbiAgICAgIGtleXMgPSAkX18xLmtleXM7XG4gIGZ1bmN0aW9uIGlzKGxlZnQsIHJpZ2h0KSB7XG4gICAgaWYgKGxlZnQgPT09IHJpZ2h0KVxuICAgICAgcmV0dXJuIGxlZnQgIT09IDAgfHwgMSAvIGxlZnQgPT09IDEgLyByaWdodDtcbiAgICByZXR1cm4gbGVmdCAhPT0gbGVmdCAmJiByaWdodCAhPT0gcmlnaHQ7XG4gIH1cbiAgZnVuY3Rpb24gYXNzaWduKHRhcmdldCkge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldO1xuICAgICAgdmFyIHByb3BzID0gc291cmNlID09IG51bGwgPyBbXSA6IGtleXMoc291cmNlKTtcbiAgICAgIHZhciBwLFxuICAgICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aDtcbiAgICAgIGZvciAocCA9IDA7IHAgPCBsZW5ndGg7IHArKykge1xuICAgICAgICB2YXIgbmFtZSA9IHByb3BzW3BdO1xuICAgICAgICBpZiAoaXNQcml2YXRlTmFtZShuYW1lKSlcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgdGFyZ2V0W25hbWVdID0gc291cmNlW25hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG4gIGZ1bmN0aW9uIG1peGluKHRhcmdldCwgc291cmNlKSB7XG4gICAgdmFyIHByb3BzID0gZ2V0T3duUHJvcGVydHlOYW1lcyhzb3VyY2UpO1xuICAgIHZhciBwLFxuICAgICAgICBkZXNjcmlwdG9yLFxuICAgICAgICBsZW5ndGggPSBwcm9wcy5sZW5ndGg7XG4gICAgZm9yIChwID0gMDsgcCA8IGxlbmd0aDsgcCsrKSB7XG4gICAgICB2YXIgbmFtZSA9IHByb3BzW3BdO1xuICAgICAgaWYgKGlzUHJpdmF0ZU5hbWUobmFtZSkpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgZGVzY3JpcHRvciA9IGdldE93blByb3BlcnR5RGVzY3JpcHRvcihzb3VyY2UsIHByb3BzW3BdKTtcbiAgICAgIGRlZmluZVByb3BlcnR5KHRhcmdldCwgcHJvcHNbcF0sIGRlc2NyaXB0b3IpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsT2JqZWN0KGdsb2JhbCkge1xuICAgIHZhciBPYmplY3QgPSBnbG9iYWwuT2JqZWN0O1xuICAgIG1heWJlQWRkRnVuY3Rpb25zKE9iamVjdCwgWydhc3NpZ24nLCBhc3NpZ24sICdpcycsIGlzLCAnbWl4aW4nLCBtaXhpbl0pO1xuICB9XG4gIHJlZ2lzdGVyUG9seWZpbGwocG9seWZpbGxPYmplY3QpO1xuICByZXR1cm4ge1xuICAgIGdldCBpcygpIHtcbiAgICAgIHJldHVybiBpcztcbiAgICB9LFxuICAgIGdldCBhc3NpZ24oKSB7XG4gICAgICByZXR1cm4gYXNzaWduO1xuICAgIH0sXG4gICAgZ2V0IG1peGluKCkge1xuICAgICAgcmV0dXJuIG1peGluO1xuICAgIH0sXG4gICAgZ2V0IHBvbHlmaWxsT2JqZWN0KCkge1xuICAgICAgcmV0dXJuIHBvbHlmaWxsT2JqZWN0O1xuICAgIH1cbiAgfTtcbn0pO1xuU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL09iamVjdC5qc1wiICsgJycpO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvTnVtYmVyLmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL051bWJlci5qc1wiO1xuICB2YXIgJF9fMCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKSxcbiAgICAgIGlzTnVtYmVyID0gJF9fMC5pc051bWJlcixcbiAgICAgIG1heWJlQWRkQ29uc3RzID0gJF9fMC5tYXliZUFkZENvbnN0cyxcbiAgICAgIG1heWJlQWRkRnVuY3Rpb25zID0gJF9fMC5tYXliZUFkZEZ1bmN0aW9ucyxcbiAgICAgIHJlZ2lzdGVyUG9seWZpbGwgPSAkX18wLnJlZ2lzdGVyUG9seWZpbGwsXG4gICAgICB0b0ludGVnZXIgPSAkX18wLnRvSW50ZWdlcjtcbiAgdmFyICRhYnMgPSBNYXRoLmFicztcbiAgdmFyICRpc0Zpbml0ZSA9IGlzRmluaXRlO1xuICB2YXIgJGlzTmFOID0gaXNOYU47XG4gIHZhciBNQVhfU0FGRV9JTlRFR0VSID0gTWF0aC5wb3coMiwgNTMpIC0gMTtcbiAgdmFyIE1JTl9TQUZFX0lOVEVHRVIgPSAtTWF0aC5wb3coMiwgNTMpICsgMTtcbiAgdmFyIEVQU0lMT04gPSBNYXRoLnBvdygyLCAtNTIpO1xuICBmdW5jdGlvbiBOdW1iZXJJc0Zpbml0ZShudW1iZXIpIHtcbiAgICByZXR1cm4gaXNOdW1iZXIobnVtYmVyKSAmJiAkaXNGaW5pdGUobnVtYmVyKTtcbiAgfVxuICA7XG4gIGZ1bmN0aW9uIGlzSW50ZWdlcihudW1iZXIpIHtcbiAgICByZXR1cm4gTnVtYmVySXNGaW5pdGUobnVtYmVyKSAmJiB0b0ludGVnZXIobnVtYmVyKSA9PT0gbnVtYmVyO1xuICB9XG4gIGZ1bmN0aW9uIE51bWJlcklzTmFOKG51bWJlcikge1xuICAgIHJldHVybiBpc051bWJlcihudW1iZXIpICYmICRpc05hTihudW1iZXIpO1xuICB9XG4gIDtcbiAgZnVuY3Rpb24gaXNTYWZlSW50ZWdlcihudW1iZXIpIHtcbiAgICBpZiAoTnVtYmVySXNGaW5pdGUobnVtYmVyKSkge1xuICAgICAgdmFyIGludGVncmFsID0gdG9JbnRlZ2VyKG51bWJlcik7XG4gICAgICBpZiAoaW50ZWdyYWwgPT09IG51bWJlcilcbiAgICAgICAgcmV0dXJuICRhYnMoaW50ZWdyYWwpIDw9IE1BWF9TQUZFX0lOVEVHRVI7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbE51bWJlcihnbG9iYWwpIHtcbiAgICB2YXIgTnVtYmVyID0gZ2xvYmFsLk51bWJlcjtcbiAgICBtYXliZUFkZENvbnN0cyhOdW1iZXIsIFsnTUFYX1NBRkVfSU5URUdFUicsIE1BWF9TQUZFX0lOVEVHRVIsICdNSU5fU0FGRV9JTlRFR0VSJywgTUlOX1NBRkVfSU5URUdFUiwgJ0VQU0lMT04nLCBFUFNJTE9OXSk7XG4gICAgbWF5YmVBZGRGdW5jdGlvbnMoTnVtYmVyLCBbJ2lzRmluaXRlJywgTnVtYmVySXNGaW5pdGUsICdpc0ludGVnZXInLCBpc0ludGVnZXIsICdpc05hTicsIE51bWJlcklzTmFOLCAnaXNTYWZlSW50ZWdlcicsIGlzU2FmZUludGVnZXJdKTtcbiAgfVxuICByZWdpc3RlclBvbHlmaWxsKHBvbHlmaWxsTnVtYmVyKTtcbiAgcmV0dXJuIHtcbiAgICBnZXQgTUFYX1NBRkVfSU5URUdFUigpIHtcbiAgICAgIHJldHVybiBNQVhfU0FGRV9JTlRFR0VSO1xuICAgIH0sXG4gICAgZ2V0IE1JTl9TQUZFX0lOVEVHRVIoKSB7XG4gICAgICByZXR1cm4gTUlOX1NBRkVfSU5URUdFUjtcbiAgICB9LFxuICAgIGdldCBFUFNJTE9OKCkge1xuICAgICAgcmV0dXJuIEVQU0lMT047XG4gICAgfSxcbiAgICBnZXQgaXNGaW5pdGUoKSB7XG4gICAgICByZXR1cm4gTnVtYmVySXNGaW5pdGU7XG4gICAgfSxcbiAgICBnZXQgaXNJbnRlZ2VyKCkge1xuICAgICAgcmV0dXJuIGlzSW50ZWdlcjtcbiAgICB9LFxuICAgIGdldCBpc05hTigpIHtcbiAgICAgIHJldHVybiBOdW1iZXJJc05hTjtcbiAgICB9LFxuICAgIGdldCBpc1NhZmVJbnRlZ2VyKCkge1xuICAgICAgcmV0dXJuIGlzU2FmZUludGVnZXI7XG4gICAgfSxcbiAgICBnZXQgcG9seWZpbGxOdW1iZXIoKSB7XG4gICAgICByZXR1cm4gcG9seWZpbGxOdW1iZXI7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvTnVtYmVyLmpzXCIgKyAnJyk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9wb2x5ZmlsbHMuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvcG9seWZpbGxzLmpzXCI7XG4gIHZhciBwb2x5ZmlsbEFsbCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKS5wb2x5ZmlsbEFsbDtcbiAgcG9seWZpbGxBbGwoUmVmbGVjdC5nbG9iYWwpO1xuICB2YXIgc2V0dXBHbG9iYWxzID0gJHRyYWNldXJSdW50aW1lLnNldHVwR2xvYmFscztcbiAgJHRyYWNldXJSdW50aW1lLnNldHVwR2xvYmFscyA9IGZ1bmN0aW9uKGdsb2JhbCkge1xuICAgIHNldHVwR2xvYmFscyhnbG9iYWwpO1xuICAgIHBvbHlmaWxsQWxsKGdsb2JhbCk7XG4gIH07XG4gIHJldHVybiB7fTtcbn0pO1xuU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3BvbHlmaWxscy5qc1wiICsgJycpO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIjFZaVo1U1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyByZXNvbHZlcyAuIGFuZCAuLiBlbGVtZW50cyBpbiBhIHBhdGggYXJyYXkgd2l0aCBkaXJlY3RvcnkgbmFtZXMgdGhlcmVcbi8vIG11c3QgYmUgbm8gc2xhc2hlcywgZW1wdHkgZWxlbWVudHMsIG9yIGRldmljZSBuYW1lcyAoYzpcXCkgaW4gdGhlIGFycmF5XG4vLyAoc28gYWxzbyBubyBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIC0gaXQgZG9lcyBub3QgZGlzdGluZ3Vpc2hcbi8vIHJlbGF0aXZlIGFuZCBhYnNvbHV0ZSBwYXRocylcbmZ1bmN0aW9uIG5vcm1hbGl6ZUFycmF5KHBhcnRzLCBhbGxvd0Fib3ZlUm9vdCkge1xuICAvLyBpZiB0aGUgcGF0aCB0cmllcyB0byBnbyBhYm92ZSB0aGUgcm9vdCwgYHVwYCBlbmRzIHVwID4gMFxuICB2YXIgdXAgPSAwO1xuICBmb3IgKHZhciBpID0gcGFydHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgbGFzdCA9IHBhcnRzW2ldO1xuICAgIGlmIChsYXN0ID09PSAnLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmIChhbGxvd0Fib3ZlUm9vdCkge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgcGFydHMudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFydHM7XG59XG5cbi8vIFNwbGl0IGEgZmlsZW5hbWUgaW50byBbcm9vdCwgZGlyLCBiYXNlbmFtZSwgZXh0XSwgdW5peCB2ZXJzaW9uXG4vLyAncm9vdCcgaXMganVzdCBhIHNsYXNoLCBvciBub3RoaW5nLlxudmFyIHNwbGl0UGF0aFJlID1cbiAgICAvXihcXC8/fCkoW1xcc1xcU10qPykoKD86XFwuezEsMn18W15cXC9dKz98KShcXC5bXi5cXC9dKnwpKSg/OltcXC9dKikkLztcbnZhciBzcGxpdFBhdGggPSBmdW5jdGlvbihmaWxlbmFtZSkge1xuICByZXR1cm4gc3BsaXRQYXRoUmUuZXhlYyhmaWxlbmFtZSkuc2xpY2UoMSk7XG59O1xuXG4vLyBwYXRoLnJlc29sdmUoW2Zyb20gLi4uXSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlc29sdmUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJlc29sdmVkUGF0aCA9ICcnLFxuICAgICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuXG4gIGZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSA+PSAtMSAmJiAhcmVzb2x2ZWRBYnNvbHV0ZTsgaS0tKSB7XG4gICAgdmFyIHBhdGggPSAoaSA+PSAwKSA/IGFyZ3VtZW50c1tpXSA6IHByb2Nlc3MuY3dkKCk7XG5cbiAgICAvLyBTa2lwIGVtcHR5IGFuZCBpbnZhbGlkIGVudHJpZXNcbiAgICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5yZXNvbHZlIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH0gZWxzZSBpZiAoIXBhdGgpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc29sdmVkUGF0aCA9IHBhdGggKyAnLycgKyByZXNvbHZlZFBhdGg7XG4gICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IHBhdGguY2hhckF0KDApID09PSAnLyc7XG4gIH1cblxuICAvLyBBdCB0aGlzIHBvaW50IHRoZSBwYXRoIHNob3VsZCBiZSByZXNvbHZlZCB0byBhIGZ1bGwgYWJzb2x1dGUgcGF0aCwgYnV0XG4gIC8vIGhhbmRsZSByZWxhdGl2ZSBwYXRocyB0byBiZSBzYWZlIChtaWdodCBoYXBwZW4gd2hlbiBwcm9jZXNzLmN3ZCgpIGZhaWxzKVxuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICByZXNvbHZlZFBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocmVzb2x2ZWRQYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIXJlc29sdmVkQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICByZXR1cm4gKChyZXNvbHZlZEFic29sdXRlID8gJy8nIDogJycpICsgcmVzb2x2ZWRQYXRoKSB8fCAnLic7XG59O1xuXG4vLyBwYXRoLm5vcm1hbGl6ZShwYXRoKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5ub3JtYWxpemUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBpc0Fic29sdXRlID0gZXhwb3J0cy5pc0Fic29sdXRlKHBhdGgpLFxuICAgICAgdHJhaWxpbmdTbGFzaCA9IHN1YnN0cihwYXRoLCAtMSkgPT09ICcvJztcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihwYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIWlzQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICBpZiAoIXBhdGggJiYgIWlzQWJzb2x1dGUpIHtcbiAgICBwYXRoID0gJy4nO1xuICB9XG4gIGlmIChwYXRoICYmIHRyYWlsaW5nU2xhc2gpIHtcbiAgICBwYXRoICs9ICcvJztcbiAgfVxuXG4gIHJldHVybiAoaXNBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHBhdGg7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmlzQWJzb2x1dGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5qb2luID0gZnVuY3Rpb24oKSB7XG4gIHZhciBwYXRocyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gIHJldHVybiBleHBvcnRzLm5vcm1hbGl6ZShmaWx0ZXIocGF0aHMsIGZ1bmN0aW9uKHAsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBwICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGguam9pbiBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9XG4gICAgcmV0dXJuIHA7XG4gIH0pLmpvaW4oJy8nKSk7XG59O1xuXG5cbi8vIHBhdGgucmVsYXRpdmUoZnJvbSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlbGF0aXZlID0gZnVuY3Rpb24oZnJvbSwgdG8pIHtcbiAgZnJvbSA9IGV4cG9ydHMucmVzb2x2ZShmcm9tKS5zdWJzdHIoMSk7XG4gIHRvID0gZXhwb3J0cy5yZXNvbHZlKHRvKS5zdWJzdHIoMSk7XG5cbiAgZnVuY3Rpb24gdHJpbShhcnIpIHtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoOyBzdGFydCA8IGFyci5sZW5ndGg7IHN0YXJ0KyspIHtcbiAgICAgIGlmIChhcnJbc3RhcnRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFyIGVuZCA9IGFyci5sZW5ndGggLSAxO1xuICAgIGZvciAoOyBlbmQgPj0gMDsgZW5kLS0pIHtcbiAgICAgIGlmIChhcnJbZW5kXSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChzdGFydCA+IGVuZCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBhcnIuc2xpY2Uoc3RhcnQsIGVuZCAtIHN0YXJ0ICsgMSk7XG4gIH1cblxuICB2YXIgZnJvbVBhcnRzID0gdHJpbShmcm9tLnNwbGl0KCcvJykpO1xuICB2YXIgdG9QYXJ0cyA9IHRyaW0odG8uc3BsaXQoJy8nKSk7XG5cbiAgdmFyIGxlbmd0aCA9IE1hdGgubWluKGZyb21QYXJ0cy5sZW5ndGgsIHRvUGFydHMubGVuZ3RoKTtcbiAgdmFyIHNhbWVQYXJ0c0xlbmd0aCA9IGxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChmcm9tUGFydHNbaV0gIT09IHRvUGFydHNbaV0pIHtcbiAgICAgIHNhbWVQYXJ0c0xlbmd0aCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICB2YXIgb3V0cHV0UGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IHNhbWVQYXJ0c0xlbmd0aDsgaSA8IGZyb21QYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIG91dHB1dFBhcnRzLnB1c2goJy4uJyk7XG4gIH1cblxuICBvdXRwdXRQYXJ0cyA9IG91dHB1dFBhcnRzLmNvbmNhdCh0b1BhcnRzLnNsaWNlKHNhbWVQYXJ0c0xlbmd0aCkpO1xuXG4gIHJldHVybiBvdXRwdXRQYXJ0cy5qb2luKCcvJyk7XG59O1xuXG5leHBvcnRzLnNlcCA9ICcvJztcbmV4cG9ydHMuZGVsaW1pdGVyID0gJzonO1xuXG5leHBvcnRzLmRpcm5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciByZXN1bHQgPSBzcGxpdFBhdGgocGF0aCksXG4gICAgICByb290ID0gcmVzdWx0WzBdLFxuICAgICAgZGlyID0gcmVzdWx0WzFdO1xuXG4gIGlmICghcm9vdCAmJiAhZGlyKSB7XG4gICAgLy8gTm8gZGlybmFtZSB3aGF0c29ldmVyXG4gICAgcmV0dXJuICcuJztcbiAgfVxuXG4gIGlmIChkaXIpIHtcbiAgICAvLyBJdCBoYXMgYSBkaXJuYW1lLCBzdHJpcCB0cmFpbGluZyBzbGFzaFxuICAgIGRpciA9IGRpci5zdWJzdHIoMCwgZGlyLmxlbmd0aCAtIDEpO1xuICB9XG5cbiAgcmV0dXJuIHJvb3QgKyBkaXI7XG59O1xuXG5cbmV4cG9ydHMuYmFzZW5hbWUgPSBmdW5jdGlvbihwYXRoLCBleHQpIHtcbiAgdmFyIGYgPSBzcGxpdFBhdGgocGF0aClbMl07XG4gIC8vIFRPRE86IG1ha2UgdGhpcyBjb21wYXJpc29uIGNhc2UtaW5zZW5zaXRpdmUgb24gd2luZG93cz9cbiAgaWYgKGV4dCAmJiBmLnN1YnN0cigtMSAqIGV4dC5sZW5ndGgpID09PSBleHQpIHtcbiAgICBmID0gZi5zdWJzdHIoMCwgZi5sZW5ndGggLSBleHQubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gZjtcbn07XG5cblxuZXhwb3J0cy5leHRuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gc3BsaXRQYXRoKHBhdGgpWzNdO1xufTtcblxuZnVuY3Rpb24gZmlsdGVyICh4cywgZikge1xuICAgIGlmICh4cy5maWx0ZXIpIHJldHVybiB4cy5maWx0ZXIoZik7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGYoeHNbaV0sIGksIHhzKSkgcmVzLnB1c2goeHNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuXG4vLyBTdHJpbmcucHJvdG90eXBlLnN1YnN0ciAtIG5lZ2F0aXZlIGluZGV4IGRvbid0IHdvcmsgaW4gSUU4XG52YXIgc3Vic3RyID0gJ2FiJy5zdWJzdHIoLTEpID09PSAnYidcbiAgICA/IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHsgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbikgfVxuICAgIDogZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikge1xuICAgICAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IHN0ci5sZW5ndGggKyBzdGFydDtcbiAgICAgICAgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbik7XG4gICAgfVxuO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIjFZaVo1U1wiKSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIi8qKlxuICogVHdlZW4uanMgLSBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2VcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zb2xlL3R3ZWVuLmpzXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9zb2xlL3R3ZWVuLmpzL2dyYXBocy9jb250cmlidXRvcnMgZm9yIHRoZSBmdWxsIGxpc3Qgb2YgY29udHJpYnV0b3JzLlxuICogVGhhbmsgeW91IGFsbCwgeW91J3JlIGF3ZXNvbWUhXG4gKi9cblxuLy8gRGF0ZS5ub3cgc2hpbSBmb3IgKGFoZW0pIEludGVybmV0IEV4cGxvKGR8cillclxuaWYgKCBEYXRlLm5vdyA9PT0gdW5kZWZpbmVkICkge1xuXG5cdERhdGUubm93ID0gZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIG5ldyBEYXRlKCkudmFsdWVPZigpO1xuXG5cdH07XG5cbn1cblxudmFyIFRXRUVOID0gVFdFRU4gfHwgKCBmdW5jdGlvbiAoKSB7XG5cblx0dmFyIF90d2VlbnMgPSBbXTtcblxuXHRyZXR1cm4ge1xuXG5cdFx0UkVWSVNJT046ICcxNCcsXG5cblx0XHRnZXRBbGw6IGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0cmV0dXJuIF90d2VlbnM7XG5cblx0XHR9LFxuXG5cdFx0cmVtb3ZlQWxsOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRcdF90d2VlbnMgPSBbXTtcblxuXHRcdH0sXG5cblx0XHRhZGQ6IGZ1bmN0aW9uICggdHdlZW4gKSB7XG5cblx0XHRcdF90d2VlbnMucHVzaCggdHdlZW4gKTtcblxuXHRcdH0sXG5cblx0XHRyZW1vdmU6IGZ1bmN0aW9uICggdHdlZW4gKSB7XG5cblx0XHRcdHZhciBpID0gX3R3ZWVucy5pbmRleE9mKCB0d2VlbiApO1xuXG5cdFx0XHRpZiAoIGkgIT09IC0xICkge1xuXG5cdFx0XHRcdF90d2VlbnMuc3BsaWNlKCBpLCAxICk7XG5cblx0XHRcdH1cblxuXHRcdH0sXG5cblx0XHR1cGRhdGU6IGZ1bmN0aW9uICggdGltZSApIHtcblxuXHRcdFx0aWYgKCBfdHdlZW5zLmxlbmd0aCA9PT0gMCApIHJldHVybiBmYWxzZTtcblxuXHRcdFx0dmFyIGkgPSAwO1xuXG5cdFx0XHR0aW1lID0gdGltZSAhPT0gdW5kZWZpbmVkID8gdGltZSA6ICggdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LnBlcmZvcm1hbmNlICE9PSB1bmRlZmluZWQgJiYgd2luZG93LnBlcmZvcm1hbmNlLm5vdyAhPT0gdW5kZWZpbmVkID8gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpIDogRGF0ZS5ub3coKSApO1xuXG5cdFx0XHR3aGlsZSAoIGkgPCBfdHdlZW5zLmxlbmd0aCApIHtcblxuXHRcdFx0XHRpZiAoIF90d2VlbnNbIGkgXS51cGRhdGUoIHRpbWUgKSApIHtcblxuXHRcdFx0XHRcdGkrKztcblxuXHRcdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdFx0X3R3ZWVucy5zcGxpY2UoIGksIDEgKTtcblxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cblx0XHR9XG5cdH07XG5cbn0gKSgpO1xuXG5UV0VFTi5Ud2VlbiA9IGZ1bmN0aW9uICggb2JqZWN0ICkge1xuXG5cdHZhciBfb2JqZWN0ID0gb2JqZWN0O1xuXHR2YXIgX3ZhbHVlc1N0YXJ0ID0ge307XG5cdHZhciBfdmFsdWVzRW5kID0ge307XG5cdHZhciBfdmFsdWVzU3RhcnRSZXBlYXQgPSB7fTtcblx0dmFyIF9kdXJhdGlvbiA9IDEwMDA7XG5cdHZhciBfcmVwZWF0ID0gMDtcblx0dmFyIF95b3lvID0gZmFsc2U7XG5cdHZhciBfaXNQbGF5aW5nID0gZmFsc2U7XG5cdHZhciBfcmV2ZXJzZWQgPSBmYWxzZTtcblx0dmFyIF9kZWxheVRpbWUgPSAwO1xuXHR2YXIgX3N0YXJ0VGltZSA9IG51bGw7XG5cdHZhciBfZWFzaW5nRnVuY3Rpb24gPSBUV0VFTi5FYXNpbmcuTGluZWFyLk5vbmU7XG5cdHZhciBfaW50ZXJwb2xhdGlvbkZ1bmN0aW9uID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5MaW5lYXI7XG5cdHZhciBfY2hhaW5lZFR3ZWVucyA9IFtdO1xuXHR2YXIgX29uU3RhcnRDYWxsYmFjayA9IG51bGw7XG5cdHZhciBfb25TdGFydENhbGxiYWNrRmlyZWQgPSBmYWxzZTtcblx0dmFyIF9vblVwZGF0ZUNhbGxiYWNrID0gbnVsbDtcblx0dmFyIF9vbkNvbXBsZXRlQ2FsbGJhY2sgPSBudWxsO1xuXHR2YXIgX29uU3RvcENhbGxiYWNrID0gbnVsbDtcblxuXHQvLyBTZXQgYWxsIHN0YXJ0aW5nIHZhbHVlcyBwcmVzZW50IG9uIHRoZSB0YXJnZXQgb2JqZWN0XG5cdGZvciAoIHZhciBmaWVsZCBpbiBvYmplY3QgKSB7XG5cblx0XHRfdmFsdWVzU3RhcnRbIGZpZWxkIF0gPSBwYXJzZUZsb2F0KG9iamVjdFtmaWVsZF0sIDEwKTtcblxuXHR9XG5cblx0dGhpcy50byA9IGZ1bmN0aW9uICggcHJvcGVydGllcywgZHVyYXRpb24gKSB7XG5cblx0XHRpZiAoIGR1cmF0aW9uICE9PSB1bmRlZmluZWQgKSB7XG5cblx0XHRcdF9kdXJhdGlvbiA9IGR1cmF0aW9uO1xuXG5cdFx0fVxuXG5cdFx0X3ZhbHVlc0VuZCA9IHByb3BlcnRpZXM7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuc3RhcnQgPSBmdW5jdGlvbiAoIHRpbWUgKSB7XG5cblx0XHRUV0VFTi5hZGQoIHRoaXMgKTtcblxuXHRcdF9pc1BsYXlpbmcgPSB0cnVlO1xuXG5cdFx0X29uU3RhcnRDYWxsYmFja0ZpcmVkID0gZmFsc2U7XG5cblx0XHRfc3RhcnRUaW1lID0gdGltZSAhPT0gdW5kZWZpbmVkID8gdGltZSA6ICggdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LnBlcmZvcm1hbmNlICE9PSB1bmRlZmluZWQgJiYgd2luZG93LnBlcmZvcm1hbmNlLm5vdyAhPT0gdW5kZWZpbmVkID8gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpIDogRGF0ZS5ub3coKSApO1xuXHRcdF9zdGFydFRpbWUgKz0gX2RlbGF5VGltZTtcblxuXHRcdGZvciAoIHZhciBwcm9wZXJ0eSBpbiBfdmFsdWVzRW5kICkge1xuXG5cdFx0XHQvLyBjaGVjayBpZiBhbiBBcnJheSB3YXMgcHJvdmlkZWQgYXMgcHJvcGVydHkgdmFsdWVcblx0XHRcdGlmICggX3ZhbHVlc0VuZFsgcHJvcGVydHkgXSBpbnN0YW5jZW9mIEFycmF5ICkge1xuXG5cdFx0XHRcdGlmICggX3ZhbHVlc0VuZFsgcHJvcGVydHkgXS5sZW5ndGggPT09IDAgKSB7XG5cblx0XHRcdFx0XHRjb250aW51ZTtcblxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gY3JlYXRlIGEgbG9jYWwgY29weSBvZiB0aGUgQXJyYXkgd2l0aCB0aGUgc3RhcnQgdmFsdWUgYXQgdGhlIGZyb250XG5cdFx0XHRcdF92YWx1ZXNFbmRbIHByb3BlcnR5IF0gPSBbIF9vYmplY3RbIHByb3BlcnR5IF0gXS5jb25jYXQoIF92YWx1ZXNFbmRbIHByb3BlcnR5IF0gKTtcblxuXHRcdFx0fVxuXG5cdFx0XHRfdmFsdWVzU3RhcnRbIHByb3BlcnR5IF0gPSBfb2JqZWN0WyBwcm9wZXJ0eSBdO1xuXG5cdFx0XHRpZiggKCBfdmFsdWVzU3RhcnRbIHByb3BlcnR5IF0gaW5zdGFuY2VvZiBBcnJheSApID09PSBmYWxzZSApIHtcblx0XHRcdFx0X3ZhbHVlc1N0YXJ0WyBwcm9wZXJ0eSBdICo9IDEuMDsgLy8gRW5zdXJlcyB3ZSdyZSB1c2luZyBudW1iZXJzLCBub3Qgc3RyaW5nc1xuXHRcdFx0fVxuXG5cdFx0XHRfdmFsdWVzU3RhcnRSZXBlYXRbIHByb3BlcnR5IF0gPSBfdmFsdWVzU3RhcnRbIHByb3BlcnR5IF0gfHwgMDtcblxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5zdG9wID0gZnVuY3Rpb24gKCkge1xuXG5cdFx0aWYgKCAhX2lzUGxheWluZyApIHtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblxuXHRcdFRXRUVOLnJlbW92ZSggdGhpcyApO1xuXHRcdF9pc1BsYXlpbmcgPSBmYWxzZTtcblxuXHRcdGlmICggX29uU3RvcENhbGxiYWNrICE9PSBudWxsICkge1xuXG5cdFx0XHRfb25TdG9wQ2FsbGJhY2suY2FsbCggX29iamVjdCApO1xuXG5cdFx0fVxuXG5cdFx0dGhpcy5zdG9wQ2hhaW5lZFR3ZWVucygpO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5zdG9wQ2hhaW5lZFR3ZWVucyA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdGZvciAoIHZhciBpID0gMCwgbnVtQ2hhaW5lZFR3ZWVucyA9IF9jaGFpbmVkVHdlZW5zLmxlbmd0aDsgaSA8IG51bUNoYWluZWRUd2VlbnM7IGkrKyApIHtcblxuXHRcdFx0X2NoYWluZWRUd2VlbnNbIGkgXS5zdG9wKCk7XG5cblx0XHR9XG5cblx0fTtcblxuXHR0aGlzLmRlbGF5ID0gZnVuY3Rpb24gKCBhbW91bnQgKSB7XG5cblx0XHRfZGVsYXlUaW1lID0gYW1vdW50O1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5yZXBlYXQgPSBmdW5jdGlvbiAoIHRpbWVzICkge1xuXG5cdFx0X3JlcGVhdCA9IHRpbWVzO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy55b3lvID0gZnVuY3Rpb24oIHlveW8gKSB7XG5cblx0XHRfeW95byA9IHlveW87XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXG5cdHRoaXMuZWFzaW5nID0gZnVuY3Rpb24gKCBlYXNpbmcgKSB7XG5cblx0XHRfZWFzaW5nRnVuY3Rpb24gPSBlYXNpbmc7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLmludGVycG9sYXRpb24gPSBmdW5jdGlvbiAoIGludGVycG9sYXRpb24gKSB7XG5cblx0XHRfaW50ZXJwb2xhdGlvbkZ1bmN0aW9uID0gaW50ZXJwb2xhdGlvbjtcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuY2hhaW4gPSBmdW5jdGlvbiAoKSB7XG5cblx0XHRfY2hhaW5lZFR3ZWVucyA9IGFyZ3VtZW50cztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMub25TdGFydCA9IGZ1bmN0aW9uICggY2FsbGJhY2sgKSB7XG5cblx0XHRfb25TdGFydENhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLm9uVXBkYXRlID0gZnVuY3Rpb24gKCBjYWxsYmFjayApIHtcblxuXHRcdF9vblVwZGF0ZUNhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLm9uQ29tcGxldGUgPSBmdW5jdGlvbiAoIGNhbGxiYWNrICkge1xuXG5cdFx0X29uQ29tcGxldGVDYWxsYmFjayA9IGNhbGxiYWNrO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vblN0b3AgPSBmdW5jdGlvbiAoIGNhbGxiYWNrICkge1xuXG5cdFx0X29uU3RvcENhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uICggdGltZSApIHtcblxuXHRcdHZhciBwcm9wZXJ0eTtcblxuXHRcdGlmICggdGltZSA8IF9zdGFydFRpbWUgKSB7XG5cblx0XHRcdHJldHVybiB0cnVlO1xuXG5cdFx0fVxuXG5cdFx0aWYgKCBfb25TdGFydENhbGxiYWNrRmlyZWQgPT09IGZhbHNlICkge1xuXG5cdFx0XHRpZiAoIF9vblN0YXJ0Q2FsbGJhY2sgIT09IG51bGwgKSB7XG5cblx0XHRcdFx0X29uU3RhcnRDYWxsYmFjay5jYWxsKCBfb2JqZWN0ICk7XG5cblx0XHRcdH1cblxuXHRcdFx0X29uU3RhcnRDYWxsYmFja0ZpcmVkID0gdHJ1ZTtcblxuXHRcdH1cblxuXHRcdHZhciBlbGFwc2VkID0gKCB0aW1lIC0gX3N0YXJ0VGltZSApIC8gX2R1cmF0aW9uO1xuXHRcdGVsYXBzZWQgPSBlbGFwc2VkID4gMSA/IDEgOiBlbGFwc2VkO1xuXG5cdFx0dmFyIHZhbHVlID0gX2Vhc2luZ0Z1bmN0aW9uKCBlbGFwc2VkICk7XG5cblx0XHRmb3IgKCBwcm9wZXJ0eSBpbiBfdmFsdWVzRW5kICkge1xuXG5cdFx0XHR2YXIgc3RhcnQgPSBfdmFsdWVzU3RhcnRbIHByb3BlcnR5IF0gfHwgMDtcblx0XHRcdHZhciBlbmQgPSBfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdO1xuXG5cdFx0XHRpZiAoIGVuZCBpbnN0YW5jZW9mIEFycmF5ICkge1xuXG5cdFx0XHRcdF9vYmplY3RbIHByb3BlcnR5IF0gPSBfaW50ZXJwb2xhdGlvbkZ1bmN0aW9uKCBlbmQsIHZhbHVlICk7XG5cblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0Ly8gUGFyc2VzIHJlbGF0aXZlIGVuZCB2YWx1ZXMgd2l0aCBzdGFydCBhcyBiYXNlIChlLmcuOiArMTAsIC0zKVxuXHRcdFx0XHRpZiAoIHR5cGVvZihlbmQpID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0XHRcdGVuZCA9IHN0YXJ0ICsgcGFyc2VGbG9hdChlbmQsIDEwKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIHByb3RlY3QgYWdhaW5zdCBub24gbnVtZXJpYyBwcm9wZXJ0aWVzLlxuXHRcdFx0XHRpZiAoIHR5cGVvZihlbmQpID09PSBcIm51bWJlclwiICkge1xuXHRcdFx0XHRcdF9vYmplY3RbIHByb3BlcnR5IF0gPSBzdGFydCArICggZW5kIC0gc3RhcnQgKSAqIHZhbHVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdGlmICggX29uVXBkYXRlQ2FsbGJhY2sgIT09IG51bGwgKSB7XG5cblx0XHRcdF9vblVwZGF0ZUNhbGxiYWNrLmNhbGwoIF9vYmplY3QsIHZhbHVlICk7XG5cblx0XHR9XG5cblx0XHRpZiAoIGVsYXBzZWQgPT0gMSApIHtcblxuXHRcdFx0aWYgKCBfcmVwZWF0ID4gMCApIHtcblxuXHRcdFx0XHRpZiggaXNGaW5pdGUoIF9yZXBlYXQgKSApIHtcblx0XHRcdFx0XHRfcmVwZWF0LS07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyByZWFzc2lnbiBzdGFydGluZyB2YWx1ZXMsIHJlc3RhcnQgYnkgbWFraW5nIHN0YXJ0VGltZSA9IG5vd1xuXHRcdFx0XHRmb3IoIHByb3BlcnR5IGluIF92YWx1ZXNTdGFydFJlcGVhdCApIHtcblxuXHRcdFx0XHRcdGlmICggdHlwZW9mKCBfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdICkgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRcdFx0XHRfdmFsdWVzU3RhcnRSZXBlYXRbIHByb3BlcnR5IF0gPSBfdmFsdWVzU3RhcnRSZXBlYXRbIHByb3BlcnR5IF0gKyBwYXJzZUZsb2F0KF92YWx1ZXNFbmRbIHByb3BlcnR5IF0sIDEwKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoX3lveW8pIHtcblx0XHRcdFx0XHRcdHZhciB0bXAgPSBfdmFsdWVzU3RhcnRSZXBlYXRbIHByb3BlcnR5IF07XG5cdFx0XHRcdFx0XHRfdmFsdWVzU3RhcnRSZXBlYXRbIHByb3BlcnR5IF0gPSBfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdO1xuXHRcdFx0XHRcdFx0X3ZhbHVlc0VuZFsgcHJvcGVydHkgXSA9IHRtcDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRfdmFsdWVzU3RhcnRbIHByb3BlcnR5IF0gPSBfdmFsdWVzU3RhcnRSZXBlYXRbIHByb3BlcnR5IF07XG5cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChfeW95bykge1xuXHRcdFx0XHRcdF9yZXZlcnNlZCA9ICFfcmV2ZXJzZWQ7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRfc3RhcnRUaW1lID0gdGltZSArIF9kZWxheVRpbWU7XG5cblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0aWYgKCBfb25Db21wbGV0ZUNhbGxiYWNrICE9PSBudWxsICkge1xuXG5cdFx0XHRcdFx0X29uQ29tcGxldGVDYWxsYmFjay5jYWxsKCBfb2JqZWN0ICk7XG5cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZvciAoIHZhciBpID0gMCwgbnVtQ2hhaW5lZFR3ZWVucyA9IF9jaGFpbmVkVHdlZW5zLmxlbmd0aDsgaSA8IG51bUNoYWluZWRUd2VlbnM7IGkrKyApIHtcblxuXHRcdFx0XHRcdF9jaGFpbmVkVHdlZW5zWyBpIF0uc3RhcnQoIHRpbWUgKTtcblxuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblxuXHR9O1xuXG59O1xuXG5cblRXRUVOLkVhc2luZyA9IHtcblxuXHRMaW5lYXI6IHtcblxuXHRcdE5vbmU6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGs7XG5cblx0XHR9XG5cblx0fSxcblxuXHRRdWFkcmF0aWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBrICogaztcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGsgKiAoIDIgLSBrICk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSApIHJldHVybiAwLjUgKiBrICogaztcblx0XHRcdHJldHVybiAtIDAuNSAqICggLS1rICogKCBrIC0gMiApIC0gMSApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Q3ViaWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBrICogayAqIGs7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiAtLWsgKiBrICogayArIDE7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSApIHJldHVybiAwLjUgKiBrICogayAqIGs7XG5cdFx0XHRyZXR1cm4gMC41ICogKCAoIGsgLT0gMiApICogayAqIGsgKyAyICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRRdWFydGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gayAqIGsgKiBrICogaztcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIDEgLSAoIC0tayAqIGsgKiBrICogayApO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdGlmICggKCBrICo9IDIgKSA8IDEpIHJldHVybiAwLjUgKiBrICogayAqIGsgKiBrO1xuXHRcdFx0cmV0dXJuIC0gMC41ICogKCAoIGsgLT0gMiApICogayAqIGsgKiBrIC0gMiApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0UXVpbnRpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrICogayAqIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gLS1rICogayAqIGsgKiBrICogayArIDE7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSApIHJldHVybiAwLjUgKiBrICogayAqIGsgKiBrICogaztcblx0XHRcdHJldHVybiAwLjUgKiAoICggayAtPSAyICkgKiBrICogayAqIGsgKiBrICsgMiApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0U2ludXNvaWRhbDoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIDEgLSBNYXRoLmNvcyggayAqIE1hdGguUEkgLyAyICk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBNYXRoLnNpbiggayAqIE1hdGguUEkgLyAyICk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIDAuNSAqICggMSAtIE1hdGguY29zKCBNYXRoLlBJICogayApICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRFeHBvbmVudGlhbDoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGsgPT09IDAgPyAwIDogTWF0aC5wb3coIDEwMjQsIGsgLSAxICk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBrID09PSAxID8gMSA6IDEgLSBNYXRoLnBvdyggMiwgLSAxMCAqIGsgKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoIGsgPT09IDAgKSByZXR1cm4gMDtcblx0XHRcdGlmICggayA9PT0gMSApIHJldHVybiAxO1xuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSApIHJldHVybiAwLjUgKiBNYXRoLnBvdyggMTAyNCwgayAtIDEgKTtcblx0XHRcdHJldHVybiAwLjUgKiAoIC0gTWF0aC5wb3coIDIsIC0gMTAgKiAoIGsgLSAxICkgKSArIDIgKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdENpcmN1bGFyOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gMSAtIE1hdGguc3FydCggMSAtIGsgKiBrICk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBNYXRoLnNxcnQoIDEgLSAoIC0tayAqIGsgKSApO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdGlmICggKCBrICo9IDIgKSA8IDEpIHJldHVybiAtIDAuNSAqICggTWF0aC5zcXJ0KCAxIC0gayAqIGspIC0gMSk7XG5cdFx0XHRyZXR1cm4gMC41ICogKCBNYXRoLnNxcnQoIDEgLSAoIGsgLT0gMikgKiBrKSArIDEpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0RWxhc3RpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0dmFyIHMsIGEgPSAwLjEsIHAgPSAwLjQ7XG5cdFx0XHRpZiAoIGsgPT09IDAgKSByZXR1cm4gMDtcblx0XHRcdGlmICggayA9PT0gMSApIHJldHVybiAxO1xuXHRcdFx0aWYgKCAhYSB8fCBhIDwgMSApIHsgYSA9IDE7IHMgPSBwIC8gNDsgfVxuXHRcdFx0ZWxzZSBzID0gcCAqIE1hdGguYXNpbiggMSAvIGEgKSAvICggMiAqIE1hdGguUEkgKTtcblx0XHRcdHJldHVybiAtICggYSAqIE1hdGgucG93KCAyLCAxMCAqICggayAtPSAxICkgKSAqIE1hdGguc2luKCAoIGsgLSBzICkgKiAoIDIgKiBNYXRoLlBJICkgLyBwICkgKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0dmFyIHMsIGEgPSAwLjEsIHAgPSAwLjQ7XG5cdFx0XHRpZiAoIGsgPT09IDAgKSByZXR1cm4gMDtcblx0XHRcdGlmICggayA9PT0gMSApIHJldHVybiAxO1xuXHRcdFx0aWYgKCAhYSB8fCBhIDwgMSApIHsgYSA9IDE7IHMgPSBwIC8gNDsgfVxuXHRcdFx0ZWxzZSBzID0gcCAqIE1hdGguYXNpbiggMSAvIGEgKSAvICggMiAqIE1hdGguUEkgKTtcblx0XHRcdHJldHVybiAoIGEgKiBNYXRoLnBvdyggMiwgLSAxMCAqIGspICogTWF0aC5zaW4oICggayAtIHMgKSAqICggMiAqIE1hdGguUEkgKSAvIHAgKSArIDEgKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHR2YXIgcywgYSA9IDAuMSwgcCA9IDAuNDtcblx0XHRcdGlmICggayA9PT0gMCApIHJldHVybiAwO1xuXHRcdFx0aWYgKCBrID09PSAxICkgcmV0dXJuIDE7XG5cdFx0XHRpZiAoICFhIHx8IGEgPCAxICkgeyBhID0gMTsgcyA9IHAgLyA0OyB9XG5cdFx0XHRlbHNlIHMgPSBwICogTWF0aC5hc2luKCAxIC8gYSApIC8gKCAyICogTWF0aC5QSSApO1xuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSApIHJldHVybiAtIDAuNSAqICggYSAqIE1hdGgucG93KCAyLCAxMCAqICggayAtPSAxICkgKSAqIE1hdGguc2luKCAoIGsgLSBzICkgKiAoIDIgKiBNYXRoLlBJICkgLyBwICkgKTtcblx0XHRcdHJldHVybiBhICogTWF0aC5wb3coIDIsIC0xMCAqICggayAtPSAxICkgKSAqIE1hdGguc2luKCAoIGsgLSBzICkgKiAoIDIgKiBNYXRoLlBJICkgLyBwICkgKiAwLjUgKyAxO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0QmFjazoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0dmFyIHMgPSAxLjcwMTU4O1xuXHRcdFx0cmV0dXJuIGsgKiBrICogKCAoIHMgKyAxICkgKiBrIC0gcyApO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHR2YXIgcyA9IDEuNzAxNTg7XG5cdFx0XHRyZXR1cm4gLS1rICogayAqICggKCBzICsgMSApICogayArIHMgKSArIDE7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0dmFyIHMgPSAxLjcwMTU4ICogMS41MjU7XG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIDAuNSAqICggayAqIGsgKiAoICggcyArIDEgKSAqIGsgLSBzICkgKTtcblx0XHRcdHJldHVybiAwLjUgKiAoICggayAtPSAyICkgKiBrICogKCAoIHMgKyAxICkgKiBrICsgcyApICsgMiApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Qm91bmNlOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gMSAtIFRXRUVOLkVhc2luZy5Cb3VuY2UuT3V0KCAxIC0gayApO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoIGsgPCAoIDEgLyAyLjc1ICkgKSB7XG5cblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqIGsgKiBrO1xuXG5cdFx0XHR9IGVsc2UgaWYgKCBrIDwgKCAyIC8gMi43NSApICkge1xuXG5cdFx0XHRcdHJldHVybiA3LjU2MjUgKiAoIGsgLT0gKCAxLjUgLyAyLjc1ICkgKSAqIGsgKyAwLjc1O1xuXG5cdFx0XHR9IGVsc2UgaWYgKCBrIDwgKCAyLjUgLyAyLjc1ICkgKSB7XG5cblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqICggayAtPSAoIDIuMjUgLyAyLjc1ICkgKSAqIGsgKyAwLjkzNzU7XG5cblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqICggayAtPSAoIDIuNjI1IC8gMi43NSApICkgKiBrICsgMC45ODQzNzU7XG5cblx0XHRcdH1cblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoIGsgPCAwLjUgKSByZXR1cm4gVFdFRU4uRWFzaW5nLkJvdW5jZS5JbiggayAqIDIgKSAqIDAuNTtcblx0XHRcdHJldHVybiBUV0VFTi5FYXNpbmcuQm91bmNlLk91dCggayAqIDIgLSAxICkgKiAwLjUgKyAwLjU7XG5cblx0XHR9XG5cblx0fVxuXG59O1xuXG5UV0VFTi5JbnRlcnBvbGF0aW9uID0ge1xuXG5cdExpbmVhcjogZnVuY3Rpb24gKCB2LCBrICkge1xuXG5cdFx0dmFyIG0gPSB2Lmxlbmd0aCAtIDEsIGYgPSBtICogaywgaSA9IE1hdGguZmxvb3IoIGYgKSwgZm4gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkxpbmVhcjtcblxuXHRcdGlmICggayA8IDAgKSByZXR1cm4gZm4oIHZbIDAgXSwgdlsgMSBdLCBmICk7XG5cdFx0aWYgKCBrID4gMSApIHJldHVybiBmbiggdlsgbSBdLCB2WyBtIC0gMSBdLCBtIC0gZiApO1xuXG5cdFx0cmV0dXJuIGZuKCB2WyBpIF0sIHZbIGkgKyAxID4gbSA/IG0gOiBpICsgMSBdLCBmIC0gaSApO1xuXG5cdH0sXG5cblx0QmV6aWVyOiBmdW5jdGlvbiAoIHYsIGsgKSB7XG5cblx0XHR2YXIgYiA9IDAsIG4gPSB2Lmxlbmd0aCAtIDEsIHB3ID0gTWF0aC5wb3csIGJuID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5VdGlscy5CZXJuc3RlaW4sIGk7XG5cblx0XHRmb3IgKCBpID0gMDsgaSA8PSBuOyBpKysgKSB7XG5cdFx0XHRiICs9IHB3KCAxIC0gaywgbiAtIGkgKSAqIHB3KCBrLCBpICkgKiB2WyBpIF0gKiBibiggbiwgaSApO1xuXHRcdH1cblxuXHRcdHJldHVybiBiO1xuXG5cdH0sXG5cblx0Q2F0bXVsbFJvbTogZnVuY3Rpb24gKCB2LCBrICkge1xuXG5cdFx0dmFyIG0gPSB2Lmxlbmd0aCAtIDEsIGYgPSBtICogaywgaSA9IE1hdGguZmxvb3IoIGYgKSwgZm4gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkNhdG11bGxSb207XG5cblx0XHRpZiAoIHZbIDAgXSA9PT0gdlsgbSBdICkge1xuXG5cdFx0XHRpZiAoIGsgPCAwICkgaSA9IE1hdGguZmxvb3IoIGYgPSBtICogKCAxICsgayApICk7XG5cblx0XHRcdHJldHVybiBmbiggdlsgKCBpIC0gMSArIG0gKSAlIG0gXSwgdlsgaSBdLCB2WyAoIGkgKyAxICkgJSBtIF0sIHZbICggaSArIDIgKSAlIG0gXSwgZiAtIGkgKTtcblxuXHRcdH0gZWxzZSB7XG5cblx0XHRcdGlmICggayA8IDAgKSByZXR1cm4gdlsgMCBdIC0gKCBmbiggdlsgMCBdLCB2WyAwIF0sIHZbIDEgXSwgdlsgMSBdLCAtZiApIC0gdlsgMCBdICk7XG5cdFx0XHRpZiAoIGsgPiAxICkgcmV0dXJuIHZbIG0gXSAtICggZm4oIHZbIG0gXSwgdlsgbSBdLCB2WyBtIC0gMSBdLCB2WyBtIC0gMSBdLCBmIC0gbSApIC0gdlsgbSBdICk7XG5cblx0XHRcdHJldHVybiBmbiggdlsgaSA/IGkgLSAxIDogMCBdLCB2WyBpIF0sIHZbIG0gPCBpICsgMSA/IG0gOiBpICsgMSBdLCB2WyBtIDwgaSArIDIgPyBtIDogaSArIDIgXSwgZiAtIGkgKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdFV0aWxzOiB7XG5cblx0XHRMaW5lYXI6IGZ1bmN0aW9uICggcDAsIHAxLCB0ICkge1xuXG5cdFx0XHRyZXR1cm4gKCBwMSAtIHAwICkgKiB0ICsgcDA7XG5cblx0XHR9LFxuXG5cdFx0QmVybnN0ZWluOiBmdW5jdGlvbiAoIG4gLCBpICkge1xuXG5cdFx0XHR2YXIgZmMgPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkZhY3RvcmlhbDtcblx0XHRcdHJldHVybiBmYyggbiApIC8gZmMoIGkgKSAvIGZjKCBuIC0gaSApO1xuXG5cdFx0fSxcblxuXHRcdEZhY3RvcmlhbDogKCBmdW5jdGlvbiAoKSB7XG5cblx0XHRcdHZhciBhID0gWyAxIF07XG5cblx0XHRcdHJldHVybiBmdW5jdGlvbiAoIG4gKSB7XG5cblx0XHRcdFx0dmFyIHMgPSAxLCBpO1xuXHRcdFx0XHRpZiAoIGFbIG4gXSApIHJldHVybiBhWyBuIF07XG5cdFx0XHRcdGZvciAoIGkgPSBuOyBpID4gMTsgaS0tICkgcyAqPSBpO1xuXHRcdFx0XHRyZXR1cm4gYVsgbiBdID0gcztcblxuXHRcdFx0fTtcblxuXHRcdH0gKSgpLFxuXG5cdFx0Q2F0bXVsbFJvbTogZnVuY3Rpb24gKCBwMCwgcDEsIHAyLCBwMywgdCApIHtcblxuXHRcdFx0dmFyIHYwID0gKCBwMiAtIHAwICkgKiAwLjUsIHYxID0gKCBwMyAtIHAxICkgKiAwLjUsIHQyID0gdCAqIHQsIHQzID0gdCAqIHQyO1xuXHRcdFx0cmV0dXJuICggMiAqIHAxIC0gMiAqIHAyICsgdjAgKyB2MSApICogdDMgKyAoIC0gMyAqIHAxICsgMyAqIHAyIC0gMiAqIHYwIC0gdjEgKSAqIHQyICsgdjAgKiB0ICsgcDE7XG5cblx0XHR9XG5cblx0fVxuXG59O1xuXG5tb2R1bGUuZXhwb3J0cz1UV0VFTjsiLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcblxuZnVuY3Rpb24gQmF0Y2hlciAoKSB7XG4gICAgdGhpcy5yZXNldCgpXG59XG5cbnZhciBCYXRjaGVyUHJvdG8gPSBCYXRjaGVyLnByb3RvdHlwZVxuXG5CYXRjaGVyUHJvdG8ucHVzaCA9IGZ1bmN0aW9uIChqb2IpIHtcbiAgICBpZiAoIWpvYi5pZCB8fCAhdGhpcy5oYXNbam9iLmlkXSkge1xuICAgICAgICB0aGlzLnF1ZXVlLnB1c2goam9iKVxuICAgICAgICB0aGlzLmhhc1tqb2IuaWRdID0gam9iXG4gICAgICAgIGlmICghdGhpcy53YWl0aW5nKSB7XG4gICAgICAgICAgICB0aGlzLndhaXRpbmcgPSB0cnVlXG4gICAgICAgICAgICB1dGlscy5uZXh0VGljayh1dGlscy5iaW5kKHRoaXMuZmx1c2gsIHRoaXMpKVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChqb2Iub3ZlcnJpZGUpIHtcbiAgICAgICAgdmFyIG9sZEpvYiA9IHRoaXMuaGFzW2pvYi5pZF1cbiAgICAgICAgb2xkSm9iLmNhbmNlbGxlZCA9IHRydWVcbiAgICAgICAgdGhpcy5xdWV1ZS5wdXNoKGpvYilcbiAgICAgICAgdGhpcy5oYXNbam9iLmlkXSA9IGpvYlxuICAgIH1cbn1cblxuQmF0Y2hlclByb3RvLmZsdXNoID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGJlZm9yZSBmbHVzaCBob29rXG4gICAgaWYgKHRoaXMuX3ByZUZsdXNoKSB0aGlzLl9wcmVGbHVzaCgpXG4gICAgLy8gZG8gbm90IGNhY2hlIGxlbmd0aCBiZWNhdXNlIG1vcmUgam9icyBtaWdodCBiZSBwdXNoZWRcbiAgICAvLyBhcyB3ZSBleGVjdXRlIGV4aXN0aW5nIGpvYnNcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGpvYiA9IHRoaXMucXVldWVbaV1cbiAgICAgICAgaWYgKCFqb2IuY2FuY2VsbGVkKSB7XG4gICAgICAgICAgICBqb2IuZXhlY3V0ZSgpXG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5yZXNldCgpXG59XG5cbkJhdGNoZXJQcm90by5yZXNldCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmhhcyA9IHV0aWxzLmhhc2goKVxuICAgIHRoaXMucXVldWUgPSBbXVxuICAgIHRoaXMud2FpdGluZyA9IGZhbHNlXG59XG5cbm1vZHVsZS5leHBvcnRzID0gQmF0Y2hlciIsInZhciBCYXRjaGVyICAgICAgICA9IHJlcXVpcmUoJy4vYmF0Y2hlcicpLFxuICAgIGJpbmRpbmdCYXRjaGVyID0gbmV3IEJhdGNoZXIoKSxcbiAgICBiaW5kaW5nSWQgICAgICA9IDFcblxuLyoqXG4gKiAgQmluZGluZyBjbGFzcy5cbiAqXG4gKiAgZWFjaCBwcm9wZXJ0eSBvbiB0aGUgdmlld21vZGVsIGhhcyBvbmUgY29ycmVzcG9uZGluZyBCaW5kaW5nIG9iamVjdFxuICogIHdoaWNoIGhhcyBtdWx0aXBsZSBkaXJlY3RpdmUgaW5zdGFuY2VzIG9uIHRoZSBET01cbiAqICBhbmQgbXVsdGlwbGUgY29tcHV0ZWQgcHJvcGVydHkgZGVwZW5kZW50c1xuICovXG5mdW5jdGlvbiBCaW5kaW5nIChjb21waWxlciwga2V5LCBpc0V4cCwgaXNGbikge1xuICAgIHRoaXMuaWQgPSBiaW5kaW5nSWQrK1xuICAgIHRoaXMudmFsdWUgPSB1bmRlZmluZWRcbiAgICB0aGlzLmlzRXhwID0gISFpc0V4cFxuICAgIHRoaXMuaXNGbiA9IGlzRm5cbiAgICB0aGlzLnJvb3QgPSAhdGhpcy5pc0V4cCAmJiBrZXkuaW5kZXhPZignLicpID09PSAtMVxuICAgIHRoaXMuY29tcGlsZXIgPSBjb21waWxlclxuICAgIHRoaXMua2V5ID0ga2V5XG4gICAgdGhpcy5kaXJzID0gW11cbiAgICB0aGlzLnN1YnMgPSBbXVxuICAgIHRoaXMuZGVwcyA9IFtdXG4gICAgdGhpcy51bmJvdW5kID0gZmFsc2Vcbn1cblxudmFyIEJpbmRpbmdQcm90byA9IEJpbmRpbmcucHJvdG90eXBlXG5cbi8qKlxuICogIFVwZGF0ZSB2YWx1ZSBhbmQgcXVldWUgaW5zdGFuY2UgdXBkYXRlcy5cbiAqL1xuQmluZGluZ1Byb3RvLnVwZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICghdGhpcy5pc0NvbXB1dGVkIHx8IHRoaXMuaXNGbikge1xuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgICB9XG4gICAgaWYgKHRoaXMuZGlycy5sZW5ndGggfHwgdGhpcy5zdWJzLmxlbmd0aCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgICAgYmluZGluZ0JhdGNoZXIucHVzaCh7XG4gICAgICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgICAgIGV4ZWN1dGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXNlbGYudW5ib3VuZCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGUoKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG59XG5cbi8qKlxuICogIEFjdHVhbGx5IHVwZGF0ZSB0aGUgZGlyZWN0aXZlcy5cbiAqL1xuQmluZGluZ1Byb3RvLl91cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGkgPSB0aGlzLmRpcnMubGVuZ3RoLFxuICAgICAgICB2YWx1ZSA9IHRoaXMudmFsKClcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIHRoaXMuZGlyc1tpXS4kdXBkYXRlKHZhbHVlKVxuICAgIH1cbiAgICB0aGlzLnB1YigpXG59XG5cbi8qKlxuICogIFJldHVybiB0aGUgdmFsdWF0ZWQgdmFsdWUgcmVnYXJkbGVzc1xuICogIG9mIHdoZXRoZXIgaXQgaXMgY29tcHV0ZWQgb3Igbm90XG4gKi9cbkJpbmRpbmdQcm90by52YWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNDb21wdXRlZCAmJiAhdGhpcy5pc0ZuXG4gICAgICAgID8gdGhpcy52YWx1ZS4kZ2V0KClcbiAgICAgICAgOiB0aGlzLnZhbHVlXG59XG5cbi8qKlxuICogIE5vdGlmeSBjb21wdXRlZCBwcm9wZXJ0aWVzIHRoYXQgZGVwZW5kIG9uIHRoaXMgYmluZGluZ1xuICogIHRvIHVwZGF0ZSB0aGVtc2VsdmVzXG4gKi9cbkJpbmRpbmdQcm90by5wdWIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGkgPSB0aGlzLnN1YnMubGVuZ3RoXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICB0aGlzLnN1YnNbaV0udXBkYXRlKClcbiAgICB9XG59XG5cbi8qKlxuICogIFVuYmluZCB0aGUgYmluZGluZywgcmVtb3ZlIGl0c2VsZiBmcm9tIGFsbCBvZiBpdHMgZGVwZW5kZW5jaWVzXG4gKi9cbkJpbmRpbmdQcm90by51bmJpbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gSW5kaWNhdGUgdGhpcyBoYXMgYmVlbiB1bmJvdW5kLlxuICAgIC8vIEl0J3MgcG9zc2libGUgdGhpcyBiaW5kaW5nIHdpbGwgYmUgaW5cbiAgICAvLyB0aGUgYmF0Y2hlcidzIGZsdXNoIHF1ZXVlIHdoZW4gaXRzIG93bmVyXG4gICAgLy8gY29tcGlsZXIgaGFzIGFscmVhZHkgYmVlbiBkZXN0cm95ZWQuXG4gICAgdGhpcy51bmJvdW5kID0gdHJ1ZVxuICAgIHZhciBpID0gdGhpcy5kaXJzLmxlbmd0aFxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgdGhpcy5kaXJzW2ldLiR1bmJpbmQoKVxuICAgIH1cbiAgICBpID0gdGhpcy5kZXBzLmxlbmd0aFxuICAgIHZhciBzdWJzXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICBzdWJzID0gdGhpcy5kZXBzW2ldLnN1YnNcbiAgICAgICAgdmFyIGogPSBzdWJzLmluZGV4T2YodGhpcylcbiAgICAgICAgaWYgKGogPiAtMSkgc3Vicy5zcGxpY2UoaiwgMSlcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQmluZGluZyIsInZhciBFbWl0dGVyICAgICA9IHJlcXVpcmUoJy4vZW1pdHRlcicpLFxuICAgIE9ic2VydmVyICAgID0gcmVxdWlyZSgnLi9vYnNlcnZlcicpLFxuICAgIGNvbmZpZyAgICAgID0gcmVxdWlyZSgnLi9jb25maWcnKSxcbiAgICB1dGlscyAgICAgICA9IHJlcXVpcmUoJy4vdXRpbHMnKSxcbiAgICBCaW5kaW5nICAgICA9IHJlcXVpcmUoJy4vYmluZGluZycpLFxuICAgIERpcmVjdGl2ZSAgID0gcmVxdWlyZSgnLi9kaXJlY3RpdmUnKSxcbiAgICBUZXh0UGFyc2VyICA9IHJlcXVpcmUoJy4vdGV4dC1wYXJzZXInKSxcbiAgICBEZXBzUGFyc2VyICA9IHJlcXVpcmUoJy4vZGVwcy1wYXJzZXInKSxcbiAgICBFeHBQYXJzZXIgICA9IHJlcXVpcmUoJy4vZXhwLXBhcnNlcicpLFxuICAgIFZpZXdNb2RlbCxcbiAgICBcbiAgICAvLyBjYWNoZSBtZXRob2RzXG4gICAgc2xpY2UgICAgICAgPSBbXS5zbGljZSxcbiAgICBleHRlbmQgICAgICA9IHV0aWxzLmV4dGVuZCxcbiAgICBoYXNPd24gICAgICA9ICh7fSkuaGFzT3duUHJvcGVydHksXG4gICAgZGVmICAgICAgICAgPSBPYmplY3QuZGVmaW5lUHJvcGVydHksXG5cbiAgICAvLyBob29rcyB0byByZWdpc3RlclxuICAgIGhvb2tzID0gW1xuICAgICAgICAnY3JlYXRlZCcsICdyZWFkeScsXG4gICAgICAgICdiZWZvcmVEZXN0cm95JywgJ2FmdGVyRGVzdHJveScsXG4gICAgICAgICdhdHRhY2hlZCcsICdkZXRhY2hlZCdcbiAgICBdLFxuXG4gICAgLy8gbGlzdCBvZiBwcmlvcml0eSBkaXJlY3RpdmVzXG4gICAgLy8gdGhhdCBuZWVkcyB0byBiZSBjaGVja2VkIGluIHNwZWNpZmljIG9yZGVyXG4gICAgcHJpb3JpdHlEaXJlY3RpdmVzID0gW1xuICAgICAgICAnaWYnLFxuICAgICAgICAncmVwZWF0JyxcbiAgICAgICAgJ3ZpZXcnLFxuICAgICAgICAnY29tcG9uZW50J1xuICAgIF1cblxuLyoqXG4gKiAgVGhlIERPTSBjb21waWxlclxuICogIHNjYW5zIGEgRE9NIG5vZGUgYW5kIGNvbXBpbGUgYmluZGluZ3MgZm9yIGEgVmlld01vZGVsXG4gKi9cbmZ1bmN0aW9uIENvbXBpbGVyICh2bSwgb3B0aW9ucykge1xuXG4gICAgdmFyIGNvbXBpbGVyID0gdGhpcyxcbiAgICAgICAga2V5LCBpXG5cbiAgICAvLyBkZWZhdWx0IHN0YXRlXG4gICAgY29tcGlsZXIuaW5pdCAgICAgICA9IHRydWVcbiAgICBjb21waWxlci5kZXN0cm95ZWQgID0gZmFsc2VcblxuICAgIC8vIHByb2Nlc3MgYW5kIGV4dGVuZCBvcHRpb25zXG4gICAgb3B0aW9ucyA9IGNvbXBpbGVyLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gICAgdXRpbHMucHJvY2Vzc09wdGlvbnMob3B0aW9ucylcblxuICAgIC8vIGNvcHkgY29tcGlsZXIgb3B0aW9uc1xuICAgIGV4dGVuZChjb21waWxlciwgb3B0aW9ucy5jb21waWxlck9wdGlvbnMpXG4gICAgLy8gcmVwZWF0IGluZGljYXRlcyB0aGlzIGlzIGEgdi1yZXBlYXQgaW5zdGFuY2VcbiAgICBjb21waWxlci5yZXBlYXQgICA9IGNvbXBpbGVyLnJlcGVhdCB8fCBmYWxzZVxuICAgIC8vIGV4cENhY2hlIHdpbGwgYmUgc2hhcmVkIGJldHdlZW4gdi1yZXBlYXQgaW5zdGFuY2VzXG4gICAgY29tcGlsZXIuZXhwQ2FjaGUgPSBjb21waWxlci5leHBDYWNoZSB8fCB7fVxuXG4gICAgLy8gaW5pdGlhbGl6ZSBlbGVtZW50XG4gICAgdmFyIGVsID0gY29tcGlsZXIuZWwgPSBjb21waWxlci5zZXR1cEVsZW1lbnQob3B0aW9ucylcbiAgICB1dGlscy5sb2coJ1xcbm5ldyBWTSBpbnN0YW5jZTogJyArIGVsLnRhZ05hbWUgKyAnXFxuJylcblxuICAgIC8vIHNldCBvdGhlciBjb21waWxlciBwcm9wZXJ0aWVzXG4gICAgY29tcGlsZXIudm0gICAgICAgPSBlbC52dWVfdm0gPSB2bVxuICAgIGNvbXBpbGVyLmJpbmRpbmdzID0gdXRpbHMuaGFzaCgpXG4gICAgY29tcGlsZXIuZGlycyAgICAgPSBbXVxuICAgIGNvbXBpbGVyLmRlZmVycmVkID0gW11cbiAgICBjb21waWxlci5jb21wdXRlZCA9IFtdXG4gICAgY29tcGlsZXIuY2hpbGRyZW4gPSBbXVxuICAgIGNvbXBpbGVyLmVtaXR0ZXIgID0gbmV3IEVtaXR0ZXIodm0pXG5cbiAgICAvLyBWTSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAgIC8vIHNldCBWTSBwcm9wZXJ0aWVzXG4gICAgdm0uJCAgICAgICAgID0ge31cbiAgICB2bS4kZWwgICAgICAgPSBlbFxuICAgIHZtLiRvcHRpb25zICA9IG9wdGlvbnNcbiAgICB2bS4kY29tcGlsZXIgPSBjb21waWxlclxuICAgIHZtLiRldmVudCAgICA9IG51bGxcblxuICAgIC8vIHNldCBwYXJlbnQgJiByb290XG4gICAgdmFyIHBhcmVudFZNID0gb3B0aW9ucy5wYXJlbnRcbiAgICBpZiAocGFyZW50Vk0pIHtcbiAgICAgICAgY29tcGlsZXIucGFyZW50ID0gcGFyZW50Vk0uJGNvbXBpbGVyXG4gICAgICAgIHBhcmVudFZNLiRjb21waWxlci5jaGlsZHJlbi5wdXNoKGNvbXBpbGVyKVxuICAgICAgICB2bS4kcGFyZW50ID0gcGFyZW50Vk1cbiAgICAgICAgLy8gaW5oZXJpdCBsYXp5IG9wdGlvblxuICAgICAgICBpZiAoISgnbGF6eScgaW4gb3B0aW9ucykpIHtcbiAgICAgICAgICAgIG9wdGlvbnMubGF6eSA9IGNvbXBpbGVyLnBhcmVudC5vcHRpb25zLmxhenlcbiAgICAgICAgfVxuICAgIH1cbiAgICB2bS4kcm9vdCA9IGdldFJvb3QoY29tcGlsZXIpLnZtXG5cbiAgICAvLyBEQVRBIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAgIC8vIHNldHVwIG9ic2VydmVyXG4gICAgLy8gdGhpcyBpcyBuZWNlc2FycnkgZm9yIGFsbCBob29rcyBhbmQgZGF0YSBvYnNlcnZhdGlvbiBldmVudHNcbiAgICBjb21waWxlci5zZXR1cE9ic2VydmVyKClcblxuICAgIC8vIGNyZWF0ZSBiaW5kaW5ncyBmb3IgY29tcHV0ZWQgcHJvcGVydGllc1xuICAgIGlmIChvcHRpb25zLm1ldGhvZHMpIHtcbiAgICAgICAgZm9yIChrZXkgaW4gb3B0aW9ucy5tZXRob2RzKSB7XG4gICAgICAgICAgICBjb21waWxlci5jcmVhdGVCaW5kaW5nKGtleSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGNyZWF0ZSBiaW5kaW5ncyBmb3IgbWV0aG9kc1xuICAgIGlmIChvcHRpb25zLmNvbXB1dGVkKSB7XG4gICAgICAgIGZvciAoa2V5IGluIG9wdGlvbnMuY29tcHV0ZWQpIHtcbiAgICAgICAgICAgIGNvbXBpbGVyLmNyZWF0ZUJpbmRpbmcoa2V5KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gaW5pdGlhbGl6ZSBkYXRhXG4gICAgdmFyIGRhdGEgPSBjb21waWxlci5kYXRhID0gb3B0aW9ucy5kYXRhIHx8IHt9LFxuICAgICAgICBkZWZhdWx0RGF0YSA9IG9wdGlvbnMuZGVmYXVsdERhdGFcbiAgICBpZiAoZGVmYXVsdERhdGEpIHtcbiAgICAgICAgZm9yIChrZXkgaW4gZGVmYXVsdERhdGEpIHtcbiAgICAgICAgICAgIGlmICghaGFzT3duLmNhbGwoZGF0YSwga2V5KSkge1xuICAgICAgICAgICAgICAgIGRhdGFba2V5XSA9IGRlZmF1bHREYXRhW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGNvcHkgcGFyYW1BdHRyaWJ1dGVzXG4gICAgdmFyIHBhcmFtcyA9IG9wdGlvbnMucGFyYW1BdHRyaWJ1dGVzXG4gICAgaWYgKHBhcmFtcykge1xuICAgICAgICBpID0gcGFyYW1zLmxlbmd0aFxuICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICBkYXRhW3BhcmFtc1tpXV0gPSB1dGlscy5jaGVja051bWJlcihcbiAgICAgICAgICAgICAgICBjb21waWxlci5ldmFsKFxuICAgICAgICAgICAgICAgICAgICBlbC5nZXRBdHRyaWJ1dGUocGFyYW1zW2ldKVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgIClcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGNvcHkgZGF0YSBwcm9wZXJ0aWVzIHRvIHZtXG4gICAgLy8gc28gdXNlciBjYW4gYWNjZXNzIHRoZW0gaW4gdGhlIGNyZWF0ZWQgaG9va1xuICAgIGV4dGVuZCh2bSwgZGF0YSlcbiAgICB2bS4kZGF0YSA9IGRhdGFcblxuICAgIC8vIGJlZm9yZUNvbXBpbGUgaG9va1xuICAgIGNvbXBpbGVyLmV4ZWNIb29rKCdjcmVhdGVkJylcblxuICAgIC8vIHRoZSB1c2VyIG1pZ2h0IGhhdmUgc3dhcHBlZCB0aGUgZGF0YSAuLi5cbiAgICBkYXRhID0gY29tcGlsZXIuZGF0YSA9IHZtLiRkYXRhXG5cbiAgICAvLyB1c2VyIG1pZ2h0IGFsc28gc2V0IHNvbWUgcHJvcGVydGllcyBvbiB0aGUgdm1cbiAgICAvLyBpbiB3aGljaCBjYXNlIHdlIHNob3VsZCBjb3B5IGJhY2sgdG8gJGRhdGFcbiAgICB2YXIgdm1Qcm9wXG4gICAgZm9yIChrZXkgaW4gdm0pIHtcbiAgICAgICAgdm1Qcm9wID0gdm1ba2V5XVxuICAgICAgICBpZiAoXG4gICAgICAgICAgICBrZXkuY2hhckF0KDApICE9PSAnJCcgJiZcbiAgICAgICAgICAgIGRhdGFba2V5XSAhPT0gdm1Qcm9wICYmXG4gICAgICAgICAgICB0eXBlb2Ygdm1Qcm9wICE9PSAnZnVuY3Rpb24nXG4gICAgICAgICkge1xuICAgICAgICAgICAgZGF0YVtrZXldID0gdm1Qcm9wXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBub3cgd2UgY2FuIG9ic2VydmUgdGhlIGRhdGEuXG4gICAgLy8gdGhpcyB3aWxsIGNvbnZlcnQgZGF0YSBwcm9wZXJ0aWVzIHRvIGdldHRlci9zZXR0ZXJzXG4gICAgLy8gYW5kIGVtaXQgdGhlIGZpcnN0IGJhdGNoIG9mIHNldCBldmVudHMsIHdoaWNoIHdpbGxcbiAgICAvLyBpbiB0dXJuIGNyZWF0ZSB0aGUgY29ycmVzcG9uZGluZyBiaW5kaW5ncy5cbiAgICBjb21waWxlci5vYnNlcnZlRGF0YShkYXRhKVxuXG4gICAgLy8gQ09NUElMRSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAvLyBiZWZvcmUgY29tcGlsaW5nLCByZXNvbHZlIGNvbnRlbnQgaW5zZXJ0aW9uIHBvaW50c1xuICAgIGlmIChvcHRpb25zLnRlbXBsYXRlKSB7XG4gICAgICAgIHRoaXMucmVzb2x2ZUNvbnRlbnQoKVxuICAgIH1cblxuICAgIC8vIG5vdyBwYXJzZSB0aGUgRE9NIGFuZCBiaW5kIGRpcmVjdGl2ZXMuXG4gICAgLy8gRHVyaW5nIHRoaXMgc3RhZ2UsIHdlIHdpbGwgYWxzbyBjcmVhdGUgYmluZGluZ3MgZm9yXG4gICAgLy8gZW5jb3VudGVyZWQga2V5cGF0aHMgdGhhdCBkb24ndCBoYXZlIGEgYmluZGluZyB5ZXQuXG4gICAgY29tcGlsZXIuY29tcGlsZShlbCwgdHJ1ZSlcblxuICAgIC8vIEFueSBkaXJlY3RpdmUgdGhhdCBjcmVhdGVzIGNoaWxkIFZNcyBhcmUgZGVmZXJyZWRcbiAgICAvLyBzbyB0aGF0IHdoZW4gdGhleSBhcmUgY29tcGlsZWQsIGFsbCBiaW5kaW5ncyBvbiB0aGVcbiAgICAvLyBwYXJlbnQgVk0gaGF2ZSBiZWVuIGNyZWF0ZWQuXG4gICAgaSA9IGNvbXBpbGVyLmRlZmVycmVkLmxlbmd0aFxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgY29tcGlsZXIuYmluZERpcmVjdGl2ZShjb21waWxlci5kZWZlcnJlZFtpXSlcbiAgICB9XG4gICAgY29tcGlsZXIuZGVmZXJyZWQgPSBudWxsXG5cbiAgICAvLyBleHRyYWN0IGRlcGVuZGVuY2llcyBmb3IgY29tcHV0ZWQgcHJvcGVydGllcy5cbiAgICAvLyB0aGlzIHdpbGwgZXZhbHVhdGVkIGFsbCBjb2xsZWN0ZWQgY29tcHV0ZWQgYmluZGluZ3NcbiAgICAvLyBhbmQgY29sbGVjdCBnZXQgZXZlbnRzIHRoYXQgYXJlIGVtaXR0ZWQuXG4gICAgaWYgKHRoaXMuY29tcHV0ZWQubGVuZ3RoKSB7XG4gICAgICAgIERlcHNQYXJzZXIucGFyc2UodGhpcy5jb21wdXRlZClcbiAgICB9XG5cbiAgICAvLyBkb25lIVxuICAgIGNvbXBpbGVyLmluaXQgPSBmYWxzZVxuXG4gICAgLy8gcG9zdCBjb21waWxlIC8gcmVhZHkgaG9va1xuICAgIGNvbXBpbGVyLmV4ZWNIb29rKCdyZWFkeScpXG59XG5cbnZhciBDb21waWxlclByb3RvID0gQ29tcGlsZXIucHJvdG90eXBlXG5cbi8qKlxuICogIEluaXRpYWxpemUgdGhlIFZNL0NvbXBpbGVyJ3MgZWxlbWVudC5cbiAqICBGaWxsIGl0IGluIHdpdGggdGhlIHRlbXBsYXRlIGlmIG5lY2Vzc2FyeS5cbiAqL1xuQ29tcGlsZXJQcm90by5zZXR1cEVsZW1lbnQgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIC8vIGNyZWF0ZSB0aGUgbm9kZSBmaXJzdFxuICAgIHZhciBlbCA9IHR5cGVvZiBvcHRpb25zLmVsID09PSAnc3RyaW5nJ1xuICAgICAgICA/IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Iob3B0aW9ucy5lbClcbiAgICAgICAgOiBvcHRpb25zLmVsIHx8IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQob3B0aW9ucy50YWdOYW1lIHx8ICdkaXYnKVxuXG4gICAgdmFyIHRlbXBsYXRlID0gb3B0aW9ucy50ZW1wbGF0ZSxcbiAgICAgICAgY2hpbGQsIHJlcGxhY2VyLCBpLCBhdHRyLCBhdHRyc1xuXG4gICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgIC8vIGNvbGxlY3QgYW55dGhpbmcgYWxyZWFkeSBpbiB0aGVyZVxuICAgICAgICBpZiAoZWwuaGFzQ2hpbGROb2RlcygpKSB7XG4gICAgICAgICAgICB0aGlzLnJhd0NvbnRlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgICAgICAgLyoganNoaW50IGJvc3M6IHRydWUgKi9cbiAgICAgICAgICAgIHdoaWxlIChjaGlsZCA9IGVsLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJhd0NvbnRlbnQuYXBwZW5kQ2hpbGQoY2hpbGQpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gcmVwbGFjZSBvcHRpb246IHVzZSB0aGUgZmlyc3Qgbm9kZSBpblxuICAgICAgICAvLyB0aGUgdGVtcGxhdGUgZGlyZWN0bHlcbiAgICAgICAgaWYgKG9wdGlvbnMucmVwbGFjZSAmJiB0ZW1wbGF0ZS5maXJzdENoaWxkID09PSB0ZW1wbGF0ZS5sYXN0Q2hpbGQpIHtcbiAgICAgICAgICAgIHJlcGxhY2VyID0gdGVtcGxhdGUuZmlyc3RDaGlsZC5jbG9uZU5vZGUodHJ1ZSlcbiAgICAgICAgICAgIGlmIChlbC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgZWwucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUocmVwbGFjZXIsIGVsKVxuICAgICAgICAgICAgICAgIGVsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWwpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBjb3B5IG92ZXIgYXR0cmlidXRlc1xuICAgICAgICAgICAgaWYgKGVsLmhhc0F0dHJpYnV0ZXMoKSkge1xuICAgICAgICAgICAgICAgIGkgPSBlbC5hdHRyaWJ1dGVzLmxlbmd0aFxuICAgICAgICAgICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0ciA9IGVsLmF0dHJpYnV0ZXNbaV1cbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZXIuc2V0QXR0cmlidXRlKGF0dHIubmFtZSwgYXR0ci52YWx1ZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyByZXBsYWNlXG4gICAgICAgICAgICBlbCA9IHJlcGxhY2VyXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbC5hcHBlbmRDaGlsZCh0ZW1wbGF0ZS5jbG9uZU5vZGUodHJ1ZSkpXG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIC8vIGFwcGx5IGVsZW1lbnQgb3B0aW9uc1xuICAgIGlmIChvcHRpb25zLmlkKSBlbC5pZCA9IG9wdGlvbnMuaWRcbiAgICBpZiAob3B0aW9ucy5jbGFzc05hbWUpIGVsLmNsYXNzTmFtZSA9IG9wdGlvbnMuY2xhc3NOYW1lXG4gICAgYXR0cnMgPSBvcHRpb25zLmF0dHJpYnV0ZXNcbiAgICBpZiAoYXR0cnMpIHtcbiAgICAgICAgZm9yIChhdHRyIGluIGF0dHJzKSB7XG4gICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoYXR0ciwgYXR0cnNbYXR0cl0pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZWxcbn1cblxuLyoqXG4gKiAgRGVhbCB3aXRoIDxjb250ZW50PiBpbnNlcnRpb24gcG9pbnRzXG4gKiAgcGVyIHRoZSBXZWIgQ29tcG9uZW50cyBzcGVjXG4gKi9cbkNvbXBpbGVyUHJvdG8ucmVzb2x2ZUNvbnRlbnQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgb3V0bGV0cyA9IHNsaWNlLmNhbGwodGhpcy5lbC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnY29udGVudCcpKSxcbiAgICAgICAgcmF3ID0gdGhpcy5yYXdDb250ZW50LFxuICAgICAgICBvdXRsZXQsIHNlbGVjdCwgaSwgaiwgbWFpblxuXG4gICAgaSA9IG91dGxldHMubGVuZ3RoXG4gICAgaWYgKGkpIHtcbiAgICAgICAgLy8gZmlyc3QgcGFzcywgY29sbGVjdCBjb3JyZXNwb25kaW5nIGNvbnRlbnRcbiAgICAgICAgLy8gZm9yIGVhY2ggb3V0bGV0LlxuICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICBvdXRsZXQgPSBvdXRsZXRzW2ldXG4gICAgICAgICAgICBpZiAocmF3KSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0ID0gb3V0bGV0LmdldEF0dHJpYnV0ZSgnc2VsZWN0JylcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0KSB7IC8vIHNlbGVjdCBjb250ZW50XG4gICAgICAgICAgICAgICAgICAgIG91dGxldC5jb250ZW50ID1cbiAgICAgICAgICAgICAgICAgICAgICAgIHNsaWNlLmNhbGwocmF3LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0KSlcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAvLyBkZWZhdWx0IGNvbnRlbnRcbiAgICAgICAgICAgICAgICAgICAgbWFpbiA9IG91dGxldFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7IC8vIGZhbGxiYWNrIGNvbnRlbnRcbiAgICAgICAgICAgICAgICBvdXRsZXQuY29udGVudCA9XG4gICAgICAgICAgICAgICAgICAgIHNsaWNlLmNhbGwob3V0bGV0LmNoaWxkTm9kZXMpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2Vjb25kIHBhc3MsIGFjdHVhbGx5IGluc2VydCB0aGUgY29udGVudHNcbiAgICAgICAgZm9yIChpID0gMCwgaiA9IG91dGxldHMubGVuZ3RoOyBpIDwgajsgaSsrKSB7XG4gICAgICAgICAgICBvdXRsZXQgPSBvdXRsZXRzW2ldXG4gICAgICAgICAgICBpZiAob3V0bGV0ID09PSBtYWluKSBjb250aW51ZVxuICAgICAgICAgICAgaW5zZXJ0KG91dGxldCwgb3V0bGV0LmNvbnRlbnQpXG4gICAgICAgIH1cbiAgICAgICAgLy8gZmluYWxseSBpbnNlcnQgdGhlIG1haW4gY29udGVudFxuICAgICAgICBpZiAocmF3ICYmIG1haW4pIHtcbiAgICAgICAgICAgIGluc2VydChtYWluLCBzbGljZS5jYWxsKHJhdy5jaGlsZE5vZGVzKSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc2VydCAob3V0bGV0LCBjb250ZW50cykge1xuICAgICAgICB2YXIgcGFyZW50ID0gb3V0bGV0LnBhcmVudE5vZGUsXG4gICAgICAgICAgICBpID0gMCwgaiA9IGNvbnRlbnRzLmxlbmd0aFxuICAgICAgICBmb3IgKDsgaSA8IGo7IGkrKykge1xuICAgICAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShjb250ZW50c1tpXSwgb3V0bGV0KVxuICAgICAgICB9XG4gICAgICAgIHBhcmVudC5yZW1vdmVDaGlsZChvdXRsZXQpXG4gICAgfVxuXG4gICAgdGhpcy5yYXdDb250ZW50ID0gbnVsbFxufVxuXG4vKipcbiAqICBTZXR1cCBvYnNlcnZlci5cbiAqICBUaGUgb2JzZXJ2ZXIgbGlzdGVucyBmb3IgZ2V0L3NldC9tdXRhdGUgZXZlbnRzIG9uIGFsbCBWTVxuICogIHZhbHVlcy9vYmplY3RzIGFuZCB0cmlnZ2VyIGNvcnJlc3BvbmRpbmcgYmluZGluZyB1cGRhdGVzLlxuICogIEl0IGFsc28gbGlzdGVucyBmb3IgbGlmZWN5Y2xlIGhvb2tzLlxuICovXG5Db21waWxlclByb3RvLnNldHVwT2JzZXJ2ZXIgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgY29tcGlsZXIgPSB0aGlzLFxuICAgICAgICBiaW5kaW5ncyA9IGNvbXBpbGVyLmJpbmRpbmdzLFxuICAgICAgICBvcHRpb25zICA9IGNvbXBpbGVyLm9wdGlvbnMsXG4gICAgICAgIG9ic2VydmVyID0gY29tcGlsZXIub2JzZXJ2ZXIgPSBuZXcgRW1pdHRlcihjb21waWxlci52bSlcblxuICAgIC8vIGEgaGFzaCB0byBob2xkIGV2ZW50IHByb3hpZXMgZm9yIGVhY2ggcm9vdCBsZXZlbCBrZXlcbiAgICAvLyBzbyB0aGV5IGNhbiBiZSByZWZlcmVuY2VkIGFuZCByZW1vdmVkIGxhdGVyXG4gICAgb2JzZXJ2ZXIucHJveGllcyA9IHt9XG5cbiAgICAvLyBhZGQgb3duIGxpc3RlbmVycyB3aGljaCB0cmlnZ2VyIGJpbmRpbmcgdXBkYXRlc1xuICAgIG9ic2VydmVyXG4gICAgICAgIC5vbignZ2V0Jywgb25HZXQpXG4gICAgICAgIC5vbignc2V0Jywgb25TZXQpXG4gICAgICAgIC5vbignbXV0YXRlJywgb25TZXQpXG5cbiAgICAvLyByZWdpc3RlciBob29rc1xuICAgIHZhciBpID0gaG9va3MubGVuZ3RoLCBqLCBob29rLCBmbnNcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGhvb2sgPSBob29rc1tpXVxuICAgICAgICBmbnMgPSBvcHRpb25zW2hvb2tdXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGZucykpIHtcbiAgICAgICAgICAgIGogPSBmbnMubGVuZ3RoXG4gICAgICAgICAgICAvLyBzaW5jZSBob29rcyB3ZXJlIG1lcmdlZCB3aXRoIGNoaWxkIGF0IGhlYWQsXG4gICAgICAgICAgICAvLyB3ZSBsb29wIHJldmVyc2VseS5cbiAgICAgICAgICAgIHdoaWxlIChqLS0pIHtcbiAgICAgICAgICAgICAgICByZWdpc3Rlckhvb2soaG9vaywgZm5zW2pdKVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGZucykge1xuICAgICAgICAgICAgcmVnaXN0ZXJIb29rKGhvb2ssIGZucylcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGJyb2FkY2FzdCBhdHRhY2hlZC9kZXRhY2hlZCBob29rc1xuICAgIG9ic2VydmVyXG4gICAgICAgIC5vbignaG9vazphdHRhY2hlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGJyb2FkY2FzdCgxKVxuICAgICAgICB9KVxuICAgICAgICAub24oJ2hvb2s6ZGV0YWNoZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBicm9hZGNhc3QoMClcbiAgICAgICAgfSlcblxuICAgIGZ1bmN0aW9uIG9uR2V0IChrZXkpIHtcbiAgICAgICAgY2hlY2soa2V5KVxuICAgICAgICBEZXBzUGFyc2VyLmNhdGNoZXIuZW1pdCgnZ2V0JywgYmluZGluZ3Nba2V5XSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblNldCAoa2V5LCB2YWwsIG11dGF0aW9uKSB7XG4gICAgICAgIG9ic2VydmVyLmVtaXQoJ2NoYW5nZTonICsga2V5LCB2YWwsIG11dGF0aW9uKVxuICAgICAgICBjaGVjayhrZXkpXG4gICAgICAgIGJpbmRpbmdzW2tleV0udXBkYXRlKHZhbClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWdpc3Rlckhvb2sgKGhvb2ssIGZuKSB7XG4gICAgICAgIG9ic2VydmVyLm9uKCdob29rOicgKyBob29rLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmbi5jYWxsKGNvbXBpbGVyLnZtKVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGJyb2FkY2FzdCAoZXZlbnQpIHtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gY29tcGlsZXIuY2hpbGRyZW5cbiAgICAgICAgaWYgKGNoaWxkcmVuKSB7XG4gICAgICAgICAgICB2YXIgY2hpbGQsIGkgPSBjaGlsZHJlbi5sZW5ndGhcbiAgICAgICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgICAgICBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkLmVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQgPSAnaG9vazonICsgKGV2ZW50ID8gJ2F0dGFjaGVkJyA6ICdkZXRhY2hlZCcpXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkLm9ic2VydmVyLmVtaXQoZXZlbnQpXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkLmVtaXR0ZXIuZW1pdChldmVudClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVjayAoa2V5KSB7XG4gICAgICAgIGlmICghYmluZGluZ3Nba2V5XSkge1xuICAgICAgICAgICAgY29tcGlsZXIuY3JlYXRlQmluZGluZyhrZXkpXG4gICAgICAgIH1cbiAgICB9XG59XG5cbkNvbXBpbGVyUHJvdG8ub2JzZXJ2ZURhdGEgPSBmdW5jdGlvbiAoZGF0YSkge1xuXG4gICAgdmFyIGNvbXBpbGVyID0gdGhpcyxcbiAgICAgICAgb2JzZXJ2ZXIgPSBjb21waWxlci5vYnNlcnZlclxuXG4gICAgLy8gcmVjdXJzaXZlbHkgb2JzZXJ2ZSBuZXN0ZWQgcHJvcGVydGllc1xuICAgIE9ic2VydmVyLm9ic2VydmUoZGF0YSwgJycsIG9ic2VydmVyKVxuXG4gICAgLy8gYWxzbyBjcmVhdGUgYmluZGluZyBmb3IgdG9wIGxldmVsICRkYXRhXG4gICAgLy8gc28gaXQgY2FuIGJlIHVzZWQgaW4gdGVtcGxhdGVzIHRvb1xuICAgIHZhciAkZGF0YUJpbmRpbmcgPSBjb21waWxlci5iaW5kaW5nc1snJGRhdGEnXSA9IG5ldyBCaW5kaW5nKGNvbXBpbGVyLCAnJGRhdGEnKVxuICAgICRkYXRhQmluZGluZy51cGRhdGUoZGF0YSlcblxuICAgIC8vIGFsbG93ICRkYXRhIHRvIGJlIHN3YXBwZWRcbiAgICBkZWYoY29tcGlsZXIudm0sICckZGF0YScsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb21waWxlci5vYnNlcnZlci5lbWl0KCdnZXQnLCAnJGRhdGEnKVxuICAgICAgICAgICAgcmV0dXJuIGNvbXBpbGVyLmRhdGFcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAobmV3RGF0YSkge1xuICAgICAgICAgICAgdmFyIG9sZERhdGEgPSBjb21waWxlci5kYXRhXG4gICAgICAgICAgICBPYnNlcnZlci51bm9ic2VydmUob2xkRGF0YSwgJycsIG9ic2VydmVyKVxuICAgICAgICAgICAgY29tcGlsZXIuZGF0YSA9IG5ld0RhdGFcbiAgICAgICAgICAgIE9ic2VydmVyLmNvcHlQYXRocyhuZXdEYXRhLCBvbGREYXRhKVxuICAgICAgICAgICAgT2JzZXJ2ZXIub2JzZXJ2ZShuZXdEYXRhLCAnJywgb2JzZXJ2ZXIpXG4gICAgICAgICAgICB1cGRhdGUoKVxuICAgICAgICB9XG4gICAgfSlcblxuICAgIC8vIGVtaXQgJGRhdGEgY2hhbmdlIG9uIGFsbCBjaGFuZ2VzXG4gICAgb2JzZXJ2ZXJcbiAgICAgICAgLm9uKCdzZXQnLCBvblNldClcbiAgICAgICAgLm9uKCdtdXRhdGUnLCBvblNldClcblxuICAgIGZ1bmN0aW9uIG9uU2V0IChrZXkpIHtcbiAgICAgICAgaWYgKGtleSAhPT0gJyRkYXRhJykgdXBkYXRlKClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGUgKCkge1xuICAgICAgICAkZGF0YUJpbmRpbmcudXBkYXRlKGNvbXBpbGVyLmRhdGEpXG4gICAgICAgIG9ic2VydmVyLmVtaXQoJ2NoYW5nZTokZGF0YScsIGNvbXBpbGVyLmRhdGEpXG4gICAgfVxufVxuXG4vKipcbiAqICBDb21waWxlIGEgRE9NIG5vZGUgKHJlY3Vyc2l2ZSlcbiAqL1xuQ29tcGlsZXJQcm90by5jb21waWxlID0gZnVuY3Rpb24gKG5vZGUsIHJvb3QpIHtcbiAgICB2YXIgbm9kZVR5cGUgPSBub2RlLm5vZGVUeXBlXG4gICAgaWYgKG5vZGVUeXBlID09PSAxICYmIG5vZGUudGFnTmFtZSAhPT0gJ1NDUklQVCcpIHsgLy8gYSBub3JtYWwgbm9kZVxuICAgICAgICB0aGlzLmNvbXBpbGVFbGVtZW50KG5vZGUsIHJvb3QpXG4gICAgfSBlbHNlIGlmIChub2RlVHlwZSA9PT0gMyAmJiBjb25maWcuaW50ZXJwb2xhdGUpIHtcbiAgICAgICAgdGhpcy5jb21waWxlVGV4dE5vZGUobm9kZSlcbiAgICB9XG59XG5cbi8qKlxuICogIENoZWNrIGZvciBhIHByaW9yaXR5IGRpcmVjdGl2ZVxuICogIElmIGl0IGlzIHByZXNlbnQgYW5kIHZhbGlkLCByZXR1cm4gdHJ1ZSB0byBza2lwIHRoZSByZXN0XG4gKi9cbkNvbXBpbGVyUHJvdG8uY2hlY2tQcmlvcml0eURpciA9IGZ1bmN0aW9uIChkaXJuYW1lLCBub2RlLCByb290KSB7XG4gICAgdmFyIGV4cHJlc3Npb24sIGRpcmVjdGl2ZSwgQ3RvclxuICAgIGlmIChcbiAgICAgICAgZGlybmFtZSA9PT0gJ2NvbXBvbmVudCcgJiZcbiAgICAgICAgcm9vdCAhPT0gdHJ1ZSAmJlxuICAgICAgICAoQ3RvciA9IHRoaXMucmVzb2x2ZUNvbXBvbmVudChub2RlLCB1bmRlZmluZWQsIHRydWUpKVxuICAgICkge1xuICAgICAgICBkaXJlY3RpdmUgPSB0aGlzLnBhcnNlRGlyZWN0aXZlKGRpcm5hbWUsICcnLCBub2RlKVxuICAgICAgICBkaXJlY3RpdmUuQ3RvciA9IEN0b3JcbiAgICB9IGVsc2Uge1xuICAgICAgICBleHByZXNzaW9uID0gdXRpbHMuYXR0cihub2RlLCBkaXJuYW1lKVxuICAgICAgICBkaXJlY3RpdmUgPSBleHByZXNzaW9uICYmIHRoaXMucGFyc2VEaXJlY3RpdmUoZGlybmFtZSwgZXhwcmVzc2lvbiwgbm9kZSlcbiAgICB9XG4gICAgaWYgKGRpcmVjdGl2ZSkge1xuICAgICAgICBpZiAocm9vdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgdXRpbHMud2FybihcbiAgICAgICAgICAgICAgICAnRGlyZWN0aXZlIHYtJyArIGRpcm5hbWUgKyAnIGNhbm5vdCBiZSB1c2VkIG9uIGFuIGFscmVhZHkgaW5zdGFudGlhdGVkICcgK1xuICAgICAgICAgICAgICAgICdWTVxcJ3Mgcm9vdCBub2RlLiBVc2UgaXQgZnJvbSB0aGUgcGFyZW50XFwncyB0ZW1wbGF0ZSBpbnN0ZWFkLidcbiAgICAgICAgICAgIClcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIHRoaXMuZGVmZXJyZWQucHVzaChkaXJlY3RpdmUpXG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgfVxufVxuXG4vKipcbiAqICBDb21waWxlIG5vcm1hbCBkaXJlY3RpdmVzIG9uIGEgbm9kZVxuICovXG5Db21waWxlclByb3RvLmNvbXBpbGVFbGVtZW50ID0gZnVuY3Rpb24gKG5vZGUsIHJvb3QpIHtcblxuICAgIC8vIHRleHRhcmVhIGlzIHByZXR0eSBhbm5veWluZ1xuICAgIC8vIGJlY2F1c2UgaXRzIHZhbHVlIGNyZWF0ZXMgY2hpbGROb2RlcyB3aGljaFxuICAgIC8vIHdlIGRvbid0IHdhbnQgdG8gY29tcGlsZS5cbiAgICBpZiAobm9kZS50YWdOYW1lID09PSAnVEVYVEFSRUEnICYmIG5vZGUudmFsdWUpIHtcbiAgICAgICAgbm9kZS52YWx1ZSA9IHRoaXMuZXZhbChub2RlLnZhbHVlKVxuICAgIH1cblxuICAgIC8vIG9ubHkgY29tcGlsZSBpZiB0aGlzIGVsZW1lbnQgaGFzIGF0dHJpYnV0ZXNcbiAgICAvLyBvciBpdHMgdGFnTmFtZSBjb250YWlucyBhIGh5cGhlbiAod2hpY2ggbWVhbnMgaXQgY291bGRcbiAgICAvLyBwb3RlbnRpYWxseSBiZSBhIGN1c3RvbSBlbGVtZW50KVxuICAgIGlmIChub2RlLmhhc0F0dHJpYnV0ZXMoKSB8fCBub2RlLnRhZ05hbWUuaW5kZXhPZignLScpID4gLTEpIHtcblxuICAgICAgICAvLyBza2lwIGFueXRoaW5nIHdpdGggdi1wcmVcbiAgICAgICAgaWYgKHV0aWxzLmF0dHIobm9kZSwgJ3ByZScpICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpLCBsLCBqLCBrXG5cbiAgICAgICAgLy8gY2hlY2sgcHJpb3JpdHkgZGlyZWN0aXZlcy5cbiAgICAgICAgLy8gaWYgYW55IG9mIHRoZW0gYXJlIHByZXNlbnQsIGl0IHdpbGwgdGFrZSBvdmVyIHRoZSBub2RlIHdpdGggYSBjaGlsZFZNXG4gICAgICAgIC8vIHNvIHdlIGNhbiBza2lwIHRoZSByZXN0XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBwcmlvcml0eURpcmVjdGl2ZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5jaGVja1ByaW9yaXR5RGlyKHByaW9yaXR5RGlyZWN0aXZlc1tpXSwgbm9kZSwgcm9vdCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNoZWNrIHRyYW5zaXRpb24gJiBhbmltYXRpb24gcHJvcGVydGllc1xuICAgICAgICBub2RlLnZ1ZV90cmFucyAgPSB1dGlscy5hdHRyKG5vZGUsICd0cmFuc2l0aW9uJylcbiAgICAgICAgbm9kZS52dWVfYW5pbSAgID0gdXRpbHMuYXR0cihub2RlLCAnYW5pbWF0aW9uJylcbiAgICAgICAgbm9kZS52dWVfZWZmZWN0ID0gdGhpcy5ldmFsKHV0aWxzLmF0dHIobm9kZSwgJ2VmZmVjdCcpKVxuXG4gICAgICAgIHZhciBwcmVmaXggPSBjb25maWcucHJlZml4ICsgJy0nLFxuICAgICAgICAgICAgcGFyYW1zID0gdGhpcy5vcHRpb25zLnBhcmFtQXR0cmlidXRlcyxcbiAgICAgICAgICAgIGF0dHIsIGF0dHJuYW1lLCBpc0RpcmVjdGl2ZSwgZXhwLCBkaXJlY3RpdmVzLCBkaXJlY3RpdmUsIGRpcm5hbWVcblxuICAgICAgICAvLyB2LXdpdGggaGFzIHNwZWNpYWwgcHJpb3JpdHkgYW1vbmcgdGhlIHJlc3RcbiAgICAgICAgLy8gaXQgbmVlZHMgdG8gcHVsbCBpbiB0aGUgdmFsdWUgZnJvbSB0aGUgcGFyZW50IGJlZm9yZVxuICAgICAgICAvLyBjb21wdXRlZCBwcm9wZXJ0aWVzIGFyZSBldmFsdWF0ZWQsIGJlY2F1c2UgYXQgdGhpcyBzdGFnZVxuICAgICAgICAvLyB0aGUgY29tcHV0ZWQgcHJvcGVydGllcyBoYXZlIG5vdCBzZXQgdXAgdGhlaXIgZGVwZW5kZW5jaWVzIHlldC5cbiAgICAgICAgaWYgKHJvb3QpIHtcbiAgICAgICAgICAgIHZhciB3aXRoRXhwID0gdXRpbHMuYXR0cihub2RlLCAnd2l0aCcpXG4gICAgICAgICAgICBpZiAod2l0aEV4cCkge1xuICAgICAgICAgICAgICAgIGRpcmVjdGl2ZXMgPSB0aGlzLnBhcnNlRGlyZWN0aXZlKCd3aXRoJywgd2l0aEV4cCwgbm9kZSwgdHJ1ZSlcbiAgICAgICAgICAgICAgICBmb3IgKGogPSAwLCBrID0gZGlyZWN0aXZlcy5sZW5ndGg7IGogPCBrOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5iaW5kRGlyZWN0aXZlKGRpcmVjdGl2ZXNbal0sIHRoaXMucGFyZW50KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhdHRycyA9IHNsaWNlLmNhbGwobm9kZS5hdHRyaWJ1dGVzKVxuICAgICAgICBmb3IgKGkgPSAwLCBsID0gYXR0cnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG5cbiAgICAgICAgICAgIGF0dHIgPSBhdHRyc1tpXVxuICAgICAgICAgICAgYXR0cm5hbWUgPSBhdHRyLm5hbWVcbiAgICAgICAgICAgIGlzRGlyZWN0aXZlID0gZmFsc2VcblxuICAgICAgICAgICAgaWYgKGF0dHJuYW1lLmluZGV4T2YocHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIC8vIGEgZGlyZWN0aXZlIC0gc3BsaXQsIHBhcnNlIGFuZCBiaW5kIGl0LlxuICAgICAgICAgICAgICAgIGlzRGlyZWN0aXZlID0gdHJ1ZVxuICAgICAgICAgICAgICAgIGRpcm5hbWUgPSBhdHRybmFtZS5zbGljZShwcmVmaXgubGVuZ3RoKVxuICAgICAgICAgICAgICAgIC8vIGJ1aWxkIHdpdGggbXVsdGlwbGU6IHRydWVcbiAgICAgICAgICAgICAgICBkaXJlY3RpdmVzID0gdGhpcy5wYXJzZURpcmVjdGl2ZShkaXJuYW1lLCBhdHRyLnZhbHVlLCBub2RlLCB0cnVlKVxuICAgICAgICAgICAgICAgIC8vIGxvb3AgdGhyb3VnaCBjbGF1c2VzIChzZXBhcmF0ZWQgYnkgXCIsXCIpXG4gICAgICAgICAgICAgICAgLy8gaW5zaWRlIGVhY2ggYXR0cmlidXRlXG4gICAgICAgICAgICAgICAgZm9yIChqID0gMCwgayA9IGRpcmVjdGl2ZXMubGVuZ3RoOyBqIDwgazsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYmluZERpcmVjdGl2ZShkaXJlY3RpdmVzW2pdKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY29uZmlnLmludGVycG9sYXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gbm9uIGRpcmVjdGl2ZSBhdHRyaWJ1dGUsIGNoZWNrIGludGVycG9sYXRpb24gdGFnc1xuICAgICAgICAgICAgICAgIGV4cCA9IFRleHRQYXJzZXIucGFyc2VBdHRyKGF0dHIudmFsdWUpXG4gICAgICAgICAgICAgICAgaWYgKGV4cCkge1xuICAgICAgICAgICAgICAgICAgICBkaXJlY3RpdmUgPSB0aGlzLnBhcnNlRGlyZWN0aXZlKCdhdHRyJywgZXhwLCBub2RlKVxuICAgICAgICAgICAgICAgICAgICBkaXJlY3RpdmUuYXJnID0gYXR0cm5hbWVcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcmFtcyAmJiBwYXJhbXMuaW5kZXhPZihhdHRybmFtZSkgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYSBwYXJhbSBhdHRyaWJ1dGUuLi4gd2Ugc2hvdWxkIHVzZSB0aGUgcGFyZW50IGJpbmRpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvIGF2b2lkIGNpcmN1bGFyIHVwZGF0ZXMgbGlrZSBzaXplPXt7c2l6ZX19XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJpbmREaXJlY3RpdmUoZGlyZWN0aXZlLCB0aGlzLnBhcmVudClcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYmluZERpcmVjdGl2ZShkaXJlY3RpdmUpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpc0RpcmVjdGl2ZSAmJiBkaXJuYW1lICE9PSAnY2xvYWsnKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0cm5hbWUpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIC8vIHJlY3Vyc2l2ZWx5IGNvbXBpbGUgY2hpbGROb2Rlc1xuICAgIGlmIChub2RlLmhhc0NoaWxkTm9kZXMoKSkge1xuICAgICAgICBzbGljZS5jYWxsKG5vZGUuY2hpbGROb2RlcykuZm9yRWFjaCh0aGlzLmNvbXBpbGUsIHRoaXMpXG4gICAgfVxufVxuXG4vKipcbiAqICBDb21waWxlIGEgdGV4dCBub2RlXG4gKi9cbkNvbXBpbGVyUHJvdG8uY29tcGlsZVRleHROb2RlID0gZnVuY3Rpb24gKG5vZGUpIHtcblxuICAgIHZhciB0b2tlbnMgPSBUZXh0UGFyc2VyLnBhcnNlKG5vZGUubm9kZVZhbHVlKVxuICAgIGlmICghdG9rZW5zKSByZXR1cm5cbiAgICB2YXIgZWwsIHRva2VuLCBkaXJlY3RpdmVcblxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gdG9rZW5zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuXG4gICAgICAgIHRva2VuID0gdG9rZW5zW2ldXG4gICAgICAgIGRpcmVjdGl2ZSA9IG51bGxcblxuICAgICAgICBpZiAodG9rZW4ua2V5KSB7IC8vIGEgYmluZGluZ1xuICAgICAgICAgICAgaWYgKHRva2VuLmtleS5jaGFyQXQoMCkgPT09ICc+JykgeyAvLyBhIHBhcnRpYWxcbiAgICAgICAgICAgICAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJ3JlZicpXG4gICAgICAgICAgICAgICAgZGlyZWN0aXZlID0gdGhpcy5wYXJzZURpcmVjdGl2ZSgncGFydGlhbCcsIHRva2VuLmtleS5zbGljZSgxKSwgZWwpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghdG9rZW4uaHRtbCkgeyAvLyB0ZXh0IGJpbmRpbmdcbiAgICAgICAgICAgICAgICAgICAgZWwgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJylcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aXZlID0gdGhpcy5wYXJzZURpcmVjdGl2ZSgndGV4dCcsIHRva2VuLmtleSwgZWwpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gaHRtbCBiaW5kaW5nXG4gICAgICAgICAgICAgICAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChjb25maWcucHJlZml4ICsgJy1odG1sJylcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aXZlID0gdGhpcy5wYXJzZURpcmVjdGl2ZSgnaHRtbCcsIHRva2VuLmtleSwgZWwpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgeyAvLyBhIHBsYWluIHN0cmluZ1xuICAgICAgICAgICAgZWwgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0b2tlbilcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGluc2VydCBub2RlXG4gICAgICAgIG5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZWwsIG5vZGUpXG4gICAgICAgIC8vIGJpbmQgZGlyZWN0aXZlXG4gICAgICAgIHRoaXMuYmluZERpcmVjdGl2ZShkaXJlY3RpdmUpXG5cbiAgICB9XG4gICAgbm9kZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpXG59XG5cbi8qKlxuICogIFBhcnNlIGEgZGlyZWN0aXZlIG5hbWUvdmFsdWUgcGFpciBpbnRvIG9uZSBvciBtb3JlXG4gKiAgZGlyZWN0aXZlIGluc3RhbmNlc1xuICovXG5Db21waWxlclByb3RvLnBhcnNlRGlyZWN0aXZlID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlLCBlbCwgbXVsdGlwbGUpIHtcbiAgICB2YXIgY29tcGlsZXIgPSB0aGlzLFxuICAgICAgICBkZWZpbml0aW9uID0gY29tcGlsZXIuZ2V0T3B0aW9uKCdkaXJlY3RpdmVzJywgbmFtZSlcbiAgICBpZiAoZGVmaW5pdGlvbikge1xuICAgICAgICAvLyBwYXJzZSBpbnRvIEFTVC1saWtlIG9iamVjdHNcbiAgICAgICAgdmFyIGFzdHMgPSBEaXJlY3RpdmUucGFyc2UodmFsdWUpXG4gICAgICAgIHJldHVybiBtdWx0aXBsZVxuICAgICAgICAgICAgPyBhc3RzLm1hcChidWlsZClcbiAgICAgICAgICAgIDogYnVpbGQoYXN0c1swXSlcbiAgICB9XG4gICAgZnVuY3Rpb24gYnVpbGQgKGFzdCkge1xuICAgICAgICByZXR1cm4gbmV3IERpcmVjdGl2ZShuYW1lLCBhc3QsIGRlZmluaXRpb24sIGNvbXBpbGVyLCBlbClcbiAgICB9XG59XG5cbi8qKlxuICogIEFkZCBhIGRpcmVjdGl2ZSBpbnN0YW5jZSB0byB0aGUgY29ycmVjdCBiaW5kaW5nICYgdmlld21vZGVsXG4gKi9cbkNvbXBpbGVyUHJvdG8uYmluZERpcmVjdGl2ZSA9IGZ1bmN0aW9uIChkaXJlY3RpdmUsIGJpbmRpbmdPd25lcikge1xuXG4gICAgaWYgKCFkaXJlY3RpdmUpIHJldHVyblxuXG4gICAgLy8ga2VlcCB0cmFjayBvZiBpdCBzbyB3ZSBjYW4gdW5iaW5kKCkgbGF0ZXJcbiAgICB0aGlzLmRpcnMucHVzaChkaXJlY3RpdmUpXG5cbiAgICAvLyBmb3IgZW1wdHkgb3IgbGl0ZXJhbCBkaXJlY3RpdmVzLCBzaW1wbHkgY2FsbCBpdHMgYmluZCgpXG4gICAgLy8gYW5kIHdlJ3JlIGRvbmUuXG4gICAgaWYgKGRpcmVjdGl2ZS5pc0VtcHR5IHx8IGRpcmVjdGl2ZS5pc0xpdGVyYWwpIHtcbiAgICAgICAgaWYgKGRpcmVjdGl2ZS5iaW5kKSBkaXJlY3RpdmUuYmluZCgpXG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIG90aGVyd2lzZSwgd2UgZ290IG1vcmUgd29yayB0byBkby4uLlxuICAgIHZhciBiaW5kaW5nLFxuICAgICAgICBjb21waWxlciA9IGJpbmRpbmdPd25lciB8fCB0aGlzLFxuICAgICAgICBrZXkgICAgICA9IGRpcmVjdGl2ZS5rZXlcblxuICAgIGlmIChkaXJlY3RpdmUuaXNFeHApIHtcbiAgICAgICAgLy8gZXhwcmVzc2lvbiBiaW5kaW5ncyBhcmUgYWx3YXlzIGNyZWF0ZWQgb24gY3VycmVudCBjb21waWxlclxuICAgICAgICBiaW5kaW5nID0gY29tcGlsZXIuY3JlYXRlQmluZGluZyhrZXksIGRpcmVjdGl2ZSlcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyByZWN1cnNpdmVseSBsb2NhdGUgd2hpY2ggY29tcGlsZXIgb3ducyB0aGUgYmluZGluZ1xuICAgICAgICB3aGlsZSAoY29tcGlsZXIpIHtcbiAgICAgICAgICAgIGlmIChjb21waWxlci5oYXNLZXkoa2V5KSkge1xuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbXBpbGVyID0gY29tcGlsZXIucGFyZW50XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29tcGlsZXIgPSBjb21waWxlciB8fCB0aGlzXG4gICAgICAgIGJpbmRpbmcgPSBjb21waWxlci5iaW5kaW5nc1trZXldIHx8IGNvbXBpbGVyLmNyZWF0ZUJpbmRpbmcoa2V5KVxuICAgIH1cbiAgICBiaW5kaW5nLmRpcnMucHVzaChkaXJlY3RpdmUpXG4gICAgZGlyZWN0aXZlLmJpbmRpbmcgPSBiaW5kaW5nXG5cbiAgICB2YXIgdmFsdWUgPSBiaW5kaW5nLnZhbCgpXG4gICAgLy8gaW52b2tlIGJpbmQgaG9vayBpZiBleGlzdHNcbiAgICBpZiAoZGlyZWN0aXZlLmJpbmQpIHtcbiAgICAgICAgZGlyZWN0aXZlLmJpbmQodmFsdWUpXG4gICAgfVxuICAgIC8vIHNldCBpbml0aWFsIHZhbHVlXG4gICAgZGlyZWN0aXZlLiR1cGRhdGUodmFsdWUsIHRydWUpXG59XG5cbi8qKlxuICogIENyZWF0ZSBiaW5kaW5nIGFuZCBhdHRhY2ggZ2V0dGVyL3NldHRlciBmb3IgYSBrZXkgdG8gdGhlIHZpZXdtb2RlbCBvYmplY3RcbiAqL1xuQ29tcGlsZXJQcm90by5jcmVhdGVCaW5kaW5nID0gZnVuY3Rpb24gKGtleSwgZGlyZWN0aXZlKSB7XG5cbiAgICB1dGlscy5sb2coJyAgY3JlYXRlZCBiaW5kaW5nOiAnICsga2V5KVxuXG4gICAgdmFyIGNvbXBpbGVyID0gdGhpcyxcbiAgICAgICAgbWV0aG9kcyAgPSBjb21waWxlci5vcHRpb25zLm1ldGhvZHMsXG4gICAgICAgIGlzRXhwICAgID0gZGlyZWN0aXZlICYmIGRpcmVjdGl2ZS5pc0V4cCxcbiAgICAgICAgaXNGbiAgICAgPSAoZGlyZWN0aXZlICYmIGRpcmVjdGl2ZS5pc0ZuKSB8fCAobWV0aG9kcyAmJiBtZXRob2RzW2tleV0pLFxuICAgICAgICBiaW5kaW5ncyA9IGNvbXBpbGVyLmJpbmRpbmdzLFxuICAgICAgICBjb21wdXRlZCA9IGNvbXBpbGVyLm9wdGlvbnMuY29tcHV0ZWQsXG4gICAgICAgIGJpbmRpbmcgID0gbmV3IEJpbmRpbmcoY29tcGlsZXIsIGtleSwgaXNFeHAsIGlzRm4pXG5cbiAgICBpZiAoaXNFeHApIHtcbiAgICAgICAgLy8gZXhwcmVzc2lvbiBiaW5kaW5ncyBhcmUgYW5vbnltb3VzXG4gICAgICAgIGNvbXBpbGVyLmRlZmluZUV4cChrZXksIGJpbmRpbmcsIGRpcmVjdGl2ZSlcbiAgICB9IGVsc2UgaWYgKGlzRm4pIHtcbiAgICAgICAgYmluZGluZ3Nba2V5XSA9IGJpbmRpbmdcbiAgICAgICAgY29tcGlsZXIuZGVmaW5lVm1Qcm9wKGtleSwgYmluZGluZywgbWV0aG9kc1trZXldKVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGJpbmRpbmdzW2tleV0gPSBiaW5kaW5nXG4gICAgICAgIGlmIChiaW5kaW5nLnJvb3QpIHtcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgYSByb290IGxldmVsIGJpbmRpbmcuIHdlIG5lZWQgdG8gZGVmaW5lIGdldHRlci9zZXR0ZXJzIGZvciBpdC5cbiAgICAgICAgICAgIGlmIChjb21wdXRlZCAmJiBjb21wdXRlZFtrZXldKSB7XG4gICAgICAgICAgICAgICAgLy8gY29tcHV0ZWQgcHJvcGVydHlcbiAgICAgICAgICAgICAgICBjb21waWxlci5kZWZpbmVDb21wdXRlZChrZXksIGJpbmRpbmcsIGNvbXB1dGVkW2tleV0pXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGtleS5jaGFyQXQoMCkgIT09ICckJykge1xuICAgICAgICAgICAgICAgIC8vIG5vcm1hbCBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgIGNvbXBpbGVyLmRlZmluZURhdGFQcm9wKGtleSwgYmluZGluZylcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gcHJvcGVydGllcyB0aGF0IHN0YXJ0IHdpdGggJCBhcmUgbWV0YSBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgLy8gdGhleSBzaG91bGQgYmUga2VwdCBvbiB0aGUgdm0gYnV0IG5vdCBpbiB0aGUgZGF0YSBvYmplY3QuXG4gICAgICAgICAgICAgICAgY29tcGlsZXIuZGVmaW5lVm1Qcm9wKGtleSwgYmluZGluZywgY29tcGlsZXIuZGF0YVtrZXldKVxuICAgICAgICAgICAgICAgIGRlbGV0ZSBjb21waWxlci5kYXRhW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjb21wdXRlZCAmJiBjb21wdXRlZFt1dGlscy5iYXNlS2V5KGtleSldKSB7XG4gICAgICAgICAgICAvLyBuZXN0ZWQgcGF0aCBvbiBjb21wdXRlZCBwcm9wZXJ0eVxuICAgICAgICAgICAgY29tcGlsZXIuZGVmaW5lRXhwKGtleSwgYmluZGluZylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGVuc3VyZSBwYXRoIGluIGRhdGEgc28gdGhhdCBjb21wdXRlZCBwcm9wZXJ0aWVzIHRoYXRcbiAgICAgICAgICAgIC8vIGFjY2VzcyB0aGUgcGF0aCBkb24ndCB0aHJvdyBhbiBlcnJvciBhbmQgY2FuIGNvbGxlY3RcbiAgICAgICAgICAgIC8vIGRlcGVuZGVuY2llc1xuICAgICAgICAgICAgT2JzZXJ2ZXIuZW5zdXJlUGF0aChjb21waWxlci5kYXRhLCBrZXkpXG4gICAgICAgICAgICB2YXIgcGFyZW50S2V5ID0ga2V5LnNsaWNlKDAsIGtleS5sYXN0SW5kZXhPZignLicpKVxuICAgICAgICAgICAgaWYgKCFiaW5kaW5nc1twYXJlbnRLZXldKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBhIG5lc3RlZCB2YWx1ZSBiaW5kaW5nLCBidXQgdGhlIGJpbmRpbmcgZm9yIGl0cyBwYXJlbnRcbiAgICAgICAgICAgICAgICAvLyBoYXMgbm90IGJlZW4gY3JlYXRlZCB5ZXQuIFdlIGJldHRlciBjcmVhdGUgdGhhdCBvbmUgdG9vLlxuICAgICAgICAgICAgICAgIGNvbXBpbGVyLmNyZWF0ZUJpbmRpbmcocGFyZW50S2V5KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBiaW5kaW5nXG59XG5cbi8qKlxuICogIERlZmluZSB0aGUgZ2V0dGVyL3NldHRlciB0byBwcm94eSBhIHJvb3QtbGV2ZWxcbiAqICBkYXRhIHByb3BlcnR5IG9uIHRoZSBWTVxuICovXG5Db21waWxlclByb3RvLmRlZmluZURhdGFQcm9wID0gZnVuY3Rpb24gKGtleSwgYmluZGluZykge1xuICAgIHZhciBjb21waWxlciA9IHRoaXMsXG4gICAgICAgIGRhdGEgICAgID0gY29tcGlsZXIuZGF0YSxcbiAgICAgICAgb2IgICAgICAgPSBkYXRhLl9fZW1pdHRlcl9fXG5cbiAgICAvLyBtYWtlIHN1cmUgdGhlIGtleSBpcyBwcmVzZW50IGluIGRhdGFcbiAgICAvLyBzbyBpdCBjYW4gYmUgb2JzZXJ2ZWRcbiAgICBpZiAoIShoYXNPd24uY2FsbChkYXRhLCBrZXkpKSkge1xuICAgICAgICBkYXRhW2tleV0gPSB1bmRlZmluZWRcbiAgICB9XG5cbiAgICAvLyBpZiB0aGUgZGF0YSBvYmplY3QgaXMgYWxyZWFkeSBvYnNlcnZlZCwgYnV0IHRoZSBrZXlcbiAgICAvLyBpcyBub3Qgb2JzZXJ2ZWQsIHdlIG5lZWQgdG8gYWRkIGl0IHRvIHRoZSBvYnNlcnZlZCBrZXlzLlxuICAgIGlmIChvYiAmJiAhKGhhc093bi5jYWxsKG9iLnZhbHVlcywga2V5KSkpIHtcbiAgICAgICAgT2JzZXJ2ZXIuY29udmVydEtleShkYXRhLCBrZXkpXG4gICAgfVxuXG4gICAgYmluZGluZy52YWx1ZSA9IGRhdGFba2V5XVxuXG4gICAgZGVmKGNvbXBpbGVyLnZtLCBrZXksIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gY29tcGlsZXIuZGF0YVtrZXldXG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgY29tcGlsZXIuZGF0YVtrZXldID0gdmFsXG4gICAgICAgIH1cbiAgICB9KVxufVxuXG4vKipcbiAqICBEZWZpbmUgYSB2bSBwcm9wZXJ0eSwgZS5nLiAkaW5kZXgsICRrZXksIG9yIG1peGluIG1ldGhvZHNcbiAqICB3aGljaCBhcmUgYmluZGFibGUgYnV0IG9ubHkgYWNjZXNzaWJsZSBvbiB0aGUgVk0sXG4gKiAgbm90IGluIHRoZSBkYXRhLlxuICovXG5Db21waWxlclByb3RvLmRlZmluZVZtUHJvcCA9IGZ1bmN0aW9uIChrZXksIGJpbmRpbmcsIHZhbHVlKSB7XG4gICAgdmFyIG9iID0gdGhpcy5vYnNlcnZlclxuICAgIGJpbmRpbmcudmFsdWUgPSB2YWx1ZVxuICAgIGRlZih0aGlzLnZtLCBrZXksIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoT2JzZXJ2ZXIuc2hvdWxkR2V0KSBvYi5lbWl0KCdnZXQnLCBrZXkpXG4gICAgICAgICAgICByZXR1cm4gYmluZGluZy52YWx1ZVxuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIG9iLmVtaXQoJ3NldCcsIGtleSwgdmFsKVxuICAgICAgICB9XG4gICAgfSlcbn1cblxuLyoqXG4gKiAgRGVmaW5lIGFuIGV4cHJlc3Npb24gYmluZGluZywgd2hpY2ggaXMgZXNzZW50aWFsbHlcbiAqICBhbiBhbm9ueW1vdXMgY29tcHV0ZWQgcHJvcGVydHlcbiAqL1xuQ29tcGlsZXJQcm90by5kZWZpbmVFeHAgPSBmdW5jdGlvbiAoa2V5LCBiaW5kaW5nLCBkaXJlY3RpdmUpIHtcbiAgICB2YXIgY29tcHV0ZWRLZXkgPSBkaXJlY3RpdmUgJiYgZGlyZWN0aXZlLmNvbXB1dGVkS2V5LFxuICAgICAgICBleHAgICAgICAgICA9IGNvbXB1dGVkS2V5ID8gZGlyZWN0aXZlLmV4cHJlc3Npb24gOiBrZXksXG4gICAgICAgIGdldHRlciAgICAgID0gdGhpcy5leHBDYWNoZVtleHBdXG4gICAgaWYgKCFnZXR0ZXIpIHtcbiAgICAgICAgZ2V0dGVyID0gdGhpcy5leHBDYWNoZVtleHBdID0gRXhwUGFyc2VyLnBhcnNlKGNvbXB1dGVkS2V5IHx8IGtleSwgdGhpcylcbiAgICB9XG4gICAgaWYgKGdldHRlcikge1xuICAgICAgICB0aGlzLm1hcmtDb21wdXRlZChiaW5kaW5nLCBnZXR0ZXIpXG4gICAgfVxufVxuXG4vKipcbiAqICBEZWZpbmUgYSBjb21wdXRlZCBwcm9wZXJ0eSBvbiB0aGUgVk1cbiAqL1xuQ29tcGlsZXJQcm90by5kZWZpbmVDb21wdXRlZCA9IGZ1bmN0aW9uIChrZXksIGJpbmRpbmcsIHZhbHVlKSB7XG4gICAgdGhpcy5tYXJrQ29tcHV0ZWQoYmluZGluZywgdmFsdWUpXG4gICAgZGVmKHRoaXMudm0sIGtleSwge1xuICAgICAgICBnZXQ6IGJpbmRpbmcudmFsdWUuJGdldCxcbiAgICAgICAgc2V0OiBiaW5kaW5nLnZhbHVlLiRzZXRcbiAgICB9KVxufVxuXG4vKipcbiAqICBQcm9jZXNzIGEgY29tcHV0ZWQgcHJvcGVydHkgYmluZGluZ1xuICogIHNvIGl0cyBnZXR0ZXIvc2V0dGVyIGFyZSBib3VuZCB0byBwcm9wZXIgY29udGV4dFxuICovXG5Db21waWxlclByb3RvLm1hcmtDb21wdXRlZCA9IGZ1bmN0aW9uIChiaW5kaW5nLCB2YWx1ZSkge1xuICAgIGJpbmRpbmcuaXNDb21wdXRlZCA9IHRydWVcbiAgICAvLyBiaW5kIHRoZSBhY2Nlc3NvcnMgdG8gdGhlIHZtXG4gICAgaWYgKGJpbmRpbmcuaXNGbikge1xuICAgICAgICBiaW5kaW5nLnZhbHVlID0gdmFsdWVcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHsgJGdldDogdmFsdWUgfVxuICAgICAgICB9XG4gICAgICAgIGJpbmRpbmcudmFsdWUgPSB7XG4gICAgICAgICAgICAkZ2V0OiB1dGlscy5iaW5kKHZhbHVlLiRnZXQsIHRoaXMudm0pLFxuICAgICAgICAgICAgJHNldDogdmFsdWUuJHNldFxuICAgICAgICAgICAgICAgID8gdXRpbHMuYmluZCh2YWx1ZS4kc2V0LCB0aGlzLnZtKVxuICAgICAgICAgICAgICAgIDogdW5kZWZpbmVkXG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8ga2VlcCB0cmFjayBmb3IgZGVwIHBhcnNpbmcgbGF0ZXJcbiAgICB0aGlzLmNvbXB1dGVkLnB1c2goYmluZGluZylcbn1cblxuLyoqXG4gKiAgUmV0cml2ZSBhbiBvcHRpb24gZnJvbSB0aGUgY29tcGlsZXJcbiAqL1xuQ29tcGlsZXJQcm90by5nZXRPcHRpb24gPSBmdW5jdGlvbiAodHlwZSwgaWQsIHNpbGVudCkge1xuICAgIHZhciBvcHRzID0gdGhpcy5vcHRpb25zLFxuICAgICAgICBwYXJlbnQgPSB0aGlzLnBhcmVudCxcbiAgICAgICAgZ2xvYmFsQXNzZXRzID0gY29uZmlnLmdsb2JhbEFzc2V0cyxcbiAgICAgICAgcmVzID0gKG9wdHNbdHlwZV0gJiYgb3B0c1t0eXBlXVtpZF0pIHx8IChcbiAgICAgICAgICAgIHBhcmVudFxuICAgICAgICAgICAgICAgID8gcGFyZW50LmdldE9wdGlvbih0eXBlLCBpZCwgc2lsZW50KVxuICAgICAgICAgICAgICAgIDogZ2xvYmFsQXNzZXRzW3R5cGVdICYmIGdsb2JhbEFzc2V0c1t0eXBlXVtpZF1cbiAgICAgICAgKVxuICAgIGlmICghcmVzICYmICFzaWxlbnQgJiYgdHlwZW9mIGlkID09PSAnc3RyaW5nJykge1xuICAgICAgICB1dGlscy53YXJuKCdVbmtub3duICcgKyB0eXBlLnNsaWNlKDAsIC0xKSArICc6ICcgKyBpZClcbiAgICB9XG4gICAgcmV0dXJuIHJlc1xufVxuXG4vKipcbiAqICBFbWl0IGxpZmVjeWNsZSBldmVudHMgdG8gdHJpZ2dlciBob29rc1xuICovXG5Db21waWxlclByb3RvLmV4ZWNIb29rID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQgPSAnaG9vazonICsgZXZlbnRcbiAgICB0aGlzLm9ic2VydmVyLmVtaXQoZXZlbnQpXG4gICAgdGhpcy5lbWl0dGVyLmVtaXQoZXZlbnQpXG59XG5cbi8qKlxuICogIENoZWNrIGlmIGEgY29tcGlsZXIncyBkYXRhIGNvbnRhaW5zIGEga2V5cGF0aFxuICovXG5Db21waWxlclByb3RvLmhhc0tleSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICB2YXIgYmFzZUtleSA9IHV0aWxzLmJhc2VLZXkoa2V5KVxuICAgIHJldHVybiBoYXNPd24uY2FsbCh0aGlzLmRhdGEsIGJhc2VLZXkpIHx8XG4gICAgICAgIGhhc093bi5jYWxsKHRoaXMudm0sIGJhc2VLZXkpXG59XG5cbi8qKlxuICogIERvIGEgb25lLXRpbWUgZXZhbCBvZiBhIHN0cmluZyB0aGF0IHBvdGVudGlhbGx5XG4gKiAgaW5jbHVkZXMgYmluZGluZ3MuIEl0IGFjY2VwdHMgYWRkaXRpb25hbCByYXcgZGF0YVxuICogIGJlY2F1c2Ugd2UgbmVlZCB0byBkeW5hbWljYWxseSByZXNvbHZlIHYtY29tcG9uZW50XG4gKiAgYmVmb3JlIGEgY2hpbGRWTSBpcyBldmVuIGNvbXBpbGVkLi4uXG4gKi9cbkNvbXBpbGVyUHJvdG8uZXZhbCA9IGZ1bmN0aW9uIChleHAsIGRhdGEpIHtcbiAgICB2YXIgcGFyc2VkID0gVGV4dFBhcnNlci5wYXJzZUF0dHIoZXhwKVxuICAgIHJldHVybiBwYXJzZWRcbiAgICAgICAgPyBFeHBQYXJzZXIuZXZhbChwYXJzZWQsIHRoaXMsIGRhdGEpXG4gICAgICAgIDogZXhwXG59XG5cbi8qKlxuICogIFJlc29sdmUgYSBDb21wb25lbnQgY29uc3RydWN0b3IgZm9yIGFuIGVsZW1lbnRcbiAqICB3aXRoIHRoZSBkYXRhIHRvIGJlIHVzZWRcbiAqL1xuQ29tcGlsZXJQcm90by5yZXNvbHZlQ29tcG9uZW50ID0gZnVuY3Rpb24gKG5vZGUsIGRhdGEsIHRlc3QpIHtcblxuICAgIC8vIGxhdGUgcmVxdWlyZSB0byBhdm9pZCBjaXJjdWxhciBkZXBzXG4gICAgVmlld01vZGVsID0gVmlld01vZGVsIHx8IHJlcXVpcmUoJy4vdmlld21vZGVsJylcblxuICAgIHZhciBleHAgICAgID0gdXRpbHMuYXR0cihub2RlLCAnY29tcG9uZW50JyksXG4gICAgICAgIHRhZ05hbWUgPSBub2RlLnRhZ05hbWUsXG4gICAgICAgIGlkICAgICAgPSB0aGlzLmV2YWwoZXhwLCBkYXRhKSxcbiAgICAgICAgdGFnSWQgICA9ICh0YWdOYW1lLmluZGV4T2YoJy0nKSA+IDAgJiYgdGFnTmFtZS50b0xvd2VyQ2FzZSgpKSxcbiAgICAgICAgQ3RvciAgICA9IHRoaXMuZ2V0T3B0aW9uKCdjb21wb25lbnRzJywgaWQgfHwgdGFnSWQsIHRydWUpXG5cbiAgICBpZiAoaWQgJiYgIUN0b3IpIHtcbiAgICAgICAgdXRpbHMud2FybignVW5rbm93biBjb21wb25lbnQ6ICcgKyBpZClcbiAgICB9XG5cbiAgICByZXR1cm4gdGVzdFxuICAgICAgICA/IGV4cCA9PT0gJydcbiAgICAgICAgICAgID8gVmlld01vZGVsXG4gICAgICAgICAgICA6IEN0b3JcbiAgICAgICAgOiBDdG9yIHx8IFZpZXdNb2RlbFxufVxuXG4vKipcbiAqICBVbmJpbmQgYW5kIHJlbW92ZSBlbGVtZW50XG4gKi9cbkNvbXBpbGVyUHJvdG8uZGVzdHJveSA9IGZ1bmN0aW9uIChub1JlbW92ZSkge1xuXG4gICAgLy8gYXZvaWQgYmVpbmcgY2FsbGVkIG1vcmUgdGhhbiBvbmNlXG4gICAgLy8gdGhpcyBpcyBpcnJldmVyc2libGUhXG4gICAgaWYgKHRoaXMuZGVzdHJveWVkKSByZXR1cm5cblxuICAgIHZhciBjb21waWxlciA9IHRoaXMsXG4gICAgICAgIGksIGosIGtleSwgZGlyLCBkaXJzLCBiaW5kaW5nLFxuICAgICAgICB2bSAgICAgICAgICA9IGNvbXBpbGVyLnZtLFxuICAgICAgICBlbCAgICAgICAgICA9IGNvbXBpbGVyLmVsLFxuICAgICAgICBkaXJlY3RpdmVzICA9IGNvbXBpbGVyLmRpcnMsXG4gICAgICAgIGNvbXB1dGVkICAgID0gY29tcGlsZXIuY29tcHV0ZWQsXG4gICAgICAgIGJpbmRpbmdzICAgID0gY29tcGlsZXIuYmluZGluZ3MsXG4gICAgICAgIGNoaWxkcmVuICAgID0gY29tcGlsZXIuY2hpbGRyZW4sXG4gICAgICAgIHBhcmVudCAgICAgID0gY29tcGlsZXIucGFyZW50XG5cbiAgICBjb21waWxlci5leGVjSG9vaygnYmVmb3JlRGVzdHJveScpXG5cbiAgICAvLyB1bm9ic2VydmUgZGF0YVxuICAgIE9ic2VydmVyLnVub2JzZXJ2ZShjb21waWxlci5kYXRhLCAnJywgY29tcGlsZXIub2JzZXJ2ZXIpXG5cbiAgICAvLyBkZXN0cm95IGFsbCBjaGlsZHJlblxuICAgIC8vIGRvIG5vdCByZW1vdmUgdGhlaXIgZWxlbWVudHMgc2luY2UgdGhlIHBhcmVudFxuICAgIC8vIG1heSBoYXZlIHRyYW5zaXRpb25zIGFuZCB0aGUgY2hpbGRyZW4gbWF5IG5vdFxuICAgIGkgPSBjaGlsZHJlbi5sZW5ndGhcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGNoaWxkcmVuW2ldLmRlc3Ryb3kodHJ1ZSlcbiAgICB9XG5cbiAgICAvLyB1bmJpbmQgYWxsIGRpcmVjaXR2ZXNcbiAgICBpID0gZGlyZWN0aXZlcy5sZW5ndGhcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGRpciA9IGRpcmVjdGl2ZXNbaV1cbiAgICAgICAgLy8gaWYgdGhpcyBkaXJlY3RpdmUgaXMgYW4gaW5zdGFuY2Ugb2YgYW4gZXh0ZXJuYWwgYmluZGluZ1xuICAgICAgICAvLyBlLmcuIGEgZGlyZWN0aXZlIHRoYXQgcmVmZXJzIHRvIGEgdmFyaWFibGUgb24gdGhlIHBhcmVudCBWTVxuICAgICAgICAvLyB3ZSBuZWVkIHRvIHJlbW92ZSBpdCBmcm9tIHRoYXQgYmluZGluZydzIGRpcmVjdGl2ZXNcbiAgICAgICAgLy8gKiBlbXB0eSBhbmQgbGl0ZXJhbCBiaW5kaW5ncyBkbyBub3QgaGF2ZSBiaW5kaW5nLlxuICAgICAgICBpZiAoZGlyLmJpbmRpbmcgJiYgZGlyLmJpbmRpbmcuY29tcGlsZXIgIT09IGNvbXBpbGVyKSB7XG4gICAgICAgICAgICBkaXJzID0gZGlyLmJpbmRpbmcuZGlyc1xuICAgICAgICAgICAgaWYgKGRpcnMpIHtcbiAgICAgICAgICAgICAgICBqID0gZGlycy5pbmRleE9mKGRpcilcbiAgICAgICAgICAgICAgICBpZiAoaiA+IC0xKSBkaXJzLnNwbGljZShqLCAxKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGRpci4kdW5iaW5kKClcbiAgICB9XG5cbiAgICAvLyB1bmJpbmQgYWxsIGNvbXB1dGVkLCBhbm9ueW1vdXMgYmluZGluZ3NcbiAgICBpID0gY29tcHV0ZWQubGVuZ3RoXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICBjb21wdXRlZFtpXS51bmJpbmQoKVxuICAgIH1cblxuICAgIC8vIHVuYmluZCBhbGwga2V5cGF0aCBiaW5kaW5nc1xuICAgIGZvciAoa2V5IGluIGJpbmRpbmdzKSB7XG4gICAgICAgIGJpbmRpbmcgPSBiaW5kaW5nc1trZXldXG4gICAgICAgIGlmIChiaW5kaW5nKSB7XG4gICAgICAgICAgICBiaW5kaW5nLnVuYmluZCgpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZW1vdmUgc2VsZiBmcm9tIHBhcmVudFxuICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgaiA9IHBhcmVudC5jaGlsZHJlbi5pbmRleE9mKGNvbXBpbGVyKVxuICAgICAgICBpZiAoaiA+IC0xKSBwYXJlbnQuY2hpbGRyZW4uc3BsaWNlKGosIDEpXG4gICAgfVxuXG4gICAgLy8gZmluYWxseSByZW1vdmUgZG9tIGVsZW1lbnRcbiAgICBpZiAoIW5vUmVtb3ZlKSB7XG4gICAgICAgIGlmIChlbCA9PT0gZG9jdW1lbnQuYm9keSkge1xuICAgICAgICAgICAgZWwuaW5uZXJIVE1MID0gJydcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZtLiRyZW1vdmUoKVxuICAgICAgICB9XG4gICAgfVxuICAgIGVsLnZ1ZV92bSA9IG51bGxcblxuICAgIGNvbXBpbGVyLmRlc3Ryb3llZCA9IHRydWVcbiAgICAvLyBlbWl0IGRlc3Ryb3kgaG9va1xuICAgIGNvbXBpbGVyLmV4ZWNIb29rKCdhZnRlckRlc3Ryb3knKVxuXG4gICAgLy8gZmluYWxseSwgdW5yZWdpc3RlciBhbGwgbGlzdGVuZXJzXG4gICAgY29tcGlsZXIub2JzZXJ2ZXIub2ZmKClcbiAgICBjb21waWxlci5lbWl0dGVyLm9mZigpXG59XG5cbi8vIEhlbHBlcnMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqXG4gKiAgc2hvcnRoYW5kIGZvciBnZXR0aW5nIHJvb3QgY29tcGlsZXJcbiAqL1xuZnVuY3Rpb24gZ2V0Um9vdCAoY29tcGlsZXIpIHtcbiAgICB3aGlsZSAoY29tcGlsZXIucGFyZW50KSB7XG4gICAgICAgIGNvbXBpbGVyID0gY29tcGlsZXIucGFyZW50XG4gICAgfVxuICAgIHJldHVybiBjb21waWxlclxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBpbGVyIiwidmFyIFRleHRQYXJzZXIgPSByZXF1aXJlKCcuL3RleHQtcGFyc2VyJylcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJlZml4ICAgICAgICAgOiAndicsXG4gICAgZGVidWcgICAgICAgICAgOiBmYWxzZSxcbiAgICBzaWxlbnQgICAgICAgICA6IGZhbHNlLFxuICAgIGVudGVyQ2xhc3MgICAgIDogJ3YtZW50ZXInLFxuICAgIGxlYXZlQ2xhc3MgICAgIDogJ3YtbGVhdmUnLFxuICAgIGludGVycG9sYXRlICAgIDogdHJ1ZVxufVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkobW9kdWxlLmV4cG9ydHMsICdkZWxpbWl0ZXJzJywge1xuICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gVGV4dFBhcnNlci5kZWxpbWl0ZXJzXG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uIChkZWxpbWl0ZXJzKSB7XG4gICAgICAgIFRleHRQYXJzZXIuc2V0RGVsaW1pdGVycyhkZWxpbWl0ZXJzKVxuICAgIH1cbn0pIiwidmFyIEVtaXR0ZXIgID0gcmVxdWlyZSgnLi9lbWl0dGVyJyksXG4gICAgdXRpbHMgICAgPSByZXF1aXJlKCcuL3V0aWxzJyksXG4gICAgT2JzZXJ2ZXIgPSByZXF1aXJlKCcuL29ic2VydmVyJyksXG4gICAgY2F0Y2hlciAgPSBuZXcgRW1pdHRlcigpXG5cbi8qKlxuICogIEF1dG8tZXh0cmFjdCB0aGUgZGVwZW5kZW5jaWVzIG9mIGEgY29tcHV0ZWQgcHJvcGVydHlcbiAqICBieSByZWNvcmRpbmcgdGhlIGdldHRlcnMgdHJpZ2dlcmVkIHdoZW4gZXZhbHVhdGluZyBpdC5cbiAqL1xuZnVuY3Rpb24gY2F0Y2hEZXBzIChiaW5kaW5nKSB7XG4gICAgaWYgKGJpbmRpbmcuaXNGbikgcmV0dXJuXG4gICAgdXRpbHMubG9nKCdcXG4tICcgKyBiaW5kaW5nLmtleSlcbiAgICB2YXIgZ290ID0gdXRpbHMuaGFzaCgpXG4gICAgYmluZGluZy5kZXBzID0gW11cbiAgICBjYXRjaGVyLm9uKCdnZXQnLCBmdW5jdGlvbiAoZGVwKSB7XG4gICAgICAgIHZhciBoYXMgPSBnb3RbZGVwLmtleV1cbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgLy8gYXZvaWQgZHVwbGljYXRlIGJpbmRpbmdzXG4gICAgICAgICAgICAoaGFzICYmIGhhcy5jb21waWxlciA9PT0gZGVwLmNvbXBpbGVyKSB8fFxuICAgICAgICAgICAgLy8gYXZvaWQgcmVwZWF0ZWQgaXRlbXMgYXMgZGVwZW5kZW5jeVxuICAgICAgICAgICAgLy8gb25seSB3aGVuIHRoZSBiaW5kaW5nIGlzIGZyb20gc2VsZiBvciB0aGUgcGFyZW50IGNoYWluXG4gICAgICAgICAgICAoZGVwLmNvbXBpbGVyLnJlcGVhdCAmJiAhaXNQYXJlbnRPZihkZXAuY29tcGlsZXIsIGJpbmRpbmcuY29tcGlsZXIpKVxuICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIGdvdFtkZXAua2V5XSA9IGRlcFxuICAgICAgICB1dGlscy5sb2coJyAgLSAnICsgZGVwLmtleSlcbiAgICAgICAgYmluZGluZy5kZXBzLnB1c2goZGVwKVxuICAgICAgICBkZXAuc3Vicy5wdXNoKGJpbmRpbmcpXG4gICAgfSlcbiAgICBiaW5kaW5nLnZhbHVlLiRnZXQoKVxuICAgIGNhdGNoZXIub2ZmKCdnZXQnKVxufVxuXG4vKipcbiAqICBUZXN0IGlmIEEgaXMgYSBwYXJlbnQgb2Ygb3IgZXF1YWxzIEJcbiAqL1xuZnVuY3Rpb24gaXNQYXJlbnRPZiAoYSwgYikge1xuICAgIHdoaWxlIChiKSB7XG4gICAgICAgIGlmIChhID09PSBiKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgICAgIGIgPSBiLnBhcmVudFxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICAvKipcbiAgICAgKiAgdGhlIG9ic2VydmVyIHRoYXQgY2F0Y2hlcyBldmVudHMgdHJpZ2dlcmVkIGJ5IGdldHRlcnNcbiAgICAgKi9cbiAgICBjYXRjaGVyOiBjYXRjaGVyLFxuXG4gICAgLyoqXG4gICAgICogIHBhcnNlIGEgbGlzdCBvZiBjb21wdXRlZCBwcm9wZXJ0eSBiaW5kaW5nc1xuICAgICAqL1xuICAgIHBhcnNlOiBmdW5jdGlvbiAoYmluZGluZ3MpIHtcbiAgICAgICAgdXRpbHMubG9nKCdcXG5wYXJzaW5nIGRlcGVuZGVuY2llcy4uLicpXG4gICAgICAgIE9ic2VydmVyLnNob3VsZEdldCA9IHRydWVcbiAgICAgICAgYmluZGluZ3MuZm9yRWFjaChjYXRjaERlcHMpXG4gICAgICAgIE9ic2VydmVyLnNob3VsZEdldCA9IGZhbHNlXG4gICAgICAgIHV0aWxzLmxvZygnXFxuZG9uZS4nKVxuICAgIH1cbiAgICBcbn0iLCJ2YXIgZGlySWQgICAgICAgICAgID0gMSxcbiAgICBBUkdfUkUgICAgICAgICAgPSAvXltcXHdcXCQtXSskLyxcbiAgICBGSUxURVJfVE9LRU5fUkUgPSAvW15cXHMnXCJdK3wnW14nXSsnfFwiW15cIl0rXCIvZyxcbiAgICBORVNUSU5HX1JFICAgICAgPSAvXlxcJChwYXJlbnR8cm9vdClcXC4vLFxuICAgIFNJTkdMRV9WQVJfUkUgICA9IC9eW1xcd1xcLiRdKyQvLFxuICAgIFFVT1RFX1JFICAgICAgICA9IC9cIi9nLFxuICAgIFRleHRQYXJzZXIgICAgICA9IHJlcXVpcmUoJy4vdGV4dC1wYXJzZXInKVxuXG4vKipcbiAqICBEaXJlY3RpdmUgY2xhc3NcbiAqICByZXByZXNlbnRzIGEgc2luZ2xlIGRpcmVjdGl2ZSBpbnN0YW5jZSBpbiB0aGUgRE9NXG4gKi9cbmZ1bmN0aW9uIERpcmVjdGl2ZSAobmFtZSwgYXN0LCBkZWZpbml0aW9uLCBjb21waWxlciwgZWwpIHtcblxuICAgIHRoaXMuaWQgICAgICAgICAgICAgPSBkaXJJZCsrXG4gICAgdGhpcy5uYW1lICAgICAgICAgICA9IG5hbWVcbiAgICB0aGlzLmNvbXBpbGVyICAgICAgID0gY29tcGlsZXJcbiAgICB0aGlzLnZtICAgICAgICAgICAgID0gY29tcGlsZXIudm1cbiAgICB0aGlzLmVsICAgICAgICAgICAgID0gZWxcbiAgICB0aGlzLmNvbXB1dGVGaWx0ZXJzID0gZmFsc2VcbiAgICB0aGlzLmtleSAgICAgICAgICAgID0gYXN0LmtleVxuICAgIHRoaXMuYXJnICAgICAgICAgICAgPSBhc3QuYXJnXG4gICAgdGhpcy5leHByZXNzaW9uICAgICA9IGFzdC5leHByZXNzaW9uXG5cbiAgICB2YXIgaXNFbXB0eSA9IHRoaXMuZXhwcmVzc2lvbiA9PT0gJydcblxuICAgIC8vIG1peCBpbiBwcm9wZXJ0aWVzIGZyb20gdGhlIGRpcmVjdGl2ZSBkZWZpbml0aW9uXG4gICAgaWYgKHR5cGVvZiBkZWZpbml0aW9uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXNbaXNFbXB0eSA/ICdiaW5kJyA6ICd1cGRhdGUnXSA9IGRlZmluaXRpb25cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIGRlZmluaXRpb24pIHtcbiAgICAgICAgICAgIHRoaXNbcHJvcF0gPSBkZWZpbml0aW9uW3Byb3BdXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBlbXB0eSBleHByZXNzaW9uLCB3ZSdyZSBkb25lLlxuICAgIGlmIChpc0VtcHR5IHx8IHRoaXMuaXNFbXB0eSkge1xuICAgICAgICB0aGlzLmlzRW1wdHkgPSB0cnVlXG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmIChUZXh0UGFyc2VyLlJlZ2V4LnRlc3QodGhpcy5rZXkpKSB7XG4gICAgICAgIHRoaXMua2V5ID0gY29tcGlsZXIuZXZhbCh0aGlzLmtleSlcbiAgICAgICAgaWYgKHRoaXMuaXNMaXRlcmFsKSB7XG4gICAgICAgICAgICB0aGlzLmV4cHJlc3Npb24gPSB0aGlzLmtleVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGZpbHRlcnMgPSBhc3QuZmlsdGVycyxcbiAgICAgICAgZmlsdGVyLCBmbiwgaSwgbCwgY29tcHV0ZWRcbiAgICBpZiAoZmlsdGVycykge1xuICAgICAgICB0aGlzLmZpbHRlcnMgPSBbXVxuICAgICAgICBmb3IgKGkgPSAwLCBsID0gZmlsdGVycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGZpbHRlciA9IGZpbHRlcnNbaV1cbiAgICAgICAgICAgIGZuID0gdGhpcy5jb21waWxlci5nZXRPcHRpb24oJ2ZpbHRlcnMnLCBmaWx0ZXIubmFtZSlcbiAgICAgICAgICAgIGlmIChmbikge1xuICAgICAgICAgICAgICAgIGZpbHRlci5hcHBseSA9IGZuXG4gICAgICAgICAgICAgICAgdGhpcy5maWx0ZXJzLnB1c2goZmlsdGVyKVxuICAgICAgICAgICAgICAgIGlmIChmbi5jb21wdXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZCA9IHRydWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZmlsdGVycyB8fCAhdGhpcy5maWx0ZXJzLmxlbmd0aCkge1xuICAgICAgICB0aGlzLmZpbHRlcnMgPSBudWxsXG4gICAgfVxuXG4gICAgaWYgKGNvbXB1dGVkKSB7XG4gICAgICAgIHRoaXMuY29tcHV0ZWRLZXkgPSBEaXJlY3RpdmUuaW5saW5lRmlsdGVycyh0aGlzLmtleSwgdGhpcy5maWx0ZXJzKVxuICAgICAgICB0aGlzLmZpbHRlcnMgPSBudWxsXG4gICAgfVxuXG4gICAgdGhpcy5pc0V4cCA9XG4gICAgICAgIGNvbXB1dGVkIHx8XG4gICAgICAgICFTSU5HTEVfVkFSX1JFLnRlc3QodGhpcy5rZXkpIHx8XG4gICAgICAgIE5FU1RJTkdfUkUudGVzdCh0aGlzLmtleSlcblxufVxuXG52YXIgRGlyUHJvdG8gPSBEaXJlY3RpdmUucHJvdG90eXBlXG5cbi8qKlxuICogIGNhbGxlZCB3aGVuIGEgbmV3IHZhbHVlIGlzIHNldCBcbiAqICBmb3IgY29tcHV0ZWQgcHJvcGVydGllcywgdGhpcyB3aWxsIG9ubHkgYmUgY2FsbGVkIG9uY2VcbiAqICBkdXJpbmcgaW5pdGlhbGl6YXRpb24uXG4gKi9cbkRpclByb3RvLiR1cGRhdGUgPSBmdW5jdGlvbiAodmFsdWUsIGluaXQpIHtcbiAgICBpZiAodGhpcy4kbG9jaykgcmV0dXJuXG4gICAgaWYgKGluaXQgfHwgdmFsdWUgIT09IHRoaXMudmFsdWUgfHwgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpKSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZVxuICAgICAgICBpZiAodGhpcy51cGRhdGUpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKFxuICAgICAgICAgICAgICAgIHRoaXMuZmlsdGVycyAmJiAhdGhpcy5jb21wdXRlRmlsdGVyc1xuICAgICAgICAgICAgICAgICAgICA/IHRoaXMuJGFwcGx5RmlsdGVycyh2YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgOiB2YWx1ZSxcbiAgICAgICAgICAgICAgICBpbml0XG4gICAgICAgICAgICApXG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKlxuICogIHBpcGUgdGhlIHZhbHVlIHRocm91Z2ggZmlsdGVyc1xuICovXG5EaXJQcm90by4kYXBwbHlGaWx0ZXJzID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIGZpbHRlcmVkID0gdmFsdWUsIGZpbHRlclxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5maWx0ZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBmaWx0ZXIgPSB0aGlzLmZpbHRlcnNbaV1cbiAgICAgICAgZmlsdGVyZWQgPSBmaWx0ZXIuYXBwbHkuYXBwbHkodGhpcy52bSwgW2ZpbHRlcmVkXS5jb25jYXQoZmlsdGVyLmFyZ3MpKVxuICAgIH1cbiAgICByZXR1cm4gZmlsdGVyZWRcbn1cblxuLyoqXG4gKiAgVW5iaW5kIGRpcmV0aXZlXG4gKi9cbkRpclByb3RvLiR1bmJpbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gdGhpcyBjYW4gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZWwgaXMgZXZlbiBhc3NpZ25lZC4uLlxuICAgIGlmICghdGhpcy5lbCB8fCAhdGhpcy52bSkgcmV0dXJuXG4gICAgaWYgKHRoaXMudW5iaW5kKSB0aGlzLnVuYmluZCgpXG4gICAgdGhpcy52bSA9IHRoaXMuZWwgPSB0aGlzLmJpbmRpbmcgPSB0aGlzLmNvbXBpbGVyID0gbnVsbFxufVxuXG4vLyBFeHBvc2VkIHN0YXRpYyBtZXRob2RzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKlxuICogIFBhcnNlIGEgZGlyZWN0aXZlIHN0cmluZyBpbnRvIGFuIEFycmF5IG9mXG4gKiAgQVNULWxpa2Ugb2JqZWN0cyByZXByZXNlbnRpbmcgZGlyZWN0aXZlc1xuICovXG5EaXJlY3RpdmUucGFyc2UgPSBmdW5jdGlvbiAoc3RyKSB7XG5cbiAgICB2YXIgaW5TaW5nbGUgPSBmYWxzZSxcbiAgICAgICAgaW5Eb3VibGUgPSBmYWxzZSxcbiAgICAgICAgY3VybHkgICAgPSAwLFxuICAgICAgICBzcXVhcmUgICA9IDAsXG4gICAgICAgIHBhcmVuICAgID0gMCxcbiAgICAgICAgYmVnaW4gICAgPSAwLFxuICAgICAgICBhcmdJbmRleCA9IDAsXG4gICAgICAgIGRpcnMgICAgID0gW10sXG4gICAgICAgIGRpciAgICAgID0ge30sXG4gICAgICAgIGxhc3RGaWx0ZXJJbmRleCA9IDAsXG4gICAgICAgIGFyZ1xuXG4gICAgZm9yICh2YXIgYywgaSA9IDAsIGwgPSBzdHIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGMgPSBzdHIuY2hhckF0KGkpXG4gICAgICAgIGlmIChpblNpbmdsZSkge1xuICAgICAgICAgICAgLy8gY2hlY2sgc2luZ2xlIHF1b3RlXG4gICAgICAgICAgICBpZiAoYyA9PT0gXCInXCIpIGluU2luZ2xlID0gIWluU2luZ2xlXG4gICAgICAgIH0gZWxzZSBpZiAoaW5Eb3VibGUpIHtcbiAgICAgICAgICAgIC8vIGNoZWNrIGRvdWJsZSBxdW90ZVxuICAgICAgICAgICAgaWYgKGMgPT09ICdcIicpIGluRG91YmxlID0gIWluRG91YmxlXG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJywnICYmICFwYXJlbiAmJiAhY3VybHkgJiYgIXNxdWFyZSkge1xuICAgICAgICAgICAgLy8gcmVhY2hlZCB0aGUgZW5kIG9mIGEgZGlyZWN0aXZlXG4gICAgICAgICAgICBwdXNoRGlyKClcbiAgICAgICAgICAgIC8vIHJlc2V0ICYgc2tpcCB0aGUgY29tbWFcbiAgICAgICAgICAgIGRpciA9IHt9XG4gICAgICAgICAgICBiZWdpbiA9IGFyZ0luZGV4ID0gbGFzdEZpbHRlckluZGV4ID0gaSArIDFcbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnOicgJiYgIWRpci5rZXkgJiYgIWRpci5hcmcpIHtcbiAgICAgICAgICAgIC8vIGFyZ3VtZW50XG4gICAgICAgICAgICBhcmcgPSBzdHIuc2xpY2UoYmVnaW4sIGkpLnRyaW0oKVxuICAgICAgICAgICAgaWYgKEFSR19SRS50ZXN0KGFyZykpIHtcbiAgICAgICAgICAgICAgICBhcmdJbmRleCA9IGkgKyAxXG4gICAgICAgICAgICAgICAgZGlyLmFyZyA9IGFyZ1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICd8JyAmJiBzdHIuY2hhckF0KGkgKyAxKSAhPT0gJ3wnICYmIHN0ci5jaGFyQXQoaSAtIDEpICE9PSAnfCcpIHtcbiAgICAgICAgICAgIGlmIChkaXIua2V5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBmaXJzdCBmaWx0ZXIsIGVuZCBvZiBrZXlcbiAgICAgICAgICAgICAgICBsYXN0RmlsdGVySW5kZXggPSBpICsgMVxuICAgICAgICAgICAgICAgIGRpci5rZXkgPSBzdHIuc2xpY2UoYXJnSW5kZXgsIGkpLnRyaW0oKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBhbHJlYWR5IGhhcyBmaWx0ZXJcbiAgICAgICAgICAgICAgICBwdXNoRmlsdGVyKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnXCInKSB7XG4gICAgICAgICAgICBpbkRvdWJsZSA9IHRydWVcbiAgICAgICAgfSBlbHNlIGlmIChjID09PSBcIidcIikge1xuICAgICAgICAgICAgaW5TaW5nbGUgPSB0cnVlXG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJygnKSB7XG4gICAgICAgICAgICBwYXJlbisrXG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJyknKSB7XG4gICAgICAgICAgICBwYXJlbi0tXG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ1snKSB7XG4gICAgICAgICAgICBzcXVhcmUrK1xuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICddJykge1xuICAgICAgICAgICAgc3F1YXJlLS1cbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAneycpIHtcbiAgICAgICAgICAgIGN1cmx5KytcbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnfScpIHtcbiAgICAgICAgICAgIGN1cmx5LS1cbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoaSA9PT0gMCB8fCBiZWdpbiAhPT0gaSkge1xuICAgICAgICBwdXNoRGlyKClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwdXNoRGlyICgpIHtcbiAgICAgICAgZGlyLmV4cHJlc3Npb24gPSBzdHIuc2xpY2UoYmVnaW4sIGkpLnRyaW0oKVxuICAgICAgICBpZiAoZGlyLmtleSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkaXIua2V5ID0gc3RyLnNsaWNlKGFyZ0luZGV4LCBpKS50cmltKClcbiAgICAgICAgfSBlbHNlIGlmIChsYXN0RmlsdGVySW5kZXggIT09IGJlZ2luKSB7XG4gICAgICAgICAgICBwdXNoRmlsdGVyKClcbiAgICAgICAgfVxuICAgICAgICBpZiAoaSA9PT0gMCB8fCBkaXIua2V5KSB7XG4gICAgICAgICAgICBkaXJzLnB1c2goZGlyKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHVzaEZpbHRlciAoKSB7XG4gICAgICAgIHZhciBleHAgPSBzdHIuc2xpY2UobGFzdEZpbHRlckluZGV4LCBpKS50cmltKCksXG4gICAgICAgICAgICBmaWx0ZXJcbiAgICAgICAgaWYgKGV4cCkge1xuICAgICAgICAgICAgZmlsdGVyID0ge31cbiAgICAgICAgICAgIHZhciB0b2tlbnMgPSBleHAubWF0Y2goRklMVEVSX1RPS0VOX1JFKVxuICAgICAgICAgICAgZmlsdGVyLm5hbWUgPSB0b2tlbnNbMF1cbiAgICAgICAgICAgIGZpbHRlci5hcmdzID0gdG9rZW5zLmxlbmd0aCA+IDEgPyB0b2tlbnMuc2xpY2UoMSkgOiBudWxsXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpbHRlcikge1xuICAgICAgICAgICAgKGRpci5maWx0ZXJzID0gZGlyLmZpbHRlcnMgfHwgW10pLnB1c2goZmlsdGVyKVxuICAgICAgICB9XG4gICAgICAgIGxhc3RGaWx0ZXJJbmRleCA9IGkgKyAxXG4gICAgfVxuXG4gICAgcmV0dXJuIGRpcnNcbn1cblxuLyoqXG4gKiAgSW5saW5lIGNvbXB1dGVkIGZpbHRlcnMgc28gdGhleSBiZWNvbWUgcGFydFxuICogIG9mIHRoZSBleHByZXNzaW9uXG4gKi9cbkRpcmVjdGl2ZS5pbmxpbmVGaWx0ZXJzID0gZnVuY3Rpb24gKGtleSwgZmlsdGVycykge1xuICAgIHZhciBhcmdzLCBmaWx0ZXJcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGZpbHRlcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGZpbHRlciA9IGZpbHRlcnNbaV1cbiAgICAgICAgYXJncyA9IGZpbHRlci5hcmdzXG4gICAgICAgICAgICA/ICcsXCInICsgZmlsdGVyLmFyZ3MubWFwKGVzY2FwZVF1b3RlKS5qb2luKCdcIixcIicpICsgJ1wiJ1xuICAgICAgICAgICAgOiAnJ1xuICAgICAgICBrZXkgPSAndGhpcy4kY29tcGlsZXIuZ2V0T3B0aW9uKFwiZmlsdGVyc1wiLCBcIicgK1xuICAgICAgICAgICAgICAgIGZpbHRlci5uYW1lICtcbiAgICAgICAgICAgICdcIikuY2FsbCh0aGlzLCcgK1xuICAgICAgICAgICAgICAgIGtleSArIGFyZ3MgK1xuICAgICAgICAgICAgJyknXG4gICAgfVxuICAgIHJldHVybiBrZXlcbn1cblxuLyoqXG4gKiAgQ29udmVydCBkb3VibGUgcXVvdGVzIHRvIHNpbmdsZSBxdW90ZXNcbiAqICBzbyB0aGV5IGRvbid0IG1lc3MgdXAgdGhlIGdlbmVyYXRlZCBmdW5jdGlvbiBib2R5XG4gKi9cbmZ1bmN0aW9uIGVzY2FwZVF1b3RlICh2KSB7XG4gICAgcmV0dXJuIHYuaW5kZXhPZignXCInKSA+IC0xXG4gICAgICAgID8gdi5yZXBsYWNlKFFVT1RFX1JFLCAnXFwnJylcbiAgICAgICAgOiB2XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRGlyZWN0aXZlIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKSxcbiAgICBzbGljZSA9IFtdLnNsaWNlXG5cbi8qKlxuICogIEJpbmRpbmcgZm9yIGlubmVySFRNTFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIGJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gYSBjb21tZW50IG5vZGUgbWVhbnMgdGhpcyBpcyBhIGJpbmRpbmcgZm9yXG4gICAgICAgIC8vIHt7eyBpbmxpbmUgdW5lc2NhcGVkIGh0bWwgfX19XG4gICAgICAgIGlmICh0aGlzLmVsLm5vZGVUeXBlID09PSA4KSB7XG4gICAgICAgICAgICAvLyBob2xkIG5vZGVzXG4gICAgICAgICAgICB0aGlzLm5vZGVzID0gW11cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB1cGRhdGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YWx1ZSA9IHV0aWxzLmd1YXJkKHZhbHVlKVxuICAgICAgICBpZiAodGhpcy5ub2Rlcykge1xuICAgICAgICAgICAgdGhpcy5zd2FwKHZhbHVlKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbC5pbm5lckhUTUwgPSB2YWx1ZVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIHN3YXA6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcy5lbC5wYXJlbnROb2RlLFxuICAgICAgICAgICAgbm9kZXMgID0gdGhpcy5ub2RlcyxcbiAgICAgICAgICAgIGkgICAgICA9IG5vZGVzLmxlbmd0aFxuICAgICAgICAvLyByZW1vdmUgb2xkIG5vZGVzXG4gICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgIHBhcmVudC5yZW1vdmVDaGlsZChub2Rlc1tpXSlcbiAgICAgICAgfVxuICAgICAgICAvLyBjb252ZXJ0IG5ldyB2YWx1ZSB0byBhIGZyYWdtZW50XG4gICAgICAgIHZhciBmcmFnID0gdXRpbHMudG9GcmFnbWVudCh2YWx1ZSlcbiAgICAgICAgLy8gc2F2ZSBhIHJlZmVyZW5jZSB0byB0aGVzZSBub2RlcyBzbyB3ZSBjYW4gcmVtb3ZlIGxhdGVyXG4gICAgICAgIHRoaXMubm9kZXMgPSBzbGljZS5jYWxsKGZyYWcuY2hpbGROb2RlcylcbiAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShmcmFnLCB0aGlzLmVsKVxuICAgIH1cbn0iLCJ2YXIgdXRpbHMgICAgPSByZXF1aXJlKCcuLi91dGlscycpXG5cbi8qKlxuICogIE1hbmFnZXMgYSBjb25kaXRpb25hbCBjaGlsZCBWTVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIGJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgXG4gICAgICAgIHRoaXMucGFyZW50ID0gdGhpcy5lbC5wYXJlbnROb2RlXG4gICAgICAgIHRoaXMucmVmICAgID0gZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgndnVlLWlmJylcbiAgICAgICAgdGhpcy5DdG9yICAgPSB0aGlzLmNvbXBpbGVyLnJlc29sdmVDb21wb25lbnQodGhpcy5lbClcblxuICAgICAgICAvLyBpbnNlcnQgcmVmXG4gICAgICAgIHRoaXMucGFyZW50Lmluc2VydEJlZm9yZSh0aGlzLnJlZiwgdGhpcy5lbClcbiAgICAgICAgdGhpcy5wYXJlbnQucmVtb3ZlQ2hpbGQodGhpcy5lbClcblxuICAgICAgICBpZiAodXRpbHMuYXR0cih0aGlzLmVsLCAndmlldycpKSB7XG4gICAgICAgICAgICB1dGlscy53YXJuKFxuICAgICAgICAgICAgICAgICdDb25mbGljdDogdi1pZiBjYW5ub3QgYmUgdXNlZCB0b2dldGhlciB3aXRoIHYtdmlldy4gJyArXG4gICAgICAgICAgICAgICAgJ0p1c3Qgc2V0IHYtdmlld1xcJ3MgYmluZGluZyB2YWx1ZSB0byBlbXB0eSBzdHJpbmcgdG8gZW1wdHkgaXQuJ1xuICAgICAgICAgICAgKVxuICAgICAgICB9XG4gICAgICAgIGlmICh1dGlscy5hdHRyKHRoaXMuZWwsICdyZXBlYXQnKSkge1xuICAgICAgICAgICAgdXRpbHMud2FybihcbiAgICAgICAgICAgICAgICAnQ29uZmxpY3Q6IHYtaWYgY2Fubm90IGJlIHVzZWQgdG9nZXRoZXIgd2l0aCB2LXJlcGVhdC4gJyArXG4gICAgICAgICAgICAgICAgJ1VzZSBgdi1zaG93YCBvciB0aGUgYGZpbHRlckJ5YCBmaWx0ZXIgaW5zdGVhZC4nXG4gICAgICAgICAgICApXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAodmFsdWUpIHtcblxuICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLnVuYmluZCgpXG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuY2hpbGRWTSkge1xuICAgICAgICAgICAgdGhpcy5jaGlsZFZNID0gbmV3IHRoaXMuQ3Rvcih7XG4gICAgICAgICAgICAgICAgZWw6IHRoaXMuZWwuY2xvbmVOb2RlKHRydWUpLFxuICAgICAgICAgICAgICAgIHBhcmVudDogdGhpcy52bVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbXBpbGVyLmluaXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBhcmVudC5pbnNlcnRCZWZvcmUodGhpcy5jaGlsZFZNLiRlbCwgdGhpcy5yZWYpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRWTS4kYmVmb3JlKHRoaXMucmVmKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgIH0sXG5cbiAgICB1bmJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuY2hpbGRWTSkge1xuICAgICAgICAgICAgdGhpcy5jaGlsZFZNLiRkZXN0cm95KClcbiAgICAgICAgICAgIHRoaXMuY2hpbGRWTSA9IG51bGxcbiAgICAgICAgfVxuICAgIH1cbn0iLCJ2YXIgdXRpbHMgICAgICA9IHJlcXVpcmUoJy4uL3V0aWxzJyksXG4gICAgY29uZmlnICAgICA9IHJlcXVpcmUoJy4uL2NvbmZpZycpLFxuICAgIHRyYW5zaXRpb24gPSByZXF1aXJlKCcuLi90cmFuc2l0aW9uJyksXG4gICAgZGlyZWN0aXZlcyA9IG1vZHVsZS5leHBvcnRzID0gdXRpbHMuaGFzaCgpXG5cbi8qKlxuICogIE5lc3QgYW5kIG1hbmFnZSBhIENoaWxkIFZNXG4gKi9cbmRpcmVjdGl2ZXMuY29tcG9uZW50ID0ge1xuICAgIGlzTGl0ZXJhbDogdHJ1ZSxcbiAgICBiaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghdGhpcy5lbC52dWVfdm0pIHtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRWTSA9IG5ldyB0aGlzLkN0b3Ioe1xuICAgICAgICAgICAgICAgIGVsOiB0aGlzLmVsLFxuICAgICAgICAgICAgICAgIHBhcmVudDogdGhpcy52bVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH0sXG4gICAgdW5iaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmNoaWxkVk0pIHtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRWTS4kZGVzdHJveSgpXG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKlxuICogIEJpbmRpbmcgSFRNTCBhdHRyaWJ1dGVzXG4gKi9cbmRpcmVjdGl2ZXMuYXR0ciA9IHtcbiAgICBiaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwYXJhbXMgPSB0aGlzLnZtLiRvcHRpb25zLnBhcmFtQXR0cmlidXRlc1xuICAgICAgICB0aGlzLmlzUGFyYW0gPSBwYXJhbXMgJiYgcGFyYW1zLmluZGV4T2YodGhpcy5hcmcpID4gLTFcbiAgICB9LFxuICAgIHVwZGF0ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZSB8fCB2YWx1ZSA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5lbC5zZXRBdHRyaWJ1dGUodGhpcy5hcmcsIHZhbHVlKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbC5yZW1vdmVBdHRyaWJ1dGUodGhpcy5hcmcpXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaXNQYXJhbSkge1xuICAgICAgICAgICAgdGhpcy52bVt0aGlzLmFyZ10gPSB1dGlscy5jaGVja051bWJlcih2YWx1ZSlcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqXG4gKiAgQmluZGluZyB0ZXh0Q29udGVudFxuICovXG5kaXJlY3RpdmVzLnRleHQgPSB7XG4gICAgYmluZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmF0dHIgPSB0aGlzLmVsLm5vZGVUeXBlID09PSAzXG4gICAgICAgICAgICA/ICdub2RlVmFsdWUnXG4gICAgICAgICAgICA6ICd0ZXh0Q29udGVudCdcbiAgICB9LFxuICAgIHVwZGF0ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuZWxbdGhpcy5hdHRyXSA9IHV0aWxzLmd1YXJkKHZhbHVlKVxuICAgIH1cbn1cblxuLyoqXG4gKiAgQmluZGluZyBDU1MgZGlzcGxheSBwcm9wZXJ0eVxuICovXG5kaXJlY3RpdmVzLnNob3cgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgZWwgPSB0aGlzLmVsLFxuICAgICAgICB0YXJnZXQgPSB2YWx1ZSA/ICcnIDogJ25vbmUnLFxuICAgICAgICBjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBlbC5zdHlsZS5kaXNwbGF5ID0gdGFyZ2V0XG4gICAgICAgIH1cbiAgICB0cmFuc2l0aW9uKGVsLCB2YWx1ZSA/IDEgOiAtMSwgY2hhbmdlLCB0aGlzLmNvbXBpbGVyKVxufVxuXG4vKipcbiAqICBCaW5kaW5nIENTUyBjbGFzc2VzXG4gKi9cbmRpcmVjdGl2ZXNbJ2NsYXNzJ10gPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAodGhpcy5hcmcpIHtcbiAgICAgICAgdXRpbHNbdmFsdWUgPyAnYWRkQ2xhc3MnIDogJ3JlbW92ZUNsYXNzJ10odGhpcy5lbCwgdGhpcy5hcmcpXG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMubGFzdFZhbCkge1xuICAgICAgICAgICAgdXRpbHMucmVtb3ZlQ2xhc3ModGhpcy5lbCwgdGhpcy5sYXN0VmFsKVxuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgdXRpbHMuYWRkQ2xhc3ModGhpcy5lbCwgdmFsdWUpXG4gICAgICAgICAgICB0aGlzLmxhc3RWYWwgPSB2YWx1ZVxuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqICBPbmx5IHJlbW92ZWQgYWZ0ZXIgdGhlIG93bmVyIFZNIGlzIHJlYWR5XG4gKi9cbmRpcmVjdGl2ZXMuY2xvYWsgPSB7XG4gICAgaXNFbXB0eTogdHJ1ZSxcbiAgICBiaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlbCA9IHRoaXMuZWxcbiAgICAgICAgdGhpcy5jb21waWxlci5vYnNlcnZlci5vbmNlKCdob29rOnJlYWR5JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKGNvbmZpZy5wcmVmaXggKyAnLWNsb2FrJylcbiAgICAgICAgfSlcbiAgICB9XG59XG5cbi8qKlxuICogIFN0b3JlIGEgcmVmZXJlbmNlIHRvIHNlbGYgaW4gcGFyZW50IFZNJ3MgJFxuICovXG5kaXJlY3RpdmVzLnJlZiA9IHtcbiAgICBpc0xpdGVyYWw6IHRydWUsXG4gICAgYmluZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaWQgPSB0aGlzLmV4cHJlc3Npb25cbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICB0aGlzLnZtLiRwYXJlbnQuJFtpZF0gPSB0aGlzLnZtXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHVuYmluZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaWQgPSB0aGlzLmV4cHJlc3Npb25cbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy52bS4kcGFyZW50LiRbaWRdXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmRpcmVjdGl2ZXMub24gICAgICA9IHJlcXVpcmUoJy4vb24nKVxuZGlyZWN0aXZlcy5yZXBlYXQgID0gcmVxdWlyZSgnLi9yZXBlYXQnKVxuZGlyZWN0aXZlcy5tb2RlbCAgID0gcmVxdWlyZSgnLi9tb2RlbCcpXG5kaXJlY3RpdmVzWydpZiddICAgPSByZXF1aXJlKCcuL2lmJylcbmRpcmVjdGl2ZXNbJ3dpdGgnXSA9IHJlcXVpcmUoJy4vd2l0aCcpXG5kaXJlY3RpdmVzLmh0bWwgICAgPSByZXF1aXJlKCcuL2h0bWwnKVxuZGlyZWN0aXZlcy5zdHlsZSAgID0gcmVxdWlyZSgnLi9zdHlsZScpXG5kaXJlY3RpdmVzLnBhcnRpYWwgPSByZXF1aXJlKCcuL3BhcnRpYWwnKVxuZGlyZWN0aXZlcy52aWV3ICAgID0gcmVxdWlyZSgnLi92aWV3JykiLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpLFxuICAgIGlzSUU5ID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdNU0lFIDkuMCcpID4gMCxcbiAgICBmaWx0ZXIgPSBbXS5maWx0ZXJcblxuLyoqXG4gKiAgUmV0dXJucyBhbiBhcnJheSBvZiB2YWx1ZXMgZnJvbSBhIG11bHRpcGxlIHNlbGVjdFxuICovXG5mdW5jdGlvbiBnZXRNdWx0aXBsZVNlbGVjdE9wdGlvbnMgKHNlbGVjdCkge1xuICAgIHJldHVybiBmaWx0ZXJcbiAgICAgICAgLmNhbGwoc2VsZWN0Lm9wdGlvbnMsIGZ1bmN0aW9uIChvcHRpb24pIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRpb24uc2VsZWN0ZWRcbiAgICAgICAgfSlcbiAgICAgICAgLm1hcChmdW5jdGlvbiAob3B0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0aW9uLnZhbHVlIHx8IG9wdGlvbi50ZXh0XG4gICAgICAgIH0pXG59XG5cbi8qKlxuICogIFR3by13YXkgYmluZGluZyBmb3IgZm9ybSBpbnB1dCBlbGVtZW50c1xuICovXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIGJpbmQ6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgICAgICBlbCAgID0gc2VsZi5lbCxcbiAgICAgICAgICAgIHR5cGUgPSBlbC50eXBlLFxuICAgICAgICAgICAgdGFnICA9IGVsLnRhZ05hbWVcblxuICAgICAgICBzZWxmLmxvY2sgPSBmYWxzZVxuICAgICAgICBzZWxmLm93bmVyVk0gPSBzZWxmLmJpbmRpbmcuY29tcGlsZXIudm1cblxuICAgICAgICAvLyBkZXRlcm1pbmUgd2hhdCBldmVudCB0byBsaXN0ZW4gdG9cbiAgICAgICAgc2VsZi5ldmVudCA9XG4gICAgICAgICAgICAoc2VsZi5jb21waWxlci5vcHRpb25zLmxhenkgfHxcbiAgICAgICAgICAgIHRhZyA9PT0gJ1NFTEVDVCcgfHxcbiAgICAgICAgICAgIHR5cGUgPT09ICdjaGVja2JveCcgfHwgdHlwZSA9PT0gJ3JhZGlvJylcbiAgICAgICAgICAgICAgICA/ICdjaGFuZ2UnXG4gICAgICAgICAgICAgICAgOiAnaW5wdXQnXG5cbiAgICAgICAgLy8gZGV0ZXJtaW5lIHRoZSBhdHRyaWJ1dGUgdG8gY2hhbmdlIHdoZW4gdXBkYXRpbmdcbiAgICAgICAgc2VsZi5hdHRyID0gdHlwZSA9PT0gJ2NoZWNrYm94J1xuICAgICAgICAgICAgPyAnY2hlY2tlZCdcbiAgICAgICAgICAgIDogKHRhZyA9PT0gJ0lOUFVUJyB8fCB0YWcgPT09ICdTRUxFQ1QnIHx8IHRhZyA9PT0gJ1RFWFRBUkVBJylcbiAgICAgICAgICAgICAgICA/ICd2YWx1ZSdcbiAgICAgICAgICAgICAgICA6ICdpbm5lckhUTUwnXG5cbiAgICAgICAgLy8gc2VsZWN0W211bHRpcGxlXSBzdXBwb3J0XG4gICAgICAgIGlmKHRhZyA9PT0gJ1NFTEVDVCcgJiYgZWwuaGFzQXR0cmlidXRlKCdtdWx0aXBsZScpKSB7XG4gICAgICAgICAgICB0aGlzLm11bHRpID0gdHJ1ZVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNvbXBvc2l0aW9uTG9jayA9IGZhbHNlXG4gICAgICAgIHNlbGYuY0xvY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb21wb3NpdGlvbkxvY2sgPSB0cnVlXG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5jVW5sb2NrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29tcG9zaXRpb25Mb2NrID0gZmFsc2VcbiAgICAgICAgfVxuICAgICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdjb21wb3NpdGlvbnN0YXJ0JywgdGhpcy5jTG9jaylcbiAgICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignY29tcG9zaXRpb25lbmQnLCB0aGlzLmNVbmxvY2spXG5cbiAgICAgICAgLy8gYXR0YWNoIGxpc3RlbmVyXG4gICAgICAgIHNlbGYuc2V0ID0gc2VsZi5maWx0ZXJzXG4gICAgICAgICAgICA/IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9zaXRpb25Mb2NrKSByZXR1cm5cbiAgICAgICAgICAgICAgICAvLyBpZiB0aGlzIGRpcmVjdGl2ZSBoYXMgZmlsdGVyc1xuICAgICAgICAgICAgICAgIC8vIHdlIG5lZWQgdG8gbGV0IHRoZSB2bS4kc2V0IHRyaWdnZXJcbiAgICAgICAgICAgICAgICAvLyB1cGRhdGUoKSBzbyBmaWx0ZXJzIGFyZSBhcHBsaWVkLlxuICAgICAgICAgICAgICAgIC8vIHRoZXJlZm9yZSB3ZSBoYXZlIHRvIHJlY29yZCBjdXJzb3IgcG9zaXRpb25cbiAgICAgICAgICAgICAgICAvLyBzbyB0aGF0IGFmdGVyIHZtLiRzZXQgY2hhbmdlcyB0aGUgaW5wdXRcbiAgICAgICAgICAgICAgICAvLyB2YWx1ZSB3ZSBjYW4gcHV0IHRoZSBjdXJzb3IgYmFjayBhdCB3aGVyZSBpdCBpc1xuICAgICAgICAgICAgICAgIHZhciBjdXJzb3JQb3NcbiAgICAgICAgICAgICAgICB0cnkgeyBjdXJzb3JQb3MgPSBlbC5zZWxlY3Rpb25TdGFydCB9IGNhdGNoIChlKSB7fVxuXG4gICAgICAgICAgICAgICAgc2VsZi5fc2V0KClcblxuICAgICAgICAgICAgICAgIC8vIHNpbmNlIHVwZGF0ZXMgYXJlIGFzeW5jXG4gICAgICAgICAgICAgICAgLy8gd2UgbmVlZCB0byByZXNldCBjdXJzb3IgcG9zaXRpb24gYXN5bmMgdG9vXG4gICAgICAgICAgICAgICAgdXRpbHMubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY3Vyc29yUG9zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnNldFNlbGVjdGlvblJhbmdlKGN1cnNvclBvcywgY3Vyc29yUG9zKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChjb21wb3NpdGlvbkxvY2spIHJldHVyblxuICAgICAgICAgICAgICAgIC8vIG5vIGZpbHRlcnMsIGRvbid0IGxldCBpdCB0cmlnZ2VyIHVwZGF0ZSgpXG4gICAgICAgICAgICAgICAgc2VsZi5sb2NrID0gdHJ1ZVxuXG4gICAgICAgICAgICAgICAgc2VsZi5fc2V0KClcblxuICAgICAgICAgICAgICAgIHV0aWxzLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2NrID0gZmFsc2VcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICBlbC5hZGRFdmVudExpc3RlbmVyKHNlbGYuZXZlbnQsIHNlbGYuc2V0KVxuXG4gICAgICAgIC8vIGZpeCBzaGl0IGZvciBJRTlcbiAgICAgICAgLy8gc2luY2UgaXQgZG9lc24ndCBmaXJlIGlucHV0IG9uIGJhY2tzcGFjZSAvIGRlbCAvIGN1dFxuICAgICAgICBpZiAoaXNJRTkpIHtcbiAgICAgICAgICAgIHNlbGYub25DdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgLy8gY3V0IGV2ZW50IGZpcmVzIGJlZm9yZSB0aGUgdmFsdWUgYWN0dWFsbHkgY2hhbmdlc1xuICAgICAgICAgICAgICAgIHV0aWxzLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5zZXQoKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWxmLm9uRGVsID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSA0NiB8fCBlLmtleUNvZGUgPT09IDgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5zZXQoKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2N1dCcsIHNlbGYub25DdXQpXG4gICAgICAgICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIHNlbGYub25EZWwpXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgX3NldDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLm93bmVyVk0uJHNldChcbiAgICAgICAgICAgIHRoaXMua2V5LCB0aGlzLm11bHRpXG4gICAgICAgICAgICAgICAgPyBnZXRNdWx0aXBsZVNlbGVjdE9wdGlvbnModGhpcy5lbClcbiAgICAgICAgICAgICAgICA6IHRoaXMuZWxbdGhpcy5hdHRyXVxuICAgICAgICApXG4gICAgfSxcblxuICAgIHVwZGF0ZTogZnVuY3Rpb24gKHZhbHVlLCBpbml0KSB7XG4gICAgICAgIC8qIGpzaGludCBlcWVxZXE6IGZhbHNlICovXG4gICAgICAgIC8vIHN5bmMgYmFjayBpbmxpbmUgdmFsdWUgaWYgaW5pdGlhbCBkYXRhIGlzIHVuZGVmaW5lZFxuICAgICAgICBpZiAoaW5pdCAmJiB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc2V0KClcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5sb2NrKSByZXR1cm5cbiAgICAgICAgdmFyIGVsID0gdGhpcy5lbFxuICAgICAgICBpZiAoZWwudGFnTmFtZSA9PT0gJ1NFTEVDVCcpIHsgLy8gc2VsZWN0IGRyb3Bkb3duXG4gICAgICAgICAgICBlbC5zZWxlY3RlZEluZGV4ID0gLTFcbiAgICAgICAgICAgIGlmKHRoaXMubXVsdGkgJiYgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZS5mb3JFYWNoKHRoaXMudXBkYXRlU2VsZWN0LCB0aGlzKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVNlbGVjdCh2YWx1ZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChlbC50eXBlID09PSAncmFkaW8nKSB7IC8vIHJhZGlvIGJ1dHRvblxuICAgICAgICAgICAgZWwuY2hlY2tlZCA9IHZhbHVlID09IGVsLnZhbHVlXG4gICAgICAgIH0gZWxzZSBpZiAoZWwudHlwZSA9PT0gJ2NoZWNrYm94JykgeyAvLyBjaGVja2JveFxuICAgICAgICAgICAgZWwuY2hlY2tlZCA9ICEhdmFsdWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsW3RoaXMuYXR0cl0gPSB1dGlscy5ndWFyZCh2YWx1ZSlcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB1cGRhdGVTZWxlY3Q6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvKiBqc2hpbnQgZXFlcWVxOiBmYWxzZSAqL1xuICAgICAgICAvLyBzZXR0aW5nIDxzZWxlY3Q+J3MgdmFsdWUgaW4gSUU5IGRvZXNuJ3Qgd29ya1xuICAgICAgICAvLyB3ZSBoYXZlIHRvIG1hbnVhbGx5IGxvb3AgdGhyb3VnaCB0aGUgb3B0aW9uc1xuICAgICAgICB2YXIgb3B0aW9ucyA9IHRoaXMuZWwub3B0aW9ucyxcbiAgICAgICAgICAgIGkgPSBvcHRpb25zLmxlbmd0aFxuICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9uc1tpXS52YWx1ZSA9PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnNbaV0uc2VsZWN0ZWQgPSB0cnVlXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB1bmJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGVsID0gdGhpcy5lbFxuICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKHRoaXMuZXZlbnQsIHRoaXMuc2V0KVxuICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdjb21wb3NpdGlvbnN0YXJ0JywgdGhpcy5jTG9jaylcbiAgICAgICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignY29tcG9zaXRpb25lbmQnLCB0aGlzLmNVbmxvY2spXG4gICAgICAgIGlmIChpc0lFOSkge1xuICAgICAgICAgICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignY3V0JywgdGhpcy5vbkN1dClcbiAgICAgICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleXVwJywgdGhpcy5vbkRlbClcbiAgICAgICAgfVxuICAgIH1cbn0iLCJ2YXIgdXRpbHMgICAgPSByZXF1aXJlKCcuLi91dGlscycpXG5cbi8qKlxuICogIEJpbmRpbmcgZm9yIGV2ZW50IGxpc3RlbmVyc1xuICovXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIGlzRm46IHRydWUsXG5cbiAgICBiaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IHRoaXMuYmluZGluZy5pc0V4cFxuICAgICAgICAgICAgPyB0aGlzLnZtXG4gICAgICAgICAgICA6IHRoaXMuYmluZGluZy5jb21waWxlci52bVxuICAgICAgICBpZiAodGhpcy5lbC50YWdOYW1lID09PSAnSUZSQU1FJyAmJiB0aGlzLmFyZyAhPT0gJ2xvYWQnKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgICAgICAgIHRoaXMuaWZyYW1lQmluZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmVsLmNvbnRlbnRXaW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihzZWxmLmFyZywgc2VsZi5oYW5kbGVyKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5lbC5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgdGhpcy5pZnJhbWVCaW5kKVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIHVwZGF0ZTogZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB1dGlscy53YXJuKCdEaXJlY3RpdmUgXCJ2LW9uOicgKyB0aGlzLmV4cHJlc3Npb24gKyAnXCIgZXhwZWN0cyBhIG1ldGhvZC4nKVxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZXNldCgpXG4gICAgICAgIHZhciB2bSA9IHRoaXMudm0sXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5jb250ZXh0XG4gICAgICAgIHRoaXMuaGFuZGxlciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBlLnRhcmdldFZNID0gdm1cbiAgICAgICAgICAgIGNvbnRleHQuJGV2ZW50ID0gZVxuICAgICAgICAgICAgdmFyIHJlcyA9IGhhbmRsZXIuY2FsbChjb250ZXh0LCBlKVxuICAgICAgICAgICAgY29udGV4dC4kZXZlbnQgPSBudWxsXG4gICAgICAgICAgICByZXR1cm4gcmVzXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaWZyYW1lQmluZCkge1xuICAgICAgICAgICAgdGhpcy5pZnJhbWVCaW5kKClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lcih0aGlzLmFyZywgdGhpcy5oYW5kbGVyKVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIHJlc2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlbCA9IHRoaXMuaWZyYW1lQmluZFxuICAgICAgICAgICAgPyB0aGlzLmVsLmNvbnRlbnRXaW5kb3dcbiAgICAgICAgICAgIDogdGhpcy5lbFxuICAgICAgICBpZiAodGhpcy5oYW5kbGVyKSB7XG4gICAgICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKHRoaXMuYXJnLCB0aGlzLmhhbmRsZXIpXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdW5iaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucmVzZXQoKVxuICAgICAgICB0aGlzLmVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWQnLCB0aGlzLmlmcmFtZUJpbmQpXG4gICAgfVxufSIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJylcblxuLyoqXG4gKiAgQmluZGluZyBmb3IgcGFydGlhbHNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBpc0xpdGVyYWw6IHRydWUsXG5cbiAgICBiaW5kOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdmFyIGlkID0gdGhpcy5leHByZXNzaW9uXG4gICAgICAgIGlmICghaWQpIHJldHVyblxuXG4gICAgICAgIHZhciBlbCAgICAgICA9IHRoaXMuZWwsXG4gICAgICAgICAgICBjb21waWxlciA9IHRoaXMuY29tcGlsZXIsXG4gICAgICAgICAgICBwYXJ0aWFsICA9IGNvbXBpbGVyLmdldE9wdGlvbigncGFydGlhbHMnLCBpZClcblxuICAgICAgICBpZiAoIXBhcnRpYWwpIHtcbiAgICAgICAgICAgIGlmIChpZCA9PT0gJ3lpZWxkJykge1xuICAgICAgICAgICAgICAgIHV0aWxzLndhcm4oJ3t7PnlpZWxkfX0gc3ludGF4IGhhcyBiZWVuIGRlcHJlY2F0ZWQuIFVzZSA8Y29udGVudD4gdGFnIGluc3RlYWQuJylcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG5cbiAgICAgICAgcGFydGlhbCA9IHBhcnRpYWwuY2xvbmVOb2RlKHRydWUpXG5cbiAgICAgICAgLy8gY29tbWVudCByZWYgbm9kZSBtZWFucyBpbmxpbmUgcGFydGlhbFxuICAgICAgICBpZiAoZWwubm9kZVR5cGUgPT09IDgpIHtcblxuICAgICAgICAgICAgLy8ga2VlcCBhIHJlZiBmb3IgdGhlIHBhcnRpYWwncyBjb250ZW50IG5vZGVzXG4gICAgICAgICAgICB2YXIgbm9kZXMgPSBbXS5zbGljZS5jYWxsKHBhcnRpYWwuY2hpbGROb2RlcyksXG4gICAgICAgICAgICAgICAgcGFyZW50ID0gZWwucGFyZW50Tm9kZVxuICAgICAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShwYXJ0aWFsLCBlbClcbiAgICAgICAgICAgIHBhcmVudC5yZW1vdmVDaGlsZChlbClcbiAgICAgICAgICAgIC8vIGNvbXBpbGUgcGFydGlhbCBhZnRlciBhcHBlbmRpbmcsIGJlY2F1c2UgaXRzIGNoaWxkcmVuJ3MgcGFyZW50Tm9kZVxuICAgICAgICAgICAgLy8gd2lsbCBjaGFuZ2UgZnJvbSB0aGUgZnJhZ21lbnQgdG8gdGhlIGNvcnJlY3QgcGFyZW50Tm9kZS5cbiAgICAgICAgICAgIC8vIFRoaXMgY291bGQgYWZmZWN0IGRpcmVjdGl2ZXMgdGhhdCBuZWVkIGFjY2VzcyB0byBpdHMgZWxlbWVudCdzIHBhcmVudE5vZGUuXG4gICAgICAgICAgICBub2Rlcy5mb3JFYWNoKGNvbXBpbGVyLmNvbXBpbGUsIGNvbXBpbGVyKVxuXG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIC8vIGp1c3Qgc2V0IGlubmVySFRNTC4uLlxuICAgICAgICAgICAgZWwuaW5uZXJIVE1MID0gJydcbiAgICAgICAgICAgIGVsLmFwcGVuZENoaWxkKHBhcnRpYWwpXG5cbiAgICAgICAgfVxuICAgIH1cblxufSIsInZhciB1dGlscyAgICAgID0gcmVxdWlyZSgnLi4vdXRpbHMnKSxcbiAgICBjb25maWcgICAgID0gcmVxdWlyZSgnLi4vY29uZmlnJylcblxuLyoqXG4gKiAgQmluZGluZyB0aGF0IG1hbmFnZXMgVk1zIGJhc2VkIG9uIGFuIEFycmF5XG4gKi9cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgYmluZDogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHRoaXMuaWRlbnRpZmllciA9ICckcicgKyB0aGlzLmlkXG5cbiAgICAgICAgLy8gYSBoYXNoIHRvIGNhY2hlIHRoZSBzYW1lIGV4cHJlc3Npb25zIG9uIHJlcGVhdGVkIGluc3RhbmNlc1xuICAgICAgICAvLyBzbyB0aGV5IGRvbid0IGhhdmUgdG8gYmUgY29tcGlsZWQgZm9yIGV2ZXJ5IHNpbmdsZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmV4cENhY2hlID0gdXRpbHMuaGFzaCgpXG5cbiAgICAgICAgdmFyIGVsICAgPSB0aGlzLmVsLFxuICAgICAgICAgICAgY3RuICA9IHRoaXMuY29udGFpbmVyID0gZWwucGFyZW50Tm9kZVxuXG4gICAgICAgIC8vIGV4dHJhY3QgY2hpbGQgSWQsIGlmIGFueVxuICAgICAgICB0aGlzLmNoaWxkSWQgPSB0aGlzLmNvbXBpbGVyLmV2YWwodXRpbHMuYXR0cihlbCwgJ3JlZicpKVxuXG4gICAgICAgIC8vIGNyZWF0ZSBhIGNvbW1lbnQgbm9kZSBhcyBhIHJlZmVyZW5jZSBub2RlIGZvciBET00gaW5zZXJ0aW9uc1xuICAgICAgICB0aGlzLnJlZiA9IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoY29uZmlnLnByZWZpeCArICctcmVwZWF0LScgKyB0aGlzLmtleSlcbiAgICAgICAgY3RuLmluc2VydEJlZm9yZSh0aGlzLnJlZiwgZWwpXG4gICAgICAgIGN0bi5yZW1vdmVDaGlsZChlbClcblxuICAgICAgICB0aGlzLmNvbGxlY3Rpb24gPSBudWxsXG4gICAgICAgIHRoaXMudm1zID0gbnVsbFxuXG4gICAgfSxcblxuICAgIHVwZGF0ZTogZnVuY3Rpb24gKGNvbGxlY3Rpb24pIHtcblxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoY29sbGVjdGlvbikpIHtcbiAgICAgICAgICAgIGlmICh1dGlscy5pc09iamVjdChjb2xsZWN0aW9uKSkge1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24gPSB1dGlscy5vYmplY3RUb0FycmF5KGNvbGxlY3Rpb24pXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHV0aWxzLndhcm4oJ3YtcmVwZWF0IG9ubHkgYWNjZXB0cyBBcnJheSBvciBPYmplY3QgdmFsdWVzLicpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBrZWVwIHJlZmVyZW5jZSBvZiBvbGQgZGF0YSBhbmQgVk1zXG4gICAgICAgIC8vIHNvIHdlIGNhbiByZXVzZSB0aGVtIGlmIHBvc3NpYmxlXG4gICAgICAgIHRoaXMub2xkVk1zID0gdGhpcy52bXNcbiAgICAgICAgdGhpcy5vbGRDb2xsZWN0aW9uID0gdGhpcy5jb2xsZWN0aW9uXG4gICAgICAgIGNvbGxlY3Rpb24gPSB0aGlzLmNvbGxlY3Rpb24gPSBjb2xsZWN0aW9uIHx8IFtdXG5cbiAgICAgICAgdmFyIGlzT2JqZWN0ID0gY29sbGVjdGlvblswXSAmJiB1dGlscy5pc09iamVjdChjb2xsZWN0aW9uWzBdKVxuICAgICAgICB0aGlzLnZtcyA9IHRoaXMub2xkQ29sbGVjdGlvblxuICAgICAgICAgICAgPyB0aGlzLmRpZmYoY29sbGVjdGlvbiwgaXNPYmplY3QpXG4gICAgICAgICAgICA6IHRoaXMuaW5pdChjb2xsZWN0aW9uLCBpc09iamVjdClcblxuICAgICAgICBpZiAodGhpcy5jaGlsZElkKSB7XG4gICAgICAgICAgICB0aGlzLnZtLiRbdGhpcy5jaGlsZElkXSA9IHRoaXMudm1zXG4gICAgICAgIH1cblxuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbiAoY29sbGVjdGlvbiwgaXNPYmplY3QpIHtcbiAgICAgICAgdmFyIHZtLCB2bXMgPSBbXVxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGNvbGxlY3Rpb24ubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICB2bSA9IHRoaXMuYnVpbGQoY29sbGVjdGlvbltpXSwgaSwgaXNPYmplY3QpXG4gICAgICAgICAgICB2bXMucHVzaCh2bSlcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbXBpbGVyLmluaXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5pbnNlcnRCZWZvcmUodm0uJGVsLCB0aGlzLnJlZilcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdm0uJGJlZm9yZSh0aGlzLnJlZilcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdm1zXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBEaWZmIHRoZSBuZXcgYXJyYXkgd2l0aCB0aGUgb2xkXG4gICAgICogIGFuZCBkZXRlcm1pbmUgdGhlIG1pbmltdW0gYW1vdW50IG9mIERPTSBtYW5pcHVsYXRpb25zLlxuICAgICAqL1xuICAgIGRpZmY6IGZ1bmN0aW9uIChuZXdDb2xsZWN0aW9uLCBpc09iamVjdCkge1xuXG4gICAgICAgIHZhciBpLCBsLCBpdGVtLCB2bSxcbiAgICAgICAgICAgIG9sZEluZGV4LFxuICAgICAgICAgICAgdGFyZ2V0TmV4dCxcbiAgICAgICAgICAgIGN1cnJlbnROZXh0LFxuICAgICAgICAgICAgbmV4dEVsLFxuICAgICAgICAgICAgY3RuICAgID0gdGhpcy5jb250YWluZXIsXG4gICAgICAgICAgICBvbGRWTXMgPSB0aGlzLm9sZFZNcyxcbiAgICAgICAgICAgIHZtcyAgICA9IFtdXG5cbiAgICAgICAgdm1zLmxlbmd0aCA9IG5ld0NvbGxlY3Rpb24ubGVuZ3RoXG5cbiAgICAgICAgLy8gZmlyc3QgcGFzcywgY29sbGVjdCBuZXcgcmV1c2VkIGFuZCBuZXcgY3JlYXRlZFxuICAgICAgICBmb3IgKGkgPSAwLCBsID0gbmV3Q29sbGVjdGlvbi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGl0ZW0gPSBuZXdDb2xsZWN0aW9uW2ldXG4gICAgICAgICAgICBpZiAoaXNPYmplY3QpIHtcbiAgICAgICAgICAgICAgICBpdGVtLiRpbmRleCA9IGlcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS5fX2VtaXR0ZXJfXyAmJiBpdGVtLl9fZW1pdHRlcl9fW3RoaXMuaWRlbnRpZmllcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBwaWVjZSBvZiBkYXRhIGlzIGJlaW5nIHJldXNlZC5cbiAgICAgICAgICAgICAgICAgICAgLy8gcmVjb3JkIGl0cyBmaW5hbCBwb3NpdGlvbiBpbiByZXVzZWQgdm1zXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uJHJldXNlZCA9IHRydWVcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2bXNbaV0gPSB0aGlzLmJ1aWxkKGl0ZW0sIGksIGlzT2JqZWN0KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gd2UgY2FuJ3QgYXR0YWNoIGFuIGlkZW50aWZpZXIgdG8gcHJpbWl0aXZlIHZhbHVlc1xuICAgICAgICAgICAgICAgIC8vIHNvIGhhdmUgdG8gZG8gYW4gaW5kZXhPZi4uLlxuICAgICAgICAgICAgICAgIG9sZEluZGV4ID0gaW5kZXhPZihvbGRWTXMsIGl0ZW0pXG4gICAgICAgICAgICAgICAgaWYgKG9sZEluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVjb3JkIHRoZSBwb3NpdGlvbiBvbiB0aGUgZXhpc3Rpbmcgdm1cbiAgICAgICAgICAgICAgICAgICAgb2xkVk1zW29sZEluZGV4XS4kcmV1c2VkID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICBvbGRWTXNbb2xkSW5kZXhdLiRkYXRhLiRpbmRleCA9IGlcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2bXNbaV0gPSB0aGlzLmJ1aWxkKGl0ZW0sIGksIGlzT2JqZWN0KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHNlY29uZCBwYXNzLCBjb2xsZWN0IG9sZCByZXVzZWQgYW5kIGRlc3Ryb3kgdW51c2VkXG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBvbGRWTXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICB2bSA9IG9sZFZNc1tpXVxuICAgICAgICAgICAgaXRlbSA9IHRoaXMuYXJnXG4gICAgICAgICAgICAgICAgPyB2bS4kZGF0YVt0aGlzLmFyZ11cbiAgICAgICAgICAgICAgICA6IHZtLiRkYXRhXG4gICAgICAgICAgICBpZiAoaXRlbS4kcmV1c2VkKSB7XG4gICAgICAgICAgICAgICAgdm0uJHJldXNlZCA9IHRydWVcbiAgICAgICAgICAgICAgICBkZWxldGUgaXRlbS4kcmV1c2VkXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodm0uJHJldXNlZCkge1xuICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgaW5kZXggdG8gbGF0ZXN0XG4gICAgICAgICAgICAgICAgdm0uJGluZGV4ID0gaXRlbS4kaW5kZXhcbiAgICAgICAgICAgICAgICAvLyB0aGUgaXRlbSBjb3VsZCBoYXZlIGhhZCBhIG5ldyBrZXlcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS4ka2V5ICYmIGl0ZW0uJGtleSAhPT0gdm0uJGtleSkge1xuICAgICAgICAgICAgICAgICAgICB2bS4ka2V5ID0gaXRlbS4ka2V5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZtc1t2bS4kaW5kZXhdID0gdm1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBvbmUgY2FuIGJlIGRlc3Ryb3llZC5cbiAgICAgICAgICAgICAgICBpZiAoaXRlbS5fX2VtaXR0ZXJfXykge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgaXRlbS5fX2VtaXR0ZXJfX1t0aGlzLmlkZW50aWZpZXJdXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZtLiRkZXN0cm95KClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGZpbmFsIHBhc3MsIG1vdmUvaW5zZXJ0IERPTSBlbGVtZW50c1xuICAgICAgICBpID0gdm1zLmxlbmd0aFxuICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICB2bSA9IHZtc1tpXVxuICAgICAgICAgICAgaXRlbSA9IHZtLiRkYXRhXG4gICAgICAgICAgICB0YXJnZXROZXh0ID0gdm1zW2kgKyAxXVxuICAgICAgICAgICAgaWYgKHZtLiRyZXVzZWQpIHtcbiAgICAgICAgICAgICAgICBuZXh0RWwgPSB2bS4kZWwubmV4dFNpYmxpbmdcbiAgICAgICAgICAgICAgICAvLyBkZXN0cm95ZWQgVk1zJyBlbGVtZW50IG1pZ2h0IHN0aWxsIGJlIGluIHRoZSBET01cbiAgICAgICAgICAgICAgICAvLyBkdWUgdG8gdHJhbnNpdGlvbnNcbiAgICAgICAgICAgICAgICB3aGlsZSAoIW5leHRFbC52dWVfdm0gJiYgbmV4dEVsICE9PSB0aGlzLnJlZikge1xuICAgICAgICAgICAgICAgICAgICBuZXh0RWwgPSBuZXh0RWwubmV4dFNpYmxpbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3VycmVudE5leHQgPSBuZXh0RWwudnVlX3ZtXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnROZXh0ICE9PSB0YXJnZXROZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0TmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3RuLmluc2VydEJlZm9yZSh2bS4kZWwsIHRoaXMucmVmKVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dEVsID0gdGFyZ2V0TmV4dC4kZWxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5ldyBWTXMnIGVsZW1lbnQgbWlnaHQgbm90IGJlIGluIHRoZSBET00geWV0XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkdWUgdG8gdHJhbnNpdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlICghbmV4dEVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXROZXh0ID0gdm1zW25leHRFbC52dWVfdm0uJGluZGV4ICsgMV1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0RWwgPSB0YXJnZXROZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gdGFyZ2V0TmV4dC4kZWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB0aGlzLnJlZlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY3RuLmluc2VydEJlZm9yZSh2bS4kZWwsIG5leHRFbClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkZWxldGUgdm0uJHJldXNlZFxuICAgICAgICAgICAgICAgIGRlbGV0ZSBpdGVtLiRpbmRleFxuICAgICAgICAgICAgICAgIGRlbGV0ZSBpdGVtLiRrZXlcbiAgICAgICAgICAgIH0gZWxzZSB7IC8vIGEgbmV3IHZtXG4gICAgICAgICAgICAgICAgdm0uJGJlZm9yZSh0YXJnZXROZXh0ID8gdGFyZ2V0TmV4dC4kZWwgOiB0aGlzLnJlZilcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2bXNcbiAgICB9LFxuXG4gICAgYnVpbGQ6IGZ1bmN0aW9uIChkYXRhLCBpbmRleCwgaXNPYmplY3QpIHtcblxuICAgICAgICAvLyB3cmFwIG5vbi1vYmplY3QgdmFsdWVzXG4gICAgICAgIHZhciByYXcsIGFsaWFzLFxuICAgICAgICAgICAgd3JhcCA9ICFpc09iamVjdCB8fCB0aGlzLmFyZ1xuICAgICAgICBpZiAod3JhcCkge1xuICAgICAgICAgICAgcmF3ID0gZGF0YVxuICAgICAgICAgICAgYWxpYXMgPSB0aGlzLmFyZyB8fCAnJHZhbHVlJ1xuICAgICAgICAgICAgZGF0YSA9IHt9XG4gICAgICAgICAgICBkYXRhW2FsaWFzXSA9IHJhd1xuICAgICAgICB9XG4gICAgICAgIGRhdGEuJGluZGV4ID0gaW5kZXhcblxuICAgICAgICB2YXIgZWwgPSB0aGlzLmVsLmNsb25lTm9kZSh0cnVlKSxcbiAgICAgICAgICAgIEN0b3IgPSB0aGlzLmNvbXBpbGVyLnJlc29sdmVDb21wb25lbnQoZWwsIGRhdGEpLFxuICAgICAgICAgICAgdm0gPSBuZXcgQ3Rvcih7XG4gICAgICAgICAgICAgICAgZWw6IGVsLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICAgICAgcGFyZW50OiB0aGlzLnZtLFxuICAgICAgICAgICAgICAgIGNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICByZXBlYXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGV4cENhY2hlOiB0aGlzLmV4cENhY2hlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcblxuICAgICAgICBpZiAoaXNPYmplY3QpIHtcbiAgICAgICAgICAgIC8vIGF0dGFjaCBhbiBpZW51bWVyYWJsZSBpZGVudGlmaWVyIHRvIHRoZSByYXcgZGF0YVxuICAgICAgICAgICAgKHJhdyB8fCBkYXRhKS5fX2VtaXR0ZXJfX1t0aGlzLmlkZW50aWZpZXJdID0gdHJ1ZVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZtXG5cbiAgICB9LFxuXG4gICAgdW5iaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmNoaWxkSWQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnZtLiRbdGhpcy5jaGlsZElkXVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnZtcykge1xuICAgICAgICAgICAgdmFyIGkgPSB0aGlzLnZtcy5sZW5ndGhcbiAgICAgICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZtc1tpXS4kZGVzdHJveSgpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIEhlbHBlcnMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqXG4gKiAgRmluZCBhbiBvYmplY3Qgb3IgYSB3cmFwcGVkIGRhdGEgb2JqZWN0XG4gKiAgZnJvbSBhbiBBcnJheVxuICovXG5mdW5jdGlvbiBpbmRleE9mICh2bXMsIG9iaikge1xuICAgIGZvciAodmFyIHZtLCBpID0gMCwgbCA9IHZtcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdm0gPSB2bXNbaV1cbiAgICAgICAgaWYgKCF2bS4kcmV1c2VkICYmIHZtLiR2YWx1ZSA9PT0gb2JqKSB7XG4gICAgICAgICAgICByZXR1cm4gaVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMVxufSIsInZhciBwcmVmaXhlcyA9IFsnLXdlYmtpdC0nLCAnLW1vei0nLCAnLW1zLSddXG5cbi8qKlxuICogIEJpbmRpbmcgZm9yIENTUyBzdHlsZXNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBiaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwcm9wID0gdGhpcy5hcmdcbiAgICAgICAgaWYgKCFwcm9wKSByZXR1cm5cbiAgICAgICAgaWYgKHByb3AuY2hhckF0KDApID09PSAnJCcpIHtcbiAgICAgICAgICAgIC8vIHByb3BlcnRpZXMgdGhhdCBzdGFydCB3aXRoICQgd2lsbCBiZSBhdXRvLXByZWZpeGVkXG4gICAgICAgICAgICBwcm9wID0gcHJvcC5zbGljZSgxKVxuICAgICAgICAgICAgdGhpcy5wcmVmaXhlZCA9IHRydWVcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByb3AgPSBwcm9wXG4gICAgfSxcblxuICAgIHVwZGF0ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciBwcm9wID0gdGhpcy5wcm9wLFxuICAgICAgICAgICAgaXNJbXBvcnRhbnRcbiAgICAgICAgLyoganNoaW50IGVxZXFlcTogdHJ1ZSAqL1xuICAgICAgICAvLyBjYXN0IHBvc3NpYmxlIG51bWJlcnMvYm9vbGVhbnMgaW50byBzdHJpbmdzXG4gICAgICAgIGlmICh2YWx1ZSAhPSBudWxsKSB2YWx1ZSArPSAnJ1xuICAgICAgICBpZiAocHJvcCkge1xuICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaXNJbXBvcnRhbnQgPSB2YWx1ZS5zbGljZSgtMTApID09PSAnIWltcG9ydGFudCdcbiAgICAgICAgICAgICAgICAgICAgPyAnaW1wb3J0YW50J1xuICAgICAgICAgICAgICAgICAgICA6ICcnXG4gICAgICAgICAgICAgICAgaWYgKGlzSW1wb3J0YW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuc2xpY2UoMCwgLTEwKS50cmltKClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmVsLnN0eWxlLnNldFByb3BlcnR5KHByb3AsIHZhbHVlLCBpc0ltcG9ydGFudClcbiAgICAgICAgICAgIGlmICh0aGlzLnByZWZpeGVkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGkgPSBwcmVmaXhlcy5sZW5ndGhcbiAgICAgICAgICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZWwuc3R5bGUuc2V0UHJvcGVydHkocHJlZml4ZXNbaV0gKyBwcm9wLCB2YWx1ZSwgaXNJbXBvcnRhbnQpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbC5zdHlsZS5jc3NUZXh0ID0gdmFsdWVcbiAgICAgICAgfVxuICAgIH1cblxufSIsIi8qKlxuICogIE1hbmFnZXMgYSBjb25kaXRpb25hbCBjaGlsZCBWTSB1c2luZyB0aGVcbiAqICBiaW5kaW5nJ3MgdmFsdWUgYXMgdGhlIGNvbXBvbmVudCBJRC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBiaW5kOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gdHJhY2sgcG9zaXRpb24gaW4gRE9NIHdpdGggYSByZWYgbm9kZVxuICAgICAgICB2YXIgZWwgICAgICAgPSB0aGlzLnJhdyA9IHRoaXMuZWwsXG4gICAgICAgICAgICBwYXJlbnQgICA9IGVsLnBhcmVudE5vZGUsXG4gICAgICAgICAgICByZWYgICAgICA9IHRoaXMucmVmID0gZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgndi12aWV3JylcbiAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShyZWYsIGVsKVxuICAgICAgICBwYXJlbnQucmVtb3ZlQ2hpbGQoZWwpXG5cbiAgICAgICAgLy8gY2FjaGUgb3JpZ2luYWwgY29udGVudFxuICAgICAgICAvKiBqc2hpbnQgYm9zczogdHJ1ZSAqL1xuICAgICAgICB2YXIgbm9kZSxcbiAgICAgICAgICAgIGZyYWcgPSB0aGlzLmlubmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAgICAgd2hpbGUgKG5vZGUgPSBlbC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICBmcmFnLmFwcGVuZENoaWxkKG5vZGUpXG4gICAgICAgIH1cblxuICAgIH0sXG5cbiAgICB1cGRhdGU6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cbiAgICAgICAgdGhpcy51bmJpbmQoKVxuXG4gICAgICAgIHZhciBDdG9yICA9IHRoaXMuY29tcGlsZXIuZ2V0T3B0aW9uKCdjb21wb25lbnRzJywgdmFsdWUpXG4gICAgICAgIGlmICghQ3RvcikgcmV0dXJuXG5cbiAgICAgICAgdGhpcy5jaGlsZFZNID0gbmV3IEN0b3Ioe1xuICAgICAgICAgICAgZWw6IHRoaXMucmF3LmNsb25lTm9kZSh0cnVlKSxcbiAgICAgICAgICAgIHBhcmVudDogdGhpcy52bSxcbiAgICAgICAgICAgIGNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgICAgICAgICAgIHJhd0NvbnRlbnQ6IHRoaXMuaW5uZXIuY2xvbmVOb2RlKHRydWUpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5lbCA9IHRoaXMuY2hpbGRWTS4kZWxcbiAgICAgICAgaWYgKHRoaXMuY29tcGlsZXIuaW5pdCkge1xuICAgICAgICAgICAgdGhpcy5yZWYucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5lbCwgdGhpcy5yZWYpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNoaWxkVk0uJGJlZm9yZSh0aGlzLnJlZilcbiAgICAgICAgfVxuXG4gICAgfSxcblxuICAgIHVuYmluZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLmNoaWxkVk0pIHtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRWTS4kZGVzdHJveSgpXG4gICAgICAgIH1cbiAgICB9XG5cbn0iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpXG5cbi8qKlxuICogIEJpbmRpbmcgZm9yIGluaGVyaXRpbmcgZGF0YSBmcm9tIHBhcmVudCBWTXMuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgYmluZDogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHZhciBzZWxmICAgICAgPSB0aGlzLFxuICAgICAgICAgICAgY2hpbGRLZXkgID0gc2VsZi5hcmcsXG4gICAgICAgICAgICBwYXJlbnRLZXkgPSBzZWxmLmtleSxcbiAgICAgICAgICAgIGNvbXBpbGVyICA9IHNlbGYuY29tcGlsZXIsXG4gICAgICAgICAgICBvd25lciAgICAgPSBzZWxmLmJpbmRpbmcuY29tcGlsZXJcblxuICAgICAgICBpZiAoY29tcGlsZXIgPT09IG93bmVyKSB7XG4gICAgICAgICAgICB0aGlzLmFsb25lID0gdHJ1ZVxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2hpbGRLZXkpIHtcbiAgICAgICAgICAgIGlmICghY29tcGlsZXIuYmluZGluZ3NbY2hpbGRLZXldKSB7XG4gICAgICAgICAgICAgICAgY29tcGlsZXIuY3JlYXRlQmluZGluZyhjaGlsZEtleSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHN5bmMgY2hhbmdlcyBvbiBjaGlsZCBiYWNrIHRvIHBhcmVudFxuICAgICAgICAgICAgY29tcGlsZXIub2JzZXJ2ZXIub24oJ2NoYW5nZTonICsgY2hpbGRLZXksIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29tcGlsZXIuaW5pdCkgcmV0dXJuXG4gICAgICAgICAgICAgICAgaWYgKCFzZWxmLmxvY2spIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2NrID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB1dGlscy5uZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmxvY2sgPSBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvd25lci52bS4kc2V0KHBhcmVudEtleSwgdmFsKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB1cGRhdGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBzeW5jIGZyb20gcGFyZW50XG4gICAgICAgIGlmICghdGhpcy5hbG9uZSAmJiAhdGhpcy5sb2NrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hcmcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZtLiRzZXQodGhpcy5hcmcsIHZhbHVlKVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnZtLiRkYXRhICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMudm0uJGRhdGEgPSB2YWx1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG59IiwidmFyIHNsaWNlID0gW10uc2xpY2VcblxuZnVuY3Rpb24gRW1pdHRlciAoY3R4KSB7XG4gICAgdGhpcy5fY3R4ID0gY3R4IHx8IHRoaXNcbn1cblxudmFyIEVtaXR0ZXJQcm90byA9IEVtaXR0ZXIucHJvdG90eXBlXG5cbkVtaXR0ZXJQcm90by5vbiA9IGZ1bmN0aW9uIChldmVudCwgZm4pIHtcbiAgICB0aGlzLl9jYnMgPSB0aGlzLl9jYnMgfHwge31cbiAgICA7KHRoaXMuX2Nic1tldmVudF0gPSB0aGlzLl9jYnNbZXZlbnRdIHx8IFtdKVxuICAgICAgICAucHVzaChmbilcbiAgICByZXR1cm4gdGhpc1xufVxuXG5FbWl0dGVyUHJvdG8ub25jZSA9IGZ1bmN0aW9uIChldmVudCwgZm4pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB0aGlzLl9jYnMgPSB0aGlzLl9jYnMgfHwge31cblxuICAgIGZ1bmN0aW9uIG9uICgpIHtcbiAgICAgICAgc2VsZi5vZmYoZXZlbnQsIG9uKVxuICAgICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgfVxuXG4gICAgb24uZm4gPSBmblxuICAgIHRoaXMub24oZXZlbnQsIG9uKVxuICAgIHJldHVybiB0aGlzXG59XG5cbkVtaXR0ZXJQcm90by5vZmYgPSBmdW5jdGlvbiAoZXZlbnQsIGZuKSB7XG4gICAgdGhpcy5fY2JzID0gdGhpcy5fY2JzIHx8IHt9XG5cbiAgICAvLyBhbGxcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fY2JzID0ge31cbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgICAvLyBzcGVjaWZpYyBldmVudFxuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYnNbZXZlbnRdXG4gICAgaWYgKCFjYWxsYmFja3MpIHJldHVybiB0aGlzXG5cbiAgICAvLyByZW1vdmUgYWxsIGhhbmRsZXJzXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2Nic1tldmVudF1cbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgICAvLyByZW1vdmUgc3BlY2lmaWMgaGFuZGxlclxuICAgIHZhciBjYlxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNiID0gY2FsbGJhY2tzW2ldXG4gICAgICAgIGlmIChjYiA9PT0gZm4gfHwgY2IuZm4gPT09IGZuKSB7XG4gICAgICAgICAgICBjYWxsYmFja3Muc3BsaWNlKGksIDEpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogIFRoZSBpbnRlcm5hbCwgZmFzdGVyIGVtaXQgd2l0aCBmaXhlZCBhbW91bnQgb2YgYXJndW1lbnRzXG4gKiAgdXNpbmcgRnVuY3Rpb24uY2FsbFxuICovXG5FbWl0dGVyUHJvdG8uZW1pdCA9IGZ1bmN0aW9uIChldmVudCwgYSwgYiwgYykge1xuICAgIHRoaXMuX2NicyA9IHRoaXMuX2NicyB8fCB7fVxuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYnNbZXZlbnRdXG5cbiAgICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgICAgIGNhbGxiYWNrcyA9IGNhbGxiYWNrcy5zbGljZSgwKVxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gY2FsbGJhY2tzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBjYWxsYmFja3NbaV0uY2FsbCh0aGlzLl9jdHgsIGEsIGIsIGMpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqICBUaGUgZXh0ZXJuYWwgZW1pdCB1c2luZyBGdW5jdGlvbi5hcHBseVxuICovXG5FbWl0dGVyUHJvdG8uYXBwbHlFbWl0ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5fY2JzID0gdGhpcy5fY2JzIHx8IHt9XG4gICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuX2Nic1tldmVudF0sIGFyZ3NcblxuICAgIGlmIChjYWxsYmFja3MpIHtcbiAgICAgICAgY2FsbGJhY2tzID0gY2FsbGJhY2tzLnNsaWNlKDApXG4gICAgICAgIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSlcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNhbGxiYWNrcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgY2FsbGJhY2tzW2ldLmFwcGx5KHRoaXMuX2N0eCwgYXJncylcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlciIsInZhciB1dGlscyAgICAgICAgICAgPSByZXF1aXJlKCcuL3V0aWxzJyksXG4gICAgU1RSX1NBVkVfUkUgICAgID0gL1wiKD86W15cIlxcXFxdfFxcXFwuKSpcInwnKD86W14nXFxcXF18XFxcXC4pKicvZyxcbiAgICBTVFJfUkVTVE9SRV9SRSAgPSAvXCIoXFxkKylcIi9nLFxuICAgIE5FV0xJTkVfUkUgICAgICA9IC9cXG4vZyxcbiAgICBDVE9SX1JFICAgICAgICAgPSBuZXcgUmVnRXhwKCdjb25zdHJ1Y3Rvcicuc3BsaXQoJycpLmpvaW4oJ1tcXCdcIissIF0qJykpLFxuICAgIFVOSUNPREVfUkUgICAgICA9IC9cXFxcdVxcZFxcZFxcZFxcZC9cblxuLy8gVmFyaWFibGUgZXh0cmFjdGlvbiBzY29vcGVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL1J1YnlMb3V2cmUvYXZhbG9uXG5cbnZhciBLRVlXT1JEUyA9XG4gICAgICAgIC8vIGtleXdvcmRzXG4gICAgICAgICdicmVhayxjYXNlLGNhdGNoLGNvbnRpbnVlLGRlYnVnZ2VyLGRlZmF1bHQsZGVsZXRlLGRvLGVsc2UsZmFsc2UnICtcbiAgICAgICAgJyxmaW5hbGx5LGZvcixmdW5jdGlvbixpZixpbixpbnN0YW5jZW9mLG5ldyxudWxsLHJldHVybixzd2l0Y2gsdGhpcycgK1xuICAgICAgICAnLHRocm93LHRydWUsdHJ5LHR5cGVvZix2YXIsdm9pZCx3aGlsZSx3aXRoLHVuZGVmaW5lZCcgK1xuICAgICAgICAvLyByZXNlcnZlZFxuICAgICAgICAnLGFic3RyYWN0LGJvb2xlYW4sYnl0ZSxjaGFyLGNsYXNzLGNvbnN0LGRvdWJsZSxlbnVtLGV4cG9ydCxleHRlbmRzJyArXG4gICAgICAgICcsZmluYWwsZmxvYXQsZ290byxpbXBsZW1lbnRzLGltcG9ydCxpbnQsaW50ZXJmYWNlLGxvbmcsbmF0aXZlJyArXG4gICAgICAgICcscGFja2FnZSxwcml2YXRlLHByb3RlY3RlZCxwdWJsaWMsc2hvcnQsc3RhdGljLHN1cGVyLHN5bmNocm9uaXplZCcgK1xuICAgICAgICAnLHRocm93cyx0cmFuc2llbnQsdm9sYXRpbGUnICtcbiAgICAgICAgLy8gRUNNQSA1IC0gdXNlIHN0cmljdFxuICAgICAgICAnLGFyZ3VtZW50cyxsZXQseWllbGQnICtcbiAgICAgICAgLy8gYWxsb3cgdXNpbmcgTWF0aCBpbiBleHByZXNzaW9uc1xuICAgICAgICAnLE1hdGgnLFxuICAgICAgICBcbiAgICBLRVlXT1JEU19SRSA9IG5ldyBSZWdFeHAoW1wiXFxcXGJcIiArIEtFWVdPUkRTLnJlcGxhY2UoLywvZywgJ1xcXFxifFxcXFxiJykgKyBcIlxcXFxiXCJdLmpvaW4oJ3wnKSwgJ2cnKSxcbiAgICBSRU1PVkVfUkUgICA9IC9cXC9cXCooPzoufFxcbikqP1xcKlxcL3xcXC9cXC9bXlxcbl0qXFxufFxcL1xcL1teXFxuXSokfCdbXiddKid8XCJbXlwiXSpcInxbXFxzXFx0XFxuXSpcXC5bXFxzXFx0XFxuXSpbJFxcd1xcLl0rfFtcXHssXVxccypbXFx3XFwkX10rXFxzKjovZyxcbiAgICBTUExJVF9SRSAgICA9IC9bXlxcdyRdKy9nLFxuICAgIE5VTUJFUl9SRSAgID0gL1xcYlxcZFteLF0qL2csXG4gICAgQk9VTkRBUllfUkUgPSAvXiwrfCwrJC9nXG5cbi8qKlxuICogIFN0cmlwIHRvcCBsZXZlbCB2YXJpYWJsZSBuYW1lcyBmcm9tIGEgc25pcHBldCBvZiBKUyBleHByZXNzaW9uXG4gKi9cbmZ1bmN0aW9uIGdldFZhcmlhYmxlcyAoY29kZSkge1xuICAgIGNvZGUgPSBjb2RlXG4gICAgICAgIC5yZXBsYWNlKFJFTU9WRV9SRSwgJycpXG4gICAgICAgIC5yZXBsYWNlKFNQTElUX1JFLCAnLCcpXG4gICAgICAgIC5yZXBsYWNlKEtFWVdPUkRTX1JFLCAnJylcbiAgICAgICAgLnJlcGxhY2UoTlVNQkVSX1JFLCAnJylcbiAgICAgICAgLnJlcGxhY2UoQk9VTkRBUllfUkUsICcnKVxuICAgIHJldHVybiBjb2RlXG4gICAgICAgID8gY29kZS5zcGxpdCgvLCsvKVxuICAgICAgICA6IFtdXG59XG5cbi8qKlxuICogIEEgZ2l2ZW4gcGF0aCBjb3VsZCBwb3RlbnRpYWxseSBleGlzdCBub3Qgb24gdGhlXG4gKiAgY3VycmVudCBjb21waWxlciwgYnV0IHVwIGluIHRoZSBwYXJlbnQgY2hhaW4gc29tZXdoZXJlLlxuICogIFRoaXMgZnVuY3Rpb24gZ2VuZXJhdGVzIGFuIGFjY2VzcyByZWxhdGlvbnNoaXAgc3RyaW5nXG4gKiAgdGhhdCBjYW4gYmUgdXNlZCBpbiB0aGUgZ2V0dGVyIGZ1bmN0aW9uIGJ5IHdhbGtpbmcgdXBcbiAqICB0aGUgcGFyZW50IGNoYWluIHRvIGNoZWNrIGZvciBrZXkgZXhpc3RlbmNlLlxuICpcbiAqICBJdCBzdG9wcyBhdCB0b3AgcGFyZW50IGlmIG5vIHZtIGluIHRoZSBjaGFpbiBoYXMgdGhlXG4gKiAga2V5LiBJdCB0aGVuIGNyZWF0ZXMgYW55IG1pc3NpbmcgYmluZGluZ3Mgb24gdGhlXG4gKiAgZmluYWwgcmVzb2x2ZWQgdm0uXG4gKi9cbmZ1bmN0aW9uIHRyYWNlU2NvcGUgKHBhdGgsIGNvbXBpbGVyLCBkYXRhKSB7XG4gICAgdmFyIHJlbCAgPSAnJyxcbiAgICAgICAgZGlzdCA9IDAsXG4gICAgICAgIHNlbGYgPSBjb21waWxlclxuXG4gICAgaWYgKGRhdGEgJiYgdXRpbHMuZ2V0KGRhdGEsIHBhdGgpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gaGFjazogdGVtcG9yYXJpbHkgYXR0YWNoZWQgZGF0YVxuICAgICAgICByZXR1cm4gJyR0ZW1wLidcbiAgICB9XG5cbiAgICB3aGlsZSAoY29tcGlsZXIpIHtcbiAgICAgICAgaWYgKGNvbXBpbGVyLmhhc0tleShwYXRoKSkge1xuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbXBpbGVyID0gY29tcGlsZXIucGFyZW50XG4gICAgICAgICAgICBkaXN0KytcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoY29tcGlsZXIpIHtcbiAgICAgICAgd2hpbGUgKGRpc3QtLSkge1xuICAgICAgICAgICAgcmVsICs9ICckcGFyZW50LidcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNvbXBpbGVyLmJpbmRpbmdzW3BhdGhdICYmIHBhdGguY2hhckF0KDApICE9PSAnJCcpIHtcbiAgICAgICAgICAgIGNvbXBpbGVyLmNyZWF0ZUJpbmRpbmcocGF0aClcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuY3JlYXRlQmluZGluZyhwYXRoKVxuICAgIH1cbiAgICByZXR1cm4gcmVsXG59XG5cbi8qKlxuICogIENyZWF0ZSBhIGZ1bmN0aW9uIGZyb20gYSBzdHJpbmcuLi5cbiAqICB0aGlzIGxvb2tzIGxpa2UgZXZpbCBtYWdpYyBidXQgc2luY2UgYWxsIHZhcmlhYmxlcyBhcmUgbGltaXRlZFxuICogIHRvIHRoZSBWTSdzIGRhdGEgaXQncyBhY3R1YWxseSBwcm9wZXJseSBzYW5kYm94ZWRcbiAqL1xuZnVuY3Rpb24gbWFrZUdldHRlciAoZXhwLCByYXcpIHtcbiAgICB2YXIgZm5cbiAgICB0cnkge1xuICAgICAgICBmbiA9IG5ldyBGdW5jdGlvbihleHApXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB1dGlscy53YXJuKCdFcnJvciBwYXJzaW5nIGV4cHJlc3Npb246ICcgKyByYXcpXG4gICAgfVxuICAgIHJldHVybiBmblxufVxuXG4vKipcbiAqICBFc2NhcGUgYSBsZWFkaW5nIGRvbGxhciBzaWduIGZvciByZWdleCBjb25zdHJ1Y3Rpb25cbiAqL1xuZnVuY3Rpb24gZXNjYXBlRG9sbGFyICh2KSB7XG4gICAgcmV0dXJuIHYuY2hhckF0KDApID09PSAnJCdcbiAgICAgICAgPyAnXFxcXCcgKyB2XG4gICAgICAgIDogdlxufVxuXG4vKipcbiAqICBQYXJzZSBhbmQgcmV0dXJuIGFuIGFub255bW91cyBjb21wdXRlZCBwcm9wZXJ0eSBnZXR0ZXIgZnVuY3Rpb25cbiAqICBmcm9tIGFuIGFyYml0cmFyeSBleHByZXNzaW9uLCB0b2dldGhlciB3aXRoIGEgbGlzdCBvZiBwYXRocyB0byBiZVxuICogIGNyZWF0ZWQgYXMgYmluZGluZ3MuXG4gKi9cbmV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbiAoZXhwLCBjb21waWxlciwgZGF0YSkge1xuICAgIC8vIHVuaWNvZGUgYW5kICdjb25zdHJ1Y3RvcicgYXJlIG5vdCBhbGxvd2VkIGZvciBYU1Mgc2VjdXJpdHkuXG4gICAgaWYgKFVOSUNPREVfUkUudGVzdChleHApIHx8IENUT1JfUkUudGVzdChleHApKSB7XG4gICAgICAgIHV0aWxzLndhcm4oJ1Vuc2FmZSBleHByZXNzaW9uOiAnICsgZXhwKVxuICAgICAgICByZXR1cm5cbiAgICB9XG4gICAgLy8gZXh0cmFjdCB2YXJpYWJsZSBuYW1lc1xuICAgIHZhciB2YXJzID0gZ2V0VmFyaWFibGVzKGV4cClcbiAgICBpZiAoIXZhcnMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBtYWtlR2V0dGVyKCdyZXR1cm4gJyArIGV4cCwgZXhwKVxuICAgIH1cbiAgICB2YXJzID0gdXRpbHMudW5pcXVlKHZhcnMpXG5cbiAgICB2YXIgYWNjZXNzb3JzID0gJycsXG4gICAgICAgIGhhcyAgICAgICA9IHV0aWxzLmhhc2goKSxcbiAgICAgICAgc3RyaW5ncyAgID0gW10sXG4gICAgICAgIC8vIGNvbnN0cnVjdCBhIHJlZ2V4IHRvIGV4dHJhY3QgYWxsIHZhbGlkIHZhcmlhYmxlIHBhdGhzXG4gICAgICAgIC8vIG9uZXMgdGhhdCBiZWdpbiB3aXRoIFwiJFwiIGFyZSBwYXJ0aWN1bGFybHkgdHJpY2t5XG4gICAgICAgIC8vIGJlY2F1c2Ugd2UgY2FuJ3QgdXNlIFxcYiBmb3IgdGhlbVxuICAgICAgICBwYXRoUkUgPSBuZXcgUmVnRXhwKFxuICAgICAgICAgICAgXCJbXiRcXFxcd1xcXFwuXShcIiArXG4gICAgICAgICAgICB2YXJzLm1hcChlc2NhcGVEb2xsYXIpLmpvaW4oJ3wnKSArXG4gICAgICAgICAgICBcIilbJFxcXFx3XFxcXC5dKlxcXFxiXCIsICdnJ1xuICAgICAgICApLFxuICAgICAgICBib2R5ID0gKCcgJyArIGV4cClcbiAgICAgICAgICAgIC5yZXBsYWNlKFNUUl9TQVZFX1JFLCBzYXZlU3RyaW5ncylcbiAgICAgICAgICAgIC5yZXBsYWNlKHBhdGhSRSwgcmVwbGFjZVBhdGgpXG4gICAgICAgICAgICAucmVwbGFjZShTVFJfUkVTVE9SRV9SRSwgcmVzdG9yZVN0cmluZ3MpXG5cbiAgICBib2R5ID0gYWNjZXNzb3JzICsgJ3JldHVybiAnICsgYm9keVxuXG4gICAgZnVuY3Rpb24gc2F2ZVN0cmluZ3MgKHN0cikge1xuICAgICAgICB2YXIgaSA9IHN0cmluZ3MubGVuZ3RoXG4gICAgICAgIC8vIGVzY2FwZSBuZXdsaW5lcyBpbiBzdHJpbmdzIHNvIHRoZSBleHByZXNzaW9uXG4gICAgICAgIC8vIGNhbiBiZSBjb3JyZWN0bHkgZXZhbHVhdGVkXG4gICAgICAgIHN0cmluZ3NbaV0gPSBzdHIucmVwbGFjZShORVdMSU5FX1JFLCAnXFxcXG4nKVxuICAgICAgICByZXR1cm4gJ1wiJyArIGkgKyAnXCInXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVwbGFjZVBhdGggKHBhdGgpIHtcbiAgICAgICAgLy8ga2VlcCB0cmFjayBvZiB0aGUgZmlyc3QgY2hhclxuICAgICAgICB2YXIgYyA9IHBhdGguY2hhckF0KDApXG4gICAgICAgIHBhdGggPSBwYXRoLnNsaWNlKDEpXG4gICAgICAgIHZhciB2YWwgPSAndGhpcy4nICsgdHJhY2VTY29wZShwYXRoLCBjb21waWxlciwgZGF0YSkgKyBwYXRoXG4gICAgICAgIGlmICghaGFzW3BhdGhdKSB7XG4gICAgICAgICAgICBhY2Nlc3NvcnMgKz0gdmFsICsgJzsnXG4gICAgICAgICAgICBoYXNbcGF0aF0gPSAxXG4gICAgICAgIH1cbiAgICAgICAgLy8gZG9uJ3QgZm9yZ2V0IHRvIHB1dCB0aGF0IGZpcnN0IGNoYXIgYmFja1xuICAgICAgICByZXR1cm4gYyArIHZhbFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc3RvcmVTdHJpbmdzIChzdHIsIGkpIHtcbiAgICAgICAgcmV0dXJuIHN0cmluZ3NbaV1cbiAgICB9XG5cbiAgICByZXR1cm4gbWFrZUdldHRlcihib2R5LCBleHApXG59XG5cbi8qKlxuICogIEV2YWx1YXRlIGFuIGV4cHJlc3Npb24gaW4gdGhlIGNvbnRleHQgb2YgYSBjb21waWxlci5cbiAqICBBY2NlcHRzIGFkZGl0aW9uYWwgZGF0YS5cbiAqL1xuZXhwb3J0cy5ldmFsID0gZnVuY3Rpb24gKGV4cCwgY29tcGlsZXIsIGRhdGEpIHtcbiAgICB2YXIgZ2V0dGVyID0gZXhwb3J0cy5wYXJzZShleHAsIGNvbXBpbGVyLCBkYXRhKSwgcmVzXG4gICAgaWYgKGdldHRlcikge1xuICAgICAgICAvLyBoYWNrOiB0ZW1wb3JhcmlseSBhdHRhY2ggdGhlIGFkZGl0aW9uYWwgZGF0YSBzb1xuICAgICAgICAvLyBpdCBjYW4gYmUgYWNjZXNzZWQgaW4gdGhlIGdldHRlclxuICAgICAgICBjb21waWxlci52bS4kdGVtcCA9IGRhdGFcbiAgICAgICAgcmVzID0gZ2V0dGVyLmNhbGwoY29tcGlsZXIudm0pXG4gICAgICAgIGRlbGV0ZSBjb21waWxlci52bS4kdGVtcFxuICAgIH1cbiAgICByZXR1cm4gcmVzXG59IiwidmFyIHV0aWxzICAgID0gcmVxdWlyZSgnLi91dGlscycpLFxuICAgIGdldCAgICAgID0gdXRpbHMuZ2V0LFxuICAgIHNsaWNlICAgID0gW10uc2xpY2UsXG4gICAgUVVPVEVfUkUgPSAvXicuKickLyxcbiAgICBmaWx0ZXJzICA9IG1vZHVsZS5leHBvcnRzID0gdXRpbHMuaGFzaCgpXG5cbi8qKlxuICogICdhYmMnID0+ICdBYmMnXG4gKi9cbmZpbHRlcnMuY2FwaXRhbGl6ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHJldHVybiAnJ1xuICAgIHZhbHVlID0gdmFsdWUudG9TdHJpbmcoKVxuICAgIHJldHVybiB2YWx1ZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHZhbHVlLnNsaWNlKDEpXG59XG5cbi8qKlxuICogICdhYmMnID0+ICdBQkMnXG4gKi9cbmZpbHRlcnMudXBwZXJjYXNlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuICh2YWx1ZSB8fCB2YWx1ZSA9PT0gMClcbiAgICAgICAgPyB2YWx1ZS50b1N0cmluZygpLnRvVXBwZXJDYXNlKClcbiAgICAgICAgOiAnJ1xufVxuXG4vKipcbiAqICAnQWJDJyA9PiAnYWJjJ1xuICovXG5maWx0ZXJzLmxvd2VyY2FzZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiAodmFsdWUgfHwgdmFsdWUgPT09IDApXG4gICAgICAgID8gdmFsdWUudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIDogJydcbn1cblxuLyoqXG4gKiAgMTIzNDUgPT4gJDEyLDM0NS4wMFxuICovXG5maWx0ZXJzLmN1cnJlbmN5ID0gZnVuY3Rpb24gKHZhbHVlLCBzaWduKSB7XG4gICAgdmFsdWUgPSBwYXJzZUZsb2F0KHZhbHVlKVxuICAgIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHJldHVybiAnJ1xuICAgIHNpZ24gPSBzaWduIHx8ICckJ1xuICAgIHZhciBzID0gTWF0aC5mbG9vcih2YWx1ZSkudG9TdHJpbmcoKSxcbiAgICAgICAgaSA9IHMubGVuZ3RoICUgMyxcbiAgICAgICAgaCA9IGkgPiAwID8gKHMuc2xpY2UoMCwgaSkgKyAocy5sZW5ndGggPiAzID8gJywnIDogJycpKSA6ICcnLFxuICAgICAgICBmID0gJy4nICsgdmFsdWUudG9GaXhlZCgyKS5zbGljZSgtMilcbiAgICByZXR1cm4gc2lnbiArIGggKyBzLnNsaWNlKGkpLnJlcGxhY2UoLyhcXGR7M30pKD89XFxkKS9nLCAnJDEsJykgKyBmXG59XG5cbi8qKlxuICogIGFyZ3M6IGFuIGFycmF5IG9mIHN0cmluZ3MgY29ycmVzcG9uZGluZyB0b1xuICogIHRoZSBzaW5nbGUsIGRvdWJsZSwgdHJpcGxlIC4uLiBmb3JtcyBvZiB0aGUgd29yZCB0b1xuICogIGJlIHBsdXJhbGl6ZWQuIFdoZW4gdGhlIG51bWJlciB0byBiZSBwbHVyYWxpemVkXG4gKiAgZXhjZWVkcyB0aGUgbGVuZ3RoIG9mIHRoZSBhcmdzLCBpdCB3aWxsIHVzZSB0aGUgbGFzdFxuICogIGVudHJ5IGluIHRoZSBhcnJheS5cbiAqXG4gKiAgZS5nLiBbJ3NpbmdsZScsICdkb3VibGUnLCAndHJpcGxlJywgJ211bHRpcGxlJ11cbiAqL1xuZmlsdGVycy5wbHVyYWxpemUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxuICAgIHJldHVybiBhcmdzLmxlbmd0aCA+IDFcbiAgICAgICAgPyAoYXJnc1t2YWx1ZSAtIDFdIHx8IGFyZ3NbYXJncy5sZW5ndGggLSAxXSlcbiAgICAgICAgOiAoYXJnc1t2YWx1ZSAtIDFdIHx8IGFyZ3NbMF0gKyAncycpXG59XG5cbi8qKlxuICogIEEgc3BlY2lhbCBmaWx0ZXIgdGhhdCB0YWtlcyBhIGhhbmRsZXIgZnVuY3Rpb24sXG4gKiAgd3JhcHMgaXQgc28gaXQgb25seSBnZXRzIHRyaWdnZXJlZCBvbiBzcGVjaWZpYyBrZXlwcmVzc2VzLlxuICpcbiAqICB2LW9uIG9ubHlcbiAqL1xuXG52YXIga2V5Q29kZXMgPSB7XG4gICAgZW50ZXIgICAgOiAxMyxcbiAgICB0YWIgICAgICA6IDksXG4gICAgJ2RlbGV0ZScgOiA0NixcbiAgICB1cCAgICAgICA6IDM4LFxuICAgIGxlZnQgICAgIDogMzcsXG4gICAgcmlnaHQgICAgOiAzOSxcbiAgICBkb3duICAgICA6IDQwLFxuICAgIGVzYyAgICAgIDogMjdcbn1cblxuZmlsdGVycy5rZXkgPSBmdW5jdGlvbiAoaGFuZGxlciwga2V5KSB7XG4gICAgaWYgKCFoYW5kbGVyKSByZXR1cm5cbiAgICB2YXIgY29kZSA9IGtleUNvZGVzW2tleV1cbiAgICBpZiAoIWNvZGUpIHtcbiAgICAgICAgY29kZSA9IHBhcnNlSW50KGtleSwgMTApXG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBpZiAoZS5rZXlDb2RlID09PSBjb2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlci5jYWxsKHRoaXMsIGUpXG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKlxuICogIEZpbHRlciBmaWx0ZXIgZm9yIHYtcmVwZWF0XG4gKi9cbmZpbHRlcnMuZmlsdGVyQnkgPSBmdW5jdGlvbiAoYXJyLCBzZWFyY2hLZXksIGRlbGltaXRlciwgZGF0YUtleSkge1xuXG4gICAgLy8gYWxsb3cgb3B0aW9uYWwgYGluYCBkZWxpbWl0ZXJcbiAgICAvLyBiZWNhdXNlIHdoeSBub3RcbiAgICBpZiAoZGVsaW1pdGVyICYmIGRlbGltaXRlciAhPT0gJ2luJykge1xuICAgICAgICBkYXRhS2V5ID0gZGVsaW1pdGVyXG4gICAgfVxuXG4gICAgLy8gZ2V0IHRoZSBzZWFyY2ggc3RyaW5nXG4gICAgdmFyIHNlYXJjaCA9IHN0cmlwUXVvdGVzKHNlYXJjaEtleSkgfHwgdGhpcy4kZ2V0KHNlYXJjaEtleSlcbiAgICBpZiAoIXNlYXJjaCkgcmV0dXJuIGFyclxuICAgIHNlYXJjaCA9IHNlYXJjaC50b0xvd2VyQ2FzZSgpXG5cbiAgICAvLyBnZXQgdGhlIG9wdGlvbmFsIGRhdGFLZXlcbiAgICBkYXRhS2V5ID0gZGF0YUtleSAmJiAoc3RyaXBRdW90ZXMoZGF0YUtleSkgfHwgdGhpcy4kZ2V0KGRhdGFLZXkpKVxuXG4gICAgLy8gY29udmVydCBvYmplY3QgdG8gYXJyYXlcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSB1dGlscy5vYmplY3RUb0FycmF5KGFycilcbiAgICB9XG5cbiAgICByZXR1cm4gYXJyLmZpbHRlcihmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICByZXR1cm4gZGF0YUtleVxuICAgICAgICAgICAgPyBjb250YWlucyhnZXQoaXRlbSwgZGF0YUtleSksIHNlYXJjaClcbiAgICAgICAgICAgIDogY29udGFpbnMoaXRlbSwgc2VhcmNoKVxuICAgIH0pXG5cbn1cblxuZmlsdGVycy5maWx0ZXJCeS5jb21wdXRlZCA9IHRydWVcblxuLyoqXG4gKiAgU29ydCBmaXRsZXIgZm9yIHYtcmVwZWF0XG4gKi9cbmZpbHRlcnMub3JkZXJCeSA9IGZ1bmN0aW9uIChhcnIsIHNvcnRLZXksIHJldmVyc2VLZXkpIHtcblxuICAgIHZhciBrZXkgPSBzdHJpcFF1b3Rlcyhzb3J0S2V5KSB8fCB0aGlzLiRnZXQoc29ydEtleSlcbiAgICBpZiAoIWtleSkgcmV0dXJuIGFyclxuXG4gICAgLy8gY29udmVydCBvYmplY3QgdG8gYXJyYXlcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSB1dGlscy5vYmplY3RUb0FycmF5KGFycilcbiAgICB9XG5cbiAgICB2YXIgb3JkZXIgPSAxXG4gICAgaWYgKHJldmVyc2VLZXkpIHtcbiAgICAgICAgaWYgKHJldmVyc2VLZXkgPT09ICctMScpIHtcbiAgICAgICAgICAgIG9yZGVyID0gLTFcbiAgICAgICAgfSBlbHNlIGlmIChyZXZlcnNlS2V5LmNoYXJBdCgwKSA9PT0gJyEnKSB7XG4gICAgICAgICAgICByZXZlcnNlS2V5ID0gcmV2ZXJzZUtleS5zbGljZSgxKVxuICAgICAgICAgICAgb3JkZXIgPSB0aGlzLiRnZXQocmV2ZXJzZUtleSkgPyAxIDogLTFcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9yZGVyID0gdGhpcy4kZ2V0KHJldmVyc2VLZXkpID8gLTEgOiAxXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzb3J0IG9uIGEgY29weSB0byBhdm9pZCBtdXRhdGluZyBvcmlnaW5hbCBhcnJheVxuICAgIHJldHVybiBhcnIuc2xpY2UoKS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIGEgPSBnZXQoYSwga2V5KVxuICAgICAgICBiID0gZ2V0KGIsIGtleSlcbiAgICAgICAgcmV0dXJuIGEgPT09IGIgPyAwIDogYSA+IGIgPyBvcmRlciA6IC1vcmRlclxuICAgIH0pXG5cbn1cblxuZmlsdGVycy5vcmRlckJ5LmNvbXB1dGVkID0gdHJ1ZVxuXG4vLyBBcnJheSBmaWx0ZXIgaGVscGVycyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKlxuICogIFN0cmluZyBjb250YWluIGhlbHBlclxuICovXG5mdW5jdGlvbiBjb250YWlucyAodmFsLCBzZWFyY2gpIHtcbiAgICAvKiBqc2hpbnQgZXFlcWVxOiBmYWxzZSAqL1xuICAgIGlmICh1dGlscy5pc09iamVjdCh2YWwpKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2YWwpIHtcbiAgICAgICAgICAgIGlmIChjb250YWlucyh2YWxba2V5XSwgc2VhcmNoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbCAhPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB2YWwudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpLmluZGV4T2Yoc2VhcmNoKSA+IC0xXG4gICAgfVxufVxuXG4vKipcbiAqICBUZXN0IHdoZXRoZXIgYSBzdHJpbmcgaXMgaW4gcXVvdGVzLFxuICogIGlmIHllcyByZXR1cm4gc3RyaXBwZWQgc3RyaW5nXG4gKi9cbmZ1bmN0aW9uIHN0cmlwUXVvdGVzIChzdHIpIHtcbiAgICBpZiAoUVVPVEVfUkUudGVzdChzdHIpKSB7XG4gICAgICAgIHJldHVybiBzdHIuc2xpY2UoMSwgLTEpXG4gICAgfVxufSIsIi8vIHN0cmluZyAtPiBET00gY29udmVyc2lvblxuLy8gd3JhcHBlcnMgb3JpZ2luYWxseSBmcm9tIGpRdWVyeSwgc2Nvb3BlZCBmcm9tIGNvbXBvbmVudC9kb21pZnlcbnZhciBtYXAgPSB7XG4gICAgbGVnZW5kICAgOiBbMSwgJzxmaWVsZHNldD4nLCAnPC9maWVsZHNldD4nXSxcbiAgICB0ciAgICAgICA6IFsyLCAnPHRhYmxlPjx0Ym9keT4nLCAnPC90Ym9keT48L3RhYmxlPiddLFxuICAgIGNvbCAgICAgIDogWzIsICc8dGFibGU+PHRib2R5PjwvdGJvZHk+PGNvbGdyb3VwPicsICc8L2NvbGdyb3VwPjwvdGFibGU+J10sXG4gICAgX2RlZmF1bHQgOiBbMCwgJycsICcnXVxufVxuXG5tYXAudGQgPVxubWFwLnRoID0gWzMsICc8dGFibGU+PHRib2R5Pjx0cj4nLCAnPC90cj48L3Rib2R5PjwvdGFibGU+J11cblxubWFwLm9wdGlvbiA9XG5tYXAub3B0Z3JvdXAgPSBbMSwgJzxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPicsICc8L3NlbGVjdD4nXVxuXG5tYXAudGhlYWQgPVxubWFwLnRib2R5ID1cbm1hcC5jb2xncm91cCA9XG5tYXAuY2FwdGlvbiA9XG5tYXAudGZvb3QgPSBbMSwgJzx0YWJsZT4nLCAnPC90YWJsZT4nXVxuXG5tYXAudGV4dCA9XG5tYXAuY2lyY2xlID1cbm1hcC5lbGxpcHNlID1cbm1hcC5saW5lID1cbm1hcC5wYXRoID1cbm1hcC5wb2x5Z29uID1cbm1hcC5wb2x5bGluZSA9XG5tYXAucmVjdCA9IFsxLCAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmVyc2lvbj1cIjEuMVwiPicsJzwvc3ZnPiddXG5cbnZhciBUQUdfUkUgPSAvPChbXFx3Ol0rKS9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodGVtcGxhdGVTdHJpbmcpIHtcbiAgICB2YXIgZnJhZyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKSxcbiAgICAgICAgbSA9IFRBR19SRS5leGVjKHRlbXBsYXRlU3RyaW5nKVxuICAgIC8vIHRleHQgb25seVxuICAgIGlmICghbSkge1xuICAgICAgICBmcmFnLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHRlbXBsYXRlU3RyaW5nKSlcbiAgICAgICAgcmV0dXJuIGZyYWdcbiAgICB9XG5cbiAgICB2YXIgdGFnID0gbVsxXSxcbiAgICAgICAgd3JhcCA9IG1hcFt0YWddIHx8IG1hcC5fZGVmYXVsdCxcbiAgICAgICAgZGVwdGggPSB3cmFwWzBdLFxuICAgICAgICBwcmVmaXggPSB3cmFwWzFdLFxuICAgICAgICBzdWZmaXggPSB3cmFwWzJdLFxuICAgICAgICBub2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcblxuICAgIG5vZGUuaW5uZXJIVE1MID0gcHJlZml4ICsgdGVtcGxhdGVTdHJpbmcudHJpbSgpICsgc3VmZml4XG4gICAgd2hpbGUgKGRlcHRoLS0pIG5vZGUgPSBub2RlLmxhc3RDaGlsZFxuXG4gICAgLy8gb25lIGVsZW1lbnRcbiAgICBpZiAobm9kZS5maXJzdENoaWxkID09PSBub2RlLmxhc3RDaGlsZCkge1xuICAgICAgICBmcmFnLmFwcGVuZENoaWxkKG5vZGUuZmlyc3RDaGlsZClcbiAgICAgICAgcmV0dXJuIGZyYWdcbiAgICB9XG5cbiAgICAvLyBtdWx0aXBsZSBub2RlcywgcmV0dXJuIGEgZnJhZ21lbnRcbiAgICB2YXIgY2hpbGRcbiAgICAvKiBqc2hpbnQgYm9zczogdHJ1ZSAqL1xuICAgIHdoaWxlIChjaGlsZCA9IG5vZGUuZmlyc3RDaGlsZCkge1xuICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICAgICAgZnJhZy5hcHBlbmRDaGlsZChjaGlsZClcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZnJhZ1xufSIsInZhciBjb25maWcgICAgICA9IHJlcXVpcmUoJy4vY29uZmlnJyksXG4gICAgVmlld01vZGVsICAgPSByZXF1aXJlKCcuL3ZpZXdtb2RlbCcpLFxuICAgIHV0aWxzICAgICAgID0gcmVxdWlyZSgnLi91dGlscycpLFxuICAgIG1ha2VIYXNoICAgID0gdXRpbHMuaGFzaCxcbiAgICBhc3NldFR5cGVzICA9IFsnZGlyZWN0aXZlJywgJ2ZpbHRlcicsICdwYXJ0aWFsJywgJ2VmZmVjdCcsICdjb21wb25lbnQnXSxcbiAgICAvLyBJbnRlcm5hbCBtb2R1bGVzIHRoYXQgYXJlIGV4cG9zZWQgZm9yIHBsdWdpbnNcbiAgICBwbHVnaW5BUEkgICA9IHtcbiAgICAgICAgdXRpbHM6IHV0aWxzLFxuICAgICAgICBjb25maWc6IGNvbmZpZyxcbiAgICAgICAgdHJhbnNpdGlvbjogcmVxdWlyZSgnLi90cmFuc2l0aW9uJyksXG4gICAgICAgIG9ic2VydmVyOiByZXF1aXJlKCcuL29ic2VydmVyJylcbiAgICB9XG5cblZpZXdNb2RlbC5vcHRpb25zID0gY29uZmlnLmdsb2JhbEFzc2V0cyA9IHtcbiAgICBkaXJlY3RpdmVzICA6IHJlcXVpcmUoJy4vZGlyZWN0aXZlcycpLFxuICAgIGZpbHRlcnMgICAgIDogcmVxdWlyZSgnLi9maWx0ZXJzJyksXG4gICAgcGFydGlhbHMgICAgOiBtYWtlSGFzaCgpLFxuICAgIGVmZmVjdHMgICAgIDogbWFrZUhhc2goKSxcbiAgICBjb21wb25lbnRzICA6IG1ha2VIYXNoKClcbn1cblxuLyoqXG4gKiAgRXhwb3NlIGFzc2V0IHJlZ2lzdHJhdGlvbiBtZXRob2RzXG4gKi9cbmFzc2V0VHlwZXMuZm9yRWFjaChmdW5jdGlvbiAodHlwZSkge1xuICAgIFZpZXdNb2RlbFt0eXBlXSA9IGZ1bmN0aW9uIChpZCwgdmFsdWUpIHtcbiAgICAgICAgdmFyIGhhc2ggPSB0aGlzLm9wdGlvbnNbdHlwZSArICdzJ11cbiAgICAgICAgaWYgKCFoYXNoKSB7XG4gICAgICAgICAgICBoYXNoID0gdGhpcy5vcHRpb25zW3R5cGUgKyAncyddID0gbWFrZUhhc2goKVxuICAgICAgICB9XG4gICAgICAgIGlmICghdmFsdWUpIHJldHVybiBoYXNoW2lkXVxuICAgICAgICBpZiAodHlwZSA9PT0gJ3BhcnRpYWwnKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHV0aWxzLnBhcnNlVGVtcGxhdGVPcHRpb24odmFsdWUpXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2NvbXBvbmVudCcpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdXRpbHMudG9Db25zdHJ1Y3Rvcih2YWx1ZSlcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnZmlsdGVyJykge1xuICAgICAgICAgICAgdXRpbHMuY2hlY2tGaWx0ZXIodmFsdWUpXG4gICAgICAgIH1cbiAgICAgICAgaGFzaFtpZF0gPSB2YWx1ZVxuICAgICAgICByZXR1cm4gdGhpc1xuICAgIH1cbn0pXG5cbi8qKlxuICogIFNldCBjb25maWcgb3B0aW9uc1xuICovXG5WaWV3TW9kZWwuY29uZmlnID0gZnVuY3Rpb24gKG9wdHMsIHZhbCkge1xuICAgIGlmICh0eXBlb2Ygb3B0cyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gY29uZmlnW29wdHNdXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25maWdbb3B0c10gPSB2YWxcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHV0aWxzLmV4dGVuZChjb25maWcsIG9wdHMpXG4gICAgfVxuICAgIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogIEV4cG9zZSBhbiBpbnRlcmZhY2UgZm9yIHBsdWdpbnNcbiAqL1xuVmlld01vZGVsLnVzZSA9IGZ1bmN0aW9uIChwbHVnaW4pIHtcbiAgICBpZiAodHlwZW9mIHBsdWdpbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHBsdWdpbiA9IHJlcXVpcmUocGx1Z2luKVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB1dGlscy53YXJuKCdDYW5ub3QgZmluZCBwbHVnaW46ICcgKyBwbHVnaW4pXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGFkZGl0aW9uYWwgcGFyYW1ldGVyc1xuICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpXG4gICAgYXJncy51bnNoaWZ0KHRoaXMpXG5cbiAgICBpZiAodHlwZW9mIHBsdWdpbi5pbnN0YWxsID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHBsdWdpbi5pbnN0YWxsLmFwcGx5KHBsdWdpbiwgYXJncylcbiAgICB9IGVsc2Uge1xuICAgICAgICBwbHVnaW4uYXBwbHkobnVsbCwgYXJncylcbiAgICB9XG4gICAgcmV0dXJuIHRoaXNcbn1cblxuLyoqXG4gKiAgRXhwb3NlIGludGVybmFsIG1vZHVsZXMgZm9yIHBsdWdpbnNcbiAqL1xuVmlld01vZGVsLnJlcXVpcmUgPSBmdW5jdGlvbiAobW9kdWxlKSB7XG4gICAgcmV0dXJuIHBsdWdpbkFQSVttb2R1bGVdXG59XG5cblZpZXdNb2RlbC5leHRlbmQgPSBleHRlbmRcblZpZXdNb2RlbC5uZXh0VGljayA9IHV0aWxzLm5leHRUaWNrXG5cbi8qKlxuICogIEV4cG9zZSB0aGUgbWFpbiBWaWV3TW9kZWwgY2xhc3NcbiAqICBhbmQgYWRkIGV4dGVuZCBtZXRob2RcbiAqL1xuZnVuY3Rpb24gZXh0ZW5kIChvcHRpb25zKSB7XG5cbiAgICB2YXIgUGFyZW50Vk0gPSB0aGlzXG5cbiAgICAvLyBleHRlbmQgZGF0YSBvcHRpb25zIG5lZWQgdG8gYmUgY29waWVkXG4gICAgLy8gb24gaW5zdGFudGlhdGlvblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgICAgb3B0aW9ucy5kZWZhdWx0RGF0YSA9IG9wdGlvbnMuZGF0YVxuICAgICAgICBkZWxldGUgb3B0aW9ucy5kYXRhXG4gICAgfVxuXG4gICAgLy8gaW5oZXJpdCBvcHRpb25zXG4gICAgLy8gYnV0IG9ubHkgd2hlbiB0aGUgc3VwZXIgY2xhc3MgaXMgbm90IHRoZSBuYXRpdmUgVnVlLlxuICAgIGlmIChQYXJlbnRWTSAhPT0gVmlld01vZGVsKSB7XG4gICAgICAgIG9wdGlvbnMgPSBpbmhlcml0T3B0aW9ucyhvcHRpb25zLCBQYXJlbnRWTS5vcHRpb25zLCB0cnVlKVxuICAgIH1cbiAgICB1dGlscy5wcm9jZXNzT3B0aW9ucyhvcHRpb25zKVxuXG4gICAgdmFyIEV4dGVuZGVkVk0gPSBmdW5jdGlvbiAob3B0cywgYXNQYXJlbnQpIHtcbiAgICAgICAgaWYgKCFhc1BhcmVudCkge1xuICAgICAgICAgICAgb3B0cyA9IGluaGVyaXRPcHRpb25zKG9wdHMsIG9wdGlvbnMsIHRydWUpXG4gICAgICAgIH1cbiAgICAgICAgUGFyZW50Vk0uY2FsbCh0aGlzLCBvcHRzLCB0cnVlKVxuICAgIH1cblxuICAgIC8vIGluaGVyaXQgcHJvdG90eXBlIHByb3BzXG4gICAgdmFyIHByb3RvID0gRXh0ZW5kZWRWTS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBhcmVudFZNLnByb3RvdHlwZSlcbiAgICB1dGlscy5kZWZQcm90ZWN0ZWQocHJvdG8sICdjb25zdHJ1Y3RvcicsIEV4dGVuZGVkVk0pXG5cbiAgICAvLyBhbGxvdyBleHRlbmRlZCBWTSB0byBiZSBmdXJ0aGVyIGV4dGVuZGVkXG4gICAgRXh0ZW5kZWRWTS5leHRlbmQgID0gZXh0ZW5kXG4gICAgRXh0ZW5kZWRWTS5zdXBlciAgID0gUGFyZW50Vk1cbiAgICBFeHRlbmRlZFZNLm9wdGlvbnMgPSBvcHRpb25zXG5cbiAgICAvLyBhbGxvdyBleHRlbmRlZCBWTSB0byBhZGQgaXRzIG93biBhc3NldHNcbiAgICBhc3NldFR5cGVzLmZvckVhY2goZnVuY3Rpb24gKHR5cGUpIHtcbiAgICAgICAgRXh0ZW5kZWRWTVt0eXBlXSA9IFZpZXdNb2RlbFt0eXBlXVxuICAgIH0pXG5cbiAgICAvLyBhbGxvdyBleHRlbmRlZCBWTSB0byB1c2UgcGx1Z2luc1xuICAgIEV4dGVuZGVkVk0udXNlICAgICA9IFZpZXdNb2RlbC51c2VcbiAgICBFeHRlbmRlZFZNLnJlcXVpcmUgPSBWaWV3TW9kZWwucmVxdWlyZVxuXG4gICAgcmV0dXJuIEV4dGVuZGVkVk1cbn1cblxuLyoqXG4gKiAgSW5oZXJpdCBvcHRpb25zXG4gKlxuICogIEZvciBvcHRpb25zIHN1Y2ggYXMgYGRhdGFgLCBgdm1zYCwgYGRpcmVjdGl2ZXNgLCAncGFydGlhbHMnLFxuICogIHRoZXkgc2hvdWxkIGJlIGZ1cnRoZXIgZXh0ZW5kZWQuIEhvd2V2ZXIgZXh0ZW5kaW5nIHNob3VsZCBvbmx5XG4gKiAgYmUgZG9uZSBhdCB0b3AgbGV2ZWwuXG4gKiAgXG4gKiAgYHByb3RvYCBpcyBhbiBleGNlcHRpb24gYmVjYXVzZSBpdCdzIGhhbmRsZWQgZGlyZWN0bHkgb24gdGhlXG4gKiAgcHJvdG90eXBlLlxuICpcbiAqICBgZWxgIGlzIGFuIGV4Y2VwdGlvbiBiZWNhdXNlIGl0J3Mgbm90IGFsbG93ZWQgYXMgYW5cbiAqICBleHRlbnNpb24gb3B0aW9uLCBidXQgb25seSBhcyBhbiBpbnN0YW5jZSBvcHRpb24uXG4gKi9cbmZ1bmN0aW9uIGluaGVyaXRPcHRpb25zIChjaGlsZCwgcGFyZW50LCB0b3BMZXZlbCkge1xuICAgIGNoaWxkID0gY2hpbGQgfHwge31cbiAgICBpZiAoIXBhcmVudCkgcmV0dXJuIGNoaWxkXG4gICAgZm9yICh2YXIga2V5IGluIHBhcmVudCkge1xuICAgICAgICBpZiAoa2V5ID09PSAnZWwnKSBjb250aW51ZVxuICAgICAgICB2YXIgdmFsID0gY2hpbGRba2V5XSxcbiAgICAgICAgICAgIHBhcmVudFZhbCA9IHBhcmVudFtrZXldXG4gICAgICAgIGlmICh0b3BMZXZlbCAmJiB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nICYmIHBhcmVudFZhbCkge1xuICAgICAgICAgICAgLy8gbWVyZ2UgaG9vayBmdW5jdGlvbnMgaW50byBhbiBhcnJheVxuICAgICAgICAgICAgY2hpbGRba2V5XSA9IFt2YWxdXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwYXJlbnRWYWwpKSB7XG4gICAgICAgICAgICAgICAgY2hpbGRba2V5XSA9IGNoaWxkW2tleV0uY29uY2F0KHBhcmVudFZhbClcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2hpbGRba2V5XS5wdXNoKHBhcmVudFZhbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgIHRvcExldmVsICYmXG4gICAgICAgICAgICAodXRpbHMuaXNUcnVlT2JqZWN0KHZhbCkgfHwgdXRpbHMuaXNUcnVlT2JqZWN0KHBhcmVudFZhbCkpXG4gICAgICAgICAgICAmJiAhKHBhcmVudFZhbCBpbnN0YW5jZW9mIFZpZXdNb2RlbClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICAvLyBtZXJnZSB0b3BsZXZlbCBvYmplY3Qgb3B0aW9uc1xuICAgICAgICAgICAgY2hpbGRba2V5XSA9IGluaGVyaXRPcHRpb25zKHZhbCwgcGFyZW50VmFsKVxuICAgICAgICB9IGVsc2UgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBpbmhlcml0IGlmIGNoaWxkIGRvZXNuJ3Qgb3ZlcnJpZGVcbiAgICAgICAgICAgIGNoaWxkW2tleV0gPSBwYXJlbnRWYWxcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY2hpbGRcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3TW9kZWwiLCIvKiBqc2hpbnQgcHJvdG86dHJ1ZSAqL1xuXG52YXIgRW1pdHRlciAgPSByZXF1aXJlKCcuL2VtaXR0ZXInKSxcbiAgICB1dGlscyAgICA9IHJlcXVpcmUoJy4vdXRpbHMnKSxcbiAgICAvLyBjYWNoZSBtZXRob2RzXG4gICAgZGVmICAgICAgPSB1dGlscy5kZWZQcm90ZWN0ZWQsXG4gICAgaXNPYmplY3QgPSB1dGlscy5pc09iamVjdCxcbiAgICBpc0FycmF5ICA9IEFycmF5LmlzQXJyYXksXG4gICAgaGFzT3duICAgPSAoe30pLmhhc093blByb3BlcnR5LFxuICAgIG9EZWYgICAgID0gT2JqZWN0LmRlZmluZVByb3BlcnR5LFxuICAgIHNsaWNlICAgID0gW10uc2xpY2UsXG4gICAgLy8gZml4IGZvciBJRSArIF9fcHJvdG9fXyBwcm9ibGVtXG4gICAgLy8gZGVmaW5lIG1ldGhvZHMgYXMgaW5lbnVtZXJhYmxlIGlmIF9fcHJvdG9fXyBpcyBwcmVzZW50LFxuICAgIC8vIG90aGVyd2lzZSBlbnVtZXJhYmxlIHNvIHdlIGNhbiBsb29wIHRocm91Z2ggYW5kIG1hbnVhbGx5XG4gICAgLy8gYXR0YWNoIHRvIGFycmF5IGluc3RhbmNlc1xuICAgIGhhc1Byb3RvID0gKHt9KS5fX3Byb3RvX19cblxuLy8gQXJyYXkgTXV0YXRpb24gSGFuZGxlcnMgJiBBdWdtZW50YXRpb25zIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBUaGUgcHJveHkgcHJvdG90eXBlIHRvIHJlcGxhY2UgdGhlIF9fcHJvdG9fXyBvZlxuLy8gYW4gb2JzZXJ2ZWQgYXJyYXlcbnZhciBBcnJheVByb3h5ID0gT2JqZWN0LmNyZWF0ZShBcnJheS5wcm90b3R5cGUpXG5cbi8vIGludGVyY2VwdCBtdXRhdGlvbiBtZXRob2RzXG47W1xuICAgICdwdXNoJyxcbiAgICAncG9wJyxcbiAgICAnc2hpZnQnLFxuICAgICd1bnNoaWZ0JyxcbiAgICAnc3BsaWNlJyxcbiAgICAnc29ydCcsXG4gICAgJ3JldmVyc2UnXG5dLmZvckVhY2god2F0Y2hNdXRhdGlvbilcblxuLy8gQXVnbWVudCB0aGUgQXJyYXlQcm94eSB3aXRoIGNvbnZlbmllbmNlIG1ldGhvZHNcbmRlZihBcnJheVByb3h5LCAnJHNldCcsIGZ1bmN0aW9uIChpbmRleCwgZGF0YSkge1xuICAgIHJldHVybiB0aGlzLnNwbGljZShpbmRleCwgMSwgZGF0YSlbMF1cbn0sICFoYXNQcm90bylcblxuZGVmKEFycmF5UHJveHksICckcmVtb3ZlJywgZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBpbmRleCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgaW5kZXggPSB0aGlzLmluZGV4T2YoaW5kZXgpXG4gICAgfVxuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNwbGljZShpbmRleCwgMSlbMF1cbiAgICB9XG59LCAhaGFzUHJvdG8pXG5cbi8qKlxuICogIEludGVyY2VwIGEgbXV0YXRpb24gZXZlbnQgc28gd2UgY2FuIGVtaXQgdGhlIG11dGF0aW9uIGluZm8uXG4gKiAgd2UgYWxzbyBhbmFseXplIHdoYXQgZWxlbWVudHMgYXJlIGFkZGVkL3JlbW92ZWQgYW5kIGxpbmsvdW5saW5rXG4gKiAgdGhlbSB3aXRoIHRoZSBwYXJlbnQgQXJyYXkuXG4gKi9cbmZ1bmN0aW9uIHdhdGNoTXV0YXRpb24gKG1ldGhvZCkge1xuICAgIGRlZihBcnJheVByb3h5LCBtZXRob2QsIGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzKSxcbiAgICAgICAgICAgIHJlc3VsdCA9IEFycmF5LnByb3RvdHlwZVttZXRob2RdLmFwcGx5KHRoaXMsIGFyZ3MpLFxuICAgICAgICAgICAgaW5zZXJ0ZWQsIHJlbW92ZWRcblxuICAgICAgICAvLyBkZXRlcm1pbmUgbmV3IC8gcmVtb3ZlZCBlbGVtZW50c1xuICAgICAgICBpZiAobWV0aG9kID09PSAncHVzaCcgfHwgbWV0aG9kID09PSAndW5zaGlmdCcpIHtcbiAgICAgICAgICAgIGluc2VydGVkID0gYXJnc1xuICAgICAgICB9IGVsc2UgaWYgKG1ldGhvZCA9PT0gJ3BvcCcgfHwgbWV0aG9kID09PSAnc2hpZnQnKSB7XG4gICAgICAgICAgICByZW1vdmVkID0gW3Jlc3VsdF1cbiAgICAgICAgfSBlbHNlIGlmIChtZXRob2QgPT09ICdzcGxpY2UnKSB7XG4gICAgICAgICAgICBpbnNlcnRlZCA9IGFyZ3Muc2xpY2UoMilcbiAgICAgICAgICAgIHJlbW92ZWQgPSByZXN1bHRcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gbGluayAmIHVubGlua1xuICAgICAgICBsaW5rQXJyYXlFbGVtZW50cyh0aGlzLCBpbnNlcnRlZClcbiAgICAgICAgdW5saW5rQXJyYXlFbGVtZW50cyh0aGlzLCByZW1vdmVkKVxuXG4gICAgICAgIC8vIGVtaXQgdGhlIG11dGF0aW9uIGV2ZW50XG4gICAgICAgIHRoaXMuX19lbWl0dGVyX18uZW1pdCgnbXV0YXRlJywgJycsIHRoaXMsIHtcbiAgICAgICAgICAgIG1ldGhvZCAgIDogbWV0aG9kLFxuICAgICAgICAgICAgYXJncyAgICAgOiBhcmdzLFxuICAgICAgICAgICAgcmVzdWx0ICAgOiByZXN1bHQsXG4gICAgICAgICAgICBpbnNlcnRlZCA6IGluc2VydGVkLFxuICAgICAgICAgICAgcmVtb3ZlZCAgOiByZW1vdmVkXG4gICAgICAgIH0pXG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgICBcbiAgICB9LCAhaGFzUHJvdG8pXG59XG5cbi8qKlxuICogIExpbmsgbmV3IGVsZW1lbnRzIHRvIGFuIEFycmF5LCBzbyB3aGVuIHRoZXkgY2hhbmdlXG4gKiAgYW5kIGVtaXQgZXZlbnRzLCB0aGUgb3duZXIgQXJyYXkgY2FuIGJlIG5vdGlmaWVkLlxuICovXG5mdW5jdGlvbiBsaW5rQXJyYXlFbGVtZW50cyAoYXJyLCBpdGVtcykge1xuICAgIGlmIChpdGVtcykge1xuICAgICAgICB2YXIgaSA9IGl0ZW1zLmxlbmd0aCwgaXRlbSwgb3duZXJzXG4gICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgIGl0ZW0gPSBpdGVtc1tpXVxuICAgICAgICAgICAgaWYgKGlzV2F0Y2hhYmxlKGl0ZW0pKSB7XG4gICAgICAgICAgICAgICAgLy8gaWYgb2JqZWN0IGlzIG5vdCBjb252ZXJ0ZWQgZm9yIG9ic2VydmluZ1xuICAgICAgICAgICAgICAgIC8vIGNvbnZlcnQgaXQuLi5cbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW0uX19lbWl0dGVyX18pIHtcbiAgICAgICAgICAgICAgICAgICAgY29udmVydChpdGVtKVxuICAgICAgICAgICAgICAgICAgICB3YXRjaChpdGVtKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvd25lcnMgPSBpdGVtLl9fZW1pdHRlcl9fLm93bmVyc1xuICAgICAgICAgICAgICAgIGlmIChvd25lcnMuaW5kZXhPZihhcnIpIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBvd25lcnMucHVzaChhcnIpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqICBVbmxpbmsgcmVtb3ZlZCBlbGVtZW50cyBmcm9tIHRoZSBleC1vd25lciBBcnJheS5cbiAqL1xuZnVuY3Rpb24gdW5saW5rQXJyYXlFbGVtZW50cyAoYXJyLCBpdGVtcykge1xuICAgIGlmIChpdGVtcykge1xuICAgICAgICB2YXIgaSA9IGl0ZW1zLmxlbmd0aCwgaXRlbVxuICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICBpdGVtID0gaXRlbXNbaV1cbiAgICAgICAgICAgIGlmIChpdGVtICYmIGl0ZW0uX19lbWl0dGVyX18pIHtcbiAgICAgICAgICAgICAgICB2YXIgb3duZXJzID0gaXRlbS5fX2VtaXR0ZXJfXy5vd25lcnNcbiAgICAgICAgICAgICAgICBpZiAob3duZXJzKSBvd25lcnMuc3BsaWNlKG93bmVycy5pbmRleE9mKGFycikpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIE9iamVjdCBhZGQvZGVsZXRlIGtleSBhdWdtZW50YXRpb24gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxudmFyIE9ialByb3h5ID0gT2JqZWN0LmNyZWF0ZShPYmplY3QucHJvdG90eXBlKVxuXG5kZWYoT2JqUHJveHksICckYWRkJywgZnVuY3Rpb24gKGtleSwgdmFsKSB7XG4gICAgaWYgKGhhc093bi5jYWxsKHRoaXMsIGtleSkpIHJldHVyblxuICAgIHRoaXNba2V5XSA9IHZhbFxuICAgIGNvbnZlcnRLZXkodGhpcywga2V5LCB0cnVlKVxufSwgIWhhc1Byb3RvKVxuXG5kZWYoT2JqUHJveHksICckZGVsZXRlJywgZnVuY3Rpb24gKGtleSkge1xuICAgIGlmICghKGhhc093bi5jYWxsKHRoaXMsIGtleSkpKSByZXR1cm5cbiAgICAvLyB0cmlnZ2VyIHNldCBldmVudHNcbiAgICB0aGlzW2tleV0gPSB1bmRlZmluZWRcbiAgICBkZWxldGUgdGhpc1trZXldXG4gICAgdGhpcy5fX2VtaXR0ZXJfXy5lbWl0KCdkZWxldGUnLCBrZXkpXG59LCAhaGFzUHJvdG8pXG5cbi8vIFdhdGNoIEhlbHBlcnMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqXG4gKiAgQ2hlY2sgaWYgYSB2YWx1ZSBpcyB3YXRjaGFibGVcbiAqL1xuZnVuY3Rpb24gaXNXYXRjaGFibGUgKG9iaikge1xuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiBvYmogJiYgIW9iai4kY29tcGlsZXJcbn1cblxuLyoqXG4gKiAgQ29udmVydCBhbiBPYmplY3QvQXJyYXkgdG8gZ2l2ZSBpdCBhIGNoYW5nZSBlbWl0dGVyLlxuICovXG5mdW5jdGlvbiBjb252ZXJ0IChvYmopIHtcbiAgICBpZiAob2JqLl9fZW1pdHRlcl9fKSByZXR1cm4gdHJ1ZVxuICAgIHZhciBlbWl0dGVyID0gbmV3IEVtaXR0ZXIoKVxuICAgIGRlZihvYmosICdfX2VtaXR0ZXJfXycsIGVtaXR0ZXIpXG4gICAgZW1pdHRlclxuICAgICAgICAub24oJ3NldCcsIGZ1bmN0aW9uIChrZXksIHZhbCwgcHJvcGFnYXRlKSB7XG4gICAgICAgICAgICBpZiAocHJvcGFnYXRlKSBwcm9wYWdhdGVDaGFuZ2Uob2JqKVxuICAgICAgICB9KVxuICAgICAgICAub24oJ211dGF0ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHByb3BhZ2F0ZUNoYW5nZShvYmopXG4gICAgICAgIH0pXG4gICAgZW1pdHRlci52YWx1ZXMgPSB1dGlscy5oYXNoKClcbiAgICBlbWl0dGVyLm93bmVycyA9IFtdXG4gICAgcmV0dXJuIGZhbHNlXG59XG5cbi8qKlxuICogIFByb3BhZ2F0ZSBhbiBhcnJheSBlbGVtZW50J3MgY2hhbmdlIHRvIGl0cyBvd25lciBhcnJheXNcbiAqL1xuZnVuY3Rpb24gcHJvcGFnYXRlQ2hhbmdlIChvYmopIHtcbiAgICB2YXIgb3duZXJzID0gb2JqLl9fZW1pdHRlcl9fLm93bmVycyxcbiAgICAgICAgaSA9IG93bmVycy5sZW5ndGhcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIG93bmVyc1tpXS5fX2VtaXR0ZXJfXy5lbWl0KCdzZXQnLCAnJywgJycsIHRydWUpXG4gICAgfVxufVxuXG4vKipcbiAqICBXYXRjaCB0YXJnZXQgYmFzZWQgb24gaXRzIHR5cGVcbiAqL1xuZnVuY3Rpb24gd2F0Y2ggKG9iaikge1xuICAgIGlmIChpc0FycmF5KG9iaikpIHtcbiAgICAgICAgd2F0Y2hBcnJheShvYmopXG4gICAgfSBlbHNlIHtcbiAgICAgICAgd2F0Y2hPYmplY3Qob2JqKVxuICAgIH1cbn1cblxuLyoqXG4gKiAgQXVnbWVudCB0YXJnZXQgb2JqZWN0cyB3aXRoIG1vZGlmaWVkXG4gKiAgbWV0aG9kc1xuICovXG5mdW5jdGlvbiBhdWdtZW50ICh0YXJnZXQsIHNyYykge1xuICAgIGlmIChoYXNQcm90bykge1xuICAgICAgICB0YXJnZXQuX19wcm90b19fID0gc3JjXG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNyYykge1xuICAgICAgICAgICAgZGVmKHRhcmdldCwga2V5LCBzcmNba2V5XSlcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqXG4gKiAgV2F0Y2ggYW4gT2JqZWN0LCByZWN1cnNpdmUuXG4gKi9cbmZ1bmN0aW9uIHdhdGNoT2JqZWN0IChvYmopIHtcbiAgICBhdWdtZW50KG9iaiwgT2JqUHJveHkpXG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICBjb252ZXJ0S2V5KG9iaiwga2V5KVxuICAgIH1cbn1cblxuLyoqXG4gKiAgV2F0Y2ggYW4gQXJyYXksIG92ZXJsb2FkIG11dGF0aW9uIG1ldGhvZHNcbiAqICBhbmQgYWRkIGF1Z21lbnRhdGlvbnMgYnkgaW50ZXJjZXB0aW5nIHRoZSBwcm90b3R5cGUgY2hhaW5cbiAqL1xuZnVuY3Rpb24gd2F0Y2hBcnJheSAoYXJyKSB7XG4gICAgYXVnbWVudChhcnIsIEFycmF5UHJveHkpXG4gICAgbGlua0FycmF5RWxlbWVudHMoYXJyLCBhcnIpXG59XG5cbi8qKlxuICogIERlZmluZSBhY2Nlc3NvcnMgZm9yIGEgcHJvcGVydHkgb24gYW4gT2JqZWN0XG4gKiAgc28gaXQgZW1pdHMgZ2V0L3NldCBldmVudHMuXG4gKiAgVGhlbiB3YXRjaCB0aGUgdmFsdWUgaXRzZWxmLlxuICovXG5mdW5jdGlvbiBjb252ZXJ0S2V5IChvYmosIGtleSwgcHJvcGFnYXRlKSB7XG4gICAgdmFyIGtleVByZWZpeCA9IGtleS5jaGFyQXQoMClcbiAgICBpZiAoa2V5UHJlZml4ID09PSAnJCcgfHwga2V5UHJlZml4ID09PSAnXycpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuICAgIC8vIGVtaXQgc2V0IG9uIGJpbmRcbiAgICAvLyB0aGlzIG1lYW5zIHdoZW4gYW4gb2JqZWN0IGlzIG9ic2VydmVkIGl0IHdpbGwgZW1pdFxuICAgIC8vIGEgZmlyc3QgYmF0Y2ggb2Ygc2V0IGV2ZW50cy5cbiAgICB2YXIgZW1pdHRlciA9IG9iai5fX2VtaXR0ZXJfXyxcbiAgICAgICAgdmFsdWVzICA9IGVtaXR0ZXIudmFsdWVzXG5cbiAgICBpbml0KG9ialtrZXldLCBwcm9wYWdhdGUpXG5cbiAgICBvRGVmKG9iaiwga2V5LCB7XG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSB2YWx1ZXNba2V5XVxuICAgICAgICAgICAgLy8gb25seSBlbWl0IGdldCBvbiB0aXAgdmFsdWVzXG4gICAgICAgICAgICBpZiAocHViLnNob3VsZEdldCkge1xuICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnZ2V0Jywga2V5KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlXG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gKG5ld1ZhbCkge1xuICAgICAgICAgICAgdmFyIG9sZFZhbCA9IHZhbHVlc1trZXldXG4gICAgICAgICAgICB1bm9ic2VydmUob2xkVmFsLCBrZXksIGVtaXR0ZXIpXG4gICAgICAgICAgICBjb3B5UGF0aHMobmV3VmFsLCBvbGRWYWwpXG4gICAgICAgICAgICAvLyBhbiBpbW1lZGlhdGUgcHJvcGVydHkgc2hvdWxkIG5vdGlmeSBpdHMgcGFyZW50XG4gICAgICAgICAgICAvLyB0byBlbWl0IHNldCBmb3IgaXRzZWxmIHRvb1xuICAgICAgICAgICAgaW5pdChuZXdWYWwsIHRydWUpXG4gICAgICAgIH1cbiAgICB9KVxuXG4gICAgZnVuY3Rpb24gaW5pdCAodmFsLCBwcm9wYWdhdGUpIHtcbiAgICAgICAgdmFsdWVzW2tleV0gPSB2YWxcbiAgICAgICAgZW1pdHRlci5lbWl0KCdzZXQnLCBrZXksIHZhbCwgcHJvcGFnYXRlKVxuICAgICAgICBpZiAoaXNBcnJheSh2YWwpKSB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3NldCcsIGtleSArICcubGVuZ3RoJywgdmFsLmxlbmd0aCwgcHJvcGFnYXRlKVxuICAgICAgICB9XG4gICAgICAgIG9ic2VydmUodmFsLCBrZXksIGVtaXR0ZXIpXG4gICAgfVxufVxuXG4vKipcbiAqICBXaGVuIGEgdmFsdWUgdGhhdCBpcyBhbHJlYWR5IGNvbnZlcnRlZCBpc1xuICogIG9ic2VydmVkIGFnYWluIGJ5IGFub3RoZXIgb2JzZXJ2ZXIsIHdlIGNhbiBza2lwXG4gKiAgdGhlIHdhdGNoIGNvbnZlcnNpb24gYW5kIHNpbXBseSBlbWl0IHNldCBldmVudCBmb3JcbiAqICBhbGwgb2YgaXRzIHByb3BlcnRpZXMuXG4gKi9cbmZ1bmN0aW9uIGVtaXRTZXQgKG9iaikge1xuICAgIHZhciBlbWl0dGVyID0gb2JqICYmIG9iai5fX2VtaXR0ZXJfX1xuICAgIGlmICghZW1pdHRlcikgcmV0dXJuXG4gICAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgICAgICBlbWl0dGVyLmVtaXQoJ3NldCcsICdsZW5ndGgnLCBvYmoubGVuZ3RoKVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBrZXksIHZhbFxuICAgICAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgIHZhbCA9IG9ialtrZXldXG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3NldCcsIGtleSwgdmFsKVxuICAgICAgICAgICAgZW1pdFNldCh2YWwpXG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKlxuICogIE1ha2Ugc3VyZSBhbGwgdGhlIHBhdGhzIGluIGFuIG9sZCBvYmplY3QgZXhpc3RzXG4gKiAgaW4gYSBuZXcgb2JqZWN0LlxuICogIFNvIHdoZW4gYW4gb2JqZWN0IGNoYW5nZXMsIGFsbCBtaXNzaW5nIGtleXMgd2lsbFxuICogIGVtaXQgYSBzZXQgZXZlbnQgd2l0aCB1bmRlZmluZWQgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIGNvcHlQYXRocyAobmV3T2JqLCBvbGRPYmopIHtcbiAgICBpZiAoIWlzT2JqZWN0KG5ld09iaikgfHwgIWlzT2JqZWN0KG9sZE9iaikpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuICAgIHZhciBwYXRoLCBvbGRWYWwsIG5ld1ZhbFxuICAgIGZvciAocGF0aCBpbiBvbGRPYmopIHtcbiAgICAgICAgaWYgKCEoaGFzT3duLmNhbGwobmV3T2JqLCBwYXRoKSkpIHtcbiAgICAgICAgICAgIG9sZFZhbCA9IG9sZE9ialtwYXRoXVxuICAgICAgICAgICAgaWYgKGlzQXJyYXkob2xkVmFsKSkge1xuICAgICAgICAgICAgICAgIG5ld09ialtwYXRoXSA9IFtdXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9sZFZhbCkpIHtcbiAgICAgICAgICAgICAgICBuZXdWYWwgPSBuZXdPYmpbcGF0aF0gPSB7fVxuICAgICAgICAgICAgICAgIGNvcHlQYXRocyhuZXdWYWwsIG9sZFZhbClcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV3T2JqW3BhdGhdID0gdW5kZWZpbmVkXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKlxuICogIHdhbGsgYWxvbmcgYSBwYXRoIGFuZCBtYWtlIHN1cmUgaXQgY2FuIGJlIGFjY2Vzc2VkXG4gKiAgYW5kIGVudW1lcmF0ZWQgaW4gdGhhdCBvYmplY3RcbiAqL1xuZnVuY3Rpb24gZW5zdXJlUGF0aCAob2JqLCBrZXkpIHtcbiAgICB2YXIgcGF0aCA9IGtleS5zcGxpdCgnLicpLCBzZWNcbiAgICBmb3IgKHZhciBpID0gMCwgZCA9IHBhdGgubGVuZ3RoIC0gMTsgaSA8IGQ7IGkrKykge1xuICAgICAgICBzZWMgPSBwYXRoW2ldXG4gICAgICAgIGlmICghb2JqW3NlY10pIHtcbiAgICAgICAgICAgIG9ialtzZWNdID0ge31cbiAgICAgICAgICAgIGlmIChvYmouX19lbWl0dGVyX18pIGNvbnZlcnRLZXkob2JqLCBzZWMpXG4gICAgICAgIH1cbiAgICAgICAgb2JqID0gb2JqW3NlY11cbiAgICB9XG4gICAgaWYgKGlzT2JqZWN0KG9iaikpIHtcbiAgICAgICAgc2VjID0gcGF0aFtpXVxuICAgICAgICBpZiAoIShoYXNPd24uY2FsbChvYmosIHNlYykpKSB7XG4gICAgICAgICAgICBvYmpbc2VjXSA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgaWYgKG9iai5fX2VtaXR0ZXJfXykgY29udmVydEtleShvYmosIHNlYylcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gTWFpbiBBUEkgTWV0aG9kcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKipcbiAqICBPYnNlcnZlIGFuIG9iamVjdCB3aXRoIGEgZ2l2ZW4gcGF0aCxcbiAqICBhbmQgcHJveHkgZ2V0L3NldC9tdXRhdGUgZXZlbnRzIHRvIHRoZSBwcm92aWRlZCBvYnNlcnZlci5cbiAqL1xuZnVuY3Rpb24gb2JzZXJ2ZSAob2JqLCByYXdQYXRoLCBvYnNlcnZlcikge1xuXG4gICAgaWYgKCFpc1dhdGNoYWJsZShvYmopKSByZXR1cm5cblxuICAgIHZhciBwYXRoID0gcmF3UGF0aCA/IHJhd1BhdGggKyAnLicgOiAnJyxcbiAgICAgICAgYWxyZWFkeUNvbnZlcnRlZCA9IGNvbnZlcnQob2JqKSxcbiAgICAgICAgZW1pdHRlciA9IG9iai5fX2VtaXR0ZXJfX1xuXG4gICAgLy8gc2V0dXAgcHJveHkgbGlzdGVuZXJzIG9uIHRoZSBwYXJlbnQgb2JzZXJ2ZXIuXG4gICAgLy8gd2UgbmVlZCB0byBrZWVwIHJlZmVyZW5jZSB0byB0aGVtIHNvIHRoYXQgdGhleVxuICAgIC8vIGNhbiBiZSByZW1vdmVkIHdoZW4gdGhlIG9iamVjdCBpcyB1bi1vYnNlcnZlZC5cbiAgICBvYnNlcnZlci5wcm94aWVzID0gb2JzZXJ2ZXIucHJveGllcyB8fCB7fVxuICAgIHZhciBwcm94aWVzID0gb2JzZXJ2ZXIucHJveGllc1twYXRoXSA9IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICBvYnNlcnZlci5lbWl0KCdnZXQnLCBwYXRoICsga2V5KVxuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uIChrZXksIHZhbCwgcHJvcGFnYXRlKSB7XG4gICAgICAgICAgICBpZiAoa2V5KSBvYnNlcnZlci5lbWl0KCdzZXQnLCBwYXRoICsga2V5LCB2YWwpXG4gICAgICAgICAgICAvLyBhbHNvIG5vdGlmeSBvYnNlcnZlciB0aGF0IHRoZSBvYmplY3QgaXRzZWxmIGNoYW5nZWRcbiAgICAgICAgICAgIC8vIGJ1dCBvbmx5IGRvIHNvIHdoZW4gaXQncyBhIGltbWVkaWF0ZSBwcm9wZXJ0eS4gdGhpc1xuICAgICAgICAgICAgLy8gYXZvaWRzIGR1cGxpY2F0ZSBldmVudCBmaXJpbmcuXG4gICAgICAgICAgICBpZiAocmF3UGF0aCAmJiBwcm9wYWdhdGUpIHtcbiAgICAgICAgICAgICAgICBvYnNlcnZlci5lbWl0KCdzZXQnLCByYXdQYXRoLCBvYmosIHRydWUpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG11dGF0ZTogZnVuY3Rpb24gKGtleSwgdmFsLCBtdXRhdGlvbikge1xuICAgICAgICAgICAgLy8gaWYgdGhlIEFycmF5IGlzIGEgcm9vdCB2YWx1ZVxuICAgICAgICAgICAgLy8gdGhlIGtleSB3aWxsIGJlIG51bGxcbiAgICAgICAgICAgIHZhciBmaXhlZFBhdGggPSBrZXkgPyBwYXRoICsga2V5IDogcmF3UGF0aFxuICAgICAgICAgICAgb2JzZXJ2ZXIuZW1pdCgnbXV0YXRlJywgZml4ZWRQYXRoLCB2YWwsIG11dGF0aW9uKVxuICAgICAgICAgICAgLy8gYWxzbyBlbWl0IHNldCBmb3IgQXJyYXkncyBsZW5ndGggd2hlbiBpdCBtdXRhdGVzXG4gICAgICAgICAgICB2YXIgbSA9IG11dGF0aW9uLm1ldGhvZFxuICAgICAgICAgICAgaWYgKG0gIT09ICdzb3J0JyAmJiBtICE9PSAncmV2ZXJzZScpIHtcbiAgICAgICAgICAgICAgICBvYnNlcnZlci5lbWl0KCdzZXQnLCBmaXhlZFBhdGggKyAnLmxlbmd0aCcsIHZhbC5sZW5ndGgpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBhdHRhY2ggdGhlIGxpc3RlbmVycyB0byB0aGUgY2hpbGQgb2JzZXJ2ZXIuXG4gICAgLy8gbm93IGFsbCB0aGUgZXZlbnRzIHdpbGwgcHJvcGFnYXRlIHVwd2FyZHMuXG4gICAgZW1pdHRlclxuICAgICAgICAub24oJ2dldCcsIHByb3hpZXMuZ2V0KVxuICAgICAgICAub24oJ3NldCcsIHByb3hpZXMuc2V0KVxuICAgICAgICAub24oJ211dGF0ZScsIHByb3hpZXMubXV0YXRlKVxuXG4gICAgaWYgKGFscmVhZHlDb252ZXJ0ZWQpIHtcbiAgICAgICAgLy8gZm9yIG9iamVjdHMgdGhhdCBoYXZlIGFscmVhZHkgYmVlbiBjb252ZXJ0ZWQsXG4gICAgICAgIC8vIGVtaXQgc2V0IGV2ZW50cyBmb3IgZXZlcnl0aGluZyBpbnNpZGVcbiAgICAgICAgZW1pdFNldChvYmopXG4gICAgfSBlbHNlIHtcbiAgICAgICAgd2F0Y2gob2JqKVxuICAgIH1cbn1cblxuLyoqXG4gKiAgQ2FuY2VsIG9ic2VydmF0aW9uLCB0dXJuIG9mZiB0aGUgbGlzdGVuZXJzLlxuICovXG5mdW5jdGlvbiB1bm9ic2VydmUgKG9iaiwgcGF0aCwgb2JzZXJ2ZXIpIHtcblxuICAgIGlmICghb2JqIHx8ICFvYmouX19lbWl0dGVyX18pIHJldHVyblxuXG4gICAgcGF0aCA9IHBhdGggPyBwYXRoICsgJy4nIDogJydcbiAgICB2YXIgcHJveGllcyA9IG9ic2VydmVyLnByb3hpZXNbcGF0aF1cbiAgICBpZiAoIXByb3hpZXMpIHJldHVyblxuXG4gICAgLy8gdHVybiBvZmYgbGlzdGVuZXJzXG4gICAgb2JqLl9fZW1pdHRlcl9fXG4gICAgICAgIC5vZmYoJ2dldCcsIHByb3hpZXMuZ2V0KVxuICAgICAgICAub2ZmKCdzZXQnLCBwcm94aWVzLnNldClcbiAgICAgICAgLm9mZignbXV0YXRlJywgcHJveGllcy5tdXRhdGUpXG5cbiAgICAvLyByZW1vdmUgcmVmZXJlbmNlXG4gICAgb2JzZXJ2ZXIucHJveGllc1twYXRoXSA9IG51bGxcbn1cblxuLy8gRXhwb3NlIEFQSSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG52YXIgcHViID0gbW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICAvLyB3aGV0aGVyIHRvIGVtaXQgZ2V0IGV2ZW50c1xuICAgIC8vIG9ubHkgZW5hYmxlZCBkdXJpbmcgZGVwZW5kZW5jeSBwYXJzaW5nXG4gICAgc2hvdWxkR2V0ICAgOiBmYWxzZSxcblxuICAgIG9ic2VydmUgICAgIDogb2JzZXJ2ZSxcbiAgICB1bm9ic2VydmUgICA6IHVub2JzZXJ2ZSxcbiAgICBlbnN1cmVQYXRoICA6IGVuc3VyZVBhdGgsXG4gICAgY29weVBhdGhzICAgOiBjb3B5UGF0aHMsXG4gICAgd2F0Y2ggICAgICAgOiB3YXRjaCxcbiAgICBjb252ZXJ0ICAgICA6IGNvbnZlcnQsXG4gICAgY29udmVydEtleSAgOiBjb252ZXJ0S2V5XG59IiwidmFyIHRvRnJhZ21lbnQgPSByZXF1aXJlKCcuL2ZyYWdtZW50Jyk7XG5cbi8qKlxuICogUGFyc2VzIGEgdGVtcGxhdGUgc3RyaW5nIG9yIG5vZGUgYW5kIG5vcm1hbGl6ZXMgaXQgaW50byBhXG4gKiBhIG5vZGUgdGhhdCBjYW4gYmUgdXNlZCBhcyBhIHBhcnRpYWwgb2YgYSB0ZW1wbGF0ZSBvcHRpb25cbiAqXG4gKiBQb3NzaWJsZSB2YWx1ZXMgaW5jbHVkZVxuICogaWQgc2VsZWN0b3I6ICcjc29tZS10ZW1wbGF0ZS1pZCdcbiAqIHRlbXBsYXRlIHN0cmluZzogJzxkaXY+PHNwYW4+bXkgdGVtcGxhdGU8L3NwYW4+PC9kaXY+J1xuICogRG9jdW1lbnRGcmFnbWVudCBvYmplY3RcbiAqIE5vZGUgb2JqZWN0IG9mIHR5cGUgVGVtcGxhdGVcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0ZW1wbGF0ZSkge1xuICAgIHZhciB0ZW1wbGF0ZU5vZGU7XG5cbiAgICBpZiAodGVtcGxhdGUgaW5zdGFuY2VvZiB3aW5kb3cuRG9jdW1lbnRGcmFnbWVudCkge1xuICAgICAgICAvLyBpZiB0aGUgdGVtcGxhdGUgaXMgYWxyZWFkeSBhIGRvY3VtZW50IGZyYWdtZW50IC0tIGRvIG5vdGhpbmdcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlXG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB0ZW1wbGF0ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgLy8gdGVtcGxhdGUgYnkgSURcbiAgICAgICAgaWYgKHRlbXBsYXRlLmNoYXJBdCgwKSA9PT0gJyMnKSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZU5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0ZW1wbGF0ZS5zbGljZSgxKSlcbiAgICAgICAgICAgIGlmICghdGVtcGxhdGVOb2RlKSByZXR1cm5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0b0ZyYWdtZW50KHRlbXBsYXRlKVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh0ZW1wbGF0ZS5ub2RlVHlwZSkge1xuICAgICAgICB0ZW1wbGF0ZU5vZGUgPSB0ZW1wbGF0ZVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIGlmIGl0cyBhIHRlbXBsYXRlIHRhZyBhbmQgdGhlIGJyb3dzZXIgc3VwcG9ydHMgaXQsXG4gICAgLy8gaXRzIGNvbnRlbnQgaXMgYWxyZWFkeSBhIGRvY3VtZW50IGZyYWdtZW50IVxuICAgIGlmICh0ZW1wbGF0ZU5vZGUudGFnTmFtZSA9PT0gJ1RFTVBMQVRFJyAmJiB0ZW1wbGF0ZU5vZGUuY29udGVudCkge1xuICAgICAgICByZXR1cm4gdGVtcGxhdGVOb2RlLmNvbnRlbnRcbiAgICB9XG5cbiAgICBpZiAodGVtcGxhdGVOb2RlLnRhZ05hbWUgPT09ICdTQ1JJUFQnKSB7XG4gICAgICAgIHJldHVybiB0b0ZyYWdtZW50KHRlbXBsYXRlTm9kZS5pbm5lckhUTUwpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRvRnJhZ21lbnQodGVtcGxhdGVOb2RlLm91dGVySFRNTCk7XG59XG4iLCJ2YXIgb3BlbkNoYXIgICAgICAgID0gJ3snLFxuICAgIGVuZENoYXIgICAgICAgICA9ICd9JyxcbiAgICBFU0NBUEVfUkUgICAgICAgPSAvWy0uKis/XiR7fSgpfFtcXF1cXC9cXFxcXS9nLFxuICAgIC8vIGxhenkgcmVxdWlyZVxuICAgIERpcmVjdGl2ZVxuXG5leHBvcnRzLlJlZ2V4ID0gYnVpbGRJbnRlcnBvbGF0aW9uUmVnZXgoKVxuXG5mdW5jdGlvbiBidWlsZEludGVycG9sYXRpb25SZWdleCAoKSB7XG4gICAgdmFyIG9wZW4gPSBlc2NhcGVSZWdleChvcGVuQ2hhciksXG4gICAgICAgIGVuZCAgPSBlc2NhcGVSZWdleChlbmRDaGFyKVxuICAgIHJldHVybiBuZXcgUmVnRXhwKG9wZW4gKyBvcGVuICsgb3BlbiArICc/KC4rPyknICsgZW5kICsgJz8nICsgZW5kICsgZW5kKVxufVxuXG5mdW5jdGlvbiBlc2NhcGVSZWdleCAoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKEVTQ0FQRV9SRSwgJ1xcXFwkJicpXG59XG5cbmZ1bmN0aW9uIHNldERlbGltaXRlcnMgKGRlbGltaXRlcnMpIHtcbiAgICBvcGVuQ2hhciA9IGRlbGltaXRlcnNbMF1cbiAgICBlbmRDaGFyID0gZGVsaW1pdGVyc1sxXVxuICAgIGV4cG9ydHMuZGVsaW1pdGVycyA9IGRlbGltaXRlcnNcbiAgICBleHBvcnRzLlJlZ2V4ID0gYnVpbGRJbnRlcnBvbGF0aW9uUmVnZXgoKVxufVxuXG4vKiogXG4gKiAgUGFyc2UgYSBwaWVjZSBvZiB0ZXh0LCByZXR1cm4gYW4gYXJyYXkgb2YgdG9rZW5zXG4gKiAgdG9rZW4gdHlwZXM6XG4gKiAgMS4gcGxhaW4gc3RyaW5nXG4gKiAgMi4gb2JqZWN0IHdpdGgga2V5ID0gYmluZGluZyBrZXlcbiAqICAzLiBvYmplY3Qgd2l0aCBrZXkgJiBodG1sID0gdHJ1ZVxuICovXG5mdW5jdGlvbiBwYXJzZSAodGV4dCkge1xuICAgIGlmICghZXhwb3J0cy5SZWdleC50ZXN0KHRleHQpKSByZXR1cm4gbnVsbFxuICAgIHZhciBtLCBpLCB0b2tlbiwgbWF0Y2gsIHRva2VucyA9IFtdXG4gICAgLyoganNoaW50IGJvc3M6IHRydWUgKi9cbiAgICB3aGlsZSAobSA9IHRleHQubWF0Y2goZXhwb3J0cy5SZWdleCkpIHtcbiAgICAgICAgaSA9IG0uaW5kZXhcbiAgICAgICAgaWYgKGkgPiAwKSB0b2tlbnMucHVzaCh0ZXh0LnNsaWNlKDAsIGkpKVxuICAgICAgICB0b2tlbiA9IHsga2V5OiBtWzFdLnRyaW0oKSB9XG4gICAgICAgIG1hdGNoID0gbVswXVxuICAgICAgICB0b2tlbi5odG1sID1cbiAgICAgICAgICAgIG1hdGNoLmNoYXJBdCgyKSA9PT0gb3BlbkNoYXIgJiZcbiAgICAgICAgICAgIG1hdGNoLmNoYXJBdChtYXRjaC5sZW5ndGggLSAzKSA9PT0gZW5kQ2hhclxuICAgICAgICB0b2tlbnMucHVzaCh0b2tlbilcbiAgICAgICAgdGV4dCA9IHRleHQuc2xpY2UoaSArIG1bMF0ubGVuZ3RoKVxuICAgIH1cbiAgICBpZiAodGV4dC5sZW5ndGgpIHRva2Vucy5wdXNoKHRleHQpXG4gICAgcmV0dXJuIHRva2Vuc1xufVxuXG4vKipcbiAqICBQYXJzZSBhbiBhdHRyaWJ1dGUgdmFsdWUgd2l0aCBwb3NzaWJsZSBpbnRlcnBvbGF0aW9uIHRhZ3NcbiAqICByZXR1cm4gYSBEaXJlY3RpdmUtZnJpZW5kbHkgZXhwcmVzc2lvblxuICpcbiAqICBlLmcuICBhIHt7Yn19IGMgID0+ICBcImEgXCIgKyBiICsgXCIgY1wiXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQXR0ciAoYXR0cikge1xuICAgIERpcmVjdGl2ZSA9IERpcmVjdGl2ZSB8fCByZXF1aXJlKCcuL2RpcmVjdGl2ZScpXG4gICAgdmFyIHRva2VucyA9IHBhcnNlKGF0dHIpXG4gICAgaWYgKCF0b2tlbnMpIHJldHVybiBudWxsXG4gICAgaWYgKHRva2Vucy5sZW5ndGggPT09IDEpIHJldHVybiB0b2tlbnNbMF0ua2V5XG4gICAgdmFyIHJlcyA9IFtdLCB0b2tlblxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gdG9rZW5zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0b2tlbiA9IHRva2Vuc1tpXVxuICAgICAgICByZXMucHVzaChcbiAgICAgICAgICAgIHRva2VuLmtleVxuICAgICAgICAgICAgICAgID8gaW5saW5lRmlsdGVycyh0b2tlbi5rZXkpXG4gICAgICAgICAgICAgICAgOiAoJ1wiJyArIHRva2VuICsgJ1wiJylcbiAgICAgICAgKVxuICAgIH1cbiAgICByZXR1cm4gcmVzLmpvaW4oJysnKVxufVxuXG4vKipcbiAqICBJbmxpbmVzIGFueSBwb3NzaWJsZSBmaWx0ZXJzIGluIGEgYmluZGluZ1xuICogIHNvIHRoYXQgd2UgY2FuIGNvbWJpbmUgZXZlcnl0aGluZyBpbnRvIGEgaHVnZSBleHByZXNzaW9uXG4gKi9cbmZ1bmN0aW9uIGlubGluZUZpbHRlcnMgKGtleSkge1xuICAgIGlmIChrZXkuaW5kZXhPZignfCcpID4gLTEpIHtcbiAgICAgICAgdmFyIGRpcnMgPSBEaXJlY3RpdmUucGFyc2Uoa2V5KSxcbiAgICAgICAgICAgIGRpciA9IGRpcnMgJiYgZGlyc1swXVxuICAgICAgICBpZiAoZGlyICYmIGRpci5maWx0ZXJzKSB7XG4gICAgICAgICAgICBrZXkgPSBEaXJlY3RpdmUuaW5saW5lRmlsdGVycyhcbiAgICAgICAgICAgICAgICBkaXIua2V5LFxuICAgICAgICAgICAgICAgIGRpci5maWx0ZXJzXG4gICAgICAgICAgICApXG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuICcoJyArIGtleSArICcpJ1xufVxuXG5leHBvcnRzLnBhcnNlICAgICAgICAgPSBwYXJzZVxuZXhwb3J0cy5wYXJzZUF0dHIgICAgID0gcGFyc2VBdHRyXG5leHBvcnRzLnNldERlbGltaXRlcnMgPSBzZXREZWxpbWl0ZXJzXG5leHBvcnRzLmRlbGltaXRlcnMgICAgPSBbb3BlbkNoYXIsIGVuZENoYXJdIiwidmFyIGVuZEV2ZW50cyAgPSBzbmlmZkVuZEV2ZW50cygpLFxuICAgIGNvbmZpZyAgICAgPSByZXF1aXJlKCcuL2NvbmZpZycpLFxuICAgIC8vIGJhdGNoIGVudGVyIGFuaW1hdGlvbnMgc28gd2Ugb25seSBmb3JjZSB0aGUgbGF5b3V0IG9uY2VcbiAgICBCYXRjaGVyICAgID0gcmVxdWlyZSgnLi9iYXRjaGVyJyksXG4gICAgYmF0Y2hlciAgICA9IG5ldyBCYXRjaGVyKCksXG4gICAgLy8gY2FjaGUgdGltZXIgZnVuY3Rpb25zXG4gICAgc2V0VE8gICAgICA9IHdpbmRvdy5zZXRUaW1lb3V0LFxuICAgIGNsZWFyVE8gICAgPSB3aW5kb3cuY2xlYXJUaW1lb3V0LFxuICAgIC8vIGV4aXQgY29kZXMgZm9yIHRlc3RpbmdcbiAgICBjb2RlcyA9IHtcbiAgICAgICAgQ1NTX0UgICAgIDogMSxcbiAgICAgICAgQ1NTX0wgICAgIDogMixcbiAgICAgICAgSlNfRSAgICAgIDogMyxcbiAgICAgICAgSlNfTCAgICAgIDogNCxcbiAgICAgICAgQ1NTX1NLSVAgIDogLTEsXG4gICAgICAgIEpTX1NLSVAgICA6IC0yLFxuICAgICAgICBKU19TS0lQX0UgOiAtMyxcbiAgICAgICAgSlNfU0tJUF9MIDogLTQsXG4gICAgICAgIElOSVQgICAgICA6IC01LFxuICAgICAgICBTS0lQICAgICAgOiAtNlxuICAgIH1cblxuLy8gZm9yY2UgbGF5b3V0IGJlZm9yZSB0cmlnZ2VyaW5nIHRyYW5zaXRpb25zL2FuaW1hdGlvbnNcbmJhdGNoZXIuX3ByZUZsdXNoID0gZnVuY3Rpb24gKCkge1xuICAgIC8qIGpzaGludCB1bnVzZWQ6IGZhbHNlICovXG4gICAgdmFyIGYgPSBkb2N1bWVudC5ib2R5Lm9mZnNldEhlaWdodFxufVxuXG4vKipcbiAqICBzdGFnZTpcbiAqICAgIDEgPSBlbnRlclxuICogICAgMiA9IGxlYXZlXG4gKi9cbnZhciB0cmFuc2l0aW9uID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZWwsIHN0YWdlLCBjYiwgY29tcGlsZXIpIHtcblxuICAgIHZhciBjaGFuZ2VTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2IoKVxuICAgICAgICBjb21waWxlci5leGVjSG9vayhzdGFnZSA+IDAgPyAnYXR0YWNoZWQnIDogJ2RldGFjaGVkJylcbiAgICB9XG5cbiAgICBpZiAoY29tcGlsZXIuaW5pdCkge1xuICAgICAgICBjaGFuZ2VTdGF0ZSgpXG4gICAgICAgIHJldHVybiBjb2Rlcy5JTklUXG4gICAgfVxuXG4gICAgdmFyIGhhc1RyYW5zaXRpb24gPSBlbC52dWVfdHJhbnMgPT09ICcnLFxuICAgICAgICBoYXNBbmltYXRpb24gID0gZWwudnVlX2FuaW0gPT09ICcnLFxuICAgICAgICBlZmZlY3RJZCAgICAgID0gZWwudnVlX2VmZmVjdFxuXG4gICAgaWYgKGVmZmVjdElkKSB7XG4gICAgICAgIHJldHVybiBhcHBseVRyYW5zaXRpb25GdW5jdGlvbnMoXG4gICAgICAgICAgICBlbCxcbiAgICAgICAgICAgIHN0YWdlLFxuICAgICAgICAgICAgY2hhbmdlU3RhdGUsXG4gICAgICAgICAgICBlZmZlY3RJZCxcbiAgICAgICAgICAgIGNvbXBpbGVyXG4gICAgICAgIClcbiAgICB9IGVsc2UgaWYgKGhhc1RyYW5zaXRpb24gfHwgaGFzQW5pbWF0aW9uKSB7XG4gICAgICAgIHJldHVybiBhcHBseVRyYW5zaXRpb25DbGFzcyhcbiAgICAgICAgICAgIGVsLFxuICAgICAgICAgICAgc3RhZ2UsXG4gICAgICAgICAgICBjaGFuZ2VTdGF0ZSxcbiAgICAgICAgICAgIGhhc0FuaW1hdGlvblxuICAgICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2hhbmdlU3RhdGUoKVxuICAgICAgICByZXR1cm4gY29kZXMuU0tJUFxuICAgIH1cblxufVxuXG4vKipcbiAqICBUb2dnZ2xlIGEgQ1NTIGNsYXNzIHRvIHRyaWdnZXIgdHJhbnNpdGlvblxuICovXG5mdW5jdGlvbiBhcHBseVRyYW5zaXRpb25DbGFzcyAoZWwsIHN0YWdlLCBjaGFuZ2VTdGF0ZSwgaGFzQW5pbWF0aW9uKSB7XG5cbiAgICBpZiAoIWVuZEV2ZW50cy50cmFucykge1xuICAgICAgICBjaGFuZ2VTdGF0ZSgpXG4gICAgICAgIHJldHVybiBjb2Rlcy5DU1NfU0tJUFxuICAgIH1cblxuICAgIC8vIGlmIHRoZSBicm93c2VyIHN1cHBvcnRzIHRyYW5zaXRpb24sXG4gICAgLy8gaXQgbXVzdCBoYXZlIGNsYXNzTGlzdC4uLlxuICAgIHZhciBvbkVuZCxcbiAgICAgICAgY2xhc3NMaXN0ICAgICAgICA9IGVsLmNsYXNzTGlzdCxcbiAgICAgICAgZXhpc3RpbmdDYWxsYmFjayA9IGVsLnZ1ZV90cmFuc19jYixcbiAgICAgICAgZW50ZXJDbGFzcyAgICAgICA9IGNvbmZpZy5lbnRlckNsYXNzLFxuICAgICAgICBsZWF2ZUNsYXNzICAgICAgID0gY29uZmlnLmxlYXZlQ2xhc3MsXG4gICAgICAgIGVuZEV2ZW50ICAgICAgICAgPSBoYXNBbmltYXRpb24gPyBlbmRFdmVudHMuYW5pbSA6IGVuZEV2ZW50cy50cmFuc1xuXG4gICAgLy8gY2FuY2VsIHVuZmluaXNoZWQgY2FsbGJhY2tzIGFuZCBqb2JzXG4gICAgaWYgKGV4aXN0aW5nQ2FsbGJhY2spIHtcbiAgICAgICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihlbmRFdmVudCwgZXhpc3RpbmdDYWxsYmFjaylcbiAgICAgICAgY2xhc3NMaXN0LnJlbW92ZShlbnRlckNsYXNzKVxuICAgICAgICBjbGFzc0xpc3QucmVtb3ZlKGxlYXZlQ2xhc3MpXG4gICAgICAgIGVsLnZ1ZV90cmFuc19jYiA9IG51bGxcbiAgICB9XG5cbiAgICBpZiAoc3RhZ2UgPiAwKSB7IC8vIGVudGVyXG5cbiAgICAgICAgLy8gc2V0IHRvIGVudGVyIHN0YXRlIGJlZm9yZSBhcHBlbmRpbmdcbiAgICAgICAgY2xhc3NMaXN0LmFkZChlbnRlckNsYXNzKVxuICAgICAgICAvLyBhcHBlbmRcbiAgICAgICAgY2hhbmdlU3RhdGUoKVxuICAgICAgICAvLyB0cmlnZ2VyIHRyYW5zaXRpb25cbiAgICAgICAgaWYgKCFoYXNBbmltYXRpb24pIHtcbiAgICAgICAgICAgIGJhdGNoZXIucHVzaCh7XG4gICAgICAgICAgICAgICAgZXhlY3V0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc0xpc3QucmVtb3ZlKGVudGVyQ2xhc3MpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9uRW5kID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IGVsKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoZW5kRXZlbnQsIG9uRW5kKVxuICAgICAgICAgICAgICAgICAgICBlbC52dWVfdHJhbnNfY2IgPSBudWxsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTGlzdC5yZW1vdmUoZW50ZXJDbGFzcylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbC5hZGRFdmVudExpc3RlbmVyKGVuZEV2ZW50LCBvbkVuZClcbiAgICAgICAgICAgIGVsLnZ1ZV90cmFuc19jYiA9IG9uRW5kXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvZGVzLkNTU19FXG5cbiAgICB9IGVsc2UgeyAvLyBsZWF2ZVxuXG4gICAgICAgIGlmIChlbC5vZmZzZXRXaWR0aCB8fCBlbC5vZmZzZXRIZWlnaHQpIHtcbiAgICAgICAgICAgIC8vIHRyaWdnZXIgaGlkZSB0cmFuc2l0aW9uXG4gICAgICAgICAgICBjbGFzc0xpc3QuYWRkKGxlYXZlQ2xhc3MpXG4gICAgICAgICAgICBvbkVuZCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBlbCkge1xuICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGVuZEV2ZW50LCBvbkVuZClcbiAgICAgICAgICAgICAgICAgICAgZWwudnVlX3RyYW5zX2NiID0gbnVsbFxuICAgICAgICAgICAgICAgICAgICAvLyBhY3R1YWxseSByZW1vdmUgbm9kZSBoZXJlXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZVN0YXRlKClcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NMaXN0LnJlbW92ZShsZWF2ZUNsYXNzKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGF0dGFjaCB0cmFuc2l0aW9uIGVuZCBsaXN0ZW5lclxuICAgICAgICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihlbmRFdmVudCwgb25FbmQpXG4gICAgICAgICAgICBlbC52dWVfdHJhbnNfY2IgPSBvbkVuZFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZGlyZWN0bHkgcmVtb3ZlIGludmlzaWJsZSBlbGVtZW50c1xuICAgICAgICAgICAgY2hhbmdlU3RhdGUoKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb2Rlcy5DU1NfTFxuICAgICAgICBcbiAgICB9XG5cbn1cblxuZnVuY3Rpb24gYXBwbHlUcmFuc2l0aW9uRnVuY3Rpb25zIChlbCwgc3RhZ2UsIGNoYW5nZVN0YXRlLCBlZmZlY3RJZCwgY29tcGlsZXIpIHtcblxuICAgIHZhciBmdW5jcyA9IGNvbXBpbGVyLmdldE9wdGlvbignZWZmZWN0cycsIGVmZmVjdElkKVxuICAgIGlmICghZnVuY3MpIHtcbiAgICAgICAgY2hhbmdlU3RhdGUoKVxuICAgICAgICByZXR1cm4gY29kZXMuSlNfU0tJUFxuICAgIH1cblxuICAgIHZhciBlbnRlciA9IGZ1bmNzLmVudGVyLFxuICAgICAgICBsZWF2ZSA9IGZ1bmNzLmxlYXZlLFxuICAgICAgICB0aW1lb3V0cyA9IGVsLnZ1ZV90aW1lb3V0c1xuXG4gICAgLy8gY2xlYXIgcHJldmlvdXMgdGltZW91dHNcbiAgICBpZiAodGltZW91dHMpIHtcbiAgICAgICAgdmFyIGkgPSB0aW1lb3V0cy5sZW5ndGhcbiAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgY2xlYXJUTyh0aW1lb3V0c1tpXSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRpbWVvdXRzID0gZWwudnVlX3RpbWVvdXRzID0gW11cbiAgICBmdW5jdGlvbiB0aW1lb3V0IChjYiwgZGVsYXkpIHtcbiAgICAgICAgdmFyIGlkID0gc2V0VE8oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2IoKVxuICAgICAgICAgICAgdGltZW91dHMuc3BsaWNlKHRpbWVvdXRzLmluZGV4T2YoaWQpLCAxKVxuICAgICAgICAgICAgaWYgKCF0aW1lb3V0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBlbC52dWVfdGltZW91dHMgPSBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGRlbGF5KVxuICAgICAgICB0aW1lb3V0cy5wdXNoKGlkKVxuICAgIH1cblxuICAgIGlmIChzdGFnZSA+IDApIHsgLy8gZW50ZXJcbiAgICAgICAgaWYgKHR5cGVvZiBlbnRlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2hhbmdlU3RhdGUoKVxuICAgICAgICAgICAgcmV0dXJuIGNvZGVzLkpTX1NLSVBfRVxuICAgICAgICB9XG4gICAgICAgIGVudGVyKGVsLCBjaGFuZ2VTdGF0ZSwgdGltZW91dClcbiAgICAgICAgcmV0dXJuIGNvZGVzLkpTX0VcbiAgICB9IGVsc2UgeyAvLyBsZWF2ZVxuICAgICAgICBpZiAodHlwZW9mIGxlYXZlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjaGFuZ2VTdGF0ZSgpXG4gICAgICAgICAgICByZXR1cm4gY29kZXMuSlNfU0tJUF9MXG4gICAgICAgIH1cbiAgICAgICAgbGVhdmUoZWwsIGNoYW5nZVN0YXRlLCB0aW1lb3V0KVxuICAgICAgICByZXR1cm4gY29kZXMuSlNfTFxuICAgIH1cblxufVxuXG4vKipcbiAqICBTbmlmZiBwcm9wZXIgdHJhbnNpdGlvbiBlbmQgZXZlbnQgbmFtZVxuICovXG5mdW5jdGlvbiBzbmlmZkVuZEV2ZW50cyAoKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndnVlJyksXG4gICAgICAgIGRlZmF1bHRFdmVudCA9ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAgICAgZXZlbnRzID0ge1xuICAgICAgICAgICAgJ3dlYmtpdFRyYW5zaXRpb24nIDogJ3dlYmtpdFRyYW5zaXRpb25FbmQnLFxuICAgICAgICAgICAgJ3RyYW5zaXRpb24nICAgICAgIDogZGVmYXVsdEV2ZW50LFxuICAgICAgICAgICAgJ21velRyYW5zaXRpb24nICAgIDogZGVmYXVsdEV2ZW50XG4gICAgICAgIH0sXG4gICAgICAgIHJldCA9IHt9XG4gICAgZm9yICh2YXIgbmFtZSBpbiBldmVudHMpIHtcbiAgICAgICAgaWYgKGVsLnN0eWxlW25hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldC50cmFucyA9IGV2ZW50c1tuYW1lXVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXQuYW5pbSA9IGVsLnN0eWxlLmFuaW1hdGlvbiA9PT0gJydcbiAgICAgICAgPyAnYW5pbWF0aW9uZW5kJ1xuICAgICAgICA6ICd3ZWJraXRBbmltYXRpb25FbmQnXG4gICAgcmV0dXJuIHJldFxufVxuXG4vLyBFeHBvc2Ugc29tZSBzdHVmZiBmb3IgdGVzdGluZyBwdXJwb3Nlc1xudHJhbnNpdGlvbi5jb2RlcyA9IGNvZGVzXG50cmFuc2l0aW9uLnNuaWZmID0gc25pZmZFbmRFdmVudHMiLCJ2YXIgY29uZmlnICAgICAgID0gcmVxdWlyZSgnLi9jb25maWcnKSxcbiAgICB0b1N0cmluZyAgICAgPSAoe30pLnRvU3RyaW5nLFxuICAgIHdpbiAgICAgICAgICA9IHdpbmRvdyxcbiAgICBjb25zb2xlICAgICAgPSB3aW4uY29uc29sZSxcbiAgICBkZWYgICAgICAgICAgPSBPYmplY3QuZGVmaW5lUHJvcGVydHksXG4gICAgT0JKRUNUICAgICAgID0gJ29iamVjdCcsXG4gICAgVEhJU19SRSAgICAgID0gL1teXFx3XXRoaXNbXlxcd10vLFxuICAgIEJSQUNLRVRfUkVfUyA9IC9cXFsnKFteJ10rKSdcXF0vZyxcbiAgICBCUkFDS0VUX1JFX0QgPSAvXFxbXCIoW15cIl0rKVwiXFxdL2csXG4gICAgaGFzQ2xhc3NMaXN0ID0gJ2NsYXNzTGlzdCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICAgIFZpZXdNb2RlbCAvLyBsYXRlIGRlZlxuXG52YXIgZGVmZXIgPVxuICAgIHdpbi5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICB3aW4ud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgd2luLnNldFRpbWVvdXRcblxuLyoqXG4gKiAgTm9ybWFsaXplIGtleXBhdGggd2l0aCBwb3NzaWJsZSBicmFja2V0cyBpbnRvIGRvdCBub3RhdGlvbnNcbiAqL1xuZnVuY3Rpb24gbm9ybWFsaXplS2V5cGF0aCAoa2V5KSB7XG4gICAgcmV0dXJuIGtleS5pbmRleE9mKCdbJykgPCAwXG4gICAgICAgID8ga2V5XG4gICAgICAgIDoga2V5LnJlcGxhY2UoQlJBQ0tFVF9SRV9TLCAnLiQxJylcbiAgICAgICAgICAgICAucmVwbGFjZShCUkFDS0VUX1JFX0QsICcuJDEnKVxufVxuXG52YXIgdXRpbHMgPSBtb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIC8qKlxuICAgICAqICBDb252ZXJ0IGEgc3RyaW5nIHRlbXBsYXRlIHRvIGEgZG9tIGZyYWdtZW50XG4gICAgICovXG4gICAgdG9GcmFnbWVudDogcmVxdWlyZSgnLi9mcmFnbWVudCcpLFxuXG4gICAgLyoqXG4gICAgICogIFBhcnNlIHRoZSB2YXJpb3VzIHR5cGVzIG9mIHRlbXBsYXRlIG9wdGlvbnNcbiAgICAgKi9cbiAgICBwYXJzZVRlbXBsYXRlT3B0aW9uOiByZXF1aXJlKCcuL3RlbXBsYXRlLXBhcnNlci5qcycpLFxuXG4gICAgLyoqXG4gICAgICogIGdldCBhIHZhbHVlIGZyb20gYW4gb2JqZWN0IGtleXBhdGhcbiAgICAgKi9cbiAgICBnZXQ6IGZ1bmN0aW9uIChvYmosIGtleSkge1xuICAgICAgICAvKiBqc2hpbnQgZXFlcWVxOiBmYWxzZSAqL1xuICAgICAgICBrZXkgPSBub3JtYWxpemVLZXlwYXRoKGtleSlcbiAgICAgICAgaWYgKGtleS5pbmRleE9mKCcuJykgPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JqW2tleV1cbiAgICAgICAgfVxuICAgICAgICB2YXIgcGF0aCA9IGtleS5zcGxpdCgnLicpLFxuICAgICAgICAgICAgZCA9IC0xLCBsID0gcGF0aC5sZW5ndGhcbiAgICAgICAgd2hpbGUgKCsrZCA8IGwgJiYgb2JqICE9IG51bGwpIHtcbiAgICAgICAgICAgIG9iaiA9IG9ialtwYXRoW2RdXVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYmpcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIHNldCBhIHZhbHVlIHRvIGFuIG9iamVjdCBrZXlwYXRoXG4gICAgICovXG4gICAgc2V0OiBmdW5jdGlvbiAob2JqLCBrZXksIHZhbCkge1xuICAgICAgICAvKiBqc2hpbnQgZXFlcWVxOiBmYWxzZSAqL1xuICAgICAgICBrZXkgPSBub3JtYWxpemVLZXlwYXRoKGtleSlcbiAgICAgICAgaWYgKGtleS5pbmRleE9mKCcuJykgPCAwKSB7XG4gICAgICAgICAgICBvYmpba2V5XSA9IHZhbFxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhdGggPSBrZXkuc3BsaXQoJy4nKSxcbiAgICAgICAgICAgIGQgPSAtMSwgbCA9IHBhdGgubGVuZ3RoIC0gMVxuICAgICAgICB3aGlsZSAoKytkIDwgbCkge1xuICAgICAgICAgICAgaWYgKG9ialtwYXRoW2RdXSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgb2JqW3BhdGhbZF1dID0ge31cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9iaiA9IG9ialtwYXRoW2RdXVxuICAgICAgICB9XG4gICAgICAgIG9ialtwYXRoW2RdXSA9IHZhbFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgcmV0dXJuIHRoZSBiYXNlIHNlZ21lbnQgb2YgYSBrZXlwYXRoXG4gICAgICovXG4gICAgYmFzZUtleTogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5LmluZGV4T2YoJy4nKSA+IDBcbiAgICAgICAgICAgID8ga2V5LnNwbGl0KCcuJylbMF1cbiAgICAgICAgICAgIDoga2V5XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBDcmVhdGUgYSBwcm90b3R5cGUtbGVzcyBvYmplY3RcbiAgICAgKiAgd2hpY2ggaXMgYSBiZXR0ZXIgaGFzaC9tYXBcbiAgICAgKi9cbiAgICBoYXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QuY3JlYXRlKG51bGwpXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBnZXQgYW4gYXR0cmlidXRlIGFuZCByZW1vdmUgaXQuXG4gICAgICovXG4gICAgYXR0cjogZnVuY3Rpb24gKGVsLCB0eXBlKSB7XG4gICAgICAgIHZhciBhdHRyID0gY29uZmlnLnByZWZpeCArICctJyArIHR5cGUsXG4gICAgICAgICAgICB2YWwgPSBlbC5nZXRBdHRyaWJ1dGUoYXR0cilcbiAgICAgICAgaWYgKHZhbCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgRGVmaW5lIGFuIGllbnVtZXJhYmxlIHByb3BlcnR5XG4gICAgICogIFRoaXMgYXZvaWRzIGl0IGJlaW5nIGluY2x1ZGVkIGluIEpTT04uc3RyaW5naWZ5XG4gICAgICogIG9yIGZvci4uLmluIGxvb3BzLlxuICAgICAqL1xuICAgIGRlZlByb3RlY3RlZDogZnVuY3Rpb24gKG9iaiwga2V5LCB2YWwsIGVudW1lcmFibGUsIHdyaXRhYmxlKSB7XG4gICAgICAgIGRlZihvYmosIGtleSwge1xuICAgICAgICAgICAgdmFsdWUgICAgICAgIDogdmFsLFxuICAgICAgICAgICAgZW51bWVyYWJsZSAgIDogZW51bWVyYWJsZSxcbiAgICAgICAgICAgIHdyaXRhYmxlICAgICA6IHdyaXRhYmxlLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlIDogdHJ1ZVxuICAgICAgICB9KVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgQSBsZXNzIGJ1bGxldC1wcm9vZiBidXQgbW9yZSBlZmZpY2llbnQgdHlwZSBjaGVja1xuICAgICAqICB0aGFuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdcbiAgICAgKi9cbiAgICBpc09iamVjdDogZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gT0JKRUNUICYmIG9iaiAmJiAhQXJyYXkuaXNBcnJheShvYmopXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBBIG1vcmUgYWNjdXJhdGUgYnV0IGxlc3MgZWZmaWNpZW50IHR5cGUgY2hlY2tcbiAgICAgKi9cbiAgICBpc1RydWVPYmplY3Q6IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgT2JqZWN0XSdcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIE1vc3Qgc2ltcGxlIGJpbmRcbiAgICAgKiAgZW5vdWdoIGZvciB0aGUgdXNlY2FzZSBhbmQgZmFzdCB0aGFuIG5hdGl2ZSBiaW5kKClcbiAgICAgKi9cbiAgICBiaW5kOiBmdW5jdGlvbiAoZm4sIGN0eCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGFyZykge1xuICAgICAgICAgICAgcmV0dXJuIGZuLmNhbGwoY3R4LCBhcmcpXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIE1ha2Ugc3VyZSBudWxsIGFuZCB1bmRlZmluZWQgb3V0cHV0IGVtcHR5IHN0cmluZ1xuICAgICAqL1xuICAgIGd1YXJkOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLyoganNoaW50IGVxZXFlcTogZmFsc2UsIGVxbnVsbDogdHJ1ZSAqL1xuICAgICAgICByZXR1cm4gdmFsdWUgPT0gbnVsbFxuICAgICAgICAgICAgPyAnJ1xuICAgICAgICAgICAgOiAodHlwZW9mIHZhbHVlID09ICdvYmplY3QnKVxuICAgICAgICAgICAgICAgID8gSlNPTi5zdHJpbmdpZnkodmFsdWUpXG4gICAgICAgICAgICAgICAgOiB2YWx1ZVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgV2hlbiBzZXR0aW5nIHZhbHVlIG9uIHRoZSBWTSwgcGFyc2UgcG9zc2libGUgbnVtYmVyc1xuICAgICAqL1xuICAgIGNoZWNrTnVtYmVyOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IG51bGwgfHwgdHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicpXG4gICAgICAgICAgICA/IHZhbHVlXG4gICAgICAgICAgICA6IE51bWJlcih2YWx1ZSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIHNpbXBsZSBleHRlbmRcbiAgICAgKi9cbiAgICBleHRlbmQ6IGZ1bmN0aW9uIChvYmosIGV4dCkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gZXh0KSB7XG4gICAgICAgICAgICBpZiAob2JqW2tleV0gIT09IGV4dFtrZXldKSB7XG4gICAgICAgICAgICAgICAgb2JqW2tleV0gPSBleHRba2V5XVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYmpcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIGZpbHRlciBhbiBhcnJheSB3aXRoIGR1cGxpY2F0ZXMgaW50byB1bmlxdWVzXG4gICAgICovXG4gICAgdW5pcXVlOiBmdW5jdGlvbiAoYXJyKSB7XG4gICAgICAgIHZhciBoYXNoID0gdXRpbHMuaGFzaCgpLFxuICAgICAgICAgICAgaSA9IGFyci5sZW5ndGgsXG4gICAgICAgICAgICBrZXksIHJlcyA9IFtdXG4gICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgIGtleSA9IGFycltpXVxuICAgICAgICAgICAgaWYgKGhhc2hba2V5XSkgY29udGludWVcbiAgICAgICAgICAgIGhhc2hba2V5XSA9IDFcbiAgICAgICAgICAgIHJlcy5wdXNoKGtleSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBDb252ZXJ0IHRoZSBvYmplY3QgdG8gYSBWaWV3TW9kZWwgY29uc3RydWN0b3JcbiAgICAgKiAgaWYgaXQgaXMgbm90IGFscmVhZHkgb25lXG4gICAgICovXG4gICAgdG9Db25zdHJ1Y3RvcjogZnVuY3Rpb24gKG9iaikge1xuICAgICAgICBWaWV3TW9kZWwgPSBWaWV3TW9kZWwgfHwgcmVxdWlyZSgnLi92aWV3bW9kZWwnKVxuICAgICAgICByZXR1cm4gdXRpbHMuaXNPYmplY3Qob2JqKVxuICAgICAgICAgICAgPyBWaWV3TW9kZWwuZXh0ZW5kKG9iailcbiAgICAgICAgICAgIDogdHlwZW9mIG9iaiA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgICAgICAgICAgID8gb2JqXG4gICAgICAgICAgICAgICAgOiBudWxsXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBDaGVjayBpZiBhIGZpbHRlciBmdW5jdGlvbiBjb250YWlucyByZWZlcmVuY2VzIHRvIGB0aGlzYFxuICAgICAqICBJZiB5ZXMsIG1hcmsgaXQgYXMgYSBjb21wdXRlZCBmaWx0ZXIuXG4gICAgICovXG4gICAgY2hlY2tGaWx0ZXI6IGZ1bmN0aW9uIChmaWx0ZXIpIHtcbiAgICAgICAgaWYgKFRISVNfUkUudGVzdChmaWx0ZXIudG9TdHJpbmcoKSkpIHtcbiAgICAgICAgICAgIGZpbHRlci5jb21wdXRlZCA9IHRydWVcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgY29udmVydCBjZXJ0YWluIG9wdGlvbiB2YWx1ZXMgdG8gdGhlIGRlc2lyZWQgZm9ybWF0LlxuICAgICAqL1xuICAgIHByb2Nlc3NPcHRpb25zOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICB2YXIgY29tcG9uZW50cyA9IG9wdGlvbnMuY29tcG9uZW50cyxcbiAgICAgICAgICAgIHBhcnRpYWxzICAgPSBvcHRpb25zLnBhcnRpYWxzLFxuICAgICAgICAgICAgdGVtcGxhdGUgICA9IG9wdGlvbnMudGVtcGxhdGUsXG4gICAgICAgICAgICBmaWx0ZXJzICAgID0gb3B0aW9ucy5maWx0ZXJzLFxuICAgICAgICAgICAga2V5XG4gICAgICAgIGlmIChjb21wb25lbnRzKSB7XG4gICAgICAgICAgICBmb3IgKGtleSBpbiBjb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50c1trZXldID0gdXRpbHMudG9Db25zdHJ1Y3Rvcihjb21wb25lbnRzW2tleV0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhcnRpYWxzKSB7XG4gICAgICAgICAgICBmb3IgKGtleSBpbiBwYXJ0aWFscykge1xuICAgICAgICAgICAgICAgIHBhcnRpYWxzW2tleV0gPSB1dGlscy5wYXJzZVRlbXBsYXRlT3B0aW9uKHBhcnRpYWxzW2tleV0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpbHRlcnMpIHtcbiAgICAgICAgICAgIGZvciAoa2V5IGluIGZpbHRlcnMpIHtcbiAgICAgICAgICAgICAgICB1dGlscy5jaGVja0ZpbHRlcihmaWx0ZXJzW2tleV0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgICAgICBvcHRpb25zLnRlbXBsYXRlID0gdXRpbHMucGFyc2VUZW1wbGF0ZU9wdGlvbih0ZW1wbGF0ZSlcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgdXNlZCB0byBkZWZlciBiYXRjaCB1cGRhdGVzXG4gICAgICovXG4gICAgbmV4dFRpY2s6IGZ1bmN0aW9uIChjYikge1xuICAgICAgICBkZWZlcihjYiwgMClcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIGFkZCBjbGFzcyBmb3IgSUU5XG4gICAgICogIHVzZXMgY2xhc3NMaXN0IGlmIGF2YWlsYWJsZVxuICAgICAqL1xuICAgIGFkZENsYXNzOiBmdW5jdGlvbiAoZWwsIGNscykge1xuICAgICAgICBpZiAoaGFzQ2xhc3NMaXN0KSB7XG4gICAgICAgICAgICBlbC5jbGFzc0xpc3QuYWRkKGNscylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBjdXIgPSAnICcgKyBlbC5jbGFzc05hbWUgKyAnICdcbiAgICAgICAgICAgIGlmIChjdXIuaW5kZXhPZignICcgKyBjbHMgKyAnICcpIDwgMCkge1xuICAgICAgICAgICAgICAgIGVsLmNsYXNzTmFtZSA9IChjdXIgKyBjbHMpLnRyaW0oKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICByZW1vdmUgY2xhc3MgZm9yIElFOVxuICAgICAqL1xuICAgIHJlbW92ZUNsYXNzOiBmdW5jdGlvbiAoZWwsIGNscykge1xuICAgICAgICBpZiAoaGFzQ2xhc3NMaXN0KSB7XG4gICAgICAgICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKGNscylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBjdXIgPSAnICcgKyBlbC5jbGFzc05hbWUgKyAnICcsXG4gICAgICAgICAgICAgICAgdGFyID0gJyAnICsgY2xzICsgJyAnXG4gICAgICAgICAgICB3aGlsZSAoY3VyLmluZGV4T2YodGFyKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgY3VyID0gY3VyLnJlcGxhY2UodGFyLCAnICcpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbC5jbGFzc05hbWUgPSBjdXIudHJpbSgpXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIENvbnZlcnQgYW4gb2JqZWN0IHRvIEFycmF5XG4gICAgICogIHVzZWQgaW4gdi1yZXBlYXQgYW5kIGFycmF5IGZpbHRlcnNcbiAgICAgKi9cbiAgICBvYmplY3RUb0FycmF5OiBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHZhciByZXMgPSBbXSwgdmFsLCBkYXRhXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgIHZhbCA9IG9ialtrZXldXG4gICAgICAgICAgICBkYXRhID0gdXRpbHMuaXNPYmplY3QodmFsKVxuICAgICAgICAgICAgICAgID8gdmFsXG4gICAgICAgICAgICAgICAgOiB7ICR2YWx1ZTogdmFsIH1cbiAgICAgICAgICAgIGRhdGEuJGtleSA9IGtleVxuICAgICAgICAgICAgcmVzLnB1c2goZGF0YSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzXG4gICAgfVxufVxuXG5lbmFibGVEZWJ1ZygpXG5mdW5jdGlvbiBlbmFibGVEZWJ1ZyAoKSB7XG4gICAgLyoqXG4gICAgICogIGxvZyBmb3IgZGVidWdnaW5nXG4gICAgICovXG4gICAgdXRpbHMubG9nID0gZnVuY3Rpb24gKG1zZykge1xuICAgICAgICBpZiAoY29uZmlnLmRlYnVnICYmIGNvbnNvbGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1zZylcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiAgd2FybmluZ3MsIHRyYWNlcyBieSBkZWZhdWx0XG4gICAgICogIGNhbiBiZSBzdXBwcmVzc2VkIGJ5IGBzaWxlbnRgIG9wdGlvbi5cbiAgICAgKi9cbiAgICB1dGlscy53YXJuID0gZnVuY3Rpb24gKG1zZykge1xuICAgICAgICBpZiAoIWNvbmZpZy5zaWxlbnQgJiYgY29uc29sZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKG1zZylcbiAgICAgICAgICAgIGlmIChjb25maWcuZGVidWcgJiYgY29uc29sZS50cmFjZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUudHJhY2UoKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSIsInZhciBDb21waWxlciAgID0gcmVxdWlyZSgnLi9jb21waWxlcicpLFxuICAgIHV0aWxzICAgICAgPSByZXF1aXJlKCcuL3V0aWxzJyksXG4gICAgdHJhbnNpdGlvbiA9IHJlcXVpcmUoJy4vdHJhbnNpdGlvbicpLFxuICAgIEJhdGNoZXIgICAgPSByZXF1aXJlKCcuL2JhdGNoZXInKSxcbiAgICBzbGljZSAgICAgID0gW10uc2xpY2UsXG4gICAgZGVmICAgICAgICA9IHV0aWxzLmRlZlByb3RlY3RlZCxcbiAgICBuZXh0VGljayAgID0gdXRpbHMubmV4dFRpY2ssXG5cbiAgICAvLyBiYXRjaCAkd2F0Y2ggY2FsbGJhY2tzXG4gICAgd2F0Y2hlckJhdGNoZXIgPSBuZXcgQmF0Y2hlcigpLFxuICAgIHdhdGNoZXJJZCAgICAgID0gMVxuXG4vKipcbiAqICBWaWV3TW9kZWwgZXhwb3NlZCB0byB0aGUgdXNlciB0aGF0IGhvbGRzIGRhdGEsXG4gKiAgY29tcHV0ZWQgcHJvcGVydGllcywgZXZlbnQgaGFuZGxlcnNcbiAqICBhbmQgYSBmZXcgcmVzZXJ2ZWQgbWV0aG9kc1xuICovXG5mdW5jdGlvbiBWaWV3TW9kZWwgKG9wdGlvbnMpIHtcbiAgICAvLyBjb21waWxlIGlmIG9wdGlvbnMgcGFzc2VkLCBpZiBmYWxzZSByZXR1cm4uIG9wdGlvbnMgYXJlIHBhc3NlZCBkaXJlY3RseSB0byBjb21waWxlclxuICAgIGlmIChvcHRpb25zID09PSBmYWxzZSkgcmV0dXJuXG4gICAgbmV3IENvbXBpbGVyKHRoaXMsIG9wdGlvbnMpXG59XG5cbi8vIEFsbCBWTSBwcm90b3R5cGUgbWV0aG9kcyBhcmUgaW5lbnVtZXJhYmxlXG4vLyBzbyBpdCBjYW4gYmUgc3RyaW5naWZpZWQvbG9vcGVkIHRocm91Z2ggYXMgcmF3IGRhdGFcbnZhciBWTVByb3RvID0gVmlld01vZGVsLnByb3RvdHlwZVxuXG4vKipcbiAqICBpbml0IGFsbG93cyBjb25maWcgY29tcGlsYXRpb24gYWZ0ZXIgaW5zdGFudGlhdGlvbjpcbiAqICAgIHZhciBhID0gbmV3IFZ1ZShmYWxzZSlcbiAqICAgIGEuaW5pdChjb25maWcpXG4gKi9cbmRlZihWTVByb3RvLCAnJGluaXQnLCBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIG5ldyBDb21waWxlcih0aGlzLCBvcHRpb25zKVxufSlcblxuLyoqXG4gKiAgQ29udmVuaWVuY2UgZnVuY3Rpb24gdG8gZ2V0IGEgdmFsdWUgZnJvbVxuICogIGEga2V5cGF0aFxuICovXG5kZWYoVk1Qcm90bywgJyRnZXQnLCBmdW5jdGlvbiAoa2V5KSB7XG4gICAgdmFyIHZhbCA9IHV0aWxzLmdldCh0aGlzLCBrZXkpXG4gICAgcmV0dXJuIHZhbCA9PT0gdW5kZWZpbmVkICYmIHRoaXMuJHBhcmVudFxuICAgICAgICA/IHRoaXMuJHBhcmVudC4kZ2V0KGtleSlcbiAgICAgICAgOiB2YWxcbn0pXG5cbi8qKlxuICogIENvbnZlbmllbmNlIGZ1bmN0aW9uIHRvIHNldCBhbiBhY3R1YWwgbmVzdGVkIHZhbHVlXG4gKiAgZnJvbSBhIGZsYXQga2V5IHN0cmluZy4gVXNlZCBpbiBkaXJlY3RpdmVzLlxuICovXG5kZWYoVk1Qcm90bywgJyRzZXQnLCBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgIHV0aWxzLnNldCh0aGlzLCBrZXksIHZhbHVlKVxufSlcblxuLyoqXG4gKiAgd2F0Y2ggYSBrZXkgb24gdGhlIHZpZXdtb2RlbCBmb3IgY2hhbmdlc1xuICogIGZpcmUgY2FsbGJhY2sgd2l0aCBuZXcgdmFsdWVcbiAqL1xuZGVmKFZNUHJvdG8sICckd2F0Y2gnLCBmdW5jdGlvbiAoa2V5LCBjYWxsYmFjaykge1xuICAgIC8vIHNhdmUgYSB1bmlxdWUgaWQgZm9yIGVhY2ggd2F0Y2hlclxuICAgIHZhciBpZCA9IHdhdGNoZXJJZCsrLFxuICAgICAgICBzZWxmID0gdGhpc1xuICAgIGZ1bmN0aW9uIG9uICgpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICAgICAgd2F0Y2hlckJhdGNoZXIucHVzaCh7XG4gICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICBvdmVycmlkZTogdHJ1ZSxcbiAgICAgICAgICAgIGV4ZWN1dGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShzZWxmLCBhcmdzKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cbiAgICBjYWxsYmFjay5fZm4gPSBvblxuICAgIHNlbGYuJGNvbXBpbGVyLm9ic2VydmVyLm9uKCdjaGFuZ2U6JyArIGtleSwgb24pXG59KVxuXG4vKipcbiAqICB1bndhdGNoIGEga2V5XG4gKi9cbmRlZihWTVByb3RvLCAnJHVud2F0Y2gnLCBmdW5jdGlvbiAoa2V5LCBjYWxsYmFjaykge1xuICAgIC8vIHdvcmthcm91bmQgaGVyZVxuICAgIC8vIHNpbmNlIHRoZSBlbWl0dGVyIG1vZHVsZSBjaGVja3MgY2FsbGJhY2sgZXhpc3RlbmNlXG4gICAgLy8gYnkgY2hlY2tpbmcgdGhlIGxlbmd0aCBvZiBhcmd1bWVudHNcbiAgICB2YXIgYXJncyA9IFsnY2hhbmdlOicgKyBrZXldLFxuICAgICAgICBvYiA9IHRoaXMuJGNvbXBpbGVyLm9ic2VydmVyXG4gICAgaWYgKGNhbGxiYWNrKSBhcmdzLnB1c2goY2FsbGJhY2suX2ZuKVxuICAgIG9iLm9mZi5hcHBseShvYiwgYXJncylcbn0pXG5cbi8qKlxuICogIHVuYmluZCBldmVyeXRoaW5nLCByZW1vdmUgZXZlcnl0aGluZ1xuICovXG5kZWYoVk1Qcm90bywgJyRkZXN0cm95JywgZnVuY3Rpb24gKG5vUmVtb3ZlKSB7XG4gICAgdGhpcy4kY29tcGlsZXIuZGVzdHJveShub1JlbW92ZSlcbn0pXG5cbi8qKlxuICogIGJyb2FkY2FzdCBhbiBldmVudCB0byBhbGwgY2hpbGQgVk1zIHJlY3Vyc2l2ZWx5LlxuICovXG5kZWYoVk1Qcm90bywgJyRicm9hZGNhc3QnLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNoaWxkcmVuID0gdGhpcy4kY29tcGlsZXIuY2hpbGRyZW4sXG4gICAgICAgIGkgPSBjaGlsZHJlbi5sZW5ndGgsXG4gICAgICAgIGNoaWxkXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgIGNoaWxkLmVtaXR0ZXIuYXBwbHlFbWl0LmFwcGx5KGNoaWxkLmVtaXR0ZXIsIGFyZ3VtZW50cylcbiAgICAgICAgY2hpbGQudm0uJGJyb2FkY2FzdC5hcHBseShjaGlsZC52bSwgYXJndW1lbnRzKVxuICAgIH1cbn0pXG5cbi8qKlxuICogIGVtaXQgYW4gZXZlbnQgdGhhdCBwcm9wYWdhdGVzIGFsbCB0aGUgd2F5IHVwIHRvIHBhcmVudCBWTXMuXG4gKi9cbmRlZihWTVByb3RvLCAnJGRpc3BhdGNoJywgZnVuY3Rpb24gKCkge1xuICAgIHZhciBjb21waWxlciA9IHRoaXMuJGNvbXBpbGVyLFxuICAgICAgICBlbWl0dGVyID0gY29tcGlsZXIuZW1pdHRlcixcbiAgICAgICAgcGFyZW50ID0gY29tcGlsZXIucGFyZW50XG4gICAgZW1pdHRlci5hcHBseUVtaXQuYXBwbHkoZW1pdHRlciwgYXJndW1lbnRzKVxuICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgcGFyZW50LnZtLiRkaXNwYXRjaC5hcHBseShwYXJlbnQudm0sIGFyZ3VtZW50cylcbiAgICB9XG59KVxuXG4vKipcbiAqICBkZWxlZ2F0ZSBvbi9vZmYvb25jZSB0byB0aGUgY29tcGlsZXIncyBlbWl0dGVyXG4gKi9cbjtbJ2VtaXQnLCAnb24nLCAnb2ZmJywgJ29uY2UnXS5mb3JFYWNoKGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICAvLyBpbnRlcm5hbCBlbWl0IGhhcyBmaXhlZCBudW1iZXIgb2YgYXJndW1lbnRzLlxuICAgIC8vIGV4cG9zZWQgZW1pdCB1c2VzIHRoZSBleHRlcm5hbCB2ZXJzaW9uXG4gICAgLy8gd2l0aCBmbi5hcHBseS5cbiAgICB2YXIgcmVhbE1ldGhvZCA9IG1ldGhvZCA9PT0gJ2VtaXQnXG4gICAgICAgID8gJ2FwcGx5RW1pdCdcbiAgICAgICAgOiBtZXRob2RcbiAgICBkZWYoVk1Qcm90bywgJyQnICsgbWV0aG9kLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlbWl0dGVyID0gdGhpcy4kY29tcGlsZXIuZW1pdHRlclxuICAgICAgICBlbWl0dGVyW3JlYWxNZXRob2RdLmFwcGx5KGVtaXR0ZXIsIGFyZ3VtZW50cylcbiAgICB9KVxufSlcblxuLy8gRE9NIGNvbnZlbmllbmNlIG1ldGhvZHNcblxuZGVmKFZNUHJvdG8sICckYXBwZW5kVG8nLCBmdW5jdGlvbiAodGFyZ2V0LCBjYikge1xuICAgIHRhcmdldCA9IHF1ZXJ5KHRhcmdldClcbiAgICB2YXIgZWwgPSB0aGlzLiRlbFxuICAgIHRyYW5zaXRpb24oZWwsIDEsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGFyZ2V0LmFwcGVuZENoaWxkKGVsKVxuICAgICAgICBpZiAoY2IpIG5leHRUaWNrKGNiKVxuICAgIH0sIHRoaXMuJGNvbXBpbGVyKVxufSlcblxuZGVmKFZNUHJvdG8sICckcmVtb3ZlJywgZnVuY3Rpb24gKGNiKSB7XG4gICAgdmFyIGVsID0gdGhpcy4kZWxcbiAgICB0cmFuc2l0aW9uKGVsLCAtMSwgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoZWwucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbClcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2IpIG5leHRUaWNrKGNiKVxuICAgIH0sIHRoaXMuJGNvbXBpbGVyKVxufSlcblxuZGVmKFZNUHJvdG8sICckYmVmb3JlJywgZnVuY3Rpb24gKHRhcmdldCwgY2IpIHtcbiAgICB0YXJnZXQgPSBxdWVyeSh0YXJnZXQpXG4gICAgdmFyIGVsID0gdGhpcy4kZWxcbiAgICB0cmFuc2l0aW9uKGVsLCAxLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRhcmdldC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShlbCwgdGFyZ2V0KVxuICAgICAgICBpZiAoY2IpIG5leHRUaWNrKGNiKVxuICAgIH0sIHRoaXMuJGNvbXBpbGVyKVxufSlcblxuZGVmKFZNUHJvdG8sICckYWZ0ZXInLCBmdW5jdGlvbiAodGFyZ2V0LCBjYikge1xuICAgIHRhcmdldCA9IHF1ZXJ5KHRhcmdldClcbiAgICB2YXIgZWwgPSB0aGlzLiRlbFxuICAgIHRyYW5zaXRpb24oZWwsIDEsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRhcmdldC5uZXh0U2libGluZykge1xuICAgICAgICAgICAgdGFyZ2V0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGVsLCB0YXJnZXQubmV4dFNpYmxpbmcpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0YXJnZXQucGFyZW50Tm9kZS5hcHBlbmRDaGlsZChlbClcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2IpIG5leHRUaWNrKGNiKVxuICAgIH0sIHRoaXMuJGNvbXBpbGVyKVxufSlcblxuZnVuY3Rpb24gcXVlcnkgKGVsKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBlbCA9PT0gJ3N0cmluZydcbiAgICAgICAgPyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsKVxuICAgICAgICA6IGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gVmlld01vZGVsXG4iLCJ2YXIgY28gICAgICAgICAgICA9IHJlcXVpcmUoJ2NvJyksXG4gICAgc3RvcmFnZSAgICAgICA9IHJlcXVpcmUoJ2FzeW5jc3RvcmFnZScpLFxuICAgIHZrQXBpICAgICAgICAgPSByZXF1aXJlKCcuL2xpYi9fdmtBcGlfbW9kLmpzJyksXG4gICAgU3RhdGlvbkVuZ2luZSA9IHJlcXVpcmUoJy4vbGliL19zdGF0aW9uRW5naW5lLmpzJyksXG4gICAgYWR2aWNlRG9nICAgICA9IHJlcXVpcmUoJy4vbGliL19hZHZpY2VEb2cuanMnKTsgLy9yZWNvbW1lbmRAb3B0aW9uYXRlXG52YXIgb3duVHJhY2tzID0gUHJvbWlzZS5hbGwoW3ZrQXBpKCdhdWRpby5nZXQnLCB7Y291bnQ6IDEwMH0pXSlcbiAgICAudGhlbigoW3tpdGVtc31dKSA9PiBQcm9taXNlLnJlc29sdmUoaXRlbXMpKTtcbnZhciBNSU5fU1RBVElPTl9QT1NUX1RSQUNLX1JBVElPID0gMTsgLy9hdCBsZWFzdCAxIGF1ZGlvIGF2ZyBwZXIgcG9zdFxudmFyIE1JTl9TVEFUSU9OX01VU0lDQUxfUE9TVF9SQVRJTyA9IC41O1xudmFyIGdlbnJlQ29tcGF0aWJpbGl0eVVzZXJHcm91cHNDb3VudGVyID0gMTtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcmVnaXN0ZXJHcm91cChncm91cCwgYWRkaXRpb25hbE9wdHMsIHNlbGYsIG9wdHMgPSB7fSkge1xuICAgIGlmIChzZWxmLnN0YXRpb25zTWFwW2dyb3VwLmlkXSkgcmV0dXJuO1xuICAgIHZhciBvYmogPSBzZWxmLnN0YXRpb25zTWFwW2dyb3VwLmlkXSA9IGdldEdyb3VwT2JqKGdyb3VwLCBhZGRpdGlvbmFsT3B0cyk7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCAnX2VuZ2luZScsIHtcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICBnZXQgICAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBvYmouX2VuZ2luZTtcbiAgICAgICAgICAgIG9iai5fZW5naW5lID0gbmV3IFN0YXRpb25FbmdpbmUob2JqLnRyYWNrcywgdHJhY2sgPT4gb2JqLmN1cnJlbnRUcmFjayA9IHNlbGYuY3VycmVudFRyYWNrID0gdHJhY2spO1xuICAgICAgICAgICAgcmV0dXJuIG9iai5fZW5naW5lO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBjbyhmdW5jdGlvbiogKCkge1xuICAgICAgICB2YXIgaXNNdXNpY2FsQ2FjaGVkID0geWllbGQgc3RvcmFnZS5nZXQoJ2dyb3Vwczo6YnlJZDo6JyArIG9iai5pZCArICc6OmlzTXVzaWNhbCcpLFxuICAgICAgICAgICAgcHJpb3JpdHlJbmNyZW1lbnQgPSAwO1xuICAgICAgICBmb3IgKHZhciBsb2FkQ291bnQgb2YgKChpc011c2ljYWxDYWNoZWQgfHwgb3B0cy5hdXRvcGxheSkgPyBbNDBdIDogWzUsIDIwXSkpIHtcbiAgICAgICAgICAgIHZhciBwcmlvcml0eSA9IGdldEJvb2xQcmlvcml0eShvcHRzLmF1dG9wbGF5LCBpc011c2ljYWxDYWNoZWQsIG9iai5pc19tZW1iZXIpLFxuICAgICAgICAgICAgICAgIHBvc3RzID0geWllbGQgZ2V0R3JvdXBQb3N0cyhvYmouaWQsIGxvYWRDb3VudCwgcHJpb3JpdHkgKyBwcmlvcml0eUluY3JlbWVudCAqIDMwKSxcbiAgICAgICAgICAgICAgICBwb3N0c1dpdGhUcmFja3MgPSBwb3N0cy5maWx0ZXIocG9zdCA9PiAocG9zdC5hdHRhY2htZW50cyB8fCBbXSkuZmlsdGVyKGEgPT4gYS5hdWRpbykubGVuZ3RoKSxcbiAgICAgICAgICAgICAgICBncm91cFRyYWNrcyA9IGdldFRyYWNrc0Zyb21Qb3N0cyhwb3N0cyksXG4gICAgICAgICAgICAgICAgZ3JvdXBUYWdzID0gZ2V0VGFnc0ZvckFkdmljZURvZyhncm91cFRyYWNrcyksXG4gICAgICAgICAgICAgICAgdXNlclRyYWNrcyA9IHlpZWxkIG93blRyYWNrcyxcbiAgICAgICAgICAgICAgICB1c2VyVGFncyA9IGdldFRhZ3NGb3JBZHZpY2VEb2codXNlclRyYWNrcyksXG4gICAgICAgICAgICAgICAgaXNUcmFja0NvdW50RW5vdWdoID0gKGdyb3VwVHJhY2tzLmxlbmd0aCAvIHBvc3RzLmxlbmd0aCkgPj0gTUlOX1NUQVRJT05fUE9TVF9UUkFDS19SQVRJTyxcbiAgICAgICAgICAgICAgICBpc1Bvc3RDb3VudEVub3VnaCA9IChwb3N0c1dpdGhUcmFja3MubGVuZ3RoIC8gcG9zdHMubGVuZ3RoKSA+PSBNSU5fU1RBVElPTl9NVVNJQ0FMX1BPU1RfUkFUSU8sXG4gICAgICAgICAgICAgICAgaXNNdXNpY2FsID0gb2JqLmlzTXVzaWNhbCA9IGlzVHJhY2tDb3VudEVub3VnaCAmJiBpc1Bvc3RDb3VudEVub3VnaDtcbiAgICAgICAgICAgIGlmIChvcHRzLmF1dG9wbGF5ICYmIGdyb3VwVHJhY2tzLmxlbmd0aCA+IDUpIGlzTXVzaWNhbCA9IHRydWU7XG4gICAgICAgICAgICBpZiAoIWlzTXVzaWNhbCkgYnJlYWs7XG4gICAgICAgICAgICBwcmlvcml0eUluY3JlbWVudCsrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc011c2ljYWwpIHtcbiAgICAgICAgICAgIHZhciBnZW5yZUNvbXBhdGliaWxpdHkgPSBvYmouX29yaWdpbmFsR2VucmVDb21wYXRpYmlsaXR5ID0gb2JqLmdlbnJlQ29tcGF0aWJpbGl0eSA9XG4gICAgICAgICAgICAgICAgMSAtIGdldFNjYWxlZEFuZ2xlRm9yVmVjdG9ycyh1c2VyVGFncywgZ3JvdXBUYWdzKTtcbiAgICAgICAgICAgIGlmIChvYmouaXNfbWVtYmVyKSB7XG4gICAgICAgICAgICAgICAgYWR2aWNlRG9nKG9iai5pZCwgZ3JvdXBUYWdzLCAuOSk7XG4gICAgICAgICAgICAgICAgb2JqLmdlbnJlQ29tcGF0aWJpbGl0eSA9IDIgKyAxIC8gZ2VucmVDb21wYXRpYmlsaXR5VXNlckdyb3Vwc0NvdW50ZXIrKzsgLy9ndWFyYW50ZWVkIGZpcnN0IHBvc2l0aW9uc1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAob3B0cy5hdXRvcGxheSkge1xuICAgICAgICAgICAgICAgIC8vbm8gYWR2aWNlcyBmb3Igbm93XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgZGVmaW5pdGVseUJhZFRocmVzaG9sZCA9IC40O1xuICAgICAgICAgICAgICAgIGlmIChnZW5yZUNvbXBhdGliaWxpdHkgPj0gLjkpIHtcbiAgICAgICAgICAgICAgICAgICAgYWR2aWNlRG9nKG9iai5pZCwgZ3JvdXBUYWdzLCAuOSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlbnJlQ29tcGF0aWJpbGl0eSA9PiBvYmouZ2VucmVDb21wYXRpYmlsaXR5ID0gTWF0aC5tYXgoLjcsIGdlbnJlQ29tcGF0aWJpbGl0eSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChnZW5yZUNvbXBhdGliaWxpdHkgPCBkZWZpbml0ZWx5QmFkVGhyZXNob2xkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZHZpY2VEb2cob2JqLmlkLCBncm91cFRhZ3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5wb3coZ2VucmVDb21wYXRpYmlsaXR5IC8gZGVmaW5pdGVseUJhZFRocmVzaG9sZCwgMikgKiBkZWZpbml0ZWx5QmFkVGhyZXNob2xkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuc3RhdGlvbnNNYXBbZ3JvdXAuaWRdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuc3RhdGlvbnMuJHJlbW92ZShvYmopO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkdmljZURvZyhvYmouaWQsIGdyb3VwVGFncywgZ2VucmVDb21wYXRpYmlsaXR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdlbnJlQ29tcGF0aWJpbGl0eSA9PiBvYmouZ2VucmVDb21wYXRpYmlsaXR5ID0gTWF0aC5taW4oLjksIGdlbnJlQ29tcGF0aWJpbGl0eSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb2JqLnRyYWNrcyA9IGdyb3VwVHJhY2tzO1xuICAgICAgICAgICAgb2JqLmdlbnJlcyA9IGdyb3VwVGFncztcbiAgICAgICAgICAgIHN0b3JhZ2Uuc2V0KCdncm91cHM6OmJ5SWQ6OicgKyBvYmouaWQgKyAnOjppc011c2ljYWwnLCBpc011c2ljYWwpO1xuXG4gICAgICAgICAgICBpZiAob3B0cy5hdXRvcGxheSkge1xuICAgICAgICAgICAgICAgIHNlbGYuc3RhdGlvbnMucHVzaChvYmopO1xuICAgICAgICAgICAgICAgIHNlbGYuJGVtaXQoJ3N0YXRpb25DaGFuZ2UnLCB7c3RhdGlvbjogb2JqfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgc2hvdyhvYmopO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5zdGF0aW9uc01hcFtncm91cC5pZF0gPSB0cnVlO1xuICAgICAgICAgICAgc2VsZi5zdGF0aW9ucy4kcmVtb3ZlKG9iaik7XG4gICAgICAgIH1cbiAgICB9KCkpKCk7XG5cbiAgICBmdW5jdGlvbiBzaG93KG9iaikge1xuICAgICAgICBpZiAob2JqLl9zaG93ICE9PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICAgICAgb2JqLl9zaG93ID0gZmFsc2U7XG4gICAgICAgIHZhciBhbGJ1bUltYWdlID0gbmV3IEltYWdlKCk7XG4gICAgICAgIGFsYnVtSW1hZ2Uub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYWxidW1JbWFnZS5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgIG9iai5fc2hvdyA9IHRydWU7XG4gICAgICAgICAgICBzZWxmLnN0YXRpb25zLnB1c2gob2JqKTtcbiAgICAgICAgfTtcbiAgICAgICAgYWxidW1JbWFnZS5zcmMgPSBvYmouYXZhdGFyO1xuICAgICAgICBpZiAoYWxidW1JbWFnZS5jb21wbGV0ZSkgYWxidW1JbWFnZS5vbmxvYWQoKTtcbiAgICB9XG59O1xubW9kdWxlLmV4cG9ydHMuYmFkID0gZnVuY3Rpb24gbWFya0dyb3VwQXNCYWQob2JqKSB7XG4gICAgZ2V0R3JvdXBQb3N0cyhvYmouaWQsIDIwLCAtMjApLnRoZW4oZnVuY3Rpb24gKHBvc3RzKSB7XG4gICAgICAgIGFkdmljZURvZyhvYmouaWQsIGdldFRhZ3NGb3JBZHZpY2VEb2coZ2V0VHJhY2tzRnJvbVBvc3RzKHBvc3RzKSksIDApO1xuICAgIH0pO1xufTtcblxuZnVuY3Rpb24gZ2V0VGFnc0ZvckFkdmljZURvZyh0cmFja3MpIHtcbiAgICB2YXIgZmlsdGVyZWRUcmFja3MgPSB0cmFja3MuZmlsdGVyKCh7Z2VucmVfaWR9KSA9PiBnZW5yZV9pZCAmJiBnZW5yZV9pZCAhPSAxOCAmJiBnZW5yZV9pZCA8PSAyMik7XG4gICAgdmFyIGdlbnJlTWFwID0gZmlsdGVyZWRUcmFja3MubWFwKCh7Z2VucmVfaWR9KT0+Z2VucmVfaWQpLnJlZHVjZSgoYWNjLCBpZCk9PiAoYWNjW2lkXSA9IChhY2NbaWRdIHx8IDApICsgMSkgJiYgYWNjLCB7fSk7XG4gICAgdmFyIG91dCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDw9IDIyOyBpKyspXG4gICAgICAgIG91dFtpXSA9IChnZW5yZU1hcFtpXSB8fCAwKSAvIGZpbHRlcmVkVHJhY2tzLmxlbmd0aDtcbiAgICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBnZXRCb29sUHJpb3JpdHkoYm9vbCwgLi4uYm9vbHMpIHtcbiAgICBpZiAoYm9vbHMubGVuZ3RoID4gMCkgcmV0dXJuIGdldEJvb2xQcmlvcml0eShib29sKSArIGdldEJvb2xQcmlvcml0eShib29scy5zaGlmdCgpLCAuLi5ib29scyk7XG4gICAgaWYgKGJvb2wgPT09IGZhbHNlKSByZXR1cm4gLTEwO1xuICAgIGlmIChib29sID09PSB0cnVlKSByZXR1cm4gMTA7XG4gICAgcmV0dXJuIDA7XG59XG5cbmZ1bmN0aW9uIGdldEdyb3VwUG9zdHMoaWQsIGNvdW50ID0gMTAsIHByaW9yaXR5ID0gMCkge1xuICAgIHJldHVybiB2a0FwaSgnd2FsbC5nZXQnLCB7XG4gICAgICAgIG93bmVyX2lkOiAtaWQsXG4gICAgICAgIGNvdW50ICAgOiBNYXRoLmZsb29yKGNvdW50KVxuICAgIH0sIHByaW9yaXR5KVxuICAgICAgICAudGhlbigoe2l0ZW1zfSkgPT4gUHJvbWlzZS5yZXNvbHZlKGl0ZW1zKSk7XG59XG5cbmZ1bmN0aW9uIGdldFRyYWNrc0Zyb21Qb3N0cyhwb3N0cykge1xuICAgIHJldHVybiBwb3N0cy5tYXAoZnVuY3Rpb24gKHBvc3QpIHtcbiAgICAgICAgaWYgKCFwb3N0LmF0dGFjaG1lbnRzKSByZXR1cm4gW107XG4gICAgICAgIHJldHVybiBwb3N0LmF0dGFjaG1lbnRzLmZpbHRlcigoe2F1ZGlvfSk9PmF1ZGlvKS5tYXAoKHthdWRpb30pPT5hdWRpbykubWFwKGZ1bmN0aW9uIChhdWRpbykge1xuICAgICAgICAgICAgYXVkaW8uX3Bvc3QgPSBwb3N0O1xuICAgICAgICAgICAgYXVkaW8uYXJ0ID0gcG9zdC5hdHRhY2htZW50cy5tYXAoKHtwaG90b30pPT5waG90bykuZmlsdGVyKGE9PmEpWzBdO1xuICAgICAgICAgICAgYXVkaW8uYWRkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiBhdWRpbztcbiAgICAgICAgfSk7XG4gICAgfSkucmVkdWNlKChhLCBiKT0+YS5jb25jYXQoYiksIFtdKTtcbn1cblxuXG5mdW5jdGlvbiBnZXRTY2FsZWRBbmdsZUZvclZlY3RvcnModmVjMSwgdmVjMikgeyAvL2NvcyDOsSA9IGHCt2IgLyB8YXzCt3xifFxuICAgIHZhciBsZW5ndGggPSBNYXRoLm1heCh2ZWMxLmxlbmd0aCwgdmVjMi5sZW5ndGgpO1xuICAgIC8vdmFyIG1heFNjYWxlID0gTWF0aC5hc2luKE1hdGguY29zKDApKSAqIDI7IC8vMTgwIGRlZyBha2EgUEkgcmFkXG4gICAgdmFyIHNjYWxhck11bHRpID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKVxuICAgICAgICBzY2FsYXJNdWx0aSArPSB2ZWMxW2ldICogdmVjMltpXSB8fCAwO1xuICAgIHZhciBjb3NBbHBoYSA9IHNjYWxhck11bHRpIC8gKGdldExlbmd0aCh2ZWMxKSAqIGdldExlbmd0aCh2ZWMyKSk7XG4gICAgdmFyIGFscGhhID0gTWF0aC5hY29zKGNvc0FscGhhKTtcbiAgICByZXR1cm4gMSAtIGNvc0FscGhhO1xufVxuZnVuY3Rpb24gZ2V0TGVuZ3RoKHZlYykge1xuICAgIHZhciBuID0gdmVjLmxlbmd0aDtcbiAgICB2YXIgbGVuZ3RoID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKylcbiAgICAgICAgbGVuZ3RoICs9IE1hdGgucG93KHZlY1tpXSB8fCAwLCAyKTtcbiAgICByZXR1cm4gTWF0aC5wb3cobGVuZ3RoLCAuNSk7XG59XG5cbmZ1bmN0aW9uIGdldFRhZ3NGb3JUcmFja3ModHJhY2tMaXN0KSB7XG4gICAgdmFyIGdlbnJlX2lkcyA9IHRyYWNrTGlzdC5tYXAoZWwgPT4gZWwuZ2VucmVfaWQpLmZpbHRlcihpZCA9PiBpZCAhPT0gMTgpLmZpbHRlcihpZCA9PiBpZCk7XG4gICAgdmFyIHZlY3Rvcl9zY2FsZSA9IDIyO1xuICAgIHZhciB2ZWN0b3IgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZlY3Rvcl9zY2FsZTsgaSsrKSB7XG4gICAgICAgIHZlY3RvcltpXSA9IGdlbnJlX2lkc1xuICAgIH1cbiAgICByZXR1cm4gdHJhY2tMaXN0Lm1hcChlbCA9PiBlbC5nZW5yZV9pZCkuZmlsdGVyKGlkID0+IGlkICE9PSAxOCkuZmlsdGVyKGlkID0+IGlkKTtcbn1cblxuZnVuY3Rpb24gZ2V0VG9wVGFncyhsaXN0KSB7XG4gICAgdmFyIHRhZ3NNYXAgPSB7fSxcbiAgICAgICAgdGFncyA9IFtdO1xuICAgIGZvciAodmFyIHRhZyBvZiBsaXN0KSB7XG4gICAgICAgIGlmICh0YWdzTWFwW3RhZ10pXG4gICAgICAgICAgICB0YWdzTWFwW3RhZ10uY291bnQrKztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGFncy5wdXNoKHRhZ3NNYXBbdGFnXSA9IHtjb3VudDogMSwgbmFtZTogdGFnfSk7XG4gICAgfVxuICAgIHJldHVybiB0YWdzLnNvcnQoKGEsIGIpID0+IGIuY291bnQgLSBhLmNvdW50KS5tYXAoYSA9PiBhLm5hbWUpO1xufVxuXG5mdW5jdGlvbiBnZXRHcm91cE9iaihncm91cCwgYWRkaXRpb25hbE9wdHMpIHtcbiAgICB2YXIgb2JqID0ge1xuICAgICAgICBpZCAgICAgICAgICAgICAgICA6IGdyb3VwLmlkLFxuICAgICAgICBhdmF0YXIgICAgICAgICAgICA6IGdyb3VwLnBob3RvXzIwMCxcbiAgICAgICAgbmFtZSAgICAgICAgICAgICAgOiBncm91cC5uYW1lLFxuICAgICAgICBzY3JlZW5fbmFtZSAgICAgICA6IGdyb3VwLnNjcmVlbl9uYW1lLFxuICAgICAgICBncm91cF90eXBlICAgICAgICA6IGdyb3VwLnR5cGUsXG4gICAgICAgIGlzX21lbWJlciAgICAgICAgIDogZ3JvdXAuaXNfbWVtYmVyLFxuICAgICAgICBzaG93biAgICAgICAgICAgICA6IGZhbHNlLFxuICAgICAgICBnZW5yZUNvbXBhdGliaWxpdHk6IDBcbiAgICB9O1xuICAgIGlmIChhZGRpdGlvbmFsT3B0cyBpbnN0YW5jZW9mIE9iamVjdClcbiAgICAgICAgZm9yICh2YXIga2V5IG9mIE9iamVjdC5rZXlzKGFkZGl0aW9uYWxPcHRzKSlcbiAgICAgICAgICAgIG9ialtrZXldID0gYWRkaXRpb25hbE9wdHNba2V5XTtcbiAgICByZXR1cm4gb2JqO1xufSIsInJlcXVpcmUoJ2VzNmlmeS9ub2RlX21vZHVsZXMvdHJhY2V1ci9iaW4vdHJhY2V1ci1ydW50aW1lJyk7XG52YXIgVFdFRU4gICA9IHJlcXVpcmUoJ3R3ZWVuLmpzJyk7XG5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24gYW5pbWF0ZSh0aW1lKSB7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUsIGRvY3VtZW50LmJvZHkpO1xuICAgIFRXRUVOLnVwZGF0ZSh0aW1lKTtcbn0sIGRvY3VtZW50LmJvZHkpO1xud2luZG93LnNldEltbWVkaWF0ZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICAgICAgICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyO1xuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5cbnZhciBib2R5ID0gZG9jdW1lbnQuYm9keSxcbiAgICB0aW1lcjtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIGZ1bmN0aW9uKCkge1xuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgaWYoIWJvZHkuY2xhc3NMaXN0LmNvbnRhaW5zKCdkaXNhYmxlLWhvdmVyJykpXG4gICAgICAgIGJvZHkuY2xhc3NMaXN0LmFkZCgnZGlzYWJsZS1ob3ZlcicpO1xuICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICBib2R5LmNsYXNzTGlzdC5yZW1vdmUoJ2Rpc2FibGUtaG92ZXInKVxuICAgIH0sNTAwKTtcbn0sIGZhbHNlKTtcblxuXG5pZiAoIVN0cmluZy5wcm90b3R5cGUuc3RhcnRzV2l0aCkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTdHJpbmcucHJvdG90eXBlLCAnc3RhcnRzV2l0aCcsIHtcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIChzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSB7XG4gICAgICAgICAgICBwb3NpdGlvbiA9IHBvc2l0aW9uIHx8IDA7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYXN0SW5kZXhPZihzZWFyY2hTdHJpbmcsIHBvc2l0aW9uKSA9PT0gcG9zaXRpb247XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbmlmICghU3RyaW5nLnByb3RvdHlwZS5lbmRzV2l0aCkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTdHJpbmcucHJvdG90eXBlLCAnZW5kc1dpdGgnLCB7XG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiAoc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikge1xuICAgICAgICAgICAgdmFyIHN1YmplY3RTdHJpbmcgPSB0aGlzLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICBpZiAocG9zaXRpb24gPT09IHVuZGVmaW5lZCB8fCBwb3NpdGlvbiA+IHN1YmplY3RTdHJpbmcubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb24gPSBzdWJqZWN0U3RyaW5nLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBvc2l0aW9uIC09IHNlYXJjaFN0cmluZy5sZW5ndGg7XG4gICAgICAgICAgICB2YXIgbGFzdEluZGV4ID0gc3ViamVjdFN0cmluZy5pbmRleE9mKHNlYXJjaFN0cmluZywgcG9zaXRpb24pO1xuICAgICAgICAgICAgcmV0dXJuIGxhc3RJbmRleCAhPT0gLTEgJiYgbGFzdEluZGV4ID09PSBwb3NpdGlvbjtcbiAgICAgICAgfVxuICAgIH0pO1xufSIsInJlcXVpcmUoJy4vX3N0YXRpb24uanMnKTsiLCJ2YXIgVnVlICAgICAgICAgICA9IHJlcXVpcmUoJ3Z1ZScpLFxuICAgIHN0b3JhZ2UgICAgICAgPSByZXF1aXJlKCdhc3luY3N0b3JhZ2UnKTtcblxuXG5WdWUuY29tcG9uZW50KCdzdGF0aW9uJywge1xuICAgIGRhdGEgICAgOiB7XG4gICAgICAgIC8vaWQgICAgICAgICAgOiBudWxsLCBhdmF0YXI6IG51bGwsIG5hbWU6IG51bGwsIHNjcmVlbl9uYW1lOiBudWxsLCBncm91cF90eXBlOiBudWxsLCBpc19tZW1iZXI6IG51bGwsXG4gICAgICAgIC8vaXNNdXNpY2FsICAgOiBmYWxzZSwgZ2VucmVDb21wYXRpYmlsaXR5OiAwLFxuICAgICAgICAvL3Nob3dDb250ZW50OiBmYWxzZSxcbiAgICAgICAgY3VycmVudFRyYWNrOiBudWxsLy8sXG4gICAgICAgIC8vdHJhY2tzICAgICAgOiBbXSxcbiAgICAgICAgLy9nZW5yZXMgICAgICA6IFtdXG4gICAgfSxcbiAgICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi4vdGVtcGxhdGVzL19zdGF0aW9uLmh0bWwuamFkZScpLFxuICAgIHJlYWR5KCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIHNob3duVGltZW91dDtcbiAgICAgICAgdGhpcy4kd2F0Y2goJ3Nob3cnLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHNob3duVGltZW91dCk7XG4gICAgICAgICAgICBzaG93blRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7c2VsZi5zaG93biA9IHNlbGYuc2hvd30sIDc1MCk7XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBtZXRob2RzIDoge1xuICAgICAgICBzZXRBc0N1cnJlbnQoKSB7XG4gICAgICAgICAgICB0aGlzLiRkaXNwYXRjaCgnc3RhdGlvbkNoYW5nZScsIHtzdGF0aW9uOiB0aGlzLiRkYXRhfSk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuIiwiLy9ub2luc3BlY3Rpb24gQmFkRXhwcmVzc2lvblN0YXRlbWVudEpTXG5cInVzZSBzdHJpY3RcIjtcbnJlcXVpcmUoJy4vX3ByZXBhcmUtZW52aXJvbWVudCcpO1xucmVxdWlyZSgnLi9jb21wb25lbnRzL19pbmRleCcpO1xuXG5cbnZhciBWdWUgICAgICAgPSByZXF1aXJlKCd2dWUnKSxcbiAgICBjbyAgICAgICAgPSByZXF1aXJlKCdjbycpLFxuICAgIEdyb3VwICAgICA9IHJlcXVpcmUoJy4vX2dyb3VwJyksXG4gICAgc3RvcmFnZSAgID0gcmVxdWlyZSgnYXN5bmNzdG9yYWdlJyksXG4gICAgLy9tYkFwaSAgICAgPSByZXF1aXJlKCcuL2xpYi9fbWJBcGlfbW9kLmpzJyksXG4gICAgdmtBcGkgICAgID0gcmVxdWlyZSgnLi9saWIvX3ZrQXBpX21vZC5qcycpLFxuICAgIGFkdmljZURvZyA9IHJlcXVpcmUoJy4vbGliL19hZHZpY2VEb2cuanMnKTtcblxudmFyIGJhZEdyb3VwcyA9IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHN0b3JhZ2UuZ2V0KCdncm91cHM6OmJhZCcpLnRoZW4oYSA9PiBBcnJheS5pc0FycmF5KGEpID8gYSA6IFtdKTtcbiAgICB9LFxuICAgIGFkZDogZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHZhciBzdGF0aW9uID0gdm0uc3RhdGlvbk1hcFtpZF07XG4gICAgICAgIGlmIChzdGF0aW9uKSB7XG4gICAgICAgICAgICBkZWxldGUgdm0uc3RhdGlvbk1hcFtpZF07XG4gICAgICAgICAgICB2bS5zdGF0aW9ucy5yZW1vdmUoc3RhdGlvbik7XG4gICAgICAgICAgICBpZiAoIXN0YXRpb24uaXNfbWVtYmVyKVxuICAgICAgICAgICAgICAgIGFkdmljZURvZyhpZCwgZ2V0VGFnc0ZvckFkdmljZURvZyhzdGF0aW9uLnRyYWNrcyksIDApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHN0b3JhZ2UuZ2V0KCdncm91cHM6OmJhZCcpLnRoZW4oZnVuY3Rpb24gKGdyb3Vwcykge1xuICAgICAgICAgICAgaWYgKGdyb3Vwcy5pbmRleE9mKGlkKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBncm91cHMucHVzaChpZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0b3JhZ2Uuc2V0KCdncm91cHM6OmJhZCcsIGdyb3Vwcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9KVxuICAgIH1cbn07XG5cbmZ1bmN0aW9uIGdldFRhZ3NGb3JBZHZpY2VEb2codHJhY2tzKSB7XG4gICAgdmFyIGZpbHRlcmVkVHJhY2tzID0gdHJhY2tzLmZpbHRlcigoe2dlbnJlX2lkfSkgPT4gZ2VucmVfaWQgJiYgZ2VucmVfaWQgIT0gMTggJiYgZ2VucmVfaWQgPD0gMjIpO1xuICAgIHZhciBnZW5yZU1hcCA9IGZpbHRlcmVkVHJhY2tzLm1hcCgoe2dlbnJlX2lkfSk9PmdlbnJlX2lkKS5yZWR1Y2UoKGFjYywgaWQpPT4gKGFjY1tpZF0gPSAoYWNjW2lkXSB8fCAwKSArIDEpICYmIGFjYywge30pO1xuICAgIHZhciBvdXQgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8PSAyMjsgaSsrKVxuICAgICAgICBvdXRbaV0gPSAoZ2VucmVNYXBbaV0gfHwgMCkgLyBmaWx0ZXJlZFRyYWNrcy5sZW5ndGg7XG4gICAgcmV0dXJuIG91dDtcbn1cblxuXG5WdWUuZmlsdGVyKCd0aHJlc2hvbGQnLCBmdW5jdGlvbiAoYXJyYXksIHBhcmFtLCBjb3VudCkge1xuICAgIHJldHVybiBhcnJheS5zb3J0KChhLCBiKT0+IGJbcGFyYW1dIC0gYVtwYXJhbV0pLnNsaWNlKDAsIE51bWJlcihjb3VudCkpO1xufSk7XG5cblZ1ZS5kaXJlY3RpdmUoJ3Rvb2x0aXAtY3VycmVudC1zdGF0aW9uJywge1xuICAgIGlzRW1wdHk6IHRydWUsXG4gICAgYmluZCAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgICAgICAkZWwgPSAkKHRoaXMuZWwpO1xuICAgICAgICAkZWxcbiAgICAgICAgICAgIC50b29sdGlwc3Rlcih7XG4gICAgICAgICAgICAgICAgY29udGVudEFzSFRNTDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBpbnRlcmFjdGl2ZSAgOiB0cnVlXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRvb2x0aXBzdGVyKCdkaXNhYmxlJyk7XG4gICAgICAgICRlbFxuICAgICAgICAgICAgLm1vdXNlb3ZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGYudm0uY3VycmVudFN0YXRpb24uaWQpXG4gICAgICAgICAgICAgICAgICAgICRlbC50b29sdGlwc3RlcignZW5hYmxlJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC50b29sdGlwc3RlcignY29udGVudCcsICc8aWZyYW1lIGhlaWdodD00NDBweCBzcmM9aHR0cHM6Ly92ay5jb20vd2lkZ2V0X2NvbW11bml0eS5waHA/YXBwPTAmd2lkdGg9MzAwcHgmX3Zlcj0xJmdpZD0nICsgc2VsZi52bS5jdXJyZW50U3RhdGlvbi5pZCArICcmbW9kZT0yJmNvbG9yMz1mZjZkMDAmaGVpZ2h0PTQwMDAwID48L2lmcmFtZT4nKTtcblxuICAgICAgICAgICAgfSk7XG4gICAgfVxufSk7XG5WdWUuZGlyZWN0aXZlKCd0b29sdGlwJywge1xuICAgIGlzTGl0ZXJhbDogdHJ1ZSxcbiAgICBiaW5kICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgICAgJGVsID0gJCh0aGlzLmVsKTtcbiAgICAgICAgJGVsXG4gICAgICAgICAgICAudG9vbHRpcHN0ZXIoe1xuICAgICAgICAgICAgICAgIGNvbnRlbnRBc0hUTUw6IHRydWUsXG4gICAgICAgICAgICAgICAgaW50ZXJhY3RpdmUgIDogdHJ1ZVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50b29sdGlwc3RlcignZGlzYWJsZScpO1xuICAgICAgICAkZWxcbiAgICAgICAgICAgIC5tb3VzZW92ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLnZtLmN1cnJlbnRTdGF0aW9uLmlkKVxuICAgICAgICAgICAgICAgICAgICAkZWwudG9vbHRpcHN0ZXIoJ2VuYWJsZScpXG4gICAgICAgICAgICAgICAgICAgICAgICAudG9vbHRpcHN0ZXIoJ2NvbnRlbnQnLCAnPGlmcmFtZSBoZWlnaHQ9NDQwcHggc3JjPWh0dHBzOi8vdmsuY29tL3dpZGdldF9jb21tdW5pdHkucGhwP2FwcD0wJndpZHRoPTMwMHB4Jl92ZXI9MSZnaWQ9JyArIHNlbGYudm0uY3VycmVudFN0YXRpb24uaWQgKyAnJm1vZGU9MiZjb2xvcjM9ZmY2ZDAwJmhlaWdodD00MDAwMCA+PC9pZnJhbWU+Jyk7XG5cbiAgICAgICAgICAgIH0pO1xuICAgIH1cbn0pO1xuXG52YXIgdm0gPSBuZXcgVnVlKHtcbiAgICBlbCAgICAgIDogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2NvbnRlbnQnKSxcbiAgICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi90ZW1wbGF0ZXMvX2FwcC5odG1sLmphZGUnKSxcbiAgICBkYXRhICAgIDoge1xuICAgICAgICBzdGF0aW9ucyAgICAgICAgIDogW10sXG4gICAgICAgIHN1Z2dlc3RlZFN0YXRpb25zOiBbXSxcbiAgICAgICAgc3RhdGlvbnNNYXAgICAgICA6IHt9LFxuICAgICAgICBjdXJyZW50U3RhdGlvbiAgIDogbnVsbCxcbiAgICAgICAgY3VycmVudFRyYWNrICAgICA6IG51bGwsXG4gICAgICAgIGN1cnJlbnRQcm9ncmVzcyAgOiAwLFxuICAgICAgICBhbmNob3IgICAgICAgICAgIDogJycsXG4gICAgICAgIHZvbHVtZSAgICAgICAgICAgOiAxMDAsIG11dGU6IGZhbHNlLFxuICAgICAgICBsaWtlZFRyYWNrcyAgICAgIDogW11cbiAgICB9LFxuICAgIG1ldGhvZHMgOiB7XG4gICAgICAgIGxpa2VDdXJyZW50VHJhY2soKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgdHJhY2sgPSB0aGlzLmN1cnJlbnRUcmFjaztcbiAgICAgICAgICAgIHNlbGYubGlrZWRUcmFja3MucHVzaCh0cmFjayk7XG4gICAgICAgICAgICBjbygoZnVuY3Rpb24qKCkge1xuICAgICAgICAgICAgICAgIHZhciBzZXNzaW9uID0geWllbGQgdmtBcGkuc2Vzc2lvbjtcbiAgICAgICAgICAgICAgICB0cmFjay5hZGRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgd2luZG93LmdhKCdzZW5kJywgJ2V2ZW50JywgJ3NvY2lhbCcsICdsaWtlJywgJ3RyYWNrJywge1xuICAgICAgICAgICAgICAgICAgICBncm91cF9pZDogc2VsZi5jdXJyZW50U3RhdGlvbi5pZCxcbiAgICAgICAgICAgICAgICAgICAgYXJ0aXN0OiB0cmFjay5hcnRpc3QsXG4gICAgICAgICAgICAgICAgICAgIGdlbnJlOiB0cmFjay5nZW5yZV9pZCxcbiAgICAgICAgICAgICAgICAgICAgZ2VucmVfY29tcGF0aWJpbGl0eTogc2VsZi5jdXJyZW50U3RhdGlvbi5nZW5yZUNvbXBhdGliaWxpdHlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAoIXNlbGYuY3VycmVudFN0YXRpb24uaXNfbWVtYmVyKVxuICAgICAgICAgICAgICAgICAgICBzZWxmLmN1cnJlbnRTdGF0aW9uLmdlbnJlQ29tcGF0aWJpbGl0eSA9IE1hdGgubWF4KDEsIHNlbGYuY3VycmVudFN0YXRpb24uZ2VucmVDb21wYXRpYmlsaXR5ICsgLjA1KTtcblxuICAgICAgICAgICAgICAgIHlpZWxkIHNlbGYudXNlckFsYnVtc1Byb21pc2U7XG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRBbGJ1bTtcbiAgICAgICAgICAgICAgICB2YXIgdGl0bGUgPSAncHVibGljUmFkaW8uaW8gLy8gJyArIHNlbGYuY3VycmVudFN0YXRpb24ubmFtZSArICcgKCcgKyBzZWxmLmN1cnJlbnRTdGF0aW9uLnNjcmVlbl9uYW1lICsgJyknO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50QWxidW0gPSBzZWxmLnVzZXJBbGJ1bXMuZmlsdGVyKCh7dGl0bGV9KSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGUuc3RhcnRzV2l0aCgncHVibGljUmFkaW8uaW8nKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGUuZW5kc1dpdGgoJygnICsgc2VsZi5jdXJyZW50U3RhdGlvbi5zY3JlZW5fbmFtZSArICcpJylcbiAgICAgICAgICAgICAgICAgICAgKVswXSkge1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50QWxidW0udGl0bGUgPSB0aXRsZTtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEFsYnVtLmFsYnVtX2lkID0gY3VycmVudEFsYnVtLmFsYnVtX2lkIHx8IGN1cnJlbnRBbGJ1bS5pZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHlpZWxkIHZrQXBpKCdhdWRpby5lZGl0QWxidW0nLCBjdXJyZW50QWxidW0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHthbGJ1bV9pZH0gPSB5aWVsZCB2a0FwaSgnYXVkaW8uYWRkQWxidW0nLCB7dGl0bGV9LCAxMDApO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnVzZXJBbGJ1bXMucHVzaChjdXJyZW50QWxidW0gPSB7YWxidW1faWQ6IGFsYnVtX2lkLCB0aXRsZX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgYWlkID0geWllbGQgdmtBcGkoJ2F1ZGlvLmFkZCcsIHthdWRpb19pZDogdHJhY2suaWQsIG93bmVyX2lkOiB0cmFjay5vd25lcl9pZH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSB5aWVsZCBbXG4gICAgICAgICAgICAgICAgICAgIHZrQXBpKCdhdWRpby5tb3ZlVG9BbGJ1bScsIHthbGJ1bV9pZDogY3VycmVudEFsYnVtLmFsYnVtX2lkLCBhdWRpb19pZHM6IGFpZH0sIDEwMCksXG4gICAgICAgICAgICAgICAgICAgIHZrQXBpKCdhdWRpby5lZGl0Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3duZXJfaWQ6IGN1cnJlbnRBbGJ1bS5vd25lcl9pZCB8fCBzZXNzaW9uLm1pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGF1ZGlvX2lkOiBhaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZSAgIDogc2VsZi5jdXJyZW50VHJhY2sudGl0bGUgKyAnICjQvdCw0LnQtNC10L3QviDQvdCwIFB1YmxpY1JhZGlvLmlvKSdcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKVxuICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICB9KSgpKSgpO1xuICAgICAgICB9LFxuICAgICAgICBzZXRHcm91cEFzQmFkKGdyb3VwSWQpIHtcbiAgICAgICAgICAgIGJhZEdyb3Vwcy5hZGQoZ3JvdXBJZCk7XG4gICAgICAgIH0sXG4gICAgICAgIGRvTXV0ZSgpe1xuICAgICAgICAgICAgaWYgKHRoaXMudm9sdW1lID09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZvbHVtZSA9IHRoaXMuX3ZvbHVtZSAhPSAwID8gdGhpcy5fdm9sdW1lIDogMTAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl92b2x1bWUgPSB0aGlzLnZvbHVtZTtcbiAgICAgICAgICAgICAgICB0aGlzLnZvbHVtZSA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGNyZWF0ZWQoKSB7XG4gICAgICAgIHRoaXMuJG9uKCdzdGF0aW9uQ2hhbmdlJywgZnVuY3Rpb24gKHtzdGF0aW9ufSkge1xuICAgICAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sIHN0YXRpb24ubmFtZSArICcgYXQgUHVibGljIFJhZGlvJywgJz8nICsgc3RhdGlvbi5zY3JlZW5fbmFtZSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRTdGF0aW9uID0gc3RhdGlvbjtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICByZWFkeSgpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgICAgdXBkYXRlVm9sdW1lID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICB3aW5kb3cuZ2xvYmFsVm9sdW1lTGV2ZWwgPSBOdW1iZXIoc2VsZi52b2x1bWUpICogMC4wMTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UuZ2xvYmFsVm9sdW1lTGV2ZWwgPSBzZWxmLnZvbHVtZTtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5jdXJyZW50U3RhdGlvbiAmJiBzZWxmLmN1cnJlbnRTdGF0aW9uLl9lbmdpbmUgJiYgc2VsZi5jdXJyZW50U3RhdGlvbi5fZW5naW5lLl9hdWRpbykgc2VsZi5jdXJyZW50U3RhdGlvbi5fZW5naW5lLl9hdWRpby52b2x1bWUgPSB3aW5kb3cuZ2xvYmFsVm9sdW1lTGV2ZWw7XG4gICAgICAgICAgICB9O1xuICAgICAgICB0aGlzLiR3YXRjaCgndm9sdW1lJywgdXBkYXRlVm9sdW1lKTtcbiAgICAgICAgdGhpcy4kd2F0Y2goJ211dGUnLCB1cGRhdGVWb2x1bWUpO1xuICAgICAgICAvKndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgICAgIGlmICghc2VsZi5jdXJyZW50U3RhdGlvbi5pZCkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKGV2ZW50LndoaWNoICE9PSAzMikgcmV0dXJuOyAvL3NwYWNlYmFyXG4gICAgICAgICAgICBzZWxmLm11dGUgPSAhc2VsZi5tdXRlO1xuICAgICAgICAgICAgZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTsqL1xuICAgICAgICBpZiAobG9jYWxTdG9yYWdlLmdsb2JhbFZvbHVtZUxldmVsICYmIGxvY2FsU3RvcmFnZS5nbG9iYWxWb2x1bWVMZXZlbCAhPSAwKSBzZWxmLnZvbHVtZSA9IGxvY2FsU3RvcmFnZS5nbG9iYWxWb2x1bWVMZXZlbDtcbiAgICAgICAgdXBkYXRlVm9sdW1lKCk7XG5cbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJoYXNoY2hhbmdlXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuYW5jaG9yID0gZG9jdW1lbnQubG9jYXRpb24uaGFzaC5yZXBsYWNlKCcjJywgJycpO1xuICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgIHRoaXMuJHdhdGNoKCdjdXJyZW50U3RhdGlvbicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YXRpb24uX2VuZ2luZS5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzdWJzY3JpYmVUb0dyb3VwJykuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgICAgICBWSy5XaWRnZXRzLlN1YnNjcmliZShcInN1YnNjcmliZVRvR3JvdXBcIiwge21vZGU6IDEsIHNvZnQ6IDF9LCAtdGhpcy5jdXJyZW50U3RhdGlvbi5pZCk7XG4gICAgICAgIH0pO1xuICAgICAgICBWSy5PYnNlcnZlci5zdWJzY3JpYmUoXCJ3aWRnZXRzLnN1YnNjcmliZWRcIiwgZnVuY3Rpb24gZigpIHtcbiAgICAgICAgICAgIHNlbGYuY3VycmVudFN0YXRpb24uaXNfbWVtYmVyID0gdHJ1ZTtcbiAgICAgICAgICAgIHdpbmRvdy5nYSgnc2VuZCcsICdldmVudCcsICdzb2NpYWwnLCAnbGlrZScsICdncm91cCcsIHtcbiAgICAgICAgICAgICAgICBncm91cF9pZDogc2VsZi5jdXJyZW50U3RhdGlvbi5pZCxcbiAgICAgICAgICAgICAgICBnZW5yZV9jb21wYXRpYmlsaXR5OiBzZWxmLmN1cnJlbnRTdGF0aW9uLmdlbnJlQ29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBWSy5PYnNlcnZlci5zdWJzY3JpYmUoXCJ3aWRnZXRzLnVuc3Vic2NyaWJlZFwiLCBmdW5jdGlvbiBmKCkge1xuICAgICAgICAgICAgc2VsZi5jdXJyZW50U3RhdGlvbi5pc19tZW1iZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIHdpbmRvdy5nYSgnc2VuZCcsICdldmVudCcsICdzb2NpYWwnLCAnZGlzbGlrZScsICdncm91cCcsIHtcbiAgICAgICAgICAgICAgICBncm91cF9pZDogc2VsZi5jdXJyZW50U3RhdGlvbi5pZCxcbiAgICAgICAgICAgICAgICBnZW5yZV9jb21wYXRpYmlsaXR5OiBzZWxmLmN1cnJlbnRTdGF0aW9uLmdlbnJlQ29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBncm91cDtcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uIHRpY2soKSB7XG4gICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGljaywgc2VsZi4kZWwpO1xuICAgICAgICAgICAgaWYgKHNlbGYuY3VycmVudFN0YXRpb24gJiYgc2VsZi5jdXJyZW50U3RhdGlvbi5fZW5naW5lICYmIHNlbGYuY3VycmVudFN0YXRpb24uX2VuZ2luZS5fYXVkaW8pXG4gICAgICAgICAgICAgICAgc2VsZi5jdXJyZW50UHJvZ3Jlc3MgPSBzZWxmLmN1cnJlbnRTdGF0aW9uLl9lbmdpbmUuX2F1ZGlvLmN1cnJlbnRUaW1lIC8gc2VsZi5jdXJyZW50U3RhdGlvbi5fZW5naW5lLl9hdWRpby5kdXJhdGlvbjtcbiAgICAgICAgfSwgc2VsZi4kZWwpO1xuICAgICAgICBjbygoZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIHZhciBjdXJyZW50U3RhdGlvbk5hbWUgPSBsb2NhdGlvbi5zZWFyY2guc3BsaXQoJz8nKS5zbGljZSgtMSlbMF07XG4gICAgICAgICAgICB2YXIgcXVlcmllcyA9IFtiYWRHcm91cHMuZ2V0KCksIGdldFVzZXJHcm91cHMoKSwgZ2V0UG9wdWxhckdyb3VwcygpXTtcbiAgICAgICAgICAgIGlmIChjdXJyZW50U3RhdGlvbk5hbWUpXG4gICAgICAgICAgICAgICAgcXVlcmllcy5wdXNoKHZrQXBpKCdncm91cHMuZ2V0QnlJZCcsIHtncm91cF9pZDogY3VycmVudFN0YXRpb25OYW1lLCB2OiAnNS4yNSd9KSk7XG4gICAgICAgICAgICB2YXIgW2JhZEdyb3VwTGlzdCwge2l0ZW1zOiB1c2VyR3JvdXBzfSwge2l0ZW1zOiBwb3B1bGFyR3JvdXBzfSwgcGlja2VkR3JvdXBdID0geWllbGQgcXVlcmllcyxcbiAgICAgICAgICAgICAgICB1c2VyR3JvdXBJRHMgPSB1c2VyR3JvdXBzLm1hcChncm91cCA9PiBncm91cC5pZCk7XG4gICAgICAgICAgICBzZWxmLmJhZEdyb3VwcyA9IGJhZEdyb3VwTGlzdDtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHBpY2tlZEdyb3VwKSkge1xuICAgICAgICAgICAgICAgIHZhciBncm91cCA9IHBpY2tlZEdyb3VwWzBdO1xuICAgICAgICAgICAgICAgIG5ldyBHcm91cChncm91cCwge2lzX21lbWJlcjogdXNlckdyb3Vwcy5tYXAoZWwgPT4gZWwuaWQpLmluZGV4T2YoZ3JvdXAuaWQpICE9PSAtMX0sIHNlbGYsIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yY2VkICA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9wbGF5OiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGdyb3VwIG9mIHVzZXJHcm91cHMpXG4gICAgICAgICAgICAgICAgaWYgKGJhZEdyb3VwTGlzdC5pbmRleE9mKGdyb3VwLmlkKSA9PT0gLTEpXG4gICAgICAgICAgICAgICAgICAgIG5ldyBHcm91cChncm91cCwge2lzX21lbWJlcjogdHJ1ZX0sIHNlbGYpO1xuICAgICAgICAgICAgZm9yIChncm91cCBvZiBwb3B1bGFyR3JvdXBzKVxuICAgICAgICAgICAgICAgIGlmIChiYWRHcm91cExpc3QuaW5kZXhPZihncm91cC5pZCkgPT09IC0xKVxuICAgICAgICAgICAgICAgICAgICBuZXcgR3JvdXAoZ3JvdXAsIHtpc19tZW1iZXI6IGZhbHNlfSwgc2VsZik7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBHcm91cC5iYWQoZ3JvdXApO1xuICAgICAgICB9KSgpKSgpO1xuICAgICAgICB0aGlzLnVzZXJBbGJ1bXMgPSBbXTtcbiAgICAgICAgdmFyIHI7XG4gICAgICAgIHRoaXMudXNlckFsYnVtc1Byb21pc2UgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNlbGYudXNlckFsYnVtc1Byb21pc2VSZXNvbHZlID0gcmVzb2x2ZSk7XG4gICAgICAgIGNvKGZ1bmN0aW9uKigpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSB5aWVsZCB2a0FwaSgnYXVkaW8uZ2V0QWxidW1zJywge29mZnNldDogMCwgY291bnQ6IDEwMH0sIDEwMCk7XG4gICAgICAgICAgICB2YXIgcmVxdWVzdHMgPSBbXSxcbiAgICAgICAgICAgICAgICBvZmZzZXQgPSAwO1xuICAgICAgICAgICAgd2hpbGUgKCgrK29mZnNldCkgKiAxMDAgPCByZXN1bHQuY291bnQpIHtcbiAgICAgICAgICAgICAgICByZXF1ZXN0cy5wdXNoKHZrQXBpKCdhdWRpby5nZXRBbGJ1bXMnLCB7b2Zmc2V0OiBvZmZzZXQgKiAxMDAsIGNvdW50OiAxMDB9LCAxMDApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBvdGhlclJlc3VsdHMgPSB5aWVsZCByZXF1ZXN0cztcbiAgICAgICAgICAgIHNlbGYudXNlckFsYnVtcyA9IFtyZXN1bHRdLmNvbmNhdChvdGhlclJlc3VsdHMpLm1hcChyZXN1bHQgPT4gcmVzdWx0Lml0ZW1zKS5yZWR1Y2UoKGEsIGIpPT4gYS5jb25jYXQoYikpO1xuICAgICAgICAgICAgc2VsZi51c2VyQWxidW1zUHJvbWlzZVJlc29sdmUoKTtcbiAgICAgICAgfSgpKSgpO1xuICAgIH1cbn0pO1xudmFyIG8gPSB7fTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3csICckcycsIHt2YWx1ZTogb30pO1xud2luZG93Wyd2JyArICdtJ10gPSBmdW5jdGlvbiAoaykge2lmIChrID09PSBvKSByZXR1cm4gdGhpczt9LmJpbmQodm0pO1xuXG5mdW5jdGlvbiBnZXRQb3B1bGFyR3JvdXBzKCkge1xuICAgIHJldHVybiB2a0FwaSgnZ3JvdXBzLnNlYXJjaCcsIHtcbiAgICAgICAgcSAgICA6ICdtdXNpYycsXG4gICAgICAgIGNvdW50OiA1MDAsXG4gICAgICAgIHNvcnQgOiAxXG4gICAgfSwgLTIwKTtcbn1cblxuZnVuY3Rpb24gZ2V0VXNlckdyb3VwcygpIHtcbiAgICByZXR1cm4gdmtBcGkoJ2dyb3Vwcy5nZXQnLCB7XG4gICAgICAgIGZpbHRlciAgOiAnZ3JvdXBzLHB1YmxpY3MnLFxuICAgICAgICBjb3VudCAgIDogMTAwMCxcbiAgICAgICAgZXh0ZW5kZWQ6IDFcbiAgICB9LCAxMDApO1xufSIsInZhciBkYXRhTWFwICAgICA9IHt9LFxuICAgIGNhbGxiYWNrTWFwID0ge30sXG4gICAgbmVlZFVwZGF0ZSAgPSBmYWxzZTtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGlkLCBjcml0ZXJpYSwgcmVzdWx0LCB1cGRhdGVDYWxsYmFjaykge1xuICAgIGlmICghY3JpdGVyaWEpIHtcbiAgICAgICAgZGVsZXRlIGRhdGFNYXBbaWRdO1xuICAgICAgICBkZWxldGUgY2FsbGJhY2tNYXBbaWRdO1xuICAgIH1cbiAgICBpZiAocmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgIHJlc3VsdCA9IGRhdGFNYXBbaWRdLm91dHB1dFswXTtcbiAgICB9XG5cbiAgICBkYXRhTWFwW2lkXSA9IHtpbnB1dDogY3JpdGVyaWEsIG91dHB1dDogcmVzdWx0ICE9PSB1bmRlZmluZWQgPyBbcmVzdWx0XSA6IG51bGwsIGlkOiBpZH07XG4gICAgaWYgKHVwZGF0ZUNhbGxiYWNrKVxuICAgICAgICBjYWxsYmFja01hcFtpZF0gPSB1cGRhdGVDYWxsYmFjaztcblxuICAgIG5lZWRVcGRhdGUgPSB0cnVlO1xufTtcbi8vXG4vL3ZhciBhZHZpY2VXb3JrZXIgPSBuZXcgV29ya2VyKFwiYWR2aWNlRG9nV29ya2VyLmpzXCIpO1xuLy9hZHZpY2VXb3JrZXIub25tZXNzYWdlID0gZnVuY3Rpb24gKG9iaikge1xuLy8gICAgZm9yICh2YXIgZW50cnkgb2Ygb2JqLmRhdGEpIGlmIChjYWxsYmFja01hcFtlbnRyeVswXV0pIGNhbGxiYWNrTWFwW2VudHJ5WzBdXShlbnRyeVsxXSk7XG4vL307XG4vL3NldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbi8vICAgIGlmICghbmVlZFVwZGF0ZSkgcmV0dXJuO1xuLy8gICAgbmVlZFVwZGF0ZSA9IGZhbHNlO1xuLy8gICAgYWR2aWNlV29ya2VyLnBvc3RNZXNzYWdlKGRhdGFNYXApO1xuLy99LCAxNTAwMCk7IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBwbGF5ZXIob3ZlcnJpZGVzKSB7XG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICBwbGF5ZXJDb25zdHJ1Y3RvcjogZnVuY3Rpb24gcGxheWVyQ29uc3RydWN0b3IoKSB7XG4gICAgICAgICAgICB2YXIgYXVkaW8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhdWRpbycpO1xuICAgICAgICAgICAgYXVkaW8udG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHNyYyAgICAgOiB0aGlzLnNyYyxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IHRoaXMuZHVyYXRpb25cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGF1ZGlvO1xuICAgICAgICB9LFxuICAgICAgICB0cmFuc2Zvcm1TcmMgICAgIDogZnVuY3Rpb24gKHNyYykge3JldHVybiBzcmN9LFxuICAgICAgICBvbmx5TWV0YWRhdGEgICAgIDogZmFsc2UsXG4gICAgICAgIGV2ZW50SW50ZXJ2YWwgICAgOiAxMDAwIC8gNjAsXG4gICAgICAgIHZvbHVtZSAgICAgICAgICAgOiAxLFxuICAgICAgICBhdXRvcGxheSAgICAgICAgIDogdHJ1ZVxuICAgIH07XG4gICAgaWYgKG92ZXJyaWRlcyBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICBPYmplY3Qua2V5cyhvdmVycmlkZXMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgZGVmYXVsdHNba2V5XSA9IG92ZXJyaWRlc1trZXldO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIC8qKlxuICAgICBAcGFyYW0gc3JjIFN0cmluZ1xuICAgICBAcGFyYW0gb3B0cyBPYmplY3RcbiAgICAgQHBhcmFtIGNiIEZ1bmN0aW9uXG4gICAgICovXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHBsYXkoc3JjLCBvcHRzLCBjYikge1xuICAgICAgICBpZiAoYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICBjYiA9IGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICBpZiAoY2IgPT09IG9wdHMpIG9wdHMgPSB2b2lkIDA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIShvcHRzIGluc3RhbmNlb2YgT2JqZWN0KSkgb3B0cyA9IHt9O1xuXG4gICAgICAgIHZhciBsaXN0ZW5lcnMgPSBbXSxcbiAgICAgICAgICAgIGludGVydmFsO1xuXG4gICAgICAgIE9iamVjdFxuICAgICAgICAgICAgLmtleXMoZGVmYXVsdHMpXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgaWYgKGtleSBpbiBvcHRzKSB7fVxuICAgICAgICAgICAgICAgIGVsc2Ugb3B0c1trZXldID0gZGVmYXVsdHNba2V5XVxuICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICB2YXIgcGxheWVyID0gb3B0cy5wbGF5ZXJDb25zdHJ1Y3RvcigpLFxuICAgICAgICAgICAgZG9uZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIGlmIChjYiBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxuICAgICAgICAgICAgICAgICAgICBjYihldmVudCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICBwbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBlbmRlZCk7XG4gICAgICAgIHBsYXllci5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGVycm9yKTtcblxuICAgICAgICBpZiAob3B0cy5hdXRvcGxheSAhPT0gZmFsc2UpXG4gICAgICAgICAgICBwbGF5ZXIuYXV0b3BsYXkgPSB0cnVlO1xuICAgICAgICBwbGF5ZXIudm9sdW1lID0gb3B0cy52b2x1bWU7XG4gICAgICAgIGlmIChvcHRzLm9ubHlNZXRhZGF0YSA9PT0gdHJ1ZSlcbiAgICAgICAgICAgIHBsYXllci5wcmVsb2FkID0gJ21ldGFkYXRhJztcblxuXG4gICAgICAgIGlmIChzcmMgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgdmFyIGFsbGVkZ2VkU3JjID0gc3JjKCk7XG4gICAgICAgICAgICBpZiAoYWxsZWRnZWRTcmMgJiYgYWxsZWRnZWRTcmMudGhlbiBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxuICAgICAgICAgICAgICAgIGFsbGVkZ2VkU3JjLnRoZW4oc2V0U3JjKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBzZXRTcmMoYWxsZWRnZWRTcmMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNldFNyYyhzcmMpO1xuXG5cbiAgICAgICAgaWYgKG9wdHMuZXJyb3IgaW5zdGFuY2VvZiBGdW5jdGlvbilcbiAgICAgICAgICAgIHBsYXllci5hZGRFdmVudExpc3RlbmVyKCdwbGF5ZXJFcnJvcicsIGVycm9yKTtcblxuICAgICAgICByZXR1cm4gT2JqZWN0LmNyZWF0ZSh7XG4gICAgICAgICAgICBlbWl0OiBlbWl0LFxuICAgICAgICAgICAgcGxheSAgIDogcGxheWVyLnBsYXkuYmluZChwbGF5ZXIpLFxuICAgICAgICAgICAgcGF1c2UgIDogcGxheWVyLnBhdXNlLmJpbmQocGxheWVyKSxcbiAgICAgICAgICAgIHRvSlNPTjogcGxheWVyLnRvSlNPTi5iaW5kKHBsYXllciksXG4gICAgICAgICAgICBvbiAgICA6IGZ1bmN0aW9uIChldmVudCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsYmFjayA9IGNhbGxiYWNrLmNhbGxiYWNrIHx8IGNhbGxiYWNrO1xuICAgICAgICAgICAgICAgIGlmIChldmVudCBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxuICAgICAgICAgICAgICAgICAgICBhZGRGbkV2ZW50TGlzdGVuZXIoZXZlbnQsIGNhbGxiYWNrLmNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5hZGRFdmVudExpc3RlbmVyLmFwcGx5KHBsYXllciwgW2FyZ3VtZW50c1swXSwgYXJndW1lbnRzWzFdLmNhbGxiYWNrLCBhcmd1bWVudHNbMl1dKTtcblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9mZiAgIDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50IGluc3RhbmNlb2YgRnVuY3Rpb24pXG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZUZuRXZlbnRMaXN0ZW5lcihldmVudCk7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIucmVtb3ZlRXZlbnRMaXN0ZW5lci5hcHBseShwbGF5ZXIsIFthcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXS5jYWxsYmFjaywgYXJndW1lbnRzWzJdXSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25lICAgOiBmdW5jdGlvbiAoZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGxiYWNrID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYub2ZmKGV2ZW50LCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBzZWxmLm9uKGV2ZW50LCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVzdHJveTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHN0b3BFdmVudEludGVydmFsKCk7XG4gICAgICAgICAgICAgICAgcGxheWVyLnNyYyA9ICcnO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBwbGF5ZXIuc3JjO1xuICAgICAgICAgICAgICAgIHBsYXllci5yZW1vdmVFdmVudExpc3RlbmVyKCdlbmRlZCcsIGVuZGVkKTtcbiAgICAgICAgICAgICAgICBwbGF5ZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHtcbiAgICAgICAgICAgIHZvbHVtZSAgICAgOiB7XG4gICAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBwbGF5ZXIudm9sdW1lOyB9LFxuICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHZhbCkgJiYgKHZhbCA+PSAwKSAmJiAodmFsIDw9IDEpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcGxheWVyLnZvbHVtZSA9IHZhbDtcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgZW1pdCgncGxheWVyRXJyb3InLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA6ICd2YWxpZGF0aW9uRmFpbGVkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkOiAndm9sdW1lJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGN1cnJlbnRUaW1lOiB7XG4gICAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBwbGF5ZXIuY3VycmVudFRpbWU7IH0sXG4gICAgICAgICAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUodmFsKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwbGF5ZXIucmVhZHlTdGF0ZSA+IDIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxheWVyLmN1cnJlbnRUaW1lID0gdmFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXllci5hZGRFdmVudExpc3RlbmVyKCdjYW5wbGF5JywgZnVuY3Rpb24gb25jYW5wbGF5KCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuY3VycmVudFRpbWUgPSB2YWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXllci5yZW1vdmVFdmVudExpc3RlbmVyKCdjYW5wbGF5Jywgb25jYW5wbGF5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgZW1pdCgncGxheWVyRXJyb3InLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA6ICd2YWxpZGF0aW9uRmFpbGVkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkOiAnY3VycmVudFRpbWUnXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZG9uZSAgICAgICA6IHtcbiAgICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGNiOyB9LFxuICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsIGluc3RhbmNlb2YgRnVuY3Rpb24gfHwgdmFsID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgY2IgPSB2YWw7XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIGVtaXQoJ3BsYXllckVycm9yJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUgOiAndmFsaWRhdGlvbkZhaWxlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWVsZDogJ2RvbmUnXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3JjICAgICAgICA6IHsgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBwbGF5ZXIuc3JjOyB9IH0sXG4gICAgICAgICAgICBvcmlnaW5hbFNyYzogeyBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHBsYXllci5vcmlnaW5hbFNyYzsgfSB9LFxuICAgICAgICAgICAgZHVyYXRpb24gICA6IHsgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBwbGF5ZXIuZHVyYXRpb247IH0gfVxuICAgICAgICB9KTtcblxuXG4gICAgICAgIGZ1bmN0aW9uIGVtaXQodHlwZSwgZGF0YSkgeyBwbGF5ZXIuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQodHlwZSwge2RldGFpbDogZGF0YX0pKTsgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNldFNyYyhzcmMpIHsvL25vaW5zcGVjdGlvbiBKU1VucmVzb2x2ZWRWYXJpYWJsZVxuICAgICAgICAgICAgcGxheWVyLnNyYyA9IG9wdHMudHJhbnNmb3JtU3JjKHBsYXllci5vcmlnaW5hbFNyYyA9IChvcHRzLnNyY01vZCBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gb3B0cy5zcmNNb2Qoc3JjKSA6IHNyYykpIH1cblxuICAgICAgICBmdW5jdGlvbiBlbmRlZChldmVudCkgeyBkb25lKGV2ZW50KTsgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGVycm9yKGV2ZW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oZXZlbnQpO1xuICAgICAgICAgICAgZG9uZShldmVudCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzdG9wRXZlbnRJbnRlcnZhbCgpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc3RhcnRFdmVudEludGVydmFsKCkge1xuICAgICAgICAgICAgc3RvcEV2ZW50SW50ZXJ2YWwoKTtcbiAgICAgICAgICAgIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgICAgICAgICBpZiAobGlzdGVuZXJzW2ldKCkpIGxpc3RlbmVyc1tpXS5jYWxsYmFjaygpO1xuICAgICAgICAgICAgfSwgb3B0cy5ldmVudEludGVydmFsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFkZEZuRXZlbnRMaXN0ZW5lcihldmVudCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGlmIChsaXN0ZW5lcnMubGVuZ3RoID09PSAwKSBzdGFydEV2ZW50SW50ZXJ2YWwoKTtcbiAgICAgICAgICAgIGV2ZW50LmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgICAgICBpZiAobGlzdGVuZXJzLmluZGV4T2YoZXZlbnQpID09PSAtMSlcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMucHVzaChldmVudCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZW1vdmVGbkV2ZW50TGlzdGVuZXIoZXZlbnQpIHtcbiAgICAgICAgICAgIHZhciBpbmRleE9mO1xuICAgICAgICAgICAgd2hpbGUgKChpbmRleE9mID0gbGlzdGVuZXJzLmluZGV4T2YoZXZlbnQpKSAhPT0gLTEpXG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLnNsaWNlKDAsIGluZGV4T2YpLmNvbmNhdChsaXN0ZW5lcnMuc2xpY2UoaW5kZXhPZiArIDEpKTtcblxuICAgICAgICAgICAgaWYgKGxpc3RlbmVycy5sZW5ndGggPT09IDApIHN0b3BFdmVudEludGVydmFsKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59OyIsIi8vbm9pbnNwZWN0aW9uIEJhZEV4cHJlc3Npb25TdGF0ZW1lbnRKU1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgVFdFRU4gPSByZXF1aXJlKCd0d2Vlbi5qcycpO1xudmFyIFBsYXllciA9IHJlcXVpcmUoJy4vX3BsYXllcicpO1xudmFyIFBsYXkgPSBuZXcgUGxheWVyKHtcbiAgICBwbGF5ZXJDb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdmFyIGF1ZGlvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXVkaW8nKTtcbiAgICAgICAgYXVkaW8udG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzcmMgICAgIDogdGhpcy5zcmMsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IHRoaXMuZHVyYXRpb25cbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBhdWRpbztcbiAgICB9LFxuICAgIHRyYW5zZm9ybVNyYyh0cmFjaykge3JldHVybiB0cmFjay51cmx9XG59KTtcbm1vZHVsZS5leHBvcnRzID0gU3RhdGlvbkVuZ2luZTtcbnZhciBjdXJyZW50RW5naW5lO1xuZnVuY3Rpb24gU2Vla2VyKGdlbmVyYXRvcikge1xuICAgIGdldEF0Lmhpc3RvcnkgPSBbXTtcbiAgICBnZXRBdC5jdXJzb3IgPSAtMTtcblxuICAgIHJldHVybiBnZXRBdDtcblxuICAgIGZ1bmN0aW9uIGdldEFic29sdXRlKGluZGV4KSB7XG4gICAgICAgIHdoaWxlIChnZXRBdC5oaXN0b3J5Lmxlbmd0aCA8PSBpbmRleClcbiAgICAgICAgICAgIGdldEF0Lmhpc3RvcnkucHVzaChnZW5lcmF0b3IoZ2V0QXQuaGlzdG9yeSkpO1xuICAgICAgICBnZXRBdC5oaXN0b3J5ID0gZ2V0QXQuaGlzdG9yeS5maWx0ZXIoZWwgPT4gZWwgaW5zdGFuY2VvZiBPYmplY3QpO1xuICAgICAgICBnZXRBdC5jdXJzb3IgPSBnZXRBdC5oaXN0b3J5Lmxlbmd0aCAtIDE7XG4gICAgICAgIHJldHVybiBnZXRBdC5oaXN0b3J5W2luZGV4XTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRBdChpbmRleCkgeyByZXR1cm4gZ2V0QWJzb2x1dGUoZ2V0QXQuY3Vyc29yICsgaW5kZXggfHwgMCk7IH1cbn1cblxuZnVuY3Rpb24gZ2V0UmFuZG9tKGFycikgeyByZXR1cm4gYXJyWyhhcnIubGVuZ3RoICogTWF0aC5yYW5kb20oKSkgPj4gMF07IH0gLy8ganNoaW50IGlnbm9yZTpsaW5lXG5cbmZ1bmN0aW9uIFN0YXRpb25FbmdpbmUodHJhY2tMaXN0LCBvblRyYWNrQ2hhbmdlKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFN0YXRpb25FbmdpbmUpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5vblRyYWNrQ2hhbmdlID0gb25UcmFja0NoYW5nZTtcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XG4gICAgdGhpcy5fdm9sdW1lVHdlZW4gPSBuZXcgVFdFRU4uVHdlZW4oe3ZvbHVtZTogMH0pXG4gICAgICAgIC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1aW50aWMuSW5PdXQpXG4gICAgICAgIC5vblVwZGF0ZShmdW5jdGlvbiAoKSB7IGlmIChzZWxmLl9hdWRpbykgc2VsZi5fYXVkaW8udm9sdW1lID0gdGhpcy52b2x1bWUgKiB3aW5kb3cuZ2xvYmFsVm9sdW1lTGV2ZWw7IH0pO1xuXG5cbiAgICB2YXIgcHJvYmFiaWxpdHkgPSBmdW5jdGlvbiAodHJhY2ssIGhpc3RvcnkpIHtcbiAgICAgICAgc3dpdGNoICh0cnVlKSB7XG4gICAgICAgICAgICBjYXNlIChoaXN0b3J5LmluZGV4T2YodHJhY2spID09PSAtMSk6XG4gICAgICAgICAgICBjYXNlIChoaXN0b3J5LmluZGV4T2YodHJhY2spID4gdHJhY2tMaXN0Lmxlbmd0aCk6XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICBjYXNlIChoaXN0b3J5LmluZGV4T2YodHJhY2spIDwgdHJhY2tMaXN0Lmxlbmd0aCAqIDAuNSk6XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiAxIC0gKGhpc3RvcnkuaW5kZXhPZih0cmFjaykgLyB0cmFja0xpc3QubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLl9zZWVrZXIgPSBuZXcgU2Vla2VyKGZ1bmN0aW9uIGdldE5leHRUcmFjayhsaXN0KSB7XG4gICAgICAgIGxpc3QgPSBsaXN0LnNsaWNlKCkucmV2ZXJzZSgpO1xuICAgICAgICB2YXIgbmV4dFRyYWNrO1xuICAgICAgICAvL25vaW5zcGVjdGlvbiBJbmZpbml0ZUxvb3BKU1xuICAgICAgICBkbyBuZXh0VHJhY2sgPSBnZXRSYW5kb20odHJhY2tMaXN0KTtcbiAgICAgICAgd2hpbGUgKE1hdGgucmFuZG9tKCkgPiBwcm9iYWJpbGl0eShuZXh0VHJhY2ssIGxpc3QpKTtcbiAgICAgICAgcmV0dXJuIG5leHRUcmFjaztcbiAgICB9KTtcbn1cblN0YXRpb25FbmdpbmUucHJvdG90eXBlID0ge1xuICAgIG5leHRUcmFjaygpIHtyZXR1cm4gdGhpcy5fc2Vla2VyKDEpO30sXG4gICAgbmV4dCgpIHtcbiAgICAgICAgdmFyIG5leHRUcmFjayA9IHRoaXMubmV4dFRyYWNrKCk7XG4gICAgICAgIGlmICghbmV4dFRyYWNrKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHRoaXMuY3VycmVudFRyYWNrID0gbmV4dFRyYWNrO1xuICAgICAgICB0aGlzLl9hdWRpbyA9IG5ldyBQbGF5KHRoaXMuY3VycmVudFRyYWNrLCB7dm9sdW1lOiB0aGlzLl9hdWRpbyA/IHRoaXMuX2F1ZGlvLnZvbHVtZSA6IHdpbmRvdy5nbG9iYWxWb2x1bWVMZXZlbH0sIHRoaXMubmV4dC5iaW5kKHRoaXMpKTtcbiAgICAgICAgdGhpcy5vblRyYWNrQ2hhbmdlKG5leHRUcmFjayk7XG5cbiAgICB9LFxuICAgIGVuYWJsZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2VuYWJsZWQpIHJldHVybjtcbiAgICAgICAgaWYgKGN1cnJlbnRFbmdpbmUgJiYgY3VycmVudEVuZ2luZSAhPT0gdGhpcykgY3VycmVudEVuZ2luZS5lbmFibGVkID0gZmFsc2U7XG4gICAgICAgIGN1cnJlbnRFbmdpbmUgPSB0aGlzO1xuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5fZGlzYWJsZVRpbWVvdXQpO1xuICAgICAgICB0aGlzLl92b2x1bWVUd2Vlbi5zdG9wKClcbiAgICAgICAgICAgIC50byh7dm9sdW1lOiAxfSwgNTAwKVxuICAgICAgICAgICAgLm9uQ29tcGxldGUoKCkgPT4ge30pXG4gICAgICAgICAgICAuc3RhcnQoKTtcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFRyYWNrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50VHJhY2suc3RhcnRUaW1lKVxuICAgICAgICAgICAgICAgIHRoaXMuX2F1ZGlvLmN1cnJlbnRUaW1lID0gKERhdGUubm93KCkgLSB0aGlzLmN1cnJlbnRUcmFjay5zdGFydFRpbWUpIC8gMTAwMDtcbiAgICAgICAgICAgIHRoaXMuX2F1ZGlvLnBsYXkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm5leHQoKSAhPT0gZmFsc2UpXG4gICAgICAgICAgICAgICAgdGhpcy5fYXVkaW8uY3VycmVudFRpbWUgPSB0aGlzLmN1cnJlbnRUcmFjay5kdXJhdGlvbiAqICgwLjA1ICsgMC4yMCAqIE1hdGgucmFuZG9tKCkpOyAvL2d1YXJhbnRlZWQgcG9zaXRpb24gZnJvbSA1JSB0aHJvdWdoIDI1JSBvZiB0cmFja1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2VuYWJsZWQgPSB0cnVlO1xuICAgIH0sXG4gICAgZGlzYWJsZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9lbmFibGVkKSByZXR1cm47XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy5fdm9sdW1lVHdlZW4uc3RvcCgpXG4gICAgICAgICAgICAudG8oe3ZvbHVtZTogMH0sIDUwMClcbiAgICAgICAgICAgIC5vbkNvbXBsZXRlKCgpID0+IHRoaXMuX2F1ZGlvLnBhdXNlKCkpXG4gICAgICAgICAgICAuc3RhcnQoKTtcbiAgICAgICAgdGhpcy5jdXJyZW50VHJhY2suc3RhcnRUaW1lID0gRGF0ZS5ub3coKSAtIHRoaXMuX2F1ZGlvLmN1cnJlbnRUaW1lICogMTAwMDtcbiAgICAgICAgdGhpcy5fZGlzYWJsZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuX2F1ZGlvLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIHNlbGYuY3VycmVudFRyYWNrID0gbnVsbDtcbiAgICAgICAgfSwgKHRoaXMuY3VycmVudFRyYWNrLmR1cmF0aW9uIC0gdGhpcy5fYXVkaW8uY3VycmVudFRpbWUpICogMTAwMCk7XG4gICAgICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbiAgICB9LFxuICAgIGN1cnJlbnRUcmFjazogbnVsbCxcbiAgICBnZXQgZW5hYmxlZCgpIHtyZXR1cm4gdGhpcy5fZW5hYmxlZH0sXG4gICAgc2V0IGVuYWJsZWQodmFsKSB7XG4gICAgICAgIGlmICh2YWwpIHRoaXMuZW5hYmxlKCk7XG4gICAgICAgIGVsc2UgdGhpcy5kaXNhYmxlKCk7XG4gICAgfVxufTtcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIGNvID0gcmVxdWlyZSgnY28nKTtcbnZhciBzdGFjayA9IFtdLFxuICAgIGNhY2hlID0ge307XG52YXIgdiA9ICc1LjI1Jztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3csICdzdGFjaycsIHtnZXQoKSB7cmV0dXJuIHN0YWNrfX0pO1xuLyoqXG4gKiBAcmV0dXJuIHtQcm9taXNlfVxuICogKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdmtBcGkobWV0aG9kLCBhcmdzLCBwcmlvcml0eSA9IDAsIGNyZWF0ZWRfYXQgPSBEYXRlLm5vdygpKSB7XG4gICAgdmFyIHF1ZXJ5RHVtcCA9IEpTT04uc3RyaW5naWZ5KHttZXRob2QsIGFyZ3N9KTtcbiAgICB2YXIgY2FjaGVkID0gY2FjaGVbcXVlcnlEdW1wXTtcbiAgICBpZiAoY2FjaGVkKSB7XG4gICAgICAgIGNhY2hlW3F1ZXJ5RHVtcF0ucXVlcnkucHJpb3JpdHkgPSBNYXRoLm1heChjYWNoZVtxdWVyeUR1bXBdLnF1ZXJ5LnByaW9yaXR5LCBwcmlvcml0eSk7XG4gICAgICAgIHJldHVybiBjYWNoZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHF1ZXJ5ID0ge1xuICAgICAgICAgICAgbWV0aG9kLFxuICAgICAgICAgICAgYXJncyxcbiAgICAgICAgICAgIHByaW9yaXR5LFxuICAgICAgICAgICAgY3JlYXRlZF9hdFxuICAgICAgICB9O1xuICAgICAgICBjYWNoZVtxdWVyeUR1bXBdID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiAocXVlcnkuY2FsbGJhY2sgPSByZXNvbHZlKSAmJiBzdGFjay5wdXNoKHF1ZXJ5KSk7XG4gICAgICAgIGNhY2hlW3F1ZXJ5RHVtcF0ucXVlcnkgPSBxdWVyeTtcbiAgICAgICAgcmV0dXJuIGNhY2hlW3F1ZXJ5RHVtcF07XG4gICAgfVxufTtcbnZhciByZXNvbHZlU2Vzc2lvbkZuO1xubW9kdWxlLmV4cG9ydHMuc2Vzc2lvbiA9IG5ldyBQcm9taXNlKHJlcyA9PiByZXNvbHZlU2Vzc2lvbkZuID0gcmVzKTtcblxuY28oZnVuY3Rpb24qIG1haW5BcGlDYWxsTG9vcCgpIHtcbiAgICB3aGlsZSAod2luZG93LlZLID09PSB1bmRlZmluZWQpXG4gICAgICAgIHlpZWxkIHNsZWVwKDEwMCk7XG4gICAgdmFyIHNlc3Npb24gPSB5aWVsZCBhdXRoO1xuICAgIHdpbmRvdy5nYSgnc2V0JywgJyZ1aWQnLCBzZXNzaW9uLm1pZCk7XG4gICAgcmVzb2x2ZVNlc3Npb25GbihzZXNzaW9uKTtcbiAgICBjb25zb2xlLmluZm8oJ2F1dGhvcmlzZWQnLCBzZXNzaW9uKTtcbiAgICAvL25vaW5zcGVjdGlvbiBJbmZpbml0ZUxvb3BKU1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIHZhciBleGVjdXRlUXVlcnlMaXN0O1xuICAgICAgICB2YXIgbWF4UXVlcnlDb3VudCA9IFtdO1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgc3RhY2sgPSBzdGFja1xuICAgICAgICAgICAgICAgIC5maWx0ZXIoZWwgPT4gZWwucHJpb3JpdHkgPiAtMTAwKVxuICAgICAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiBhLmNyZWF0ZWRfYXQgLSBiLmNyZWF0ZWRfYXQpXG4gICAgICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IGIucHJpb3JpdHkgLSBhLnByaW9yaXR5KTsgLy9PUkRFUiBCWSBjcmVhdGVkX2F0IEFTQywgcHJpb3JpdHkgQVNDIGVxdWl2XG4gICAgICAgICAgICB2YXIgc2xpY2UgPSAxMDtcbiAgICAgICAgICAgIGlmIChzdGFjayAmJiBzdGFja1syMF0gJiYgc3RhY2tbMjBdLnByaW9yaXR5ID4gMzApIHNsaWNlID0gMjU7XG4gICAgICAgICAgICAvL2lmIChzdGFja1swXSAmJiBzdGFja1swXS5wcmlvcml0eSA+IDApIHNsaWNlIC09IE1hdGgubWF4KCAxNSwgTWF0aC5mbG9vcihzdGFja1swXS5wcmlvcml0eSAvIDUpKTtcbiAgICAgICAgICAgIGV4ZWN1dGVRdWVyeUxpc3QgPSBzdGFjay5zcGxpY2UoMCwgc2xpY2UpO1xuICAgICAgICAgICAgaWYgKGV4ZWN1dGVRdWVyeUxpc3QubGVuZ3RoID4gMCkgYnJlYWs7XG4gICAgICAgICAgICB5aWVsZCBzbGVlcCgxMDApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChleGVjdXRlUXVlcnlMaXN0Lmxlbmd0aCA9PT0gMSkge1xuXG4gICAgICAgICAgICB2YXIgcXVlcnkgPSBleGVjdXRlUXVlcnlMaXN0WzBdO1xuICAgICAgICAgICAgaWYgKCFxdWVyeS5hcmdzLnYpIHF1ZXJ5LmFyZ3MudiA9IHY7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0geWllbGQgY2FsbChxdWVyeS5tZXRob2QsIHF1ZXJ5LmFyZ3MpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5lcnJvcikge1xuICAgICAgICAgICAgICAgIHF1ZXJ5LmNyZWF0ZWRBdCA9IERhdGUubm93KCk7XG4gICAgICAgICAgICAgICAgcXVlcnkucHJpb3JpdHkgPSBNYXRoLm1pbigwLCBxdWVyeS5wcmlvcml0eSAtIDEwKTtcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHF1ZXJ5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcXVlcnkuY2FsbGJhY2socmVzdWx0LnJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBjb2RlID0gW1xuICAgICAgICAgICAgICAgICAgICAndmFyIHJlc3VsdCA9IFtdJyxcbiAgICAgICAgICAgICAgICAgICAgZXhlY3V0ZVF1ZXJ5TGlzdC5tYXAoKHF1ZXJ5KSA9PiBgcmVzdWx0LnB1c2goQVBJLiR7cXVlcnkubWV0aG9kfSgke0pTT04uc3RyaW5naWZ5KHF1ZXJ5LmFyZ3MpfSkpYCkuam9pbignO1xcbicpLFxuICAgICAgICAgICAgICAgICAgICAncmV0dXJuIHJlc3VsdDsnXG4gICAgICAgICAgICAgICAgXS5qb2luKCc7JyksXG4gICAgICAgICAgICAgICAgcHJvY2Vzc1Jlc3VsdCA9IGZ1bmN0aW9uIChleGVjdXRlUXVlcnlMaXN0LCByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZhaWxMaXN0ID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuZXhlY3V0ZV9lcnJvcnMpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4obmV3IEVycm9yKCdWSyBFeGVjdXRlIEVycm9yJyksIGV4ZWN1dGVRdWVyeUxpc3QsIHJlc3VsdCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5lcnJvcilcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihuZXcgRXJyb3IoJ1ZLIEV4ZWN1dGUgRXJyb3InKSwgZXhlY3V0ZVF1ZXJ5TGlzdCwgcmVzdWx0KTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0LnJlc3BvbnNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgZXhlY3V0ZVF1ZXJ5TGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChxdWVyeSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0LnJlc3BvbnNlW2luZGV4XSB8fCByZXN1bHQucmVzcG9uc2VbaW5kZXhdID09PSAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnkuY2FsbGJhY2socmVzdWx0LnJlc3BvbnNlW2luZGV4XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmYWlsTGlzdC5wdXNoKHF1ZXJ5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIHF1ZXJ5IG9mIGZhaWxMaXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeS5jcmVhdGVkQXQgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnkucHJpb3JpdHkgPSBNYXRoLm1pbigwLCBxdWVyeS5wcmlvcml0eSAtIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2gocXVlcnkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy9pZiAoc3RhY2tbMF0gJiYgKHN0YWNrWzBdLnByaW9yaXR5IC0gZXhlY3V0ZVF1ZXJ5TGlzdFswXS5wcmlvcml0eSA+IDEwKSAmJiAoc3RhY2tbMF0ucHJpb3JpdHkgPj0gNTApKVxuICAgICAgICAgICAgICAgIChmdW5jdGlvbiAobGlzdCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsKCdleGVjdXRlJywge3YsIGNvZGV9KSgoZSwgcmVzKSA9PiBwcm9jZXNzUmVzdWx0KGxpc3QsIHJlcykpO1xuICAgICAgICAgICAgICAgIH0pKGV4ZWN1dGVRdWVyeUxpc3QpO1xuICAgICAgICAgICAgLy9lbHNlXG4gICAgICAgICAgICAvLyAgICB7XG4gICAgICAgICAgICAvLyAgICAgICAgcHJvY2Vzc1Jlc3VsdChleGVjdXRlUXVlcnlMaXN0LCB5aWVsZCBjYWxsKCdleGVjdXRlJywge3YsIGNvZGV9KSk7XG4gICAgICAgICAgICAvLyAgICB9XG4gICAgICAgIH1cblxuXG4gICAgICAgIHlpZWxkIHNsZWVwKDM1MCk7XG4gICAgfVxufSgpKSgpO1xuXG5mdW5jdGlvbiBzbGVlcChkdXJhdGlvbikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgc2V0VGltZW91dChjYWxsYmFjaywgZHVyYXRpb24pO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGF1dGgoY2FsbGJhY2spIHtcbiAgICB2YXIgYXBwSURNYXAgPSB7XG4gICAgICAgICc5MS4yMzkuMjYuMTg5JzogNDUyNDIzMyxcbiAgICAgICAgJ3B1YmxpY3JhZGlvLmlvJzogNDU5NzczMlxuICAgIH07XG4gICAgVksuaW5pdCh7YXBpSWQ6IGFwcElETWFwW2xvY2F0aW9uLmhvc3RuYW1lXX0pO1xuXG4gICAgVksuQXV0aC5nZXRMb2dpblN0YXR1cyhmdW5jdGlvbiBnZXRTdGF0dXNDYih7c2Vzc2lvbn0pIHtcbiAgICAgICAgaWYgKHNlc3Npb24pIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmxvY2F0aW9uLmhhc2ggPSAnJztcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHNlc3Npb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgVksuT2JzZXJ2ZXIuc3Vic2NyaWJlKCdhdXRoLmxvZ2luJywgZ2V0U3RhdHVzQ2IpO1xuICAgICAgICAgICAgZG9jdW1lbnQubG9jYXRpb24uaGFzaCA9ICduZWVkQXV0aCc7XG4gICAgICAgIH1cbiAgICB9KVxufVxuXG5mdW5jdGlvbiBjYWxsKG1ldGhvZCwgb3B0cykge1xuICAgIHJldHVybiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgVksuYXBpKG1ldGhvZCwgb3B0cywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG59IiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcInBvcHVwc1xcXCI+PGRpdiB2LWlmPVxcXCJhbmNob3IgPT09ICZxdW90O25lZWRBdXRoJnF1b3Q7XFxcIiBjbGFzcz1cXFwicG9wdXBcXFwiPjxwPlB1YmxpYyBSYWRpbyAtINGN0YLQviDRjdC60YHQv9C10YDQuNC80LXQvdGC0LDQu9GM0L3Ri9C5INC80YPQt9GL0LrQsNC70YzQvdGL0Lkg0L/RgNC+0LXQutGCLjwvcD48cD7QntC9INC/0YDQtdCy0YDQsNGJ0LDQtdGCINC80YPQt9GL0LrQsNC70YzQvdGL0LUg0LPRgNGD0L/Qv9GLINC4INC/0LDQsdC70LjQutC4INC40Lcg0JLQutC+0L3RgtCw0LrRgtC1INCyINC80YPQt9GL0LrQsNC70YzQvdGL0LUg0YDQsNC00LjQvtGB0YLQsNC90YbQuNC4LCDQvtGC0YHQvtGA0YLQuNGA0L7QstCw0L3QvdGL0LUg0L/QviDQstCw0YjQuNC8INC80YPQt9GL0LrQsNC70YzQvdGL0Lwg0LLQutGD0YHQsNC8LjwvcD48cD7QktGB0LUg0LLQvtGB0L/RgNC+0LjQt9Cy0L7QtNC40LzRi9C1INC60L7QvNC/0L7Qt9C40YbQuNC4INCy0LfRj9GC0Ysg0LjQtyDRgdC+0L7RgtCy0LXRgtGB0YLQstGD0Y7RidC40YUg0LPRgNGD0L/QvyDQktC60L7QvdGC0LDQutGC0LUsIFB1YmxpYyBSYWRpbyDQu9C40YjRjCDQstC+0YHQv9GA0L7QuNC30LLQvtC00LjRgiDQuNGFINCyINC/0L7RgNGP0LTQutC1LCDRgdC+0LfQtNCw0Y7RidC10Lwg0L7RidGD0YnQtdC90LjQtSDQv9C+0YfRgtC4INC90LDRgdGC0L7Rj9GJ0LXQs9C+INGA0LDQtNC40L4uPC9wPjxwPtCe0L0g0L/QvtC00LHQuNGA0LDQtdGCINC/0L7QtNGF0L7QtNGP0YnQuNC1INGB0YLQsNC90YbQuNC4INC60LDQuiDQuNC3INCy0LDRiNC40YUsINGC0LDQuiDQuCDQuNC3INGB0L/QtdGG0LjQsNC70YzQvdC+INC+0YLQvtCx0YDQsNC90L3Ri9GFINC00LvRjyDRjdGC0L7QuSDRhtC10LvQuCDQs9GA0YPQv9C/LjwvcD48cD5QdWJsaWMgUmFkaW8gLSDQvdC10LrQvtC80LzQtdGA0YfQtdGB0LrQuNC5INC/0YDQvtC10LrRgi4g0J7QvSDRgdC+0LfQtNCw0L0g0LjRgdC60LvRjtGH0LjRgtC10LvRjNC90L4g0LTQu9GPINGC0L7Qs9C+LCDRh9GC0L7QsdGLINC/0L7Qu9GD0YfQsNGC0Ywg0LXRidC1INCx0L7Qu9GM0YjQtSDRg9C00L7QstC+0LvRjNGB0YLQstC40Y8g0L7RgiDQvdC+0LLQvtC5INC80YPQt9GL0LrQuC48L3A+PHA+0J7QsdGA0LDRgtC40YLQtSDQstC90LjQvNCw0L3QuNC1OiDQtNC70Y8g0L3QvtGA0LzQsNC70YzQvdC+0Lkg0YDQsNCx0L7RgtGLIFB1YmxpYyBSYWRpbyDQvdC10L7QsdGF0L7QtNC40LzQviDQstGL0YHQvtC60L7RgdC60L7RgNC+0YHRgtC90L7QtSDQv9C+0LTQutC70Y7Rh9C10L3QuNC1INC6INGB0LXRgtC4LjwvcD48YSBvbmNsaWNrPVxcXCJWSy5BdXRoLmxvZ2luKGZ1bmN0aW9uKCl7fSwgMTApXFxcIiBjbGFzcz1cXFwicG9wdXAtYnV0dG9uIGlzLXZrXFxcIj7QktC+0LnRgtC4INGH0LXRgNC10Lcg0JLQmjwvYT48L2Rpdj48L2Rpdj48aGVhZGVyIGNsYXNzPVxcXCJoZWFkZXJcXFwiPjxzcGFuPjxzcGFuIHYtc2hvdz1cXFwiY3VycmVudFN0YXRpb24ubmFtZVxcXCI+PGEgaHJlZj1cXFwiaHR0cDovL3ZrLmNvbS97e2N1cnJlbnRTdGF0aW9uLnNjcmVlbl9uYW1lfX1cXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj57e2N1cnJlbnRTdGF0aW9uLm5hbWV9fTwvYT4mbmJzcDtvbiZuYnNwOzwvc3Bhbj48YSBocmVmPVxcXCJodHRwczovL3ZrLmNvbS9wdWJsaWMucmFkaW9cXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5QdWJsaWMgUmFkaW88L2E+PC9zcGFuPjxkaXYgdi1zaG93PVxcXCJjdXJyZW50U3RhdGlvbi5pZFxcXCIgdi1jbGFzcz1cXFwiaWNvbi1saWtlOiFjdXJyZW50U3RhdGlvbi5pc19tZW1iZXIsIGljb24tZGlzbGlrZTogY3VycmVudFN0YXRpb24uaXNfbWVtYmVyXFxcIiBkYXRhLXRvb2x0aXA9XFxcInt7Y3VycmVudFN0YXRpb24uaXNfbWVtYmVyID8gJ9Ce0YLQvNC10L3QuNGC0Ywg0L/QvtC00L/QuNGB0LrRgycgOiAn0J/QvtC00L/QuNGB0LDRgtGM0YHRjyd9fVxcXCIgY2xhc3M9XFxcImxpa2VcXFwiPjxkaXYgaWQ9XFxcInN1YnNjcmliZVRvR3JvdXBcXFwiIHN0eWxlPVxcXCJvcGFjaXR5OiAwOyAtd2Via2l0LXRyYW5zZm9ybTogc2NhbGUoMik7LW1vei10cmFuc2Zvcm06IHNjYWxlKDIpO3RyYW5zZm9ybTogc2NhbGUoMik7d2lkdGg6IDJlbTtoZWlnaHQ6IDJlbTttYXJnaW46IDEycHggMCAwIDBweDtcXFwiPjwvZGl2PjwvZGl2PjxkaXYgdi1jbGFzcz1cXFwiaWNvbi12b2x1bWUtbXV0ZTogdm9sdW1lID09IDAsIGljb24tdm9sdW1lOiB2b2x1bWUgIT0gMFxcXCIgdi1pZj1cXFwiY3VycmVudFN0YXRpb24uaWRcXFwiIGNsYXNzPVxcXCJ2b2x1bWVcXFwiPjwhLS12LXNob3c9J2N1cnJlbnRTdGF0aW9uLmlkJywtLT48ZGl2IHN0eWxlPVxcXCJ3aWR0aDoxMDAlO2hlaWdodDoxMDAlO2N1cnNvcjpwb2ludGVyO3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MTAwXFxcIiB2LW9uPVxcXCJjbGljazogZG9NdXRlXFxcIj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJvdmVybGF5XFxcIj48aW5wdXQgdHlwZT1cXFwicmFuZ2VcXFwiIHYtbW9kZWw9XFxcInZvbHVtZVxcXCIgbWF4PVxcXCIxMDBcXFwiLz48L2Rpdj48L2Rpdj48ZGl2IHYtc3R5bGU9XFxcImJhY2tncm91bmQtaW1hZ2U6ICd1cmwoJysgY3VycmVudFN0YXRpb24uYXZhdGFyICsgJyknXFxcIiB2LXRvb2x0aXAtY3VycmVudC1zdGF0aW9uPVxcXCJ2LXRvb2x0aXAtY3VycmVudC1zdGF0aW9uXFxcIiBjbGFzcz1cXFwic3RhdGlvbkFydFxcXCI+PC9kaXY+PC9oZWFkZXI+PG1haW4+PGFydGljbGUgdi1yZXBlYXQ9XFxcInN0YXRpb25zIHwgdGhyZXNob2xkIGdlbnJlQ29tcGF0aWJpbGl0eSA2MFxcXCIgdi1jb21wb25lbnQ9XFxcInN0YXRpb25cXFwiIGNsYXNzPVxcXCJzdGF0aW9uLWNvbnRhaW5lclxcXCI+PC9hcnRpY2xlPjxkaXYgY2xhc3M9XFxcInByZWxvYWQtY29udGFpbmVyXFxcIj48ZGl2IHN0eWxlPVxcXCJtYXJnaW46IC0yNHB4IDIwcHggNDhweDtcXFwiIGNsYXNzPVxcXCJjc3NwaW5uZXJcXFwiPjwvZGl2PjxkaXYgc3R5bGU9XFxcInRleHQtYWxpZ246Y2VudGVyXFxcIiBjbGFzcz1cXFwiYW5ub3VuY2VcXFwiPjxwPlB1YmxpYyByYWRpbyDQv9C+0LvRg9GH0LDQtdGCINC90LXQvtCx0YXQvtC00LjQvNGL0LUg0LTQsNC90L3Ri9C1INC40LcgVksuPC9wPjxwPtCn0LXRgNC10LcgMTAtMTUg0YHQtdC60YPQvdC0INCy0Ysg0YPQttC1INGB0LzQvtC20LXRgtC1INC90LDRh9Cw0YLRjCDRgdC70YPRiNCw0YLRjCDRgdGC0LDQvdGG0LjQuCwg0YHQvtC30LTQsNC90L3Ri9C1INC40Lcg0LLQsNGI0LjRhSDQs9GA0YPQv9C/IFZLLjwvcD48YnIvPjxwPtCX0LDQs9GA0YPQt9C60LAg0LzRg9C30YvQutCw0LvRjNC90YvRhSDQs9GA0YPQv9C/LCDQutC+0YLQvtGA0YvQtSDQvNC+0LPRg9GCINCy0LDQvCDQv9C+0L3RgNCw0LLQuNGC0YzRgdGPLCDQuCDRgNCw0YHRh9C10YIg0L/QtdGA0YHQvtC90LDQu9GM0L3Ri9GFINGA0LXQutC+0LzQtdC90LTQsNGG0LjQuSDQvNC+0LbQtdGCINC30LDQvdGP0YLRjCDQutCw0LrQvtC1LdGC0L4g0LLRgNC10LzRjy48L3A+PHA+0J/QtdGA0LLRi9C1INC90LXRgdC60L7Qu9GM0LrQviDQvNC40L3Rg9GCINC90LXQutC+0YLQvtGA0YvQtSDQuNC3INC/0YDQtdC00LvQvtC20LXQvdC90YvRhSDRgdGC0LDQvdGG0LjQuSDQvNC+0LPRg9GCINC90LUg0YHQvtC+0YLQstC10YLRgdGC0LLQvtCy0LDRgtGMINCy0LDRiNC40Lwg0LzRg9C30YvQutCw0LvRjNC90YvQvCDQstC60YPRgdCw0LwuPC9wPjwvZGl2PjwvZGl2PjwvbWFpbj48Zm9vdGVyIHYtc2hvdz1cXFwiY3VycmVudFN0YXRpb24gJmFtcDsmYW1wOyBjdXJyZW50VHJhY2tcXFwiIGNsYXNzPVxcXCJwbGF5ZXJcXFwiPjxkaXYgY2xhc3M9XFxcInBsYXllci1jb250YWluZXJcXFwiPjxkaXYgdi1zdHlsZT1cXFwiYmFja2dyb3VuZC1pbWFnZTogJ3VybCgnKyBjdXJyZW50VHJhY2suYXJ0LnBob3RvXzYwNCArICcpJ1xcXCIgY2xhc3M9XFxcImFsYnVtQXJ0XFxcIj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJwbGF5ZXItdHJhY2staW5mb1xcXCI+PHNwYW4gY2xhc3M9XFxcInBsYXllci10cmFjay1pbmZvLXRpdGxlXFxcIj57e2N1cnJlbnRUcmFjay50aXRsZX19PC9zcGFuPjxkaXYgY2xhc3M9XFxcInBsYXllci10cmFjay1pbmZvLWFydGlzdFxcXCI+Ynkge3tjdXJyZW50VHJhY2suYXJ0aXN0IHx8ICc/Pz8nfX08L2Rpdj48L2Rpdj48ZGl2IHYtY2xhc3M9XFxcImljb24tbGlrZTohY3VycmVudFRyYWNrLmFkZGVkLCBpY29uLWxpa2VkOiBjdXJyZW50VHJhY2suYWRkZWQsIGRpc2FibGVkOiBjdXJyZW50VHJhY2suYWRkZWRcXFwiIHYtb249XFxcImNsaWNrOiBsaWtlQ3VycmVudFRyYWNrXFxcIiBjbGFzcz1cXFwibGlrZVxcXCI+PC9kaXY+PGRpdiB2LXN0eWxlPVxcXCJ3aWR0aDogY3VycmVudFByb2dyZXNzICogMTAwICsgJnF1b3Q7JSZxdW90O1xcXCIgY2xhc3M9XFxcInBsYXllci1wcm9ncmVzc1xcXCI+PC9kaXY+PC9kaXY+PC9mb290ZXI+XCJcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8YSB2LXN0eWxlPVxcXCJiYWNrZ3JvdW5kLWltYWdlOiAndXJsKCcrIGF2YXRhciArICcpJ1xcXCIgZGF0YS1uYW1lPVxcXCJ7e3NjcmVlbl9uYW1lfX1cXFwiIHYtb249XFxcImNsaWNrOiBzZXRBc0N1cnJlbnRcXFwiIHYtY2xhc3M9XFxcImN1cnJlbnQ6IGlkID09PSBjdXJyZW50U3RhdGlvbi5pZCwgbm9BbmltYXRpb246IHNob3duXFxcIiBjbGFzcz1cXFwic3RhdGlvblxcXCI+PGRpdiB2LWlmPVxcXCJpZCAhPT0gY3VycmVudFN0YXRpb24uaWRcXFwiIGNsYXNzPVxcXCJzdGF0aW9uLWFjdGlvbi1wbGF5XFxcIj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJzdGF0aW9uLWluZm8gaXMtaGFzLW9ubHktY2hpbGRcXFwiPjxkaXYgY2xhc3M9XFxcInN0YXRpb24taW5mby1saW5lXFxcIj57e25hbWV9fTwvZGl2PjwvZGl2PjwvYT5cIlxuIl19
