var co            = require('co'),
    storage       = require('asyncstorage'),
    vkApi         = require('./lib/_vkApi_mod.js'),
    StationEngine = require('./lib/_stationEngine.js'),
    adviceDog     = require('./lib/_adviceDog.js'); //recommend@optionate
var ownTracks = Promise.all([vkApi('audio.get', {count: 100})])
    .then(([{items}]) => Promise.resolve(items));
var MIN_STATION_POST_TRACK_RATIO = 1; //at least 1 audio avg per post
var MIN_STATION_MUSICAL_POST_RATIO = .5;
var genreCompatibilityUserGroupsCounter = 1;
module.exports = function registerGroup(group, additionalOpts, self, opts = {}) {
    if (self.stationsMap[group.id]) return;
    var obj = self.stationsMap[group.id] = getGroupObj(group, additionalOpts);

    Object.defineProperty(obj, '_engine', {
        configurable: true,
        get         : function () {
            delete obj._engine;
            obj._engine = new StationEngine(obj.tracks, track => obj.currentTrack = self.currentTrack = track);
            return obj._engine;
        }
    });

    co(function* () {
        var isMusicalCached = yield storage.get('groups::byId::' + obj.id + '::isMusical'),
            priorityIncrement = 0;
        for (var loadCount of ((isMusicalCached || opts.autoplay) ? [40] : [5, 20])) {
            var priority = getBoolPriority(opts.autoplay, isMusicalCached, obj.is_member),
                posts = yield getGroupPosts(obj.id, loadCount, priority + priorityIncrement * 30),
                postsWithTracks = posts.filter(post => (post.attachments || []).filter(a => a.audio).length),
                groupTracks = getTracksFromPosts(posts),
                groupTags = getTagsForAdviceDog(groupTracks),
                userTracks = yield ownTracks,
                userTags = getTagsForAdviceDog(userTracks),
                isTrackCountEnough = (groupTracks.length / posts.length) >= MIN_STATION_POST_TRACK_RATIO,
                isPostCountEnough = (postsWithTracks.length / posts.length) >= MIN_STATION_MUSICAL_POST_RATIO,
                isMusical = obj.isMusical = isTrackCountEnough && isPostCountEnough;
            if (opts.autoplay && groupTracks.length > 5) isMusical = true;
            if (!isMusical) break;
            priorityIncrement++;
        }
        if (isMusical) {
            var genreCompatibility = obj._originalGenreCompatibility = obj.genreCompatibility =
                1 - getScaledAngleForVectors(userTags, groupTags);
            if (obj.is_member) {
                adviceDog(obj.id, groupTags, .9);
                obj.genreCompatibility = 2 + 1 / genreCompatibilityUserGroupsCounter++; //guaranteed first positions
            }
            else if (opts.autoplay) {
                //no advices for now
            }
            else {
                var definitelyBadThreshold = .4;
                if (genreCompatibility >= .9) {
                    adviceDog(obj.id, groupTags, .9,
                        genreCompatibility => obj.genreCompatibility = Math.max(.7, genreCompatibility));
                } else {
                    if (genreCompatibility < definitelyBadThreshold) {
                        adviceDog(obj.id, groupTags,
                            Math.pow(genreCompatibility / definitelyBadThreshold, 2) * definitelyBadThreshold);
                        self.stationsMap[group.id] = true;
                        self.stations.$remove(obj);
                        return;
                    }
                    else
                        adviceDog(obj.id, groupTags, genreCompatibility,
                            genreCompatibility => obj.genreCompatibility = Math.min(.9, genreCompatibility));
                }
            }

            obj.tracks = groupTracks;
            obj.genres = groupTags;
            storage.set('groups::byId::' + obj.id + '::isMusical', isMusical);

            if (opts.autoplay) {
                self.stations.push(obj);
                self.$emit('stationChange', {station: obj});
            }
            else
                show(obj);
        } else {
            self.stationsMap[group.id] = true;
            self.stations.$remove(obj);
        }
    }())();

    function show(obj) {
        if (obj._show !== undefined) return;
        obj._show = false;
        var albumImage = new Image();
        albumImage.onload = function () {
            albumImage.onload = function () {};
            obj._show = true;
            self.stations.push(obj);
        };
        albumImage.src = obj.avatar;
        if (albumImage.complete) albumImage.onload();
    }
};
module.exports.bad = function markGroupAsBad(obj) {
    getGroupPosts(obj.id, 20, -20).then(function (posts) {
        adviceDog(obj.id, getTagsForAdviceDog(getTracksFromPosts(posts)), 0);
    });
};

function getTagsForAdviceDog(tracks) {
    var filteredTracks = tracks.filter(({genre_id}) => genre_id && genre_id != 18 && genre_id <= 22);
    var genreMap = filteredTracks.map(({genre_id})=>genre_id).reduce((acc, id)=> (acc[id] = (acc[id] || 0) + 1) && acc, {});
    var out = [];
    for (var i = 0; i <= 22; i++)
        out[i] = (genreMap[i] || 0) / filteredTracks.length;
    return out;
}

function getBoolPriority(bool, ...bools) {
    if (bools.length > 0) return getBoolPriority(bool) + getBoolPriority(bools.shift(), ...bools);
    if (bool === false) return -10;
    if (bool === true) return 10;
    return 0;
}

function getGroupPosts(id, count = 10, priority = 0) {
    return vkApi('wall.get', {
        owner_id: -id,
        count   : Math.floor(count)
    }, priority)
        .then(({items}) => Promise.resolve(items));
}

function getTracksFromPosts(posts) {
    return posts.map(function (post) {
        if (!post.attachments) return [];
        return post.attachments.filter(({audio})=>audio).map(({audio})=>audio).map(function (audio) {
            audio._post = post;
            audio.art = post.attachments.map(({photo})=>photo).filter(a=>a)[0];
            audio.added = false;
            return audio;
        });
    }).reduce((a, b)=>a.concat(b), []);
}


function getScaledAngleForVectors(vec1, vec2) { //cos α = a·b / |a|·|b|
    var length = Math.max(vec1.length, vec2.length);
    //var maxScale = Math.asin(Math.cos(0)) * 2; //180 deg aka PI rad
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
    var genre_ids = trackList.map(el => el.genre_id).filter(id => id !== 18).filter(id => id);
    var vector_scale = 22;
    var vector = [];
    for (var i = 0; i < vector_scale; i++) {
        vector[i] = genre_ids
    }
    return trackList.map(el => el.genre_id).filter(id => id !== 18).filter(id => id);
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

function getGroupObj(group, additionalOpts) {
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
    return obj;
}