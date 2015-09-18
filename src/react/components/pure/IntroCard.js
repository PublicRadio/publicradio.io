import React, {Component, PropTypes} from 'react'
import {Locale} from '../smart/locale'
import style from './IntroCard.css'

const needAuthTypes = new Set(['recommended', 'favorites'])

export class IntroCard extends Component {
    static propTypes = {
        type      : PropTypes.string,
        authorized: PropTypes.bool,
        loading   : PropTypes.bool
    }

    render () {
        const {loading, authorized, type} = this.props
        return <div className={`mdl-card mdl-shadow--2dp mdl-cell mdl-cell--12-col ${style.logoBackgroundContainer}`}>
            <div className={style.logoBackground}></div>
            <div className="mdl-card__title">
                <h2 className="mdl-card__title-text"><Locale path={`intro.${type}.title`}/></h2></div>
            <div className="mdl-card__supporting-text" style={{width: '90%'}}>
                <Locale
                    path={ !authorized && needAuthTypes.has(type)
                     ? `intro.${type}.unauthorizedBody`
                     : loading ? `intro.${type}.loadingBody` : `intro.${type}.body` }/>
            </div>

            <div style={{flexGrow: 1}}/>
            {(!needAuthTypes.has(type) || authorized)
                ? loading ? <div className="mdl-progress mdl-js-progress mdl-progress__indeterminate" style={{width: '100%'}}/> : false
                : <a
                 className="mdl-card__actions mdl-card--border mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect"
                 onClick={() => vk.authorize()}> <Locale path='VK.authorize'/> </a>}
        </div>
    }
}
