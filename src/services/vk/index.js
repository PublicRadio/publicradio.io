import VKApi from './caller.js'
import * as adviceDogMethods from './extensions/adviceDog.js'
import * as wallMethods from './extensions/wall.js'
import * as groupAndUserMethods from './extensions/groupsAndUsers.js'


export default new VKApi();

Object.assign(VKApi.prototype, adviceDogMethods)
Object.assign(VKApi.prototype, wallMethods)
Object.assign(VKApi.prototype, groupAndUserMethods)
