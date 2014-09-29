var through = require('through');
var jade = require('jade');
var dot = require('dot');

function isDotJade(file) {
    return (/\.dot\.jade$/).test(file);
}

function compile(file, data, callback) {
    callback(null, 'module.exports = ' + dot.template(jade.render(data, {
        filename: file
    })) + '\n');
}

function dotJadify(file) {
    if (!isDotJade(file)) return through();

    var data = '', stream = through(write, end);

    return stream;

    function write(buf) {
        data += buf;
    }

    function end() {
        compile(file, data, function (error, result) {
            if (error) stream.emit('error', error);
            stream.queue(result);
            stream.queue(null);
        });
    }
}

dotJadify.compile = compile;
dotJadify.isTemplateJade = isDotJade;
dotJadify.sourceMap = true; // use source maps by default

module.exports = dotJadify;