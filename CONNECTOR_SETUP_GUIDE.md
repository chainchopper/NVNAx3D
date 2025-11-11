# Connector Setup Guide - Gmail & Twilio

This guide explains how to configure Gmail and Twilio connectors for NIRVANA following the **local-first, portable architecture** (no Replit dependency).

## 🔑 Important: Portable Configuration

**ALL connector credentials must be configured via:**
1. `.env` file (recommended for local/Docker deployment)
2. App Settings UI (in-app connector configuration panel)

**NEVER use Replit's integration system** - this keeps your app portable and independent.

---

## 📧 Gmail Setup

### Required Scopes
Your Google OAuth token needs these scopes:
- `https://www.googleapis.com/auth/gmail.readonly` (for searching emails)
- `https://www.googleapis.com/auth/gmail.send` (for sending emails)

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Gmail API**

### Step 2: Create OAuth 2.0 Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Application type: **Web application**
4. Authorized redirect URIs: Add your app URL + `/oauth/callback`
5. Download the credentials JSON

### Step 3: Get Access Token
You have two options:

**Option A: Using Google OAuth Playground** (Quick Test)
1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon → Check "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. Select scopes: `gmail.readonly` and `gmail.send`
5. Click **Authorize APIs** and sign in
6. Exchange authorization code for tokens
7. Copy the **Access Token**

**Option B: Implement OAuth Flow** (Production)
- Implement full OAuth 2.0 flow in your app
- Store refresh tokens securely
- Auto-refresh access tokens when expired

### Step 4: Add to .env
```bash
# Gmail Configuration
GOOGLE_ACCESS_TOKEN=ya29.a0AfH6SMB...your-actual-token
```

**Note**: Access tokens expire! For production, implement token refresh logic.

---

## 📱 Twilio Setup

### Step 1: Create Twilio Account
1. Go to [Twilio Console](https://www.twilio.com/console)
2. Sign up for a free trial (or use existing account)
3. Get a Twilio phone number

### Step 2: Get API Credentials
1. In Twilio Console, go to **Account Info**
2. Copy your:
   - **Account SID**
   - **Auth Token**
3. Copy your **Twilio Phone Number**

### Step 3: Add to .env
```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

**Important**: Phone numbers must be in E.164 format: `+[country code][number]`

---

## ✅ Verify Setup

### Test Gmail Integration
```bash
curl -X POST http://localhost:3001/api/connectors/gmail/search \
  -H "Content-Type: application/json" \
  -d '{"query": "subject:test", "maxResults": 5}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "query": "subject:test",
    "resultCount": 3,
    "emails": [...]
  }
}
```

### Test Twilio Integration
```bash
# Check if Twilio is configured
curl http://localhost:3001/api/twilio/status
```

Expected response:
```json
{
  "success": true,
  "configured": true,
  "phoneNumber": "+15551234567"
}
```

---

## 🤖 Using with PersonI

Once configured, PersonI can use these tools:

### Available Tools

1. **search_gmail**
   - Search Gmail inbox
   - No confirmation required
   ```javascript
   {
     "tool": "search_gmail",
     "params": {
       "query": "from:example@gmail.com subject:invoice",
       "maxResults": 10
     }
   }
   ```

2. **send_gmail**
   - Send email via Gmail
   - **Requires user confirmation**
   ```javascript
   {
     "tool": "send_gmail",
     "params": {
       "to": "recipient@example.com",
       "subject": "Hello from NIRVANA",
       "body": "This is a test email"
     }
   }
   ```

3. **send_sms**
   - Send SMS via Twilio
   - **Requires user confirmation**
   ```javascript
   {
     "tool": "send_sms",
     "params": {
       "to": "+15551234567",
       "message": "Hello from NIRVANA!"
     }
   }
   ```

4. **make_call**
   - Make phone call via Twilio
   - **Requires user confirmation**
   ```javascript
   {
     "tool": "make_call",
     "params": {
       "to": "+15551234567",
       "personaVoice": "Polly.Joanna"
     }
   }
   ```

---

## 🔒 Security Best Practices

1. **Never commit .env to git**
   - Add `.env` to `.gitignore`
   - Use environment variables in production

2. **Rotate credentials regularly**
   - Especially OAuth tokens
   - Update in .env or app settings

3. **Use read-only tokens when possible**
   - Gmail: If only searching, use `gmail.readonly` scope only
   - Principle of least privilege

4. **Monitor usage**
   - Check Twilio usage dashboard
   - Monitor Gmail API quotas

---

## 🐛 Troubleshooting

### Gmail: "Token expired" error
**Solution**: Refresh the access token using your refresh token, or generate a new one from OAuth Playground

### Twilio: "Invalid phone number" error
**Solution**: Ensure phone numbers are in E.164 format: `+[country code][number]`

### Backend not responding
**Solution**: 
1. Check if backend is running: `curl http://localhost:3001/health`
2. Check environment variables are loaded
3. Restart backend: `npm run backend` or `node server.js`

### PersonI not seeing tools
**Solution**:
1. Check PersonI has required capabilities enabled in settings
2. Verify tool orchestrator is initialized
3. Check browser console for errors

---

## 📚 Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Twilio API Documentation](https://www.twilio.com/docs/usage/api)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [E.164 Phone Format](https://en.wikipedia.org/wiki/E.164)
