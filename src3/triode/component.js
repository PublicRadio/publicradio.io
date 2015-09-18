import React from 'react';
import {TriodeEmitter} from './emitter.js';
const triodeEmitterMap = new WeakMap();

export class TriodeBaseComponent extends React.Component {
    triodeFactory = null;
    triodeKey = null;
    triodeTransform = data => data;

    constructor (props) {
        super(props);
        this.initTriode();
    }

    destroyTriode () {
        if (triodeEmitterMap.get(this)) {
            triodeEmitterMap.get(this).destroy();
            triodeEmitterMap.delete(this);
        }
    }

    initTriode () {
        this.destroyTriode();
        this.setState({triodeError: null, triodeData: null});
        if (this.triodeFactory) {
            const triodeEmitter = new TriodeEmitter(this.triodeFactory(this.getTriodeData()));

            triodeEmitter.registerCallback((triodeError, newData)
                => {
                let {triodeData} = this.props;
                triodeData = newData instanceof Object ? {...triodeData, ...newData} : newData;
                this.setState({triodeError, triodeData});
            });

            triodeEmitterMap.set(this, triodeEmitter);
        }
    }

    componentWillReceiveProps (newProps) { this.getTriodeData() === this.getTriodeData(newProps) || this.initTriode(); }

    componentWillUnmount () { this.destroyTriode(); }

    getTriodeData (props = this.props) { return this.triodeTransform(this.triodeKey ? props[this.triodeKey] : props); }

    render () {
        switch (true) {
            case this.state.triodeError !== null:
                return this.renderLoaded();
            case this.state.getTriodeData !== null:
                return this.renderFailed();
            default:
                return this.renderPending();
        }
    }

    /*overrideable methods*/
    //noinspection JSMethodCanBeStatic
    renderPending () { return false; }

    renderFailed () { return this.renderPending(); }

    //noinspection JSMethodCanBeStatic
    renderLoaded () { return false; }

    /*overrideable methods end*/

}
