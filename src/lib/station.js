import './audio';
import {api} from "./vkapi";

class Station {
    constructor(props, tracks = []) {
        if (tracks.length < 30) throw new TypeError('too small tracklist');
        for (var key in Object.keys(props))
            this[key] = props[key];
        this.dump = {
            avatar: props.avatar,
            id: props.id,
            name: props.name
        };
        this.trackList = tracks.slice();
        this._real = false;
        console.info('registred station', this);
        Station.register(this);
    }

    disablePlayer() {
        if (this.player)
            this.player.stop();
        delete this.player;
    }

    play() {
        if (Station.current && Station.current !== this)
            Station.current.stop();

        Station.current = this;

        if (this.fakePlayer) {
            playTrack(this.fakePlayer.src, this.fakePlayer.currentTime);
            delete this.fakePlayer;
        } else {
            playTrack(nextTrack)
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
        if (startTime !== undefined)
            startTime = window.HTMLMockAudio.AudioCache[src] * .5 * (Math.random() / 2 + .5); //setting start time between 0.25 and 0.5 of track duration
        if (startTime !== 0)
            this.player.addEventListener('canplay', e => this.player.currentTime = startTime);
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
        || Station.all.filter((s)=>s.name === nameOrId)[0];
};

export {Station};