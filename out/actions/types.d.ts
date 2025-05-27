/**
 * Types and interfaces for action buttons (Apply, Create)
 */
export interface IActionButton {
    id: string;
    type: ActionType;
    label: string;
    icon: string;
    tooltip: string;
    enabled: boolean;
    action: ICodeAction;
}
export interface ICodeAction {
    id: string;
    type: ActionType;
    description: string;
    targetFile?: string;
    targetRange?: IRange;
    content: string;
    language: string;
    metadata: IActionMetadata;
}
export interface IActionMetadata {
    confidence: number;
    riskLevel: RiskLevel;
    estimatedImpact: string;
    dependencies: string[];
    backupRequired: boolean;
    previewAvailable: boolean;
}
export interface IRange {
    startLine: number;
    startCharacter: number;
    endLine: number;
    endCharacter: number;
}
export declare enum ActionType {
    APPLY_MODIFICATION = "apply-modification",
    CREATE_FILE = "create-file",
    CREATE_FUNCTION = "create-function",
    CREATE_CLASS = "create-class",
    CREATE_COMPONENT = "create-component",
    REFACTOR_CODE = "refactor-code",
    FIX_ERROR = "fix-error",
    ADD_IMPORT = "add-import",
    REMOVE_CODE = "remove-code"
}
export declare enum RiskLevel {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export interface ICodeParser {
    parseCodeSuggestions(content: string): Promise<ICodeAction[]>;
    extractCodeBlocks(content: string): ICodeBlock[];
    detectActionType(codeBlock: ICodeBlock, context: string): ActionType;
    estimateRisk(action: ICodeAction): RiskLevel;
}
export interface ICodeBlock {
    id: string;
    language: string;
    content: string;
    startIndex: number;
    endIndex: number;
    filename?: string;
    description?: string;
    isComplete: boolean;
}
export interface IActionExecutor {
    executeAction(action: ICodeAction): Promise<IActionResult>;
    previewAction(action: ICodeAction): Promise<IActionPreview>;
    validateAction(action: ICodeAction): Promise<IValidationResult>;
    canExecuteAction(action: ICodeAction): boolean;
}
export interface IActionResult {
    success: boolean;
    message: string;
    filesModified: string[];
    filesCreated: string[];
    errors: string[];
    warnings: string[];
    backupPaths?: string[];
}
export interface IActionPreview {
    action: ICodeAction;
    changes: IFileChange[];
    summary: string;
    warnings: string[];
    estimatedTime: number;
}
export interface IFileChange {
    filePath: string;
    type: ChangeType;
    oldContent?: string;
    newContent: string;
    range?: IRange;
    description: string;
}
export declare enum ChangeType {
    CREATE = "create",
    MODIFY = "modify",
    DELETE = "delete",
    RENAME = "rename"
}
export interface IValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
    canProceed: boolean;
}
export interface IActionButtonManager {
    createActionButtons(content: string): Promise<IActionButton[]>;
    renderActionButtons(buttons: IActionButton[]): string;
    handleButtonClick(buttonId: string, messageId: string): Promise<void>;
    updateButtonState(buttonId: string, enabled: boolean): void;
}
export interface IFileCreator {
    createFile(action: ICodeAction): Promise<IActionResult>;
    suggestFilePath(content: string, language: string): string;
    validateFilePath(filePath: string): IValidationResult;
    ensureDirectoryExists(filePath: string): Promise<void>;
}
export interface ICodeApplier {
    applyModification(action: ICodeAction): Promise<IActionResult>;
    findTargetLocation(content: string, targetFile: string): Promise<IRange | null>;
    mergeCode(existingContent: string, newContent: string, range?: IRange): string;
    createBackup(filePath: string): Promise<string>;
}
export interface IActionUI {
    showPreview(preview: IActionPreview): Promise<boolean>;
    showConfirmation(action: ICodeAction): Promise<boolean>;
    showProgress(message: string): void;
    hideProgress(): void;
    showResult(result: IActionResult): void;
}
export interface IActionConfig {
    enableAutoApply: boolean;
    requireConfirmation: boolean;
    createBackups: boolean;
    maxFileSize: number;
    allowedExtensions: string[];
    riskThreshold: RiskLevel;
    previewTimeout: number;
}
export interface IActionHistory {
    recordAction(action: ICodeAction, result: IActionResult): void;
    getHistory(): IActionHistoryEntry[];
    undoLastAction(): Promise<IActionResult>;
    canUndo(): boolean;
}
export interface IActionHistoryEntry {
    id: string;
    timestamp: number;
    action: ICodeAction;
    result: IActionResult;
    canUndo: boolean;
}
export interface ISmartActionDetector {
    detectActionsInMessage(content: string): Promise<ICodeAction[]>;
    analyzeCodeContext(codeBlock: ICodeBlock): Promise<IActionContext>;
    suggestBestAction(actions: ICodeAction[]): ICodeAction | null;
    rankActionsByRelevance(actions: ICodeAction[]): ICodeAction[];
}
export interface IActionContext {
    currentFile?: string;
    selectedText?: string;
    cursorPosition?: IRange;
    nearbyCode?: string;
    projectStructure?: string[];
    recentActions?: IActionHistoryEntry[];
}
export interface IActionTemplate {
    id: string;
    name: string;
    description: string;
    type: ActionType;
    template: string;
    variables: ITemplateVariable[];
    conditions: ITemplateCondition[];
}
export interface ITemplateVariable {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'file' | 'directory';
    description: string;
    required: boolean;
    defaultValue?: any;
    validation?: string;
}
export interface ITemplateCondition {
    variable: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'matches';
    value: any;
    message?: string;
}
export interface IActionNotification {
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
    actions?: INotificationAction[];
    timeout?: number;
}
export interface INotificationAction {
    label: string;
    action: () => void;
    style?: 'primary' | 'secondary' | 'danger';
}
export declare class ActionException extends Error {
    readonly operation: string;
    readonly details?: any | undefined;
    constructor(operation: string, message: string, details?: any | undefined);
}
//# sourceMappingURL=types.d.ts.map