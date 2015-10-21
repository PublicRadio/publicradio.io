import React, {Component} from 'react'
import style from './Header.css'
import {Link} from './Link'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'


@connect(state => state.vk)
export class Header extends Component {
    //componentDidMount () {
    //    new MaterialRipple(this.refs.el)
    //}

    render () {
        return <header className={`mdl-layout__header ${style.header}`}>
            <div className="mdl-layout__tab-bar" style={{padding: `0 40px`, boxSizing: `border-box`}} ref="ripple">
                <Link href={this.props.authorized ? ['recommended'] : ['recommended', 'recommendedNotAuthorized']} className="mdl-layout__tab">Рекомендации</Link>
                <Link href={this.props.authorized ? ['favorites'] : ['favorites', 'favoritesNotAuthorized']} className="mdl-layout__tab">Избранное</Link>
                <Link href={['popular']} className="mdl-layout__tab">Популярные</Link>
            </div>
        </header>
    }
}