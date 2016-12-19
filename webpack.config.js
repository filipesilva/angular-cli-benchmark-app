const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const distDir = path.resolve('./', './dist');

module.exports = {
  name: 'app',
  resolve: {
    extensions: ['.ts', '.js']
  },
  entry: {
    main: './app/main.ts'
  },
  output: {
    path: distDir,
    filename: '[name].bundle.js'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve('./', 'index.html'),
    })
  ],
  module: {
    loaders: [
      { test: /\.scss$/, loaders: ['raw-loader', 'sass-loader'] },
      { test: /\.css$/, loader: 'raw-loader' },
      { test: /\.html$/, loader: 'raw-loader' },
      // ngToolsWebpack.AotPlugin is being added in `webpack-runner.js`
      { test: /\.ts$/, loader: '@ngtools/webpack' }
    ]
  },
  devServer: {
    historyApiFallback: true,
    stats: {
      colors: true,
      chunks: false,
      children: false,
    }
  },
  stats: {
    colors: true,
    chunks: false,
    children: false
  }
};
