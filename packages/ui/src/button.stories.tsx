import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import React from 'react';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  render: () => <Button>Default Button</Button>,
};

export const Outline: Story = {
  render: () => <Button variant="outline">Outline Button</Button>,
};

export const Ghost: Story = {
  render: () => <Button variant="ghost">Ghost Button</Button>,
};

export const Destructive: Story = {
  render: () => <Button variant="destructive">Destructive Button</Button>,
}; 