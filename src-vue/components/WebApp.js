import Vue from 'vue';
import background from './partials/Background.js';
import header from './partials/Header.js';
import drawer from './partials/Drawer.js';
import footer from './partials/Footer.js';
import main from './Main.js';

export default Vue.extend({
    components: {header, drawer, footer, background, main},
    template: `<div>
            <div style='position: fixed; width: 100%; height: 100%'><Background></Background></div>
            <div class="mdl-layout mdl-js-layout mdl-layout--fixed-header mdl-layout--fixed-tabs mdl-layout--overlay-drawer-button">
                <Header></Header>
                <Drawer></Drawer>
                <Main></Main>
                <Footer></Footer>
            </div>
        </div>`
});