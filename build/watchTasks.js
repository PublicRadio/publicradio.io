import gulp from 'gulp';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import * as webpackConfig from './webpack.config.js';
import gulpLoadPlugins from 'gulp-load-plugins';

const $ = gulpLoadPlugins();

gulp.task('watch', cb =>
    new WebpackDevServer(
        webpack(webpackConfig),
        {
            contentBase       : './src/__public__',
            hot               : true,
            filename          : webpackConfig.output.filename,
            watchOptions      : {
                aggregateTimeout: 1
            },
            stats             : {colors: true},
            historyApiFallback: true
        })
        .listen(8080, 'localhost', (err) => {
            if (err)
                throw new $.util.PluginError('webpack-dev-server', err);
            $.util.log('[webpack-dev-server]', 'http://localhost:8080/webpack-dev-server/index.html');
        }));