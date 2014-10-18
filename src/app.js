//noinspection BadExpressionStatementJS
"use strict";
require('./_prepare-enviroment');
require('./components/_index');


var Vue       = require('vue'),
    co        = require('co'),
    Group     = require('./_group'),
    storage   = require('asyncstorage'),
    //mbApi     = require('./lib/_mbApi_mod.js'),
    vkApi     = require('./lib/_vkApi_mod.js'),
    adviceDog = require('./lib/_adviceDog.js');

var badGroups = {
    get: function () {
        return storage.get('groups::bad').then(a => Array.isArray(a) ? a : []);
    },
    add: function (id) {
        var station = vm.stationMap[id];
        if (station) {
            delete vm.stationMap[id];
            vm.stations.remove(station);
            if (!station.is_member)
                adviceDog(id, getTagsForAdviceDog(station.tracks), 0);
        }

        return storage.get('groups::bad').then(function (groups) {
            if (groups.indexOf(id) === -1) {
                groups.push(id);
                return storage.set('groups::bad', groups);
            }
            else
                return Promise.resolve();
        })
    }
};

function getTagsForAdviceDog(tracks) {
    var filteredTracks = tracks.filter(({genre_id}) => genre_id && genre_id != 18 && genre_id <= 22);
    var genreMap = filteredTracks.map(({genre_id})=>genre_id).reduce((acc, id)=> (acc[id] = (acc[id] || 0) + 1) && acc, {});
    var out = [];
    for (var i = 0; i <= 22; i++)
        out[i] = (genreMap[i] || 0) / filteredTracks.length;
    return out;
}


Vue.filter('threshold', function (array, param, count) {
    return array.sort((a, b)=> b[param] - a[param]).slice(0, Number(count));
});

Vue.directive('tooltip-current-station', {
    isEmpty: true,
    bind   : function () {
        var self = this,
            $el = $(this.el);
        $el
            .tooltipster({
                contentAsHTML: true,
                interactive  : true
            })
            .tooltipster('disable');
        $el
            .mouseover(function () {
                if (self.vm.currentStation.id)
                    $el.tooltipster('enable')
                        .tooltipster('content', '<iframe height=440px src=https://vk.com/widget_community.php?app=0&width=300px&_ver=1&gid=' + self.vm.currentStation.id + '&mode=2&color3=ff6d00&height=40000 ></iframe>');

            });
    }
});
Vue.directive('tooltip', {
    isLiteral: true,
    bind     : function () {
        var self = this,
            $el = $(this.el);
        $el
            .tooltipster({
                contentAsHTML: true,
                interactive  : true
            })
            .tooltipster('disable');
        $el
            .mouseover(function () {
                if (self.vm.currentStation.id)
                    $el.tooltipster('enable')
                        .tooltipster('content', '<iframe height=440px src=https://vk.com/widget_community.php?app=0&width=300px&_ver=1&gid=' + self.vm.currentStation.id + '&mode=2&color3=ff6d00&height=40000 ></iframe>');

            });
    }
});

var vm = new Vue({
    el      : document.querySelector('#content'),
    template: require('./templates/_app.html.jade'),
    data    : {
        stations         : [],
        suggestedStations: [],
        stationsMap      : {},
        currentStation   : null,
        currentTrack     : null,
        currentProgress  : 0,
        anchor           : ''
    },
    methods : {
        likeCurrentTrack() {
            var self = this;
            var track = this.currentTrack;
            co((function*() {
                track.added = true;
                if (!self.currentStation.is_member)
                    self.currentStation.genreCompatibility = Math.max(1, self.currentStation.genreCompatibility + .05);

                var session = yield vkApi.session;
                yield self.userAlbumsPromise;
                if (track !== self.currentTrack) return;
                var currentAlbum;
                var title = 'publicRadio.io // ' + self.currentStation.name + ' (' + self.currentStation.screen_name + ')';
                if (currentAlbum = self.userAlbums.filter(({title}) =>
                        title.startsWith('publicRadio.io') &&
                        title.endsWith('(' + self.currentStation.screen_name + ')')
                    )[0]) {
                    currentAlbum.title = title;
                    yield vkApi('audio.editAlbum', currentAlbum, 100);
                } else {
                    var {album_id} = yield vkApi('audio.addAlbum', {title}, 100);
                    self.userAlbums.push(currentAlbum = {album_id, title});
                }
                if (track !== self.currentTrack) return;
                var aid = yield vkApi('audio.add', {audio_id: track.id, owner_id: track.owner_id}, 100);
                yield [
                    vkApi('audio.moveToAlbum', {album_id: currentAlbum.album_id, audio_ids: aid}, 100),
                    vkApi('audio.edit', {
                        owner_id: session.mid,
                        audio_id: aid,
                        title   : self.currentTrack.title + ' (найдено на PublicRadio.io)'
                    }, 100)
                ];
            })())();
        },
        setGroupAsBad(groupId) {
            badGroups.add(groupId);
        }
    },
    created() {
        this.$on('stationChange', function ({station}) {
            history.replaceState({}, station.name + ' at Public Radio', '?' + station.screen_name);
            this.currentStation = station;
        });
    },
    ready() {
        var self = this;
        window.addEventListener("hashchange", function () {
            self.anchor = document.location.hash.replace('#', '');
        }, false);
        this.$watch('currentStation', function () {
            this.currentStation._engine.enabled = true;
            document.querySelector('#subscribeToGroup').innerHTML = '';
            VK.Widgets.Subscribe("subscribeToGroup", {mode: 1, soft: 1}, -this.currentStation.id);
        });
        VK.Observer.subscribe("widgets.subscribed", function f() {
            self.currentStation.is_member = true;
        });
        VK.Observer.subscribe("widgets.unsubscribed", function f() {
            self.currentStation.is_member = false;
        });

        var group;
        requestAnimationFrame(function tick() {
            requestAnimationFrame(tick, self.$el);
            if (self.currentStation && self.currentStation._engine && self.currentStation._engine._audio)
                self.currentProgress = self.currentStation._engine._audio.currentTime / self.currentStation._engine._audio.duration;
        }, self.$el);
        co((function* () {
            var currentStationName = location.search.split('?').slice(-1)[0];
            var queries = [badGroups.get(), getUserGroups(), getPopularGroups()];
            if (currentStationName)
                queries.push(vkApi('groups.getById', {group_id: currentStationName, v: '5.25'}));
            var [badGroupList, {items: userGroups}, {items: popularGroups}, pickedGroup] = yield queries,
                userGroupIDs = userGroups.map(group => group.id);
            self.badGroups = badGroupList;
            if (Array.isArray(pickedGroup)) {
                var group = pickedGroup[0];
                new Group(group, {is_member: userGroups.map(el => el.id).indexOf(group.id) !== -1}, self, {
                    forced  : true,
                    autoplay: true
                });
            }
            for (group of userGroups)
                if (badGroupList.indexOf(group.id) === -1)
                    new Group(group, {is_member: true}, self);
            for (group of popularGroups)
                if (badGroupList.indexOf(group.id) === -1)
                    new Group(group, {is_member: false}, self);
                else
                    Group.bad(group);
        })())();
        this.userAlbums = [];
        var r;
        this.userAlbumsPromise = new Promise(resolve => self.userAlbumsPromiseResolve = resolve);
        co(function*() {
            var result = yield vkApi('audio.getAlbums', {offset: 0, count: 100}, 100);
            var requests = [],
                offset = 0;
            while ((++offset) * 100 < result.count) {
                requests.push(vkApi('audio.getAlbums', {offset: offset * 100, count: 100}, 100));
            }
            var otherResults = yield requests;
            self.userAlbums = [result].concat(otherResults).map(result => result.items).reduce((a, b)=> a.concat(b));
            self.userAlbumsPromiseResolve();
        }())();
    }
});
var o = {};
Object.defineProperty(window, '$s', {value: o});
window['v'+'m'] = function(k){if (k === o) return this;}.bind(vm);

function getPopularGroups() {
    return vkApi('groups.search', {
        q    : 'music',
        count: 500,
        sort : 1
    }, -20);
}

function getUserGroups() {
    return vkApi('groups.get', {
        filter  : 'groups,publics',
        count   : 1000,
        extended: 1
    }, 100);
}