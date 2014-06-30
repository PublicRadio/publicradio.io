require('./traceur-runtime');
import {Station} from '../lib/station';
import {getUserStations} from '../lib/vkapi';

var Vue = require('vue'),
    page = require('page'),
    ready = require('../lib/ready'),
    el = document.documentElement,
    vm = window.vm = new Vue({
        el,
        data   : {stations: [], currentStation: null},
        methods: { setStation(nameOrId) {
            var station = Station.find(nameOrId);
            page('?' + station.name);
        } }
    }),
    data = vm.$data;

Station.onRegister = function (station) {
    console.debug('adding station to viewmodel', station);
    data.stations.push(station.dump);
};
getUserStations();

page('*', function ({querystring}) {
    loadStation(querystring.split('&')[0])
        .then(function (station) {
            station.play();
            data.currentStation = station.dump;
        });
});
ready(()=>page());
