const webpackCommon = require('./webpack.common');
const _ = require('lodash');
const $ = require('./helpers');
const NodemonPlugin = require('nodemon-webpack-plugin'); // Ding

const serverBrowserShared = {
  mode: 'development',

  // Enable sourcemaps for debugging webpack's output.
  devtool: "source-map",

  module: {
    rules: [{
      test: /\.js$/,
      enforce: "pre",
      use: ["source-map-loader"],
    }],
  },

  optimization: {
    minimizer: []
  }
};

const server = {
  plugins: [
    new NodemonPlugin({
      script: $.root("/dist/server.js"),
      nodeArgs: ['--inspect=2266'],
    })
  ],
};

const webpack = [
  // { ...serverBrowserShared },
  { ...server, ...serverBrowserShared }
];

module.exports = _.mergeWith(
  webpackCommon,
  webpack,
  (obj, src) => _.isArray(obj) ? obj.concat(src) : undefined
);