import React, {Component} from 'react';
import style from './IntroCard.css';
import {connect} from 'react-redux';
import {Progress} from '../widgets/Progress';


@connect(state => state.VK)
export class IntroCard extends Component {
    render () {
        const {authorized, loading} = this.props;
        return <div
            className={"mdl-card mdl-shadow--2dp mdl-cell mdl-cell--12-col " + style.logoBackgroundContainer}>
            <div className={style.logoBackground}></div>
            <div className="mdl-card__title">
                <h2 className="mdl-card__title-text">Это Public Radio</h2>
            </div>
            <div className="mdl-card__supporting-text">
                <div style={{width: '90%'}}>
                    <p>Мы берем музыкальные паблики из VK с лучшей музыкой и делаем из них почти настоящие радиостанции
                        (и даже немножко лучше).</p>
                    {authorized
                        ? false
                        : <p>Чтобы Public Radio подсказал станции специально для вас - авторизуйтесь в Вконтакте</p>}
                </div>
            </div>
            {authorized
                ? false
                : <a className="mdl-card__actions mdl-card--border mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect">
                 Войти через VK
             </a> }

            <div className="mdl-card__menu">
                <button className="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect">
                    <i className="material-icons">share</i>
                </button>
            </div>
            {loading ? <Progress style={{width: '100%'}}/> : false}
        </div>
    }
}

