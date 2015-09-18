import {Binded} from 'vue';
import style from './Main.css';
import {navigator} from '../actions';
import favorites from './views/Favorites.js';
import recommended from './views/Recommended.js';
import popular from './views/Popular.js';
import about from './views/About.js';
import settings from './views/Settings.js';
import feedback from './views/Feedback.js';


navigator.pages = new Set(['favorites', 'recommended', 'popular', 'about', 'settings', 'feedback']);
navigator.defaultPage = 'popular';
navigator.locationUpdated();
export default Binded({
    data: navigator,
    components: {
        favorites, recommended, popular, about, settings, feedback,
        mButton: {
            props: {classname: {default: ''}, name: {default: ''}},
            template: `<div class="mdl-button mdl-js-button mdl-button--fab mdl-button--colored ${style.button} {{classname}}">
    <i class="material-icons">{{name}}</i>
    <content></content>
</div>`
        }
    },
    template: `<div><component is='{{page}}'/></div>`
})