import React, {Component} from 'react';
import {Provider} from 'react-redux';
import {WebApp} from './WebApp';
import {store} from '../redux/store';

export class Wrapper extends Component {
    render () {
        return <Provider store={store}>
            {() => <WebApp />}
        </Provider>;
    }
}