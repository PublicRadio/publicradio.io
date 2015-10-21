import React, {Component} from 'react'
import style from './Drawer.css'
import * as vk from '~/redux/actions/vk'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import {Link} from './Link'
const Entry = ({children, icon, label, className, currentPage, ...props}) =>
<Link
    className={[
        style.link,
        className,
        props.href && currentPage === props.href && 'is-active'
    ].filter(a => a).join(' ')}
    {...props}>
    {children}
    {icon ? <i className="material-icons" style={{display: 'block'}}>{icon}</i> : false}
    {label || false}</Link>

@connect(state => state.vk, dispatch => bindActionCreators(vk, dispatch))
export class Drawer extends Component {
    render () {
        const {userInfo, authorized, logout, basepath} = this.props
        const [currentPage] = basepath
        return <div className={style.drawer}>
            <div>
                <span className={style.title}>Public Radio</span>
                <Entry
                    icon="grade"
                    label="Popular"
                    currentPage={currentPage}
                    href="@popular"/>
                <Entry
                    icon="favorite"
                    label="Favorites"
                    currentPage={currentPage}
                    href="@favorites"/>
                <Entry
                    icon="explore"
                    label="Recommended"
                    currentPage={currentPage}
                    href="@recommended"/>
            </div>
            <div>
                {
                    userInfo
                    ? <Entry
                    currentPage={currentPage}
                    >
                    <div
                        className={style.userImage}
                        style={{backgroundImage: `url(${userInfo.photo_200})`}}/></Entry>
                    : false
                }

                {authorized ? <Entry icon="settings" label="Settings" href={[...basepath, '@settings']}/> : false}
                <Entry icon="exit_to_app" label="Exit"/>
            </div>
        </div>
    }
}
