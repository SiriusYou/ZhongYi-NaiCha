const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Notification Schema
const NotificationSchema = new Schema({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'like_post',
      'like_comment',
      'comment_on_post',
      'reply_to_comment',
      'expert_verified_post',
      'expert_comment',
      'post_featured',
      'system_message',
      'expert_verification_status'
    ],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  relatedPost: {
    type: Schema.Types.ObjectId,
    ref: 'Post'
  },
  relatedComment: {
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for faster queries
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema); 