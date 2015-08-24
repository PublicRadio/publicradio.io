import React, {Component} from 'react';


const progressClasses = 'mdl-progress mdl-js-progress mdl-progress__indeterminate';
export class Progress extends Component {
    componentDidMount () {
        new MaterialProgress(React.findDOMNode(this));
    }
    render () {
        const props = this.props;
        return <div className={props.className ? progressClasses + ' ' + props.className : progressClasses} {...props}/>;
    }
}