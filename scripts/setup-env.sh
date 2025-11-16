#!/bin/bash
# =============================================================================
# Nirvana Environment Setup Helper
# =============================================================================
# This script helps you create a .env file with all necessary variables

set -e

echo "========================================="
echo "  NIRVANA PersonI AI - Environment Setup"
echo "========================================="
echo ""

# Check if .env already exists
if [ -f .env ]; then
    read -p ".env file already exists. Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    mv .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ Existing .env backed up"
fi

# Copy template
cp .env.example .env
echo "✓ Created .env from template"
echo ""

# Function to prompt for value
prompt_var() {
    local var_name="$1"
    local description="$2"
    local is_secret="$3"
    local default_value="$4"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$description"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -n "$default_value" ]; then
        read -p "Enter $var_name (default: $default_value): " value
        value="${value:-$default_value}"
    else
        if [ "$is_secret" = "secret" ]; then
            read -sp "Enter $var_name (hidden, press Enter to skip): " value
            echo ""
        else
            read -p "Enter $var_name (press Enter to skip): " value
        fi
    fi
    
    if [ -n "$value" ]; then
        # Escape special characters for sed
        escaped_value=$(echo "$value" | sed 's/[\/&]/\\&/g')
        sed -i "s|^${var_name}=.*|${var_name}=${escaped_value}|" .env
        echo "✓ Set $var_name"
    else
        echo "⊘ Skipped $var_name"
    fi
    echo ""
}

# Core Configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Application Settings"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
prompt_var "PUBLIC_URL" "Public URL for OAuth callbacks (e.g., https://your-domain.com)" "public" "http://localhost:5000"

# AI Providers
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: AI Model Providers (at least ONE required)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Get API keys from:"
echo "  • Gemini: https://makersuite.google.com/app/apikey"
echo "  • OpenAI: https://platform.openai.com/api-keys"
echo ""
prompt_var "GEMINI_API_KEY" "Google Gemini API Key (recommended)" "secret"
prompt_var "OPENAI_API_KEY" "OpenAI API Key" "secret"

# Google OAuth
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Google OAuth (for Gmail/Calendar)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Get from: https://console.cloud.google.com/apis/credentials"
echo "Create OAuth 2.0 Client ID (Web application)"
echo ""
read -p "Configure Google OAuth now? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    prompt_var "GOOGLE_CLIENT_ID" "Google OAuth Client ID" "public"
    prompt_var "GOOGLE_CLIENT_SECRET" "Google OAuth Client Secret" "secret"
fi

# Twilio
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Twilio (for SMS/Voice)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Get from: https://console.twilio.com/"
echo ""
read -p "Configure Twilio now? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    prompt_var "TWILIO_ACCOUNT_SID" "Twilio Account SID" "public"
    prompt_var "TWILIO_AUTH_TOKEN" "Twilio Auth Token" "secret"
    prompt_var "TWILIO_PHONE_NUMBER" "Twilio Phone Number (e.g., +1234567890)" "public"
fi

# Optional APIs
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 5: Optional APIs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "Configure optional APIs? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Financial Data:"
    prompt_var "ALPHA_VANTAGE_API_KEY" "  Alpha Vantage (stock data)" "secret"
    prompt_var "FINNHUB_API_KEY" "  Finnhub (market news)" "secret"
    echo ""
    echo "Music:"
    prompt_var "AUDD_API_TOKEN" "  AudD (music ID)" "secret"
    prompt_var "GENIUS_API_TOKEN" "  Genius (lyrics)" "secret"
fi

# Summary
echo ""
echo "========================================="
echo "  ✓ Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Review .env file and add any additional keys"
echo "  2. Start services: docker-compose up -d"
echo "  3. Launch app: npm run dev (and node server.js)"
echo ""
echo "For detailed instructions, see SETUP.md"
echo ""
