/*
 * charts for WeChat small app v1.0
 *
 * https://github.com/xiaolin3303/wx-charts
 * 2016-11-28
 *
 * Designed and built with all the love of Web
 */

'use strict';

var config = {
    yAxisWidth: 15,
    yAxisSplit: 5,
    xAxisHeight: 15,
    xAxisLineHeight: 15,
    legendHeight: 15,
    yAxisTitleWidth: 15,
    padding: 12,
    columePadding: 3,
    fontSize: 10,
    dataPointShape: ['circle', 'diamond', 'triangle', 'rect'],
    colors: ['#7cb5ec', '#f7a35c', '#434348', '#90ed7d', '#f15c80', '#8085e9'],
    pieChartLinePadding: 25,
    pieChartTextPadding: 15,
    xAxisTextPadding: 3,
    titleColor: '#333333',
    titleFontSize: 20,
    subtitleColor: '#999999',
    subtitleFontSize: 15,
    toolTipPadding: 3,
    toolTipBackground: '#000000',
    toolTipOpacity: 0.7,
    toolTipLineHeight: 14,
    radarGridCount: 3,
    radarLabelTextMargin: 15
};

// Simple deep copy
function assign(target, source) {
    if (typeof target !== 'object' || target === null) {
        target = {};
    }
    if (typeof source !== 'object' || source === null) {
        source = {};
    }
    for (var key in source) {
        if (source.hasOwnProperty(key)) {
            target[key] = source[key];
        }
    }
    return target;
}

// Simplified version of Object.assign
function copy(target) {
    return assign({}, target);
}

// Round number to specified decimal places
function roundToFixed(number, decimals) {
    var factor = Math.pow(10, decimals);
    return Math.round(number * factor) / factor;
}

// Convert hex color to rgba
function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Drawing functions
function drawLine(ctx, startX, startY, endX, endY, color) {
    ctx.beginPath();
    ctx.setStrokeStyle(color || '#ffffff');
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.closePath();
}

function drawText(ctx, text, x, y, color, fontSize, align, baseline) {
    ctx.beginPath();
    ctx.setFontSize(fontSize || config.fontSize);
    ctx.setFillStyle(color || '#ffffff');
    ctx.setTextAlign(align || 'left');
    ctx.setTextBaseline(baseline || 'top');
    ctx.fillText(text, x, y);
    ctx.closePath();
}

function drawArc(ctx, x, y, radius, sAngle, eAngle, color, lineWidth) {
    ctx.beginPath();
    ctx.setStrokeStyle(color || '#ffffff');
    ctx.setLineWidth(lineWidth || 1);
    ctx.arc(x, y, radius, sAngle, eAngle, false);
    ctx.stroke();
    ctx.closePath();
}

function drawPieArc(ctx, x, y, radius, sAngle, eAngle, color) {
    ctx.beginPath();
    ctx.setFillStyle(color || '#ffffff');
    ctx.moveTo(x, y);
    ctx.arc(x, y, radius, sAngle, eAngle, false);
    ctx.closePath();
    ctx.fill();
}

function drawRoundRect(ctx, x, y, width, height, radius, color) {
    ctx.beginPath();
    ctx.setFillStyle(color || '#ffffff');
    ctx.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
    ctx.arc(x + width - radius, y + radius, radius, Math.PI * 1.5, Math.PI * 2);
    ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI * 0.5);
    ctx.arc(x + radius, y + height - radius, radius, Math.PI * 0.5, Math.PI);
    ctx.closePath();
    ctx.fill();
}

// Main Chart class
function Chart(opts) {
    opts.title = opts.title || {};
    opts.subtitle = opts.subtitle || {};
    opts.yAxis = opts.yAxis || {};
    opts.yAxis.format = opts.yAxis.format || function (val) {return val;};
    opts.yAxis.min = opts.yAxis.min || 0;
    opts.yAxis.title = opts.yAxis.title || undefined;
    opts.legend = opts.legend === false ? false : true;
    opts.animation = opts.animation === false ? false : true;
    
    var context = wx.createCanvasContext(opts.canvasId);
    var chartData = {};
    var categories = [];
    if (opts.categories && opts.categories.length > 0) {
        categories = opts.categories;
    } else {
        if (opts.series && opts.series.length > 0) {
            opts.series.forEach(function (item) {
                if (item.data && item.data.length > 0) {
                    item.data.forEach(function (subitem, index) {
                        if (categories.length <= index) {
                            categories.push('Category ' + (index + 1));
                        }
                    });
                }
            });
        }
    }
    chartData.categories = categories;
    
    // Get max/min values for scaling
    var yAxisMax = opts.yAxis.max || 0;
    var yAxisMin = opts.yAxis.min || 0;
    if (opts.series && opts.series.length > 0) {
        opts.series.forEach(function (item) {
            if (item.data && item.data.length > 0) {
                var data = item.data;
                data.forEach(function (item) {
                    if (item > yAxisMax) {
                        yAxisMax = item;
                    }
                    if (item < yAxisMin) {
                        yAxisMin = item;
                    }
                });
            }
        });
    }
    var spacingValid = opts.height - 2 * config.padding - config.xAxisHeight - config.legendHeight;
    var yAxisSplit = opts.yAxis.splitNumber || config.yAxisSplit;
    var eachSpacing = Math.floor(spacingValid / yAxisSplit);
    var xAxisPoints = [];
    var yAxisPoints = [];
    var startX = config.padding + config.yAxisWidth;
    var width = opts.width - 2 * config.padding - config.yAxisWidth;
    var endX = opts.width - config.padding;
    categories.forEach(function (item, index) {
        xAxisPoints.push(startX + index * width / (categories.length - 1));
    });
    for (var i = 0; i <= yAxisSplit; i++) {
        yAxisPoints.push(config.padding + eachSpacing * i);
    }
    
    // Draw Y axis
    var ySpace = (yAxisMax - yAxisMin) / config.yAxisSplit;
    if (opts.yAxis.title) {
        drawText(context, opts.yAxis.title, config.padding, config.padding, '#666666', config.fontSize);
    }
    for (var i = 0; i <= config.yAxisSplit; i++) {
        var value = i * ySpace + yAxisMin;
        value = roundToFixed(value, 2);
        var formatter = opts.yAxis.format;
        drawText(context, formatter(value), config.padding, config.padding + eachSpacing * i, '#666666', config.fontSize);
    }
    drawLine(context, startX, config.padding, startX, opts.height - config.padding - config.xAxisHeight, '#cccccc');
    
    // Draw X axis
    drawLine(context, startX, opts.height - config.padding - config.xAxisHeight, endX, opts.height - config.padding - config.xAxisHeight, '#cccccc');
    var validWidth = width - 2 * config.padding;
    var eachSpacing = validWidth / categories.length;
    categories.forEach(function (item, index) {
        var offset = eachSpacing / 2;
        var xPoint = startX + index * eachSpacing + offset;
        var value = item.value || item;
        drawText(context, value, xPoint, opts.height - config.padding - config.xAxisHeight + config.xAxisTextPadding, '#666666', config.fontSize, 'center');
    });
    
    if (opts.series.length == 0) {
        drawText(context, '没有数据', opts.width / 2, opts.height / 2, '#999999', config.fontSize, 'center');
        context.draw();
        return;
    }
    
    // Draw Line Chart
    if (opts.type === 'line') {
        var points = [];
        var currentPoints = [];
        for (var i = 0; i < opts.series.length; i++) {
            var data = opts.series[i].data;
            var format = opts.series[i].format || function (val) {return val;};
            var color = opts.series[i].color || config.colors[i];
            
            // Draw data points
            for (var j = 0; j < data.length; j++) {
                var x = xAxisPoints[j];
                var y = config.padding + (1 - (data[j] - yAxisMin) / (yAxisMax - yAxisMin)) * (opts.height - 2 * config.padding - config.xAxisHeight);
                points.push([x, y]);
                currentPoints.push([x, y]);
            }
            
            // Draw line
            context.beginPath();
            context.setStrokeStyle(color);
            context.setLineWidth(2);
            context.moveTo(points[0][0], points[0][1]);
            for (var j = 1; j < points.length; j++) {
                context.lineTo(points[j][0], points[j][1]);
            }
            context.stroke();
            context.closePath();
            
            // Draw data points
            for (var j = 0; j < currentPoints.length; j++) {
                context.beginPath();
                context.setFillStyle(color);
                context.arc(currentPoints[j][0], currentPoints[j][1], 3, 0, 2 * Math.PI);
                context.closePath();
                context.fill();
            }
            
            // Clear arrays for next series
            points = [];
            currentPoints = [];
        }
    }
    
    // Draw Column Chart
    if (opts.type === 'column') {
        var points = [];
        var currentPoints = [];
        for (var i = 0; i < opts.series.length; i++) {
            var data = opts.series[i].data;
            var format = opts.series[i].format || function (val) {return val;};
            var color = opts.series[i].color || config.colors[i];
            
            // Calculate column width
            var eachSpacing = width / categories.length;
            var columnWidth = eachSpacing - 2 * config.columePadding;
            
            // Draw columns
            for (var j = 0; j < data.length; j++) {
                var x = startX + j * eachSpacing + config.columePadding;
                var height = (data[j] - yAxisMin) / (yAxisMax - yAxisMin) * (opts.height - 2 * config.padding - config.xAxisHeight);
                var y = opts.height - config.padding - config.xAxisHeight - height;
                
                context.beginPath();
                context.setFillStyle(color);
                context.rect(x, y, columnWidth, height);
                context.closePath();
                context.fill();
            }
            
            // Clear arrays for next series
            points = [];
            currentPoints = [];
        }
    }
    
    // Draw legend
    if (opts.legend) {
        var legendY = opts.height - config.padding - config.legendHeight;
        var legendWidth = 0;
        var legendMarginRight = 20;
        var lastX = config.padding;
        for (var i = 0; i < opts.series.length; i++) {
            var name = opts.series[i].name || ('Series ' + (i + 1));
            var color = opts.series[i].color || config.colors[i];
            
            // Draw legend color
            context.beginPath();
            context.setFillStyle(color);
            context.rect(lastX, legendY, 15, config.legendHeight);
            context.closePath();
            context.fill();
            
            // Draw legend text
            var textX = lastX + 20;
            var textWidth = measureText(name, config.fontSize);
            drawText(context, name, textX, legendY, '#666666', config.fontSize);
            
            // Update lastX for next legend item
            lastX = textX + textWidth + legendMarginRight;
        }
    }
    
    // Draw title and subtitle
    if (opts.title.name) {
        drawText(context, opts.title.name, opts.title.x || config.padding, opts.title.y || config.padding, opts.title.color || config.titleColor, opts.title.fontSize || config.titleFontSize);
    }
    if (opts.subtitle.name) {
        drawText(context, opts.subtitle.name, opts.subtitle.x || config.padding, opts.subtitle.y || (config.padding + config.titleFontSize + 5), opts.subtitle.color || config.subtitleColor, opts.subtitle.fontSize || config.subtitleFontSize);
    }
    
    context.draw();
}

// Helper function to estimate text width
function measureText(text, fontSize) {
    // Simplified approach - adjust based on your needs
    return text.length * fontSize * 0.6;
}

module.exports = Chart;

 