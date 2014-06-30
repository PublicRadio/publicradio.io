var gulp = require('gulp'),
    plugins = {};
Object.getOwnPropertyNames(require('./package.json')['dependencies'])
    .filter(function (pkg) {
        return pkg.indexOf('gulp-') === 0;
    })
    .forEach(function (pkg) {
        plugins[pkg.replace('gulp-', '').replace(/-/g, '_')] = require(pkg);
    });

gulp.task('default', ['watch', 'server']);

gulp.task('watch', ['build'], function () {
    gulp.watch('src/**/*', ['build']);
});

gulp.task('server', function (done) {
    require('http-server').createServer({
        root: './build'
    }).listen(8080, done)
});

function log(error) {
    console.log("----------ERROR MESSAGE START----------\n".bold.red.underline);
    console.log(("\n[" + error.name + " in " + error.plugin + "]").red.bold.inverse);
    console.log(error.message);
    console.log("----------ERROR MESSAGE END----------\n".bold.red.underline);
    this.end();
}

gulp.task('build', ['build-scripts', 'build-templates', 'build-styles', 'build-assets']);

gulp.task('build-templates', function () {
    return gulp.src('src/templates/**/[!_]*.jade')
        .pipe(plugins.jade()).on('error', log)
        .pipe(gulp.dest('build'));
});
gulp.task('build-scripts', function () {
    return gulp.src('src/scripts/**/[!_]*.js')
        .pipe(plugins.browserify({transform: ['es6ify'], debug: true})).on('error', log)
        .pipe(gulp.dest('build/scripts'));
});
gulp.task('build-styles', function () {
    return gulp.src('src/styles/**/[!_]*.styl')
        .pipe(plugins.stylus()).on('error', log)
        .pipe(plugins.autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4')).on('error', log)
        .pipe(gulp.dest('build/styles'));
});
gulp.task('build-assets', function () {
    return gulp.src('src/assets/**/[!_]*')
        .pipe(gulp.dest('build/assets'));
});