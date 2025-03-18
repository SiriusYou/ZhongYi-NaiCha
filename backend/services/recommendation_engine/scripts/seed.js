const mongoose = require('mongoose');
const Content = require('../models/Content');
const UserProfile = require('../models/UserProfile');
const ABTest = require('../models/ABTest');
const config = require('../config');
const { generateSimpleContentVector } = require('../utils/algorithms');

// Sample data for seeding
const sampleContent = require('./data/sampleContent');
const sampleProfiles = require('./data/sampleProfiles');
const sampleTests = require('./data/sampleTests');

// Connect to MongoDB
mongoose.connect(config.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected for seeding'))
.catch(err => {
  console.error('MongoDB Connection Error:', err);
  process.exit(1);
});

// Seed content
async function seedContent() {
  try {
    const count = await Content.countDocuments();
    
    if (count === 0) {
      console.log('Seeding content...');
      
      // Generate content vectors for each content item
      const contentWithVectors = sampleContent.map(content => {
        return {
          ...content,
          contentVector: generateSimpleContentVector(content, { vectorSize: 50 })
        };
      });
      
      await Content.insertMany(contentWithVectors);
      console.log(`${contentWithVectors.length} content items seeded successfully`);
    } else {
      console.log(`Skipping content seeding. ${count} content items already exist.`);
    }
  } catch (error) {
    console.error('Error seeding content:', error);
  }
}

// Seed user profiles
async function seedProfiles() {
  try {
    const count = await UserProfile.countDocuments();
    
    if (count === 0) {
      console.log('Seeding user profiles...');
      await UserProfile.insertMany(sampleProfiles);
      console.log(`${sampleProfiles.length} user profiles seeded successfully`);
    } else {
      console.log(`Skipping profile seeding. ${count} profiles already exist.`);
    }
  } catch (error) {
    console.error('Error seeding profiles:', error);
  }
}

// Seed A/B tests
async function seedABTests() {
  try {
    const count = await ABTest.countDocuments();
    
    if (count === 0) {
      console.log('Seeding A/B tests...');
      await ABTest.insertMany(sampleTests);
      console.log(`${sampleTests.length} A/B tests seeded successfully`);
    } else {
      console.log(`Skipping A/B test seeding. ${count} tests already exist.`);
    }
  } catch (error) {
    console.error('Error seeding A/B tests:', error);
  }
}

// Run all seed functions
async function seedAll() {
  try {
    await seedContent();
    await seedProfiles();
    await seedABTests();
    
    console.log('All seed operations completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

// Create sample data directories and files
const fs = require('fs');
const path = require('path');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Sample content data
const sampleContentData = [
  {
    title: '春季养生: 茶饮调理方案',
    description: '春季是肝气最旺的季节，适当饮用清热解毒的茶饮有助于调理身体。',
    contentType: 'article',
    body: '春季是自然界阳气生发的季节，此时人体的肝气也最为旺盛。根据中医"春养肝"的理念，可以选择一些清热解毒、养肝护肝的茶饮...',
    author: mongoose.Types.ObjectId(),
    authorName: '李医师',
    coverImage: 'https://example.com/images/spring-tea.jpg',
    tags: ['春季', '养生', '茶饮', '肝脏', '清热解毒'],
    categories: ['季节养生', '茶饮调理'],
    difficulty: 'beginner',
    tcmProperties: {
      taste: ['甘', '苦'],
      nature: ['凉'],
      meridians: ['肝经', '胆经'],
      effects: ['清热解毒', '养肝明目'],
      contraindications: ['脾胃虚寒者慎用']
    },
    status: 'published',
    isActive: true,
    isFeatured: true,
    publishedAt: new Date('2023-03-15'),
    seasonalRelevance: ['spring']
  },
  {
    title: '夏季消暑茶: 三款简易配方',
    description: '夏季炎热，适当饮用清热解暑的茶饮可以预防中暑，保持精神愉悦。',
    contentType: 'recipe',
    body: '夏季气温高，人体容易出现口渴、心烦、食欲不振等症状。以下三款消暑茶饮可以帮助清热解暑...',
    author: mongoose.Types.ObjectId(),
    authorName: '王营养师',
    coverImage: 'https://example.com/images/summer-tea.jpg',
    tags: ['夏季', '消暑', '茶饮', '清热', '解暑'],
    categories: ['季节养生', '茶饮配方'],
    difficulty: 'beginner',
    tcmProperties: {
      taste: ['甘', '苦'],
      nature: ['寒', '凉'],
      meridians: ['心经', '肺经'],
      effects: ['清热解暑', '生津止渴'],
      contraindications: ['体质虚寒者慎用']
    },
    recipeProperties: {
      preparationTime: 10,
      cookingTime: 15,
      servings: 4,
      ingredients: [
        { name: '薄荷叶', amount: '10', unit: '克' },
        { name: '菊花', amount: '5', unit: '克' },
        { name: '金银花', amount: '10', unit: '克' },
        { name: '冰糖', amount: '15', unit: '克' }
      ]
    },
    status: 'published',
    isActive: true,
    isFeatured: true,
    publishedAt: new Date('2023-06-20'),
    seasonalRelevance: ['summer']
  },
  {
    title: '秋季润燥: 滋阴养肺茶',
    description: '秋季干燥，适当饮用滋阴润燥的茶饮能帮助滋润肺部，预防干咳。',
    contentType: 'recipe',
    body: '秋季气候干燥，人体容易出现口干舌燥、干咳少痰等症状。以下茶饮配方能有效滋阴润燥...',
    author: mongoose.Types.ObjectId(),
    authorName: '张中医',
    coverImage: 'https://example.com/images/autumn-tea.jpg',
    tags: ['秋季', '润燥', '茶饮', '滋阴', '养肺'],
    categories: ['季节养生', '茶饮配方'],
    difficulty: 'intermediate',
    tcmProperties: {
      taste: ['甘', '酸'],
      nature: ['平', '凉'],
      meridians: ['肺经', '胃经'],
      effects: ['润肺止咳', '滋阴润燥'],
      contraindications: ['痰湿体质者慎用']
    },
    recipeProperties: {
      preparationTime: 15,
      cookingTime: 20,
      servings: 3,
      ingredients: [
        { name: '百合', amount: '15', unit: '克' },
        { name: '沙参', amount: '10', unit: '克' },
        { name: '枸杞', amount: '8', unit: '克' },
        { name: '冰糖', amount: '10', unit: '克' }
      ]
    },
    status: 'published',
    isActive: true,
    publishedAt: new Date('2023-09-15'),
    seasonalRelevance: ['autumn']
  },
  {
    title: '冬季温补: 人参大枣茶',
    description: '冬季寒冷，适当饮用温补类茶饮能提高人体免疫力，抵抗寒邪侵袭。',
    contentType: 'recipe',
    body: '冬季气候寒冷，是养精蓄锐的重要季节。根据中医"冬养肾"的理念，温补类茶饮有助于提高人体免疫力...',
    author: mongoose.Types.ObjectId(),
    authorName: '刘医师',
    coverImage: 'https://example.com/images/winter-tea.jpg',
    tags: ['冬季', '温补', '茶饮', '养肾', '提高免疫力'],
    categories: ['季节养生', '茶饮配方'],
    difficulty: 'intermediate',
    tcmProperties: {
      taste: ['甘', '辛'],
      nature: ['温', '热'],
      meridians: ['肾经', '脾经'],
      effects: ['温补脾肾', '提高免疫力'],
      contraindications: ['阴虚火旺者慎用']
    },
    recipeProperties: {
      preparationTime: 15,
      cookingTime: 30,
      servings: 2,
      ingredients: [
        { name: '人参片', amount: '3', unit: '克' },
        { name: '大枣', amount: '5', unit: '枚' },
        { name: '黄芪', amount: '10', unit: '克' },
        { name: '生姜', amount: '3', unit: '片' }
      ]
    },
    status: 'published',
    isActive: true,
    publishedAt: new Date('2023-12-10'),
    seasonalRelevance: ['winter']
  },
  {
    title: '痰湿体质调理茶',
    description: '痰湿体质的人适合饮用具有化痰祛湿功效的茶饮，能帮助改善体质。',
    contentType: 'recipe',
    body: '痰湿体质的人常见症状有头重、困倦、胸闷等。以下茶饮配方能有效化痰祛湿...',
    author: mongoose.Types.ObjectId(),
    authorName: '赵中医',
    coverImage: 'https://example.com/images/phlegm-tea.jpg',
    tags: ['痰湿体质', '祛湿', '茶饮', '化痰', '体质调理'],
    categories: ['体质调理', '茶饮配方'],
    difficulty: 'intermediate',
    tcmProperties: {
      taste: ['苦', '辛'],
      nature: ['温'],
      meridians: ['脾经', '肺经'],
      effects: ['化痰祛湿', '健脾理气'],
      contraindications: ['阴虚体质者慎用']
    },
    recipeProperties: {
      preparationTime: 10,
      cookingTime: 20,
      servings: 2,
      ingredients: [
        { name: '陈皮', amount: '6', unit: '克' },
        { name: '茯苓', amount: '10', unit: '克' },
        { name: '薏苡仁', amount: '15', unit: '克' },
        { name: '生姜', amount: '3', unit: '片' }
      ]
    },
    status: 'published',
    isActive: true,
    publishedAt: new Date('2023-05-10'),
    seasonalRelevance: ['all']
  }
];

// Sample user profiles data
const sampleProfilesData = [
  {
    userId: mongoose.Types.ObjectId(),
    name: '李明',
    age: 35,
    gender: 'male',
    constitution: '气虚质',
    healthConditions: ['高血压', '失眠'],
    goals: ['提高免疫力', '改善睡眠'],
    dietaryPreferences: ['素食为主'],
    experienceLevel: 'beginner',
    createdAt: new Date('2023-01-15')
  },
  {
    userId: mongoose.Types.ObjectId(),
    name: '王红',
    age: 42,
    gender: 'female',
    constitution: '阴虚质',
    healthConditions: ['口干', '潮热'],
    goals: ['滋阴润燥', '调理内分泌'],
    dietaryPreferences: ['清淡', '少辛辣'],
    experienceLevel: 'intermediate',
    createdAt: new Date('2023-02-20')
  },
  {
    userId: mongoose.Types.ObjectId(),
    name: '张伟',
    age: 28,
    gender: 'male',
    constitution: '痰湿质',
    healthConditions: ['消化不良', '肥胖'],
    goals: ['减肥', '健脾祛湿'],
    dietaryPreferences: ['低糖', '少油腻'],
    experienceLevel: 'beginner',
    createdAt: new Date('2023-03-10')
  }
];

// Sample A/B tests data
const sampleTestsData = [
  {
    name: '推荐算法效果对比',
    description: '测试不同推荐算法对用户参与度的影响',
    variants: [
      {
        name: 'content-based',
        description: '基于内容的推荐算法'
      },
      {
        name: 'collaborative-filtering',
        description: '协同过滤推荐算法'
      },
      {
        name: 'hybrid',
        description: '混合推荐算法'
      }
    ],
    targetUserPercentage: 100,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days later
    isActive: true,
    createdAt: new Date()
  },
  {
    name: '季节性内容权重测试',
    description: '测试增加季节性内容权重对点击率的影响',
    variants: [
      {
        name: 'standard',
        description: '标准权重',
        parameters: { seasonalRelevanceWeight: 0.3 }
      },
      {
        name: 'enhanced',
        description: '增强季节性权重',
        parameters: { seasonalRelevanceWeight: 0.6 }
      }
    ],
    targetUserPercentage: 80,
    startDate: new Date(),
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days later
    isActive: true,
    createdAt: new Date()
  }
];

// Write sample data to files
fs.writeFileSync(
  path.join(dataDir, 'sampleContent.js'), 
  `module.exports = ${JSON.stringify(sampleContentData, null, 2)};`
);

fs.writeFileSync(
  path.join(dataDir, 'sampleProfiles.js'), 
  `module.exports = ${JSON.stringify(sampleProfilesData, null, 2)};`
);

fs.writeFileSync(
  path.join(dataDir, 'sampleTests.js'), 
  `module.exports = ${JSON.stringify(sampleTestsData, null, 2)};`
);

console.log('Sample data files created');

// Run seed process
seedAll(); 