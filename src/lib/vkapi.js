var co = require('co'),
    Station = require('./station').Station,
    tasks = [];

window.TrackDB = window.TrackDB || {};

function isMusical(groupId, value) {
    if (value !== undefined)
        localStorage[groupId] = value ? 1 : 0;
    else if (localStorage[groupId] === undefined)
        return undefined;
    else
        return Boolean(Number(localStorage[groupId]));

}

function createGroupLoadPromise(priority, {items}) {
    return Promise.all(items.map(record => {
        switch (isMusical(record.id)) {
            case (undefined):
                return loadStation(record, priority + 1);
            case (true):
                return loadStation(record, priority);
        }
    }).filter(a=>a))
}

function loadStation(groupInfo, priority) {
    var station = Station.find(record.id);
    if (station)
        return Promise.resolve(station);
    else
        return api('wall.get', {owner_id: -groupInfo.id, count: 20}, priority)
            .then(function ({items}) {
                var audios = items
                    .map(item => item.attachments)
                    .filter(a => Array.isArray(a))
                    .reduce((a, b)=> a.concat(b))
                    .filter(a => 'audio' === a.type)
                    .map(a => a.audio)
                    .filter(a => a.duration > 15);

                for (var audio of audios)
                    window.TrackDB[audio.src] = {
                        artist  : audio.artist,
                        title   : audio.title,
                        duration: audio.duration
                    };

                try {
                    new Station(groupInfo, audios.map(a => a.src));
                    isMusical(groupInfo.id, true);
                } catch (e) {
                    console.error(e);
                    isMusical(groupInfo.id, false);
                }
            });
}

function getUserStations(userId, priority) {
    return api('groups.get', {user_id: userId, filter: 'groups,publics', count: 1000, extended: 1, fields: 'links'}, priority)
        .then(createGroupLoadPromise.bind(this, priority));
}
function searchStations(query, priority) {
    return api('groups.search', {q: query, filter: 'groups,publics', count: 1000, extended: 1, fields: 'links'}, priority)
        .then(createGroupLoadPromise.bind(this, priority));
}

export {getUserStations, searchStations, loadStation};


function api(method, args, priority = 0) {
    return new Promise(resolve => tasks.push({
        created_at: Date.now(),
        priority  : Math.floor(Number(priority) || 0),
        callback  : resolve,
        method, args
    }))
}


void function init() {
    VK.init({apiId: 4360607});
    new Promise(function authPromise(resolve) {
        VK.Observer.subscribe('auth.login', authPromise.bind(this, resolve));
        VK.Auth.getLoginStatus(({sess}) => sess ? resolve(sess) : document.location.hash = 'needAuth');
    }).then(function (session) {
            document.location.hash = '';
            var timeout = 350,
                UP_K = 1.1,
                MAX_TASKS = 24;


            void function loop() {
                tasks = tasks
                    .sort((a, b)=> b.created_at - a.created_at)
                    .sort((a, b) => b.priority - a.priority); //ORDER BY created_at ASC, priority ASC equiv
                if (tasks.length) {
                    var executableTasks = tasks
                        .filter(task => task.priority === tasks[0].priority)
                        .slice(0, MAX_TASKS - 1);
                    executeTasks(executableTasks);
                    tasks = tasks.slice(executableTasks.length);
                }
                setTimeout(loop, timeout);
            }();

            function executeTasks(taskList) {
                var exec_code = taskList.map(function ({method, args}) {
                    return `result.push(API.${method})(${JSON.stringify(args)})`
                }).join(';');

                VK.api('execute', {
                    v   : '5.21',
                    code: `var result=[];${exec_code};return result;`
                }, function (result) {
                    if (result.execute_errors) {
                        console.error(new Error('VK Execute Error'), taskList, result);
                    }

                    if (result.error) {
                        timeout *= UP_K;
                        tasks = tasks.concat(taskList);
                    } else {
                        taskList.forEach(({callback}, index) => callback(result.response[index]));
                    }
                });
            }
        })
}();