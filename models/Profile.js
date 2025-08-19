const { Schema, model } = require('mongoose');

const ProfileSchema = new Schema(
  {
    uid: { type: String, index: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, index: true },
    roles: { type: [String], index: true, default: ['both'] },
    userType: { type: String, enum: ['individual', 'business'], default: 'individual' },
    location: {
      lat: Number,
      lng: Number,
      address: String,
      addressDetails: {
        doorNo: String,
        area: String,
        city: String,
        state: String,
        pinCode: String,
        country: String,
      },
    },
    skills: { type: [String], index: true, default: [] },
    availability: Schema.Types.Mixed,
    phone: String,
    photoURL: String,
    rating: Number,
    agreeUpdates: { type: Boolean, default: false },
    agreeTerms: { type: Boolean, default: false },
    createdAt: Number,
    updatedAt: Number,
  },
  { versionKey: false }
);

module.exports = model('Profile', ProfileSchema);

