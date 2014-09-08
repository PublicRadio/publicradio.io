var through = require('through');
var jade = require('jade');

function isHtmlJade(file) {
    return (/\.html\.jade$/).test(file);
}

function compile(file, data, callback) {

    callback(null,
            'module.exports = "' + jade.render(data, {filename: file})
        .replace(/"/mg, '\\"')
        .replace(/\n/mg, '\\n')
        .replace(/@inject '([^']*)'/mg, '"+require("$1")+"')
        + '"\n'
    );
}

function Jadify(file) {
    if (!isHtmlJade(file)) return through();

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

Jadify.compile = compile;
Jadify.isTemplateJade = isHtmlJade;
Jadify.sourceMap = true; // use source maps by default

module.exports = Jadify;