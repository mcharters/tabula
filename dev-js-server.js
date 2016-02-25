var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');
var config = require('./webpack.config.js');

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