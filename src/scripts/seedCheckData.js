import mongoose from 'mongoose';
import Check from '../models/Check.js';
import Monitor from '../models/Monitor.js';
import User from '../models/User.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/uptime-monitor');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Generate sample check data for existing monitors
const seedCheckData = async () => {
  try {
    console.log('Starting to seed check data...');
    
    // Get all active monitors
    const monitors = await Monitor.find({ status: 'active' });
    console.log(`Found ${monitors.length} active monitors`);
    
    if (monitors.length === 0) {
      console.log('No active monitors found. Please create some monitors first.');
      return;
    }
    
    for (const monitor of monitors) {
      console.log(`Seeding data for monitor: ${monitor.name}`);
      
      // Generate check data for the last 7 days
      const now = new Date();
      const checks = [];
      
      for (let i = 0; i < 7 * 24; i++) { // 7 days * 24 hours
        const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000)); // Each hour
        
        // Generate realistic response times with some variation
        const baseResponseTime = 200 + Math.random() * 300; // 200-500ms base
        const responseTime = Math.max(50, baseResponseTime + (Math.random() - 0.5) * 100);
        
        // 95% uptime simulation
        const isUp = Math.random() > 0.05;
        const status = isUp ? 'up' : 'down';
        const statusCode = isUp ? 200 : (Math.random() > 0.5 ? 500 : 404);
        
        checks.push({
          monitor: monitor._id,
          user: monitor.user,
          timestamp,
          status,
          responseTime: Math.round(responseTime),
          statusCode,
          error: status === 'down' ? 'Simulated error for testing' : null,
          region: 'default',
          metrics: {
            dnsLookupTime: Math.round(Math.random() * 50),
            tcpConnectTime: Math.round(Math.random() * 100),
            sslHandshakeTime: Math.round(Math.random() * 200),
            timeToFirstByte: Math.round(responseTime * 0.3),
            contentLength: Math.round(Math.random() * 10000) + 1000
          }
        });
      }
      
      // Insert checks in batches
      const batchSize = 50;
      for (let i = 0; i < checks.length; i += batchSize) {
        const batch = checks.slice(i, i + batchSize);
        await Check.insertMany(batch);
      }
      
      console.log(`Inserted ${checks.length} check records for ${monitor.name}`);
    }
    
    console.log('Check data seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding check data:', error);
  }
};

// Clean up existing check data
const cleanupCheckData = async () => {
  try {
    console.log('Cleaning up existing check data...');
    const result = await Check.deleteMany({});
    console.log(`Deleted ${result.deletedCount} existing check records`);
  } catch (error) {
    console.error('Error cleaning up check data:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--cleanup')) {
    await cleanupCheckData();
  }
  
  await seedCheckData();
  
  process.exit(0);
};

// Run the script
main().catch(console.error);
