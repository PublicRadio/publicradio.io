import React, {Component} from 'react'
import * as player from '~/redux/actions/player'
import style from './Player.css'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'

@connect(state => state.player, dispatch => bindActionCreators(player, dispatch))
export class Player extends Component {
    render () {
        if (this.props.currentStation === null || this.props.currentTrack === null)
            return false
        else
            return <div className={style.footer}>
                <div className={`mdl-layout__header-row ${style.info}`}>
                    <div>
                        <span style={{fontSize: '120%', opacity: .75}}>{this.props.currentTrack.artist.trim()}</span>
                        <span style={{fontSize: '120%'}}>&nbsp;-&nbsp;</span>
                        <span style={{fontSize: '150%'}}>{this.props.currentTrack.title.trim()}</span>
                    </div>
                    <div style={{opacity: .5}}>На станции {this.props.currentStation.name}</div>
                </div>
                <div className={style.buttons}>
                    <i className={`material-icons ${style.button}`} onClick={this.props.like}>{this.props.currentTrack.liked ? 'favorite' : 'favorite_border'}</i>
                    <i className={`material-icons ${style.button}`} onClick={this.props.playpause}>{this.props.playing ? 'pause' : 'play_arrow'}</i>
                    <i className={`material-icons ${style.button}`} onClick={this.props.next}>skip_next</i>
                </div>
            </div>
    }
}
