import {Binded} from 'vue';
import Vue from 'vue';
import style from './Header.css';
import {vk} from '../../actions';

export default Binded({
    data: vk,
    template: `<div class="mdl-layout__header ${style.header}">
            <div
                class="mdl-layout__tab-bar mdl-js-ripple-effect" style="padding: 0 40px; box-sizing: border-box">
                <a href="#recommended" class="mdl-layout__tab" v-show="authorized">Рекомендации</a>
                <a href="#favorites" class="mdl-layout__tab" v-show="authorized">Избранное</a>
                <a href="#popular" class="mdl-layout__tab is-active">Популярные</a>
            </div>
        </div>`,
    ready() {
        if (this.$el)
            for (let el of this.$el.querySelectorAll('.mdl-js-ripple-effect'))
                new MaterialRipple(el);
    }
});