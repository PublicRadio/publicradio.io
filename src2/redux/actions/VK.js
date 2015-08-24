import {vk} from './abstractions/';

export async function getAuthState () {
    const authState = await vk.getLoginStatus();
    if (authState.session)
        return {...authState, user: await getUserInfo(authState.session.mid)};
    else
        return authState;
}
export function getUserInfo (id) {
    return vk.getUserInfo(id, ['photo_200']);
}

export async function bootstrap () {
    if (vk.__initError)
        return Promise.reject(vk.__initError);

    return await getAuthState();
}

export async function needGroupInfo (group_id) {
    return {[group_id]: await vk.getGroupInfo(group_id)};
}