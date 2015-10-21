import vk from '~/services/vk'

const getGroupTrackList = (station, count) =>
    vk.getGroupTrackList(station.id, count).then(tracks => tracks.map(track => Object.assign(track, {station})))

/*todo transfer to reducers*/
function bootstrapStation (station) {
    if (!station.bootstrapped) {
        Object.assign(station, {
            bootstrapped        : true,
            playList            : [],
            trackListLoadPromise: undefined
        })
        Object.defineProperties(station, {
            trackList: {
                set(value) {
                    if (!value)
                        this.trackListLoadPromise = undefined
                    else
                        throw new Error('cannot define trackList directly')
                },
                get() {
                    if (!this.trackListLoadPromise)
                        (this.trackListLoadPromise = getGroupTrackList(station, 3))
                            .then(() => this.trackListLoadPromise = getGroupTrackList(station, 100))

                    return this.trackListLoadPromise
                }
            }
        })
    }
    return station
}


export function init () {
    return dispatch => {

    }
}


export function next () {
    return (dispatch, getState) =>
        changeTrack(dispatch, getState, getState().player.currentStation, getState().player.stationChangeId)
}

export function playpause () {
    /*todo*/
    return {type: 'PLAYER_PLAYPAUSE'}
}

export function play (station) {
    bootstrapStation(station)
    return (dispatch, getState) => {
        const playerState = getState().player
        if (playerState.currentStation !== station) {
            const stationChangeId = ++playerState.stationChangeId
            dispatch({type: 'PLAYER_STATION_CHANGE', station, stationChangeId})
            dispatch({type: 'PLAYER_TRACK_CHANGE', track: null, audio: null})
            changeTrack(dispatch, getState, station, stationChangeId)
        }
    }
}

async function pickNextTrack (station) {
    const trackList = await station.trackList
    return trackList[Math.floor(Math.random() * trackList.length)]//todo
}

async function changeTrack (dispatch, getState, station, stationChangeId) {
    while (getState().player.stationChangeId === stationChangeId) {
        const track = await pickNextTrack(station)
        const audio = document.createElement('audio')

        Object.assign(audio, {
            track,
            src    : track.url,
            destroy: () => {
                audio.pause()
                audio.src = ''
            }
        })

        dispatch({type: 'PLAYER_TRACK_CHANGE', track, audio, stationChangeId})

        await Promise.race([
            new Promise(res => audio.addEventListener('error', res)),
            new Promise(res => audio.addEventListener('canplay', res))
        ])

        if (getState().player.stationChangeId !== stationChangeId) {
            audio.destroy()
            return
        }

        if (audio.duration > 0) {
            await Promise.race([
                new Promise(res => audio.addEventListener('error', res)),
                new Promise(res => audio.addEventListener('ended', res))
            ])
        }
    }
}

export function ban (station) {

}

export function setVolume (volume) {
    return {type: 'PLAYER_SET_VOLUME', volume}
}

export function like (track) {
    return dispatch => {
        dispatch({type: 'PLAYER_TRACK_LIKED', track})
        dispatch({
            type   : 'ANALYTICS',
            action : 'like',
            object : 'track',
            payload: {
                group_id: track.station.id,
                artist  : track.artist,
                genre   : track.genre_id
            }
        })

        performLike(track)
    }
}


async function performLike (track) {
    const albums = await this._vk.call('audio.getAlbums', {offset: 0, count: 100}, '.items')
    const currentAlbumTitle = 'publicRadio.io // ' + track.station.name + ' (' + track.station.screen_name + ')'
    const albumRegex = new RegExp(`^publicRadio.io \/\/.*\(${track.station.screen_name}\)$`, 'img')
    const currentAlbum = albums.filter(album => albumRegex.test(album.title))[0]
    const {album_id} = await (currentAlbum ? Promise.resolve(currentAlbum) : vk.call('audio.addAlbum', {title: currentAlbumTitle}))

    var audio_id = await vk.call('audio.add', {audio_id: track.id, owner_id: track.owner_id})
    return Promise.all([
        vk.call('audio.moveToAlbum', {album_id, audio_ids: audio_id}),
        vk.call('audio.edit', {
            owner_id: vk.user.id,
            audio_id,
            title   : `${track.title} (найдено на PublicRadio.io)`
        })
    ])
}