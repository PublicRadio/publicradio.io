var Station = require('./_station.js'),
    stationMap = {},
    currentStation;
module.exports = {
    registerStation(data){
        var station = new Station(data);
        stationMap[data.id] = station;
        return station.dump;
    },
    setStationAsCurrent(stationId){
        var station = stationMap[stationId];
        if (!station) throw new Error();
        if (currentStation)
            currentStation.disable();
        currentStation = station;
        currentStation.enable();
    }
};