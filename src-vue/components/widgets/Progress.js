import Vue from 'vue';

export default Vue.extend({
    props: ['style', 'class'],
    template: `<div class="mdl-progress mdl-js-progress mdl-progress__indeterminate {{class || ''}}" style="{{style || ''}}"/>`
});
