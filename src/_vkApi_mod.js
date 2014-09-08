var co = require('co');
var stack = [];

module.exports = function vkApi(method, args, callback, priority = 0, created_at = Date.now()) {
    stack.push({method, args, callback, priority, created_at});
};

co(function* mainApiCallLoop() {
    while (window.VK === undefined)
        yield sleep(100);
    var session = yield auth;
    console.info('authorised', session);
    //noinspection InfiniteLoopJS
    while (true) {
        while (true) {
            stack = tasks
                .sort((a, b)=> b.created_at - a.created_at)
                .sort((a, b) => b.priority - a.priority); //ORDER BY created_at ASC, priority ASC equiv
            executeQueryList = stack.splice(0, 25);
            if (executeQueryList.length > 0) break;
            yield sleep(100);
        }

        var code = [
            'var result = []',
            executeQueryList.map(({method, args})=>`result.push(API.${method}(${JSON.stringify(args)}))`).join(';\n'),
            'return result;'
        ].join(';'),
            result = yield call('execute', {v: '5.21', code}),
            executeQueryList,
            failList = [];

        if (result.execute_errors)
            console.error(new Error('VK Execute Error'), executeQueryList, result);

        if (result.error)
            console.error(new Error('VK Execute Error'), executeQueryList, result);

        if (result.response)
            executeQueryList.forEach(function(query, index){
                if (result.response[index])
                    query.callback(result.response[index]);
                else
                    failList.push(query);
            });

        for (var query of failList) {
            query.createdAt = Date.now();
            query.priority = Math.min(0, query.priority);
            stack.push(query);
        }

        yield sleep(400);
    }
}());

function sleep(duration) {
    return function (callback) {
        setTimeout(callback, duration);
    }
}
function auth(callback) {
    VK.Auth.getLoginStatus(function getStatusCb({session}) {
        if (session) {
            document.location.hash = '';
            callback(session);
        }
        else {
            VK.Observer.subscribe('auth.login', getStatusCb);
            document.location.hash = 'needAuth';
        }
    })
}

function call(method, opts) {
    return function(callback){
        VK.api(method, opts, callback);
    }
}