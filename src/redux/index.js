import {createStore, applyMiddleware, combineReducers, compose} from 'redux'
import thunkMiddleware from 'redux-thunk'
import {promiseMiddleware} from './middlewares'

const requireContextDirectory = context =>
    context.keys().reduce((acc, key) =>
        ({...acc, [key.replace(/^\.\//, '').replace(/.js$/, '')]: context(key)}), {})


const reducers = requireContextDirectory(require.context('./reducers', false, /.*\.js/))
const middleware = applyMiddleware(thunkMiddleware, promiseMiddleware)
export const store =
    (__DEV__
            ? compose(
            middleware,
            require('redux-devtools').devTools(),
            require('redux-devtools').persistState(window.location.href.match(/[?&]debug_session=([^&]+)\b/))
        )
            : middleware
    )
    (createStore)
    (combineReducers(reducers))


/* Initializing actions section */

const actions = requireContextDirectory(require.context('./actions', false, /.*\.js/))

for (let module of [actions.locale, actions.vk, actions.player, actions.UI])
    store.dispatch(module.init())

window.addEventListener('popstate', () => store.dispatch(actions.router.storeLocation()))
