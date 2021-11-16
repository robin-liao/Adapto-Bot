const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const webpackCommon = require('./webpack.common');
const _ = require('lodash');

const serverBrowserShared = {
  mode: 'production',

  plugins: [new CompressionPlugin({
    algorithm: 'gzip',
    test: /.js$|.css$/,
  })
  ],

  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
    })]
  },
};

const webpack = [
  // { ...serverBrowserShared },
  { ...serverBrowserShared }
];

module.exports = module.exports = _.mergeWith(
  webpackCommon,
  webpack,
  (obj, src) => _.isArray(obj) ? obj.concat(src) : undefined
);
