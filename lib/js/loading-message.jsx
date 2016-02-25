var React = require('react');

var LoadingMessage = React.createClass({
	render: function() {
		return (
				<div className="alert alert-success" id="loading">
					<span id="spinner">Loading...</span>
				</div>
			);
	}
});

module.exports = LoadingMessage;