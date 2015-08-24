import style from './Drawer.css';
import {vk} from '../../actions';
import {Binded} from 'vue';

export default Binded({
    data: vk,
    template: `<div class='mdl-layout__drawer'>
            <span class='mdl-layout-title'>Public Radio</span>
            <div v-if='user' class='mdl-navigation__link ${style.userView}'>
                <div class=${style.userInfo}>
                <i class=${style.userImage} v-style='backgroundImage: "url(" + user.photo_200 + ")"'></i>
                    <span>
                        {{user.first_name}} {{user.last_name}}
                    </span>
                    <button class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect" v-on='click: logout'>
                        <i class="material-icons">exit_to_app</i>
                    </button>
                </div>
            </div>
            <nav class='mdl-navigation' style='flex-grow: 1'>
                <a class='mdl-navigation__link' href="#settings" v-show="authorized">Настройки</a>

                <div style='flex-grow: 1'></div>
                <a class='mdl-navigation__link' href="#about">О проекте</a>
                <a class='mdl-navigation__link' href="#feedback">Обратная связь</a>
            </nav>
        </div>`,
    methods: {
        logout: () => vk.logout()
    }
});