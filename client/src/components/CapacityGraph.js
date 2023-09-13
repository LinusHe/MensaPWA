import React, { useEffect, useRef } from 'react';
import { ResponsiveLine } from '@nivo/line';

const CapacityGraph = ({ data, currentTimeString, currentCapa, greyed }) => {
  const containerRef = useRef(null);
  const bigElementRef = useRef(null);
  const currentTime = currentTimeString;

  const startHour = 9;
  const endHour = 14;
  const currentHour = currentTime.split(':')[0];
  const currentMinute = currentTime.split(':')[1];
  let scrollMultiplier = greyed ? 1.5 : (((parseInt(currentHour) + parseInt(currentMinute) / 60) - startHour) / (endHour - startHour)) + 0.5 * (currentHour - startHour);

  let currencyCapacity = currentCapa;

  const markers = greyed ? [] : [
    {
      axis: 'x',
      legend: currencyCapacity,
      legendPosition: 'top',
      lineStyle: {
        stroke: '#424588',
        strokeWidth: 2,
        strokeDasharray: '10 5',
        opacity: 0.5,
      },
      legendOrientation: 'horizontal',
      textStyle: {
        fill: '#fcb23b',
        fontSize: 22,
        fontWeight: 600,
      },
      value: new Date(`1900-01-01T${currentHour}:${currentMinute}:00`)
    }
  ];


  useEffect(() => {
    const scrollToMiddle = (bigel, container) => {
      const available = bigel.offsetWidth - container.offsetWidth;
      const scrollOffset = (available / 2) * scrollMultiplier;
      container.scrollLeft = scrollOffset;
    };

    const container = containerRef.current;
    const bigElement = bigElementRef.current;
    scrollToMiddle(bigElement, container);
  }, [scrollMultiplier]);

  const format = v => `${v}%`

  return (
    <div
      style={{
        height: greyed ? 'calc(90vh - 380px)' : 'calc(90vh - 396px)', // TODO Make this relative to sizes of other elements
        overflowX: 'scroll',
        overflowY: 'hidden',
      }}
      ref={containerRef}
    >
      <div
        style={{
          height: '100%',
          width: greyed ? '150vw' : '200vw',
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
            max: 100,
          }}
          margin={{ top: 30, right: 0, bottom: 50, left: 0 }}
          curve="natural"
          yFormat={format}
          axisBottom={{
            orient: 'bottom',
            format: '%H:%M',
            tickValues: greyed ? 'every 30 minutes' : 'every 30 minutes',
            legendOffset: 36,
            legendPosition: 'middle',
          }}
          theme={
            {
              grid: {
                line: {
                  stroke: '#424588',
                  strokeWidth: 1,
                  strokeDasharray: '10 10',
                  opacity: 0.2,
                }
              }
            }
          }
          axisLeft={null}
          colors={[greyed ? '#B9BCBF' : '#424588']}
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
          enableGridX={false}
          enableGridY
          gridYValues={[10, 30, 50, 70, 90]}
          defs={[
            {
              id: 'gradient',
              type: 'linearGradient',
              colors: [
                { offset: 0, color: greyed ? '#B9BCBF' : '#BEACEC', opacity: 1 },
                { offset: 100, color: greyed ? '#FFFFFF' : '#BEACEC', opacity: 0 },
              ],
            },
          ]}
          fill={[{ match: '*', id: 'gradient' }]}
          markers={markers}
          layers={['grid', 'axes', 'areas', 'markers', 'crosshair', 'lines', 'points', 'slices', 'mesh', 'legends']}
        />
      </div>
    </div>
  );
};

export default CapacityGraph;
