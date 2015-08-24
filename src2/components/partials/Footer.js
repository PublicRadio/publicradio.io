import React, {Component} from 'react';
import style from './Footer.css';
import {connect} from 'react-redux';
import {Player} from '../../actions.js';

@connect(state => state.PlayerState)
export class Footer extends Component {
    render () {
        const {playing, progress, currentTrack, currentTrackIsPending, currentStation, currentStationIsPending} = this.props;
        if (playing === undefined || !currentTrack)
            return false;
        else
            return <footer className={`mdl-layout__header ${style.footer}`}>
                <div className={style.progress} style={{width: (progress * 100).toFixed(1) + '%'}}></div>
                <div className={style.buttons}>
                    <Button name="skip_next" className={style.small} onClick={() => Player.next.dispatch()}/>
                    <Button name={playing ? 'pause' : 'play'} onClick={() => Player.playpause.dispatch()}/>
                </div>
                <div className={`mdl-layout__header-row ${style.info}`}>
                    {currentTrackIsPending
                        ? <div/>
                        : <div>
                         <span style={{fontSize: '120%', opacity: '.75'}}>{currentTrack.artist}</span>
                         <span style={{fontSize: '120%'}}>&nbsp;-&nbsp;</span>
                         <span style={{fontSize: '150%'}}>{currentTrack.title}</span>
                     </div>}
                    {currentStationIsPending
                        ? <div/>
                        : <div style={{opacity: '.5'}}>На станции {currentStation.name}</div>}
                </div>
            </footer>;
    }
}

class Button extends Component {
    render () {
        return <button
            className={`mdl-button mdl-js-button mdl-button--fab mdl-button--colored ${style.button} ${this.props.className || ''}`}
            onClick={this.props.onClick}>
            <i className="material-icons">{this.props.name}</i>
        </button>;
    }
}