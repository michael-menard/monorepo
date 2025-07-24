import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './select';

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select defaultValue="1">
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">Option 1</SelectItem>
        <SelectItem value="2">Option 2</SelectItem>
      </SelectContent>
    </Select>
  ),
}; 