import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';

describe('Card UI Primitives', () => {
  it('renders Card with children', () => {
    render(
      <Card data-testid="card">
        <div>Card Content</div>
      </Card>
    );
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('forwards className to Card', () => {
    render(<Card data-testid="card" className="custom-class" />);
    expect(screen.getByTestId('card')).toHaveClass('custom-class');
  });

  it('renders CardHeader, CardTitle, CardDescription, CardContent, CardFooter', () => {
    render(
      <Card>
        <CardHeader data-testid="header">
          <CardTitle data-testid="title">Title</CardTitle>
          <CardDescription data-testid="desc">Description</CardDescription>
        </CardHeader>
        <CardContent data-testid="content">Main Content</CardContent>
        <CardFooter data-testid="footer">Footer</CardFooter>
      </Card>
    );
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('title')).toHaveTextContent('Title');
    expect(screen.getByTestId('desc')).toHaveTextContent('Description');
    expect(screen.getByTestId('content')).toHaveTextContent('Main Content');
    expect(screen.getByTestId('footer')).toHaveTextContent('Footer');
  });
}); 