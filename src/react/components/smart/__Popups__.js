import React, {Component, PropTypes} from 'react'
import * as vk from '~/redux/actions/vk'
import * as router from '~/redux/actions/router'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import {Link} from './Link'

import {Locale} from '../smart/locale'

const needAuthTypes = new Set(['recommended', 'favorites'])

@connect(state => state.vk, dispatch => bindActionCreators(vk, dispatch))
export class Intro extends Component {
    render () {
        return <div className='mdl-card mdl-shadow--2dp'>
            <div className="mdl-card__title">
                <h2 className="mdl-card__title-text"><Locale path="introPopup.title"/></h2></div>
            <div className="mdl-card__supporting-text" style={{width: '90%'}}>
                <Locale path='introPopup.body'/>
            </div>
            <div className="mdl-card__actions" style={{textAlign: 'right'}}>
                <Link href={['popular']} className="mdl-button mdl-button--colored">
                    <Locale path='introPopup.buttons.authorizeNonce'/>
                </Link>

                <div className="mdl-button mdl-button--colored" onClick={() => this.props.login({success: '?popular'})}>
                    <Locale path='introPopup.buttons.authorizeVK'/>
                </div>
            </div>
        </div>
    }
}

export class RecommendedNotAuthorized extends Component {
    render () {
        return <div className='mdl-card mdl-shadow--2dp'>
            <div className="mdl-card__title">
                <h2 className="mdl-card__title-text"><Locale path="introPopup.title"/></h2></div>
            <div className="mdl-card__supporting-text" style={{width: '90%'}}>
                <Locale path='introPopup.body'/>
            </div>
            <div className="mdl-card__actions" style={{textAlign: 'right'}}>
                <Link href={['popular']} className="mdl-button mdl-button--colored">
                    <Locale path='introPopup.buttons.authorizeNonce'/>
                </Link>

                <div className="mdl-button mdl-button--colored" onClick={this.props.login}>
                    <Locale path='introPopup.buttons.authorizeVK'/>
                </div>
            </div>
        </div>
    }
}

export class FavoritesNotAuthorized extends Component {
    render () {
        return <div className='mdl-card mdl-shadow--2dp'>
            <div className="mdl-card__title">
                <h2 className="mdl-card__title-text"><Locale path="introPopup.title"/></h2></div>
            <div className="mdl-card__supporting-text" style={{width: '90%'}}>
                <Locale path='introPopup.body'/>
            </div>
            <div className="mdl-card__actions" style={{textAlign: 'right'}}>
                <Link href={['popular']} className="mdl-button mdl-button--colored">
                    <Locale path='introPopup.buttons.authorizeNonce'/>
                </Link>

                <div className="mdl-button mdl-button--colored" onClick={this.props.login}>
                    <Locale path='introPopup.buttons.authorizeVK'/>
                </div>
            </div>
        </div>
    }
}