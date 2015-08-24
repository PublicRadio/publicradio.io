import React, {Component} from 'react';
import {Location} from '../actions.js';

export class Link extends Component {
    render () {
        const {href} = this.props;
        return <a href={href}
                  onClick={() => Location.parse.dispatch(href)}
                  className={this.props.className}>
            {this.props.children}
        </a>;
    }
}