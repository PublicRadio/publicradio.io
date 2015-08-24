import React, {Component} from 'react';
import {connect} from 'react-redux';

import {Background} from './partials/Background';
import {Header} from './partials/Header';
import {Footer} from './partials/Footer';
import {Drawer} from './partials/Drawer';

import {Favorites} from './views/Favorites'
import {Recommended} from './views/Recommended'
import {Popular} from './views/Popular'



@connect(state => state.Location)
class Main extends Component {
    render () {
        switch (this.props.page) {
            case 'favorites':
                return <Favorites/>;
            case 'recommended':
                return <Recommended/>;
            case 'popular':
            default:
                return <Popular/>;
        }
    }
}

export class WebApp extends Component {
    render () {
        return <div>
            <div/* className={style.main}*/ style={{position: 'fixed', width: '100%', height: '100%'}}>
                <Background></Background>
            </div>
            <div
                className="mdl-layout mdl-js-layout mdl-layout--fixed-drawer mdl-layout--fixed-header mdl-layout--fixed-tabs mdl-layout--overlay-drawer-button">
                <Header/>
                <Drawer/>
                <Main/>
                <Footer/>
            </div>
        </div>;
    }
}
