#!/usr/bin/env node
/**
 * Test Script for Gmail and Twilio Connectors
 * 
 * Usage:
 *   node test-connectors.js gmail
 *   node test-connectors.js twilio
 *   node test-connectors.js all
 */

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function testGmailSearch() {
  console.log('\n🔍 Testing Gmail Search...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/connectors/gmail/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'is:unread',
        maxResults: 5
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Gmail search successful!');
      console.log(`   Found ${data.data.resultCount} unread emails`);
      if (data.data.emails && data.data.emails.length > 0) {
        console.log(`   Latest: "${data.data.emails[0].subject}" from ${data.data.emails[0].from}`);
      }
    } else if (data.requiresSetup) {
      console.log('⚠️  Gmail not configured');
      console.log(`   ${data.setupInstructions}`);
    } else {
      console.log('❌ Gmail search failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Error testing Gmail:', error.message);
  }
}

async function testGmailSend() {
  console.log('\n📧 Testing Gmail Send (dry run - will fail without real token)...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/connectors/gmail/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'test@example.com',
        subject: 'Test Email from NIRVANA',
        body: 'This is a test email from the NIRVANA AI system.'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Gmail send successful!');
      console.log(`   Message ID: ${data.data.messageId}`);
    } else if (data.requiresSetup) {
      console.log('⚠️  Gmail not configured');
      console.log(`   ${data.setupInstructions}`);
    } else {
      console.log('❌ Gmail send failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Error testing Gmail send:', error.message);
  }
}

async function testTwilioStatus() {
  console.log('\n📱 Testing Twilio Status...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/twilio/status`);
    const data = await response.json();
    
    if (data.configured) {
      console.log('✅ Twilio is configured!');
      console.log(`   Phone Number: ${data.phoneNumber || 'Not set'}`);
    } else {
      console.log('⚠️  Twilio not configured');
      console.log('   Required environment variables:');
      console.log('   - TWILIO_ACCOUNT_SID');
      console.log('   - TWILIO_AUTH_TOKEN');
      console.log('   - TWILIO_PHONE_NUMBER');
    }
  } catch (error) {
    console.log('❌ Error testing Twilio:', error.message);
  }
}

async function testToolOrchestrator() {
  console.log('\n🛠️  Checking Tool Orchestrator...');
  
  try {
    // Import tool orchestrator
    const { toolOrchestrator } = await import('./src/services/tool-orchestrator.ts');
    
    const tools = toolOrchestrator.getAvailableTools();
    console.log(`✅ Tool Orchestrator loaded with ${tools.length} tools`);
    
    // Check for Gmail tools
    const gmailTools = tools.filter(t => t.id.includes('gmail'));
    console.log(`   Gmail tools: ${gmailTools.map(t => t.id).join(', ')}`);
    
    // Check for Twilio tools
    const twilioTools = tools.filter(t => t.id.includes('sms') || t.id.includes('call'));
    console.log(`   Twilio tools: ${twilioTools.map(t => t.id).join(', ')}`);
    
  } catch (error) {
    console.log('❌ Error loading tool orchestrator:', error.message);
  }
}

async function main() {
  const testType = process.argv[2] || 'all';
  
  console.log('🧪 NIRVANA Connector Test Suite');
  console.log('================================');
  console.log(`Backend URL: ${BASE_URL}`);
  
  // Check backend health
  try {
    const healthCheck = await fetch(`${BASE_URL}/health`);
    const health = await healthCheck.json();
    console.log(`✅ Backend is ${health.status}`);
  } catch (error) {
    console.log('❌ Backend is not responding!');
    console.log('   Make sure to start it with: node server.js');
    process.exit(1);
  }
  
  // Run tests based on type
  if (testType === 'gmail' || testType === 'all') {
    await testGmailSearch();
    await testGmailSend();
  }
  
  if (testType === 'twilio' || testType === 'all') {
    await testTwilioStatus();
  }
  
  if (testType === 'all') {
    await testToolOrchestrator();
  }
  
  console.log('\n✨ Test suite complete!\n');
}

main().catch(console.error);
