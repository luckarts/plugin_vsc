"use strict";
/**
 * Types and interfaces for the intelligent memory system
 * Inspired by Augment's memory management capabilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.StorageError = exports.CompressionError = exports.MemoryError = exports.MemoryType = void 0;
var MemoryType;
(function (MemoryType) {
    MemoryType["PERSONAL"] = "personal";
    MemoryType["REPOSITORY"] = "repository";
    MemoryType["GUIDELINE"] = "guideline";
    MemoryType["SESSION"] = "session";
})(MemoryType || (exports.MemoryType = MemoryType = {}));
// Error types
class MemoryError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'MemoryError';
    }
}
exports.MemoryError = MemoryError;
class CompressionError extends MemoryError {
    constructor(message, details) {
        super(message, 'COMPRESSION_ERROR', details);
        this.name = 'CompressionError';
    }
}
exports.CompressionError = CompressionError;
class StorageError extends MemoryError {
    constructor(message, details) {
        super(message, 'STORAGE_ERROR', details);
        this.name = 'StorageError';
    }
}
exports.StorageError = StorageError;
class ValidationError extends MemoryError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=types.js.map