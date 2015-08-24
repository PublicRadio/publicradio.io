import {store} from './store';
const context = require.context('./reducers', false, /.*\.js/);
for (let key of context.keys()) {
    const token = key.replace(/^\.\//, '').replace(/.js$/, '');
    module.exports[token] = require('./reducers' + key.replace(/^\./, ''));
}
