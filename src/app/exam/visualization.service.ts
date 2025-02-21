import { Injectable } from '@nestjs/common';
import { createCanvas } from 'canvas';
import * as echarts from 'echarts';

@Injectable()
export class VisualizationService {
  // Currently I am not using any data to generate chart just harcoded values.
  async createChart(
    q: any,
    value: number,
    percent: string,
    width: number,
  ): Promise<Buffer> {
    const max = Math.max(...q);
    const min = Math.min(...q);
    const data = [
      ['', q[0]],
      ['25%', q[1]],
      ['50%', q[2]],
      ['75%', q[3]],
      ['100%', 0],
    ];
    const index = data.findIndex(([, v]) => value < Number(v));
    const insertIndex = index === -1 ? data.length - 1 : Math.max(1, index); // Ensure insertion is between 1 and last index

    // Insert value while keeping the first and last elements unchanged
    const updatedData = [
      data[0], // Keep the first element
      ...data.slice(1, insertIndex),
      [`${percent}%`, value],
      ...data.slice(insertIndex),
    ];
    // let index = 0;
    // if (value < q[1]) index = 0;
    // if (value < q[2]) index = 1;
    // if (value < q[3]) index = 2;
    // if (value < q[4]) index = 3;
    // data.splice(index, 0, ['', value]);
    const echartOption = {
      xAxis: {
        type: 'category',
        boundaryGap: false,
      },
      grid: {
        left: '5%',
        right: '4%',
        top: '10%',
        containLabel: true,
        show: false,
      },
      yAxis: {
        type: 'value',

        show: false,
      },

      series: [
        {
          type: 'line',
          smooth: 0.5,
          symbol: 'none',
          lineStyle: {
            color: '#ED1C45',
            width: 3,
          },
          markPoint: {
            symbol: 'pin',
            symbolSize: 80,
            itemStyle: {
              color: '#F36421',
            },
            label: {
              show: true,
              formatter: `${percent}%`,
              fontSize: 18,
              fontWeight: 'bold',
              color: '#fff',
            },
            data: [{ coord: [`${percent}%`, max * 0.9], value: `${percent}%` }],
          },
          markLine: {
            symbol: ['none', 'none'],
            label: { show: false },
            lineStyle: {
              color: '#ED1C45',
              width: 2,
            },
            data: [{ xAxis: insertIndex }],
          },
          areaStyle: {
            opacity: 0.8,
            color: new echarts.graphic.LinearGradient(0, 1, 0, 0, [
              {
                offset: 0,

                color: 'rgba(243,100,33, 0.6)',
              },
              {
                offset: 1,
                color: 'rgba(243,100,33, 1)',
              },
            ]),
          },
          data: data,
        },
      ],
    };

    const canvas = createCanvas(1000, 700);
    const chart = echarts.init(canvas as any);

    chart.setOption(echartOption);

    return canvas.toBuffer('image/png');
  }

  async doughnut(
    bg: string,
    color: string,
    total: number,
    point: number,
  ): Promise<Buffer> {
    try {
      console.log(total, point);

      const option = {
        series: [
          // Gray background (full circle)
          {
            type: 'pie',
            radius: ['50%', '100%'],
            startAngle: 90,
            silent: true,
            data: [
              {
                value: total,
                itemStyle: {
                  color: bg,
                },
              },
            ],
            label: { show: false },
            emphasis: { disabled: true },
            animation: false,
          },
          // Orange progress (75% with rounded ends)
          {
            type: 'pie',
            radius: ['50%', '100%'],
            startAngle: 90,
            silent: true,
            data: [
              {
                value: point,
                itemStyle: {
                  color: color,
                  borderRadius: 24,
                },
              },
              {
                value: total - point,
                itemStyle: {
                  color: 'transparent',
                },
              },
            ],
            roundCap: true,
            label: { show: false },
            emphasis: { disabled: true },
          },
        ],
      };

      const canvas = createCanvas(520, 520);
      const chart = echarts.init(canvas as any);

      chart.setOption(option);

      return canvas.toBuffer('image/png');
    } catch (error) {
      console.log(error);
    }
  }
}
