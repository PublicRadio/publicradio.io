Object.defineProperty(Map.prototype, 'getOrSetDefault', {value: getOrSetDefault});
Object.defineProperty(WeakMap.prototype, 'getOrSetDefault', {value: getOrSetDefault});

function getOrSetDefault (key, fallback) {
    if (this.has(key)) {
        return this.get(key)
    } else {
        const result = fallback();
        this.set(key, result);
        return result;
    }
}