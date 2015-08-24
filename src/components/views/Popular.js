import CommonGrid from './commonGrid.js';

import introCard from '../cards/IntroCard';
import {adviceDog} from '../../actions';

export default CommonGrid.extend({
    components: {introCard},
    data() {return {needAuth: false}},
    methods: {
        getItems () {
            return adviceDog.loadPopular();
        }
    }
});