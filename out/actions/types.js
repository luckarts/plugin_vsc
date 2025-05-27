"use strict";
/**
 * Types and interfaces for action buttons (Apply, Create)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionException = exports.ChangeType = exports.RiskLevel = exports.ActionType = void 0;
var ActionType;
(function (ActionType) {
    ActionType["APPLY_MODIFICATION"] = "apply-modification";
    ActionType["CREATE_FILE"] = "create-file";
    ActionType["CREATE_FUNCTION"] = "create-function";
    ActionType["CREATE_CLASS"] = "create-class";
    ActionType["CREATE_COMPONENT"] = "create-component";
    ActionType["REFACTOR_CODE"] = "refactor-code";
    ActionType["FIX_ERROR"] = "fix-error";
    ActionType["ADD_IMPORT"] = "add-import";
    ActionType["REMOVE_CODE"] = "remove-code";
})(ActionType || (exports.ActionType = ActionType = {}));
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["LOW"] = "low";
    RiskLevel["MEDIUM"] = "medium";
    RiskLevel["HIGH"] = "high";
    RiskLevel["CRITICAL"] = "critical";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
var ChangeType;
(function (ChangeType) {
    ChangeType["CREATE"] = "create";
    ChangeType["MODIFY"] = "modify";
    ChangeType["DELETE"] = "delete";
    ChangeType["RENAME"] = "rename";
})(ChangeType || (exports.ChangeType = ChangeType = {}));
class ActionException extends Error {
    constructor(operation, message, details) {
        super(message);
        this.operation = operation;
        this.details = details;
        this.name = 'ActionException';
    }
}
exports.ActionException = ActionException;
//# sourceMappingURL=types.js.map