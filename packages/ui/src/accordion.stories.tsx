import type { Meta, StoryObj } from '@storybook/react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion'

const meta: Meta<typeof Accordion> = {
  title: 'UI/Accordion',
  component: Accordion,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A collapsible content component with keyboard navigation support.',
      },
    },
  },
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['single', 'multiple'],
      description: 'Whether to allow single or multiple items to be expanded',
    },
    collapsible: {
      control: { type: 'boolean' },
      description: 'Whether to allow all items to be collapsed',
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-full max-w-md">
      <AccordionItem value="item-1">
        <AccordionTrigger>What is React?</AccordionTrigger>
        <AccordionContent>
          React is a JavaScript library for building user interfaces. It lets you create
          reusable UI components and manage their state efficiently.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>How do I get started?</AccordionTrigger>
        <AccordionContent>
          You can get started with React by creating a new project using Create React App
          or by adding React to an existing project.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>What are components?</AccordionTrigger>
        <AccordionContent>
          Components are the building blocks of React applications. They let you split
          the UI into independent, reusable pieces.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" className="w-full max-w-md">
      <AccordionItem value="item-1">
        <AccordionTrigger>Getting Started</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-2">
            <p>Follow these steps to get started:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Install Node.js</li>
              <li>Create a new React project</li>
              <li>Start the development server</li>
              <li>Begin building your components</li>
            </ol>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Components</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-2">
            <p>React components can be:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Functional components</li>
              <li>Class components</li>
              <li>Higher-order components</li>
              <li>Custom hooks</li>
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>State Management</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-2">
            <p>Popular state management solutions:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>useState hook</li>
              <li>useReducer hook</li>
              <li>Context API</li>
              <li>Redux</li>
              <li>Zustand</li>
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const WithLabel: Story = {
  render: () => (
    <Accordion 
      type="single" 
      collapsible 
      className="w-full max-w-md"
      label="Frequently Asked Questions"
      description="Common questions about our platform and services"
    >
      <AccordionItem value="item-1">
        <AccordionTrigger>How do I reset my password?</AccordionTrigger>
        <AccordionContent>
          To reset your password, go to the login page and click on "Forgot Password".
          You'll receive an email with instructions to create a new password.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Can I cancel my subscription?</AccordionTrigger>
        <AccordionContent>
          Yes, you can cancel your subscription at any time from your account settings.
          Your access will continue until the end of your current billing period.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
        <AccordionContent>
          We accept all major credit cards (Visa, MasterCard, American Express),
          PayPal, and bank transfers for annual plans.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const NestedContent: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-full max-w-md">
      <AccordionItem value="item-1">
        <AccordionTrigger>Advanced Features</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Performance Optimization</h4>
              <p className="text-sm text-muted-foreground">
                Learn about React.memo, useMemo, and useCallback for optimizing
                component performance.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Testing</h4>
              <p className="text-sm text-muted-foreground">
                Use Jest and React Testing Library to write comprehensive tests
                for your components.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Deployment</h4>
              <p className="text-sm text-muted-foreground">
                Deploy your React app to platforms like Vercel, Netlify, or
                your own server.
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Best Practices</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-md">
              <h4 className="font-medium text-blue-900">Component Structure</h4>
              <p className="text-sm text-blue-700 mt-1">
                Keep components small and focused on a single responsibility.
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-md">
              <h4 className="font-medium text-green-900">State Management</h4>
              <p className="text-sm text-green-700 mt-1">
                Lift state up to the nearest common ancestor when needed.
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-md">
              <h4 className="font-medium text-purple-900">Performance</h4>
              <p className="text-sm text-purple-700 mt-1">
                Use React DevTools to identify performance bottlenecks.
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const CustomStyling: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-full max-w-md">
      <AccordionItem value="item-1" className="border-2 border-blue-200 rounded-lg mb-2">
        <AccordionTrigger className="px-4 py-3 hover:bg-blue-50">
          Custom Styled Item
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <p>This accordion item has custom styling applied.</p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2" className="border-2 border-green-200 rounded-lg mb-2">
        <AccordionTrigger className="px-4 py-3 hover:bg-green-50">
          Another Custom Item
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <p>Each item can have its own custom styling.</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
} 