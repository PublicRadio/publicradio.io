import React, {Component} from 'react'

export function resolver (propsEmitter) {
    if (arguments.length === 2) propsEmitter = {[arguments[0]]: arguments[1]}

    return function resolveDecorator (Component) {
        return class PropsResolver extends Component {
            constructor (...args) {
                super(...args)
                this.state = {}
                this.propsResolver = propsResolver(propsEmitter, this.setState.bind(this))
            }

            componentWillUnmount () { this.propsResolver() }

            render () {
                const {props, state} = this
                return <Component {...props} {...state}/>
            }
        }
    }
}

function propsResolver (propsEmitter, callback) {
    let isCooldowned = false
    const cooldownFunctions = [() => isCooldowned = true]
    const propsState = {}


    function setState (key, value) {
        if (!isCooldowned) {
            propsState[key] = value
            callback(propsState)
        }
    }

    for (let key of Object.keys(propsEmitter)) {
        const value = propsEmitter[key]
        propsState[key] = undefined
        if (value instanceof Function && value.length > 0)
            cooldownFunctions.push(value((err, data) => setState(key, err ? wrapError(err) : data)))
        else if (value instanceof Function)
            value().then(data => setState(key, data), err => setState(key, wrapError(err)))
        else if (value.then instanceof Function)
            value.then(data => setState(key, data), err => setState(key, wrapError(err)))
        else
            console.warn('unexpected input for resolver', value)
    }
    return () => cooldownFunctions.forEach(fn => fn())
}

function wrapError (err) {
    if (err instanceof Error) return err
    if (typeof err === 'string') return new Error(err)
    return Object.assign(new Error(), {data: err})
}