import React, {Component} from 'react'

import * as router from '~/redux/actions/router'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'

@connect(state => state.router, dispatch => bindActionCreators(router, dispatch))
export class Link extends Component {
    render () {
        const {children, className = '', argv, href, concat = false, ...props} = this.props
        const slicedHref = Array.isArray(href) ? href : [href]

        const isHrefSame = argv.length === slicedHref.length && !argv.some((el, idx) => el !== slicedHref[idx])
        const path = slicedHref.join('&')
        return <a className={`${className} ${isHrefSame ? ' is-active' : ''}`}
            href={path ? '?' + path : ''} {...props}
            onClick={(e) => {e.preventDefault(); this.props.navigate(slicedHref)}}>{children}</a>
    }
}
