var React = require('react');

var PeopleView = React.createClass({
	render: function() {
		var people = [];
		this.props.people.forEach(function(person, index) {
			people.push(
				<tr key={index}>
				<td>{person.first_name}</td>
				<td>{person.last_name}</td>
				<td>{person.title}</td>
				<td>{parseInt(person.salary).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,')}</td>
				<td>{person.group_name}</td>
				<td>{person.year}</td>
				</tr>
			);
		});

		return (
			<table className="table table-bordered">
				<thead>
					<tr>
						<th>First Name</th>
						<th>Last Name</th>
						<th>Title</th>
						<th>Compensation</th>
						<th>Company</th>
						<th>Year</th>
					</tr>
				</thead>
				<tbody>
					{people}
				</tbody>
			</table>
		);
	}
});

module.exports = PeopleView;