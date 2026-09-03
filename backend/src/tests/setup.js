/**
 * Vitest global test setup
 *
 * - Starts an in-memory MongoDB instance before all tests
 * - Clears all collections between each test
 * - Closes the in-memory instance after all tests
 *
 * Using mongodb-memory-server ensures tests never touch the real database.
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';

// Set test environment variables before anything else
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-vitest-only-not-real';
process.env.JWT_EXPIRE = '1h';
process.env.ADMIN_JWT_EXPIRE = '1h';

let mongoServer;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  // Clear all collections between tests for isolation
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  // Tear down cleanly
  await mongoose.connection.close();
  await mongoServer.stop();
});
