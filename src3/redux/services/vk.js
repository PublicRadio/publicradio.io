import StateService from './__State__';


export class vk extends StateService {
    static permissions = 2 + 8 + 262144;
    _VK = window.VK;
    authorize () {
        return new Promise(res => this._VK.Auth.login(res, vk.permissions));
    }
}