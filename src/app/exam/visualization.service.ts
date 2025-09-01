import { Injectable } from '@nestjs/common';
import { createCanvas, registerFont } from 'canvas';
import * as echarts from 'echarts';
import { colors, fontBold, fontNormal } from './reports/formatter';

// graphs

const calculateSplitNumber = (max: number): number => {
  if (!max) {
    return 5;
  }
  if (max <= 6) {
    return max;
  }
  const preferredSplits = [6, 4, 5, 3];
  for (const splits of preferredSplits) {
    if (max % splits === 0) {
      return splits;
    }
  }
  return 5;
};
@Injectable()
export class VisualizationService {
  constructor() {
    registerFont('src/assets/fonts/Gilroy-ExtraBold.ttf', {
      family: fontBold,
    });
    registerFont('src/assets/fonts/Gilroy-Medium.ttf', {
      family: fontNormal,
    });
  }

  async createChart(
    data: number[][],
    min: number,
    max: number,
    height: number,
    point: number,
    percent: number,
  ): Promise<Buffer> {
    const index = Math.floor((data.length / 100) * percent);
    const coordinate =
      index >= data.length
        ? data[data.length - 1]
        : index <= 0
          ? data[0]
          : data[index];

    const echartOption = {
      backgroundColor: '#ffffff',
      grid: {
        left: 75,
        right: 75,
        top: 180,
        bottom: 90,
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        min: min,
        max: max,
        axisLine: { show: true, lineStyle: { color: '#747474' } },
        axisTick: { show: true, lineStyle: { width: 6, height: 12 } },
        axisLabel: {
          formatter: function (value) {
            const range = max - min;
            const relativePos = (value - min) / range;
            const percent = Math.round(relativePos * 100);

            if (
              percent === 25 ||
              percent === 50 ||
              percent === 75 ||
              percent === 100
            ) {
              return percent + '%';
            }
            return '';
          },
          fontSize: 48,
          fontFamily: fontBold,
          fontWeight: 'bold',
        },
        splitLine: { show: false },
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
          lineStyle: {
            color: '#F36421',
            width: 6,
          },
          areaStyle: {
            opacity: 0.8,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(243, 100, 33, 0.9)' },
              { offset: 1, color: 'rgba(243, 100, 33, 0.3)' },
            ]),
          },
          markLine: {
            symbol: ['none', 'none'],
            label: { show: false },
            lineStyle: {
              color: '#ED1C45',
              width: 4.5,
              type: 'solid',
            },
            data: [
              {
                xAxis: coordinate[0],
              },
            ],
          },
          markPoint: {
            symbol: 'pin',
            symbolSize: 255,
            itemStyle: {
              color: '#ED1C45',
            },
            label: {
              show: true,
              formatter: `${percent}%`,
              fontSize: 54,
              fontFamily: fontBold,
              color: '#fff',
            },
            data: [
              {
                coord: [
                  coordinate[0],
                  coordinate[1] + 0.002 * coordinate[1] * 20,
                ],
              },
            ],
          },
        },
      ],
    };

    const canvas = createCanvas(900 * 3, 450 * 3);
    const ctx = canvas.getContext('2d');

    ctx.scale(3, 3);
    ctx.imageSmoothingEnabled = true;

    const chart = echarts.init(canvas as any, null, {
      width: 900 * 3,
      height: 450 * 3,
    });

    chart.setOption(echartOption);

    return canvas.toBuffer('image/png', {
      compressionLevel: 0,
      resolution: 300,
    });
  }

  async createRadar(
    indicator: { name: string; max: number }[],
    data: number[],
  ): Promise<Buffer> {
    const max = indicator[0]?.max || 10;

    const splitNumber = calculateSplitNumber(max);
    console.log('Calculated splitNumber:', splitNumber);
    const customFont = fontBold;
    const echartOption = {
      textStyle: {
        fontFamily: customFont,
      },
      radar: {
        indicator: indicator,
        splitNumber: splitNumber,
        axisLine: {
          lineStyle: {
            width: 3,
            color: '#CCCCCC',
          },
        },
        splitLine: {
          lineStyle: {
            width: 3,
            color: '#E0E0E0',
          },
        },
        axisName: {
          fontSize: 50,
          color: colors.orange,
          fontWeight: 'bold',
          fontFamily: customFont,
          padding: [50, 50, 50, 50],
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
                width: 7,
              },
              label: {
                show: true,
                position: 'top',
                color: colors.black,
                fontSize: 40,
                fontFamily: customFont,
                formatter: '{c}',
                distance: 15,
              },
              itemStyle: {
                color: colors.orange,
                borderColor: colors.orange,
                borderWidth: 7,
                symbolSize: 60,
              },
              areaStyle: {
                color: 'rgba(243, 100, 33, 0.3)',
              },
            },
          ],
        },
      ],
    };
    const canvas = createCanvas(850 * 3, 620 * 3);
    const ctx = canvas.getContext('2d');
    ctx.scale(3, 3);
    ctx.imageSmoothingEnabled = true;
    const chart = echarts.init(canvas as any, null, {
      width: 850 * 3,
      height: 620 * 3,
    });
    chart.setOption(echartOption);
    return canvas.toBuffer('image/png', {
      compressionLevel: 0,
      resolution: 300,
    });
  }

  async doughnut(bg: string, total: number, point: number): Promise<Buffer> {
    try {
      const option = {
        series: [
          {
            type: 'gauge',
            radius: '100%',
            startAngle: 180,
            endAngle: 0,
            center: ['50%', '50%'],
            // silent: true,
            axisLine: {
              lineStyle: {
                width: 385,
                color: [
                  [
                    point / total,
                    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                      { offset: 0, color: '#F36421' },
                      { offset: 1, color: '#ED1C45' },
                    ]),
                  ],
                  [1, bg],
                ],
              },
            },
            pointer: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
          },
        ],
      };

      const canvas = createCanvas(520 * 3, 520 * 3);
      const ctx = canvas.getContext('2d');

      ctx.scale(3, 3);
      ctx.imageSmoothingEnabled = true;

      const chart = echarts.init(canvas as any, null, {
        width: 520 * 3,
        height: 520 * 3,
      });

      chart.setOption(option);

      return canvas.toBuffer('image/png', {
        compressionLevel: 0,
        resolution: 300,
      });
    } catch (error) {
      console.log(error);
    }
  }

  async bar(userValue, maxValue, globalAverage, avgtext) {
    const canvasWidth = 1800;
    const canvasHeight = 130;

    const normalizedUserValue = userValue / maxValue;
    const emptyPortion = (maxValue - userValue) / maxValue;
    const normalizedGlobalAvg = globalAverage / maxValue;

    const avgPositionInPixels = normalizedGlobalAvg * canvasWidth;
    const barYCenter = canvasHeight / 2;
    const lineLength = 30;

    const option = {
      title: { show: false },
      tooltip: { show: false },

      grid: {
        left: '0%',
        right: '0%',
        top: 0,
        bottom: 0,
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        show: false,
        min: 0,
        max: 1,
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        show: false,
        data: [''],
      },
      series: [
        {
          type: 'bar',
          stack: 'total',
          barWidth: 35,
          data: [normalizedUserValue],
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#F36421' },
              { offset: 1, color: '#ED1C45' },
            ]),
            borderRadius: [20, 0, 0, 20],
          },
          z: 2,
        },
        {
          type: 'bar',
          stack: 'total',
          barWidth: 30,
          data: [emptyPortion],
          itemStyle: {
            color: '#E5E5E5',
            borderRadius: [0, 20, 20, 0],
          },
          z: 1,
        },
        {
          type: 'custom',
          renderItem: function (params, api) {
            const avgPosition = normalizedGlobalAvg;
            const avgPoint = api.coord([avgPosition, 0]);

            return {
              type: 'group',
              children: [
                {
                  type: 'line',
                  shape: {
                    x1: avgPoint[0],
                    y1: barYCenter - lineLength / 2 - 10,
                    x2: avgPoint[0],
                    y2: barYCenter + lineLength / 2 + 10,
                  },
                  style: {
                    stroke: '#000',
                    lineWidth: 2,
                  },
                },
              ],
            };
          },
          data: [normalizedUserValue],
          z: 3,
        },
      ],
      graphic: [
        {
          type: 'text',
          left: avgPositionInPixels + 'px',
          top: barYCenter + lineLength / 2 + 13,
          style: {
            text: `${avgtext}: ${globalAverage.toFixed(2)}`,
            font: '24px Gilroy-Medium',
            fill: '#333',
            textAlign: 'center',
          },
          bounding: 'raw',
        },
      ],
    };

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    ctx.scale(3, 3);
    ctx.imageSmoothingEnabled = true;

    const chart = echarts.init(canvas as any, null, {
      width: canvasWidth,
      height: canvasHeight,
    });

    chart.setOption(option);

    return canvas.toBuffer('image/png', {
      compressionLevel: 0,
      resolution: 300,
    });
  }
}
