import { Injectable } from '@nestjs/common';
import { createCanvas } from 'canvas';
import * as echarts from 'echarts';

@Injectable()
export class VisualizationService {
  // Currently I am not using any data to generate chart just harcoded values.
  async createChart(
    dataPoints: any,
    value: number,
    percent: number,
    width: number,
    markline: any,
    normal: any,
  ): Promise<Buffer> {
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
      markLine: {
        symbol: ['none', 'none'],
        label: { show: false },
        lineStyle: {
          color: '#ED1C45',
          width: 2,
        },
        data: [markline],
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
            // percent
            data: [{ coord: [`${value}%`, 100], value: `${value}%` }],
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
          data: dataPoints,
        },

        {
          type: 'scatter',
          data: [[value, normal]],
          symbolSize: 10,
          itemStyle: { color: 'green' },
          label: {
            show: true,
            formatter: `Random: ${value.toFixed(2)}`,
            position: 'top',
          },
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
