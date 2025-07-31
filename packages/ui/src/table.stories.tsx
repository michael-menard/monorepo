import type { Meta, StoryObj } from '@storybook/react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

const meta: Meta<typeof Table> = {
  title: 'UI/Table',
  component: Table,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A table component for displaying structured data.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>A list of your recent invoices.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Method</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">INV001</TableCell>
          <TableCell>Paid</TableCell>
          <TableCell>Credit Card</TableCell>
          <TableCell className="text-right">$250.00</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">INV002</TableCell>
          <TableCell>Pending</TableCell>
          <TableCell>PayPal</TableCell>
          <TableCell className="text-right">$150.00</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">INV003</TableCell>
          <TableCell>Unpaid</TableCell>
          <TableCell>Bank Transfer</TableCell>
          <TableCell className="text-right">$350.00</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">INV004</TableCell>
          <TableCell>Paid</TableCell>
          <TableCell>Credit Card</TableCell>
          <TableCell className="text-right">$450.00</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">INV005</TableCell>
          <TableCell>Paid</TableCell>
          <TableCell>PayPal</TableCell>
          <TableCell className="text-right">$550.00</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">INV006</TableCell>
          <TableCell>Pending</TableCell>
          <TableCell>Bank Transfer</TableCell>
          <TableCell className="text-right">$200.00</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}

export const WithStatusBadges: Story = {
  render: () => (
    <Table>
      <TableCaption>User accounts and their current status.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">John Doe</TableCell>
          <TableCell>john.doe@example.com</TableCell>
          <TableCell>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          </TableCell>
          <TableCell>Admin</TableCell>
          <TableCell className="text-right">
            <button className="text-blue-600 hover:text-blue-800">Edit</button>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Jane Smith</TableCell>
          <TableCell>jane.smith@example.com</TableCell>
          <TableCell>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Pending
            </span>
          </TableCell>
          <TableCell>User</TableCell>
          <TableCell className="text-right">
            <button className="text-blue-600 hover:text-blue-800">Edit</button>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Bob Johnson</TableCell>
          <TableCell>bob.johnson@example.com</TableCell>
          <TableCell>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Suspended
            </span>
          </TableCell>
          <TableCell>User</TableCell>
          <TableCell className="text-right">
            <button className="text-blue-600 hover:text-blue-800">Edit</button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}

export const Compact: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">ID</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">001</TableCell>
          <TableCell>Laptop</TableCell>
          <TableCell>Electronics</TableCell>
          <TableCell className="text-right">$999.99</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">002</TableCell>
          <TableCell>Mouse</TableCell>
          <TableCell>Accessories</TableCell>
          <TableCell className="text-right">$29.99</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">003</TableCell>
          <TableCell>Keyboard</TableCell>
          <TableCell>Accessories</TableCell>
          <TableCell className="text-right">$89.99</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}

export const WithActions: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Salary</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">Alice Cooper</TableCell>
          <TableCell>Engineering</TableCell>
          <TableCell>$85,000</TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end space-x-2">
              <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
              <button className="text-green-600 hover:text-green-800 text-sm">Edit</button>
              <button className="text-red-600 hover:text-red-800 text-sm">Delete</button>
            </div>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Bob Wilson</TableCell>
          <TableCell>Marketing</TableCell>
          <TableCell>$75,000</TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end space-x-2">
              <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
              <button className="text-green-600 hover:text-green-800 text-sm">Edit</button>
              <button className="text-red-600 hover:text-red-800 text-sm">Delete</button>
            </div>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Carol Davis</TableCell>
          <TableCell>Sales</TableCell>
          <TableCell>$65,000</TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end space-x-2">
              <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
              <button className="text-green-600 hover:text-green-800 text-sm">Edit</button>
              <button className="text-red-600 hover:text-red-800 text-sm">Delete</button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}

export const Empty: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
            No data available
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
} 