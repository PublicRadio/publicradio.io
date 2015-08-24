import { createStore, applyMiddleware, combineReducers, compose, bindActionCreators } from 'redux';
import thunk from 'redux-thunk';
import reducers from './reducers.js';
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


const finalCreateStore = compose(
    applyMiddleware(thunk),
    applyMiddleware(promiseMiddleware),
    createStore);

export const store = finalCreateStore(combineReducers(reducers));

store.dispatch({type: constants.appLoad});