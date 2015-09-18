import React, {Component} from 'react'
import style from './Drawer.css'
import * as vk from '~/redux/actions/vk'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'


@connect(state => state.vk, dispatch => bindActionCreators(vk, dispatch))
export class Binded extends Component {
    render () {
        return <div className='mdl-layout__drawer'>
            <span className='mdl-layout-title'>Public Radio</span>
            {this.props.userInfo
                ? <div v-if='user' className={`mdl-navigation__link ${style.userView}`}>
                 <div className={style.userInfo}>
                     <i className={style.userImage} style={{backgroundImage: `url(${this.user.photo_200})`}}></i>
                    <span>
                        {this.user.first_name} {this.user.last_name}
                    </span>
                     <button className="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect"
                             onClick={this.props.logout}>
                         <i className="material-icons">exit_to_app</i>
                     </button>
                 </div>
             </div>
                : false}

            <nav className='mdl-navigation' style={{flexGrow: 1}}>
                {this.props.authorized
                    ? <a className='mdl-navigation__link' href="#settings">Настройки</a>
                    : false}


                <div style={{flexGrow: 1}}></div>
                <a className='mdl-navigation__link' href="#about">О проекте</a>
                <a className='mdl-navigation__link' href="#feedback">Обратная связь</a>
            </nav>
        </div>
    }
}