process.env.NODE_ENV = 'test';
process.env.PORT = '0';

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
  if (!args[0]?.includes?.('Executing') && 
      !args[0]?.includes?.('DROP') && 
      !args[0]?.includes?.('CREATE') &&
      !args[0]?.includes?.('Session ID') &&
      !args[0]?.includes?.('JWT Token')) {
    originalConsoleLog(...args);
  }
};

console.error = (...args) => {
  if (!args[0]?.includes?.('listen EADDRINUSE')) {
    originalConsoleError(...args);
  }
};

jest.mock('../app/models', () => {
  const mockUser = {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn().mockImplementation((data) => Promise.resolve({
      id: 1,
      username: data.username,
      email: data.email,
      password: data.password,
      setRoles: jest.fn().mockResolvedValue(true),
      getRoles: jest.fn().mockResolvedValue([{ name: 'user' }]),
      update: jest.fn().mockResolvedValue(true)
    })),
    update: jest.fn().mockResolvedValue(true)
  };

  const mockRole = {
    create: jest.fn(),
    findAll: jest.fn().mockResolvedValue([{ id: 1, name: 'user' }])
  };

  return {
    user: mockUser,
    role: mockRole,
    ROLES: ['user', 'admin'],
    sequelize: {
      sync: jest.fn().mockResolvedValue(true),
      close: jest.fn().mockResolvedValue(true)
    },
    Sequelize: {
      Op: {
        or: Symbol('or'),
        gt: Symbol('gt')
      }
    }
  };
});

jest.mock('../app/config/auth.config', () => ({
  secret: 'test-secret-key'
}));