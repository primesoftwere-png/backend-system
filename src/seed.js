import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/review');
    console.log('MongoDB Connected for Seeding');

    const username = process.env.SUPERADMIN_USERNAME || 'admin';
    const password = process.env.SUPERADMIN_PASSWORD || 'admin123';
    const email = process.env.SUPERADMIN_EMAIL || 'admin@example.com';

    // Check if the superadmin already exists
    const existingAdmin = await User.findOne({ username });

    if (existingAdmin) {
      console.log('Superadmin already exists. Updating password and email to match .env...');
      existingAdmin.password = password; // Hashed by the pre-save hook
      existingAdmin.email = email;
      await existingAdmin.save();
      console.log('Superadmin updated successfully!');
    } else {
      await User.create({
        username,
        password,
        email,
      });
      console.log('Superadmin created successfully!');
    }

    process.exit();
  } catch (error) {
    console.error(`Error with seeding data: ${error.message}`);
    process.exit(1);
  }
};

seedSuperAdmin();
