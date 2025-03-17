const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Article = require('../models/Article');
const Category = require('../models/Category');

// @route   GET api/articles
// @desc    Get all articles with pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const categoryId = req.query.category;
    const tag = req.query.tag;
    
    // Build query
    const query = { isPublished: true };
    if (categoryId) {
      query.categories = categoryId;
    }
    if (tag) {
      query.tags = tag;
    }
    
    // Get total count for pagination
    const total = await Article.countDocuments(query);
    
    // Get articles
    const articles = await Article.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('categories', 'name slug')
      .select('-content'); // Exclude content for list view
    
    res.json({
      articles,
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

// @route   GET api/articles/:id
// @desc    Get article by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate('categories', 'name slug')
      .populate('relatedArticles', 'title slug imageUrl')
      .populate('relatedHerbs', 'name chineseName slug imageUrl');
    
    if (!article) {
      return res.status(404).json({ msg: 'Article not found' });
    }
    
    // Increment view count
    article.viewCount += 1;
    await article.save();
    
    res.json(article);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Article not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/articles/slug/:slug
// @desc    Get article by slug
// @access  Public
router.get('/slug/:slug', async (req, res) => {
  try {
    const article = await Article.findOne({ 
      slug: req.params.slug,
      isPublished: true 
    })
      .populate('categories', 'name slug')
      .populate('relatedArticles', 'title slug imageUrl')
      .populate('relatedHerbs', 'name chineseName slug imageUrl');
    
    if (!article) {
      return res.status(404).json({ msg: 'Article not found' });
    }
    
    // Increment view count
    article.viewCount += 1;
    await article.save();
    
    res.json(article);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/articles
// @desc    Create an article
// @access  Private (Admin only - will add middleware later)
router.post(
  '/',
  [
    check('title', 'Title is required').not().isEmpty(),
    check('slug', 'Slug is required').not().isEmpty(),
    check('summary', 'Summary is required').not().isEmpty(),
    check('content', 'Content is required').not().isEmpty(),
    check('categories', 'At least one category is required').isArray({ min: 1 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if slug already exists
      const existingArticle = await Article.findOne({ slug: req.body.slug });
      if (existingArticle) {
        return res.status(400).json({ msg: 'Slug already exists' });
      }

      // Validate categories
      const categoryIds = req.body.categories;
      const validCategories = await Category.find({ _id: { $in: categoryIds } });
      if (validCategories.length !== categoryIds.length) {
        return res.status(400).json({ msg: 'One or more categories are invalid' });
      }

      const { 
        title, 
        slug, 
        summary, 
        content, 
        categories,
        author,
        source,
        imageUrl,
        tags,
        relatedArticles,
        relatedHerbs,
        isPublished,
        publishedAt
      } = req.body;

      // Create new article
      const newArticle = new Article({
        title,
        slug,
        summary,
        content,
        categories,
        author,
        source,
        imageUrl,
        tags,
        relatedArticles,
        relatedHerbs,
        isPublished,
        publishedAt: publishedAt || Date.now()
      });

      const article = await newArticle.save();
      res.json(article);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/articles/:id
// @desc    Update an article
// @access  Private (Admin only - will add middleware later)
router.put('/:id', async (req, res) => {
  try {
    // Check if article exists
    let article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ msg: 'Article not found' });
    }

    // Check if slug already exists (if changing slug)
    if (req.body.slug && req.body.slug !== article.slug) {
      const existingArticle = await Article.findOne({ 
        slug: req.body.slug, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingArticle) {
        return res.status(400).json({ msg: 'Slug already exists' });
      }
    }

    // Validate categories if provided
    if (req.body.categories && req.body.categories.length > 0) {
      const categoryIds = req.body.categories;
      const validCategories = await Category.find({ _id: { $in: categoryIds } });
      if (validCategories.length !== categoryIds.length) {
        return res.status(400).json({ msg: 'One or more categories are invalid' });
      }
    }

    // Build article object
    const { 
      title, 
      slug, 
      summary, 
      content, 
      categories,
      author,
      source,
      imageUrl,
      tags,
      relatedArticles,
      relatedHerbs,
      isPublished,
      publishedAt
    } = req.body;

    const articleFields = {};
    if (title) articleFields.title = title;
    if (slug) articleFields.slug = slug;
    if (summary) articleFields.summary = summary;
    if (content) articleFields.content = content;
    if (categories) articleFields.categories = categories;
    if (author) articleFields.author = author;
    if (source !== undefined) articleFields.source = source;
    if (imageUrl !== undefined) articleFields.imageUrl = imageUrl;
    if (tags) articleFields.tags = tags;
    if (relatedArticles) articleFields.relatedArticles = relatedArticles;
    if (relatedHerbs) articleFields.relatedHerbs = relatedHerbs;
    if (isPublished !== undefined) articleFields.isPublished = isPublished;
    if (publishedAt) articleFields.publishedAt = publishedAt;

    // Update article
    article = await Article.findByIdAndUpdate(
      req.params.id,
      { $set: articleFields },
      { new: true }
    );

    res.json(article);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Article not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/articles/:id
// @desc    Delete an article
// @access  Private (Admin only - will add middleware later)
router.delete('/:id', async (req, res) => {
  try {
    // Check if article exists
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ msg: 'Article not found' });
    }

    // Delete article
    await Article.findByIdAndRemove(req.params.id);
    res.json({ msg: 'Article removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Article not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router; 