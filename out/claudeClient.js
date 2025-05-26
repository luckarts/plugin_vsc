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
exports.ClaudeClient = void 0;
const vscode = __importStar(require("vscode"));
const authenticationManager_1 = require("./auth/authenticationManager");
const types_1 = require("./auth/types");
class ClaudeClient {
    constructor(context) {
        this.authManager = new authenticationManager_1.AuthenticationManager(context);
    }
    /**
     * Initialize the Claude client
     */
    async initialize() {
        await this.authManager.initialize();
    }
    /**
     * Get completion from Claude API with enhanced context
     * @param query User query
     * @param enhancedContext Enhanced context with code and editor info
     * @returns Claude's response
     */
    async getCompletion(query, enhancedContext) {
        try {
            const apiKey = await this.authManager.getValidApiKey();
            const messages = this.buildMessages(query, enhancedContext);
            const response = await this.callClaudeApi(apiKey, messages);
            return this.extractContentFromResponse(response);
        }
        catch (error) {
            if (error instanceof types_1.AuthenticationException) {
                // Handle authentication errors gracefully
                vscode.window.showErrorMessage(`Authentication error: ${error.message}`, 'Configure API Key').then((selection) => {
                    if (selection === 'Configure API Key') {
                        vscode.commands.executeCommand('codeAssist.configureApiKey');
                    }
                });
                throw error;
            }
            // Handle other errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Claude API error: ${errorMessage}`);
            throw new Error(errorMessage);
        }
    }
    /**
     * Test the connection to Claude API
     * @returns True if connection is successful
     */
    async testConnection() {
        try {
            const apiKey = await this.authManager.getValidApiKey();
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
            return response.ok;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Build messages array for Claude API
     * @param query User query
     * @param enhancedContext Context information
     * @returns Messages array
     */
    buildMessages(query, enhancedContext) {
        const messages = [];
        // Add system context if available
        if (enhancedContext.codeContext && enhancedContext.codeContext.length > 0) {
            const contextMessage = `Here is relevant code context:\n\n${enhancedContext.codeContext.join('\n\n')}`;
            messages.push({ role: 'user', content: contextMessage });
        }
        // Add current editor context if available
        if (enhancedContext.currentEditor) {
            const editorMessage = `Current file: ${enhancedContext.currentEditor.fileName}\nSelected text: ${enhancedContext.currentEditor.selectedText || 'None'}`;
            messages.push({ role: 'user', content: editorMessage });
        }
        // Add the main query
        messages.push({ role: 'user', content: query });
        return messages;
    }
    /**
     * Make API call to Claude
     * @param apiKey API key
     * @param messages Messages array
     * @returns API response
     */
    async callClaudeApi(apiKey, messages) {
        const config = vscode.workspace.getConfiguration('codeAssist');
        const maxTokens = config.get('maxContextLength') || 10000;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: Math.min(maxTokens, 4096),
                messages: messages
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Claude API error (${response.status}): ${errorText}`);
        }
        return await response.json();
    }
    /**
     * Extract content from Claude API response
     * @param response API response
     * @returns Extracted content
     */
    extractContentFromResponse(response) {
        if (response.content && Array.isArray(response.content)) {
            return response.content
                .filter(item => item.type === 'text')
                .map(item => item.text)
                .join('\n');
        }
        if (typeof response.content === 'string') {
            return response.content;
        }
        return 'No response content received from Claude API';
    }
    /**
     * Get authentication manager instance
     * @returns Authentication manager
     */
    getAuthManager() {
        return this.authManager;
    }
}
exports.ClaudeClient = ClaudeClient;
//# sourceMappingURL=claudeClient.js.map