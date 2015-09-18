export class Grid extends React.Component {
    render () {
        return <div className="mdl-grid">{this.props.children}</div>;
    }
}
export class Cell extends React.Component {
    static propTypes = {
        columns: React.propTypes.number,
        mobileColumns: React.propTypes.number,
        tabletColumns: React.propTypes.number
    };
    render () {
        const {columns = 1, mobileColumns, tabletColumns} = this.props;
        const classList = [[columns, ''], [mobileColumns, '-mobile'], [tabletColumns, '-tablet']]
        .filter(([columnCount]) => columnCount)
        .map(([columnCount, postfix]) => `mdl-cell--${columnCount}${postfix}`);
        return <div className={`mdl-cell ${classList.join(' ')}`}>{this.props.children}</div>
    }
}