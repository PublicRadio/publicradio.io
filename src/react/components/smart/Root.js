import React, {Component, PropTypes} from 'react'
import {connect} from 'react-redux'
import {Background} from '../pure/Background'
import {Header} from '../pure/Header'
import {Drawer} from '../smart/Drawer'
import {Footer} from '../smart/Footer'

import * as pages from './__Pages__'

const lowercasePages = Object.keys(pages).reduce((acc, key) => ({...acc, [key.toLowerCase()]: pages[key]}), {})
const DefaultPage = pages.Popular

@connect(state => state.router)
export class Root extends Component {
    render () {
        const Page = this.props.page && lowercasePages.hasOwnProperty(this.props.page.toLowerCase())
            ? lowercasePages[this.props.page.toLowerCase()]
            : DefaultPage
        return <Page/>

        return <div>
            <div style='position: fixed; width: 100%; height: 100%'><Background></Background></div>
            <div className="mdl-layout mdl-js-layout mdl-layout--fixed-header mdl-layout--fixed-tabs mdl-layout--overlay-drawer-button">
                <Header/>
                <Drawer/>
                <Page/>
                <Footer/>
            </div>
        </div>
    }
}