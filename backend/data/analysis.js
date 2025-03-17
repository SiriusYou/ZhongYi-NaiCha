/**
 * Data Analysis & Health Insights Service - Core Functionality
 * 
 * Provides APIs for tracking user health data, analyzing consumption patterns,
 * generating health reports, and visualizing health trends.
 */

const express = require('express');
const router = express.Router();

// In-memory data store (would be replaced with a proper database in production)
const userHealthData = {};
const userConsumptionData = {};
const userReports = {};

// TCM Constitution definitions and recommendations
const tcmConstitutions = {
  balanced: {
    name: '平和质',
    description: '体质平和，身体各项机能正常，对外界环境适应能力较强。',
    recommendations: [
      '日常可适当饮用温性调和茶饮',
      '保持规律作息，适度运动',
      '饮食宜均衡，不偏不倚'
    ]
  },
  yangDeficient: {
    name: '阳虚质',
    description: '阳气不足，怕冷，手脚易凉，精神不振。',
    recommendations: [
      '宜饮温热性茶饮，如姜茶、红枣茶',
      '积极锻炼身体，增强体质',
      '饮食宜温补，避免生冷食物'
    ]
  },
  yinDeficient: {
    name: '阴虚质',
    description: '阴液不足，易感内热，口干舌燥，手足心热。',
    recommendations: [
      '宜饮清凉滋阴茶饮，如菊花茶、绿茶',
      '作息规律，避免熬夜',
      '饮食宜清淡，避免辛辣刺激食物'
    ]
  },
  phlegmDampness: {
    name: '痰湿质',
    description: '体内湿气和痰浊偏盛，体形肥胖，容易疲倦。',
    recommendations: [
      '宜饮化湿茶饮，如薏仁茶、荷叶茶',
      '增加有氧运动，控制体重',
      '饮食宜清淡，少食多餐'
    ]
  },
  dampHeat: {
    name: '湿热质',
    description: '体内湿热偏盛，易生疮疖，口苦咽干。',
    recommendations: [
      '宜饮清热祛湿茶饮，如绿豆薏仁茶',
      '保持规律作息，不宜熬夜',
      '饮食宜清淡，避免辛辣油腻食物'
    ]
  },
  bloodStasis: {
    name: '血瘀质',
    description: '血行不畅，面色晦暗，舌质紫暗。',
    recommendations: [
      '宜饮活血化瘀茶饮，如红花茶、玫瑰花茶',
      '坚持适度运动，促进血液循环',
      '饮食宜温和，多食用富含维生素的食物'
    ]
  },
  qiStagnation: {
    name: '气郁质',
    description: '气机郁滞，情绪波动大，胸闷不适。',
    recommendations: [
      '宜饮疏肝解郁茶饮，如玫瑰花茶、薄荷茶',
      '保持心情愉悦，适当进行放松活动',
      '饮食宜清淡，避免过于辛辣刺激食物'
    ]
  },
  specialConstitution: {
    name: '特禀质',
    description: '先天因素所致，对某些物质过敏。',
    recommendations: [
      '宜饮个性化定制茶饮，避开过敏原',
      '生活环境宜清洁，避免过敏原',
      '饮食宜清淡，避免易引起过敏的食物'
    ]
  },
  qiDeficient: {
    name: '气虚质',
    description: '气血亏虚，倦怠乏力，说话低弱无力。',
    recommendations: [
      '宜饮补气养血茶饮，如黄芪红枣茶',
      '起居有常，避免劳累',
      '饮食宜温补，多食用富含蛋白质的食物'
    ]
  }
};

// Seasonal recommendations for wellness
const seasonalRecommendations = {
  spring: {
    name: '春季',
    diet: '饮食宜清淡，多食用新鲜蔬果，少食辛辣油腻食物。',
    lifestyle: '早睡早起，适当增加户外活动，调畅情志。',
    teas: ['菊花茶', '薄荷茶', '绿茶']
  },
  summer: {
    name: '夏季',
    diet: '饮食宜清淡，多食用清热解暑的食物，适当补充水分。',
    lifestyle: '避免长时间暴露在阳光下，保持室内通风，注意防暑。',
    teas: ['菊花茶', '荷叶茶', '绿豆薏仁茶']
  },
  autumn: {
    name: '秋季',
    diet: '饮食宜滋阴润燥，多食用滋润性食物，少食辛辣燥热食物。',
    lifestyle: '保持充足睡眠，防止秋燥伤肺，注意保暖。',
    teas: ['百合茶', '银耳茶', '梨茶']
  },
  winter: {
    name: '冬季',
    diet: '饮食宜温补，多食用温热性食物，增强抵抗力。',
    lifestyle: '早睡晚起，保持室内适宜温度，注意保暖。',
    teas: ['姜茶', '红枣茶', '桂圆茶']
  }
};

// Health metrics and their descriptions
const healthMetrics = {
  sleep: {
    name: '睡眠质量',
    description: '记录睡眠的质量和时长',
    unit: '分',
    max: 10
  },
  energy: {
    name: '精力水平',
    description: '记录日常精力和活力水平',
    unit: '分',
    max: 10
  },
  mood: {
    name: '情绪状态',
    description: '记录情绪波动和稳定性',
    unit: '分',
    max: 10
  },
  digestion: {
    name: '消化功能',
    description: '记录消化系统的运作状况',
    unit: '分',
    max: 10
  },
  pain: {
    name: '身体不适',
    description: '记录身体疼痛或不适程度',
    unit: '分',
    max: 10,
    reverse: true // 数值越低越好
  }
};

/**
 * @route   GET /metrics
 * @desc    Get available health metrics for tracking
 * @access  Public
 */
router.get('/metrics', (req, res) => {
  res.json({
    success: true,
    data: healthMetrics
  });
});

/**
 * @route   POST /health-data
 * @desc    Record user health data point
 * @access  Private
 */
router.post('/health-data', (req, res) => {
  const { userId, metrics, notes, date } = req.body;
  
  if (!userId || !metrics) {
    return res.status(400).json({
      success: false,
      message: 'User ID and metrics are required'
    });
  }

  // Validate metrics
  for (const metricKey in metrics) {
    if (!healthMetrics[metricKey]) {
      return res.status(400).json({
        success: false,
        message: `Invalid metric: ${metricKey}`
      });
    }
    
    const value = parseFloat(metrics[metricKey]);
    if (isNaN(value) || value < 0 || value > healthMetrics[metricKey].max) {
      return res.status(400).json({
        success: false,
        message: `Invalid value for ${metricKey}. Must be between 0 and ${healthMetrics[metricKey].max}`
      });
    }
  }
  
  // Create or update user health data
  if (!userHealthData[userId]) {
    userHealthData[userId] = [];
  }
  
  const recordDate = date ? new Date(date) : new Date();
  
  userHealthData[userId].unshift({
    date: recordDate.toISOString(),
    metrics,
    notes: notes || '',
  });
  
  res.json({
    success: true,
    message: 'Health data recorded successfully'
  });
});

/**
 * @route   GET /health-data/:userId
 * @desc    Get user health data history
 * @access  Private
 */
router.get('/health-data/:userId', (req, res) => {
  const { userId } = req.params;
  const { limit, offset, startDate, endDate } = req.query;
  
  if (!userHealthData[userId]) {
    return res.json({
      success: true,
      data: []
    });
  }
  
  let filteredData = [...userHealthData[userId]];
  
  // Filter by date range if provided
  if (startDate || endDate) {
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    
    filteredData = filteredData.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= start && entryDate <= end;
    });
  }
  
  // Apply pagination if provided
  if (limit) {
    const limitNum = parseInt(limit, 10);
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    filteredData = filteredData.slice(offsetNum, offsetNum + limitNum);
  }
  
  res.json({
    success: true,
    data: filteredData,
    total: userHealthData[userId].length
  });
});

/**
 * @route   POST /consumption
 * @desc    Record tea consumption data
 * @access  Private
 */
router.post('/consumption', (req, res) => {
  const { userId, teaId, teaName, amount, unit, effects, date } = req.body;
  
  if (!userId || !teaName) {
    return res.status(400).json({
      success: false,
      message: 'User ID and tea name are required'
    });
  }
  
  // Create or update user consumption data
  if (!userConsumptionData[userId]) {
    userConsumptionData[userId] = [];
  }
  
  const recordDate = date ? new Date(date) : new Date();
  
  userConsumptionData[userId].unshift({
    date: recordDate.toISOString(),
    teaId: teaId || '',
    teaName,
    amount: parseFloat(amount) || 1,
    unit: unit || '杯',
    effects: effects || []
  });
  
  res.json({
    success: true,
    message: 'Consumption data recorded successfully'
  });
});

/**
 * @route   GET /consumption/:userId
 * @desc    Get user consumption history
 * @access  Private
 */
router.get('/consumption/:userId', (req, res) => {
  const { userId } = req.params;
  const { limit, offset, startDate, endDate } = req.query;
  
  if (!userConsumptionData[userId]) {
    return res.json({
      success: true,
      data: []
    });
  }
  
  let filteredData = [...userConsumptionData[userId]];
  
  // Filter by date range if provided
  if (startDate || endDate) {
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    
    filteredData = filteredData.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= start && entryDate <= end;
    });
  }
  
  // Apply pagination if provided
  if (limit) {
    const limitNum = parseInt(limit, 10);
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    filteredData = filteredData.slice(offsetNum, offsetNum + limitNum);
  }
  
  res.json({
    success: true,
    data: filteredData,
    total: userConsumptionData[userId].length
  });
});

/**
 * @route   GET /analysis/:userId
 * @desc    Get user health and consumption analysis
 * @access  Private
 */
router.get('/analysis/:userId', (req, res) => {
  const { userId } = req.params;
  const { period } = req.query; // 'week', 'month', 'year'
  
  // Default to month if not specified
  const analysisPeriod = period || 'month';
  
  if (!userHealthData[userId] && !userConsumptionData[userId]) {
    return res.status(404).json({
      success: false,
      message: 'No data found for this user'
    });
  }
  
  const now = new Date();
  let startDate = new Date();
  
  // Set the analysis time period
  switch (analysisPeriod) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(now.getMonth() - 1);
  }
  
  // Health metrics analysis
  const metricAnalysis = {};
  if (userHealthData[userId]) {
    const periodData = userHealthData[userId].filter(entry => 
      new Date(entry.date) >= startDate && new Date(entry.date) <= now
    );
    
    // Calculate trends for each metric
    Object.keys(healthMetrics).forEach(metric => {
      const values = periodData
        .filter(entry => entry.metrics[metric] !== undefined)
        .map(entry => parseFloat(entry.metrics[metric]));
      
      if (values.length > 0) {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        
        // Calculate trend if enough data points
        let trend = 'stable';
        if (values.length >= 3) {
          // Compare first half with second half
          const half = Math.floor(values.length / 2);
          const firstHalf = values.slice(half);
          const secondHalf = values.slice(0, half);
          
          const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
          
          const difference = secondAvg - firstAvg;
          const threshold = 0.5; // Threshold to determine significant change
          
          if (healthMetrics[metric].reverse) {
            // For metrics where lower is better (like pain)
            if (difference < -threshold) {
              trend = 'improving';
            } else if (difference > threshold) {
              trend = 'declining';
            }
          } else {
            // For metrics where higher is better
            if (difference > threshold) {
              trend = 'improving';
            } else if (difference < -threshold) {
              trend = 'declining';
            }
          }
        }
        
        metricAnalysis[metric] = {
          average: avg.toFixed(1),
          trend,
          values: values.slice(0, 10) // Return last 10 values for charts
        };
      }
    });
  }
  
  // Consumption analysis
  const consumptionAnalysis = {
    frequency: {},
    totalAmount: 0,
    mostConsumed: ''
  };
  
  if (userConsumptionData[userId]) {
    const periodConsumption = userConsumptionData[userId].filter(entry => 
      new Date(entry.date) >= startDate && new Date(entry.date) <= now
    );
    
    // Calculate tea frequency and total
    let maxCount = 0;
    periodConsumption.forEach(entry => {
      if (!consumptionAnalysis.frequency[entry.teaName]) {
        consumptionAnalysis.frequency[entry.teaName] = {
          count: 0,
          amount: 0
        };
      }
      
      consumptionAnalysis.frequency[entry.teaName].count += 1;
      consumptionAnalysis.frequency[entry.teaName].amount += entry.amount;
      consumptionAnalysis.totalAmount += entry.amount;
      
      // Track most consumed tea
      if (consumptionAnalysis.frequency[entry.teaName].count > maxCount) {
        maxCount = consumptionAnalysis.frequency[entry.teaName].count;
        consumptionAnalysis.mostConsumed = entry.teaName;
      }
    });
    
    // Format total amount
    consumptionAnalysis.totalAmount = consumptionAnalysis.totalAmount.toFixed(1);
  }
  
  // Determine current season for recommendations
  const month = now.getMonth();
  let season;
  if (month >= 2 && month <= 4) {
    season = 'spring';
  } else if (month >= 5 && month <= 7) {
    season = 'summer';
  } else if (month >= 8 && month <= 10) {
    season = 'autumn';
  } else {
    season = 'winter';
  }
  
  res.json({
    success: true,
    data: {
      period: analysisPeriod,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      health: metricAnalysis,
      consumption: consumptionAnalysis,
      seasonalRecommendations: seasonalRecommendations[season]
    }
  });
});

/**
 * @route   POST /generate-report/:userId
 * @desc    Generate a comprehensive health report
 * @access  Private
 */
router.post('/generate-report/:userId', async (req, res) => {
  const { userId } = req.params;
  const { period, includeConsumption, includeHealth, profileId } = req.body;
  
  if (!userHealthData[userId] && !userConsumptionData[userId]) {
    return res.status(404).json({
      success: false,
      message: 'No data found for this user'
    });
  }
  
  // In production, you would fetch user profile from database
  // For now, we'll use mock profile data
  const userProfile = {
    id: profileId || userId,
    name: '用户' + userId.substring(0, 4),
    age: 35,
    gender: 'female',
    tcmConstitution: 'balanced',
    healthGoals: ['提高睡眠质量', '增强免疫力'],
    allergies: []
  };
  
  const now = new Date();
  let startDate = new Date();
  const reportPeriod = period || 'month';
  
  // Set the report time period
  switch (reportPeriod) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(now.getMonth() - 1);
  }
  
  // Report sections
  const reportSections = {
    summary: {
      title: '健康报告摘要',
      period: reportPeriod,
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      overallScore: 0
    }
  };
  
  // Health metrics section
  if (includeHealth !== false && userHealthData[userId]) {
    const periodData = userHealthData[userId].filter(entry => 
      new Date(entry.date) >= startDate && new Date(entry.date) <= now
    );
    
    // Calculate overall health score and trends
    const metricScores = {};
    let totalScore = 0;
    let metricsCount = 0;
    
    Object.keys(healthMetrics).forEach(metric => {
      const values = periodData
        .filter(entry => entry.metrics[metric] !== undefined)
        .map(entry => parseFloat(entry.metrics[metric]));
      
      if (values.length > 0) {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        let score = avg;
        
        // Normalize scores for reverse metrics (like pain where lower is better)
        if (healthMetrics[metric].reverse) {
          score = healthMetrics[metric].max - avg;
        }
        
        // Calculate trend
        let trend = 'stable';
        if (values.length >= 3) {
          const half = Math.floor(values.length / 2);
          const firstHalf = values.slice(half);
          const secondHalf = values.slice(0, half);
          
          const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
          
          const difference = secondAvg - firstAvg;
          const threshold = 0.5;
          
          if (healthMetrics[metric].reverse) {
            if (difference < -threshold) trend = 'improving';
            else if (difference > threshold) trend = 'declining';
          } else {
            if (difference > threshold) trend = 'improving';
            else if (difference < -threshold) trend = 'declining';
          }
        }
        
        metricScores[metric] = {
          average: avg.toFixed(1),
          score: score.toFixed(1),
          trend,
          name: healthMetrics[metric].name,
          description: healthMetrics[metric].description
        };
        
        totalScore += score;
        metricsCount++;
      }
    });
    
    // Calculate overall health score
    const overallScore = metricsCount > 0 ? 
      Math.round((totalScore / metricsCount) * 10) / 10 : 0;
    
    reportSections.summary.overallScore = overallScore;
    reportSections.healthMetrics = {
      title: '健康指标分析',
      overallScore,
      metrics: metricScores
    };
  }
  
  // Consumption section
  if (includeConsumption !== false && userConsumptionData[userId]) {
    const periodConsumption = userConsumptionData[userId].filter(entry => 
      new Date(entry.date) >= startDate && new Date(entry.date) <= now
    );
    
    const teaFrequency = {};
    let totalConsumption = 0;
    
    periodConsumption.forEach(entry => {
      if (!teaFrequency[entry.teaName]) {
        teaFrequency[entry.teaName] = {
          count: 0,
          amount: 0
        };
      }
      
      teaFrequency[entry.teaName].count += 1;
      teaFrequency[entry.teaName].amount += entry.amount;
      totalConsumption += entry.amount;
    });
    
    // Sort teas by consumption count
    const sortedTeas = Object.keys(teaFrequency)
      .map(tea => ({
        name: tea,
        count: teaFrequency[tea].count,
        amount: teaFrequency[tea].amount
      }))
      .sort((a, b) => b.count - a.count);
    
    reportSections.consumption = {
      title: '茶饮消费分析',
      totalConsumption: totalConsumption.toFixed(1),
      totalVarieties: sortedTeas.length,
      consumptionFrequency: periodConsumption.length / 
        (Math.ceil((now - startDate) / (1000 * 60 * 60 * 24))),
      topTeas: sortedTeas.slice(0, 5)
    };
  }
  
  // TCM Constitution section
  const constitution = tcmConstitutions[userProfile.tcmConstitution] || tcmConstitutions.balanced;
  reportSections.constitution = {
    title: '体质分析',
    constitution: constitution.name,
    description: constitution.description,
    recommendations: constitution.recommendations
  };
  
  // Seasonal advice section
  const month = now.getMonth();
  let season;
  if (month >= 2 && month <= 4) {
    season = 'spring';
  } else if (month >= 5 && month <= 7) {
    season = 'summer';
  } else if (month >= 8 && month <= 10) {
    season = 'autumn';
  } else {
    season = 'winter';
  }
  
  const seasonalAdvice = seasonalRecommendations[season];
  reportSections.seasonalAdvice = {
    title: '季节养生建议',
    season: seasonalAdvice.name,
    diet: seasonalAdvice.diet,
    lifestyle: seasonalAdvice.lifestyle,
    recommendedTeas: seasonalAdvice.teas
  };
  
  // Personalized recommendations
  reportSections.recommendations = {
    title: '个性化养生建议',
    general: [
      '根据您的健康数据和体质特点，建议您保持规律的生活作息。',
      '每日至少饮水1500ml，保持身体水分充足。',
      '定期进行温和的有氧运动，如散步、太极或瑜伽。'
    ],
    focus: []
  };
  
  // Add focused recommendations based on metrics
  if (reportSections.healthMetrics) {
    const metrics = reportSections.healthMetrics.metrics;
    
    if (metrics.sleep && parseFloat(metrics.sleep.average) < 6) {
      reportSections.recommendations.focus.push(
        '您的睡眠质量较低，建议晚上避免使用电子设备，可以饮用安神的茶饮，如酸枣仁茶或薰衣草茶。'
      );
    }
    
    if (metrics.energy && parseFloat(metrics.energy.average) < 6) {
      reportSections.recommendations.focus.push(
        '您的精力水平较低，建议适当增加高蛋白食物摄入，可以尝试补气的茶饮，如黄芪茶或人参茶。'
      );
    }
    
    if (metrics.digestion && parseFloat(metrics.digestion.average) < 6) {
      reportSections.recommendations.focus.push(
        '您的消化功能有待改善，建议少食多餐，可以尝试助消化的茶饮，如山楂茶或陈皮茶。'
      );
    }
  }
  
  // Generate report ID
  const reportId = 'report-' + userId + '-' + Date.now();
  
  // Store the report
  userReports[reportId] = {
    id: reportId,
    userId,
    createdAt: now.toISOString(),
    period: reportPeriod,
    sections: reportSections
  };
  
  res.json({
    success: true,
    message: '健康报告生成成功',
    data: {
      reportId,
      summary: reportSections.summary
    }
  });
});

/**
 * @route   GET /report/:reportId
 * @desc    Get a generated health report
 * @access  Private
 */
router.get('/report/:reportId', (req, res) => {
  const { reportId } = req.params;
  
  if (!userReports[reportId]) {
    return res.status(404).json({
      success: false,
      message: 'Report not found'
    });
  }
  
  res.json({
    success: true,
    data: userReports[reportId]
  });
});

/**
 * @route   GET /seasonal-advice
 * @desc    Get seasonal wellness advice
 * @access  Public
 */
router.get('/seasonal-advice', (req, res) => {
  const { season } = req.query;
  
  // If season is specified, return that season's advice
  if (season && seasonalRecommendations[season]) {
    return res.json({
      success: true,
      data: seasonalRecommendations[season]
    });
  }
  
  // Otherwise, determine current season
  const month = new Date().getMonth();
  let currentSeason;
  
  if (month >= 2 && month <= 4) {
    currentSeason = 'spring';
  } else if (month >= 5 && month <= 7) {
    currentSeason = 'summer';
  } else if (month >= 8 && month <= 10) {
    currentSeason = 'autumn';
  } else {
    currentSeason = 'winter';
  }
  
  res.json({
    success: true,
    data: seasonalRecommendations[currentSeason]
  });
});

/**
 * @route   GET /constitutions
 * @desc    Get TCM constitution types and recommendations
 * @access  Public
 */
router.get('/constitutions', (req, res) => {
  const { type } = req.query;
  
  // If type is specified, return just that constitution
  if (type && tcmConstitutions[type]) {
    return res.json({
      success: true,
      data: {
        [type]: tcmConstitutions[type]
      }
    });
  }
  
  // Otherwise return all constitutions
  res.json({
    success: true,
    data: tcmConstitutions
  });
});

module.exports = router; 