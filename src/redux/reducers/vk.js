import {VK_LOGIN, VK_LOGOUT, VK_USER_INFO} from '../actions/vk'
export default function (state = {userId: null, authorized: false}, action = {}) {
    switch (action.type) {
        case VK_LOGIN:
            return {...state, userId: action.userId, authorized: true}
        case VK_USER_INFO:
            return action.userId === state.userId ? {...state, userInfo: action.userInfo} : state
        case VK_LOGOUT:
            return {...state, userId: null, authorized: false}
        default:
            return state
    }
}