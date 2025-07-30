#!/bin/bash

echo "📧 Ethereal Email Setup for Email Testing"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp env.ethereal.template .env
    echo "✅ .env file created"
else
    echo "⚠️  .env file already exists"
    echo "Please manually add the Ethereal Email configuration to your .env file:"
    echo ""
    echo "# Ethereal Email Configuration"
    echo "ETHEREAL_HOST=smtp.ethereal.email"
    echo "ETHEREAL_PORT=587"
    echo "ETHEREAL_USER=your_ethereal_username"
    echo "ETHEREAL_PASS=your_ethereal_password"
    echo "ETHEREAL_SECURE=false"
    echo "EMAIL_TESTING_SERVICE=ethereal"
    echo ""
fi

echo ""
echo "🔧 Next Steps:"
echo "1. Visit https://ethereal.email/create"
echo "2. Click 'Create Ethereal Account'"
echo "3. Copy the SMTP credentials provided"
echo "4. Update your .env file with the real credentials"
echo "5. Replace 'your_ethereal_username' and 'your_ethereal_password'"
echo ""
echo "📧 To access your emails:"
echo "- Web Interface: https://ethereal.email"
echo "- Login with the credentials from step 3"
echo ""
echo "🎯 To test email verification:"
echo "- Configure your auth service to use Ethereal SMTP"
echo "- Send verification emails to any address"
echo "- Check emails at https://ethereal.email"
echo "- Use verification codes in your E2E tests"
echo ""
echo "✅ Setup complete! Follow the steps above to configure your credentials." 