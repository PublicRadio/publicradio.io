"use strict";
var co = require('co');
var stack = [],
    cache = {};
var v = '5.25';
Object.defineProperty(window, 'stack', {get() {return stack}});
/**
 * @return {Promise}
 * */
module.exports = function vkApi(method, args, priority = 0, created_at = Date.now()) {
    var queryDump = JSON.stringify({method, args});
    var cached = cache[queryDump];
    if (cached) {
        cache[queryDump].query.priority = Math.max(cache[queryDump].query.priority, priority);
        return cached;
    } else {
        var query = {
            method,
            args,
            priority,
            created_at
        };
        cache[queryDump] = new Promise(resolve => (query.callback = resolve) && stack.push(query));
        cache[queryDump].query = query;
        return cache[queryDump];
    }
};
var resolveSessionFn;
module.exports.session = new Promise(res => resolveSessionFn = res);

co(function* mainApiCallLoop() {
    while (window.VK === undefined)
        yield sleep(100);
    var session = yield auth;
    resolveSessionFn(session);
    console.info('authorised', session);
    //noinspection InfiniteLoopJS
    while (true) {
        var executeQueryList;
        var maxQueryCount = [];
        while (true) {
            stack = stack
                .filter(el => el.priority > -100)
                .sort((a, b) => a.created_at - b.created_at)
                .sort((a, b) => b.priority - a.priority); //ORDER BY created_at ASC, priority ASC equiv
            var slice = 10;
            if (stack && stack[20] && stack[20].priority > 30) slice = 25;
            //if (stack[0] && stack[0].priority > 0) slice -= Math.max( 15, Math.floor(stack[0].priority / 5));
            executeQueryList = stack.splice(0, slice);
            if (executeQueryList.length > 0) break;
            yield sleep(100);
        }
        if (executeQueryList.length === 1) {

            var query = executeQueryList[0];
            if (!query.args.v) query.args.v = v;
            var result = yield call(query.method, query.args);
            if (result.error) {
                query.createdAt = Date.now();
                query.priority = Math.min(0, query.priority - 10);
                stack.push(query);
            } else {
                query.callback(result.response);
            }
        } else {
            var code = [
                    'var result = []',
                    executeQueryList.map((query) => `result.push(API.${query.method}(${JSON.stringify(query.args)}))`).join(';\n'),
                    'return result;'
                ].join(';'),
                processResult = function (executeQueryList, result) {
                    var failList = [];
                    if (result.execute_errors)
                        console.warn(new Error('VK Execute Error'), executeQueryList, result);

                    if (result.error)
                        console.warn(new Error('VK Execute Error'), executeQueryList, result);

                    if (result.response)
                        executeQueryList.forEach(function (query, index) {
                            if (result.response[index] || result.response[index] === '')
                                query.callback(result.response[index]);
                            else
                                failList.push(query);
                        });

                    for (var query of failList) {
                        query.createdAt = Date.now();
                        query.priority = Math.min(0, query.priority - 10);
                        stack.push(query);
                    }
                };

            if (stack[0] && (stack[0].priority >= executeQueryList[0].priority) && (stack[0].priority >= 20))
                (function (list) {
                    call('execute', {v, code})((e, res) => processResult(list, res));
                })(executeQueryList);
            else
                {
                    processResult(executeQueryList, yield call('execute', {v, code}));
                }
        }


        yield sleep(350);
    }
}())();

function sleep(duration) {
    return function (callback) {
        setTimeout(callback, duration);
    }
}
function auth(callback) {
    var appIDMap = {
        '91.239.26.189': 4524233,
        'publicradio.io': 4593403
    };
    VK.init({apiId: appIDMap[location.hostname]});

    VK.Auth.getLoginStatus(function getStatusCb({session}) {
        if (session) {
            document.location.hash = '';
            callback(null, session);
        }
        else {
            VK.Observer.subscribe('auth.login', getStatusCb);
            document.location.hash = 'needAuth';
        }
    })
}

function call(method, opts) {
    return function (callback) {
        VK.api(method, opts, function (data) {
            callback(null, data);
        });
    }
}