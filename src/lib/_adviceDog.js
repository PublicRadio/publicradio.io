var dataMap     = {},
    callbackMap = {},
    needUpdate  = false;
module.exports = function (id, criteria, result, updateCallback) {
    if (!criteria) {
        delete dataMap[id];
        delete callbackMap[id];
    }
    if (result === true) {
        result = dataMap[id].output[0];
    }

    dataMap[id] = {input: criteria, output: result !== undefined ? [result] : null, id: id};
    if (updateCallback)
        callbackMap[id] = updateCallback;

    needUpdate = true;
};
//
//var adviceWorker = new Worker("adviceDogWorker.js");
//adviceWorker.onmessage = function (obj) {
//    for (var entry of obj.data) if (callbackMap[entry[0]]) callbackMap[entry[0]](entry[1]);
//};
//setInterval(function () {
//    if (!needUpdate) return;
//    needUpdate = false;
//    adviceWorker.postMessage(dataMap);
//}, 15000);