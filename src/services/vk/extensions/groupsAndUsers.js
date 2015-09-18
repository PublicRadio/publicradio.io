import {FILOStack} from '~/utils/FILOStack'
import '~/utils/sugar.js'

function stacked (fn) {
    const stack = new FILOStack()
    let isPending = false
    return function (...args) {
        return new Promise(resolve => {
            stack.push({args, resolve})
            if (!isPending) {
                isPending = true
                process.nextTick(() => {
                    while (stack.length > 0)
                        fn.call(this, stack)
                    isPending = false
                })
            }
        })
    }
}

function cached (fn) {
    const cache = new Map()
    return function (...args) {
        return cache.getOrSetDefault(JSON.stringify(args.length === 1 ? args[0] : args), () => fn.apply(this, args))
    }
}

//noinspection JSClosureCompilerSyntax
/**
 * @arg {Number} Group ID
 * @param {String[]=} Additional fields
 * */
export const getGroupInfo = cached(stacked(
    function getGroupInfo (stack) {
        const entries = stack.pop(1000)
        const args = entries.map(({args}) => args)
        const options = {
            group_ids: args.map(arg => arg[0]).join(',')
        }
        const fields = flattenAndCompact(args.map(arg => arg[1]))
        if (fields.length > 0)
            options.fields = fields

        return this.call('groups.getById', options)
            .then(items => mappedResolve(entries, items))
    }
))


//noinspection JSClosureCompilerSyntax
/**
 * @arg {Number} User ID
 * @param {String[]=} Additional fields
 * */
export const getUserInfo = cached(stacked(
    function getUserInfo (stack) {
        const entries = stack.pop(1000)
        const args = entries.map(({args}) => args)
        const options = {
            user_ids: args.map(arg => arg[0]).join(',')
        }
        const fields = flattenAndCompact(args.map(arg => arg[1]))
        if (fields.length > 0)
            options.fields = fields


        return this.call('users.get', options)
            .then(items => mappedResolve(entries, items))
    }
))

export const getUserGroups = cached(
    function getUserGroups (user_id, filter = [], fields = []) {
        const request = user_id ? {user_id} : {}
        if (fields = fields.join(',')) request.fields = fields
        if (filter = filter.join(',')) request.filter = filter
        return this.call('groups.get', request)
    }
)


export const getGroupUsers = cached(
    function getGroupUsers (group_id) {
        const per = 1000
        return this.call('groups.getMembers', {group_id, count: per})
            .then(({items = [], count = 0} = {}) => Promise.all(function*(call) {
                const limit = per
                let offset = 0
                yield items
                while ((offset += limit) <= count)
                    yield call('groups.getMembers', {group_id, count: per, offset}, '.items')
            }(this.call.bind(vk)))
        )
            .then(items => Promise.resolve(flattenAndCompact(items)), e => console.log('error', e))
    }
)


function mappedResolve (entries, items) {
    for (var i = 0; i < items.length; i++)
        entries[i].resolve(items[i])
}

function flattenAndCompact (entries) {
    return [...new Set(entries.filter(a => a).reduce((a, b) => a.concat(b), []))]
}