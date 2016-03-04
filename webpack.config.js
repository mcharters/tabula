var webpack = require('webpack');

module.exports = {
	entry: [
		'./lib/js/main.jsx'
	],
	output: {
		filename: 'bundle.js',
		path: __dirname + '/webapp/static/js',
		publicPath: 'http://localhost:3000/'
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
		new webpack.HotModuleReplacementPlugin()
	]
};