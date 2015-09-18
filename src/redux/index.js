import {createStore, applyMiddleware, combineReducers, compose} from 'redux'
import thunkMiddleware from 'redux-thunk'
import {promiseMiddleware} from './middlewares'

const requireContextDirectory = context =>
    context.keys().reduce((acc, key) =>
        ({...acc, [key.replace(/^\.\//, '').replace(/.js$/, '')]: context(key)}), {})

const actions = requireContextDirectory(require.context('./actions', false, /.*\.js/))
const reducers = requireContextDirectory(require.context('./reducers', false, /.*\.js/))

export const store = applyMiddleware
(thunkMiddleware, promiseMiddleware)
(createStore)
(combineReducers(reducers))

store.dispatch(actions.vk.init())

window.addEventListener('popstate', () => store.dispatch(actions.router.navigate()))
window.addEventListener('pushstate', () => store.dispatch(actions.router.navigate())) //custom
window.addEventListener('hashchange', () => store.dispatch(actions.router.navigate()))
process.nextTick(() => store.dispatch(actions.router.navigate()))
store.dispatch(actions.locale.setLocale())
