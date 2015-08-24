import {Binded} from 'vue';
import {player} from '../../actions';
import style from './Footer.css';

export default Binded({
    data: player,
    template: `<div class="${style.footer}" v-show="currentStation">
                <div class="${style.progress}" v-style="width: (progress * 100).toFixed(1) + '%'"></div>
                <div class="${style.buttons}">
                    <m-button name="{{currentTrack && currentTrack.liked ? 'favorite' : 'favorite_border'}}" classname="${style.small}" v-on='click: like(currentTrack, currentStation)'></m-button>
                    <m-button name="skip_next" classname="${style.small}" v-on='click: next'></m-button>
                    <m-button name="{{playing !== false ? 'pause' : 'play_arrow'}}" v-on='click: playpause'></m-button>
                </div>
                <div class="mdl-layout__header-row ${style.info}">
                <div v-if='currentTrack && !currentTrackIsPending'>
                    <span style='font-size: 120%; opacity: .75'>{{currentTrack.artist}}</span>
                    <span style='font-size: 120%'>&nbsp;-&nbsp;</span>
                    <span style='font-size: 150%'>{{currentTrack.title}}</span>
                </div>
                <div v-if='currentStation && !currentStationIsPending' style="opacity: .5">На станции {{currentStation.name}}</div>
            </div>`,
    methods: {
        next: () => player.trackEnded(),
        playpause: () => player.playing = !player.playing,
        like: (track, station) => player.like(track, station)
    },
    components: {
        mButton: {
            props: {classname: {default: ''}, name: {default: ''}},
            template: `<div class="mdl-button mdl-js-button mdl-button--fab mdl-button--colored ${style.button} {{classname}}">
    <i class="material-icons">{{name}}</i>
</div>`
        }
    }
})