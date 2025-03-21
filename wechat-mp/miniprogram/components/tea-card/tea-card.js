Component({
  properties: {
    tea: {
      type: Object,
      value: {}
    },
    loading: {
      type: Boolean,
      value: false
    }
  },
  
  data: {
    defaultImageSrc: '../../assets/images/default-tea.png'
  },
  
  methods: {
    onTapCard: function() {
      if (this.properties.loading || !this.properties.tea.id) {
        return;
      }
      
      const teaId = this.properties.tea.id;
      this.triggerEvent('tap', { teaId });
    },
    
    onImageError: function() {
      const tea = this.properties.tea;
      tea.imageSrc = this.data.defaultImageSrc;
      this.setData({
        tea: tea
      });
    }
  }
}) 