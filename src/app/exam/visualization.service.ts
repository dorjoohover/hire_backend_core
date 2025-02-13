import { Injectable } from '@nestjs/common';
import { createCanvas } from 'canvas';
import * as echarts from 'echarts';

@Injectable()
export class VisualizationService {
  // Currently I am not using any data to generate chart just harcoded values.
  async createChart(data?): Promise<Buffer> {
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

        // left: 0,
        // top: 0,
        // right: 0,
        // bottom: 0,
        show: false,
      },
      yAxis: {
        type: 'value',
        // boundaryGap: [0, '30%'],

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
              formatter: '89%',
              fontSize: 18,
              fontWeight: 'bold',
              color: '#fff',
            },
            data: [
              { coord: ['2019-10-11', 200], value: '89%' }, // Position the text
            ],
          },
          markLine: {
            symbol: ['none', 'none'],
            label: { show: false },
            lineStyle: {
              color: '#ED1C45',
              width: 2,
            },
            data: [{ xAxis: 1 }],
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
          data: [
            ['2019-10-10', 0],
            ['2019-10-11', 100],
            ['2019-10-12', 300],
            ['2019-10-13', 100],
            ['2019-10-14', 0],
            // ['2019-10-15', 300],
            // ['2019-10-16', 450],
            // ['2019-10-17', 300],
            // ['2019-10-18', 100]
          ],
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
