"use strict";
/**
 * Intelligent Memory System
 * Main exports for the advanced memory management system
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
exports.MemoryManager = exports.IntelligentMemoryManager = exports.CompressionService = exports.StorageService = void 0;
// Core types and interfaces
__exportStar(require("./types"), exports);
// Configuration
__exportStar(require("./config"), exports);
// Core services
var storageService_1 = require("./storageService");
Object.defineProperty(exports, "StorageService", { enumerable: true, get: function () { return storageService_1.StorageService; } });
var compressionService_1 = require("./compressionService");
Object.defineProperty(exports, "CompressionService", { enumerable: true, get: function () { return compressionService_1.CompressionService; } });
// Main memory manager
var memoryManager_1 = require("./memoryManager");
Object.defineProperty(exports, "IntelligentMemoryManager", { enumerable: true, get: function () { return memoryManager_1.IntelligentMemoryManager; } });
// Re-export for convenience
var memoryManager_2 = require("./memoryManager");
Object.defineProperty(exports, "MemoryManager", { enumerable: true, get: function () { return memoryManager_2.IntelligentMemoryManager; } });
//# sourceMappingURL=index.js.map