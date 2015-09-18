import React, {Component, PropTypes} from 'react'
import {IntroCard} from '../pure/IntroCard.js'
import {StationGrid} from '../pure/StationGrid.js'
import {Grid, Cell} from '../pure/Grid'
import {resolver} from '../../resolver'
import vk from '~/services/vk'
import {colorThief, imageLoadPromise} from '~/services/colorThief'
import {connect} from 'react-redux'

const prepareIds = ids =>
    Promise.all(ids.map(id => vk.getGroupInfo(id, ['members_count', 'status', 'ban_info'])))
        .then(datum => datum
            .filter(({is_closed, name}) => is_closed === 0)
            .filter(({photo_200}) => photo_200 !== 'https://vk.com/images/community_200.png'))
        .then(datum => Promise.all(datum.map((item) =>
                imageLoadPromise(item.photo_200)
                    .then(img => ({...item, colors: colorThief(img)}), (palette) => ({...item, palette}))
                    .catch(e => console.log(e) || item)
        )))
        .then(datum => datum.filter(a => a))

@connect(({vk}) => vk)
export class Intro extends Component {
    render () {return <IntroCard {...this.props}/>}
}

@resolver('stations', () => vk.getPopular().then(prepareIds))
export class Popular extends Component {
    render () {
        return <StationGrid stations={this.props.stations}><Intro type='popular'
                                                                  loading={this.props.stations === undefined} {...this.props}/></StationGrid>
    }
}

@resolver('stations', () => vk.getRecommended().then(prepareIds))
export class Recommended extends Component {
    render () {
        return <StationGrid stations={this.props.stations}><Intro type='recommended'
                                                                  loading={this.props.stations === undefined} {...this.props}/></StationGrid>
    }
}

@resolver('stations', () => vk.getFavorites().then(prepareIds))
export class Favorites extends Component {
    render () {
        return <StationGrid stations={this.props.stations}><Intro type='favorites'
                                                                  loading={this.props.stations === undefined} {...this.props}/></StationGrid>
    }
}

