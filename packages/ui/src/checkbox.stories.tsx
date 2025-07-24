import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './checkbox';
import React, { useState } from 'react';

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: () => {
    const [checked, setChecked] = useState<boolean | 'indeterminate'>(false);
    return <Checkbox checked={checked} onCheckedChange={setChecked} />;
  },
}; 