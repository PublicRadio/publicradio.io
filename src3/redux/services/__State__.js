const {defineProperty: defProp, getOwnPropertyDescriptor: getDesc, getOwnPropertyNames: getNames} = Object;

const callAndDispatch = fn => function (...args) {
    const res = fn.apply(this, args);
    //noinspection JSPotentiallyInvalidUsageOfThis
    res && res.then ? res.then(() => this.dispatchState(), () => this.dispatchState()) : this.dispatchState();
    return res;
};
const wrapDesc = descriptor => {
    if (descriptor.value instanceof Function) descriptor.value = callAndDispatch(descriptor.value);
    if (descriptor.set instanceof Function) descriptor.set = callAndDispatch(descriptor.set);
    return descriptor;
};

const keysSymbol = Symbol('ownKeys');

export default class StateService {
    eventIDs = new Map();

    static getInstance () { return this.instance || (this.instance = new this()); }

    static observableProperty (name, fn) {
        const [isPendingKey, changeKey, actualStorageKey] = [`${name}IsPending`, `change:${name}`, Symbol(name)];
        return target => {
            defProp(target.prototype, name, {
                configurable: true,
                get         : () => this[actualStorageKey],
                set         : function (val) {
                    if (this[actualStorageKey] === val) return;
                    this[actualStorageKey] = val;
                    const res = fn(this);
                    if (res && res.then) {
                        this[isPendingKey] = true;
                        const doneFN = this.isEventCurrent(changeKey)(() => this[isPendingKey] = false);
                        res.then(doneFN, doneFN);
                    }
                }
            })
        }
    }

    static emitter (target, name, descriptor) {
        if (arguments.length === 3)
            wrapDesc(descriptor);
        else
            return target => defProp(target.prototype, arguments[0], wrapDesc(getDesc(target.prototype, arguments[0]))) && undefined;
    }

    isEventCurrent (eventType) {
        const id = this.eventIDs.has(eventType) ? this.eventIDs.get(eventType) + 1 : 0;
        this.eventIDs.set(eventType, id);
        const check = () => this.eventIDs.get(eventType) === id;
        return (fn, fn2 = () => {}) => fn ? (...args) => (check() ? fn(...args) : fn2(...args)) : check;
    }

    toJSON () {
        if (!this.prototype[keysSymbol])
        //noinspection JSCheckFunctionSignatures
            Object.defineProperty(this.prototype, keysSymbol,
                {value: new Set(getNames(this.prototype).filter(key => getDesc(this.prototype, key).enumerable))})

        const result = {};
        for (let key of new Set([...Object.keys(), ...this.prototype[keysSymbol]]))
            result[key] = this[key];
        return result;
    }

    dispatchState () {
        this.dispatch({type: `${this.constructor.serviceName || this.constructor.name}_STATE`, state: this.toJSON()()});
    }

    bootstrapRedux () {
        return dispatch => this.dispatch = dispatch;
    }
}