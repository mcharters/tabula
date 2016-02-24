var webpack = require('webpack');

module.exports = {
	entry: [
		'webpack-dev-server/client?http://0.0.0.0:3000',
		'webpack/hot/only-dev-server',
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
				loaders: ['react-hot', 'babel?presets[]=react']
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