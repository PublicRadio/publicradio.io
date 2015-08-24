import {Player} from '../actions.js';
import {playerUpdate} from '../constants';


export default function (state = {}, action = {}) {
    const {type, result, error} = action;
    switch (type) {
        case playerUpdate:
            return result;
        default:
            return state;
    }
};