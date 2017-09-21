var React = require('react');

var PersonRow = React.createClass({
	handleClick: function() {
		this.props.selectionCallback(this.props.index);
	},

	handleChange: function(e) {
		this.props.person[e.currentTarget.name] = e.currentTarget.value;
		this.props.editCallback(this.props.person, this.props.index);
	},

	handleDeleteClick: function(e) {
		this.props.deleteCallback(this.props.index);
		e.stopPropagation();
	},

	handleAddClick: function(e) {
		this.props.addCallback(this.props.index);
		e.stopPropagation();
	},

	render: function() {
		if (this.props.editMode) {
			return (
				<tr>
					<td><input type="text" onChange={this.handleChange} name="first_name" style={{width: '100%'}} value={this.props.person.first_name} /></td>
					<td><input type="text" onChange={this.handleChange} name="middle_name" style={{ width: '100%'}} value={this.props.person.middle_name} /></td>
					<td><input type="text" onChange={this.handleChange} name="last_name" style={{width: '100%'}} value={this.props.person.last_name} /></td>
					<td><input type="text" onChange={this.handleChange} name="title" style={{width: '100%'}} value={this.props.person.title} /></td>
					<td><input type="text" onChange={this.handleChange} name="salary" style={{width: '100%'}} value={this.props.person.salary} /></td>
					<td><input type="text" onChange={this.handleChange} name="group_name" style={{width: '100%'}} value={this.props.person.group_name} /></td>
					<td><input type="text" onChange={this.handleChange} name="year" style={{width: '100%'}} value={this.props.person.year} /></td>
					<td>
						<div className="btn-group" role="group">
							<button onClick={this.handleDeleteClick} type="button" className="btn btn-default"><span className="glyphicon glyphicon-minus" aria-hidden="true"></span></button>
							<button onClick={this.handleAddClick} type="button" className="btn btn-default"><span className="glyphicon glyphicon-plus" aria-hidden="true"></span></button>
						</div>
					</td>
				</tr>
			);
		} else {
			var salaryString = this.props.person.salary
			var salaryInt = parseInt(this.props.person.salary);
			if (!isNaN(salaryInt)) {
				salaryString = '$' + salaryInt.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,')
			}

			return (
				<tr onClick={this.handleClick}>
					<td>{this.props.person.first_name}</td>
					<td>{this.props.person.middle_name}</td>
					<td>{this.props.person.last_name}</td>
					<td>{this.props.person.title}</td>
					<td>{salaryString}</td>
					<td>{this.props.person.group_name}</td>
					<td>{this.props.person.year}</td>
					<td>
						<div className="btn-group" role="group">
							<button onClick={this.handleDeleteClick} type="button" className="btn btn-default"><span className="glyphicon glyphicon-minus" aria-hidden="true"></span></button>
							<button onClick={this.handleAddClick} type="button" className="btn btn-default"><span className="glyphicon glyphicon-plus" aria-hidden="true"></span></button>
						</div>
					</td>
				</tr>
			);
		}
	}
});

var PeopleView = React.createClass({
	getInitialState: function() {
		var people = this.props.people;
		if (people.length == 0) {
			people = [this.getEmptyPerson()];
		}

		return {
			people: people,
			editingIndex: -1
		};
	},

	getEmptyPerson: function() {
		return {
			first_name: '',
			middle_name: '',
			last_name: '',
			title: '',
			salary: '',
			group_name: '',
			year: ''
		};
	},

	handleSelection: function(index) {
		this.setState({editingIndex: index});
	},

	handleEdit: function(person, index) {
		this.setState(function(previousState) {
			previousState.people[index] = person;
			return {people: previousState.people};
		});
	},

	handleDelete: function(index) {
		this.setState(function(previousState) {
			previousState.people.splice(index, 1)
			return {
				people: previousState.people,
				editingIndex: -1
			};
		});
	},

	handleAdd: function(index) {
		this.setState(function(previousState) {
			previousState.people.splice(index + 1, 0, this.getEmptyPerson());
			return {
				people: previousState.people,
				editingIndex: index + 1
			};
		});
	},

	addRow: function(e) {
		this.handleAdd(-1);
		e.stopPropagation();
	},

	render: function() {
		var people = [];
		this.state.people.forEach(function(person, index) {
			people.push(
				<PersonRow
				person={person}
				editMode={index == this.state.editingIndex}
				selectionCallback={this.handleSelection}
				editCallback={this.handleEdit}
				deleteCallback={this.handleDelete}
				addCallback={this.handleAdd}
				key={index}
				index={index} />
			);
		}, this);

		return (
			<div>
				<h2>Preview of Extracted Data</h2>
				<table className="table table-bordered">
					<thead>
						<tr>
							<th>First Name</th>
							<th>Middle Name</th>
							<th>Last Name</th>
							<th>Title</th>
							<th>Compensation</th>
							<th>Company</th>
							<th>Year</th>
							<th><button onClick={this.addRow} type="button" className="btn btn-default"><span className="glyphicon glyphicon-plus" aria-hidden="true"></span></button></th>
						</tr>
					</thead>
					<tbody>
						{people}
					</tbody>
				</table>
			</div>
		);
	}
});

module.exports = PeopleView;
