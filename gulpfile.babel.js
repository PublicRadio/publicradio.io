import path from 'path';
import cp from 'child_process';
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import del from 'del';
import runSequence from 'run-sequence';
import mkdirp from 'mkdirp';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';

import * as webpackConfig from './webpack.config.js';

const $ = gulpLoadPlugins();
const src = Object.create(null);

let watch = false;

// The default task
gulp.task('default', ['build:watch']);
gulp.task('deploy', () =>
        gulp.src('./build/public/**/*')
            .pipe($.ghPages())
);

// Clean output directory
gulp.task('clean', cb =>
    del(['.tmp', 'build/*', '!build/.git'], {dot: true}, () =>
        mkdirp('build/public', () =>
            cb())));

// Static files
gulp.task('assets', () =>
    gulp.src(src.assets = 'src/__public__/**')
        .pipe($.changed('build'))
        .pipe(gulp.dest('build/public'))
        .pipe($.size({title: 'assets'})));

// Resource files
gulp.task('resources', () =>
    gulp.src(src.resources = [
        'package.json',
        'src/content*/**',
        'src/templates*/**'
    ])
        .pipe($.changed('build'))
        .pipe(gulp.dest('build/public'))
        .pipe($.size({title: 'resources'})));

// Bundle
gulp.task('bundle', cb => {
    const bundler = webpack(webpackConfig);
    if (watch)
        new WebpackDevServer(bundler, {
            contentBase: './build/public',
            hot: true,
            filename: webpackConfig.output.filename,
            watchOptions: {
                aggregateTimeout: 1,
                poll: false
            },
            //publicPath: '/',
            stats: {colors: true},

            historyApiFallback: true
        })
            .listen(8080, 'localhost', function (err) {
                if (err) throw new $.util.PluginError('webpack-dev-server', err);
                $.util.log('[webpack-dev-server]', 'http://localhost:8080/');
            });
    else
        bundler.run(function (err, stats) {
            if (err)
                throw new $.util.PluginError('webpack', err);
            console.log(stats.toString(webpackConfig.stats));
            cb();
        });
});

// Build the app from source code
gulp.task('build', ['clean'], cb =>
    runSequence(['assets', 'resources'], ['bundle'], () =>
        cb()));

// Build and start watching for modifications
gulp.task('build:watch', cb => {
    watch = true;
    runSequence('build', () => {
        gulp.watch(src.assets, ['assets']);
        gulp.watch(src.resources, ['resources']);
        cb();
    });
});