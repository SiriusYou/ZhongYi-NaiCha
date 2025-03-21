// components/icon/icon.js
Component({
  properties: {
    type: {
      type: String,
      value: ''
    },
    size: {
      type: Number,
      value: 24
    },
    color: {
      type: String,
      value: ''
    }
  },
  
  data: {
    icons: {
      like: 'heart',
      comment: 'comment',
      share: 'share-alt',
      write: 'edit',
      image: 'image',
      cancel: 'times-circle'
    }
  }
}); 