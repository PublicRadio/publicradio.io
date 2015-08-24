import {FILOStack} from '../lib/FILOStack.js';
const v = '5.25';
const messageTypePrefix = 'service-vkCaller-';

export class VKService {
    static apiId = {
        '91.239.26.189': 4524233,
        'publicradio.io': 4597732,
        localhost: 4602893
    }[location.hostname];

    static spliceSize = 25;

    static messageTypes = {
        CAPTCHA_REQUIRED: messageTypePrefix + 'CAPTCHA_REQUIRED',
        NO_VK_MODULE: messageTypePrefix + 'NO_VK_MODULE',
        login: messageTypePrefix + 'login',
        logout: messageTypePrefix + 'logout',
        stackCallError: messageTypePrefix + 'stackCallError'
    };

    _stack = new FILOStack();
    _authorized = false;
    _captchaResolveFn = null;

    constructor (dispatcher) {
        if (!VK) return dispatcher(VKService.messageTypes.NO_VK_MODULE);
        this._dispatchEvent = (name, args) => dispatcher({...args, name});
        VK.init({apiId: VKService.apiId});
    }

    async load () {
        VK.Observer.subscribe('auth.login', state => this._setAuthState(state));
        await this.getLoginStatus();
    }

    _push (items) {
        this._stack.push(items);
        this._loop();
    }

    call (method, opts = {}, postfix = '') {
        if (!opts.v) opts.v = v;
        return new Promise(resolve => this._push({method, opts, postfix, resolve}));
    }

    __internalCall (method, opts) {
        if (this._captchaResolve) {
            Object.assign(opts, this._captchaResolve);
            this._captchaResolve = null;
        }

        return new Promise((resolve, reject) => VK.Api.call(method, opts, ({execute_errors, error, response}) => {
            if (execute_errors || error)
                this._dispatchEvent(VKService.messageTypes.stackCallError, {execute_errors, error, response});

            if (error && error.error_code === 14)
                this._requireCaptcha(error.captcha_sid);
            response ? resolve(response) : reject({execute_errors, error});
        }))
    }

    resolveCaptcha (opts) {
        if (this._captchaResolveFn)
            this._captchaResolveFn(opts);
        this._captchaResolveFn = null;
    }

    getLoginStatus () {
        return new Promise(res => VK.Auth.getLoginStatus(res))
            .then(this._setAuthState.bind(this));
    }

    auth () { return new Promise(resolve => VK.Auth.login(resolve, 10)); }

    _setAuthState ({status, _session}) {
        console.log(arguments);
        const _authorized = !!_session;
        if (_authorized === this._authorized) return;

        Object.assign(this, {_authorized, _session, userId: _session ? _session.mid : null});
        this._dispatchEvent(_authorized ? VKService.messageTypes.login : VKService.messageTypes.logout);
    }

    _requireCaptcha (captcha_sid) {
        return new Promise(resolve => {
            this._captchaResolveFn = captcha_key => this._captchaResolve = {captcha_sid, captcha_key};
            this._dispatchEvent(VKService.messageTypes.CAPTCHA_REQUIRED);
        })
    }


    _authorizedTick () {
        const queries = this._stack.pop(VKService.spliceSize);
        if (queries.length === 0) return;
        if (queries.length === 1 && !queries[0].postfix) return this._anyTick(queries[0]);

        this.__internalCall('execute', {
            v, code: `var results = [], result;
${queries.map(q => `result = API.${q.method}(${JSON.stringify(q.opts, replace_quotes)})${q.postfix};
results.push(result);`).join('\n')}
return results;`
        })
            .then(
            (response) => queries
                .forEach((query, index) => query.resolve(response[index])),
            ({error}) => {
                if (error.error_code === 13 && VKService.spliceSize > 4)
                    VKService.spliceSize--;
                this._push(queries);
            });
    }

    _anyTick (query = this._stack.pop()) {
        if (query && !query.postfix)
            this.__internalCall(query.method, query.opts)
                .then(response => response ? query.resolve(response) : Promise.reject())
                .catch(() => this._push(query));
        else
            this._push(query);

    }

    _loop () {
        if (this._captchaResolveFn) return;
        if (this._stack.length === 0) return this._loopStarted = false;
        if (this._loopStarted) return;

        this._loopStarted = true;
        this._authorized ? this._authorizedTick() : this._anyTick();

        setTimeout(() => {
            this._loopStarted = false;
            if (this._stack.length > 0)
                this._loop();
        }, 400);
    }
}

function sleep (time) { return new Promise(resolve => setTimeout(resolve, time)); }

function replace_quotes (key, value) {
    return typeof value === 'string'
        ? value.replace(/[^\\]('")/img, "\$1").replace(/&/img, '')
        : value;
}