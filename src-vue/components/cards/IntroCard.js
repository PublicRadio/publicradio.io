import style from './IntroCard.css';
import progress from '../widgets/Progress';
import {vk} from '../../actions.js';
import {Binded} from 'vue';

export default new Binded({
    data: vk,
    components: {progress},
    props: {
        loading: {type: Boolean, default: false}
    },
    methods: {
        authorize: () => vk.authorize()
    },
    template: `<div
            class="mdl-card mdl-shadow--2dp mdl-cell mdl-cell--12-col ${style.logoBackgroundContainer}">
            <div class=${style.logoBackground}></div>
            <div class="mdl-card__title">
                <h2 class="mdl-card__title-text">Это Public Radio</h2>
            </div>
            <div class="mdl-card__supporting-text">
                <div style="width: 90%">
                    <p>Мы берем музыкальные паблики из VK с лучшей музыкой и делаем из них почти настоящие радиостанции
                        (и даже немножко лучше).</p>
                        <p v-show="!authorized">Чтобы Public Radio подсказал станции специально для вас - авторизуйтесь в Вконтакте</p>
                </div>
            </div>
            <a class="mdl-card__actions mdl-card--border mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect" v-show="!authorized" v-on="click: authorize">
                 Войти через VK </a>

            <div class="mdl-card__menu">
                <button class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect">
                    <i class="material-icons">share</i>
                </button>
            </div>
            <div style="flex-grow: 1;"></div>
            <progress v-show="loading" style="width: 100%"/>
        </div>`
});

