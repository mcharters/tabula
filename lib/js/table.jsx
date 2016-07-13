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

var DeleteButton = React.createClass({
	render: function() {
		return <td>
			<button type="button" className="btn btn-default" onClick={this.props.clickCallback}>
				<span className="glyphicon glyphicon-minus" aria-hidden="true"></span>
			</button>
		</td>;
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

		cells.push(<DeleteButton clickCallback={this.props.rowDeletedCallback} key={cells.length + 1} />);

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
		this.setState(function(previousState) {
			if (previousState.rows.length > 0) {
				var rowLength = previousState.rows[0].length;
				var rowIdx = Math.floor(cellIndex / rowLength);
				var cellIdx = cellIndex % rowLength;

				previousState.rows[rowIdx][cellIdx] = value;

				return {rows: previousState.rows};
			}
		});
	},

	rowDeleted: function(rowIndex) {
		this.setState((previousState) => {
			return {
				rows: previousState.rows
					.slice(0, rowIndex)
					.concat(previousState.rows.slice(rowIndex + 1)),
				editingIndex: -1
			};
		}, () => this.props.onModified(this.state.rows));
	},

	columnDeleted: function(columnIndex) {
		this.setState((previousState) => {
			var newRows = [];

			for (var i=0; i<previousState.rows.length; i++) {
				newRows.push(
					previousState.rows[i]
						.slice(0, columnIndex)
						.concat(previousState.rows[i].slice(columnIndex + 1))
				);
			}

			return {
				rows: newRows,
				editingIndex: -1
			};
		}, () => this.props.onModified(this.state.rows));
	},

	render: function() {
		var rows = [];

		if (this.state.rows.length > 0) {
			var firstRow = [];
			this.state.rows[0].forEach((row, index) => {
				firstRow.push(<DeleteButton key={index} clickCallback={() => this.columnDeleted(index)} />);
			}, this);
			
			firstRow.push(<td key={this.state.rows[0].length}></td>);

			rows.push(<tr key={-1}>{firstRow}</tr>)

			this.state.rows.forEach(function(row, index) {
				rows.push(
					<TableRow
					key={index}
					cells={row}
					rowIndex={index}
					selectionCallback={this.setSelection}
					editedCallback={this.cellEdited}
					rowDeletedCallback={() => this.rowDeleted(index)}
					editingIndex={this.state.editingIndex} />
				);
			}, this);
		}

		return(
			<table className="table table-bordered extracted-data" >
				<tbody>{rows}</tbody>
			</table>
		);
	}
});

var Tables = React.createClass({
	getInitialState: function() {
		return {
			tables: this.props.tables
		};
	},

	tableChanged: function(tableIndex, table) {
		this.setState((previousState) => ({
			tables: previousState.tables
				.slice(0, tableIndex)
				.concat([table])
				.concat(previousState.tables.slice(tableIndex + 1))
		}));
	},

	render: function() {
		if (this.props.tables.length > 0) {
			var tables = [];
			this.props.tables.forEach(function(table, index) {
				tables.push(<Table key={index} rows={table} onModified={(table) => { this.tableChanged(index, table) }}/>);
			}, this);

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
