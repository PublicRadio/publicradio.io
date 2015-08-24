import React, {Component} from 'react';
import style from './IntroCard.css';
import {connect} from 'react-redux';
import {Progress} from '../widgets/Progress';


@connect(state => state.VK)
export class FavoritesIntroCard extends Component {
    render () {
        const {authorized, loading} = this.props;
        if (authorized) {
            return <div
                className={"mdl-card mdl-shadow--2dp mdl-cell mdl-cell--12-col " + style.logoBackgroundContainer}>
                <div className={style.logoBackground}></div>
                <div className="mdl-card__title">
                    <h2 className="mdl-card__title-text">Это ваше избранное в Public Radio</h2>
                </div>
                <div className="mdl-card__supporting-text">
                    <div style={{width: '90%'}}>
                        <p>На самом деле это все те ваши группы из Вконтакте, которые похожи на музыкальные.</p>

                        <p>То есть которые мы можем играть.</p>
                    </div>
                </div>
                {loading ? <Progress style={{width: '100%'}}/> : false}
            </div>
        } else {
            return <div
                className={"mdl-card mdl-shadow--2dp mdl-cell mdl-cell--12-col " + style.logoBackgroundContainer}>
                <div className={style.logoBackground}></div>
                <div className="mdl-card__title">
                    <h2 className="mdl-card__title-text">Это ваше избранное в Public Radio</h2>
                </div>
                <div className="mdl-card__supporting-text">
                    <div style={{width: '90%'}}>
                        <p>Сейчас тут ничего нет.</p>

                        <p>Почему? Потому что избранное в Public Radio - это ваши группы Вконтакте, которые мы считаем
                            музыкальными.</p>

                        <p>Это очень удобно: мы не храним ваши личные данные, а вы видите группы и тут, в избранном, и в
                            своей ленте новостей (Не бойтесь, их можно скрыть оттуда в один клик)</p>

                        <p>К сожалению, сейчас вы еще не вошли через VK, поэтому тут ничего нет :(</p>
                    </div>
                </div>
                <a className="mdl-card__actions mdl-card--border mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect">
                    Войти через VK
                </a>
            </div>
        }
    }
}