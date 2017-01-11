const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const distDir = path.resolve('./', './dist');

module.exports = {
  name: 'app',
  resolve: {
    extensions: ['.ts', '.js']
  },
  entry: {
    main: ['./src/main.ts'],
    styles: ['!style-loader!css-loader!sass-loader!./src/styles.scss'],
    scripts: [
      'script-loader!./src/scripts.js',
      'script-loader!./node_modules/jquery/dist/jquery.js',
      'script-loader!./node_modules/tether/dist/js/tether.js',
      'script-loader!./node_modules/bootstrap/dist/js/bootstrap.js'
    ]
  },
  output: {
    path: distDir,
    filename: '[name].bundle.js'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve('./src', 'index.html'),
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
  },
  performance: {
    hints: false
  }
};
