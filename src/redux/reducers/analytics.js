export default function (state = {}, action = {}) {
    switch (action.type) {
        case 'ANALYTICS':
            if (window.ga)
                window.ga('send', 'event', 'social', action.action, action.object, action.payload);
            return state
        default:
            return state
    }
}