import React, {Component} from 'react';
import style from './Header.css';
import {Link} from '../Link.js';

export class Header extends Component {
    render () {
        return <header className={`mdl-layout__header ${style.header}`}>
            <div
                className="mdl-layout__tab-bar mdl-js-ripple-effect" style={{padding: '0 40px', boxSizing: 'border-box'}}>
                <Link href="#recommended" className="mdl-layout__tab">Рекомендации</Link>
                <Link href="#favorites" className="mdl-layout__tab">Избранное</Link>
                <Link href="#popular" className="mdl-layout__tab is-active">Популярные</Link>
            </div>
        </header>
    }
}