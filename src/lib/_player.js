module.exports = function player(overrides) {
    var defaults = {
        playerConstructor: function playerConstructor() {
            var audio = document.createElement('audio');
            audio.toJSON = function toJSON() {
                return {
                    src     : this.src,
                    duration: this.duration
                }
            };
            return audio;
        },
        transformSrc     : function (src) {return src},
        onlyMetadata     : false,
        eventInterval    : 1000 / 60,
        volume           : 1,
        autoplay         : true
    };
    if (overrides instanceof Object) {
        Object.keys(overrides).forEach(function (key) {
            defaults[key] = overrides[key];
        })
    }

    /**
     @param src String
     @param opts Object
     @param cb Function
     */
    return function play(src, opts, cb) {
        if (arguments[arguments.length - 1] instanceof Function) {
            cb = arguments[arguments.length - 1];
            if (cb === opts) opts = void 0;
        }

        if (!(opts instanceof Object)) opts = {};

        var listeners = [],
            interval;

        Object
            .keys(defaults)
            .forEach(function (key) {
                if (key in opts) {}
                else opts[key] = defaults[key]
            });


        var player = opts.playerConstructor(),
            done = function (event) {
                if (cb instanceof Function)
                    cb(event);
            };
        player.addEventListener('ended', ended);
        player.addEventListener('error', error);

        if (opts.autoplay !== false)
            player.autoplay = true;
        player.volume = opts.volume;
        if (opts.onlyMetadata === true)
            player.preload = 'metadata';


        if (src instanceof Function) {
            var alledgedSrc = src();
            if (alledgedSrc && alledgedSrc.then instanceof Function)
                alledgedSrc.then(setSrc);
            else
                setSrc(alledgedSrc);
        }
        else
            setSrc(src);


        if (opts.error instanceof Function)
            player.addEventListener('playerError', error);

        return Object.create({
            emit: emit,
            play   : player.play.bind(player),
            pause  : player.pause.bind(player),
            toJSON: player.toJSON.bind(player),
            on    : function (event, callback) {
                callback.callback = callback.callback || callback;
                if (event instanceof Function)
                    addFnEventListener(event, callback.callback);
                else
                    player.addEventListener.apply(player, [arguments[0], arguments[1].callback, arguments[2]]);

            },
            off   : function (event) {
                if (event instanceof Function)
                    removeFnEventListener(event);
                else
                    player.removeEventListener.apply(player, [arguments[0], arguments[1].callback, arguments[2]]);
            },
            one   : function (event, callback) {
                var self = this;
                callback.callback = function (e) {
                    callback(e);
                    self.off(event, callback);
                };
                self.on(event, callback);
            },
            destroy: function () {
                stopEventInterval();
                player.src = '';
                delete player.src;
                player.removeEventListener('ended', ended);
                player.removeEventListener('error', error);
            }
        }, {
            volume     : {
                get: function () { return player.volume; },
                set: function (val) {
                    if (Number.isFinite(val) && (val >= 0) && (val <= 1))
                        player.volume = val;
                    else
                        emit('playerError', {
                            type : 'validationFailed',
                            value: val,
                            field: 'volume'
                        });
                }
            },
            currentTime: {
                get: function () { return player.currentTime; },
                set: function (val) {
                    if (Number.isFinite(val))
                        if (player.readyState > 2)
                            player.currentTime = val;
                        else
                            player.addEventListener('canplay', function oncanplay() {
                                player.currentTime = val;
                                player.removeEventListener('canplay', oncanplay);
                            });
                    else
                        emit('playerError', {
                            type : 'validationFailed',
                            value: val,
                            field: 'currentTime'
                        });
                }
            },
            done       : {
                get: function () { return cb; },
                set: function (val) {
                    if (val instanceof Function || val === null)
                        cb = val;
                    else
                        emit('playerError', {
                            type : 'validationFailed',
                            value: val,
                            field: 'done'
                        });
                }
            },
            src        : { get: function () { return player.src; } },
            originalSrc: { get: function () { return player.originalSrc; } },
            duration   : { get: function () { return player.duration; } }
        });


        function emit(type, data) { player.dispatchEvent(new CustomEvent(type, {detail: data})); }

        function setSrc(src) {//noinspection JSUnresolvedVariable
            player.src = opts.transformSrc(player.originalSrc = (opts.srcMod instanceof Function ? opts.srcMod(src) : src)) }

        function ended(event) { done(event); }

        function error(event) {
            console.warn(event);
            done(event);
        }

        function stopEventInterval() {
            clearInterval(interval);
        }

        function startEventInterval() {
            stopEventInterval();
            interval = setInterval(function () {
                for (var i = 0; i < listeners.length; i++)
                    if (listeners[i]()) listeners[i].callback();
            }, opts.eventInterval);
        }

        function addFnEventListener(event, callback) {
            if (listeners.length === 0) startEventInterval();
            event.callback = callback;
            if (listeners.indexOf(event) === -1)
                listeners.push(event);
        }

        function removeFnEventListener(event) {
            var indexOf;
            while ((indexOf = listeners.indexOf(event)) !== -1)
                listeners = listeners.slice(0, indexOf).concat(listeners.slice(indexOf + 1));

            if (listeners.length === 0) stopEventInterval();
        }
    };

};