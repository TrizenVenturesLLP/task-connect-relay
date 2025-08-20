const mongoose = require('mongoose');
const Task = require('./models/Task');
const Profile = require('./models/Profile');
require('dotenv').config();

// Sample tasks data
const sampleTasks = [
  {
    creatorUid: 'sample-user-1',
    type: 'Home Services',
    title: 'Replace a kitchen tap',
    description: 'Need to replace a leaking kitchen tap. The new tap is already purchased and available. Basic plumbing skills required.',
    location: {
      type: 'Point',
      coordinates: [78.4867, 17.3850], // Hyderabad coordinates
      address: 'Hyderabad, India',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India'
    },
    preferredTime: {
      flexible: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    },
    budget: {
      amount: 249,
      currency: 'INR',
      negotiable: true
    },
    skillsRequired: ['plumbing', 'repair'],
    priority: 'medium',
    isUrgent: false,
    status: 'open',
    views: 5,
    applications: 2
  },
  {
    creatorUid: 'sample-user-2',
    type: 'Cleaning',
    title: 'Home Deep Cleaning',
    description: 'Deep cleaning required for 3BHK apartment. All rooms, kitchen, and bathrooms need thorough cleaning. Professional cleaning equipment preferred.',
    location: {
      type: 'Point',
      coordinates: [78.4867, 17.3850], // Hyderabad coordinates
      address: 'Basheerbagh, India',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India'
    },
    preferredTime: {
      flexible: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
    },
    budget: {
      amount: 560,
      currency: 'INR',
      negotiable: false
    },
    skillsRequired: ['cleaning', 'housekeeping'],
    priority: 'high',
    isUrgent: true,
    status: 'open',
    views: 12,
    applications: 5
  },
  {
    creatorUid: 'sample-user-3',
    type: 'Cleaning',
    title: 'Sofa & Carpet Cleaning',
    description: 'Professional cleaning needed for 3-seater sofa and large carpet in living room. Must use proper cleaning solutions and equipment.',
    location: {
      type: 'Point',
      coordinates: [78.4867, 17.3850], // Hyderabad coordinates
      address: 'Hyderabad, India',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India'
    },
    preferredTime: {
      flexible: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
    },
    budget: {
      amount: 400,
      currency: 'INR',
      negotiable: true
    },
    skillsRequired: ['cleaning', 'upholstery'],
    priority: 'medium',
    isUrgent: false,
    status: 'open',
    views: 8,
    applications: 3
  },
  {
    creatorUid: 'sample-user-4',
    type: 'Delivery',
    title: 'Grocery Delivery',
    description: 'Need groceries delivered from nearby supermarket. List will be provided. Must be delivered within 2 hours.',
    location: {
      type: 'Point',
      coordinates: [78.4867, 17.3850], // Hyderabad coordinates
      address: 'Hyderabad, India',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India'
    },
    preferredTime: {
      flexible: false,
      startDate: new Date(),
      endDate: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
    },
    budget: {
      amount: 150,
      currency: 'INR',
      negotiable: false
    },
    skillsRequired: ['delivery', 'shopping'],
    priority: 'high',
    isUrgent: true,
    status: 'open',
    views: 15,
    applications: 7
  },
  {
    creatorUid: 'sample-user-5',
    type: 'Handyman',
    title: 'Furniture Assembly',
    description: 'Need help assembling a new bed frame and wardrobe. Instructions are included. Tools will be provided.',
    location: {
      type: 'Point',
      coordinates: [78.4867, 17.3850], // Hyderabad coordinates
      address: 'Hyderabad, India',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India'
    },
    preferredTime: {
      flexible: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
    },
    budget: {
      amount: 300,
      currency: 'INR',
      negotiable: true
    },
    skillsRequired: ['assembly', 'handyman'],
    priority: 'medium',
    isUrgent: false,
    status: 'open',
    views: 6,
    applications: 1
  }
];

// Sample profiles for the task creators
const sampleProfiles = [
  {
    uid: 'sample-user-1',
    name: 'Myint K.',
    email: 'myint@example.com',
    phone: '+91-9876543210',
    roles: ['poster'],
    userType: 'individual',
    skills: ['plumbing', 'electrical'],
    rating: 4.2,
    totalReviews: 8
  },
  {
    uid: 'sample-user-2',
    name: 'Priya M.',
    email: 'priya@example.com',
    phone: '+91-9876543211',
    roles: ['poster'],
    userType: 'individual',
    skills: ['cleaning', 'cooking'],
    rating: 4.5,
    totalReviews: 12
  },
  {
    uid: 'sample-user-3',
    name: 'Kumar R.',
    email: 'kumar@example.com',
    phone: '+91-9876543212',
    roles: ['poster'],
    userType: 'individual',
    skills: ['cleaning', 'maintenance'],
    rating: 4.0,
    totalReviews: 6
  },
  {
    uid: 'sample-user-4',
    name: 'Anita S.',
    email: 'anita@example.com',
    phone: '+91-9876543213',
    roles: ['poster'],
    userType: 'individual',
    skills: ['delivery', 'shopping'],
    rating: 4.3,
    totalReviews: 9
  },
  {
    uid: 'sample-user-5',
    name: 'Rajesh P.',
    email: 'rajesh@example.com',
    phone: '+91-9876543214',
    roles: ['poster'],
    userType: 'individual',
    skills: ['assembly', 'repair'],
    rating: 4.1,
    totalReviews: 5
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.log('❌ MONGODB_URI not set. Please set it in your .env file');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing sample data
    await Task.deleteMany({ creatorUid: { $regex: /^sample-user-/ } });
    await Profile.deleteMany({ uid: { $regex: /^sample-user-/ } });
    console.log('🧹 Cleared existing sample data');

    // Insert sample profiles
    const profiles = await Profile.insertMany(sampleProfiles);
    console.log(`✅ Inserted ${profiles.length} sample profiles`);

    // Insert sample tasks
    const tasks = await Task.insertMany(sampleTasks);
    console.log(`✅ Inserted ${tasks.length} sample tasks`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('📊 Sample data summary:');
    console.log(`   - ${profiles.length} profiles created`);
    console.log(`   - ${tasks.length} tasks created`);
    console.log('🌐 You can now test the frontend with real data');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding function
seedDatabase();
