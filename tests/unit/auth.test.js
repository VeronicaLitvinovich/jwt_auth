const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

jest.mock('../../app/models');
jest.mock('../../app/config/auth.config');

const authConfig = require('../../app/config/auth.config');
const db = require('../../app/models');

describe('Auth Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Hashing', () => {
    test('should hash password correctly', () => {
      const password = 'testpassword';
      const hashedPassword = bcrypt.hashSync(password, 8);
      
      expect(hashedPassword).toBeDefined();
      expect(bcrypt.compareSync(password, hashedPassword)).toBe(true);
    });

    test('should validate password correctly', () => {
      const password = 'testpassword';
      const hashedPassword = bcrypt.hashSync(password, 8);
      
      const isValid = bcrypt.compareSync(password, hashedPassword);
      expect(isValid).toBe(true);
      
      const isInvalid = bcrypt.compareSync('wrongpassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWT Tokens', () => {
    test('should generate valid access token', () => {
      const userId = 1;
      authConfig.secret = 'test-secret';
      
      const token = jwt.sign({ id: userId }, authConfig.secret, {
        algorithm: 'HS256',
        expiresIn: 900,
      });
      
      expect(token).toBeDefined();
      
      const decoded = jwt.verify(token, authConfig.secret);
      expect(decoded.id).toBe(userId);
    });

    test('should generate valid refresh token', () => {
      const userId = 1;
      authConfig.secret = 'test-secret';
      
      const token = jwt.sign({ id: userId }, authConfig.secret, {
        algorithm: 'HS256',
        expiresIn: 604800,
      });
      
      expect(token).toBeDefined();
      
      const decoded = jwt.verify(token, authConfig.secret);
      expect(decoded.id).toBe(userId);
    });
  });

  describe('Session Management', () => {
    test('should generate unique session IDs', () => {
      const sessionId1 = uuidv4();
      const sessionId2 = uuidv4();
      
      expect(sessionId1).toBeDefined();
      expect(sessionId2).toBeDefined();
      expect(sessionId1).not.toBe(sessionId2);
    });
  });
});