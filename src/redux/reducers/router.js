import {ROUTER_UPDATE, ROUTER_UPDATE_OPTS, ROUTER_UPDATE_POSTFACTUM, resolveLocationData} from '../actions/router'

if (!window.history || !window.history.pushState) console.error('history API is not working')

export default function (state = {specialChar: '@', argv: resolveLocationData()}, action = {}) {
    switch (action.type) {
        case ROUTER_UPDATE:
            updateLocation(action.argv)
        //noinspection FallThroughInSwitchStatementJS
        case ROUTER_UPDATE_POSTFACTUM:
            return {...state, argv: action.argv}
        default:
            return state
    }
}

function updateLocation (argv) {
    const href = '?' + argv.join('&')
    if (document.location.href === Object.assign(document.createElement('a'), {href}).href) {
        return
    }
    window.history.pushState({argv}, argv[0], href === '?' ? '' : href)
}
