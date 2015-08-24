import webpack, { DefinePlugin, HotModuleReplacementPlugin} from 'webpack';
var ExtractTextPlugin = require('extract-text-webpack-plugin');

const {
    OccurenceOrderPlugin,
    DedupePlugin,
    UglifyJsPlugin,
    AggressiveMergingPlugin,
    } = webpack.optimize;

const DEBUG = !Boolean(process.env.PRODUCTION);
const CSS_LOADER = DEBUG
    ? 'css-loader?localIdentName=[name]__[local]___[hash:base64:5]'
    : 'css-loader?minimize&localIdentName=[hash:base64:5]';
const STYLE_LOADER = `${CSS_LOADER}!postcss-loader`;

export const cache = DEBUG;
export const debug = DEBUG;

export const stats = {
    colors: true,
    reasons: DEBUG
};
export const plugins = [
    new ExtractTextPlugin('style.css'),
    new OccurenceOrderPlugin(),
    new DefinePlugin({
        'process.env.NODE_ENV': DEBUG ? '"development"' : '"production"',
        '__DEV__': DEBUG
    }),
    ...(DEBUG ? [
        new HotModuleReplacementPlugin()
    ] : [
        new DedupePlugin(),
        new UglifyJsPlugin(),
        new AggressiveMergingPlugin()
    ])
];
export const resolve = {
    extensions: ['', '.webpack.js', '.web.js', '.js', '.jsx']
};
export const module = {
    preLoaders: [],

    loaders: [
        {
            test: /\.css$/,
            loader: DEBUG
                ? `style-loader!${STYLE_LOADER}`
                : ExtractTextPlugin.extract('style-loader', CSS_LOADER)
        },
        {
            test: /\.gif/,
            loader: 'url-loader?limit=10000&mimetype=image/gif'
        },
        {
            test: /\.jpg/,
            loader: 'url-loader?limit=10000&mimetype=image/jpg'
        },
        {
            test: /\.png/,
            loader: 'url-loader?limit=10000&mimetype=image/png'
        },
        {
            test: /\.svg/,
            loader: 'url-loader?limit=10000&mimetype=image/svg+xml'
        },
        {
            test: /\.jsx?$/,
            exclude: /node_modules/,
            loader: 'babel-loader?optional[]=runtime&stage=0'
        }
    ]
};

export const postcss = [
    require('autoprefixer-core')(
        DEBUG
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
        ]),
    require('rucksack-css')(),
    require('cssnext')(),
    require('postcss-modules-local-by-default')({})
];

export let entry = {
    'index': DEBUG
        ? ['webpack/hot/dev-server', './src/index.js']
        : ['./src/index.js']
};

export const output = {
    publicPath: '/',
    path: __dirname + '/build/public',
    filename: '[name].js',
    chunkFilename: '[name]-[id].js'
};

export const devtool = DEBUG ? 'source-map' : false;