
import React from 'react';
import PropTypes from 'prop-types';

import { format } from 'd3-format';
import { timeFormat, timeParse } from 'd3-time-format';
import shortid from 'shortid';
import { ChartCanvas, Chart } from 'react-stockcharts';

import {
	Modal,
	Button,
	FormGroup,
	ControlLabel,
	FormControl,
} from "react-bootstrap";

import {
	BarSeries,
	AreaSeries,
	OHLCSeries,
	LineSeries,
} from 'react-stockcharts/lib/series';
import { XAxis, YAxis } from 'react-stockcharts/lib/axes';
import {
	CrossHairCursor,
	CurrentCoordinate,
	MouseCoordinateX,
	MouseCoordinateY,
	EdgeIndicator,
} from 'react-stockcharts/lib/coordinates';

import { discontinuousTimeScaleProvider } from 'react-stockcharts/lib/scale';
import {
	OHLCTooltip,
	MovingAverageTooltip,
	HoverTooltip,
} from 'react-stockcharts/lib/tooltip';
import { ema, sma } from 'react-stockcharts/lib/indicator';
import { fitWidth } from 'react-stockcharts/lib/helper';
import { head, last, toObject } from 'react-stockcharts/lib/utils';
import { InteractiveText, DrawingObjectSelector, InteractiveYCoordinate } from "react-stockcharts/lib/interactive";
import { getMorePropsForChart } from "react-stockcharts/lib/interactive/utils";
import { saveInteractiveNodes, getInteractiveNodes } from '../utils/interactiveutils';
import { LabelAnnotation, Annotate } from "react-stockcharts/lib/annotation";
import { Colors } from '../styles/variables';

var defaultTextStyles = {
	...InteractiveText.defaultProps.defaultText,
	fontSize: 15,
	fontWeight: 'bold',
	bgFill: 'rgba(0,0,0,0)',
	bgStrokeWidth: 0,
	text: '',
};

var hoverTextStyles = {
	...InteractiveText.defaultProps.hoverText,
	text: 'Click here to move it',
};

const dateFormat = timeFormat("%Y-%m-%d");
const numberFormat = format(".2f");
const parseDate = timeParse("%m/%d/%Y");

function tooltipContent(ys) {
	return ({ currentItem, xAccessor }) => {
		return {
			x: dateFormat(xAccessor(currentItem)),
			y: [
				{
					label: "open",
					value: currentItem.open && numberFormat(currentItem.open)
				},
				{
					label: "high",
					value: currentItem.high && numberFormat(currentItem.high)
				},
				{
					label: "low",
					value: currentItem.low && numberFormat(currentItem.low)
				},
				{
					label: "close",
					value: currentItem.close && numberFormat(currentItem.close)
				}
			]
				.concat(
					ys.map(each => ({
						label: each.label,
						value: each.value(currentItem),
						stroke: each.stroke
					}))
				)
				.filter(line => line.value)
		};
	};
}

const markStyles = {
	blue: {
		...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate,
		id: shortid.generate(),
		draggable: false,
		stroke: 'blue',
		textFill: 'blue',
		edge: {
			...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.edge,
			stroke: 'blue',
		},
		textBox: {
			...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.textBox,
			closeIcon: {
				...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.textBox.closeIcon,
				width: 0,
				padding: { left: 0, right: 5 },
			}
		}
	},
	red: {
		...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate,
		id: shortid.generate(),
		draggable: false,
		stroke: 'red',
		textFill: 'red',
		edge: {
			...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.edge,
			stroke: 'red',
		},
		textBox: {
			...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.textBox,
			closeIcon: {
				...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.textBox.closeIcon,
				width: 0,
				padding: { left: 0, right: 5 },
			}
		}
	}
}

const annotationProps = {
	fontFamily: "Glyphicons Halflings",
	fontSize: 20,
	fill: "#060F8F",
	opacity: 0.8,
	text: "*",
	//y: ({ yScale }) => yScale.range()[0],
	tooltip: d => timeFormat("%B")(d.date),
	// onMouseOver: console.log.bind(console),
};

class CandleStickChartWithMA extends React.Component {
	constructor(props) {
		super(props);
		this.onDrawComplete = this.onDrawComplete.bind(this);

		this.saveInteractiveNodes = saveInteractiveNodes.bind(this);

		this.saveCanvasNode = this.saveCanvasNode.bind(this);

		this.state = {
			enableInteractiveObject: false,
			textList_1: [],
			yCoordinateList_1: [
				{
					...markStyles.blue,
					yValue: this.props.marks.R1,
					text: 'R1',
				},
				{
					...markStyles.blue,
					yValue: this.props.marks.R2,
					text: 'R2',
				},
				{
					...markStyles.red,
					yValue: this.props.marks.S1,
					text: 'S1',
				},
				{
					...markStyles.red,
					yValue: this.props.marks.S2,
					text: 'S2',
				},
			],
		};
	}
	saveCanvasNode(node) {
		this.canvasNode = node;
	}
	onDrawComplete(textList, moreProps) {
		// this gets called on
		// 1. draw complete of drawing object
		// 2. drag complete of drawing object
		const { id: chartId } = moreProps.chartConfig;

		this.setState({
			enableInteractiveObject: false,
			[`textList_${chartId}`]: textList,
		});
	}

	getAnnotation(mark) {
		const date = parseDate(mark.date);
		const data = this.props.data.filter(d => d.date.getTime() === date.getTime());
		var yPos = null;
		var style = null;

		if (data === []) return;

		const maxVal = Math.max(data[0].open, data[0].close, data[0].low, data[0].high);
		const minVal = Math.min(data[0].open, data[0].close, data[0].low, data[0].high);

		if (mark.direction === 'over') {
			yPos = maxVal;
			style = {
				fill: mark.color,
				y: ({ yScale }) => yScale(yPos) + (yScale.range()[1] - yScale.range()[0]) * 0.1,
			};
		}
		else if (mark.direction === 'under') {
			yPos = minVal;
			style = {
				fill: mark.color,
				y: ({ yScale }) => yScale(yPos) - (yScale.range()[1] - yScale.range()[0]) * 0.1,
			};
		}

		return 	(<Annotate with={LabelAnnotation}
			when={d => d.date.getTime() === date.getTime() /* some condition */}
			usingProps={{...annotationProps, ...style}}
		/>);
	}

	render() {
		const ema200 = ema()
			.options({
				windowSize: 200, // optional will default to 10
				sourcePath: "close", // optional will default to close as the source
			})
			.skipUndefined(true) // defaults to true
			.merge((d, c) => {d.ema200 = c;}) // Required, if not provided, log a error
			.accessor(d => d.ema200) // Required, if not provided, log an error during calculation
			.stroke("blue"); // Optional

		const ema50 = ema()
			.options({ windowSize: 50 })
			.merge((d, c) => {d.ema50 = c;})
			.accessor(d => d.ema50)
			.stroke("red")

		const smaVolume50 = sma()
			.options({ windowSize: 20, sourcePath: "volume" })
			.merge((d, c) => {d.smaVolume50 = c;})
			.accessor(d => d.smaVolume50)
			.fill('rgba(0,0,0,0)')
			.stroke(Colors.green);

		const { type, data: initialData, width, ratio, marks } = this.props;

		const calculatedData = ema50(ema200(smaVolume50(initialData)));
		const xScaleProvider = discontinuousTimeScaleProvider
			.inputDateAccessor(d => d.date);
		const {
			data,
			xScale,
			xAccessor,
			displayXAccessor,
		} = xScaleProvider(calculatedData);

		const start = xAccessor(last(data));
		const end = xAccessor(data[Math.max(0, data.length - 150)]);
		const xExtents = [start, end];

		const { text } = this.state;

		return (
			<div>
				<ChartCanvas height={600}
					width={width}
					ratio={ratio}
					margin={{ left: 70, right: 70, top: 10, bottom: 30 }}
					type={type}
					seriesName="MSFT"
					data={data}
					xScale={xScale}
					xAccessor={xAccessor}
					displayXAccessor={displayXAccessor}
					xExtents={xExtents}
				>
					<Chart id={1}
						yExtents={[d => [d.high, d.low], ema50.accessor(), ema200.accessor()]}
						padding={{ top: 50, bottom: 100 }}
					>
						<XAxis axisAt="bottom" orient="bottom"/>
						<YAxis axisAt="right" orient="right" ticks={5} />

						<MouseCoordinateY
							at="right"
							orient="right"
							displayFormat={format(".2f")} />

						<OHLCSeries stroke={d => d.close > d.open ? Colors.green : (d.open > d.close ? Colors.red : Colors.blue)}/>

						<LineSeries yAccessor={ema50.accessor()} stroke={ema50.stroke()}/>
						<LineSeries yAccessor={ema200.accessor()} stroke={ema200.stroke()}/>
						<CurrentCoordinate yAccessor={ema50.accessor()} fill={ema50.stroke()} />
						<CurrentCoordinate yAccessor={ema200.accessor()} fill={ema200.stroke()} />

						<OHLCTooltip origin={[-40, 0]}/>

						<InteractiveText
								ref={this.saveInteractiveNodes("InteractiveText", 1)}
								enabled={this.state.enableInteractiveObject}
								onDragComplete={this.onDrawComplete}
								textList={this.state.textList_1}
								hoverText={hoverTextStyles}
						/>
						
						<InteractiveYCoordinate
							ref={this.saveInteractiveNodes("InteractiveYCoordinate", 1)}
							enabled={this.state.enableInteractiveObject}
							yCoordinateList={this.state.yCoordinateList_1}
						/>

						{marks.marks.map((mark, index) =>(
							this.getAnnotation(mark)
						))}


						<MovingAverageTooltip
							onClick={e => console.log(e)}
							origin={[-38, 15]}
							options={[
								{
									yAccessor: ema50.accessor(),
									type: "EMA",
									stroke: ema50.stroke(),
									windowSize: ema50.options().windowSize,
									echo: "some echo here",
								},
								{
									yAccessor: ema200.accessor(),
									type: "EMA",
									stroke: ema200.stroke(),
									windowSize: ema200.options().windowSize,
									echo: "some echo here",
								},
							]}
						/>

						<HoverTooltip
							yAccessor={ema50.accessor()}
							tooltipContent={tooltipContent([
								{
									label: `${ema50.type()}(${ema50.options()
										.windowSize})`,
									value: d => numberFormat(ema50.accessor()(d)),
									stroke: ema50.stroke()
								},
								{
									label: `${ema200.type()}(${ema200.options()
										.windowSize})`,
									value: d => numberFormat(ema200.accessor()(d)),
									stroke: ema200.stroke()
								}
							])}
							fontSize={15}
						/>
					</Chart>
					<Chart id={2}
						yExtents={[d => d.volume, smaVolume50.accessor()]}
						height={100} origin={(w, h) => [0, h - 100]}
					>
						<YAxis axisAt="left" orient="left" ticks={5} tickFormat={format(".2s")}/>

						<MouseCoordinateX
							at="bottom"
							orient="bottom"
							displayFormat={timeFormat("%Y-%m-%d")} />
						<MouseCoordinateY
							at="left"
							orient="left"
							displayFormat={format(".4s")} />

						<BarSeries yAccessor={d => d.volume} fill={d => d.close > d.open ? Colors.green : Colors.red} />
						<AreaSeries yAccessor={smaVolume50.accessor()} stroke={smaVolume50.stroke()} fill={smaVolume50.fill()}/>
						<CurrentCoordinate yAccessor={smaVolume50.accessor()} fill={smaVolume50.stroke()} />
						<CurrentCoordinate yAccessor={d => d.volume} fill={Colors.red} />
					</Chart>
					<CrossHairCursor />
				</ChartCanvas>
		</div>
		);
	}
}

CandleStickChartWithMA.propTypes = {
	data: PropTypes.array.isRequired,
	width: PropTypes.number.isRequired,
	ratio: PropTypes.number.isRequired,
	type: PropTypes.oneOf(["svg", "hybrid"]).isRequired,
};

CandleStickChartWithMA.defaultProps = {
	type: "svg",
};
CandleStickChartWithMA = fitWidth(CandleStickChartWithMA);

export default CandleStickChartWithMA;
