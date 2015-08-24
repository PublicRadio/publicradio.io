import React, {Component} from 'react';
import {connect} from 'react-redux';

import {FavoritesIntroCard} from '../cards/FavoritesIntroCard';
import {StationCard} from '../cards/StationCard';


@connect(state => state.AdviceDog.recommendations || {})
export class Favorites {
    render () {
        const {favorites} = this.props;
        return <div className="mdl-layout__content">
            <div className="mdl-grid" style={{marginTop: '48px', marginBottom: '82px'}}>
                <FavoritesIntroCard loading={!favorites}/>
                {(favorites || []).map(station => <StationCard key={station.id} station={station}/>)}
            </div>
        </div>;
    }
}