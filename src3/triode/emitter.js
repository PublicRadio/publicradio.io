import {TriodeBaseComponent} from './base';

export class TriodeEmitter {
    callbacks = [];
    cooldown = null;

    constructor (resolver) {
        this.setData();
        this.cooldown = resolver(result => this.setData(null, result), error => this.setData(error, null));
    }

    setData (error = null, result = null) {
        const stateChanged = error !== null ? this.error !== error : this.result !== result;
        [this.error, this.result] = [error, result];
        if (stateChanged) this.stateChanged();
    }

    destroy () {
        this.callbacks = null;
        this.result = null;
        this.error = null;
        if (this.cooldown instanceof Function)
            this.cooldown();
        this.cooldown = null;
    }

    registerCallback (callback) {
        callback(this.error, this.result);
        this.callbacks.push(callback);
    }

    stateChanged () { for (let callback of this.callbacks) callback(this.error, this.result); }
}