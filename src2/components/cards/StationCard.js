import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Player} from '../../actions.js';
import style from './StationCard.css';

@connect(state => state.PlayerState)
export class PlayButton extends Component {
    render () {
        const {station, currentStation, currentStationIsPending, currentTrack} = this.props;
        if (currentStation === station)
            return <span className={`mdl-card__actions mdl-card--border ${style.button}`}>
                   {currentTrack && !currentStationIsPending
                       ? `Играет сейчас: ${currentTrack.artist} - ${currentTrack.title}`
                       : `Вот-вот начнем...`}
               </span>;
        else
            return <a
                className="mdl-card__actions mdl-card--border mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect"
                onClick={() => Player.playStation.dispatch(station)}>
                Слушать
            </a>;
    }
}

@connect(state => state.PlayerState)
export class StationCard extends Component {
    render () {
        const {station} = this.props;

        return <div
            className="mdl-card mdl-shadow--2dp mdl-cell mdl-cell--3-col mdl-cell--4-col-tablet mdl-cell--4-col-phone">
            <div className={`mdl-card__title ${style.stationBackground}`}
                 style={{backgroundImage: `url(${station.photo_200})`}}>
                <h2 className={`mdl-card__title-text ${style.text}`}>
                    {station.name}
                    <div style={{fontSize: '12px'}}>{getMembersString(station.members_count)}</div>
                </h2>
            </div>
            {station.status ? <div className="mdl-card__supporting-text">{station.status}</div> : false }
            <PlayButton station={station}/>
        </div>
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

function getMembersString (count) {
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