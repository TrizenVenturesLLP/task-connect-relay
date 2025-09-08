const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Reference to the chat this message belongs to
  chatId: {
    type: String,
    required: true,
    index: true
  },
  
  // Message content
  text: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Sender information
  senderId: {
    type: String, // Firebase UID
    required: true,
    index: true
  },
  
  // Message type
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  
  // Message status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  
  // Read receipts
  readBy: [{
    userId: String,
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Message metadata
  metadata: {
    // For file messages
    fileName: String,
    fileSize: Number,
    fileType: String,
    fileUrl: String,
    
    // For system messages
    systemType: String, // 'task_assigned', 'task_completed', etc.
    
    // Reply to another message
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    }
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

// Indexes for efficient querying
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ status: 1 });

// Static method to get messages for a chat with pagination
messageSchema.statics.getChatMessages = async function(chatId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return await this.find({ chatId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = async function(chatId, userId) {
  return await this.updateMany(
    { 
      chatId, 
      senderId: { $ne: userId },
      'readBy.userId': { $ne: userId }
    },
    { 
      $push: { 
        readBy: { 
          userId, 
          readAt: new Date() 
        } 
      },
      $set: { status: 'read' }
    }
  );
};

// Method to check if message is read by a user
messageSchema.methods.isReadBy = function(userId) {
  return this.readBy.some(read => read.userId === userId);
};

// Method to get read status for a user
messageSchema.methods.getReadStatus = function(userId) {
  if (this.senderId === userId) {
    return this.status;
  }
  
  const readReceipt = this.readBy.find(read => read.userId === userId);
  return readReceipt ? 'read' : 'sent';
};

// Update the updatedAt field before saving
messageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Message', messageSchema);
