const request = require('supertest');
const app = require('../app'); // Import the Express app
const { User, Referral } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Before running tests, optionally clean your database:
beforeAll(async () => {
  await User.destroy({ where: {} });
  await Referral.destroy({ where: {} });
});

describe('API Endpoints', () => {
  describe('POST /api/register', () => {
    it('should register a new user without referral', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          email: 'user1@example.com',
          username: 'testuser1',
          password: 'Password1'
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');

      const user = await User.findOne({ where: { email: 'user1@example.com' } });
      expect(user).not.toBeNull();
      expect(user.referral_code).toContain('REF-testuser1-');
    });

    it('should register a new user with valid referral', async () => {
      // Create a referrer first
      const referrerRes = await request(app)
        .post('/api/register')
        .send({
          email: 'referrer@example.com',
          username: 'referrerUser',
          password: 'Password1'
        });
      expect(referrerRes.status).toBe(201);

      const referrer = await User.findOne({ where: { email: 'referrer@example.com' } });
      expect(referrer).not.toBeNull();

      // Now register a user using the referrer's referral_code
      const res = await request(app)
        .post(`/api/register?referral=${referrer.referral_code}`)
        .send({
          email: 'referred@example.com',
          username: 'referredUser',
          password: 'Password1'
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');

      const newUser = await User.findOne({ where: { email: 'referred@example.com' } });
      expect(newUser).not.toBeNull();
      expect(newUser.referred_by).toBe(referrer.id);

      const referralRecord = await Referral.findOne({ where: { referred_user_id: newUser.id } });
      expect(referralRecord).not.toBeNull();
    });

    it('should fail registration with invalid referral code', async () => {
      const res = await request(app)
        .post('/api/register?referral=INVALID_CODE')
        .send({
          email: 'invalidref@example.com',
          username: 'invalidUser',
          password: 'Password1'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid referral code');
    });
  });

  describe('POST /api/login', () => {
    it('should log in a registered user', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'user1@example.com',
          password: 'Password1'
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should fail login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'user1@example.com',
          password: 'WrongPassword'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Incorrect password');
    });
  });

  describe('Password Reset Flow', () => {
    let resetToken;
    it('should generate a reset token for a valid user', async () => {
      const res = await request(app)
        .post('/api/forgot-password')
        .send({ email: 'user1@example.com' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('resetToken');
      resetToken = res.body.resetToken;
    });

    it('should reset the password with a valid token', async () => {
      const res = await request(app)
        .post('/api/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewPassword1'
        });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password reset successfully');

      const loginRes = await request(app)
        .post('/api/login')
        .send({
          email: 'user1@example.com',
          password: 'NewPassword1'
        });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('token');
    });
  });
});
