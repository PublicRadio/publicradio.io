var gulp = require('gulp'),
    plugins = {};
Object.getOwnPropertyNames(require('./package.json')['devDependencies'])
    .filter(function (pkg) {
        return pkg.indexOf('gulp-') === 0;
    })
    .forEach(function (pkg) {
        plugins[pkg.replace('gulp-', '').replace(/-/g, '_')] = require(pkg);
    });

gulp.task('default', ['build']);
gulp.task('build', ['build-js', 'build-css', 'build-html']);

gulp.task('build-js', function () {
    return gulp.src('src/**/[^_]*.js')
        .pipe(plugins.browserify(
            {
                transform: [require('./lib/html-jadeify'), require('./lib/dot-jadeify'), 'es6ify'],
                debug    : true
            }
        )).on("error", log)
        //.pipe(plugins.uglify({})).on("error", log)
        .pipe(gulp.dest("build"));
});

gulp.task('build-html', function () {
    return gulp.src('src/**/[^_]*.jade')
        .pipe(plugins.jade()).on('error', log)
        .pipe(gulp.dest('build'));
});
gulp.task('build-css', function () {
    return gulp.src('src/**/[^_]*.styl')
        .pipe(plugins.stylus()).on('error', log)
        .pipe(plugins.autoprefixer()).on('error', log)
        .pipe(gulp.dest('build'));
});


function log(error) {
    console.log([
        '',
        "----------ERROR MESSAGE START----------".bold.red.underline,
        ("[" + error.name + " in " + error.plugin + "]").red.bold.inverse,
        error.message,
        "----------ERROR MESSAGE END----------".bold.red.underline,
        ''
    ].join('\n'));
    this.end();
}