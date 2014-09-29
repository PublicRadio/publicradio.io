//noinspection BadExpressionStatementJS
"use strict";
//MODULES
require('es6ify/node_modules/traceur/bin/traceur-runtime');
var Vue           = require('vue'),
    TWEEN         = require('tween.js'),
    co            = require('co'),
    storage       = require('asyncstorage'),
    vkApi         = require('./lib/_vkApi_mod.js');

requestAnimationFrame(function animate(time) {
    requestAnimationFrame(animate, document.body);
    TWEEN.update(time);
}, document.body);
//CONSTANTS
window.setImmediate = process.nextTick;


require('./components/_station.js');
require('./components/_navigator.js');


var vm = window.vm = new Vue({
    el      : document.querySelector('#content'),
    template: require('./templates/_app.html.jade'),
    data    : {
        stations: [], suggestedStations: [], stationsMap: {}
    },
    created() { //noinspection JSUnresolvedFunction
        this.$on('up:currentStationChange', function ({station}) { //noinspection JSUnresolvedFunction
            this.$broadcast('currentStationChange', {station});
        });//noinspection JSUnresolvedFunction
        this.$on('up:currentTrack', function ({station, track}) { //noinspection JSUnresolvedFunction
            this.$broadcast('currentTrack', track);
        });
    },
    ready() {
        var self = this,
            registerGroup = (group, additionalOpts, target) => {
                if (this.stationsMap[group.id]) return;
                var obj = {
                    id                : group.id,
                    avatar            : group.photo_200,
                    name              : group.name,
                    screen_name       : group.screen_name,
                    group_type        : group.type,
                    is_member         : group.is_member,
                    shown             : false,
                    genreCompatibility: 0
                };
                if (additionalOpts instanceof Object)
                    for (var key of Object.keys(additionalOpts))
                        obj[key] = additionalOpts[key];
                target.push(obj);
                this.stationsMap[group.id] = obj;
            };


        co((function* () {
            var session = yield vkApi.session,
                userGroups = yield getUserGroups(),
                group;
            for (group of userGroups) registerGroup(group, {is_member: true}, self.stations);
            var popularGroups = yield getPopularGroups();
            for (group of popularGroups) registerGroup(group, {}, self.suggestedStations);
        })())();
    }
});


function getPopularGroups() {
    return vkApi('groups.search', {
        q    : 'music',
        count: 500,
        sort : 1
    }, -20)
        .then(({items}) => Promise.resolve(items));
}

function getUserGroups() {
    return vkApi('groups.get', {
        filter  : 'groups,publics',
        count   : 1000,
        extended: 1
    }, 100)
        .then(({items}) => Promise.resolve(items));
}

