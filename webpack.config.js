var webpack = require('webpack');
var path = require('path');
var name = 'async-mapper';
var env = process.env.WEBPACK_ENV;

module.exports = {
  entry: path.join(__dirname, '/src/index.js'),
  devtool: (env === 'web') ? 'source-map' : null,
  output: {
    path: path.join(__dirname, '/lib'),
    filename: name + '.' + env + '.js',
    library: name,
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  externals: {
    mobx: true,
    firebase: true
  },
  target: env,
  module: {
    preLoaders: [
      {
        test: /\.js$/,
        loader: 'eslint-loader',
        exclude: /node_modules/
      }
    ],
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    root: path.resolve('./src'),
    extensions: ['', '.js']
  },
  plugins: (env === 'node') ? [] : [new webpack.optimize.UglifyJsPlugin({ minimize: true })]
};
