import {FILOStack} from '../lib/FILOStack';
import {VKService} from './VKService';
import {flatten} from 'lodash';
import {cached, stacked} from '../utils/decorators';
const messageTypePrefix = 'service-vk-';

export class VKAbstraction extends VKService {
    @cached
    getWallAttachments (owner_id) {
        return this.call('wall.get', {owner_id, count: 25}, `.items@.attachments;
var result2 = [];
var temp;
while (result.length) {
temp = result.shift();
result2.push(temp ? [temp@.audio@.genre_id, temp@.audio@.duration] : null);
}
result = result2;`)
    }

    @cached
    @stacked
    getGroupInfo (stack) {
        const entries = stack.pop(1000);
        const args = entries.map(([args]) => args);
        this.call('groups.getById', {
            group_ids: args.map(arg => arg[0]).join(','),
            fields: flattenAndCompact(args.map(arg => arg[1])).join(',')
        })
            .then(items => mappedResolve(entries, items));
    }

    @cached
    @stacked
    getUserInfo (stack) {
        const entries = stack.pop(1000);
        const args = entries.map(({args}) => args);
        this.call('users.get', {
            user_ids: args.map(arg => arg[0]).join(','),
            fields: flattenAndCompact(args.map(arg => arg[1])).join(',')
        })
            .then(items => mappedResolve(entries, items));
    }

    @cached
    getUserGroups (user_id, filter = [], fields = []) {
        const request = user_id ? {user_id} : {};
        fields = fields.join(',');
        filter = filter.join(',');
        if (fields) request.fields = fields;
        if (filter) request.filter = filter;
        return this.call('groups.get', request);
    }

    @cached
    getGroupUsers (group_id) {
        const per = 1000;
        return this.call('groups.getMembers', {group_id, count: per})
            .then(({items = [], count = 0} = {}) => Promise.all(function*(call) {
                    const limit = per;
                    let offset = 0;
                    yield items;
                    while ((offset += limit) <= count)
                        yield call('groups.getMembers', {group_id, count: per, offset}, '.items');
                }(this.call.bind(this)))
        )
            .then(items => Promise.resolve(flatten(items)), e => console.log('error', e));
    }
}

function flattenAndCompact (entries) {
    return [...new Set(entries.filter(a => a).reduce((a, b) => a.concat(b), []))];
}

function mappedResolve (entries, items) {
    for (var i = 0; i < items.length; i++)
        entries[i].resolve(items[i]);
}
