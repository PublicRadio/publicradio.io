require('es6ify/node_modules/traceur/bin/traceur-runtime');
window.setImmediate = process.nextTick;
var Station = require('./lib/_radio');
var co = require('co');
var vkApi = require('./lib/_vkApi_mod.js');
var mbApi = require('./lib/_mbApi_mod.js');
var storage = require('asyncstorage'),
    elements = {
        main: document.querySelector('main'),
        player: document.querySelector('.player-container')
    },
    templates = {
        station: require('./_station.dot.jade'),
        player : require('./_player.dot.jade')
    };

Station.ontrackchange = function ontrackchange(track) {
    elements.player.innerHTML = templates.player(Station.current.dump);
    if (!track.extended) {
        mbApi.getTrack({artist: track.artist, title: track.title, duration: track.duration})
            .then(function (trackData) {
                track.extended = true;
                if (trackData) {
                    track.title = trackData.title;
                    track.artist = trackData.artist;
                    track.tags = trackData.tags;
                    track.release = trackData.release;
                    if (track.id === vm.currentTrack.id)
                        ontrackchange(track);
                }
            })
    }
};

var MATCH_LEVEL = .75;

co(function *main() {
    try {
        var groupList = yield storage('users:0:groups'),
            group, isMusical;

        if (groupList) {
            groupList = JSON.parse(groupList);
            for (group of groupList) {
                isMusical = yield storage('groups:' + group.id + ':isMusical');
                vkApi('wall.get', {owner_id: -group.id, count: 20}, isMusical || 0); //init caching
            }
        }

        var {items: userGroups} = yield vkApi('groups.get', {filter: 'groups,publics', count: 1000, extended: 1}, 100);
        storage('users:0:groups', JSON.stringify(userGroups));
        userGroups.forEach(function (group) {
            storage('groups:' + group.id + ':isMusical')
                .then(isMusical => vkApi('wall.get', {owner_id: -group.id, count: 20}, getBoolPriority(isMusical)))
                .then(({items: posts}) => loadGroup(group, getTracksFromPosts(posts)));
        });

        var {items: ownAudios} = yield vkApi('audio.get', {count: 100});
        var ownTags = getTagsForTracks(ownAudios);
        storage('users:0:audioTags', JSON.stringify(ownTags));
        var {items: popularGroups} = yield vkApi('groups.search', {q: 'music', count: 500, sort: 1}, -20);
        popularGroups.forEach(function step(group) {
            Promise.all([
                storage('groups:' + group.id + ':isMusical'),
                storage('groups:' + group.id + ':isAppropriate')
            ])
                .then(([isMusical, isAppropriate]) =>
                    vkApi('wall.get', {
                        owner_id: -group.id,
                        count   : 20
                    }, getBoolPriority(isMusical) + getBoolPriority(isAppropriate) * 2)
            )
                .then(function ({items: posts}) {
                    var appropriacy = getMatch(ownTags, getTagsForTracks(getTracksFromPosts(posts))),
                        isAppropriate = appropriacy > MATCH_LEVEL;
                    storage('groups:' + group.id + ':isAppropriate', isAppropriate);
                    if (isAppropriate)
                        loadGroup(group, getTracksFromPosts(posts));
                }).catch(e => console.error(e));
        });
    } catch (e) {
        console.warn(e);
    }
})();

function getBoolPriority(bool) {
    if (bool === false)
        return -10;
    if (bool === true)
        return 10;
    return 0;
}

function loadGroup(group, tracks) {
    var isMusical = false;
    if (tracks.length > 15) isMusical = true;
    if (isMusical === true) {
        storage('group:' + group.id + ':isMusical', true);
        addStation(group, tracks);
    } else {
        storage('group:' + group.id + ':isMusical', false);
    }
}


var stationsToBeAdded = [],
    oldDump           = [];
function addStation(data, tracks) {
    new Station(data, tracks);
    var dump = Station.dump();
    stationsToBeAdded = stationsToBeAdded.concat(dump.slice(oldDump.length, dump.length));
    oldDump = dump;
}

setInterval(function () {
    if (stationsToBeAdded.length > 0)
        elements.main.insertAdjacentHTML('beforeend', templates.station(stationsToBeAdded.shift()));

}, 250);

function getTopTags(list) {
    var tagsMap = {},
        tags = [];
    for (var tag of list) {
        if (tagsMap[tag])
            tagsMap[tag].count++;
        else
            tags.push(tagsMap[tag] = {count: 1, name: tag});
    }
    return tags.sort((a, b) => b.count - a.count).map(a => a.name);
}

function getTracksFromPosts(posts) {
    return posts
        .map(({attachments}) => (attachments || []).filter(({audio})=>audio))
        .reduce((a, b)=>a.concat(b), [])
        .map(({audio})=>audio);
}

function getMatch(list1, list2, slice = 25) {
    list1 = list1.slice(0, slice);
    list2 = list2.slice(0, slice);
    var maxLength = Math.max(list1.length, list2.length),
        minLength = Math.min(list1.length, list2.length),
        weightK = list1.map((el, idx)=>1 / (idx + 1)),
        matchLevel = list1.map(function (el, idx1) {
                var idx2 = list2.indexOf(el),
                    distance = Math.abs(idx2 - idx1),
                    relativeDistance = distance / maxLength,
                    importance = 1 - relativeDistance,
                    weight = weightK[idx1],
                    weightenedImportance = importance * weight;
                if (idx2 === -1)
                    return 0;
                else
                    return weightenedImportance;
            }).reduce((a, b)=>a + b) / weightK.reduce((a, b)=> a + b);


    return matchLevel;
}

function getTagsForTracks(trackList) {
    return getTopTags(trackList.map(el => el.genre_id)).filter(id => id !== 18).filter(id => id).slice(0, 20);
    //return Promise
    //    .all(getTopTags(trackList.map(el => el.artist)).slice(0, 20).map(mbApi.getArtist))
    //    .then(function (resultList) {
    //        return resultList
    //            .reduce((acc, el) => acc.concat(el.tags || []), [])
    //            .map(el => el.name);
    //    });
}