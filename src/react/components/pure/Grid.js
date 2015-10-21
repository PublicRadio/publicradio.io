import React, {Component, PropTypes} from 'react'

export class Grid extends Component {
    render () {
        return <div className="mdl-grid">{this.props.children}</div>
    }
}

export class Cell extends Component {
    static propTypes = {
        columns      : PropTypes.number,
        mobileColumns: PropTypes.number,
        tabletColumns: PropTypes.number
    }

    render () {
        const {columns = 1, mobileColumns, tabletColumns} = this.props
        const classList = [[columns, ''], [mobileColumns, '-mobile'], [tabletColumns, '-tablet']]
            .filter(([columnCount]) => columnCount)
            .map(([columnCount, postfix]) => `mdl-cell--${columnCount}${postfix}`)
        return <div className={`mdl-cell ${classList.join(' ')}`} style={{display: 'flex'}}>{this.props.children}</div>
    }
}