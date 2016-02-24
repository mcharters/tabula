var React = require('react');

var LoadingMessage = React.createClass({
	render: function() {
		return (
				<div className="alert alert-success" id="loading">
					<span id="spinner"></span>
				</div>
			);
	}
});

module.exports = LoadingMessage;