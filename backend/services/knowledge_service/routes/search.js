const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const Herb = require('../models/Herb');

// @route   GET api/search
// @desc    Search across all content types
// @access  Public
router.get('/', async (req, res) => {
  try {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const contentType = req.query.type; // 'article', 'herb', or undefined for all
    
    if (!query) {
      return res.status(400).json({ msg: 'Search query is required' });
    }
    
    let results = [];
    let total = 0;
    
    // Search in articles
    if (!contentType || contentType === 'article') {
      const articleQuery = { 
        $text: { $search: query },
        isPublished: true
      };
      
      const articleResults = await Article.find(articleQuery)
        .select('title slug summary imageUrl categories publishedAt')
        .populate('categories', 'name slug')
        .sort({ score: { $meta: 'textScore' } })
        .limit(contentType ? limit : Math.floor(limit / 2))
        .skip(contentType ? skip : 0);
      
      const articleCount = await Article.countDocuments(articleQuery);
      
      results = results.concat(articleResults.map(article => ({
        ...article.toObject(),
        type: 'article'
      })));
      
      total += articleCount;
    }
    
    // Search in herbs
    if (!contentType || contentType === 'herb') {
      const herbQuery = { 
        $text: { $search: query },
        isActive: true
      };
      
      const herbResults = await Herb.find(herbQuery)
        .select('name chineseName latinName slug description imageUrl properties.nature')
        .sort({ score: { $meta: 'textScore' } })
        .limit(contentType ? limit : Math.floor(limit / 2))
        .skip(contentType ? skip : 0);
      
      const herbCount = await Herb.countDocuments(herbQuery);
      
      results = results.concat(herbResults.map(herb => ({
        ...herb.toObject(),
        type: 'herb'
      })));
      
      total += herbCount;
    }
    
    // If searching across all content types, sort by relevance
    if (!contentType) {
      // Since we can't sort across collections with MongoDB's textScore,
      // we'll just interleave the results which are already sorted by relevance
      const interleaved = [];
      const articleResults = results.filter(r => r.type === 'article');
      const herbResults = results.filter(r => r.type === 'herb');
      
      const maxLength = Math.max(articleResults.length, herbResults.length);
      
      for (let i = 0; i < maxLength; i++) {
        if (i < articleResults.length) interleaved.push(articleResults[i]);
        if (i < herbResults.length) interleaved.push(herbResults[i]);
      }
      
      results = interleaved.slice(0, limit);
    }
    
    res.json({
      results,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/search/suggestions
// @desc    Get search suggestions
// @access  Public
router.get('/suggestions', async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }
    
    // Get article title suggestions
    const articleSuggestions = await Article.find({
      title: { $regex: query, $options: 'i' },
      isPublished: true
    })
      .select('title slug')
      .limit(5);
    
    // Get herb name suggestions
    const herbSuggestions = await Herb.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { chineseName: { $regex: query, $options: 'i' } }
      ],
      isActive: true
    })
      .select('name chineseName slug')
      .limit(5);
    
    // Combine and format suggestions
    const suggestions = [
      ...articleSuggestions.map(article => ({
        text: article.title,
        slug: article.slug,
        type: 'article'
      })),
      ...herbSuggestions.map(herb => ({
        text: `${herb.name} (${herb.chineseName})`,
        slug: herb.slug,
        type: 'herb'
      }))
    ];
    
    res.json({ suggestions });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 