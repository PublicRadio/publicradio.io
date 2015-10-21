import React, {Component} from 'react'
import style from './Modal.css'
import {connect} from 'react-redux'
import {Link} from './Link'

export class Modal extends Component {
    render () {
        return this.props.children.length
        ? <div className={style.modal} role="dialog" aria-hidden="true" ref="modal">
        <Link href={this.props.basepath.slice(0, -1)} className={style.background}/>
        <div className={style.dialog}>
            <div className={style.content}>
                {this.props.children}
            </div>
        </div>
    </div>
    : false
}
}
