"use strict";
/**
 * Types and interfaces for contextual code retrieval
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextualRetrievalException = exports.CodeChunkType = void 0;
var CodeChunkType;
(function (CodeChunkType) {
    CodeChunkType["FUNCTION"] = "function";
    CodeChunkType["CLASS"] = "class";
    CodeChunkType["INTERFACE"] = "interface";
    CodeChunkType["TYPE"] = "type";
    CodeChunkType["VARIABLE"] = "variable";
    CodeChunkType["IMPORT"] = "import";
    CodeChunkType["COMMENT"] = "comment";
    CodeChunkType["BLOCK"] = "block";
})(CodeChunkType || (exports.CodeChunkType = CodeChunkType = {}));
class ContextualRetrievalException extends Error {
    constructor(operation, message, details) {
        super(message);
        this.operation = operation;
        this.details = details;
        this.name = 'ContextualRetrievalException';
    }
}
exports.ContextualRetrievalException = ContextualRetrievalException;
//# sourceMappingURL=types.js.map