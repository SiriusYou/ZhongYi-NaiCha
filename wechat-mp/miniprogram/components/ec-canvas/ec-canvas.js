// ec-canvas.js
Component({
  properties: {
    canvasId: {
      type: String,
      value: 'ec-canvas'
    },
    ec: {
      type: Object
    }
  },
  
  data: {
    isCanvasReady: false
  },
  
  methods: {
    init: function (callback) {
      const { canvasId } = this.properties;
      
      const ctx = wx.createCanvasContext(canvasId, this);
      
      if (callback) {
        callback(ctx);
      }
      
      this.setData({
        isCanvasReady: true
      });
    }
  },
  
  ready: function () {
    if (this.properties.ec) {
      this.init(this.properties.ec.onInit);
    }
  }
}); 