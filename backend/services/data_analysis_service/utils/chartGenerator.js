const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

// Configure chart dimensions
const width = 800;
const height = 500;

// Create chart generators with different backgrounds
const whiteChartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });
const transparentChartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'transparent' });

// Chart colors
const colors = {
  primary: 'rgb(139, 111, 78)',
  secondary: 'rgb(245, 241, 231)',
  accent: 'rgb(0, 180, 216)',
  red: 'rgb(255, 107, 107)',
  gray: 'rgb(51, 51, 51)',
  lightGray: 'rgb(200, 200, 200)',
};

/**
 * Generate a line chart for time series data
 * @param {Object} data - Chart data
 * @param {string} title - Chart title
 * @param {string} filename - Output filename (without extension)
 * @param {boolean} transparent - Whether to use transparent background
 * @returns {string} - Path to the generated chart image
 */
async function generateLineChart(data, title, filename, transparent = false) {
  try {
    const chartData = {
      labels: data.labels,
      datasets: data.datasets.map((dataset, index) => {
        const colorIndex = index % Object.keys(colors).length;
        const colorKey = Object.keys(colors)[colorIndex];
        return {
          label: dataset.label,
          data: dataset.data,
          fill: false,
          borderColor: colors[colorKey] || colors.primary,
          tension: 0.1,
          pointRadius: 3,
        };
      }),
    };

    const configuration = {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title,
            font: {
              size: 18,
            },
          },
          legend: {
            position: 'bottom',
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: data.xAxisLabel || '',
            },
            grid: {
              display: true,
              color: 'rgba(200, 200, 200, 0.3)',
            },
          },
          y: {
            title: {
              display: true,
              text: data.yAxisLabel || '',
            },
            grid: {
              display: true,
              color: 'rgba(200, 200, 200, 0.3)',
            },
            beginAtZero: true,
          },
        },
      },
    };

    // Generate chart image
    const canvas = transparent ? transparentChartJSNodeCanvas : whiteChartJSNodeCanvas;
    const image = await canvas.renderToBuffer(configuration);
    
    // Save image to file
    const chartStoragePath = process.env.CHART_STORAGE_PATH || './storage/charts';
    const uniqueFilename = `${filename}_${moment().format('YYYYMMDD_HHmmss')}.png`;
    const filePath = path.join(chartStoragePath, uniqueFilename);
    
    fs.writeFileSync(filePath, image);
    
    return uniqueFilename;
  } catch (err) {
    console.error('Error generating line chart:', err);
    throw err;
  }
}

/**
 * Generate a bar chart
 * @param {Object} data - Chart data
 * @param {string} title - Chart title
 * @param {string} filename - Output filename (without extension)
 * @param {boolean} transparent - Whether to use transparent background
 * @returns {string} - Path to the generated chart image
 */
async function generateBarChart(data, title, filename, transparent = false) {
  try {
    const chartData = {
      labels: data.labels,
      datasets: data.datasets.map((dataset, index) => {
        const colorIndex = index % Object.keys(colors).length;
        const colorKey = Object.keys(colors)[colorIndex];
        return {
          label: dataset.label,
          data: dataset.data,
          backgroundColor: colors[colorKey] || colors.primary,
        };
      }),
    };

    const configuration = {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title,
            font: {
              size: 18,
            },
          },
          legend: {
            position: 'bottom',
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: data.xAxisLabel || '',
            },
            grid: {
              display: true,
              color: 'rgba(200, 200, 200, 0.3)',
            },
          },
          y: {
            title: {
              display: true,
              text: data.yAxisLabel || '',
            },
            grid: {
              display: true,
              color: 'rgba(200, 200, 200, 0.3)',
            },
            beginAtZero: true,
          },
        },
      },
    };

    // Generate chart image
    const canvas = transparent ? transparentChartJSNodeCanvas : whiteChartJSNodeCanvas;
    const image = await canvas.renderToBuffer(configuration);
    
    // Save image to file
    const chartStoragePath = process.env.CHART_STORAGE_PATH || './storage/charts';
    const uniqueFilename = `${filename}_${moment().format('YYYYMMDD_HHmmss')}.png`;
    const filePath = path.join(chartStoragePath, uniqueFilename);
    
    fs.writeFileSync(filePath, image);
    
    return uniqueFilename;
  } catch (err) {
    console.error('Error generating bar chart:', err);
    throw err;
  }
}

/**
 * Generate a pie chart
 * @param {Object} data - Chart data
 * @param {string} title - Chart title
 * @param {string} filename - Output filename (without extension)
 * @param {boolean} transparent - Whether to use transparent background
 * @returns {string} - Path to the generated chart image
 */
async function generatePieChart(data, title, filename, transparent = false) {
  try {
    // Generate colors for pie chart slices
    const backgroundColors = data.labels.map((_, index) => {
      const colorIndex = index % Object.keys(colors).length;
      const colorKey = Object.keys(colors)[colorIndex];
      return colors[colorKey];
    });

    const chartData = {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: backgroundColors,
        hoverOffset: 4,
      }],
    };

    const configuration = {
      type: 'pie',
      data: chartData,
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title,
            font: {
              size: 18,
            },
          },
          legend: {
            position: 'bottom',
          },
        },
      },
    };

    // Generate chart image
    const canvas = transparent ? transparentChartJSNodeCanvas : whiteChartJSNodeCanvas;
    const image = await canvas.renderToBuffer(configuration);
    
    // Save image to file
    const chartStoragePath = process.env.CHART_STORAGE_PATH || './storage/charts';
    const uniqueFilename = `${filename}_${moment().format('YYYYMMDD_HHmmss')}.png`;
    const filePath = path.join(chartStoragePath, uniqueFilename);
    
    fs.writeFileSync(filePath, image);
    
    return uniqueFilename;
  } catch (err) {
    console.error('Error generating pie chart:', err);
    throw err;
  }
}

module.exports = {
  generateLineChart,
  generateBarChart,
  generatePieChart,
}; 