import * as vscode from 'vscode';
export declare class VectorDatabase {
    private storageUri;
    constructor(globalStorageUri: vscode.Uri);
    private initStorage;
    indexFile(file: vscode.Uri): Promise<void>;
    getRelevantCode(query: string): Promise<string[]>;
}
//# sourceMappingURL=vectorDb.d.ts.map