#!/bin/bash

echo "🚀 SecurifyAI Quick Start"
echo "========================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Check if OpenAI API key is set
if grep -q "your_openai_api_key_here" .env; then
    echo "⚠️  OpenAI API key not set!"
    echo ""
    echo "Please update your .env file with your OpenAI API key:"
    echo "OPENAI_API_KEY=sk-your-actual-key-here"
    echo ""
    echo "Get your API key from: https://platform.openai.com/api-keys"
    echo ""
    read -p "Press Enter after updating the .env file..."
fi

echo "✅ Checking setup..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🗄️  Running migrations..."
npm run migrate:up

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Starting server..."
npm run dev
