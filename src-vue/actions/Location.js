import {Emitter} from './Emitter';
const pathRegex = /^(?:\??([^#]*))?(?:#(.*))?$/;

const location = document.location;
const history = window.history;

export class Location extends Emitter {
    constructor () {
        super();
        if (!history)
            console.error('no history API');

        window.addEventListener('popstate', () => this.gotoCurrent());
        window.addEventListener('hashchange', () => this.gotoCurrent());
        this.gotoCurrent();
    }

    gotoCurrent () {
        this.use({search: location.search.replace(/^\?/, ''), hash: location.hash.replace(/^#/, '')});
    }

    navigateTo (val) {
        this.use(val);
        history.pushState({}, null, `${this.formattedSearch}${this.formattedHash}`);
    }

    use (val) {
        if (val instanceof Object) {
            if (val.search)
                this.search = val.search;
            if (val.hash)
                this.hash = val.hash;
        } else if (typeof val === 'string') {
            if (pathRegex.test(path)) {
                var [,search,hash] = pathRegex.exec(path);
                this.parse({search, hash});
            } else {
                document.location = path;
            }
        } else {
            console.warn('bad href', val);
        }
        this.dispatchStateChange();
    }

    get formattedSearch () { return this.search ? '?' + this.search : '' }

    get formattedHash () { return this.hash ? '#' + this.hash : '' }
}

