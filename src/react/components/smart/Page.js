import React, {Component, PropTypes} from 'react'
import {resolver} from '../../resolver'
import vk from '~/services/vk'
import {connect} from 'react-redux'
import {StationCard} from '../pure/StationCard'

const defaultPhoto = 'https://vk.com/images/community_200.png'

export class Page extends Component {
    constructor({loader, ...props}) {
        super(props)
        this.state = {stations: []}
        loader()
        .then(ids => Promise.all(ids.map(id => vk.getGroupInfo(id, ['members_count', 'status', 'ban_info']))))
        .then(stations => stations.filter(({is_closed}) => is_closed === 0))
        .then(stations => stations.filter(({photo_200}) => photo_200 !== defaultPhoto))
        .then(stations => stations.filter(a => a))
        .then(stations => this.setState({stations}))
    }

    render () {
        return <div className="mdl-grid">
            {this.state.stations
                .map(station =>
                    <StationCard
                        className='mdl-cell mdl-cell--4'
                        key={station.id}
                        station={station}
                        {...this.props}/>)
                    }
                </div>
            }
        }
