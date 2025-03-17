/**
 * Knowledge Center Service
 * Provides TCM encyclopedia content, video courses, and audio podcasts
 */

const express = require('express');
const router = express.Router();

// Mock knowledge content database for initial setup
const knowledgeContent = [
  {
    id: 'kc001',
    type: 'article',
    title: '中医九种体质类型详解',
    description: '详细介绍中医九种体质类型的特点、表现及养生方法',
    content: '中医体质学说认为，每个人都有独特的体质类型，主要分为平和质、气虚质、阳虚质、阴虚质、痰湿质、湿热质、气郁质、血瘀质、特禀质九种类型。平和质是最理想的体质状态...',
    author: '李医师',
    categories: ['中医基础', '体质类型'],
    tags: ['体质', '养生', '中医理论'],
    createdAt: '2023-01-10',
    updatedAt: '2023-02-15',
    readTime: 10, // 阅读时间（分钟）
    viewCount: 1250,
    imageUrl: 'https://example.com/images/constitution-types.jpg'
  },
  {
    id: 'kc002',
    type: 'video',
    title: '四季养生茶饮配方',
    description: '根据四季变化调整茶饮配方，达到养生保健效果',
    videoUrl: 'https://example.com/videos/seasonal-tea.mp4',
    thumbnailUrl: 'https://example.com/thumbnails/seasonal-tea.jpg',
    duration: 720, // 视频时长（秒）
    instructor: '王教授',
    categories: ['茶饮配方', '四季养生'],
    tags: ['茶饮', '四季', '配方'],
    createdAt: '2023-03-05',
    updatedAt: '2023-03-05',
    viewCount: 890,
    transcriptAvailable: true
  },
  {
    id: 'kc003',
    type: 'audio',
    title: '中医养生与现代生活融合',
    description: '探讨如何将中医养生理念融入现代快节奏生活',
    audioUrl: 'https://example.com/audio/tcm-modern-life.mp3',
    thumbnailUrl: 'https://example.com/thumbnails/tcm-modern-life.jpg',
    duration: 1800, // 音频时长（秒）
    host: '赵主播',
    categories: ['生活养生', '中医现代化'],
    tags: ['现代生活', '养生理念', '健康习惯'],
    createdAt: '2023-04-20',
    updatedAt: '2023-04-20',
    listensCount: 650,
    transcriptAvailable: false
  },
  {
    id: 'kc004',
    type: 'article',
    title: '常见中药材的功效与应用',
    description: '介绍日常生活中常见中药材的功效和适用场景',
    content: '中药材是中医药学的物质基础，常见的中药材如人参、枸杞、黄芪等各有特定功效。人参性微温，味甘微苦，归脾、肺经，具有大补元气、复脉固脱、补脾益肺、生津安神等功效...',
    author: '陈医师',
    categories: ['中药学', '药材功效'],
    tags: ['中药', '功效', '应用'],
    createdAt: '2023-02-18',
    updatedAt: '2023-02-18',
    readTime: 15, // 阅读时间（分钟）
    viewCount: 980,
    imageUrl: 'https://example.com/images/herbs.jpg'
  },
  {
    id: 'kc005',
    type: 'video',
    title: '奶茶茶底选择与功效',
    description: '详解不同茶底的特点及其在奶茶中的应用和功效',
    videoUrl: 'https://example.com/videos/tea-base.mp4',
    thumbnailUrl: 'https://example.com/thumbnails/tea-base.jpg',
    duration: 900, // 视频时长（秒）
    instructor: '刘老师',
    categories: ['茶饮基础', '奶茶制作'],
    tags: ['茶底', '奶茶', '功效'],
    createdAt: '2023-05-12',
    updatedAt: '2023-05-15',
    viewCount: 1500,
    transcriptAvailable: true
  }
];

/**
 * Get all knowledge content with optional filtering
 */
router.get('/', (req, res) => {
  try {
    const { type, category, tag, search, limit = 20, offset = 0 } = req.query;
    
    // Apply filters
    let filteredContent = [...knowledgeContent];
    
    if (type) {
      filteredContent = filteredContent.filter(item => item.type === type);
    }
    
    if (category) {
      filteredContent = filteredContent.filter(item => 
        item.categories.includes(category)
      );
    }
    
    if (tag) {
      filteredContent = filteredContent.filter(item => 
        item.tags.includes(tag)
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredContent = filteredContent.filter(item => 
        item.title.toLowerCase().includes(searchLower) || 
        item.description.toLowerCase().includes(searchLower)
      );
    }
    
    // Pagination
    const totalCount = filteredContent.length;
    const paginatedContent = filteredContent.slice(offset, offset + limit);
    
    return res.status(200).json({
      totalCount,
      offset: parseInt(offset),
      limit: parseInt(limit),
      items: paginatedContent
    });
  } catch (error) {
    console.error('Get knowledge content error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve knowledge content', 
      error: error.message 
    });
  }
});

/**
 * Get knowledge content by ID
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const content = knowledgeContent.find(item => item.id === id);
    
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    // In a real implementation, increment view/listen count here
    
    return res.status(200).json(content);
  } catch (error) {
    console.error('Get knowledge content by ID error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve content', 
      error: error.message 
    });
  }
});

/**
 * Get available categories
 */
router.get('/meta/categories', (req, res) => {
  try {
    // Extract unique categories
    const categories = new Set();
    knowledgeContent.forEach(item => {
      item.categories.forEach(category => categories.add(category));
    });
    
    return res.status(200).json(Array.from(categories));
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve categories', 
      error: error.message 
    });
  }
});

/**
 * Get available tags
 */
router.get('/meta/tags', (req, res) => {
  try {
    // Extract unique tags
    const tags = new Set();
    knowledgeContent.forEach(item => {
      item.tags.forEach(tag => tags.add(tag));
    });
    
    return res.status(200).json(Array.from(tags));
  } catch (error) {
    console.error('Get tags error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve tags', 
      error: error.message 
    });
  }
});

/**
 * Get content to cache offline
 * Returns a small subset of important content for offline access
 */
router.get('/offline/essential', (req, res) => {
  try {
    // Get only articles (smaller size) with high view counts
    const essentialContent = knowledgeContent
      .filter(item => item.type === 'article')
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5); // Top 5 most viewed articles
    
    return res.status(200).json({
      lastUpdated: new Date(),
      items: essentialContent
    });
  } catch (error) {
    console.error('Get offline content error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve offline content', 
      error: error.message 
    });
  }
});

module.exports = router; 