//noinspection JSUnresolvedFunction
var MockAudioPrototype = Object.create(HTMLElement.prototype, {
    src            : {
        get() {
            return this._src;
        },
        set(value) {
            var duration = window.TrackDB[value].duration;
            if (!duration) throw new TypeError('track with non-declared duration used');
            this._src = value;
            this.duration = duration;
            process.nextTick(()=>this.dispatchEvent(new Event('canplay')));
        }
    },
    currentTime    : {
        get() {
            return (Date.now() - this._startTime) / 1000;
        },
        set(value) {
            this._startTime = Date.now() - value * 1000;
            this.dispatchEvent(new Event('seeking'));
        }
    },
    play           : {
        value() {
            this._startTime = this._startTime || Date.now();
            this.dispatchEvent(new Event('play'));
            this.dispatchEvent(new Event('playing'));
        }
    },
    createdCallback: { value() {
        var timeout;
        this.addEventListener('canplay', () => { if (this.autoplay) this.play() });
        this.addEventListener('playing', () => this.dispatchEvent(new Event('seeking')));
        this.addEventListener('seeking', () => {
            clearTimeout(timeout);
            //noinspection JSPotentiallyInvalidUsageOfThis
            timeout = setTimeout(()=> this.dispatchEvent(new Event('ended')),
                    (this._startTime + this.duration * 1000) - Date.now());
            this.dispatchEvent(new Event('seeked'));
        });

    } }
});
var HTMLMockAudio = document.register('mock-audio', {prototype: MockAudioPrototype});
export {HTMLMockAudio};

/*
 var assert = require('assert'),
 canplayEventShoot = false,
 playEventShoot = false,
 endedEventShoot = false,
 url = 'http://some.track';
 window.HTMLMockAudio.AudioCache[url] = 1;

 var audio = document.createElement('mock-audio');
 audio.addEventListener('canplay', e => canplayEventShoot = true);
 audio.addEventListener('play', e => playEventShoot = true);
 audio.addEventListener('ended', e => endedEventShoot = true);
 setTimeout(()=>assert(canplayEventShoot), 2000);
 setTimeout(()=>assert(playEventShoot), 2000);
 setTimeout(()=>assert(endedEventShoot), 3000);
 audio.autoplay = true;
 audio.src = url;*/
