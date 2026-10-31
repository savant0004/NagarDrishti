import 'dotenv/config';
import mongoose from 'mongoose';
import { UserModel } from '../models/User';
import { store } from '../services/store';
import { createStaffUser } from '../services/authService';

async function createAdmin() {
  if (process.env.DEMO_MODE !== 'false') throw new Error('Refusing to create a live administrator: set DEMO_MODE=false explicitly.');
  const uri = process.env.MONGODB_URI?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'NagarDrishti Administrator';
  if (!uri || !email || !password || password.length < 12) throw new Error('Set MONGODB_URI, ADMIN_EMAIL, and ADMIN_PASSWORD (at least 12 characters).');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    const existing = await UserModel.findOne({ email });
    if (existing) throw new Error('An account with this email already exists; no account was changed.');
    store.setDatabaseState('connected');
    await createStaffUser(name, email, password, 'admin');
    console.log(`Created administrator account for ${email}.`);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Administrator provisioning failed.');
  process.exitCode = 1;
});
