import React, {Component} from 'react';
import {connect} from 'react-redux';

import {IntroCard} from '../cards/IntroCard';
import {StationCard} from '../cards/StationCard';


@connect(state => state.AdviceDog.recommendations || {})
export class Recommended {
    render () {
        const {recommended} = this.props;
        return <div className="mdl-layout__content">
            <div className="mdl-grid" style={{marginTop: '48px', marginBottom: '82px'}}>
                <IntroCard loading={!recommended}/>
                {(recommended || []).map(station => <StationCard key={station.id} station={station}/>)}
            </div>
        </div>;
    }
}