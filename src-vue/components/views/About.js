import Vue from 'vue';
import {vk, adviceDog} from '../../actions';
import introCard from '../cards/AboutCard';
export default Vue.extend({
    components: {introCard},
    template: `<div class="mdl-layout__content" style="width: 100%">
            <div class="mdl-grid" style='margin-top: 48px; margin-bottom: 82px'>
                <Intro-Card loading='{{loading}}'></Intro-Card>
            </div>
        </div>`
});