import StateService from './__State__';

if (!window.history || !window.history.pushState) console.error('history API is not working');

const pushStateEventName = 'custom:pushstate';

export class Router extends StateService {
    static goto (href) {
        const link = href ? Utils.makeLink(href) : document.location;
        switch (true) {
            case link.protocol !== location.protocol:
            case link.hostname !== location.hostname:
            case link.pathname !== location.pathname:
            case link.port !== location.port:
                return document.location = href;
            default:
                window.history.pushState({}, null, href);
                window.dispatchEvent(new CustomEvent(pushStateEventName));
        }
    }

    parseStateChange () {
        this.goto();
        this.impersistentState = Utils.extractArgv(document.location.search.replace(/^\?/, '').hash)[0];
        this.persistentState = Utils.extractArgv(document.location.hash.replace(/^#/, ''))[0];
        this.dispatchState();
    }

    constructor () {
        window.addEventListener(pushStateEventName, () => this.parseStateChange());
        window.addEventListener('popstate', () => this.parseStateChange());
        window.addEventListener('hashchange', () => this.parseStateChange());
        process.nextTick(() => this.parseStateChange());
    }
}

export class Link extends React.Component {
    render () {
        const href = Utils.getHref(this.props.href);
        return <a
            href={href}
            onClick={() => Router.goto(href)}
            className={this.props.className + href === document.location.href ? ' active' : ''}>

            {this.props.children}</a>;
    }
}


class Utils {
    static extractArgv (string = '') {
        return string.split('&').filter(e => e.indexOf('=') === -1)
    }

    static extractOpts (string = '', ...rest) {
        return string.split('&').filter(e => e.indexOf('=') !== -1)
            .map(opt => opt.split('='))
            .reduce((acc, [key, value]) => ({...acc, [key]: value}), rest.length > 0 ? extractOpts(...rest) : {})
    }

    static link = document.createElement('a');

    static makeLink (href) {
        Utils.link.href = href;
        return Utils.link;
    }

    static getHref (href) {
        return Utils.makeLink(href).href;
    }

}
