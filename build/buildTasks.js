import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import del from 'del';
import mkdirp from 'mkdirp';
import webpack from 'webpack';
import runSequence from 'run-sequence';
import * as webpackConfig from './webpack.config.js';

const $ = gulpLoadPlugins();

let watch = false;

gulp.task('build', ['clean'], cb =>
    runSequence(['assets', 'bundle'], cb));

gulp.task('clean', cb =>
    del(['.tmp', 'publish/*', '.publish', '!publish/.git'],
        {dot: true},
        () => mkdirp('publish', cb)));

gulp.task('assets', () =>
    gulp.src('src/__public__/**')
        .pipe(gulp.dest('publish'))
        .pipe($.size({title: 'assets'})));

gulp.task('bundle', cb => {
    webpack(webpackConfig)
        .run((err, stats) => {
            if (err)
                throw new $.util.PluginError('webpack', err);
            //console.log(stats.toString(webpackConfig.stats));
            cb();
        });
});

