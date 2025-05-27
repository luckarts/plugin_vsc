/**
 * Types and interfaces for the webview chat interface
 */
export interface IChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    isMarkdown?: boolean;
    isLoading?: boolean;
    metadata?: IChatMessageMetadata;
}
export interface IChatMessageMetadata {
    codeContext?: string[];
    attachedFiles?: string[];
    relevantChunks?: number;
    processingTime?: number;
    model?: string;
    actionButtons?: IActionButton[];
}
export interface IActionButton {
    id: string;
    type: string;
    label: string;
    icon: string;
    tooltip: string;
    enabled: boolean;
    action: any;
}
export interface IChatState {
    messages: IChatMessage[];
    isLoading: boolean;
    currentInput: string;
    theme: 'light' | 'dark' | 'auto';
    suggestions: string[];
    attachedFiles: string[];
}
export interface IWebviewMessage {
    type: WebviewMessageType;
    payload?: any;
}
export declare enum WebviewMessageType {
    SEND_MESSAGE = "sendMessage",
    ATTACH_FILE = "attachFile",
    MENTION_FILE = "mentionFile",
    CLEAR_CHAT = "clearChat",
    EXPORT_CHAT = "exportChat",
    MESSAGE_RESPONSE = "messageResponse",
    LOADING_START = "loadingStart",
    LOADING_END = "loadingEnd",
    ERROR = "error",
    THEME_CHANGED = "themeChanged",
    SUGGESTIONS_UPDATE = "suggestionsUpdate",
    FILE_ATTACHED = "fileAttached",
    INIT = "init",
    CONFIG_UPDATE = "configUpdate",
    ACTION_BUTTON_CLICK = "ACTION_BUTTON_CLICK",
    ACTION_BUTTON_UPDATE = "ACTION_BUTTON_UPDATE",
    CONTEXT_MENU_ACTION = "CONTEXT_MENU_ACTION",
    UNDO_ACTION = "UNDO_ACTION",
    REDO_ACTION = "REDO_ACTION",
    SHOW_PREVIEW = "SHOW_PREVIEW"
}
export interface IToolbarAction {
    id: string;
    label: string;
    icon: string;
    tooltip: string;
    shortcut?: string;
    action: () => void;
}
export interface IChatConfig {
    maxMessages: number;
    enableMarkdown: boolean;
    enableCodeHighlight: boolean;
    enableAutoComplete: boolean;
    theme: 'light' | 'dark' | 'auto';
    fontSize: number;
    showTimestamps: boolean;
    enableSounds: boolean;
}
export interface IAutoCompleteItem {
    label: string;
    detail?: string;
    documentation?: string;
    insertText: string;
    kind: AutoCompleteKind;
}
export declare enum AutoCompleteKind {
    FILE = "file",
    FUNCTION = "function",
    CLASS = "class",
    VARIABLE = "variable",
    COMMAND = "command",
    SNIPPET = "snippet"
}
//# sourceMappingURL=types.d.ts.map