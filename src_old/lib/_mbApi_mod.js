var storage = require('asyncstorage');
var cache = {};
var taskList = [];


module.exports = api;
api.getArtist = function func(name) {
    name = name.toLowerCase();
    return storage('musicbranz:artistByName:' + name)
        .then(function (id) {
            if (id)
                return storage('musicbranz:artist:' + id)
                    .then(string => Promise.resolve(JSON.parse(string)));
            else if (id === false)
                return Promise.reject();
            else
                return api('artist?query=' + name + '&limit=1&fmt=json')
                    .then(function (result) {
                        result = JSON.parse(result);
                        var artist = result.artist[0], promises;
                        if (artist)
                            promises = [
                                storage('musicbranz:artistByName:' + artist.name, artist.id),
                                storage('musicbranz:artistByName:' + name, artist.id),
                                storage('musicbranz:artist:' + artist.id, JSON.stringify(artist))
                            ];
                        else
                            promises = [
                                storage('musicbranz:artistByName:' + name, false)
                            ];

                        return Promise.all(promises).then(() => func(name));
                    });
        });
};
api.getTrack = function func({title, artist, duration /*in sec*/}) {


    return api('recording/?query=' + title + '%20AND%20artist:' + artist + '&fmt=json&limit=1')
        .then(function (result) {
            result = JSON.parse(result);
            var track = result.recording.sort((record1, record2)=>
                Math.abs(duration - record2.length / 1000) - Math.abs(duration - record1.length / 1000)
            )[0];
            var release = (track.releases || [])[0];
            var trackData = {
                artist : track['artist-credit'].map(artist => artist.name).join(' & '),
                title  : track.title,
                trackId: track.id,
                tags   : (track.tags || []).map(tag => tag.name)
            };
            if (release) {
                return new Promise(function (resolve, reject) {

                    xhr_GET('http://coverartarchive.org/release/' + release.id, function (error, response) {
                        if (error) {
                            reject();
                        } else {
                            var image;
                            response = JSON.parse(response);
                            if (response.images[0]) {
                                image = response.images[0].thumbnails || {};
                                image.original = response.images[0].image;
                            }
                            trackData.release = {
                                title: release.title,
                                date : new Date(release.date),
                                image: image
                            };
                            resolve(trackData)
                        }
                    })
                })
            } else {
                if (track)
                    Promise.resolve(trackData);
                else
                    Promise.reject();
            }
        });
};

(function loop() {
    var task = taskList.shift();
    if (!task)
        return setTimeout(loop, 50);


    xhr_GET('http://musicbrainz.org/ws/2/' + task.query, function (err, data) {
        if (data) {
            task.resolve(data);
            setTimeout(loop, 100);
        }
        else {
            taskList.push(task);
            setTimeout(loop, 20 * 1e3);
        }
    });
})();

function xhr_GET(path, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', path);
    xhr.onreadystatechange = function () {
        if (xhr.readyState !== xhr.DONE) return;
        if (xhr.status >= 200 && xhr.status < 300) {
            callback(null, xhr.response);
        }
        else {
            callback(xhr);
        }

    };
    xhr.send();
}


function api(query) {
    if (cache[query])
        return cache[query];
    else
        return cache[query] = new Promise(resolve => taskList.push({query, resolve}));
}