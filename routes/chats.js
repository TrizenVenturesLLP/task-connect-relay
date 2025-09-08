const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Profile = require('../models/Profile');
const logger = require('../config/logger');

// Get all chats for the current user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Find all chats where the user is a participant
    const chats = await Chat.find({ 
      participants: userId,
      isActive: true 
    })
    .sort({ 'lastMessage.timestamp': -1 });
    
    // Enrich chat data with participant information
    const enrichedChats = await Promise.all(
      chats.map(async (chat) => {
        const otherParticipantId = chat.participants.find(p => p !== userId);
        
        // Get other participant's profile
        let otherParticipant = null;
        if (otherParticipantId) {
          otherParticipant = await Profile.findOne({ uid: otherParticipantId }).lean();
        }
        
        return {
          _id: chat._id,
          chatId: chat.chatId,
          participants: chat.participants,
          lastMessage: chat.lastMessage,
          isActive: chat.isActive,
          relatedTask: chat.relatedTask,
          relatedApplication: chat.relatedApplication,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          otherParticipant: otherParticipant ? {
            uid: otherParticipant.uid,
            name: otherParticipant.name,
            roles: otherParticipant.roles,
            userType: otherParticipant.userType
          } : null,
          unreadCount: chat.unreadCounts.get(userId) || 0
        };
      })
    );
    
    res.json({
      success: true,
      chats: enrichedChats
    });
    
  } catch (error) {
    logger.error('Error fetching chats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chats'
    });
  }
});

// Get or create a chat with another user
router.post('/start', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { otherUserId, relatedTask, relatedApplication } = req.body;
    
    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        error: 'Other user ID is required'
      });
    }
    
    if (userId === otherUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot start chat with yourself'
      });
    }
    
    // Verify both users exist
    const [currentUser, otherUser] = await Promise.all([
      Profile.findOne({ uid: userId }),
      Profile.findOne({ uid: otherUserId })
    ]);
    
    if (!currentUser || !otherUser) {
      return res.status(404).json({
        success: false,
        error: 'One or both users not found'
      });
    }
    
    // Find or create chat
    const chat = await Chat.findOrCreateChat(
      userId, 
      otherUserId, 
      relatedTask, 
      relatedApplication
    );
    
    // Get other participant's profile
    const otherParticipant = {
      uid: otherUser.uid,
      name: otherUser.name,
      roles: otherUser.roles,
      userType: otherUser.userType
    };
    
    res.json({
      success: true,
      chat: {
        ...chat.toObject(),
        otherParticipant,
        unreadCount: chat.unreadCounts.get(userId) || 0
      }
    });
    
  } catch (error) {
    logger.error('Error starting chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start chat'
    });
  }
});

// Get messages for a specific chat
router.get('/:chatId/messages', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Verify user is participant in this chat
    const chat = await Chat.findOne({ 
      chatId, 
      participants: userId 
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found or access denied'
      });
    }
    
    // Get messages with pagination
    const messages = await Message.getChatMessages(
      chatId, 
      parseInt(page), 
      parseInt(limit)
    );
    
    // Mark messages as read
    await Message.markAsRead(chatId, userId);
    chat.unreadCounts.set(userId, 0);
    await chat.save();
    
    res.json({
      success: true,
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      }
    });
    
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// Send a message
router.post('/:chatId/messages', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { chatId } = req.params;
    const { text, type = 'text', replyTo } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message text is required'
      });
    }
    
    // Verify user is participant in this chat
    const chat = await Chat.findOne({ 
      chatId, 
      participants: userId 
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found or access denied'
      });
    }
    
    // Create new message
    const message = new Message({
      chatId,
      text: text.trim(),
      senderId: userId,
      type,
      replyTo
    });
    
    await message.save();
    
    // Update chat's last message
    chat.lastMessage = {
      text: text.trim(),
      senderId: userId,
      timestamp: new Date()
    };
    
    // Increment unread count for other participants
    for (const participantId of chat.participants) {
      if (participantId !== userId) {
        const currentCount = chat.unreadCounts.get(participantId) || 0;
        chat.unreadCounts.set(participantId, currentCount + 1);
      }
    }
    
    await chat.save();
    
    // Get sender's profile for response
    const senderProfile = await Profile.findOne({ uid: userId }).lean();
    
    res.json({
      success: true,
      message: {
        ...message.toObject(),
        sender: senderProfile ? {
          uid: senderProfile.uid,
          name: senderProfile.name,
          roles: senderProfile.roles
        } : null
      }
    });
    
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

// Mark chat as read
router.post('/:chatId/read', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { chatId } = req.params;
    
    // Verify user is participant in this chat
    const chat = await Chat.findOne({ 
      chatId, 
      participants: userId 
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found or access denied'
      });
    }
    
    // Mark messages as read
    await Message.markAsRead(chatId, userId);
    chat.unreadCounts.set(userId, 0);
    await chat.save();
    
    res.json({
      success: true,
      message: 'Chat marked as read'
    });
    
  } catch (error) {
    logger.error('Error marking chat as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark chat as read'
    });
  }
});

// Get chat details
router.get('/:chatId', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { chatId } = req.params;
    
    // Verify user is participant in this chat
    const chat = await Chat.findOne({ 
      chatId, 
      participants: userId 
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found or access denied'
      });
    }
    
    // Get other participant's profile
    const otherParticipantId = chat.participants.find(p => p !== userId);
    let otherParticipant = null;
    
    if (otherParticipantId) {
      otherParticipant = await Profile.findOne({ uid: otherParticipantId }).lean();
    }
    
    res.json({
      success: true,
      chat: {
        _id: chat._id,
        chatId: chat.chatId,
        participants: chat.participants,
        lastMessage: chat.lastMessage,
        isActive: chat.isActive,
        relatedTask: chat.relatedTask,
        relatedApplication: chat.relatedApplication,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        otherParticipant: otherParticipant ? {
          uid: otherParticipant.uid,
          name: otherParticipant.name,
          roles: otherParticipant.roles,
          userType: otherParticipant.userType
        } : null,
        unreadCount: chat.unreadCounts.get(userId) || 0
      }
    });
    
  } catch (error) {
    logger.error('Error fetching chat details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat details'
    });
  }
});

module.exports = router;
