var React = require('react');

var ErrorMessage = React.createClass({
	render: function() {
		return (<pre className="error">{this.props.error_message}</pre>);
	}
});

module.exports = ErrorMessage;