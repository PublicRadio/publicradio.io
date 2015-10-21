import {FILOStack} from '~/utils/FILOStack.js'

const v = '5.25'

export default class VKApi {
    static apiId = {
        '91.239.26.189' : 4524233,
        'publicradio.io': 4597732,
        localhost       : 4602893
    }[location.hostname]

    static permissions = 2 + 8 + 262144

    _spliceSize = 25
    _stack = new FILOStack()
    _VK = window.VK

    constructor () {
        if (!this._VK) {
            this.__initError = 'No global VK Object'
        } else {
            this._VK.init({apiId: VKApi.apiId})
        }
    }

    getLoginStatus () { return new Promise(res => this._VK.Auth.getLoginStatus(res)); }

    authorize () { return new Promise(res => this._VK.Auth.login(res, VKApi.permissions)); }

    logout () { return new Promise(res => this._VK.Auth.logout(res)); }

    call (method, opts = {}, postfix = '') {
        return new Promise(resolve => this.registerQuery({method, opts: {v, ...opts}, postfix, resolve}))
    }

    registerQuery (items) { this._loop(this._stack.push(items)); }

    _loop () {
        switch (true) {
            case this._loopStarted:
                return
            //case this._captchaResolveFn:
            case this._stack.length === 0:
                this._loopStarted = false
                return
            default:
                this._loopStarted = true
                this.__tick()
        }
    }

    __tick () {
        this.authorized ? this._authorizedTick() : this._anyTick()
        setTimeout(() => this._loop(this._loopStarted = false), 400)
    }

    _authorizedTick (queries = this._stack.pop(this._spliceSize)) {
        if (queries.length === 0) return
        if (queries.length === 1 && !queries[0].postfix) return this._anyTick(queries[0])

        return this.__internalCall('execute', {v: this._v, code: generateCode(queries)})
            .then(
            (response) => queries.forEach((query, index) => query.resolve(response[index])),
            ({error}) => {
                if (error.error_code === 13 && this._spliceSize > 4)
                    this._spliceSize -= 1
                this.registerQuery(queries)
            })
    }

    _anyTick (query = this._stack.pop()) {
        if (query && !query.postfix)
            this.__internalCall(query.method, query.opts)
                .then(response => response ? query.resolve(response) : Promise.reject())
                .catch(() => this.registerQuery(query))
        else
            this.registerQuery(query)
    }

    __internalCall (method, opts) {
        //if (this._captchaResolve) {
        //    opts = Object.assign(opts, this._captchaResolve)
        //    this._captchaResolve = null
        //}
        return new Promise((resolve, reject) =>
            this._VK.Api.call(method, opts, ({execute_errors, error, response}) => {
                if (execute_errors || error) {
                    console.log({execute_errors, error, response})
                    if (__DEV__)
                        throw new Error
                }

                //if (error && error.error_code === 14)
                //    this._requireCaptcha(error.captcha_sid)
                response ? resolve(response) : reject({execute_errors, error})
            }))
    }
}


function generateCode (queries) {
    return `var results = [], result
${queries.map(q => `result = API.${q.method}(${JSON.stringify(q.opts, replace_quotes)})${q.postfix}
results.push(result);`).join('\n')}
return results;`
}

function mappedResolve (entries, items) {
    for (var i = 0; i < items.length; i++)
        entries[i].resolve(items[i])
}

function flattenAndCompact (entries) {
    return [...new Set(entries.filter(a => a).reduce((a, b) => a.concat(b), []))]
}

function replace_quotes (key, value) {
    return typeof value === 'string'
        ? value.replace(/[^\\]('")/img, "\$1").replace(/&/img, '')
        : value
}
