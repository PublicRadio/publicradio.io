import {Emitter} from './Emitter'
export class Navigator extends Emitter {
    constructor (location, vk, player) {
        super();
        this.location = location;
        this._vk = vk;
        this._player = player;
        location.addEventListener('stateChange', () => { this.locationUpdated() });
        this.locationUpdated();
    }

    async locationUpdated ({hash, search} = this.location) {
        const opts = extractOpts(search, hash);
        const [station] = extractArgv(search);
        let [page] = extractArgv(hash);

        if (this.pages && !this.pages.has(page))
            page = this.defaultPage;

        Object.assign(this, {opts, station, page});
        this.dispatchStateChange();
        if (station) {
            this._player.currentStation = await this._vk.getGroupInfo(station,
                {fields: ['description', 'members_count', 'status', 'is_member']})
        }
    }
}


function extractArgv (string = '') {
    const entries = string.split('&');
    return entries.filter(e => e.indexOf('=') === -1)
}

function extractOpts (string = '', ...rest) {
    const entries = string.split('&');
    return entries.filter(e => e.indexOf('=') !== -1)
        .map(opt => opt.split('='))
        .reduce((acc, [key, value]) => ({...acc, [key]: value}), rest.length > 0 ? extractOpts(...rest) : {})
}