const context = require.context('./actions', false, /.*\.js/);

const {actions, binders} = require.context('./actions', false, /.*\.js/).keys()
    .map(key => ({
        token: key.replace(/^\.\//, '').replace(/.js$/, ''),
        module: require('./actions' + key.replace(/^\./, ''))
    }))
    .reduce(({actions, binders}, {token, module: {__bindDispatcher, ...moduleActions}}) => ({
        actions: {...actions, [token]: createActions(token, moduleActions)},
        scopes: __bindDispatcher ? binders.set(token, __bindDispatcher) : binders
    }), {actions: {}, scopes: new Map()});

export default actions;

process.nextTick(() => {
    const {store} = require('./store.js');
    const dispatch = store.dispatch.bind(dispatch);
    for (let [token, bind] of binders)
        bind(dispatch, actions[token]);
});

function createActions (domain, actions) {
    return Object.keys(actions)
        .map(key => ({key, action: actions[key], type: `${domain}-${key}`}))
        .reduce((acc, {key, action, type}) => ({
            ...acc,
            [key]: Object.assign(function actionCaller (...args) {
                return {result: action(...args), type: actionCaller}
            }, {dispatch, toString: () => type})
        }), {});
}

function dispatch (...args) { return require('./store.js').store.dispatch(this(...args)); }