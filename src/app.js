var Vue = require('vue');
var vkApi = require('./_vkApi_mod.js');


Vue.filter('stations', function(val){
    //todo
});

Vue.component('station', {
    data: {},
    template: require('./_station.html.jade'),
    created: function(){
        //todo
    }
});

new Vue({
    el: document.documentElement,
    data: {
        groups: []
    },
    template: require('./_app.html.jade'),
    created: function(){
        var self = this;
        var isLoading = false;
        var container = this.$el.querySelector('main');
        (function tick(){
            requestAnimationFrame(tick, self.$el);
            if (container.scrollHeight < (window.innerHeight + window.scrollY)) {
                //todo
            }
        })();
    }
});