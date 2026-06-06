const bcrypt = require('bcryptjs');
const db = require('../models');

const seedDatabase = async () => {
  try {
    console.log('Starting Base Database Seeding...');
    
    // Initialize DB connection
    await db.sequelize.init();

    // Sync database (recreate tables)
    await db.sequelize.sync({ force: true });
    console.log('Database schemas cleared and recreated.');

    // Create Users
    console.log('Creating base users...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    await db.User.create({
      name: 'System Admin',
      email: 'admin@vendorbridge.com',
      password: passwordHash,
      role: 'admin',
      status: 'active'
    });

    await db.User.create({
      name: 'Sarah Jenkins (Procurement)',
      email: 'procurement@vendorbridge.com',
      password: passwordHash,
      role: 'procurement',
      status: 'active'
    });

    await db.User.create({
      name: 'Robert Davis (Finance Director)',
      email: 'manager@vendorbridge.com',
      password: passwordHash,
      role: 'manager',
      status: 'active'
    });

    await db.User.create({
      name: 'Acme Hardware Supplies',
      email: 'acme@vendorbridge.com',
      password: passwordHash,
      role: 'vendor',
      status: 'active'
    });

    console.log('Base users created.');
    console.log('============================================');
    console.log('  Base Seeding Completed Successfully!  ');
    console.log('============================================');
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
