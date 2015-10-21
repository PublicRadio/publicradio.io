import {VK_LOGIN, VK_LOGOUT, VK_USER_INFO} from '../actions/vk'
import TWEEN, {Tween, Easing} from 'tween.js'
(function animate () {
    setTimeout(animate, 0)
    TWEEN.update()
})()

const players = new Set

export default function (state = {
    paused         : true,
    currentTime    : 0,
    currentTrack   : null,
    currentStation : null,
    stationChangeId: 0,
    banList        : new Set,
    volume         : 1,
    trackHistory   : []
}, action = {}) {
    switch (action.type) {
        case 'UI_FRAME':
            return {
                ...state,
                currentTime: state.currentTrack && state.currentTrack.player.duration / state.currentTrack.player.currentTime || 0
            }
        case 'PLAYER_NEXT':
        case 'PLAYER_PLAYPAUSE':
            if (state.playing)
                for (let player of players) {
                    if (player.volumeTween) {
                        player.volumeTween.stop()
                        player.volumeTween = null
                    }

                    player.pause()
                    if (players.size > 1)
                        players.delete(player)
                }
            else
                for (let player of players) {
                    if (player.volumeTween)
                        player.volumeTween.stop()

                    player.play()
                    if (players.size > 1)
                        players.delete(player)
                }
            return {...state, playing: !state.playing}
        case 'PLAYER_STATION_CHANGE':
            return {
                ...state,
                currentStation : action.station,
                currentTrack   : null,
                stationChangeId: action.stationChangeId
            }
        case 'PLAYER_TRACK_CHANGE':
            return {...state, currentTrack: action.track, playing: true}
        case 'PLAYER_AUDIO_CHANGE':
            for (let player of players)
                trackEnding(player)
            if (action.audio) {
                const player = action.audio
                Object.assign(player, {
                    volumeCorrection: 0,
                    volumeLevel     : state.volume,
                    updateVolume    : () => player.volume = player.volumeLevel * player.volumeCorrection
                })
                state.track.player = player
                trackStarting(player)
                trackStarted(player)
            }
            return {...state, playing: true}
        case 'PLAYER_SET_VOLUME':
            for (let player of players)
                Object.assign(player, player.volumeTween ? {volumeLevel: volume} : {volume})
            return {...state, volume: action.volume}
        default:
            return state
    }
}

function trackPaused (player) {
    player.pause()
    if (player.volumeTween)
        player.volumeTween.stop()
}

function trackStarted (player) {
    player.play()
    if (player.volumeTween)
        player.volumeTween.start()
}

function trackStarting (player) {
    if (player.volumeTween)
        player.volumeTween.stop()

    player.volumeTween = new Tween(player)
        .to({volumeCorrection: 1}, (players.size > 0 ? 2000 : 500) * (1 - player.volumeCorrection))
        .easing(Easing.Quintic.InOut)
        .onStart(player.updateVolume)
        .onUpdate(player.updateVolume)
        .onComplete(() => player.volumeTween = null)
    players.add(player)
    window.player = player
}

function trackEnding (player) {
    if (player.volumeTween)
        player.volumeTween.stop()

    if (player.volumeCorrection > 0)
        player.volumeTween = new Tween(player)
            .to({volumeCorrection: 0}, 2000 * player.volumeCorrection)
            .easing(Easing.Quintic.InOut)
            .onUpdate(player.updateVolume)
            .onComplete(() => {
                player.destroy()
                players.delete(player)
            })
            .start()
    else {
        player.destroy()
        players.delete(player)
    }
}