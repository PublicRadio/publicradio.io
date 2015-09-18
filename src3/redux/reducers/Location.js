import {Location, Player} from '../actions.js';

export default function (state = {}, action = {}) {
    const {type, result, error} = action;
    switch (type) {
        case Location.parse:
            const {search, hash, opts} = result;
            const [station] = search;
            const [page] = hash;
            station ? Player.playStation.dispatch(station) : Player.pause.dispatch();
            return {...state, ...opts, station, page};
        default:
            return state;
    }
};