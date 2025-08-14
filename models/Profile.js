const { Schema, model } = require('mongoose');

const ProfileSchema = new Schema(
  {
    uid: { type: String, index: true, unique: true },
    name: { type: String, required: true },
    roles: { type: [String], index: true, default: ['both'] },
    location: {
      lat: Number,
      lng: Number,
      address: String,
    },
    skills: { type: [String], index: true, default: [] },
    availability: Schema.Types.Mixed,
    phone: String,
    photoURL: String,
    rating: Number,
    createdAt: Number,
    updatedAt: Number,
  },
  { versionKey: false }
);

module.exports = model('Profile', ProfileSchema);

