"use strict";
/**
 * Authentication module exports
 * Provides centralized access to all authentication-related functionality
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationManager = exports.ApiKeyValidator = exports.SecretManager = void 0;
var secretManager_1 = require("./secretManager");
Object.defineProperty(exports, "SecretManager", { enumerable: true, get: function () { return secretManager_1.SecretManager; } });
var apiKeyValidator_1 = require("./apiKeyValidator");
Object.defineProperty(exports, "ApiKeyValidator", { enumerable: true, get: function () { return apiKeyValidator_1.ApiKeyValidator; } });
var authenticationManager_1 = require("./authenticationManager");
Object.defineProperty(exports, "AuthenticationManager", { enumerable: true, get: function () { return authenticationManager_1.AuthenticationManager; } });
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map