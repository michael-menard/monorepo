import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Badge } from '@repo/ui'

export const ExampleForm: React.FC = () => {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Example Form
          <Badge variant="secondary">ShadCN UI</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="Enter your email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="Enter your password" />
        </div>
        <Button className="w-full">Submit</Button>
      </CardContent>
    </Card>
  )
}
