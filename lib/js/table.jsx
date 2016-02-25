var React = require('react');

var TableCell = React.createClass({
	handleClick: function() {
		this.props.selectionCallback(this.props.cellIndex);
	},

	handleChange: function() {
		this.props.editedCallback(this.props.cellIndex, this.refs.editField.value);
	},

	render: function() {
		if (this.props.cellIndex == this.props.editingIndex) {
			return(
				<td><input type="text" style={{width: '100%'}} ref="editField" autoFocus value={this.props.text} onChange={this.handleChange} /></td>
			);
		} else {
			return(
				<td onClick={this.handleClick}>{this.props.text}</td>
			);
		}
	}
});

var TableRow = React.createClass({
	render: function() {
		var cells = [];
		this.props.cells.forEach(function(cell, index) {
			cells.push(
				<TableCell 
				key={index} 
				text={cell} 
				editingIndex={this.props.editingIndex}
				selectionCallback={this.props.selectionCallback}
				editedCallback={this.props.editedCallback}
				cellIndex={(this.props.rowIndex * (this.props.cells.length)) + (index)} />
			);
		}, this);

		return(
			<tr>{cells}</tr>
		)
	}
});

var Table = React.createClass({
	getInitialState: function() {
		return {
			rows: this.props.rows,
			editingIndex: -1
		};
	},

	clearSelection: function() {
		this.setState({editingIndex: -1});
	},

	setSelection: function(editingIndex) {
		this.setState({editingIndex: editingIndex});
	},

	cellEdited: function(cellIndex, value) {
		this.setState(function(previousState, currentProps) {
			if (previousState.rows.length > 0) {
				var rowLength = previousState.rows[0].length;
				var rowIdx = Math.floor(cellIndex / rowLength);
				var cellIdx = cellIndex % rowLength;

				previousState.rows[rowIdx][cellIdx] = value;

				return {rows: previousState.rows};
			}
		});
	},

	render: function() {
		var rows = [];
		this.state.rows.forEach(function(row, index) {
			rows.push(
				<TableRow 
				key={index} 
				cells={row} 
				rowIndex={index}
				selectionCallback={this.setSelection}
				editedCallback={this.cellEdited}
				editingIndex={this.state.editingIndex} />
			);
		}, this);

		return(
			<table className="table table-bordered extracted-data" >
				<tbody>{rows}</tbody>
			</table>
		);
	}
});

var Tables = React.createClass({
	render: function() {
		if (this.props.tables.length > 0) {
			var tables = [];
			this.props.tables.forEach(function(table, index) {
				tables.push(<Table key={index} rows={table} />);
			});

			return (
				<div>
					<h2>Preview of Tabular Data</h2>
					{tables}
				</div>
			);
		} else {
			return (<span className="no-data">No data.</span>);
		}
	}
});

module.exports = Tables;