const $ = require("./helpers");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const nodeExternals = require("webpack-node-externals");

/** @type WebpackConfig[] */
const configs = [
  // // Browser
  // {
  //   entry: $.root("./src/index.tsx"),
  //   output: {
  //     path: $.root("/public/js"),
  //     filename: "bundle-[name].js",
  //     publicPath: "/js/"
  //   },

  //   plugins: [
  //   ],

  //   module: {
  //     rules: [
  //       // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
  //       {
  //         test: /\.tsx?$/,
  //         use: "ts-loader",
  //         exclude: [/\.(spec|e2e)\.ts$/, /node_modules/],
  //       },

  //       // All '.png' or '.jpg' or '.jpeg' or '.gif' files
  //       {
  //         test: /\.(png|jp(e*)g|gif)$/,
  //         use: [
  //           {
  //             loader: "file-loader",
  //             options: {
  //               name: "assets/[name].[ext]",
  //             },
  //           },
  //         ],
  //       },

  //       // All '.svg' file
  //       {
  //         test: /\.svg$/,
  //         loader: "svg-inline-loader",
  //       },

  //       // All '.css' files
  //       {
  //         test: /\.css$/i,
  //         use: ["style-loader", "css-loader"],
  //       },
  //     ],
  //   },

  //   resolve: {
  //     // Add '.ts' and '.tsx' as resolvable extensions.
  //     extensions: [".ts", ".tsx", ".js", ".json"],
  //     modules: ["node_modules", "src"],
  //   },

  //   node: {
  //     __filename: false,
  //     __dirname: false,
  //   },

  //   externals: {
  //     react: "React",
  //     "react-dom": "ReactDOM",
  //   }
  // },

  // Server
  {
    entry: {
      server: $.root("./src/app.ts"),
    },

    output: {
      path: $.root("/dist"),
      filename: "[name].js",
    },

    // Currently we need to add '.ts' to the resolve.extensions array.
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
    },

    // Add the loader for .ts files.
    module: {
      rules: [
        // All '.tsx' file
        {
          test: /\.tsx?$/,
          use: "ts-loader",
        },

        // All '.svg' file
        {
          test: /\.svg$/,
          loader: "svg-inline-loader",
        },
      ],
    },

    // plugins
    plugins: [
      new CopyPlugin({
        patterns: [
          // { from: "src/**/*.ejs", to: $.root("/dist/[name].[ext]") },
          { from: "src/**/*.html", to: $.root("/dist/[name].[ext]") },
          // { from: "src/**/*.json", to: $.root("/dist/[name].[ext]") },
        ],
      }),
    ],

    node: {
      __filename: false,
      __dirname: false,
    },

    target: "node",
    externals: [nodeExternals()],
  }
];

module.exports = configs;
