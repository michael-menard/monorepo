import { renderHook, act } from '@testing-library/react-hooks';
import io from 'socket.io-client';
import { useNotifications } from '../useNotifications';

jest.mock('socket.io-client');

describe('useNotifications', () => {
  let mockSocket: SocketIOClient.Socket;

  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connected: false,
    } as any;

    (io as jest.Mock).mockImplementation(() => mockSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('connects to notifications server', () => {
    renderHook(() => useNotifications({ channels: ['test-channel'] }));
    expect(io).toHaveBeenCalledWith('http://localhost:3001');
  });

  it('returns events, isConnected, and error', () => {
    const { result } = renderHook(() => useNotifications({ channels: ['test-channel'] }));
    expect(result.current.events).toEqual({});
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('auto-reconnects on disconnect', () => {
    const { result, rerender } = renderHook(() => useNotifications({ channels: ['test-channel'] }));
    act(() => {
      mockSocket.on.mock.calls[1][1](); // Simulate disconnect event
    });
    expect(result.current.isConnected).toBe(false);
    rerender();
    expect(io).toHaveBeenCalledTimes(2); // Reconnect attempt
  });

  it('cleans up Socket.io connection on unmount', () => {
    const { unmount } = renderHook(() => useNotifications({ channels: ['test-channel'] }));
    unmount();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});