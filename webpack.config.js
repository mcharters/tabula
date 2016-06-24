var webpack = require('webpack');

var config = {
	entry: [
		'./lib/js/main.jsx'
	],
	output: {
		filename: 'bundle.js',
		path: __dirname + '/webapp/static/js'
	},
	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				exclude: /(node_modules)/,
				loaders: ['babel?presets[]=react']
			},
			{
				test: /\.js?$/,
				loaders: ['imports?jQuery=jquery,$=jquery,this=>window,_=underscore']
			}
		]
	},
	plugins: [
    new webpack.optimize.OccurenceOrderPlugin()
	]
};

if (process.env.NODE_ENV !== 'production') {
	// add source maps
  config.devtool = '#eval';

	config.plugins.push(new webpack.HotModuleReplacementPlugin());

	config.output.publicPath = 'http://localhost:3002/';
} else {
	config.plugins.push(new webpack.DefinePlugin({
    'process.env': {
      NODE_ENV: JSON.stringify('production')
    }
  }));
}


module.exports = config;
