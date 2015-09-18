export async function getGroupWallAttachments (group_id, count = 25) {
    if (this.user) {
        const result = await this.call('wall.get', {owner_id: -group_id, count}, `.items@.attachments
var result2 = [], temp;
while (result.length) {temp = result.shift();result2.push(temp ? temp@.audio : 0);}
result = result2;`)
        return result.map(a => (a || []).filter(a => a))
    } else {
        const result = await this.call('wall.get', {owner_id: -group_id, count})
        return (result.items || [])
            .map(item => item.attachments ? item.attachments.map(a => a.audio).filter(a => a) : [])
    }
}

export async function getGroupTrackList (group_id, count = 25) {
    const result = await this.getGroupWallAttachments(group_id, count)
    return result.reduce((a, b) => a.concat(b), [])
}