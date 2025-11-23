#!/bin/bash

# Test script to verify Ghostty terminal title setting

echo "🧪 Testing Ghostty Terminal Title Setting"
echo "========================================"
echo ""

# Test opening a single Ghostty window with a title
echo "Opening a test Ghostty window with title: 🧪 Test Terminal"

if command -v ghostty &> /dev/null; then
    echo "Using direct ghostty command..."
    ghostty --working-directory="$(pwd)" --title="🧪 Test Terminal" &
elif [ -d "/Applications/Ghostty.app" ]; then
    echo "Using open command for Ghostty app bundle..."
    open -na ghostty --args --working-directory="$(pwd)" --title="🧪 Test Terminal" &
else
    echo "❌ Ghostty not found!"
    exit 1
fi

echo ""
echo "✅ Test window launched!"
echo ""
echo "If you're using Ghostty, you should see a new window/tab with the title:"
echo "🧪 Test Terminal"
echo ""
echo "The window should also open in the current directory:"
echo "$(pwd)"
echo ""
echo "If the title appears correctly, then the BMAD terminal setup scripts"
echo "should work properly with your Ghostty installation!"
echo ""
echo "You can also test setting titles dynamically with escape sequences:"
echo "  printf '\\e]0;Your Title Here\\e\\\\'"
