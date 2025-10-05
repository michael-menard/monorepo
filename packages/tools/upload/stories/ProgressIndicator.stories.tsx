import type { Meta, StoryObj } from '@storybook/react';
import { ProgressIndicator } from '../src/components/ProgressIndicator/ProgressIndicator.tsx';
import type { UploadProgress } from '../src/types/index.js';

const createProgress = (percentage: number, loaded?: number, total?: number): UploadProgress => ({
  percentage,
  loaded: loaded || (percentage * 1024 * 1024) / 100, // Mock loaded bytes
  total: total || 1024 * 1024, // Mock total bytes (1MB)
});

const meta: Meta<typeof ProgressIndicator> = {
  title: 'Upload/ProgressIndicator',
  component: ProgressIndicator,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'ProgressIndicator component displays upload progress in linear or circular format.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['linear', 'circular'],
      description: 'Visual style of the progress indicator',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'Size of the progress indicator',
    },
    showPercentage: {
      control: { type: 'boolean' },
      description: 'Whether to show percentage text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const LinearDefault: Story = {
  args: {
    progress: createProgress(45),
    variant: 'linear',
    size: 'md',
    showPercentage: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Linear progress indicator at 45% completion.',
      },
    },
  },
};

export const LinearSmall: Story = {
  args: {
    progress: createProgress(75),
    variant: 'linear',
    size: 'sm',
    showPercentage: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Small linear progress indicator.',
      },
    },
  },
};

export const LinearLarge: Story = {
  args: {
    progress: createProgress(90),
    variant: 'linear',
    size: 'lg',
    showPercentage: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Large linear progress indicator.',
      },
    },
  },
};

export const LinearWithoutPercentage: Story = {
  args: {
    progress: createProgress(60),
    variant: 'linear',
    size: 'md',
    showPercentage: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Linear progress indicator without percentage text.',
      },
    },
  },
};

export const CircularDefault: Story = {
  args: {
    progress: createProgress(35),
    variant: 'circular',
    size: 'md',
    showPercentage: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Circular progress indicator at 35% completion.',
      },
    },
  },
};

export const CircularSmall: Story = {
  args: {
    progress: createProgress(80),
    variant: 'circular',
    size: 'sm',
    showPercentage: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Small circular progress indicator.',
      },
    },
  },
};

export const CircularLarge: Story = {
  args: {
    progress: createProgress(95),
    variant: 'circular',
    size: 'lg',
    showPercentage: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Large circular progress indicator.',
      },
    },
  },
};

export const CircularWithoutPercentage: Story = {
  args: {
    progress: createProgress(50),
    variant: 'circular',
    size: 'md',
    showPercentage: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Circular progress indicator without percentage text.',
      },
    },
  },
};

export const ZeroProgress: Story = {
  args: {
    progress: createProgress(0),
    variant: 'linear',
    size: 'md',
    showPercentage: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Progress indicator at 0% (just started).',
      },
    },
  },
};

export const CompleteProgress: Story = {
  args: {
    progress: createProgress(100),
    variant: 'linear',
    size: 'md',
    showPercentage: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Progress indicator at 100% (completed).',
      },
    },
  },
};

export const LargeFileProgress: Story = {
  args: {
    progress: createProgress(67, 67 * 1024 * 1024, 100 * 1024 * 1024), // 67MB of 100MB
    variant: 'linear',
    size: 'md',
    showPercentage: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Progress indicator for large file upload with detailed size information.',
      },
    },
  },
};
