import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import {WebApp} from './components/Root';
import {store} from '../redux/store';
import React from 'react';
window.React = React;

class Wrapper extends React.Component {
    render () {
        return <Provider store={store}>
            {() => <Root />}
        </Provider>;
    }
}

ReactDOM.render(
    <Wrapper/>,
    document.querySelector('#root')
);
