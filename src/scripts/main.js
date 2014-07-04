require('../lib/audio.js');
var Vue = require('vue'),
    page = require('page'),
    ready = require('../lib/ready'),
    el = document.documentElement,
    vm = window.vm = new Vue({
        el,
        data   : {stations: [], currentStation: null},
        methods: { setStation(nameOrId) {
            var station = Station.find(nameOrId);
            page('?' + station.screen_name);
        } }
    }),
    data = vm.$data;

class Station {
    constructor(props, tracks = []) {
        if (Station.find(props.id)) throw new TypeError('already registered station');
        if (tracks.length < 30) throw new TypeError('too small tracklist');
        for (var key of Object.keys(props))
            this[key] = props[key];
        this.trackList = tracks.slice();
        this._real = false;
        console.info('registred station', this);
        Station.register(this);
    }

    get dump() {
        return {
            avatar     : this.photo_200,
            id         : this.id,
            name       : this.name,
            screen_name: this.screen_name
        }
    }

    disablePlayer() {
        if (this.player)
            this.player.pause();
        delete this.player;
    }

    play() {
        if (Station.current && Station.current !== this)
            Station.current.stop();

        Station.current = this;

        if (this.fakePlayer) {
            this.playTrack(this.fakePlayer.src, this.fakePlayer.currentTime);
            delete this.fakePlayer;
        } else {
            this.playTrack(this.nextTrack)
        }
    }

    stop() {
        if (this.player) {
            var src = this.player.src,
                startTime = this.player.currentTime;
            this.fakePlayer = document.createElement('mock-audio');
            this.fakePlayer.src = src;
            this.fakePlayer.autoplay = true;
            this.fakePlayer.addEventListener('canplay', e => this.fakePlayer.currentTime = startTime);
            this.fakePlayer.addEventListener('ended', e => delete this.fakePlayer);
            this.disablePlayer();
        }
    }

    playTrack(src, startTime) {
        this.disablePlayer();

        this.player = document.createElement('audio');
        this.player.autoplay = true;
        if (startTime === undefined)
            startTime = TrackDB[src].duration * .5 * (Math.random() / 2 + .5); //setting start time between 0.25 and 0.5 of track duration
        if (startTime !== 0)
            this.player.addEventListener('canplay', e => this.currentTime = startTime);
        this.player.addEventListener('ended', e => this.playTrack(this.nextTrack, 0));
        this.player.src = src;
    }

    get nextTrack() { return this.trackList[Math.floor(Math.random() * (this.trackList.length - 1))]; }
}

Station.all = [];

Station.register = function registerStation(station) {
    Station.all.push(station);
    console.info('pushing station to list', station, Station.onRegister);
    if (Station.onRegister instanceof Function)
        Station.onRegister(station);
};

Station.find = function findStation(nameOrId) {
    if (nameOrId instanceof Station) return nameOrId;
    return Station.all.filter((s)=>s.id === nameOrId)[0]
        || Station.all.filter((s)=>s.screen_name === nameOrId)[0];
};

Station.load = function loadStation(nameOrId) {
    if (!nameOrId)
        return Promise.reject();
    if (nameOrId instanceof Station)
        return Promise.resolve(nameOrId);

    var station = Station.find(nameOrId);
    if (station)
        return Promise.resolve(station);

    return getStationsById(nameOrId).then(([station])=>Promise.resolve(station));
};


window.TrackDB = window.TrackDB || {};

var {getUserStations, searchStations, getStationsById, loadStation} = (function () {

    var tasks = [];

    function isMusical(groupId, value) {
        var isMusicalKey = ['group', groupId, 'isMusical'].join(':');
        if (value !== undefined)
            localStorage[isMusicalKey] = value ? 1 : 0;
        else if (localStorage[isMusicalKey] === undefined)
            return undefined;
        else
            return Boolean(Number(localStorage[isMusicalKey]));

    }

    function createGroupLoadPromise(priority, itemSet) {
        var items = itemSet.items || itemSet;
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
        console.info('loading station', groupInfo);
        var station = Station.find(groupInfo.id);
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
                        window.TrackDB[audio.url] = {
                            artist  : audio.artist,
                            title   : audio.title,
                            duration: audio.duration
                        };

                    try {
                        new Station(groupInfo, audios.map(a => a.url));
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

    function getStationsById(ids, priority) {
        Array.isArray(ids) && (ids = ids.join(','));
        if (!ids)
            return Promise.reject();
        else
            return api('groups.getById', {group_ids: ids}, priority)
                .then(createGroupLoadPromise.bind(this, priority));
    }

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
            VK.Auth.getLoginStatus(function getStatusCb({session}) {
                if (session) {
                    resolve(session);
                } else {
                    VK.Observer.subscribe('auth.login', getStatusCb);
                    document.location.hash = 'needAuth';
                }
            })
        })
            .then(function (session) {
                console.info('authorised', session);
                document.location.hash = '';
                var timeout = 350,
                    UP_K = 1.1,
                    MAX_TASKS = 20;


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
                    if (!taskList.length) return;

                    var exec_body = taskList.map(({method, args})=>`result.push(API.${method}(${JSON.stringify(args)}))`),
                        code = ['var result = []'].concat(exec_body).concat('return result;').join(';\n');

                    VK.api('execute', {v: '5.21', code},
                        function (result) {
                            if (result.execute_errors) {
                                console.error(new Error('VK Execute Error'), taskList, result);
                            }

                            if (result.error) {
                                timeout *= UP_K;
                                tasks = tasks.concat(taskList);
                            } else {
                                taskList.filter((a, index)=>result.response[index]).forEach(({callback}, index) => callback(result.response[index]));
                            }
                        });
                }
            })
    }();
    return {getUserStations, searchStations, getStationsById, loadStation};
})();


Station.onRegister = function (station) {
    console.debug('adding station to viewmodel', station);
    data.stations.push(station.dump);
};
getUserStations();

page('*', function ({querystring}) {
    Station.load(querystring.split('&')[0])
        .then(function (station) {
            console.info('attepmting to play', station);
            station.play();
            data.currentStation = station.dump;
        })
        .catch(function (e) {
            throw e;
        });
});
ready(()=>page({dispatch: true}));
