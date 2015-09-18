import {FILOStack} from '../lib/FILOStack';
import '../lib/sugar.js';

export function stacked (target, name, descriptor) {
    const stack = new FILOStack();
    const fn = descriptor.value;
    let isPending = false;
    descriptor.value = function (...args) {
        return new Promise(resolve => {
            stack.push({args, resolve});
            if (!isPending) {
                isPending = true;
                process.nextTick(() => {
                    while (stack.length > 0)
                        this::fn(stack);
                    isPending = false;
                });
            }
        });
    }
}

export function cached (target, name, descriptor) {
    const cache = new Map();
    const fn = descriptor.value;
    descriptor.value = function (...args) {
        return cache.getOrSetDefault(JSON.stringify(args.length === 1 ? args[0] : args), () => fn.apply(this, args));
    }
}


export function stores (field) {
    return function (object, name, descriptor) {
        const fn = descriptor.value;
        object[field] = null;
        descriptor.value = function (force = false, ...args) {
            if (this[field] && !force)
                return this[field];

            const result = fn.apply(this, args);
            if (result.then instanceof Function)
                result.then(result => this[field] = result);
            else
                this[field] = result;

            return result;
        }
    }
}