import {VKAbstraction} from './VK.js';
import {AdviceDog} from './AdviceDog.js';
import {Player} from './Player.js';
import {Location} from './Location.js';
import {Navigator} from './Navigator.js';

export const vk = new VKAbstraction();
export const adviceDog = new AdviceDog(vk);
export const player = new Player(vk.getGroupTrackList.bind(vk), vk);
export const location = new Location();
export const navigator = new Navigator(location, vk, player);

console.log(module.exports);
