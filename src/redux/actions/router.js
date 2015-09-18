export const ROUTER_UPDATE = 'ROUTER_UPDATE'

if (!window.history || !window.history.pushState) console.error('history API is not working')

const utils = {
    link       : document.createElement('a'),
    extractArgv: (string = '') => string.split('&').filter(e => e.indexOf('=') === -1),
    extractOpts: (string = '', ...rest) => string.split('&').filter(e => e.indexOf('=') !== -1)
        .map(opt => opt.split('='))
        .reduce((acc, [key, value]) => ({...acc, [key]: value}), rest.length > 0 ? extractOpts(...rest) : {}),
    makeLink (href) {
        utils.link.href = href
        return utils.link
    },
    getHref    : (href) => utils.makeLink(href).href
}

export function navigate () {
    return function (dispatch) {
        const link = document.location
        switch (true) {
            case link.protocol !== location.protocol:
            case link.hostname !== location.hostname:
            case link.pathname !== location.pathname:
            case link.port !== location.port:
                return document.location = href
            case link.href !== location.href:
                return window.history.pushState({}, null, href)
            default:
                dispatch({
                    type   : ROUTER_UPDATE,
                    argv   : utils.extractArgv(document.location.search.replace(/^\?/, '')),
                    options: utils.extractOpts(document.location.hash.replace(/^#/, ''))
                })
        }
    }
}