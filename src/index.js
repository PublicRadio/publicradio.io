import Vue from 'vue';
import './lib/BindedVue';
Vue.config.debug = true;
import WebApp from './components/WebApp';

new WebApp({el: '#root'});