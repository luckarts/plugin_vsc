"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyValidator = void 0;
const vscode = __importStar(require("vscode"));
const types_1 = require("./types");
/**
 * Validates Claude API keys by testing format and connectivity
 */
class ApiKeyValidator {
    constructor() {
        const config = vscode.workspace.getConfiguration('codeAssist');
        this.timeout = config.get('apiKeyValidationTimeout') || 10000;
    }
    /**
     * Validates the format and functionality of a Claude API key
     * @param apiKey The API key to validate
     * @returns Validation result with details
     */
    async validateApiKey(apiKey) {
        const result = {
            isValid: false,
            details: {
                keyFormat: false,
                apiConnection: false,
                permissions: false
            }
        };
        try {
            // Step 1: Validate key format
            result.details.keyFormat = this.validateKeyFormat(apiKey);
            if (!result.details.keyFormat) {
                result.error = 'Invalid API key format. Claude API keys should start with "sk-ant-"';
                return result;
            }
            // Step 2: Test API connection
            result.details.apiConnection = await this.testConnection(apiKey);
            if (!result.details.apiConnection) {
                result.error = 'Unable to connect to Claude API. Please check your internet connection and API key.';
                return result;
            }
            // Step 3: Test permissions (basic API call)
            result.details.permissions = await this.testPermissions(apiKey);
            if (!result.details.permissions) {
                result.error = 'API key does not have sufficient permissions or has been revoked.';
                return result;
            }
            result.isValid = true;
            return result;
        }
        catch (error) {
            result.error = error instanceof Error ? error.message : 'Unknown validation error';
            return result;
        }
    }
    /**
     * Test basic connectivity to Claude API
     * @param apiKey The API key to test
     * @returns True if connection successful
     */
    async testConnection(apiKey) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'test' }]
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            // Even if the request fails, if we get a response, the connection works
            return response.status !== 0;
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new types_1.AuthenticationException(types_1.AuthenticationError.VALIDATION_TIMEOUT, 'API key validation timed out');
            }
            return false;
        }
    }
    /**
     * Validate the format of the API key
     * @param apiKey The API key to validate
     * @returns True if format is valid
     */
    validateKeyFormat(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }
        const trimmedKey = apiKey.trim();
        // Claude API keys typically start with "sk-ant-" and have a specific length
        return trimmedKey.startsWith('sk-ant-') && trimmedKey.length > 20;
    }
    /**
     * Test if the API key has necessary permissions
     * @param apiKey The API key to test
     * @returns True if permissions are sufficient
     */
    async testPermissions(apiKey) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
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
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            // Check for successful response or expected error codes
            return response.status === 200 || response.status === 400; // 400 might be rate limit or quota
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new types_1.AuthenticationException(types_1.AuthenticationError.VALIDATION_TIMEOUT, 'Permission test timed out');
            }
            return false;
        }
    }
    /**
     * Get user-friendly error message for validation failures
     * @param result The validation result
     * @returns User-friendly error message
     */
    static getValidationErrorMessage(result) {
        if (result.isValid) {
            return 'API key is valid';
        }
        if (!result.details?.keyFormat) {
            return 'Invalid API key format. Please ensure you have copied the complete key from Anthropic.';
        }
        if (!result.details?.apiConnection) {
            return 'Cannot connect to Claude API. Please check your internet connection.';
        }
        if (!result.details?.permissions) {
            return 'API key lacks necessary permissions or may be expired. Please check your Anthropic account.';
        }
        return result.error || 'Unknown validation error';
    }
}
exports.ApiKeyValidator = ApiKeyValidator;
//# sourceMappingURL=apiKeyValidator.js.map