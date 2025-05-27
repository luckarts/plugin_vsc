"use strict";
/**
 * Types and interfaces for the webview chat interface
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoCompleteKind = exports.WebviewMessageType = void 0;
var WebviewMessageType;
(function (WebviewMessageType) {
    // User actions
    WebviewMessageType["SEND_MESSAGE"] = "sendMessage";
    WebviewMessageType["ATTACH_FILE"] = "attachFile";
    WebviewMessageType["MENTION_FILE"] = "mentionFile";
    WebviewMessageType["CLEAR_CHAT"] = "clearChat";
    WebviewMessageType["EXPORT_CHAT"] = "exportChat";
    // System responses
    WebviewMessageType["MESSAGE_RESPONSE"] = "messageResponse";
    WebviewMessageType["LOADING_START"] = "loadingStart";
    WebviewMessageType["LOADING_END"] = "loadingEnd";
    WebviewMessageType["ERROR"] = "error";
    // UI updates
    WebviewMessageType["THEME_CHANGED"] = "themeChanged";
    WebviewMessageType["SUGGESTIONS_UPDATE"] = "suggestionsUpdate";
    WebviewMessageType["FILE_ATTACHED"] = "fileAttached";
    // Configuration
    WebviewMessageType["INIT"] = "init";
    WebviewMessageType["CONFIG_UPDATE"] = "configUpdate";
    // Action buttons
    WebviewMessageType["ACTION_BUTTON_CLICK"] = "ACTION_BUTTON_CLICK";
    WebviewMessageType["ACTION_BUTTON_UPDATE"] = "ACTION_BUTTON_UPDATE";
    // Context menu and advanced actions
    WebviewMessageType["CONTEXT_MENU_ACTION"] = "CONTEXT_MENU_ACTION";
    WebviewMessageType["UNDO_ACTION"] = "UNDO_ACTION";
    WebviewMessageType["REDO_ACTION"] = "REDO_ACTION";
    WebviewMessageType["SHOW_PREVIEW"] = "SHOW_PREVIEW";
})(WebviewMessageType || (exports.WebviewMessageType = WebviewMessageType = {}));
var AutoCompleteKind;
(function (AutoCompleteKind) {
    AutoCompleteKind["FILE"] = "file";
    AutoCompleteKind["FUNCTION"] = "function";
    AutoCompleteKind["CLASS"] = "class";
    AutoCompleteKind["VARIABLE"] = "variable";
    AutoCompleteKind["COMMAND"] = "command";
    AutoCompleteKind["SNIPPET"] = "snippet";
})(AutoCompleteKind || (exports.AutoCompleteKind = AutoCompleteKind = {}));
//# sourceMappingURL=types.js.map