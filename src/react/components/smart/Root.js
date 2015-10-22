import React, {Component, PropTypes} from 'react'
import {Background} from '../pure/Background'
import {Header} from '../smart/Header'
import {Drawer} from '../smart/Drawer'
import {Player} from '../smart/Player'
import {Modal} from '../smart/Modal'
import {Page} from '../smart/Page'
import vk from '~/services/vk'

import {navigate} from '~/redux/actions/router'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'

import * as popups from './__Popups__'

const preformat = (obj, specialChar) =>
obj instanceof Object
? Object.keys(obj)
.reduce((acc, key) =>
({...acc, [preformat(key.toLowerCase(), specialChar)]: obj[key]}), {})
: obj[0] === specialChar ? obj : `${specialChar}${obj}`


@connect(state => state.router, dispatch => bindActionCreators({navigate}, dispatch))
export class Root extends Component {
    constructor (props) {
        super(props)
        Object.assign(this, {
            loaders: preformat({
                popular: vk.getPopular.bind(vk),
                recommended: vk.getRecommended.bind(vk),
                favorites: vk.getFavorites.bind(vk)
            }, props.specialChar),
            popups: preformat(popups, props.specialChar),
            defaultLoaderName: preformat('popular', props.specialChar)
        })
    }
    render () {
        const {loaders, popups, defaultLoaderName} = this
        const {argv, specialChar} = this.props
        const specialItems = argv.filter(entry => entry[0] === specialChar)
        const isPage = loaders.hasOwnProperty(specialItems[0])
        const pageName = isPage ? specialItems[0] : defaultLoaderName
        const popupNames = isPage ? specialItems.slice(1) : specialItems
        const loader = loaders[pageName]
        const Popup = popups[popupNames[popupNames.length - 1]]
        const commonItems = argv.filter(entry => entry[0] !== specialChar)
        const stationName = commonItems[0]
        const isStation = Boolean(stationName)
        const basepath = [pageName, ...(stationName ? [stationName] : []), ...popupNames]
        return <div style={{display: 'flex', height: '100vh'}}>
            <div style={{display: 'flex', height: '100vh'}}>
                <div style={{position: 'fixed', width: '100%', height: '100%'}}><Background/></div>
                <Drawer basepath={basepath}/>
                <div className="mdl-layout__content">
                    <Page loader={loader} basepath={basepath} stationName={stationName}/>
                </div>
            </div>
            {isStation ? <Player stationName={stationName}/> : false}
            {Popup ? <Modal basepath={basepath}><Popup/></Modal> : false}
        </div>
    }
}
