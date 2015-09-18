import React from 'react'
import ReactDOM from 'react-dom'
import {Provider} from 'react-redux'
import {Root} from './components/smart/Root'
import {store} from '~/redux'

ReactDOM.render(
    <Provider store={store}><Root /></Provider>,
    document.querySelector('#root'))
