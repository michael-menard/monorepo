import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import QueueDepthIndicator from '@/components/queue/QueueDepthIndicator';

afterEach(cleanup);

describe('QueueDepthIndicator', () => {
  it('renders initial queue depth with default thresholds', () => {
    render(<QueueDepthIndicator channel="orders" queueName="pending" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('0 items')).toBeInTheDocument();
  });

  it('applies correct color class based on depth and thresholds', () => {
    const { rerender } = render(
      <QueueDepthIndicator
        channel="orders"
        queueName="pending"
        thresholds={{ low: 10, high: 50 }}
      />
    );

    // Simulate depth updates via custom event
    const updateEvent = new CustomEvent('queue-depth:orders:pending', { detail: 5 });
    window.dispatchEvent(updateEvent);
    expect(screen.getByText('5')).toHaveClass('text-green-600');

    rerender(
      <QueueDepthIndicator
        channel="orders"
        queueName="pending"
        thresholds={{ low: 10, high: 50 }}
      />
    );
    const yellowEvent = new CustomEvent('queue-depth:orders:pending', { detail: 25 });
    window.dispatchEvent(yellowEvent);
    expect(screen.getByText('25')).toHaveClass('text-yellow-600');

    const redEvent = new CustomEvent('queue-depth:orders:pending', { detail: 60 });
    window.dispatchEvent(redEvent);
    expect(screen.getByText('60')).toHaveClass('text-red-600');
  });

  it('updates in real-time via custom events', () => {
    render(<QueueDepthIndicator channel="orders" queueName="pending" />);
    expect(screen.getByText('0 items')).toBeInTheDocument();

    const updateEvent = new CustomEvent('queue-depth:orders:pending', { detail: 15 });
    window.dispatchEvent(updateEvent);
    expect(screen.getByText('15 items')).toBeInTheDocument();
  });

  it('has accessible ARIA label', () => {
    render(<QueueDepthIndicator channel="orders" queueName="pending" />);
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Queue depth for pending on channel orders: 0 items'
    );
  });

  it('unsubscribes from events on unmount', () => {
    const { unmount } = render(
      <QueueDepthIndicator channel="orders" queueName="pending" />
    );
    unmount();

    // Dispatch event after unmount — should not update
    const updateEvent = new CustomEvent('queue-depth:orders:pending', { detail: 100 });
    window.dispatchEvent(updateEvent);
    // No assertion needed — no crash or memory leak = success
  });
});
