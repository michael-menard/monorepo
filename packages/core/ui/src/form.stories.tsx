import type { Meta, StoryObj } from '@storybook/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form'
import { Button } from './button'
import { Input } from './input'
import { Textarea } from './textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Checkbox } from './checkbox'

const meta: Meta<typeof Form> = {
  title: 'UI/Form',
  component: Form,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A form component with validation and field management.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

// Simple form schema
const simpleFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
})

// TODO: Fix complex form schema - TypeScript issues with React Hook Form
// const complexFormSchema = z.object({
//   name: z.string().min(2, 'Name must be at least 2 characters'),
//   email: z.string().email('Invalid email address'),
//   message: z.string().min(10, 'Message must be at least 10 characters'),
//   category: z.string().min(1, 'Please select a category'),
//   newsletter: z.boolean().default(false),
// })

const SimpleForm = () => {
  const form = useForm<z.infer<typeof simpleFormSchema>>({
    resolver: zodResolver(simpleFormSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  })

  function onSubmit(values: z.infer<typeof simpleFormSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Enter your email" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}

// TODO: Fix ComplexForm component - TypeScript issues with React Hook Form
const ComplexForm = () => {
  return <div>Complex form temporarily disabled due to TypeScript issues</div>
}

export const Simple: Story = {
  render: () => <SimpleForm />,
}

// TODO: Fix complex form stories - TypeScript issues with React Hook Form
export const Complex: Story = {
  render: () => <div>Complex form temporarily disabled due to TypeScript issues</div>,
}

export const WithValidation: Story = {
  render: () => <div>Complex form temporarily disabled due to TypeScript issues</div>,
  parameters: {
    docs: {
      description: {
        story: 'Form with comprehensive validation using Zod schema.',
      },
    },
  },
} 