import { createStore, applyMiddleware, combineReducers, compose, bindActionCreators } from 'redux';
import thunk from 'redux-thunk';
import reducers, {VK, AdviceDog} from './reducers.js';
import * as constants from './constants';

const promiseMiddleware = () =>
    (dispatch) =>
        (action) => {
            if (!action || !action.type)
                return console.trace('no action');

            const {type, result} = action;
            if (result && result.then instanceof Function) {
                result.then(
                        result => dispatch({type, result}),
                        error => dispatch({type, error}));
            }
            else
                dispatch(action);
        };


export const store = applyMiddleware(
    thunkMiddleware,
    thunk,
    promiseMiddleware
)
(createStore)
(combineReducers(
    reducers));

AdviceDog.bootstrap();
VK.bootstrap();
