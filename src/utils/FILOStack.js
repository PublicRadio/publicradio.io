export class FILOStack {
    constructor () { this._stack = []; }

    push (...items) {
        if (items.length === 1 && Array.isArray(items[0]))
            items = items[0]

        this._stack = this._stack.concat(items)
    }

    pop (n) { return n ? this._stack.splice(0, n) : this._stack.shift(); }

    get length () { return this._stack.length; }
}