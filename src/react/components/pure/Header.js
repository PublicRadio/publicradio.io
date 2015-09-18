import React, {Component} from 'react'
import style from './Header.css'
import * as router from '~/redux/actions/router'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'


@connect(state => state.router, dispatch => bindActionCreators(router, dispatch))
export class Header extends Component {
    componentDidMount () {
        new MaterialRipple(this.refs.ripple)
    }

    render () {
        return <div className={`mdl-layout__header ${style.header}`}>
            <div
                className="mdl-layout__tab-bar" ref="ripple" style={{padding: `0 40px`, boxSizing: `border-box`}}>
                <a href="#recommended" className="mdl-layout__tab">Рекомендации</a>
                <a href="#favorites" className="mdl-layout__tab">Избранное</a>
                <a href="#popular" className="mdl-layout__tab is-active">Популярные</a>
            </div>
        </div>
    }
}