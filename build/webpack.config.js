import webpack, { DefinePlugin} from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import {resolve as resolvePath} from 'path';
import jade from 'jade';
import packageJson from '../package.json';

const DEBUG = !Boolean(process.env.PRODUCTION);

export const cache = DEBUG;
export const debug = DEBUG;

export const stats = {
    colors : true,
    reasons: DEBUG
};

const indexHtmlTemplate = jade.compileFile(resolvePath('./src/index.jade'), {
    pretty      : DEBUG,
});

export const plugins = [
    new HtmlWebpackPlugin({
        templateContent: (params, hash, callback) =>
            callback(null, indexHtmlTemplate({...params, packageJson, hash, DEBUG}))
    }),
    new ExtractTextPlugin('style.css'),
    new webpack.optimize.OccurenceOrderPlugin(),
    new DefinePlugin({
        'process.env.NODE_ENV': DEBUG ? '"development"' : '"production"',
        '__DEV__'             : DEBUG
    }),
    ...(DEBUG
        ? [
        new webpack.HotModuleReplacementPlugin()
    ]
        : [
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.UglifyJsPlugin(),
        new webpack.optimize.AggressiveMergingPlugin()
    ])
];
export const resolve = {
    extensions: ['', '.js', '.jsx']
};

const STYLE_LOADER =
    `css-loader?localIdentName=${DEBUG ? '[name]__[local]___[hash:base64:5]' : '[hash:base64:5]'}!postcss-loader`;

export const module = {
    loaders: [
        {
            test  : /\.css$/,
            loader: DEBUG
                ? `style-loader!${STYLE_LOADER}`
                : ExtractTextPlugin.extract('style-loader', STYLE_LOADER)
        },
        {
            test   : /\.jsx?$/,
            exclude: /node_modules/,
            loader : 'babel-loader?optional[]=runtime&stage=0'
        }
    ]
};

export const postcss = [
    ['autoprefixer-core', DEBUG
        ? ['Chrome >= 20']
        : [
        'Android 2.3',
        'Android >= 4',
        'Chrome >= 20',
        'Firefox >= 24',
        'Explorer >= 10',
        'iOS >= 6',
        'Opera >= 12',
        'Safari >= 6'
    ]],
    ['rucksack-css'],
    ['cssnext'],
    ['postcss-modules-local-by-default', {}]
].map(([module, options]) => require(module)(options));

export let entry = DEBUG ? ['webpack/hot/dev-server', './src/index.js'] : ['./src/index.js'];

export const output = {
    publicPath   : '/',
    path         : resolvePath('./publish'),
    filename     : '[name].js',
    chunkFilename: '[name]-[id].js'
};

export const devtool = DEBUG ? 'source-map' : false;