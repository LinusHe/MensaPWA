import React, { useEffect, useRef } from 'react';
import { ResponsiveLine, defs } from '@nivo/line';

const CapacityGraph = ({ data }) => {
  const containerRef = useRef(null);
  const bigElementRef = useRef(null);
  const scrollMultiplier = 0.8; // Anpassbare Variable zur Multiplikation der Abweichung

  useEffect(() => {
    const container = containerRef.current;
    const bigElement = bigElementRef.current;
    scrollToMiddle(bigElement, container);
  }, []);

  const scrollToMiddle = (bigel, container) => {
    const available = bigel.offsetWidth - container.offsetWidth;
    const scrollOffset = (available / 2) * scrollMultiplier;
    container.scrollLeft = scrollOffset;
  };

  const format = v => `${v}%`

  return (
    <div
      style={{
        height: '50vh',
        overflowX: 'scroll',
        overflowY: 'hidden',
      }}
      ref={containerRef}
    >
      <div
        style={{
          height: '100%',
          width: '300vw',
        }}
        ref={bigElementRef}
      >
        <ResponsiveLine
          animate
          data={data}
          xScale={{
            format: '%H:%M',
            precision: 'minute',
            type: 'time',
            useUTC: false,
          }}
          yScale={{
            type: 'linear',
          }}
          margin={{ top: 30, right: 0, bottom: 35, left: 0 }}
          curve="natural"
          yFormat={format}
          axisBottom={{
            orient: 'bottom',
            format: '%H:%M',
            tickValues: 'every 15 minutes',
            legendOffset: 36,
            legendPosition: 'middle',
          }}
          axisLeft={null}
          colors={['#424588']}
          lineWidth={3}
          pointSize={10}
          pointColor={{ theme: 'background' }}
          pointBorderWidth={2}
          pointBorderColor={{ from: 'serieColor' }}
          pointLabelYOffset={-12}
          enableArea
          areaOpacity={1}
          enablePoints={false}
          enableSlices="x"
          // enableGridX={false}
          enableGridY
          gridYValues={[0, 25, 50, 75]}
          defs={[
            {
              id: 'gradient',
              type: 'linearGradient',
              colors: [
                { offset: 0, color: '#BEACEC', opacity: 1 },
                { offset: 100, color: '#BEACEC', opacity: 0 },
              ],
            },
          ]}
          fill={[{ match: '*', id: 'gradient' }]}
          markers={[
            {
              axis: 'x',
              legend: new Date().getDate(),
              legendPosition: 'top',
              lineStyle: {
                stroke: '#424588',
                strokeWidth: 2,
                strokeDasharray: '10 5',
                opacity: 0.5,
              },
              legendOrientation: 'horizontal',
              textStyle: {
                fill: '#424588',
                fontSize: 12,
                fontWeight: 600,

            },
              value: new Date("1900-01-01T12:45:30")
            }
          ]}
          layers={['grid', 'axes', 'areas',  'markers', 'crosshair', 'lines', 'points', 'slices', 'mesh', 'legends']}
        />
      </div>
    </div>
  );
};

export default CapacityGraph;
