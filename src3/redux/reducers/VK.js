import {VK, AdviceDog} from '../actions.js';
import * as constants from '../constants';

export default function (oldState = {}, action = {}) {
    const {type, result, error} = action;
    let state = oldState;
    switch (type) {
        case constants.appLoad:
            VK.bootstrap.dispatch();
            return oldState;
        case VK.bootstrap:
            if (result)
                state = {...oldState, authorized: !!result.user, user: result.user};
            break;
        case VK.login:
            state = {...oldState, authorized: true}; //todo
            break;
        case VK.logout:
            state = {...oldState, authorized: false}; //todo
            break;
    }
    if (state.authorized !== oldState.authorized) {
        if (state.authorized)
            AdviceDog.personalize.dispatch(state.user);
        else
            AdviceDog.depersonalize.dispatch();
    }

    return state;
};