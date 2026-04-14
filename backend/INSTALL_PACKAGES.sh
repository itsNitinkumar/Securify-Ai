#!/bin/bash

echo "Installing required packages for SecurifyAI..."

# File upload handling
npm install multer @types/multer

# Report generation
npm install docx pdfkit @types/pdfkit

# Google Drive integration
npm install googleapis

# Additional utilities
npm install archiver @types/archiver  # For ZIP files
npm install sharp @types/sharp        # Image processing for evidence

echo "✅ All packages installed successfully!"
echo ""
echo "Next steps:"
echo "1. Run migrations: npm run migrate:up"
echo "2. Add OPENAI_API_KEY to .env"
echo "3. Add GOOGLE_DRIVE credentials to .env (optional)"
echo "4. Restart the server: npm run dev"
