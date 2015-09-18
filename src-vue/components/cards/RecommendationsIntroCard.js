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
                    <h2 class="mdl-card__title-text">Это рекомендации музыкальных станций специально для вас</h2>
                </div>
                <div class="mdl-card__supporting-text">
                    <div style='width: 90%' v-show="loading">
                        <p>Пожалуйста, подождите немного. Нам нужно собрать данные о ваших вкусах из Вконтакте,
                        а потом сделать предположения о том, что может вам понравиться.
                        Это недолго, правда :)</p>
                    </div>
                <div style='width: 90%' v-show="!loading">
                        <p>Это рекомендации специально для вас.</p>
                        <p>Мы проанализировали ваши аудиозаписи и нашли музыкальные паблики, вкус администраторов которых совпадает с вашим</p>
                        <p>Это то, что делает Public Radio уникальным. Мы не пытаемся механически подобрать для вас похожие песни - какой смысл в десяти одинаковых песнях? Вместо этого Public Radio пытается найти, где сидят люди с такими же вкусами, как и у вас, и играет музыку из этих сообществ.</p>
                    </div>
                </div>
                <div style="flex-grow: 1;"></div>
                <Progress v-show="loading" style="width: 100%"/>
            </div>`
});