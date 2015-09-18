import TWEEN, {Tween, Easing} from 'tween.js';
import {Emitter} from './Emitter';

(function animate () {
    requestAnimationFrame(animate);
    TWEEN.update();
})();


export class Player extends Emitter {
    static volume = 100;

    currentTrack = undefined;
    _lastTracks = new Map();
    constructor (getTrackList, vk) {
        super();
        this.volume = Player.volume;
        this.getTrackList = getTrackList;
        this._vk = vk;
        Object.defineProperty(this, 'progress', {
            enumerable: true,
            get () { return this._audioElement && (this._audioElement.currentTime / this._audioElement.duration) || 0; }
        });
        const render = this.dispatchStateChange.bind(this);
        requestAnimationFrame(function tick () { render(requestAnimationFrame(tick)) });
    }

    @observableProperty
    volume () {
        if (this._audioElement)
            this._audioElement.volume = volume;
    }

    @observableProperty
    playing () { this.playing ? this._play() : this._pause(); }

    @observableProperty
    currentStation () {
        const lastTrack = this._lastTracks.get(this.currentStation.id);
        if (!lastTrack || lastTrack.endTime < Date.now() - 10)
            return this.startTrack();
        else
            return this.startTrack(lastTrack, lastTrack.duration - ((lastTrack.endTime - Date.now()) / 1000))
    }

    isEventCurrent (eventType) {
        if (!this.eventIDs) this.eventIDs = new Map();
        const id = this.eventIDs.has(eventType) ? this.eventIDs.get(eventType) + 1 : 0;
        this.eventIDs.set(eventType, id);
        const check = () => this.eventIDs.get(eventType) === id;
        return (fn, fn2 = () => {}) => fn ? (...args) => (check() ? fn(...args) : fn2(...args)) : check;
    }

    _play () { this._audioElement ? this._audioElement.play() : this.startTrack(); }

    _pause () { this._audioElement ? this._audioElement.pause() : void 0; }

    async loadCache (id = this.currentStation.id) {
        if (!this.playlistCache) this.playlistCache = new Map();
        if (!this.playlistCache.has(id)) {
            const playlist = await this.getTrackList(id, 3);
            this.playlistCache.set(id, playlist);
            /* note: no await */
            this.getTrackList(id, 100)
                .then(resultList => {
                    /*replacing contents while keeping link same*/
                    while (playlist.length)
                        playlist.pop();
                    playlist.push(...resultList);
                });
        }
        return this.playlistCache.get(id);
    }

    trackEnded (e) { this.startTrack(); }

    async startTrack (currentTrack, startTime) {
        console.log(currentTrack, startTime);
        const isEventCurrent = this.isEventCurrent('trackChange');
        const audio = document.createElement('audio');
        const oldAudio = this._audioElement;
        audio.autoplay = true;

        if (oldAudio) {
            new Tween(oldAudio)
                .to({volume: 0}, 2000)
                .easing(Easing.Quintic.InOut)
                .onComplete(() => {
                    oldAudio.pause();
                    oldAudio.src = '';
                })
                .start();
            if (this._lastTrack)
                this._lastTrack.endTime = Date.now() + (oldAudio.duration - oldAudio.currentTime) * 1000;
        }


        currentTrack = currentTrack || await this.pickNextTrack();
        this._lastTracks.set(this.currentStation.id, this._lastTrack = currentTrack);
        this.currentTrack = currentTrack;
        audio.src = currentTrack.url;
        if (startTime)
            audio.currentTime = startTime;

        return new Promise((res, rej) => {
            audio.addEventListener('ended', isEventCurrent((e) => this.trackEnded(e)));
            audio.addEventListener('error', isEventCurrent((e) => this.trackEnded(e)));
            audio.addEventListener('error', rej);
            audio.addEventListener('canplay', isEventCurrent(() => {
                    new Tween(this._audioElement = audio)
                        .to({volume: 1}, oldAudio && oldAudio.src ? 2000 : 500)
                        .easing(Easing.Quintic.InOut)
                        .start();
                    this.playing = true;
                    this.dispatchStateChange();
                    res();
                },
                () => {
                    audio.pause();
                    audio.src = '';
                    rej();
                }));
        });
    }

    async pickNextTrack (station = this.currentStation.id) {
        const cache = await this.loadCache(station);
        let newTrack = cache[Math.floor(Math.random() * cache.length)];//todo
        if (newTrack !== this.currentTrack)
        return this.currentTrack = newTrack;
    }

    async like (track, station) {
        if (track.$set)
            track.$set('liked', true);
        else
            track.liked = true;
        this.dispatchStateChange();
        if (window.ga)
            window.ga('send', 'event', 'social', 'like', 'track', {
                group_id: station.id,
                artist: track.artist,
                genre: track.genre_id
            });

        const albums = await this._vk.call('audio.getAlbums', {offset: 0, count: 100}, '.items');
        const currentAlbumTitle = 'publicRadio.io // ' + station.name + ' (' + station.screen_name + ')';
        const albumRegex = new RegExp(`^publicRadio.io \/\/.*\(${station.screen_name}\)$`, 'img');
        const currentAlbum = albums.filter(album => albumRegex.test(album.title))[0];
        const album_id = (currentAlbum ? currentAlbum : await this._vk.call('audio.addAlbum', {title: currentAlbumTitle})).album_id;
        var audio_id = await this._vk.call('audio.add', {audio_id: track.id, owner_id: track.owner_id});
        await Promise.all([
            this._vk.call('audio.moveToAlbum', {album_id, audio_ids: audio_id}),
            this._vk.call('audio.edit', {
                owner_id: this._vk.user.id,
                audio_id,
                title: track.title + ' (найдено на PublicRadio.io)'
            })
        ]);
    }
}

function observableProperty (target, name, descriptor) {
    const isPendingKey = name + 'IsPending';
    const valueKey = '_$' + name;
    const changeEventKey = '$' + name;
    const fn = descriptor.value;

    delete descriptor.value;
    delete descriptor.writable;
    target[isPendingKey] = false;
    console.log(target);
    Object.assign(descriptor, {
        enumerable: true,
        get: function () {return this[valueKey]},
        set: function (val) {
            if (this[valueKey] === val)
                return;

            this[valueKey] = val;
            const res = fn.call(this);

            if (res && res.then) {
                this[isPendingKey] = true;
                this.dispatchStateChange();
                const doneFN = this.isEventCurrent(changeEventKey)(() => {
                    this[isPendingKey] = false;
                    this.dispatchStateChange();
                });
                res.then(doneFN, doneFN);
            } else {
                this.dispatchStateChange();
            }
        }
    });
}
