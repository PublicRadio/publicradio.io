var Vue           = require('vue'),
    storage       = require('asyncstorage');


Vue.component('station', {
    data    : {
        //id          : null, avatar: null, name: null, screen_name: null, group_type: null, is_member: null,
        //isMusical   : false, genreCompatibility: 0,
        //showContent: false,
        currentTrack: null//,
        //tracks      : [],
        //genres      : []
    },
    template: require('../templates/_station.html.jade'),
    ready() {
        var self = this;

        var shownTimeout;
        this.$watch('show', function(){
            clearTimeout(shownTimeout);
            shownTimeout = setTimeout(function(){self.shown = self.show}, 750);
        })
    },
    methods : {
        setAsCurrent() {
            this.$dispatch('stationChange', {station: this.$data});
        }
    }
});

