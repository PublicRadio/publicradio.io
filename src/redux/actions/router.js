export const ROUTER_UPDATE = 'ROUTER_UPDATE'
export const ROUTER_UPDATE_OPTS = 'ROUTER_UPDATE_OPTS'
export const ROUTER_UPDATE_POSTFACTUM = 'ROUTER_UPDATE_POSTFACTUM'

export function navigate (newLocation) {
    return {
        type: ROUTER_UPDATE,
        argv: Array.isArray(newLocation) ? newLocation.filter(a => a) : resolveLocationData(newLocation)
    }
}

export function storeLocation () {
    return {
        type: ROUTER_UPDATE_POSTFACTUM,
        argv: resolveLocationData()
    }
}


export function resolveLocationData (from = document.location) {
    if (typeof from === 'string')
        from = Object.assign(document.createElement('a'), {href: from})

    return from.search.replace(/^\?/, '').split('&')
}
