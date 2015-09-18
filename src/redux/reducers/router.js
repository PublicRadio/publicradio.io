import {ROUTER_UPDATE} from '../actions/router'
export default function (state = {}, action = {}) {
    switch (action.type) {
        case ROUTER_UPDATE:
            const {argv, opts} = action
            return {...state, ...opts, page: argv[0]}
        default:
            return state
    }
}