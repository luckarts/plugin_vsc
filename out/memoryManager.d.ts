import * as vscode from 'vscode';
/**
 * Legacy MemoryManager for conversation history
 * @deprecated Use the new intelligent memory system in src/memory/
 */
export declare class LegacyMemoryManager {
    private conversationHistory;
    private storageUri;
    constructor(globalStorageUri: vscode.Uri);
    private initStorage;
    addMessage(role: 'user' | 'assistant', content: string): void;
    getConversationHistory(): {
        role: string;
        content: string;
    }[];
    saveConversation(name: string): Promise<void>;
    loadConversation(name: string): Promise<{
        role: string;
        content: string;
    }[]>;
    clearConversation(): void;
}
export declare const MemoryManager: typeof LegacyMemoryManager;
//# sourceMappingURL=memoryManager.d.ts.map