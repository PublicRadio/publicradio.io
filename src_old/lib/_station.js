var ProxyPlayer = require('./_proxyPlayer.js');
module.exports = Station;
var stations = Station.all = [];
var stationMap = Station.map = {};
Station.dump = function () { return Station.all.map( station => station.dump ); };
Object.defineProperty(Station, 'ontrackchange', {
    get: function(){return Station._ontrackchange},
    set: function(val){
        Station._ontrackchange = val;
        if (Station.current)
            Station.ontrackchange(Station.current.currentTrack)
    }
});
Station.ontrackchange = function(){};

Station.play = function (id) {
    var targetStation = Station.map[id];
    if (!targetStation) return;
    console.log(Station.current, targetStation);
    if (Station.current && Station.current !== targetStation)

        Station.current.suspend();
    Station.current = targetStation;
    Station.ontrackchange(Station.current.currentTrack);
    Station.current.enable();
};

class Seeker {
    constructor(generator) {
        this.history = [];
        this.cursor = -1;
        this.generator = generator();
    }

    get(index) {
        return this.getAbsolute(this.cursor + index || 0);
    }

    getAbsolute(index) {
        if (index === undefined)
            index = this.cursor;
        while (this.history.length <= index)
            this.history.push(this.generator(this.history));

        this.history = this.history.filter( el => el instanceof Object);
        return this.history[index];
    }
}

function Station(data, playlist) {
    var seeker = new Seeker(function getNextTrack() {
            //noinspection InfiniteLoopJS
            return function (list) {
                var nextTrack;
                do
                    nextTrack = getRandom(playlist);
                while (Math.random() > probability(nextTrack, list));
                return nextTrack;
            };

            function probability(track, trackList) {
                var history = trackList.slice().reverse();
                switch (true) {
                    case (history.indexOf(track) === -1):
                    case (history.indexOf(track) > playlist.length):
                        return 1;
                    case (history.indexOf(track) < playlist.length * .5):
                        return 0;
                    default:
                        return 1 - (history.indexOf(track) / playlist.length);
                }
            }
        }),
        self = {
            enable() {
                var self = this;
                if (!this.player)
                    this.next();
                this.dump.isCurrent = true;
                this.player.fake = false;
            },
            suspend() {
                this.dump.isCurrent = false;
                this.player.fake = true;
            },
            next() {
                var self = this,
                    player = this.player || {volume: 1, fake: false};
                this.seeker.cursor++;
                if (Station.current === this) Station.ontrackchange(this.currentTrack);
                this.player = new ProxyPlayer(this.currentTrack, {
                    onEnded() {
                        console.log('onended');
                        self.next();
                    },
                    volume: player.volume,
                    fake: player.fake
                });
                if (player && player.destroy instanceof Function) player.destroy();
                this.dump.currentTrack = seeker.get(0);
                this.dump.previousTrack = seeker.get(-1);
            },
            get currentTrack() { return this.seeker.get(); },
            dump: {
                id: data.id,
                photo_200: data.photo_200,
                name: data.name
            },
            seeker,
            data, playlist
        };
    stations.push(self);
    stationMap[self.data.id] = self;
    return self;
}



function getRandom(arr) { return arr[(arr.length * Math.random()) >> 0]; }




class Station{
    constructor(data){

    }
    enable(){

    }
    disable(){

    }
    dump = {}
}

module.exports = function station(data){
    return new Station(data);
};