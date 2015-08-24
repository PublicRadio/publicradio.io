import {cached, stacked} from '../../../utils/decorators.js';
import {FILOStack} from '../../../lib/FILOStack.js';
import {chain} from 'lodash';

export class VK {
    static apiId = {
        '91.239.26.189': 4524233,
        'publicradio.io': 4597732,
        localhost: 4602893
    }[location.hostname];

    _v = '5.25';
    _spliceSize = 25;
    _stack = new FILOStack();
    VK = window.VK;

    constructor () {
        if (!this.VK) {
            this.__initError = 'No global VK Object';
        } else {
            this.VK.init({apiId: VK.apiId});
            this.VK.Observer.subscribe('auth.login', () => this._authorized = true);
            this.VK.Observer.subscribe('auth.logout', () => this._authorized = false);
            this._authorized = !!this.VK.Auth.getSession();
        }
    }

    call (method, opts = {}, postfix = '') {
        opts.v = opts.v || this._v;
        return new Promise(resolve => this.registerQuery({method, opts, postfix, resolve}));
    }

    registerQuery (items) {
        this._stack.push(items);
        this._loop();
    }

    _loop () {
        console.log(this._loopStarted, this._stack);
        switch (true) {
            case this._loopStarted:
                return;
            //case this._captchaResolveFn:
            case this._stack.length === 0:
                this._loopStarted = false;
                return;
            default:
                this._loopStarted = true;
                this.__tick();
        }
    }

    __tick () {
        this._authorized ? this._authorizedTick() : this._anyTick();
        setTimeout(() => {
            this._loopStarted = false;
            this._loop();
        }, 400);
    }

    _authorizedTick (queries = this._stack.pop(this._spliceSize)) {
        switch (true) {
            case queries.length === 0:
                return;
            case queries.length === 1 && !queries[0].postfix:
                this._anyTick(queries[0]);
                return;
            default:
                this.__internalCall('execute', {v: this._v, code: generateCode(queries)})
                    .then(
                    (response) => queries
                        .forEach((query, index) => query.resolve(response[index])),
                    ({error}) => {
                        if (error.error_code === 13 && this._spliceSize > 4)
                            this._spliceSize -= 1;
                        this.registerQuery(queries);
                    });
        }
    }

    _anyTick (query = this._stack.pop()) {
        if (query && !query.postfix)
            this.__internalCall(query.method, query.opts)
                .then(response => response ? query.resolve(response) : Promise.reject())
                .catch(() => this.registerQuery(query));
        else
            this.registerQuery(query);
    }

    __internalCall (method, opts) {
        //if (this._captchaResolve) {
        //    opts = Object.assign(opts, this._captchaResolve);
        //    this._captchaResolve = null;
        //}
        return new Promise((resolve, reject) =>
            this.VK.Api.call(method, opts, ({execute_errors, error, response}) => {
                if (execute_errors || error)
                    console.log({execute_errors, error, response});

                //if (error && error.error_code === 14)
                //    this._requireCaptcha(error.captcha_sid);
                if (response)
                    resolve(response);
                else
                    reject({execute_errors, error});
            }))
    }
}

/*pretty abstractions over VK api, we expect to use only this methods*/
export class VKAbstraction extends VK {

    getLoginStatus () {
        return new Promise(res => this.VK.Auth.getLoginStatus(res));
    }

    @cached
    @stacked
    getGroupInfo (stack) {
        const entries = stack.pop(1000);
        const args = entries.map(({args}) => args);
        const options = {
            group_ids: args.map(arg => arg[0]).join(',')
        };
        const fields = flattenAndCompact(args.map(arg => arg[1]));
        if (fields.length > 0)
            options.fields = fields;


        this.call('groups.getById', options)
            .then(items => mappedResolve(entries, items));
    }

    @cached
    @stacked
    getUserInfo (stack) {
        const entries = stack.pop(1000);
        const args = entries.map(({args}) => args);
        const options = {
            user_ids: args.map(arg => arg[0]).join(',')
        };
        const fields = flattenAndCompact(args.map(arg => arg[1]));
        if (fields.length > 0)
            options.fields = fields;


        this.call('users.get', options)
            .then(items => mappedResolve(entries, items));
    }

    @cached
    getUserGroups (user_id, filter = [], fields = []) {
        const request = user_id ? {user_id} : {};
        if (fields = fields.join(',')) request.fields = fields;
        if (filter = filter.join(',')) request.filter = filter;
        return this.call('groups.get', request);
    }


    async getGroupWallAttachments (group_id, count = 25) {
        if (this._authorized) {
            const result = await this.call('wall.get', {owner_id: -group_id, count}, `.items@.attachments;
var result2 = [];
var temp;
while (result.length) {
temp = result.shift();
result2.push(temp ? temp@.audio : 0);
}
result = result2;`);
            return result.map(a => (a || []).filter(a => a));
        } else {
            const result = await this.call('wall.get', {owner_id: -group_id, count});
            return (result.items || [])
                .map(item => item.attachments ? item.attachments.map(a => a.audio).filter(a => a) : []);
        }

    }

    async getGroupTrackList (group_id, count = 25) {
        const result = await this.getGroupWallAttachments(group_id, count);
        return result.reduce((a, b) => a.concat(b), []);
    }
}


function generateCode (queries) {
    return `var results = [], result;
${queries.map(q => `result = API.${q.method}(${JSON.stringify(q.opts, replace_quotes)})${q.postfix};
results.push(result);`).join('\n')}
return results;`;
}

function mappedResolve (entries, items) {
    for (var i = 0; i < items.length; i++)
        entries[i].resolve(items[i]);
}

function flattenAndCompact (entries) {
    return [...new Set(entries.filter(a => a).reduce((a, b) => a.concat(b), []))];
}

function replace_quotes (key, value) {
    return typeof value === 'string'
        ? value.replace(/[^\\]('")/img, "\$1").replace(/&/img, '')
        : value;
}