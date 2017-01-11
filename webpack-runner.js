const path = require('path');
const rimraf = require('rimraf');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const webpackMerge = require('webpack-merge');
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');
const ngToolsWebpack = require('@ngtools/webpack');

const baseConfig = require('./webpack.config');
const devServerConfig = baseConfig.devServer;
const statsConfig = baseConfig.stats;
const distDir = path.resolve('./', './dist');
const nodeModules = path.resolve('./', 'node_modules');
var returnPromise = Promise.resolve();
var config = baseConfig;

// supported options
// --aot : enables AoT compilation, default false
// --sourcemap : adds sourcemaps, default true
// --vendor-chunk : adds a vendor chunk, default true
// --serve : serves instead of building, default false

// configure default options
const argv = require('yargs')
  .default('aot', false)
  .default('sourcemap', true)
  .default('vendorChunk', true)
  .default('serve', false)
  .argv;

// remove dist folder
rimraf.sync(distDir);

// --aot 
const AoTPluginOptions = {
  tsConfigPath: './src/tsconfig.json',
  skipCodeGeneration: true
};

if (argv.aot) {
  AoTPluginOptions.skipCodeGeneration = false;
}

config = webpackMerge(config, {
  plugins: [new ngToolsWebpack.AotPlugin(AoTPluginOptions)]
})

// --sourcemap
if (argv.sourcemap) {
  config = webpackMerge(config, {
    devtool: 'sourcemap'
  })
}

// --vendor-chunk
if (argv.vendorChunk) {
  config = webpackMerge(config, {
    plugins: [
      new webpack.optimize.CommonsChunkPlugin({
        name: 'vendor',
        minChunks: (module) => module.resource && module.resource.startsWith(nodeModules)
      })
    ]
  });
}

// --dll
if (argv.dll) {
  // create dll config
  const dllConfig = {
    name: 'dll',
    resolve: {
      extensions: ['.js']
    },
    entry: {
      dll: [
        'rxjs',
        'moment',
        // '@angular/common',
        // '@angular/compiler',
        // '@angular/core',
        // '@angular/forms',
        // '@angular/http',
        // '@angular/platform-browser',
        // '@angular/platform-browser-dynamic',
        // '@angular/router'
      ]
    },
    output: {
      path: distDir,
      filename: '[name].bundle.js',
      library: '[name]_[hash]'
    },
    plugins: [
      new webpack.DllPlugin({
        path: path.resolve(distDir, '[name]-manifest.json'),
        name: '[name]_[hash]',
        context: distDir
      })
    ]
  }

  // compile the dll bundle before the main app
  const dllWebpackCompiler = webpack(dllConfig);
  returnPromise = returnPromise.then(() => new Promise((resolve, reject) => {
    dllWebpackCompiler.run((err, stats) => {
      if (err) { return reject(err); }
      dllWebpackCompiler.purgeInputFileSystem();
      process.stdout.write(stats.toString(statsConfig) + '\n');
      return stats.hasErrors() ? reject() : resolve();
    });
  }));

  config = webpackMerge(config, {
    dependencies: ['dll'],
    plugins: [
      new webpack.DllReferencePlugin({
        context: distDir,
        manifest: path.resolve(distDir, 'dll-manifest.json'),
      }),
      new AddAssetHtmlPlugin({
        filepath: path.resolve(distDir, 'dll.bundle.js'),
        includeSourcemap: false
      })
    ]
  });
}

const webpackCompiler = webpack(config);

// --serve
if (argv.serve) {
  returnPromise = returnPromise.then(() => {
    const server = new WebpackDevServer(webpackCompiler, devServerConfig);
    return new Promise((resolve, reject) => {
      server.listen(4200, 'localhost', function (err, stats) {
        if (err) {
          console.error(err.stack || err);
          if (err.details) { console.error(err.details); }
          reject(err.details);
        }
      });
    });
  });
} else {
  returnPromise = returnPromise.then(() => new Promise((resolve, reject) => {
    webpackCompiler.run((err, stats) => {
      if (err) { return reject(err); }
      webpackCompiler.purgeInputFileSystem();
      process.stdout.write(stats.toString(statsConfig) + '\n');
      return stats.hasErrors() ? reject() : resolve();
    });
  }));
}

return returnPromise;
