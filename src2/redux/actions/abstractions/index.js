import {VKAbstraction} from './VK';
import {StationPlayer} from './StationPlayer';

export const vk = new VKAbstraction();
export const stationPlayer = new StationPlayer(id => {
    return vk.getGroupTrackList(id);
});