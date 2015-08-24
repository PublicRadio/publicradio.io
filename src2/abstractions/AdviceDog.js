// Analyze @ recommend!
import 'whatwg-fetch';
import '../lib/sugar';
import {VKAbstraction} from './VKAbstraction';
import _, {flatten, uniq, pull, chain} from 'lodash';
import {stores, cached} from '../utils/decorators.js';

export class AdviceDogService {
    constructor (dispatcher) {
        this._VK = new VKAbstraction(dispatcher);
        this.call = this._VK.call.bind(this._VK);
        this._VK.load()
            .then(() => {
                this.loadVectorCache();
                this.loadVKUserInfo();
            });
    }

    async loadVKUserInfo () {
        await Promise.all([this.loadUserGenres(), this.loadUserGroups(), this.loadUserGroupRecommendations()]);
    }

    dropVKUserInfo () { this.userGenres = this.userGroups = null; }

    async isEntryMusical (owner_id) {
        await this.loadVectorCache();
        if (this.vectorCache.has(-owner_id))
            return true;

        const wall = await this._VK.getWallAttachments(owner_id);
        return this.isWallMusical(this.transformWallAttachments(wall));
    }

    transformWallAttachments (wallAttachments) {
        return wallAttachments
            .map(a => a || [[], []])
            .map(([genreIds, durations]) =>
                genreIds.filter((el, idx) => durations[idx] > 60 && durations[idx] < 600)); //between 1 and 10 minutes
    }

    isWallMusical (transformedWall) {
        const maxNoPostsWithTracksLevel = 2;
        let currentNoPostsWithTracksLevel = 0;

        for (let entry of transformedWall)
            if (entry && entry.length)
                currentNoPostsWithTracksLevel = 0;
            else if (++currentNoPostsWithTracksLevel >= maxNoPostsWithTracksLevel)
                return false;
        return true;
    }

    @cached
    @stores('vectorCache')
    async loadVectorCache (path = '/data/result.csv') {
        var csv = await fetch(path).then(response => response.text());
        return csv.split('\n')
            .map(line => line.split(',').map(entry => Number(entry) || 0))
            .filter(([id]) => id)
            .reduce((map, [id, ...vector]) => map.set(id, vector), new Map());
    }

    @cached
    @stores('userGenres')
    loadUserGenres () {
        return this.call('audio.get', {count: 500}, '.items@.genre_id')
            .then(resolveGenresFromGenreList);
    }

    @cached
    @stores('userGroups')
    async loadUserGroups () {
        const {items} = await this._VK.getUserGroups();
        const groupWalls = await Promise.all(items.map(id => this.isEntryMusical(-id).then(res => res ? id : null)));
        return groupWalls.filter(id => id);
    }

    @cached
    @stores('userGroupRecommendations')
    async loadUserGroupRecommendations () {
        await Promise.all([
            this.loadVectorCache(),
            this.loadUserGroups()
        ]);
        /*For here we have 3 types of abstract entities:
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
         7. Discovered groups should be ordered by match count that is counted as ∑(chains) cos(group-group vector) / user groups */

        //low threshold, we do not take very young on unfavoured communities
        const lowUserGroupThreshold = 1000;

        //high threshold due to performance issues
        // also I do not want the top groups to get into recommendations
        // it is done in order to promote small groups with established community, not big-n-commercialized ones
        const highUserGroupThreshold = 100000;

        //0. We are taking groups with users count between 1000 and 100 000 and that are definitely musical as musical ones.
        const selfGroups = new Set(this.userGroups);
        const filteredSelfGroups = new Set(selfGroups);
        await Promise.all(Array.from(filteredSelfGroups)
            .map(id =>
                this._VK.getGroupInfo(id, ['members_count'])
                    .then(({members_count}) => {
                        if (members_count > highUserGroupThreshold || members_count < lowUserGroupThreshold)
                            filteredSelfGroups.delete(id);
                    })));
        //1. We have a subset of users that also are members of min_groups_level musical groups.
        const usersGroupsMap = new Map();
        const sourceGroupUsersMap = new Map();
        const groupUsersMap = new Map();
        await Promise.all(Array.from(filteredSelfGroups)
            .map(id =>
                this._VK.getGroupUsers(id)
                    .then(users => {
                        sourceGroupUsersMap.set(id, new Set(users));
                        for (let user of users)
                            usersGroupsMap.getOrSetDefault(user, () => new Set()).add(id);
                    })));


        await new Promise(resolve => {
            let counter = 0;
            //We cannot determine whether groups are musical but we can assume the following:
            //1.5 Users list should be filtered from user inself.
            usersGroupsMap.delete(this.userId);

            for (let [key, value] of usersGroupsMap)
                //    1.1 users with match of less than 2 are not matching
                if (value.size <= 2)
                    usersGroupsMap.delete(key);
                else
                    (key => {
                        counter++;
                        new Promise(res =>
                            this._VK.getUserGroups(key)
                                .then((value) => {
                                    if (value && value.count < 1000)
                                        usersGroupsMap.set(key, value.items);
                                    else
                                    //2.3 Users with hidden groups list
                                        usersGroupsMap.delete(key);
                                    if (!--counter) resolve();
                                })
                                .catch(console.log.bind(console)))
                    })(key);
        });

        for (let [key, value] of usersGroupsMap) {
            //1.2 users' musical communities are definitely musical
            //1.3 cached musical communities are definitely musical
            //1.4 all of the users that does not match the criteria should be removed from the subset.
            /*if (value.filter(id => selfGroups.has(id) || this.vectorCache[id]).length < 3)
             usersGroupsMap.delete(key);*/
            //2. We resolve users' info in order to filter users from
            //2.1 Users with over 1000 (?) groups
            /*else */
            if (value.length >= 1000)
                usersGroupsMap.delete(key);
            else {
                //6. Discovered groups should be filtered from
                //6.1 self user groups
                const groups = value.filter(id => selfGroups.has(id));

                usersGroupsMap.set(key, groups);
                for (let group of groups)
                    groupUsersMap.getOrSetDefault(group, () => new Set()).add(key);
            }
        }
        //6.3 not musical ones (by users count as first stem)
        await new Promise(resolve => {
            let counter = 0;
            for (let id of usersGroupsMap.keys())
                (id => {
                    ++counter;
                    this._VK.getGroupInfo(id, ['members_count'])
                        .then(({members_count, type, is_closed}) => {
                            if (is_closed
                                || (members_count > highUserGroupThreshold || members_count < lowUserGroupThreshold)
                                || (type !== 'page' || type !== 'group'))
                                usersGroupsMap.delete(id);
                            if (!--counter) resolve();
                        })
                        .catch(console.log.bind(console, 'err'));
                })(id);
        });


        //7. Discovered groups should be ordered by match count that is counted as ∑(chains) cos(group-group vector) / user groups */
        const weightsGroupsMap = new Map();
        /*We're using modified cosine similarity: intersect(users1 * users2).map(selectivity) / sqrt(users1 * users2) */
        for (let [endID, endUsers] of usersGroupsMap)
            for (let [startID, startUsers] of sourceGroupUsersMap)
                weightsGroupsMap.set(endID,
                    [...startUsers]
                        .filter(id => endUsers.has(id))
                        .map(id => usersGroupsMap.get(id))
                        .map(weight => weight * 2)
                        .reduce((a, b) => a + b, 0)
                    /
                    Math.sqrt(endUsers.size * startUsers.size))

        const weightKVs = Array.from(weightsGroupsMap);
        const weightKeys = weightKVs.map(([key, value]) => key);
        const weightValues = weightKVs.map(([key, value]) => value);
        const sortedWeightKeys = insertionSort(weightValues, weightKeys);
        return sortedWeightKeys.reduce((map, key) => map.set(key, weightsGroupsMap.get(key)), new Map());
    }
}

function getTop (list) {
    const map = {};
    const mentionCountMap = [];
    for (let entry of list) {
        let counter = map[entry] = map[entry] ? map[entry] + 1 : 1;
        if (mentionCountMap[counter])
            mentionCountMap[counter].push(entry);
        else
            mentionCountMap[counter] = [entry];
    }
    const result = mentionCountMap.slice(2).reverse();
    result.map = map;
    return result;
}

function resolveGenresFromGenreList (genreList) {
    return chain(genreList).pick(null, undefined).flatten().pick(18)
        .reduce((acc, el) => {
            acc[el] = (acc[el] + 1) || 1;
            return acc;
        }, [])
        .value();
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

