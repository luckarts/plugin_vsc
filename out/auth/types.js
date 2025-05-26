"use strict";
/**
 * Types and interfaces for authentication module
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationException = exports.AuthenticationError = void 0;
var AuthenticationError;
(function (AuthenticationError) {
    AuthenticationError["NO_API_KEY"] = "NO_API_KEY";
    AuthenticationError["INVALID_API_KEY"] = "INVALID_API_KEY";
    AuthenticationError["VALIDATION_TIMEOUT"] = "VALIDATION_TIMEOUT";
    AuthenticationError["NETWORK_ERROR"] = "NETWORK_ERROR";
    AuthenticationError["PERMISSION_DENIED"] = "PERMISSION_DENIED";
    AuthenticationError["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
})(AuthenticationError || (exports.AuthenticationError = AuthenticationError = {}));
class AuthenticationException extends Error {
    constructor(errorType, message, details) {
        super(message);
        this.errorType = errorType;
        this.details = details;
        this.name = 'AuthenticationException';
    }
}
exports.AuthenticationException = AuthenticationException;
//# sourceMappingURL=types.js.map