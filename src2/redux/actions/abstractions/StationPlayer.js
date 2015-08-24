import TWEEN, {Tween, Easing} from 'tween.js';
(function animate () {
    requestAnimationFrame(animate);
    TWEEN.update();
})();


@emitter('currentStation')
@emitter('playing')
@observableProperty('volume', ({_audioElement, volume}) => _audioElement && (_audioElement.volume = volume))
@observableProperty('playing', (self) => self.playing ? self._play() : self._pause())
@observableProperty('currentStation', (self) => self.startTrack())
export class StationPlayer {
    static volume = 100;

    playlistCache = new Map();
    eventIDs = new Map();
    volume = StationPlayer.volume;

    constructor (getTrackList) {
        this.getTrackList = getTrackList;
        const dispatch = this.dispatchState.bind(this);
        (function tick () {
            setTimeout(tick, 1000);
            dispatch();
        })();
    }

    isEventCurrent (eventType) {
        const id = this.eventIDs.has(eventType) ? this.eventIDs.get(eventType) + 1 : 0;
        this.eventIDs.set(eventType, id);
        const check = () => this.eventIDs.get(eventType) === id;
        return (fn, fn2 = () => {}) => fn ? (...args) => (check() ? fn(...args) : fn2(...args)) : check;
    }

    toJSON () {
        const {currentTrack, currentStation, currentStationIsPending, currentTrackIsPending, volume, progress, playing} = this;
        return {currentTrack, currentStation, currentStationIsPending, currentTrackIsPending, volume, progress, playing};
    }

    dispatchState () { this.dispatch(this.toJSON()); }

    dispatch (event) { if (this.listener) this.listener(event); }

    get progress () { return this._audioElement && (this._audioElement.currentTime / this._audioElement.duration) || 0; }

    @emitter
    _play () { this._audioElement ? this._audioElement.play() : this.startTrack(); }

    @emitter
    _pause () { this._audioElement ? this._audioElement.pause() : void 0; }

    async loadCache (id = this.currentStation) {
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

    @emitter
    async startTrack (currentTrack) {
        const isEventCurrent = this.isEventCurrent('trackChange');
        const audio = document.createElement('audio');
        const oldAudio = this._audioElement;
        audio.autoplay = true;

        if (oldAudio)
            new Tween(oldAudio)
                .to({volume: 0}, 2000)
                .easing(Easing.Quintic.InOut)
                .onComplete(() => {
                    oldAudio.pause();
                    oldAudio.src = '';
                })
                .start();

        currentTrack = currentTrack || await this.pickNextTrack();
        audio.src = currentTrack.url;
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
        return this.currentTrack = cache[Math.floor(Math.random() * cache.length)];//todo
    }
}


function observableProperty (name, fn) {
    const isPendingKey = name + 'IsPending';
    const changeKey = '$' + name;
    return function (target) {
        let value;
        Object.defineProperty(target.prototype, name, {
            configurable: true,
            get: () => value,
            set: function (val) {
                if (value !== val) {
                    value = val;
                    const res = fn(this);
                    if (res && res.then) {
                        this[isPendingKey] = true;
                        const doneFN = this.isEventCurrent(changeKey)(() => this[isPendingKey] = false);
                        res.then(doneFN, doneFN);
                    }
                }
            }
        })
    }
}

function emitter (target, name, descriptor) {
    if (arguments.length === 3) {
        mutateDescriptor(descriptor);
    } else {
        name = arguments[0];
        return function (target) {
            Object.defineProperty(
                target.prototype,
                name,
                mutateDescriptor(Object.getOwnPropertyDescriptor(target.prototype, name)))
        };
    }
    function callAndDispatch (fn) {
        return function (...args) {
            console.trace(name);
            const res = fn.apply(this, args);
            if (res && res.then)
                res.then(() => this.dispatchState(), () => this.dispatchState());
            else
                this.dispatchState();
            return res;
        }
    }

    function mutateDescriptor (descriptor) {
        if (descriptor.value instanceof Function)
            descriptor.value = callAndDispatch(descriptor.value);

        if (descriptor.set instanceof Function)
            descriptor.set = callAndDispatch(descriptor.set);

        return descriptor;
    }
}