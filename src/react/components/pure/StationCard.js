import React, {Component, PropTypes} from 'react'
import style from './StationCard.css'

const stationPropType = PropTypes.shape({
    id           : PropTypes.number.isRequired,
    photo_200    : PropTypes.string.isRequired,
    is_member    : PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.number
    ]),
    members_count: PropTypes.number.isRequired,
    status       : PropTypes.string
})

const SubscribeIframe = ({id}) => <iframe
    frameBorder="0"
    src={`https://vk.com/widget_subscribe.php?_ver=1&oid=-${id}&mode=1&soft=1`}
    width="100%"
    height="22"
    scrolling="no"
    style={{overflow: 'hidden'}}/>


export class StationCard extends Component {
    static propTypes = {
        station                : stationPropType.isRequired,
        currentStation         : stationPropType,
        currentStationIsPending: PropTypes.bool,
        ban                    : PropTypes.func.isRequired,
        play                   : PropTypes.func.isRequired
    }

    render () {
        const {station, currentStation, currentTrack, ban, play, className = ''} = this.props
        return <div className={`mdl-card mdl-shadow--2dp ${style.card} ${className}`}>
            <div className={`mdl-card__title ${style.stationBackground}`}
                 style={{backgroundImage: `url(${station.photo_200})`}}>
                <h2 className={`mdl-card__title-text ${style.text}`}>
                    {station.name}
                    <div style={{fontSize: '12px'}}>{membersString(station.members_count)}</div>
                </h2>
            </div>

            {/*<div classNameName={style.buttonTiny} name={station.is_member ? 'star' : 'star_border'}>
                <SubscribeIframe id={station.id}/>
            </div>*/}

            {station.status ? <div className="mdl-card__supporting-text">{station.status}</div> : ''}


            <div className="mdl-card__menu">
                <button className={`mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect ${style.icons}`}>
                    <i className="material-icons" onClick={() => ban(station)}>close</i>
                </button>
            </div>
            {currentStation && station.id === currentStation.id
                ? <span className={`mdl-card__actions mdl-card--border ${style.button}`}>
                {currentTrack
                    ? `Играет сейчас: ${currentTrack.artist} - ${currentTrack.title}`
                    : `Вот-вот начнем...`}
           </span>
                : <a
                 className="mdl-card__actions mdl-card--border mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect"
                 onClick={() => play(station)}>Слушать</a>
            }
        </div>
    }
}

function rgbize ([r,g,b] = colors.black) {
    return `rgb(${r.toFixed()}, ${g.toFixed()}, ${b.toFixed()})`
}


function findAppropriateColor (rgb = colors.black) {
    const [h,s,l] = RGB2HSL(rgb)
    if (l > maxLightness * (1 - colorBorderThreshold)) {
        return colors.white
    } else if (l < maxLightness * colorBorderThreshold) {
        return colors.black
    } else if (s < colorBorderThreshold) {
        return l > maxLightness / 2 ? colors.white : colors.black
    } else {
        const distances = materialColorsHSL.map(([colorH]) => Math.abs(colorH - h))
        const min = Math.min(...distances)
        const minIdx = distances.indexOf(min)
        return materialColorsRGB[minIdx]
    }
}


function RGB2HSL ([r, g, b]) {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let l = (max + min) / 2

    if (max == min) {
        return [0, 0, l]
    } else {
        let d = max - min
        let h
        if (max === r)
            h = (g - b) / d + (g < b ? 6 : 0)
        else if (max === g)
            h = (b - r) / d + 2
        else
            h = (r - g) / d + 4
        return [
            h / 6,
            d / 2 / (l > 0.5 ? 1 - l : l),
            l];
    }
}

function HSL2RGB ([h, s, l]) {
    var r, g, b

    if (s == 0) {
        r = g = b = l // achromatic
    } else {
        function hue2rgb (p, q, t) {
            if (t < 0) t += 1
            if (t > 1) t -= 1
            if (t < 1 / 6) return p + (q - p) * 6 * t
            if (t < 1 / 2) return q
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
            return p
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s
        var p = 2 * l - q
        r = hue2rgb(p, q, h + 1 / 3)
        g = hue2rgb(p, q, h)
        b = hue2rgb(p, q, h - 1 / 3)
    }

    return [r * 255, g * 255, b * 255]
}

function membersString (count) {
    switch (true) {
        case count > 2 * 1000 * 1000:
            count = Math.floor(count / (1000 * 1000));
            return pluralize(count, pluralizeBefore) + ' ' + count + ' ' + pluralize(count, pluralizeAfter[0]);
        case count > 2 * 1000:
            count = Math.floor(count / 1000);
            return pluralize(count, pluralizeBefore) + ' ' + count + ' ' + pluralize(count, pluralizeAfter[1]);
        default:
            return pluralize(count, pluralizeBefore) + ' ' + count + ' ' + pluralize(count, pluralizeAfter[2]);
    }
}


function pluralize (number, forms) {
    const cases = [2, 0, 1, 1, 1, 2];
    return forms[
        (number % 100 > 4 && number % 100 < 20)
            ? 2
            : cases[(number % 10 < 5) ? number % 10 : 5]];
}

const pluralizeBefore = ['Слушает', 'Слушают', 'Слушают'];
const pluralizeAfter = [
    ['миллион человек', 'миллиона людей', 'миллионов людей'],
    ['тысяча человек', 'тысячи людей', 'тысяч человек'],
    ['человек', 'человека', 'людей']
];
