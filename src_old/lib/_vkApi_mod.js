var co = require('co');
var stack = [],
    cache = {};

module.exports = function vkApi(method, args, priority = 0, created_at = Date.now()) {
    console.log('created task: ', ...[].slice.call(arguments));
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
            created_at,
            callback: resolve
        };
        cache[queryDump] = new Promise(resolve => stack.push(query));
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
        while (true) {
            stack = stack
                .filter( el => el.priority > -100 )
                .sort((a, b) => b.created_at - a.created_at)
                .sort((a, b) => b.priority - a.priority); //ORDER BY created_at ASC, priority ASC equiv
            executeQueryList = stack.splice(0, 25);
            if (executeQueryList.length > 0) break;
            yield sleep(100);
        }

        var code = [
                'var result = []',
                executeQueryList.map((query) => `result.push(API.${query.method}(${JSON.stringify(query.args)}))`).join(';\n'),
                'return result;'
            ].join(';'),
            result = yield call('execute', {v: '5.24', code}),
            executeQueryList,
            failList = [];

        if (result.execute_errors)
            console.error(new Error('VK Execute Error'), executeQueryList, result);

        if (result.error)
            console.error(new Error('VK Execute Error'), executeQueryList, result);

        if (result.response)
            executeQueryList.forEach(function (query, index) {
                if (result.response[index])
                    query.callback(result.response[index]);
                else
                    failList.push(query);
            });

        for (var query of failList) {
            query.createdAt = Date.now();
            query.priority = Math.min(0, query.priority - 10);
            stack.push(query);
        }

        yield sleep(400);
    }
}())();

function sleep(duration) {
    return function (callback) {
        setTimeout(callback, duration);
    }
}
function auth(callback) {
    VK.init({apiId: 4524233});

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