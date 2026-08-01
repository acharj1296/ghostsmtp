import mongoose from 'mongoose';
import { SmtpAuthService } from '../services/smtpAuth.service';
import { SmtpCredentialRepository } from '../repositories/smtpCredential.repository';
import { WorkspaceRepository } from '../repositories/workspace.repository';
import { SecurityService } from '../services/security.service';

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:admin_password@localhost:27017/ghostsmtp_test?authSource=admin';

async function runTests() {
  console.log('--- Starting SMTP Authentication Integration Tests ---');
  
  // Connect to DB
  try {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('[Test Setup] Connected to MongoDB.');
  } catch (error) {
    console.error('[Test Setup] Failed to connect to MongoDB. Make sure MongoDB is running.', error);
    process.exit(1);
  }

  const workspaceRepo = new WorkspaceRepository();
  const smtpRepo = new SmtpCredentialRepository();
  const authService = new SmtpAuthService();

  // Create Mock Workspace
  const workspace = await workspaceRepo.create({
    name: 'Test Workspace',
    plan: 'free',
  } as any);

  // Generate Hashed Password
  const testPassword = 'SecurePassword123!';
  const passwordHash = await SecurityService.hashPassword(testPassword);

  // Create Mock SMTP Credentials
  const activeCred = await smtpRepo.create({
    workspaceId: workspace.id,
    username: 'test_active_user',
    passwordHash,
    status: 'active',
  } as any);

  const disabledCred = await smtpRepo.create({
    workspaceId: workspace.id,
    username: 'test_disabled_user',
    passwordHash,
    status: 'disabled',
  } as any);

  const deletedCred = await smtpRepo.create({
    workspaceId: workspace.id,
    username: 'test_deleted_user',
    passwordHash,
    status: 'active',
    isDeleted: true,
    deletedAt: new Date(),
  } as any);

  // Test suite counter
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  };

  try {
    // Test 1: Successful Auth
    const res1 = await authService.authenticateSmtpUser('test_active_user', testPassword, '127.0.0.1');
    assert(res1.authenticated === true, 'Successful Auth: Active credential and correct password');

    // Test 2: Invalid password
    const res2 = await authService.authenticateSmtpUser('test_active_user', 'WrongPassword', '127.0.0.1');
    assert(res2.authenticated === false, 'Failed Auth: Incorrect password');

    // Test 3: Disabled credential
    const res3 = await authService.authenticateSmtpUser('test_disabled_user', testPassword, '127.0.0.1');
    assert(res3.authenticated === false && res3.error === 'SMTP Credential has been disabled.', 'Failed Auth: Disabled status credential rejected');

    // Test 4: Deleted credential
    const res4 = await authService.authenticateSmtpUser('test_deleted_user', testPassword, '127.0.0.1');
    assert(res4.authenticated === false, 'Failed Auth: Soft-deleted credential rejected');

    // Test 5: Non-existent username
    const res5 = await authService.authenticateSmtpUser('non_existent', testPassword, '127.0.0.1');
    assert(res5.authenticated === false, 'Failed Auth: Non-existent username rejected');

    // Test 6: Brute force block check
    console.log('Testing brute force protection block trigger...');
    // Perform 5 consecutive failures
    for (let i = 0; i < 5; i++) {
      await authService.authenticateSmtpUser('test_active_user', 'WrongPassword', '127.0.0.1');
    }
    // Attempt correct login now (should be blocked)
    const res6 = await authService.authenticateSmtpUser('test_active_user', testPassword, '127.0.0.1');
    assert(res6.authenticated === false && !!res6.error?.includes('locked'), 'Brute Force Protection: Account locked after 5 failures');

  } catch (error) {
    console.error('An error occurred during test execution:', error);
  } finally {
    // Cleanup records
    await smtpRepo.delete(activeCred.id);
    await smtpRepo.delete(disabledCred.id);
    await smtpRepo.delete(deletedCred.id);
    await workspaceRepo.delete(workspace.id);
    
    // Close connection
    await mongoose.connection.close();
    console.log('[Test Teardown] Database cleaned up. Connection closed.');
  }

  console.log(`\n--- Test Summary: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Execute tests if file is run directly
runTests();
