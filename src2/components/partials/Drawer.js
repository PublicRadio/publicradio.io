import React, {Component} from 'react';
import style from './Drawer.css';
import {connect} from 'react-redux';
import {VK} from '../../actions.js';

@connect(state => state.VK)
export class Drawer extends Component {
    render () {
        return <div className="mdl-layout__drawer">
            <span className="mdl-layout-title">Public Radio</span>
            <UserInfo user={this.props.user}/>
            <nav className="mdl-navigation" style={{flexGrow: 1}}>
                <a className="mdl-navigation__link">Настройки</a>

                <div style={{flexGrow: 1}}></div>
                <a className="mdl-navigation__link" /*todo*/>О проекте</a>
                <a className="mdl-navigation__link" /*todo*/>Обратная связь</a>
            </nav>
        </div>
    }
    /*<div className="mdl-navigation__link" style={{backgroundColor: 'transparent !important'}}>
     <div className="mdl-textfield mdl-js-textfield">
     <input className="mdl-textfield__input"
     type="text"
     placeholder="Искать..."
     style={{outline: 'none'}}>
    </div>
    </div>*/
}

export class UserInfo extends Component {
    render () {
        const {user} = this.props;
        if (!user)
            return false;

        return <div className={`mdl-navigation__link ${style.userView}`}>
            <div className={style.userInfo}>
                <i className={style.userImage} style={{backgroundImage: `url(${user.photo_200})`}}/>
                <span>
                    {user.first_name} {user.last_name}
                    <a className={style.exitButton} onClick={() => VK.logout.dispatch()}>Выйти?</a>
                </span>
            </div>
        </div>
    }
}