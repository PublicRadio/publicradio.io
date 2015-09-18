import {stationPlayer} from './abstractions';
import {playerUpdate} from '../constants';
export function playStation (station) {
    stationPlayer.currentStation = station;
}

export function playpause () {
    stationPlayer.playing = !stationPlayer.playing;
}

export function pause () {
    stationPlayer.playing = false;
}

export function next () {
    stationPlayer.startTrack();
}

export function __bindDispatcher (dispatcher) {
    stationPlayer.listener = function (result) {
        dispatcher({type: playerUpdate, result});
    };
}