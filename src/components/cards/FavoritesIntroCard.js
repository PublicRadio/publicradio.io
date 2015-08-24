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
    template: `<div class="mdl-card mdl-shadow--2dp mdl-cell mdl-cell--12-col ${style.logoBackgroundContainer}">
                <div class=${style.logoBackground}></div>
                <div class="mdl-card__title">
                    <h2 class="mdl-card__title-text">Это ваше избранное в Public Radio</h2>
                </div>
                <div class="mdl-card__supporting-text">
                    <div style='width: 90%' v-if="!authorized">
                        <p>Сейчас тут ничего нет.</p>

                        <p>Почему? Потому что избранное в Public Radio - это ваши группы Вконтакте, которые мы считаем
                            музыкальными.</p>

                        <p>Это очень удобно: мы не храним ваши личные данные, а вы видите группы и тут, в избранном, и в
                            своей ленте новостей (Не бойтесь, их можно скрыть оттуда в один клик)</p>

                        <p>К сожалению, сейчас вы еще не вошли через VK, поэтому тут ничего нет :(</p>
                    </div>
                    <div style='width: 90%'  v-if="authorized">
                        <p>На самом деле это все те ваши группы из Вконтакте, которые похожи на музыкальные.</p>

                        <p>То есть которые мы можем играть.</p>
                    </div>
                </div>
                <a class="mdl-card__actions mdl-card--border mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect" v-show="!authorized" v-on="click: authorize">
                 Войти через VK </a>
                <div style="flex-grow: 1;"></div>
                <Progress v-show="f" style="width: 100%"/>
            </div>`
});