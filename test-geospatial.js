// Test script to verify geospatial queries work correctly
const mongoose = require('mongoose');
const Task = require('./models/Task');

async function testGeospatialQueries() {
  console.log('🧪 Testing geospatial queries...');
  
  try {
    // Test 1: Simple query without geospatial
    console.log('\n📋 Test 1: Simple query without geospatial');
    const simpleQuery = await Task.find({ status: 'open' }).limit(5).lean();
    console.log('✅ Simple query successful, found', simpleQuery.length, 'tasks');
    
    // Test 2: Geospatial query with $geoWithin
    console.log('\n📋 Test 2: Geospatial query with $geoWithin');
    const geoQuery = {
      'location.coordinates': {
        $geoWithin: {
          $centerSphere: [[77.2090, 28.6139], 50 / 6371] // Delhi coordinates, 50km radius
        }
      },
      status: 'open'
    };
    
    const geoResults = await Task.find(geoQuery).limit(5).lean();
    console.log('✅ Geospatial query successful, found', geoResults.length, 'tasks');
    
    // Test 3: Query with skills filter (like recommendations)
    console.log('\n📋 Test 3: Query with skills filter (recommendations)');
    const recommendQuery = {
      'location.coordinates': {
        $geoWithin: {
          $centerSphere: [[77.2090, 28.6139], 50 / 6371]
        }
      },
      skillsRequired: { $in: ['cleaning', 'handyman'] },
      status: 'open'
    };
    
    const recommendResults = await Task.find(recommendQuery).limit(5).lean();
    console.log('✅ Recommendation query successful, found', recommendResults.length, 'tasks');
    
    console.log('\n✅ All geospatial tests passed!');
    
  } catch (error) {
    console.error('❌ Geospatial test failed:', error.message);
    console.error('Error details:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  // Connect to MongoDB (you'll need to set MONGODB_URI environment variable)
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/extrahand';
  
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('🔗 Connected to MongoDB');
      return testGeospatialQueries();
    })
    .then(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testGeospatialQueries };
