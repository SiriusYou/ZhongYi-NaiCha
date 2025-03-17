const mongoose = require('mongoose');

const AnalysisReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reportType: {
      type: String,
      required: true,
      enum: ['health', 'consumption', 'trends', 'seasonal'],
      index: true
    },
    title: {
      type: String,
      required: true
    },
    summary: {
      type: String,
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    dataPoints: {
      type: Number,
      default: 0
    },
    dateRange: {
      start: {
        type: Date,
        required: true
      },
      end: {
        type: Date,
        required: true
      }
    },
    insights: [{
      category: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: true
      },
      level: {
        type: String,
        enum: ['info', 'warning', 'recommendation'],
        default: 'info'
      }
    }],
    charts: [{
      title: {
        type: String,
        required: true
      },
      description: {
        type: String
      },
      filePath: {
        type: String,
        required: true
      },
      fileUrl: {
        type: String,
        required: true
      },
      chartType: {
        type: String,
        enum: ['line', 'bar', 'pie', 'radar'],
        required: true
      }
    }],
    metadata: {
      generatedBy: {
        type: String,
        default: 'system'
      },
      version: {
        type: String,
        default: '1.0'
      }
    }
  },
  { timestamps: true }
);

// Create indexes for frequent queries
AnalysisReportSchema.index({ createdAt: -1 });
AnalysisReportSchema.index({ userId: 1, reportType: 1, createdAt: -1 });

module.exports = mongoose.model('AnalysisReport', AnalysisReportSchema); 