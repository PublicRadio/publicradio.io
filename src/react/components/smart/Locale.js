import React, {Component, PropTypes} from 'react'
import {connect} from 'react-redux'

@connect(({locale}, props) => ({
    value: (props && props.path && props.path.split('.') || [])
        .reduce((acc, key) => (acc || {})[key], locale)
}))
export class Locale extends Component {
    static propTypes = {
        path: PropTypes.string
    }

    render () {
        return this.props.value
            ? Array.isArray(this.props.value)
                   ? <div>{this.props.value.map(string => <p key={string}>{string}</p>)}</div>
                   : <span>{this.props.value}</span>
            : this.props.children // fallback
                   ? this.props.children
                   : <span>{`>>>No locale content for path ${this.props.path}<<<`}</span>
    }
}