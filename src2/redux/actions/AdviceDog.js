import {findVectorsAngleSin} from '../../utils/math';
import {vk} from './abstractions/';

const recommendedRecommendationsSize = 12 * 6;

const vectorCache = fetch('/data/result.csv')
    .then(response => response.text())
    .then(csv =>
        csv.split('\n')
            .map(line => line.split(',').map(entry => Number(entry) || 0))
            .filter(([id]) => id)
            .reduce((map, [id, ...vector]) => map.set(id, vector), new Map()));

const trunk2 = fn => arg1 => arg2 => fn(arg1, arg2);

export async function personalize (user_id) {
    const [popular, favorites] = await Promise.all([getDepersonnalizedRecommendations(), getFavorites()]);
    return {popular, favorites};
}

export async function depersonalize () {
    const popular = await getDepersonnalizedRecommendations();
    return {popular};
}

async function getFavorites (user_id) {
    const cache = await vectorCache;
    let recommendations = await Promise.all((function* ({items}) {
        for (let group of items)
            yield cache.has(group)
                ? group
                : (group => vk.getGroupWallAttachments(group)
                .then(wall => validateWallData(wall) ? group : null))
                  (group);
    })(await vk.getUserGroups(user_id)));
    recommendations = await Promise.all(recommendations
        .filter(a => a)
        .map(id => vk.getGroupInfo(id, ['description', 'members_count', 'status'])));

    return recommendations;
}

async function getDepersonnalizedRecommendations () {
    const cache = await vectorCache;
    let recommendations = [];
    for (let [id, vector] of cache) {
        const distances = recommendations
            .map(id => cache.get(id))
            .map(trunk2(findVectorsAngleSin)(vector))
            .map((distance, idx, arr) => distance * arr.length / (idx + 1));
        if (Math.min(...distances) > 0.3)
            recommendations.push(id);

        if (recommendations.length >= recommendedRecommendationsSize)
            break;
    }
    recommendations = await Promise.all(recommendations.map(id => vk.getGroupInfo(id, ['description', 'members_count', 'status'])));
    recommendations = recommendations.filter(({name}) => name.trim().toLowerCase() !== 'музыка');
    for (let recommendation of recommendations)
        recommendation.vector = cache.get(recommendation.id);
    return recommendations;
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