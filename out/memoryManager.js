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
exports.MemoryManager = exports.LegacyMemoryManager = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Legacy MemoryManager for conversation history
 * @deprecated Use the new intelligent memory system in src/memory/
 */
class LegacyMemoryManager {
    constructor(globalStorageUri) {
        this.conversationHistory = [];
        this.storageUri = vscode.Uri.joinPath(globalStorageUri, 'conversations');
        this.initStorage();
    }
    async initStorage() {
        try {
            await vscode.workspace.fs.stat(this.storageUri);
        }
        catch {
            await vscode.workspace.fs.createDirectory(this.storageUri);
        }
    }
    addMessage(role, content) {
        this.conversationHistory.push({ role, content });
    }
    getConversationHistory() {
        return this.conversationHistory;
    }
    async saveConversation(name) {
        const conversationUri = vscode.Uri.joinPath(this.storageUri, `${name}.json`);
        const data = JSON.stringify(this.conversationHistory, null, 2);
        await vscode.workspace.fs.writeFile(conversationUri, new TextEncoder().encode(data));
    }
    async loadConversation(name) {
        const conversationUri = vscode.Uri.joinPath(this.storageUri, `${name}.json`);
        try {
            const data = await vscode.workspace.fs.readFile(conversationUri);
            this.conversationHistory = JSON.parse(new TextDecoder().decode(data));
            return this.conversationHistory;
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to load conversation: ${error}`);
            return [];
        }
    }
    clearConversation() {
        this.conversationHistory = [];
    }
}
exports.LegacyMemoryManager = LegacyMemoryManager;
// Re-export for backward compatibility
exports.MemoryManager = LegacyMemoryManager;
//# sourceMappingURL=memoryManager.js.map