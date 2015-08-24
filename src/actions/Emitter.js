export class Emitter {
    constructor () {
        this.eventTarget = document.createElement('noscript');
    }

    addEventListener (arg1, arg2) { this.eventTarget.addEventListener(arg1, arg2); }

    removeEventListener (arg1, arg2) { this.eventTarget.removeEventListener(arg1, arg2); }

    dispatchStateChange () {
        this.__json = undefined;
        this.eventTarget.dispatchEvent(new CustomEvent('stateChange'));
    }

    toJSON () { return this.__getJSON(); }

    __getJSON () {
        return this.__json || [...new Set(Object.keys(this).concat(Object.keys(this.__proto__)))]
            .filter(key => key[0] !== '_')
            .filter(key => !(this[key] instanceof Function))
            .reduce((acc, key) => ({...acc, [key]: this[key]}), {});
    }
}