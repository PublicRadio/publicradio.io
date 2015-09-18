
export function stores (field) {
    return function (object, name, descriptor) {
        const fn = descriptor.value
        object[field] = null
        descriptor.value = function (force = false, ...args) {
            if (this[field] && !force)
                return this[field]

            const result = fn.apply(this, args)
            if (result.then instanceof Function)
                result.then(result => this[field] = result)
            else
                this[field] = result

            return result
        }
    }
}