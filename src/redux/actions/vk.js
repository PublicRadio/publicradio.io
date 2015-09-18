import vk from '~/services/vk'

export const VK_LOGIN = 'VK_LOGIN'
export const VK_LOGOUT = 'VK_LOGOUT'
export const VK_USER_INFO = 'VK_USER_INFO'

export function init () {
    return function (dispatch) {
        const onLogin = () => {
            const userId = Number(vk._VK.Auth.getSession().mid)
            dispatch({type: VK_LOGIN, userId})
            vk.getUserInfo(userId, ['photo_200'])
                .then(userInfo => dispatch({type: VK_USER_INFO, userId, userInfo}))
        }

        const onLogout = () => dispatch({type: VK_LOGOUT})

        vk._VK.Observer.subscribe('auth.login', onLogin)
        vk._VK.Observer.subscribe('auth.logout', onLogout)

        const session = vk._VK.Auth.getSession()
        if (!session)
            vk.getLoginStatus()
        else if (session.mid)
            onLogin()
    }
}

export function login () {
    vk.login()
}

export function logout () {
    vk.logout()
}