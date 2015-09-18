import ColorThief from 'color-thief';
import {Progress} from './__Material__';
import {vk} from '../services';
import Locale from '../lang/';
import {ImageCache} from '../services';

const colorThief = new ColorThief();

export class IntroCard extends React.Component {
    static propTypes = {
        needAuth        : React.PropTypes.bool,
        authorized      : React.PropTypes.bool,
        loading         : React.PropTypes.bool,
        title           : React.PropTypes.element,
        body            : React.PropTypes.element,
        loadingBody     : React.PropTypes.element,
        unauthorizedBody: React.PropTypes.element
    };

    render () {
        const {loading, needAuth, authorized, title, body, loadingBody, unauthorizedBody} = this.props;
        return <div className={`mdl-card mdl-shadow--2dp mdl-cell mdl-cell--12-col ${style.logoBackgroundContainer}`}>
            <div className={style.logoBackground}></div>
            <div className="mdl-card__title">
                <h2 className="mdl-card__title-text">
                    {title}</h2></div>
            <div className="mdl-card__supporting-text" style={{width: '90%'}}>
                {loading ? loadingBody : needAuth && !authorized ? unauthorizedBody : body}</div>
            <div style="flex-grow: 1;"/>
            {loading ? <Progress/> : false}
            {needAuth && !authorized
                ? false
                : <a
                 className="mdl-card__actions mdl-card--border mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect"
                 onClick={() => vk.authorize()}> {Locale.VK.authorize} </a>}

        </div>
    }
}

export class StationCard extends React.Component {
    static propTypes = {
        stationId: React.PropTypes.number
    };


    render () {

    }
}