import {Binded} from 'vue';
import {player, location, adviceDog} from '../../actions.js';
import style from './StationCard.css';

export default Binded({
    data    : player,
    filters : {membersString},
    ready () {
        const obj = this.$el.querySelector('iframe.member');

        new fastXDM.Server({
            publish() {
                console.log(arguments);
            }
        }, function (origin) {
            if (!origin) return true;
            return origin.toLowerCase().match(/(\.|\/)vk\.com($|\/|\?)/);
        }, {safe: true});
    },
    template: `<div
            class="mdl-card mdl-shadow--2dp mdl-cell mdl-cell--3-col mdl-cell--4-col-tablet mdl-cell--4-col-phone">
            <div class='mdl-card__title ${style.stationBackground}'
                 v-style="background-image: 'url(' + station.photo_200 + ')'">
                <h2 class="mdl-card__title-text ${style.text}">
                    {{station.name}}
                    <div style="font-size: 12px">{{station.members_count | membersString}}</div>
                </h2>
            </div>
            <M-Button className="${style.buttonTiny}" name="{{station.is_member ? 'star' : 'star_border'}}">
                <iframe
                frameborder="0"
                src="https://vk.com/widget_subscribe.php?_ver=1&oid=-{{station.id}}&mode=1&soft=1"
                width="100%"
                height="22"
                scrolling="no"
                style="overflow: hidden;"></iframe>
            </M-Button>
            <div class="mdl-card__supporting-text" v-show="station.status">{{station.status}}</div>
            <div class="mdl-card__menu">
                <button class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect ${style.icons}">
                    <i class="material-icons" v-on="click: ban(station)">close</i>
                </button>
            </div>
            <span class="mdl-card__actions mdl-card--border ${style.button}" v-show="currentStation && station.id === currentStation.id">
                <span v-if="currentTrack && !currentStationIsPending">Играет сейчас: {{currentTrack.artist}} - {{currentTrack.title}}</span>
                <span v-show="!(currentTrack && !currentStationIsPending)">Вот-вот начнем...</span>
           </span>
            <a v-show="!currentStation || (station.id !== currentStation.id)"
               class="mdl-card__actions mdl-card--border mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect"
               v-on="click: playStation(station)">
               Слушать
            </a>
        </div>`,
    methods : {
        playStation: station => location.navigateTo({search: station.screen_name}),
        ban        : station => adviceDog.ban(station)
    }
});


function membersString (count) {
    switch (true) {
        case count > 2 * 1000 * 1000:
            count = Math.floor(count / (1000 * 1000));
            return pluralize(count, pluralizeBefore) + ' ' + count + ' ' + pluralize(count, pluralizeAfter[0]);
        case count > 2 * 1000:
            count = Math.floor(count / 1000);
            return pluralize(count, pluralizeBefore) + ' ' + count + ' ' + pluralize(count, pluralizeAfter[1]);
        default:
            return pluralize(count, pluralizeBefore) + ' ' + count + ' ' + pluralize(count, pluralizeAfter[2]);
    }
}

function pluralize (number, forms) {
    const cases = [2, 0, 1, 1, 1, 2];
    return forms[
        (number % 100 > 4 && number % 100 < 20)
            ? 2
            : cases[(number % 10 < 5) ? number % 10 : 5]];
}

const pluralizeBefore = ['Слушает', 'Слушают', 'Слушают'];
const pluralizeAfter = [
    ['миллион человек', 'миллиона людей', 'миллионов людей'],
    ['тысяча человек', 'тысячи людей', 'тысяч человек'],
    ['человек', 'человека', 'людей']
];

