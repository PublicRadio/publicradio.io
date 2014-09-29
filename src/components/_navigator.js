var Vue = require('vue');

Vue.component('navigator', {
    data    : {currentStation: null, currentTrack: null},
    template: require('../templates/_navigator.html.jade'),
    ready   : function () {
        this.$on('currentStation', function ({station}) {
            console.log(arguments);
            this.currentStation = station;
        });
        this.$on('currentTrack', function ({station, track}) {
            console.log(arguments);
            this.currentStation = station;
            this.currentTrack = track;
        })
    }
});