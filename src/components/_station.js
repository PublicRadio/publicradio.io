var Vue = require('vue'),
    co = require('co'),
    storage = require('asyncstorage'),
    StationEngine = require('../lib/_stationEngine.js'),
    vkApi         = require('../lib/_vkApi_mod.js');

var ownTracks = vkApi('audio.get', {}).then(({items}) => Promise.resolve(items));
var COMPATIBILITY_THRESHOLD_LEVEL = 0.8;
var MIN_STATION_TRACK_COUNT = 15;

Vue.component('station', {
    data    : {
        id       : null, avatar: null, name: null, screen_name: null, group_type: null, is_member: null,
        isMusical: false, genreCompatibility: 0,
        shown    : false,
        currentTrack: null,
        tracks   : [],
        genres   : []
    },
    template: require('../templates/_station.html.jade'),
    ready() {
        var id = this.id,
            self = this;

        this.$watch('currentTrack', function(){
            if (this.engine && this.engine.enabled)
                this.$dispatch('up:currentTrack', {station: this, track: this.currentTrack});
        });

        //noinspection JSUnresolvedFunction
        this.$on('currentStationChange', function ({station}) {
            if (this.engine)
                this.engine.enabled = station === self;
        });
        co(function* () {
            var session = yield vkApi.session,
                isMusicalCached = yield storage('groups::byId::' + session.mid + '::idMusical'),
                priority = getBoolPriority(isMusicalCached, self.is_member),
                posts = yield getGroupPosts(id, priority),
                groupTracks = getTracksFromPosts(posts),
                groupTags = getTagsForTracks(groupTracks),
                userTracks = yield ownTracks,
                userTags = getTagsForTracks(userTracks),
                genreCompatibility = self.genreCompatibility = getMatch(groupTags, userTags),
                isGenreCompatible = genreCompatibility > COMPATIBILITY_THRESHOLD_LEVEL / (self.is_member ? 2 : 1),
                isMusical = self.isMusical = groupTracks.length > MIN_STATION_TRACK_COUNT;
            self.tracks = groupTracks;
            self.genres = groupTags;

            //noinspection JSUnresolvedVariable
            storage('groups::byId::' + session.mid + '::genreCompatibility', genreCompatibility);
            //noinspection JSUnresolvedVariable
            storage('groups::byId::' + session.mid + '::idMusical', isMusical);

            self.shown = isGenreCompatible && isMusical;
            self.$dispatch('stationRendered');
        }())();
    },
    methods : {
        setAsCurrent() {
            if (!this.engine) //noinspection JSPotentiallyInvalidUsageOfThis,JSUnresolvedVariable
                this.engine = new StationEngine(this.tracks, track => this.currentTrack = track);
            this.$dispatch('up:currentStationChange', {station: this});
        }
    }
});

function getBoolPriority(bool, ...bools) {
    if (bools.length > 0) return getBoolPriority(bool) + getBoolPriority(bools.shift(), ...bools);
    if (bool === false) return -10;
    if (bool === true) return 10;
    return 0;
}

function getGroupPosts(id, priority) {
    return vkApi('wall.get', {
        owner_id: -id,
        count   : 20
    }, priority)
        .then(({items}) => Promise.resolve(items));
}

function getTracksFromPosts(posts) {
    return posts
        .map(({attachments}) => (attachments || []).filter(({audio})=>audio))
        .reduce((a, b)=>a.concat(b), [])
        .map(({audio})=>audio);
}



function getMatch(list1, list2, slice = 25) {
    if (!list1.length || !list2.length) return 0;
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
}

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