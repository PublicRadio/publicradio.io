import {Router} from '../services/Router';
import {StationGrid, Player} from './__Pages__';


const defaultImpersistentState = 'popular';
export class Root extends React.ServiceComponent {
    bindService = Router;

    render () {
        if (this.state.service.persistentState === null) {
            switch (this.state.service.impersistentState) {
                case 'popular':
                case 'recommended':
                case 'favorites':
                    return <StationGrid type={this.state.service.impersistentState}/>;
                default:
                    return <StationGrid type={defaultImpersistentState}/>;
            }
        } else {
            return <Player stationName={this.state.service.persistentState}/>
        }
    }
}