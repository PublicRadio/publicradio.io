import '../lib/sugar';
import {Emitter} from './Emitter';
import {findVectorsAngleSin} from '../utils/math';
const recommendedRecommendationsSize = 12 * 6;

const vectorCache = fetch('/data/result.csv')
    .then(response => response.text())
    .then(csv => csv.split('\n')
        .map(line => line.split(',').map(entry => Number(entry) || 0)).filter(([id]) => id)
        .reduce((map, [id, ...vector]) => map.set(id, vector), new Map()));

const trunk2 = fn => arg1 => arg2 => fn(arg1, arg2);

export class AdviceDog extends Emitter {
    banList = new Set((localStorage.getItem('stations:banned') || '').split(',').map(id => Number(id)).filter(a => a));

    constructor (vk) {
        super();
        this._vk = vk;
    }

    get authorized () {
        return this._vk.authorized;
    }

    async loadPopular () {
        const cache = await vectorCache;
        let list = [];
        for (let [id, vector] of cache) {
            const distances = list
                .map(id => cache.get(id))
                .map(trunk2(findVectorsAngleSin)(vector))
                .map((distance, idx, arr) => distance * arr.length / (idx + 1));
            if (Math.min(...distances) > 0.3)
                list.push(id);

            if (list.length >= recommendedRecommendationsSize)
                break;
        }
        list = await this.getGroupsData(list);
        list = list.filter(({name}) => name.trim().toLowerCase() !== 'музыка');
        for (let recommendation of list)
            recommendation.vector = cache.get(recommendation.id);

        return this.popular = list;
    }

    async loadRecommended () {
        const vk = this._vk;
        const cache = await vectorCache;
        const userGroups = new Set((await this.getFavoritesIDs()).filter(a => a));
        const userGenres = await vk.call('audio.get', {count: 1000}, '.items@.genre_id');
        const userVector = [];
        for (let item of userGenres)
            if (item !== 18 && item < 25)
                userVector[item - 1] = (userVector[item - 1] || 0) + 1;

        const matchMap = new Map();
        for (var i = 0; i < userVector.length; i++)
            if (!userVector[i])
                userVector[i] = 0;
        for (let [id, vector] of cache)
            if (!userGroups.has(id))
                matchMap.set(id, findVectorsAngleSin(userVector, vector));

        const weightKVs = Array.from(matchMap);
        const weightKeys = weightKVs.map(([key, ]) => key);
        const weightValues = weightKVs.map(([, value]) => value);
        const sortedWeightKeys = insertionSort(weightValues, weightKeys);
        return await this.getGroupsData(sortedWeightKeys.slice(0, recommendedRecommendationsSize));
    }

    /*async loadRecommended () {
     const cache = await vectorCache;
     const userGroups = new Set((await this.getFavoritesIDs()).filter(a => a));
     const vk = this._vk;
     const userId = vk.user.id;
     /!*For here we have 3 types of abstract entities:
     * 1. confidence. Measure of how much we trust recommendations relying upon this node
     * 2. match. Measure of how much is the fish^W matchness of current node (user or group)
     * 3. recommendation. Actual output for selected node

     CONST min_groups_level = 5
     CONST matching_community_threshold = 1/3

     We run modified item2item recommender system in case when our user definitely has at least min_groups_level musical groups in his own list.

     In order to provide best recommendations we assume the following:
     0. We are taking groups with users count between 1000 and 100 000 and that are definitely musical as musical ones.
     1. We have a subset of users that also are members of min_groups_level musical groups. We cannot determine whether groups are musical but we can assume the following:
     1.1 users with match of less than (?) are not matching
     1.2 users' musical communities are definitely musical
     1.3 cached musical communities are definitely musical
     1.4 all of the users that does not match the criteria should be removed from the subset.
     1.5 Users list should be filtered from user inself.

     2. We resolve users' info in order to filter users from
     2.1 Users with over 1000 (?) groups
     2.2 Users with too small count of groups (how much? min_groups_level?)
     2.3 Users with hidden groups list

     5. We resolve users' groups
     6. Discovered groups should be filtered from
     6.1 self user groups
     6.2 ones with match of less than (?)
     6.3 not musical ones (by users count as first stem)
     7. Discovered groups should be ordered by match count that is counted as ∑(chains) cos(group-group vector) / user groups *!/

     //low threshold, we do not take very young on unfavoured communities
     const lowUserGroupThreshold = 1000;
     const highUserGroupThreshold = 100000;


     const sourceItems = new Set(
     (await Promise.all(function * () {
     for (let id of userGroups)
     yield cache.has(id)
     ? id
     : vk.getGroupInfo(id, ['members_count'])
     .then(({members_count: members} = {}) =>
     members && members < highUserGroupThreshold && members > lowUserGroupThreshold ? id : null)
     .catch(noop);
     }()))
     .filter(a => a));

     console.log(sourceItems);

     const sourceItem2user = new Map();
     const user2sourceItem = new Map();
     const itemsPopularity = new Map();

     await Promise.all(function * () {
     for (let sourceItem of sourceItems)
     yield vk.getGroupUsers(sourceItem)
     .then((users = []) => new Set(users))
     .then(users => {
     itemsPopularity.set(sourceItem, users.count);
     users.delete(userId);
     sourceItem2user.set(sourceItem, users);
     for (let user of users)
     user2sourceItem.getOrSetDefault(user, () => new Set()).add(sourceItem);
     })
     .catch(noop);
     }());
     console.log(sourceItem2user, user2sourceItem);

     const sourceItem2userFiltered = new Map();
     const user2sourceItemFiltered = new Map();

     for (let [user, sourceItems] of user2sourceItem)
     if (sourceItems.size > 2) {
     user2sourceItemFiltered.set(user, sourceItems);
     for (let sourceItem of sourceItems)
     sourceItem2userFiltered.getOrSetDefault(sourceItem, () => new Set()).add(user);
     }
     console.log(sourceItem2userFiltered, user2sourceItemFiltered);

     const user2targetItem = new Map();
     const targetItem2user = new Map();
     const usersSelectivity = new Map();

     await Promise.all(function * () {
     for (let [user] of user2sourceItemFiltered)
     yield vk.getUserGroups(user)
     .then(({count, items: targetItems} = {count: 0, items: []}) => {
     if (count < 1000) {
     targetItems = new Set(targetItems.filter(id => !sourceItems.has(id)));
     user2targetItem.set(user, targetItems);
     usersSelectivity.set(user, 1 / count);
     for (let item of targetItems)
     targetItem2user.getOrSetDefault(user, () => new Set()).add(item);
     }
     })
     .catch(noop);
     }());

     console.log(user2targetItem, targetItem2user, usersSelectivity);

     const targetItem2userFiltered = new Map();

     await Promise.all(function * () {
     for (let [item, users] of targetItem2user)
     yield vk.getGroupInfo(item, ['members_count'])
     .then(({members_count, type, is_closed}) => {
     if (!is_closed
     && (members_count < highUserGroupThreshold && members_count > lowUserGroupThreshold)
     && (type === 'page' || type === 'group')) {
     targetItem2userFiltered.set(item, users);
     itemsPopularity.set(item, members_count);
     }
     })
     .catch(noop);
     }());
     console.log(targetItem2userFiltered);

     const item2itemRelations = new Map();
     /!*We're using modified cosine similarity: intersect(users1 * users2).map(selectivity) / sqrt(users1 * users2) *!/
     /!*
     Вектор схожести групп соответствует cosine similarity между sourceItemUsersSelectivity и targetItemUsersSelectivity
     Без упрощений алгоритм соответствует векторному произведению sourceItemUsers и targetItemUsers с
     *!/
     for (let [sourceItem, users] of sourceItem2userFiltered)
     for (let user of users)
     if (user2targetItem.get(user))
     for (let targetItem of user2targetItem.get(user))
     item2itemRelations
     .getOrSetDefault(sourceItem, () => new Map())
     .getOrSetDefault(targetItem, () => new Set())
     .add(user);

     console.log(item2itemRelations);
     const itemTargetivity = new Map();
     for (let [sourceItem, targetItemUsersMap] of item2itemRelations) {
     const sourceItemPopularity = itemsPopularity.get(sourceItem);
     const similarities = [];
     for (let [targetItem, users] of targetItemUsersMap) {
     const targetItemPopularity = itemsPopularity.get(targetItem);
     const userSelectivities = [...users].map(user => usersSelectivity.get(user));

     const nominator = [...users].map(user => usersSelectivity.get(user)).reduce((a, b) => a + b, 0);
     const denominator = sourceItemPopularity * targetItemPopularity;
     similarities.push(nominator / denominator);
     }
     itemTargetivity.set(sourceItem, similarities.reduce((a, b) => a + b, 0));
     }

     console.log(itemTargetivity);

     const weightKVs = Array.from(itemTargetivity);
     const weightKeys = weightKVs.map(([key, value]) => key);
     const weightValues = weightKVs.map(([key, value]) => value);
     const sortedWeightKeys = insertionSort(weightValues, weightKeys);
     return this.getGroupsData(sortedWeightKeys);
     }*/

    async getFavoritesIDs () {
        const cache = await vectorCache;
        const {items} = await this._vk.getUserGroups();
        const vk = this._vk;
        const results = await Promise.all((function* () {
            for (let group of items)
                yield cache.has(group)
                    ? group
                    : (group => vk.getGroupWallAttachments(group)
                    .then(wall => validateWallData(wall) ? group : null))
                      (group);
        })());
        return results.filter(a => a);
    }

    async loadFavorites () {
        this.favorites = await this.getGroupsData(await this.getFavoritesIDs());
        for (let favorite of this.favorites)
            favorite.is_member = 1;
        return this.favorites;
    }

    getGroupsData (ids) {
        return Promise.all(ids
            .filter(id => !this.banList.has(id))
            .map(id => this._vk.getGroupInfo(id, ['description', 'members_count', 'status', 'is_member'])))
    }

    ban (station) {
        for (let list of [this.popular, this.favorites, this.recommended])
            if (list && list.indexOf(station) !== -1)
                list.splice(list.indexOf(station), 1);

        if (station.id)
            this.banList.add(station.id);
        console.log([...this.banList]);
        localStorage.setItem('stations:banned', [...this.banList].join(','));
        this.dispatchStateChange();
    }
    unban (station) {
        this.banList.delete(station.id);
        localStorage.setItem('stations:banned', [...this.banList].join(','));
        this.dispatchStateChange();
    }
}

const maxNoPostsWithTracksLevel = 2;
function validateWallData (wallData) {
    if (wallData.length < 25)
        return;
    let currentNoPostsWithTracksLevel = 0;

    for (let entry of wallData)
        if (entry.length > 0)
            currentNoPostsWithTracksLevel = 0;
        else if (++currentNoPostsWithTracksLevel > maxNoPostsWithTracksLevel)
            return;
    return true;
}

function noop (err) {
    console.trace(err);
}

function insertionSort (arr, arr2) {
    for (var i = 0, len = arr.length; i < len; i++) {
        var j = i, item = arr[j], item2 = arr2[j];
        for (; j > 0 && arr[j - 1] > item; j--) {
            arr[j] = arr[j - 1];
            arr2[j] = arr2[j - 1];
        }
        arr[j] = item;
        arr2[j] = item2;
    }
    return arr2;
}