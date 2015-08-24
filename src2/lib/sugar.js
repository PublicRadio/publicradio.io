Object.defineProperty(Map.prototype, 'getOrSetDefault', {
    value (key, fallback) {
        if (this.has(key)) {
            return this.get(key)
        } else {
            const result = fallback();
            this.set(key, result);
            return result;
        }
    }
});