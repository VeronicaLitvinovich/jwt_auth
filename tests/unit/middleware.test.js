const jwt = require('jsonwebtoken');
const authJwt = require('../../app/middleware/authJwt');

jest.mock('../../app/models');
jest.mock('../../app/config/auth.config');

const authConfig = require('../../app/config/auth.config');
const db = require('../../app/models');

describe('Middleware Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {},
      body: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      clearCookie: jest.fn()
    };
    
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    test('should return 403 if no token provided', () => {
      authJwt.verifyToken(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "No token provided!"
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 401 for invalid token', () => {
      mockReq.headers['x-access-token'] = 'invalid-token';
      authConfig.secret = 'test-secret';
      
      authJwt.verifyToken(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});