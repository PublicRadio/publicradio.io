import style from './IntroCard.css';
import progress from '../widgets/Progress';
import {Binded} from 'vue';
import {adviceDog, vk} from '../../actions';

export default Binded({
    data: adviceDog,
    components: {
        banList: {
            inherit: true,
            data: () => ({items: []}),
            ready() { this.update() },
            watch: {banList: 'update'},
            template: `<div class="mdl-card__supporting-text">
                <p v-repeat="item: items">{{item.name}} (/{{item.screen_name}}). <a v-on="click: remove(station)" style="cursor: pointer">Убрать из списка</a></p>
                <p v-if="items.length === 0">Пока тут ничего нет...</p>
            </div>`,
            methods: {
                update () {
                    Promise.all([...this.banList].map(id => vk.getGroupInfo(id, [])))
                        .then(items => console.log(items) || (this.items = items));
                },
                remove: station => adviceDog.unban(station)
            }
        }
    },
    template: `<div
            class="mdl-card mdl-shadow--2dp mdl-cell mdl-cell--12-col">
            <div class="mdl-card__title">
                <h2 class="mdl-card__title-text">Это ваш черный список. Тут все те сообщества, которые вы убрали из общего списка</h2>
            </div>
            <ban-list></ban-list>
        </div>
        `
});

