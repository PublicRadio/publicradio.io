import {AdviceDog} from '../actions.js';

export default function (state = {}, action = {}) {
    const {type, result, error} = action;
    switch (type) {
        case AdviceDog.personalize:
            return {...state, recommendations: result};
        case AdviceDog.depersonalize:
            return {...state, recommendations: result};
        default:
            return state;
    }
};