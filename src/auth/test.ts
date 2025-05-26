/**
 * Test file for authentication module
 * This file can be used to manually test authentication functionality
 */

import * as vscode from 'vscode';
import { AuthenticationManager } from './authenticationManager';
import { ApiKeyValidator } from './apiKeyValidator';
import { SecretManager } from './secretManager';

/**
 * Test the authentication module functionality
 * This function can be called from the extension for testing purposes
 */
export async function testAuthenticationModule(context: vscode.ExtensionContext): Promise<void> {
  console.log('🧪 Starting authentication module tests...');

  try {
    // Test 1: Initialize components
    console.log('📝 Test 1: Initializing components...');
    const secretManager = new SecretManager(context);
    const validator = new ApiKeyValidator();
    const authManager = new AuthenticationManager(context);
    console.log('✅ Components initialized successfully');

    // Test 2: Check if API key exists
    console.log('📝 Test 2: Checking for existing API key...');
    const hasKey = await secretManager.hasApiKey();
    console.log(`📊 Has API key: ${hasKey}`);

    // Test 3: Test environment variable support
    console.log('📝 Test 3: Testing environment variable support...');
    const envKey = secretManager.getApiKeyFromEnvironment();
    console.log(`📊 Environment key found: ${!!envKey}`);

    // Test 4: Test authentication manager initialization
    console.log('📝 Test 4: Testing authentication manager initialization...');
    await authManager.initialize();
    console.log('✅ Authentication manager initialized');

    // Test 5: Check authentication status
    console.log('📝 Test 5: Checking authentication status...');
    const isAuthenticated = await authManager.isAuthenticated();
    console.log(`📊 Is authenticated: ${isAuthenticated}`);

    // Test 6: Validate current API key (if exists)
    if (hasKey || envKey) {
      console.log('📝 Test 6: Validating current API key...');
      const validation = await authManager.validateCurrentApiKey();
      console.log(`📊 Validation result: ${validation.isValid}`);
      if (!validation.isValid) {
        console.log(`❌ Validation error: ${validation.error}`);
      }
    } else {
      console.log('⏭️ Test 6: Skipped (no API key configured)');
    }

    // Test 7: Test key format validation
    console.log('📝 Test 7: Testing key format validation...');
    const testKeys = [
      'sk-ant-valid-format-test',
      'invalid-key',
      '',
      'sk-ant-',
      'sk-ant-api03-20240101T000000Z-abcdef123456789012345678901234567890abcdef123456789012345678901234'
    ];

    for (const testKey of testKeys) {
      const result = await validator.validateApiKey(testKey);
      console.log(`📊 Key "${testKey.substring(0, 20)}...": Format valid = ${result.details?.keyFormat}`);
    }

    console.log('🎉 Authentication module tests completed successfully!');

  } catch (error) {
    console.error('❌ Authentication module test failed:', error);
    vscode.window.showErrorMessage(
      `Authentication test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Test API key validation with a real key
 * This should only be called with a valid API key for testing
 */
export async function testApiKeyValidation(apiKey: string): Promise<void> {
  console.log('🔑 Testing API key validation...');

  try {
    const validator = new ApiKeyValidator();
    const result = await validator.validateApiKey(apiKey);

    console.log('📊 Validation Results:');
    console.log(`  - Overall valid: ${result.isValid}`);
    console.log(`  - Format valid: ${result.details?.keyFormat}`);
    console.log(`  - Connection valid: ${result.details?.apiConnection}`);
    console.log(`  - Permissions valid: ${result.details?.permissions}`);

    if (!result.isValid) {
      console.log(`  - Error: ${result.error}`);
    }

    vscode.window.showInformationMessage(
      `API Key Validation: ${result.isValid ? 'Valid ✅' : 'Invalid ❌'}`
    );

  } catch (error) {
    console.error('❌ API key validation test failed:', error);
    vscode.window.showErrorMessage(
      `API key validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Test the complete authentication flow
 */
export async function testAuthenticationFlow(context: vscode.ExtensionContext): Promise<void> {
  console.log('🔄 Testing complete authentication flow...');

  try {
    const authManager = new AuthenticationManager(context);
    await authManager.initialize();

    // Test getting a valid API key
    console.log('📝 Testing getValidApiKey...');
    try {
      const apiKey = await authManager.getValidApiKey();
      console.log('✅ Successfully obtained valid API key');
      
      // Test making a simple API call
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });

      console.log(`📊 API Response Status: ${response.status}`);
      if (response.ok) {
        console.log('✅ API call successful');
      } else {
        console.log('❌ API call failed');
      }

    } catch (error) {
      console.log('❌ Failed to get valid API key or make API call');
      console.log('💡 This is expected if no API key is configured');
    }

    console.log('🎉 Authentication flow test completed!');

  } catch (error) {
    console.error('❌ Authentication flow test failed:', error);
    vscode.window.showErrorMessage(
      `Authentication flow test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Register test commands for manual testing
 */
export function registerTestCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('codeAssist.testAuth', () => testAuthenticationModule(context)),
    vscode.commands.registerCommand('codeAssist.testAuthFlow', () => testAuthenticationFlow(context))
  );
}
