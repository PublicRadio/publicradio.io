import Vue from 'vue';
Vue.Binded = function BindedVue (opts) {
    const data = opts.data;
    opts.data = () => data.toJSON();
    opts.created = function () {
        data.addEventListener('stateChange', this.stateChangeFN = () => Object.assign(this, data.toJSON()))
    };
    opts.destroyed = function () {
        data.removeEventListener('stateChange', this.stateChangeFN)
    };
    return Vue.extend({...opts, data: () => data.toJSON()});
};