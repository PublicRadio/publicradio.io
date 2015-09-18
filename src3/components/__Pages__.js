import {IntroCard, StationCard} from './pure/Cards';
import {Grid, Cell} from './pure/Grid';
import {Intro} from '../config/';


/** semi-dumb, has non-implemented language dependency for Intro from config */
export class StationGrid extends React.Component {
    static propTypes = {
        type      : React.PropTypes.string,
        stations  : React.PropTypes.array,
        authorized: React.PropTypes.bool,
        loading   : React.PropTypes.bool
    };

    render () {
        const {type, stations, authorized, loading} = this.props;
        return <Grid>
            <Cell columns={12}><IntroCard {...{authorized, loading}} {...Intro[type]}/></Cell>
            {stations.map(station => <Cell columns={6}><StationCard {...station}/></Cell>)}
        </Grid>;
    }
}

/** smart */
export class Player extends React.Component {
    static propTypes = {
        stationName: React.PropTypes.string
    };

    render () {

    }
}