var brain = require('brain'),
    net   = new brain.NeuralNetwork();
onmessage = function (ev) {
    var data = ev.data;
    net.train(Object.keys(data).map(key => data[key]).filter(e => e.output));
    postMessage(Object.keys(data).map(key => data[key]).map(e => [e.id, (net.run(e.input)[0])]));
};