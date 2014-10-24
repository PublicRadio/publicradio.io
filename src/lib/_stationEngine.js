//noinspection BadExpressionStatementJS
"use strict";
var TWEEN = require('tween.js');
var Player = require('./_player');
var Play = new Player({
    playerConstructor() {
        var audio = document.createElement('audio');
        audio.toJSON = function toJSON() {
            return {
                src     : this.src,
                duration: this.duration
            };
        };
        return audio;
    },
    transformSrc(track) {return track.url}
});
module.exports = StationEngine;
var currentEngine;
function Seeker(generator) {
    getAt.history = [];
    getAt.cursor = -1;

    return getAt;

    function getAbsolute(index) {
        while (getAt.history.length <= index)
            getAt.history.push(generator(getAt.history));
        getAt.history = getAt.history.filter(el => el instanceof Object);
        getAt.cursor = getAt.history.length - 1;
        return getAt.history[index];
    }

    function getAt(index) { return getAbsolute(getAt.cursor + index || 0); }
}

function getRandom(arr) { return arr[(arr.length * Math.random()) >> 0]; } // jshint ignore:line

function StationEngine(trackList, onTrackChange) {
    if (!(this instanceof StationEngine))
        throw new Error();
    var self = this;
    this.onTrackChange = onTrackChange;
    this._enabled = false;
    this._volumeTween = new TWEEN.Tween({volume: 0})
        .easing(TWEEN.Easing.Quintic.InOut)
        .onUpdate(function () { if (self._audio) self._audio.volume = this.volume * window.globalVolumeLevel; });


    var probability = function (track, history) {
        switch (true) {
            case (history.indexOf(track) === -1):
            case (history.indexOf(track) > trackList.length):
                return 1;
            case (history.indexOf(track) < trackList.length * 0.5):
                return 0;
            default:
                return 1 - (history.indexOf(track) / trackList.length);
        }
    };

    this._seeker = new Seeker(function getNextTrack(list) {
        list = list.slice().reverse();
        var nextTrack;
        //noinspection InfiniteLoopJS
        do nextTrack = getRandom(trackList);
        while (Math.random() > probability(nextTrack, list));
        return nextTrack;
    });
}
StationEngine.prototype = {
    nextTrack() {return this._seeker(1);},
    next() {
        var nextTrack = this.nextTrack();
        if (!nextTrack) return false;
        this.currentTrack = nextTrack;
        this._audio = new Play(this.currentTrack, {volume: this._audio ? this._audio.volume : window.globalVolumeLevel}, this.next.bind(this));
        this.onTrackChange(nextTrack);

    },
    enable() {
        if (this._enabled) return;
        if (currentEngine && currentEngine !== this) currentEngine.enabled = false;
        currentEngine = this;
        clearTimeout(this._disableTimeout);
        this._volumeTween.stop()
            .to({volume: 1}, 500)
            .onComplete(() => {})
            .start();
        if (this.currentTrack) {
            if (this.currentTrack.startTime)
                this._audio.currentTime = (Date.now() - this.currentTrack.startTime) / 1000;
            this._audio.play();
        } else {
            if (this.next() !== false)
                this._audio.currentTime = this.currentTrack.duration * (0.05 + 0.20 * Math.random()); //guaranteed position from 5% through 25% of track
        }
        this._enabled = true;
    },
    disable() {
        if (!this._enabled) return;
        var self = this;
        this._volumeTween.stop()
            .to({volume: 0}, 500)
            .onComplete(() => this._audio.pause())
            .start();
        this.currentTrack.startTime = Date.now() - this._audio.currentTime * 1000;
        this._disableTimeout = setTimeout(function () {
            self._audio.destroy();
            self.currentTrack = null;
        }, (this.currentTrack.duration - this._audio.currentTime) * 1000);
        this._enabled = false;
    },
    currentTrack: null,
    get enabled() {return this._enabled},
    set enabled(val) {
        if (val) this.enable();
        else this.disable();
    }
};
