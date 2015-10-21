export function init () {
    return dispatch => {
        requestAnimationFrame(function tick () {
            requestAnimationFrame(tick)
            dispatch({type: 'UI_FRAME'})
        })
    }
}