import { Injectable } from '@nestjs/common';
import { createCanvas } from 'canvas';
import * as echarts from 'echarts';
import { Belbin } from 'src/assets/report/belbin';
import { colors } from './reports/formatter';

@Injectable()
export class VisualizationService {
  // Currently I am not using any data to generate chart just harcoded values.

  async createChart(
    data: number[],
    min: number,
    max: number,
    value: number,
    point: number,
    percent: number,
  ): Promise<Buffer> {
    const echartOption = {
      xAxis: {
        show: false,
        min: min, //mean - 3 * stdDev
        max: max, // mean + 3 * stdDev
      },
      yAxis: {
        type: 'value',
        show: false,
      },
      series: [
        {
          type: 'line',
          data: data,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#ED1C45', width: 3 },
          areaStyle: {
            opacity: 0.8,
            color: new echarts.graphic.LinearGradient(0, 1, 0, 0, [
              { offset: 0, color: 'rgba(243,100,33, 0.6)' },
              { offset: 1, color: 'rgba(243,100,33, 1)' },
            ]),
          },
          markLine: {
            symbol: ['none', 'none'],
            label: { show: false },
            lineStyle: {
              color: '#ED1C45',
              width: 2,
            },

            data: [
              {
                xAxis: point,
              },
            ],
          },
          markPoint: {
            symbol: 'pin',
            symbolSize: 100,
            itemStyle: { color: '#F36421' },
            label: {
              show: true,
              formatter: `${percent}%`,
              fontSize: 18,
              fontWeight: 'bold',
              color: '#fff',
            },
            data: [{ coord: [point, value], point: `${percent}%` }], // Fixed position
          },
        },
        {
          type: 'scatter',
          data: [[point, 0]],
          symbolSize: 10,
          itemStyle: { color: 'red' },
          label: {
            show: true,
            position: 'bottom',
            formatter: (params) => {
              return `${percent}%`;
            },
          },
        },
      ],
    };

    const canvas = createCanvas(900, 700);
    const chart = echarts.init(canvas as any);

    chart.setOption(echartOption);

    return canvas.toBuffer('image/png');
  }
  async createRadar(
    indicator: { name: string; max: number }[],
    data: number[],
  ): Promise<Buffer> {
    const echartOption = {
      radar: {
        indicator: indicator,
        name: {
          textStyle: {
            fontSize: 14,
            color: colors.orange,
            fontWeight: 'bold',
          },
        },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: data,
              lineStyle: {
                color: colors.orange,
              },
              itemStyle: {
                color: colors.orange,
              },
              areaStyle: {
                color: 'rgba(255, 0, 0, 0.3)',
              },
            },
          ],
        },
      ],
    };

    const canvas = createCanvas(1200, 1200);
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

  async;
}
