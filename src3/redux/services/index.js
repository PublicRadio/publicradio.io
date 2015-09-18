export {Player} from './player';
export {Router} from './router';
export {vk} from './vk';
export {ImageCache} from './vk';

React.ServiceComponent = class ServiceComponent extends React.Component {
    bindService = null;
    constructor (props) {
        super(props);
        if (this.bindService)
            this.bindService.getInstance().onStateChange(state => this.setState({service: state}), true)
    }
};