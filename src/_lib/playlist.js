module.exports = function Playlist(list, strategy) {
    Object.freeze(strategy);
    var pointer = 0,
        out = list.slice(),
        index = out.length ? strategy.next(out, -1) : -1;
    out.forEach(function(entry){
        if (!entry.__id__)
            entry.__id__ = pointer++;
    });
    function getTrackIndex(track){
        var idx = out.indexOf(track);
        if (idx === -1 && track.__id__ !== undefined) {
            var entry = out.filter(function(el){
                return el.__id__ === track.__id__;
            })[0];
            if (entry)
                idx = out.indexOf(entry);
        }
        return idx;
    }

    Object.defineProperties(out, {
        strategy: {
            get: function () { return strategy; },
            set: function (val) {
                if (val.next instanceof Function && val.prev instanceof Function)
                    strategy = val;
                else
                    throw new TypeError();
            }
        },
        remove  : {value: function (track) {
            var idx = getTrackIndex(track);

            if (idx !== -1) {
                var currentElement = this.current;
                out.splice(idx, 1);
                var currentTrackIndex = getTrackIndex(currentElement);
                if (currentTrackIndex !== -1) index = currentTrackIndex;
                if (out.length !== 0)
                    index = index % out.length;
                else
                    index = -1;
            }
        }},
        add : {value: function (track) {
            track.__id__ = pointer++;
            out.push(track);
            if (out.length == 1) index = 0;
        }},
        next    : {get: function () {
            return out[strategy.next(out, index)];
        }},
        prev    : {get: function () {
            return out[strategy.prev(out, index)];
        }},
        current : {
            get: function () {
                return index !== -1 ? out[index] : null;
            },
            set: function (val) {
                var idx = getTrackIndex(val);
                if (idx !== -1) {
                    index = idx;
                } else {
                    throw new TypeError('Not in the list');
                }
            }
        }
    });
    out.strategy = strategy;
    return out;
};
