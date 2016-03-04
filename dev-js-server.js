var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');
var config = require('./webpack.config.js');

config.entry.unshift('webpack/hot/only-dev-server');
config.entry.unshift('webpack-dev-server/client?http://0.0.0.0:3000');

config.module.loaders[0].loaders.unshift('react-hot');

new WebpackDevServer(webpack(config), {
	publicPath: config.output.publicPath,
	hot: true,
	historyApiFallback: true,
	headers: {
		'Access-Control-Allow-Origin': 'http://localhost:9292',
		'Access-Control-Allow-Headers': 'X-Requested-With'
	}
}).listen(3000, 'localhost', function (err, result) {
	if (err) {
		console.log(err);
	}

	console.log('Listening at localhost:3000');
});