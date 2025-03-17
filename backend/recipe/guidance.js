/**
 * Recipe & DIY Guidance Service
 * Provides detailed recipe information and step-by-step instructions
 */

const express = require('express');
const router = express.Router();

// Mock recipe database for initial setup
const recipes = [
  {
    id: 'rp001',
    name: '养生红枣枸杞奶茶',
    description: '滋补养血，补气安神的经典配方',
    type: 'warm',
    difficulty: 'easy',
    prepTime: 10,
    totalTime: 15,
    servings: 2,
    calories: 180,
    imageUrl: 'https://example.com/images/red-date-goji.jpg',
    ingredients: [
      {
        name: '红枣',
        amount: '6-8',
        unit: '颗',
        notes: '去核'
      },
      {
        name: '枸杞',
        amount: '10-15',
        unit: '粒',
        notes: '洗净'
      },
      {
        name: '红茶包',
        amount: '1',
        unit: '包',
        notes: '优质红茶'
      },
      {
        name: '牛奶',
        amount: '200',
        unit: '毫升',
        notes: '全脂或低脂均可'
      },
      {
        name: '冰糖',
        amount: '15',
        unit: '克',
        notes: '可根据口味调整'
      }
    ],
    steps: [
      {
        step: 1,
        description: '将红枣洗净，去核，切小块',
        imageUrl: 'https://example.com/images/steps/red-date-cut.jpg'
      },
      {
        step: 2,
        description: '将红枣、枸杞与500毫升水一同放入小锅中，大火煮沸后转小火煮10分钟',
        imageUrl: 'https://example.com/images/steps/red-date-boil.jpg'
      },
      {
        step: 3,
        description: '加入红茶包，焖2-3分钟后取出茶包',
        imageUrl: 'https://example.com/images/steps/tea-steep.jpg'
      },
      {
        step: 4,
        description: '加入冰糖，搅拌至完全溶解',
        imageUrl: 'https://example.com/images/steps/add-sugar.jpg'
      },
      {
        step: 5,
        description: '最后加入牛奶，小火加热但不要煮沸，即可倒出享用',
        imageUrl: 'https://example.com/images/steps/add-milk.jpg'
      }
    ],
    tips: [
      '可以在冲泡过程中加入一小块姜片，增加温热效果',
      '糖尿病患者可以减少或不加冰糖',
      '如需增强滋补效果，可加入少量桂圆'
    ],
    nutritionFacts: {
      calories: 180,
      protein: 5,
      fat: 4,
      carbohydrates: 32,
      sugar: 28,
      fiber: 1
    },
    benefits: [
      '补气养血',
      '改善睡眠',
      '提高免疫力'
    ],
    cautions: [
      '脾胃虚寒者慎用',
      '糖尿病患者应控制糖分摄入'
    ],
    suitableFor: ['气虚质', '血虚质', '平和质'],
    bestSeason: 'autumn-winter',
    tags: ['养生', '红枣', '枸杞', '奶茶']
  },
  {
    id: 'rp002',
    name: '清新绿茶薄荷奶茶',
    description: '清热解暑，提神醒脑的夏季饮品',
    type: 'cold',
    difficulty: 'easy',
    prepTime: 8,
    totalTime: 15,
    servings: 2,
    calories: 150,
    imageUrl: 'https://example.com/images/mint-green-tea.jpg',
    ingredients: [
      {
        name: '绿茶包',
        amount: '1',
        unit: '包',
        notes: '优质绿茶'
      },
      {
        name: '新鲜薄荷叶',
        amount: '10-12',
        unit: '片',
        notes: '洗净'
      },
      {
        name: '牛奶',
        amount: '200',
        unit: '毫升',
        notes: '全脂或低脂均可'
      },
      {
        name: '蜂蜜',
        amount: '2',
        unit: '茶匙',
        notes: '可根据口味调整'
      },
      {
        name: '柠檬',
        amount: '1/4',
        unit: '个',
        notes: '切片'
      },
      {
        name: '冰块',
        amount: '适量',
        unit: '',
        notes: '根据需要'
      }
    ],
    steps: [
      {
        step: 1,
        description: '将绿茶包放入500毫升热水中，浸泡3分钟后取出',
        imageUrl: 'https://example.com/images/steps/green-tea-steep.jpg'
      },
      {
        step: 2,
        description: '加入洗净的薄荷叶，继续浸泡2分钟',
        imageUrl: 'https://example.com/images/steps/add-mint.jpg'
      },
      {
        step: 3,
        description: '加入蜂蜜，搅拌均匀',
        imageUrl: 'https://example.com/images/steps/add-honey.jpg'
      },
      {
        step: 4,
        description: '将茶汁放入冰箱冷却',
        imageUrl: 'https://example.com/images/steps/chill-tea.jpg'
      },
      {
        step: 5,
        description: '取出冷却后的茶汁，加入牛奶和柠檬片，搅拌均匀',
        imageUrl: 'https://example.com/images/steps/add-milk-lemon.jpg'
      },
      {
        step: 6,
        description: '加入冰块即可享用',
        imageUrl: 'https://example.com/images/steps/add-ice.jpg'
      }
    ],
    tips: [
      '可以根据个人口味调整薄荷叶的用量',
      '柠檬与牛奶同时加入可能会使牛奶凝固，可以尝试减少柠檬量或分开添加',
      '如果喜欢更浓郁的奶味，可以增加牛奶比例'
    ],
    nutritionFacts: {
      calories: 150,
      protein: 4,
      fat: 3,
      carbohydrates: 27,
      sugar: 24,
      fiber: 0
    },
    benefits: [
      '清热解暑',
      '提神醒脑',
      '改善消化'
    ],
    cautions: [
      '胃寒体质者慎用',
      '孕妇应适量饮用'
    ],
    suitableFor: ['湿热质', '气郁质', '平和质'],
    bestSeason: 'summer',
    tags: ['清凉', '薄荷', '绿茶', '奶茶']
  },
  {
    id: 'rp003',
    name: '暖心姜茶奶茶',
    description: '温阳驱寒，促进血液循环的冬季饮品',
    type: 'hot',
    difficulty: 'medium',
    prepTime: 10,
    totalTime: 20,
    servings: 2,
    calories: 200,
    imageUrl: 'https://example.com/images/ginger-tea.jpg',
    ingredients: [
      {
        name: '红茶包',
        amount: '1',
        unit: '包',
        notes: '优质红茶'
      },
      {
        name: '生姜',
        amount: '15',
        unit: '克',
        notes: '切片'
      },
      {
        name: '牛奶',
        amount: '250',
        unit: '毫升',
        notes: '全脂或低脂均可'
      },
      {
        name: '红糖',
        amount: '20',
        unit: '克',
        notes: '可根据口味调整'
      },
      {
        name: '肉桂粉',
        amount: '1/4',
        unit: '茶匙',
        notes: '可选'
      }
    ],
    steps: [
      {
        step: 1,
        description: '生姜洗净，切成薄片',
        imageUrl: 'https://example.com/images/steps/slice-ginger.jpg'
      },
      {
        step: 2,
        description: '将姜片与500毫升水一同放入小锅中，大火煮沸后转小火煮5分钟',
        imageUrl: 'https://example.com/images/steps/boil-ginger.jpg'
      },
      {
        step: 3,
        description: '加入红茶包，焖3分钟后取出茶包',
        imageUrl: 'https://example.com/images/steps/add-tea.jpg'
      },
      {
        step: 4,
        description: '加入红糖，搅拌至完全溶解',
        imageUrl: 'https://example.com/images/steps/add-brown-sugar.jpg'
      },
      {
        step: 5,
        description: '加入牛奶，小火加热但不要煮沸',
        imageUrl: 'https://example.com/images/steps/add-milk-ginger.jpg'
      },
      {
        step: 6,
        description: '倒入杯中，撒上少量肉桂粉即可享用',
        imageUrl: 'https://example.com/images/steps/sprinkle-cinnamon.jpg'
      }
    ],
    tips: [
      '姜的用量可以根据个人口味和体质调整',
      '不喜欢姜味太浓的可以减少煮姜的时间',
      '饭后饮用效果更佳'
    ],
    nutritionFacts: {
      calories: 200,
      protein: 5,
      fat: 5,
      carbohydrates: 35,
      sugar: 30,
      fiber: 0
    },
    benefits: [
      '温阳驱寒',
      '促进血液循环',
      '缓解关节不适'
    ],
    cautions: [
      '阴虚火旺者慎用',
      '胃炎患者应适量饮用'
    ],
    suitableFor: ['阳虚质', '气虚质', '平和质'],
    bestSeason: 'winter',
    tags: ['温热', '姜茶', '红茶', '奶茶']
  }
];

/**
 * Get all recipes with optional filtering
 */
router.get('/', (req, res) => {
  try {
    const { type, season, difficulty, tag, search, limit = 20, offset = 0 } = req.query;
    
    // Apply filters
    let filteredRecipes = [...recipes];
    
    if (type) {
      filteredRecipes = filteredRecipes.filter(recipe => recipe.type === type);
    }
    
    if (season) {
      filteredRecipes = filteredRecipes.filter(recipe => 
        recipe.bestSeason === season || recipe.bestSeason === 'all'
      );
    }
    
    if (difficulty) {
      filteredRecipes = filteredRecipes.filter(recipe => recipe.difficulty === difficulty);
    }
    
    if (tag) {
      filteredRecipes = filteredRecipes.filter(recipe => 
        recipe.tags.includes(tag)
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRecipes = filteredRecipes.filter(recipe => 
        recipe.name.toLowerCase().includes(searchLower) || 
        recipe.description.toLowerCase().includes(searchLower) ||
        recipe.ingredients.some(ing => ing.name.toLowerCase().includes(searchLower))
      );
    }
    
    // Pagination
    const totalCount = filteredRecipes.length;
    const paginatedRecipes = filteredRecipes.slice(offset, offset + limit);
    
    // Return summary info only for listing
    const recipeSummaries = paginatedRecipes.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      type: recipe.type,
      difficulty: recipe.difficulty,
      prepTime: recipe.prepTime,
      totalTime: recipe.totalTime,
      calories: recipe.calories,
      imageUrl: recipe.imageUrl,
      benefits: recipe.benefits,
      tags: recipe.tags,
      suitableFor: recipe.suitableFor,
      bestSeason: recipe.bestSeason
    }));
    
    return res.status(200).json({
      totalCount,
      offset: parseInt(offset),
      limit: parseInt(limit),
      items: recipeSummaries
    });
  } catch (error) {
    console.error('Get recipes error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve recipes', 
      error: error.message 
    });
  }
});

/**
 * Get recipe by ID
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const recipe = recipes.find(r => r.id === id);
    
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    
    return res.status(200).json(recipe);
  } catch (error) {
    console.error('Get recipe by ID error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve recipe', 
      error: error.message 
    });
  }
});

/**
 * Get personalized recipe recommendations based on TCM constitution
 */
router.post('/personalized', (req, res) => {
  try {
    const { tcmConstitution, season, allergens = [] } = req.body;
    
    if (!tcmConstitution) {
      return res.status(400).json({ 
        message: 'TCM constitution is required for personalized recommendations' 
      });
    }
    
    // Filter recipes suitable for the user's constitution and season
    let suitableRecipes = recipes.filter(recipe => 
      recipe.suitableFor.includes(tcmConstitution) &&
      (season ? recipe.bestSeason === season || recipe.bestSeason.includes(season) || recipe.bestSeason === 'all' : true)
    );
    
    // Filter out recipes with allergens
    if (allergens.length > 0) {
      suitableRecipes = suitableRecipes.filter(recipe => {
        // Check if any ingredient contains an allergen
        return !recipe.ingredients.some(ingredient => 
          allergens.some(allergen => 
            ingredient.name.toLowerCase().includes(allergen.toLowerCase())
          )
        );
      });
    }
    
    // Sort by relevance (in a real implementation, this would use more sophisticated logic)
    suitableRecipes.sort((a, b) => {
      // Prioritize recipes that are exactly for the current season
      if (season) {
        if (a.bestSeason === season && b.bestSeason !== season) return -1;
        if (a.bestSeason !== season && b.bestSeason === season) return 1;
      }
      return 0;
    });
    
    // Return summary info only
    const recipeSummaries = suitableRecipes.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      type: recipe.type,
      difficulty: recipe.difficulty,
      calories: recipe.calories,
      imageUrl: recipe.imageUrl,
      benefits: recipe.benefits,
      tags: recipe.tags
    }));
    
    return res.status(200).json({
      count: recipeSummaries.length,
      items: recipeSummaries
    });
  } catch (error) {
    console.error('Personalized recipe error:', error);
    return res.status(500).json({ 
      message: 'Failed to get personalized recipes', 
      error: error.message 
    });
  }
});

/**
 * Get offline recipe pack (essential recipes for offline use)
 */
router.get('/offline/essentials', (req, res) => {
  try {
    // Select one recipe of each type for offline use
    const offlineRecipes = [];
    
    // Get one warm recipe
    const warmRecipe = recipes.find(r => r.type === 'warm');
    if (warmRecipe) offlineRecipes.push(warmRecipe);
    
    // Get one cold recipe
    const coldRecipe = recipes.find(r => r.type === 'cold');
    if (coldRecipe) offlineRecipes.push(coldRecipe);
    
    // Get one hot recipe
    const hotRecipe = recipes.find(r => r.type === 'hot');
    if (hotRecipe) offlineRecipes.push(hotRecipe);
    
    return res.status(200).json({
      lastUpdated: new Date(),
      count: offlineRecipes.length,
      items: offlineRecipes
    });
  } catch (error) {
    console.error('Offline recipes error:', error);
    return res.status(500).json({ 
      message: 'Failed to get offline recipes', 
      error: error.message 
    });
  }
});

module.exports = router; 