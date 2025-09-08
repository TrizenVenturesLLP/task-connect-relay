const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  // Unique identifier for the chat conversation
  chatId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Participants in the chat (array of user IDs)
  participants: [{
    type: String, // Firebase UID
    required: true
  }],
  
  // Chat metadata
  lastMessage: {
    text: String,
    senderId: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  
  // Unread message counts for each participant
  unreadCounts: {
    type: Map,
    of: Number,
    default: new Map()
  },
  
  // Chat status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Related task or application (optional)
  relatedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: false
  },
  
  relatedApplication: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskApplication',
    required: false
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
chatSchema.index({ participants: 1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });
chatSchema.index({ relatedTask: 1 });
chatSchema.index({ relatedApplication: 1 });

// Static method to find or create a chat between two users
chatSchema.statics.findOrCreateChat = async function(userId1, userId2, relatedTask = null, relatedApplication = null) {
  // Create a consistent chatId regardless of user order
  const participants = [userId1, userId2].sort();
  const chatId = `chat_${participants.join('_')}`;
  
  let chat = await this.findOne({ chatId });
  
  if (!chat) {
    chat = new this({
      chatId,
      participants,
      relatedTask,
      relatedApplication,
      unreadCounts: new Map([
        [userId1, 0],
        [userId2, 0]
      ])
    });
    
    await chat.save();
  }
  
  return chat;
};

// Method to get chat participants excluding the current user
chatSchema.methods.getOtherParticipant = function(currentUserId) {
  return this.participants.find(participant => participant !== currentUserId);
};

// Method to mark messages as read for a user
chatSchema.methods.markAsRead = function(userId) {
  this.unreadCounts.set(userId, 0);
  return this.save();
};

// Method to increment unread count for a user
chatSchema.methods.incrementUnread = function(userId) {
  const currentCount = this.unreadCounts.get(userId) || 0;
  this.unreadCounts.set(userId, currentCount + 1);
  return this.save();
};

// Update the updatedAt field before saving
chatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Chat', chatSchema);
