import * as vscode from 'vscode';
export declare class MemoryManager {
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
//# sourceMappingURL=memoryManager.d.ts.map