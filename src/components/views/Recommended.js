import CommonGrid from './commonGrid.js';

import introCard from '../cards/RecommendationsIntroCard';
import {vk, adviceDog} from '../../actions';

export default CommonGrid.extend({
    components: {introCard},
    methods: {
        async getItems(){
            return vk.authorized
                ? adviceDog.loadRecommended()
                : [];
        }
    }
});