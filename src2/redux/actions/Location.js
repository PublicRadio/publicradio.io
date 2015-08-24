const regex = /^(?:\??([^#]*))?(?:#(.*))?$/;
export function goto (path, postfactum = false) {
    var search, hash;
    if (path instanceof Object) {
        //noinspection JSDuplicatedDeclaration
        var {search, hash} = path;
    } else if (regex.test(path)) {
        //noinspection JSDuplicatedDeclaration
        var [,search,hash] = regex.exec(path);
    } else {
        document.location = path;
    }

    if (search && hash) {
        gotoPath(`?${search}#${hash}`);
    } else if (search) {
        gotoPath(`?${search}`);
    } else if (hash) {
        gotoPath(`#${hash}`);
    } else {
        gotoPath('');
    }
    return {
        search: extractArgv(search),
        hash: extractArgv(hash),
        opts: extractOpts(search, hash)
    };
}

export function __bindDispatcher (dispatcher, actions) {
    const location = document.location;

    function execDispatch (init = false) {
        const [search, hash] =
            (init ? window.history : !location.search && location.hash.replace(/^#/, '').indexOf('?'))
                ? [location.search.replace(/^\?/, ''), location.hash.replace(/^#/, '')]
                : location.hash.replace(/^#/, '').split('?');

        actions.parse.dispatch({search, hash}, true);
    }

    window.addEventListener('popstate', () => execDispatch());
    window.addEventListener('hashchange', () => execDispatch());
    process.nextTick(() => execDispatch(true));
}


function gotoPath (path) {
    if (window.history)
        window.history.pushState({}, null, path);
    else
        document.location.hash = path;
}

function extractArgv (string = '') {
    const entries = string.split('&');
    return entries.filter(e => e.indexOf('=') === -1)
}

function extractOpts (string = '', ...rest) {
    const entries = string.split('&');
    return entries.filter(e => e.indexOf('=') !== -1)
        .map(opt => opt.split('='))
        .reduce((acc, [key, value]) => ({...acc, [key]: value}), rest.length > 0 ? extractOpts(...rest) : {})
}