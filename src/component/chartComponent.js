import React from 'react';
import { render } from 'react-dom';
import Chart from '../stock/chart';
import { getData, getMarks } from '../utils/utils';

import { TypeChooser } from 'react-stockcharts/lib/helper';

export default class ChartComponent extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			data: null,
			marks: null,
		};
	}

	componentDidMount() {
		getData().then(data => {
			this.setState({ data });
			console.log(data)
		});
		getMarks().then(marks => {
			this.setState({marks: marks.data});
			console.log("marks", marks.data);
		})
	}
	render() {
		const { data, marks } = this.state;

		if (data == null || marks == null) {
			return <div>Loading...</div>
		}
		return (
			<TypeChooser>
				{type => <Chart type={type} data={data} marks={marks}/>}
			</TypeChooser>
		)
	}
}