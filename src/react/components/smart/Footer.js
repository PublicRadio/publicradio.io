import React, {Component} from 'react'
import * as player from '~/redux/actions/player'
import style from './Footer.css'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'

class Button extends Component {
    render () {
        return <div
            className={`mdl-button mdl-js-button mdl-button--fab mdl-button--colored ${style.button} ${this.props.className}`}>
            <i className="material-icons">{this.props.name}</i>
        </div>
    }
}

@connect(state => state.player, dispatch => bindActionCreators(player, dispatch))
export class Footer extends Component {
    render () {
        if (this.props.currentStation === null)
            return false

        else if (this.props.currentTrack === null)
            return <div className={style.footer}>
                <div className={style.progress} style={{width: (this.props.progress * 100).toFixed(1) + '%'}}></div>
                <div className={`mdl-layout__header-row ${style.info}`}>
                    <div style={{opacity: .5}}>На станции {this.props.currentStation.name}</div>
                </div>
            </div>
        else
            return <div className={style.footer}>
                <div className={style.progress} style={{width: (this.props.progress * 100).toFixed(1) + '%'}}></div>
                <div className={style.buttons}>
                    <Button className={style.small}
                            name={this.props.currentTrack.liked ? 'favorite' : 'favorite_border'}
                            onClick={this.props.like}/>
                    <Button className={style.small} name='skip_next' onClick={this.props.next}/>
                    <Button name={this.props.playing ? 'pause' : 'play_arrow'} onClick={this.props.playpause}/>
                </div>

                <div className={`mdl-layout__header-row ${style.info}`}>
                    <div>
                        <span style={{fontSize: '120%', opacity: .75}}>{this.props.currentTrack.artist}</span>
                        <span style={{fontSize: '120%'}}>&nbsp;-&nbsp;</span>
                        <span style={{fontSize: '150%'}}>{this.props.currentTrack.title}</span>
                    </div>
                    <div style={{opacity: .5}}>На станции {this.props.currentStation.name}</div>
                </div>
            </div>
    }
}