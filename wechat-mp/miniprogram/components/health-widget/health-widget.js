Component({
  properties: {
    userConstitution: {
      type: String,
      value: ''
    },
    hasHealthProfile: {
      type: Boolean,
      value: false
    }
  },
  
  data: {
    constitutionDescriptions: {
      'balanced': '平和质 - 体质平衡',
      'qi_deficiency': '气虚质 - 气血不足',
      'yang_deficiency': '阳虚质 - 阳气不足',
      'yin_deficiency': '阴虚质 - 阴液不足',
      'phlegm_dampness': '痰湿质 - 痰湿内阻',
      'damp_heat': '湿热质 - 湿热内蕴',
      'blood_stasis': '血瘀质 - 血行不畅',
      'qi_depression': '气郁质 - 气机郁滞',
      'special': '特禀质 - 特殊体质'
    }
  },
  
  methods: {
    onTapHealthProfile: function() {
      this.triggerEvent('taphealth');
    },
    
    getConstitutionDescription: function() {
      return this.data.constitutionDescriptions[this.properties.userConstitution] || '未知体质';
    }
  }
}) 