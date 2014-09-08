module.exports = (function CreatePlayerHandler() {
    var defaults = {
        volume          : 1,
        onPlaylistChange: function () {},
        onSeek          : function () {},
        onTrackChange   : function () {}
    };
    return function PlayerHandler(play, playlist, opts) {
        var self = Object.create({
            play          : function () {
                this.__playing = true;
                if (this.__player)
                    this.__player.play();
                else
                    void 0;
            },
            pause         : function () {
                this.__playing = false;
                if (this.__player)
                    this.__player.pause();
                else
                    void 0;
            },
            next          : function () {
                this.__currentTrack = null; //assuring that track will re-set
                this.currentTrack = this.playlist.next;
            },
            prev          : function () {
                this.__currentTrack = null;//assuring that track will re-set
                this.currentTrack = this.playlist.prev;
            },
            add           : function () {
                this.playlist.add.apply(this.playlist, arguments);
                if (!this.currentTrack) this.currentTrack = this.playlist.current;
                this.onPlaylistChange(this.playlist);
            },
            remove        : function () {
                this.playlist.remove.apply(this.playlist, arguments);
                if (this.currentTrack) this.currentTrack = this.playlist.current;
                this.onPlaylistChange(this.playlist);
            },
            __player      : null,
            __volume      : null,
            __playing     : null,
            __playerTracks: new WeakMap()
        }, {
            playlist    : {get: function () {return playlist}},
            duration    : {get: function () {return player.duration || this.currentTrack.duration || NaN}},
            currentTrack: {
                get: function () {
                    return this.__currentTrack;
                },
                set: function (val) {
                    var trackSet = this.__playerTracks,
                        oldPlayer = this.__player;
                    if (val === this.currentTrack) return;
                    if (val) {
                        this.playlist.current = val; //will throw error in bad case, exec will break
                        this.__currentTrack = this.playlist.current;

                        [this.playlist.current, this.playlist.next].forEach(function (track) {
                            if (track && !trackSet.$has(track)) trackSet.$set(track, play(track, {autoplay: false}));
                        });

                        this.__player = trackSet.$get(this.currentTrack);
                        this.__player.done = this.next.bind(this);
                        this.__player.volume = this.volume;
                        this.__player.currentTime = 0;
                        if (this.playing)
                            this.play();
                        else
                            this.pause();
                    } else {
                        this.__currentTrack = null;
                        this.pause();
                    }

                    if (oldPlayer) {
                        oldPlayer.pause();
                        oldPlayer.done = function(){}
                    }
                    this.onTrackChange(this.currentTrack);
                }
            },
            currentTime : {
                get: function () {
                    if (this.__player)
                        return this.__player.currentTime;
                    else
                        return 0;
                },
                set: function (val) {
                    val = Number(val);
                    if (!Number.isFinite(val)) return console.error('bad val', val, new Error().stack);
                    if (this.__player)
                        this.__player.currentTime = val;
                    else
                        void 0;
                    this.onSeek();
                }
            },
            volume      : {
                get: function () {
                    return this.__volume;
                },
                set: function (val) {
                    if (!Number.isFinite(val)) return console.error('bad val', val, new Error().stack);
                    val = Math.min(1, val);
                    val = Math.max(0, val);
                    this.__volume = val;
                    if (this.__player) this.__player.volume = val;
                }
            },
            playing     : {
                get: function () {
                    return Boolean(this.__playing);
                },
                set: function (val) {
                    if (this.playing == val) return;
                    if (Boolean(val))
                        this.play();
                    else
                        this.pause();
                }
            }
        });

        Object.keys(defaults).forEach(function (key) { self[key] = opts[key] || defaults[key]; });
        if (playlist.length > 0) {
            if (!self.currentTrack)
                self.currentTrack = self.playlist[0];
            this.onPlaylistChange(self.playlist);
        }
        return self;
    };


    function WeakMap() {
        var keys = [],
            values = [];

        function setKV(key, value) {
            if (key instanceof Object) {}
            else throw new TypeError('WeakMap key should be an Object');
            var idx = getIdx(key);
            if (idx === -1) {
                keys.push(key);
                values.push(value);
            } else {
                values[idx] = value;
            }
        }

        function getV(key) {
            return values[getIdx(key)];
        }

        function getIdx(key) {
            return keys.indexOf(key);
        }

        return {
            $set: setKV,
            $get: getV,
            $has: function (key) {return getIdx(key) !== -1}
        }
    }

})();
