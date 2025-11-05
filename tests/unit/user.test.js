const userController = require('../../app/controllers/user.controller');

describe('User Controller Unit Tests', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn()
    };
  });

  describe('allAccess', () => {
    test('should return public message', () => {
      userController.allAccess(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('Test info lab4.');
    });
  });

  describe('userBoard', () => {
    test('should return user message', () => {
      userController.userBoard(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('Test User lab4.');
    });
  });

  describe('adminBoard', () => {
    test('should return admin message', () => {
      userController.adminBoard(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('Test Admin lab4.');
    });
  });
});