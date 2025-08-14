const { Schema, model } = require('mongoose');

const TaskSchema = new Schema(
  {
    type: { type: String, required: true },
    description: { type: String, required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: String,
    },
    preferredTime: Schema.Types.Mixed,
    budget: Number,
    skillsRequired: { type: [String], index: true, default: [] },
    status: { type: String, index: true, default: 'open' },
    creatorUid: { type: String, index: true, required: true },
    assigneeUid: { type: String, index: true, default: null },
    proofs: { type: [String], default: [] },
    completionComment: String,
    createdAt: Number,
    updatedAt: Number,
  },
  { versionKey: false }
);

module.exports = model('Task', TaskSchema);

