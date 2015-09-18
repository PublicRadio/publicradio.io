import React, {Component, PropTypes} from 'react'

export class Link extends Component {
    static propTypes = {
        station: PropTypes.string,
        page   : PropTypes.string,
    }

    render () {
        const href = Router.utils.getHref(this.props.href)
        return <a
            href={href}
            onClick={() => window.dispatchEvent(new CustomEvent('pushstate'))}
            className={this.props.className + href === document.location.href ? ' active' : ''}>
            {this.props.children}</a>
    }
}