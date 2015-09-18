import React, {Component, PropTypes} from 'react'

import {Grid, Cell} from './Grid.js'
import {StationCard} from './StationCard.js'

export class StationGrid extends Component {
    static propTypes = {
        stations: PropTypes.array
    }

    render () {
        return <Grid>
            {this.props.children}
            {(this.props.stations || []).map(station =>
                <Cell columns={4}><StationCard {...station}/></Cell>)}
        </Grid>
    }
}