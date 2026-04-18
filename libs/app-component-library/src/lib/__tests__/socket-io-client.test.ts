import { createSocketClient } from '../socket-io-client';

jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn()
  };
  return {
    __esModule: true,
    default: jest.fn(() => mockSocket)
  };
});

describe('createSocketClient', () => {
  it('should create a socket client with the given URL', () => {
    const url = 'http://localhost:3001';
    createSocketClient(url);
    expect(require('socket.io-client')).toHaveBeenCalledWith(url);
  });
});