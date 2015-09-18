import Vue from 'vue';
import stationCard from '../cards/StationCard';
import {vk, adviceDog} from '../../actions';

export default Vue.extend({
    components: {introCard: {}, stationCard},
    data() {return {items: [], loading: false}},
    ready () {
        this.render();
        vk.addEventListener('stateChange', () => this.render());
        adviceDog.addEventListener('stateChange', () => this.render());
    },
    methods: {
        render() {
            this.loading = true;
            const promise = this.promise = this.getItems();
            promise.then(items => {
                if (promise === this.promise) {
                    this.items = items;
                } else {
                    return promise;
                }
            }).then(() => this.loading = false);
        }
    },
    template: `<div class="mdl-layout__content" style="width: 100%">
            <div class="mdl-grid" style='margin-top: 48px; margin-bottom: 82px'>
                <Intro-Card loading='{{loading}}'></Intro-Card>
                <Station-Card v-repeat='station: items'></Station-Card>
            </div>
        </div>`
})