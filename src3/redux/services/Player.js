import StateService, {emitter, observableProperty} from './__State__';
import {Router} from './Router';


@emitter('playing')
@emitter('currentStation')
@observableProperty('volume', ({_audioElement, volume}) => _audioElement && (_audioElement.volume = volume))
@observableProperty('playing', (self) => self.playing ? self._play() : self._pause())
@observableProperty('currentStation', (self) => self.startTrack())
export class Player extends StateService {
    constructor () {
        Router.getInstance()
            .onStateChange(({persistentState: stationName}) => this.currentStation = stationName || null, true);
    }

    @observableProperty
    currentStation () {

    }
}
