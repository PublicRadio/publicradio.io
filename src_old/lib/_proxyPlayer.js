var Player = require('./_player.js'),
    player = new Player({transformSrc: track => track.url});

module.exports = ProxyPlayer;

function RealPlayer(src, {currentTime, volume, onEnded}) {
    var play = player(src, {volume: volume}, onEnded);
    play.currentTime = currentTime;
    return play;
}

function FakePlayer(src, {currentTime, volume, onEnded}) {
    var self = {
        destroy() {},
        get volume() { return this._volume; },
        set volume(val) { this._volume = val; },
        get duration() { return this._duration; },
        get currentTime() { return (Date.now() - this._startTime) / 1000; },
        set currentTime(val) {
            this._startTime = Date.now() - val * 1000;
            clearTimeout(this._timer);
            this._timer = setTimeout(()=>onEnded(), (this.duration - this.currentTime) * 1000);
        }
    };
    self._duration = src.duration;
    self._volume = volume;
    self.currentTime = currentTime || 0;
    return self;
}

function ProxyPlayer(src, opts) {
    opts.currentTime = opts.currentTime || 0;
    opts.volume = opts.volume || 1;
    var self = {
        _player: new FakePlayer(src, opts),
        _fake  : true,
        get fake() {return this._fake},
        set fake(val) {
            val = Boolean(val);
            if (this.fake === val) return;
            var actualOpts = {currentTime: this.currentTime, volume: this.volume, onEnded: opts.onEnded};
            this._fake = val;
            this._player.destroy();
            this._player = (this.fake ? FakePlayer : RealPlayer)(src, actualOpts);
        }
    };

    Object.keys(self._player).forEach(function (key) {
        Object.defineProperty(self, key, {
            get: function () {
                return self._player[key]
            },
            set: function (val) {
                self._player[key] = val;
            }
        });
    });

    if (opts.fake === false)
        self.fake = false;

    return self;
}