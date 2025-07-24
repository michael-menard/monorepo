import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';
import React from 'react';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {
  render: () => <Input placeholder="Type here..." />,
}; 