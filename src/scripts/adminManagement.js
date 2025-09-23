import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.connection.close();
  console.log('Database connection closed');
};

// List all users with their roles
const listUsers = async () => {
  try {
    const users = await User.find({}, 'name email role isActive createdAt lastLogin')
      .sort({ createdAt: -1 });

    console.log('\n📋 All Users:');
    console.log('='.repeat(80));
    console.log(`${'Name'.padEnd(20)} ${'Email'.padEnd(30)} ${'Role'.padEnd(8)} ${'Status'.padEnd(8)} ${'Created'}`);
    console.log('-'.repeat(80));

    users.forEach(user => {
      const name = user.name.padEnd(20);
      const email = user.email.padEnd(30);
      const role = user.role.padEnd(8);
      const status = (user.isActive ? 'Active' : 'Inactive').padEnd(8);
      const created = user.createdAt.toISOString().split('T')[0];
      
      console.log(`${name} ${email} ${role} ${status} ${created}`);
    });

    console.log(`\nTotal users: ${users.length}`);
    console.log(`Admins: ${users.filter(u => u.role === 'admin').length}`);
    console.log(`Regular users: ${users.filter(u => u.role === 'user').length}`);
    console.log(`Active users: ${users.filter(u => u.isActive).length}`);

  } catch (error) {
    console.error('Error listing users:', error);
  }
};

// Promote user to admin
const promoteToAdmin = async (email) => {
  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      return;
    }

    if (user.role === 'admin') {
      console.log(`ℹ️  User ${email} is already an admin`);
      return;
    }

    user.role = 'admin';
    await user.save();

    console.log(`✅ Successfully promoted ${email} to admin role`);
    console.log(`User: ${user.name} (${user.email})`);

  } catch (error) {
    console.error('Error promoting user to admin:', error);
  }
};

// Demote admin to user
const demoteToUser = async (email) => {
  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      return;
    }

    if (user.role === 'user') {
      console.log(`ℹ️  User ${email} is already a regular user`);
      return;
    }

    user.role = 'user';
    await user.save();

    console.log(`✅ Successfully demoted ${email} to user role`);
    console.log(`User: ${user.name} (${user.email})`);

  } catch (error) {
    console.error('Error demoting admin to user:', error);
  }
};

// Activate/Deactivate user
const toggleUserStatus = async (email, isActive) => {
  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      return;
    }

    user.isActive = isActive;
    await user.save();

    const status = isActive ? 'activated' : 'deactivated';
    console.log(`✅ Successfully ${status} user ${email}`);
    console.log(`User: ${user.name} (${user.email})`);

  } catch (error) {
    console.error('Error toggling user status:', error);
  }
};

// Show help
const showHelp = () => {
  console.log('\n🔧 Admin Management Script');
  console.log('='.repeat(50));
  console.log('Usage: node adminManagement.js <command> [options]');
  console.log('\nCommands:');
  console.log('  list                    - List all users');
  console.log('  promote <email>         - Promote user to admin');
  console.log('  demote <email>          - Demote admin to user');
  console.log('  activate <email>        - Activate user account');
  console.log('  deactivate <email>      - Deactivate user account');
  console.log('\nExamples:');
  console.log('  node adminManagement.js list');
  console.log('  node adminManagement.js promote admin@example.com');
  console.log('  node adminManagement.js demote admin@example.com');
  console.log('  node adminManagement.js activate user@example.com');
  console.log('  node adminManagement.js deactivate user@example.com');
};

// Main function
const main = async () => {
  const command = process.argv[2];
  const email = process.argv[3];

  if (!command || command === 'help') {
    showHelp();
    return;
  }

  await connectDB();

  switch (command) {
    case 'list':
      await listUsers();
      break;
    
    case 'promote':
      if (!email) {
        console.error('❌ Email is required for promote command');
        showHelp();
        return;
      }
      await promoteToAdmin(email);
      break;
    
    case 'demote':
      if (!email) {
        console.error('❌ Email is required for demote command');
        showHelp();
        return;
      }
      await demoteToUser(email);
      break;
    
    case 'activate':
      if (!email) {
        console.error('❌ Email is required for activate command');
        showHelp();
        return;
      }
      await toggleUserStatus(email, true);
      break;
    
    case 'deactivate':
      if (!email) {
        console.error('❌ Email is required for deactivate command');
        showHelp();
        return;
      }
      await toggleUserStatus(email, false);
      break;
    
    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
  }

  await disconnectDB();
};

// Run the script
main().catch(console.error);
