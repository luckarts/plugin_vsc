"use strict";
/**
 * Types and interfaces for vector indexing system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectoringException = exports.IndexingStatus = exports.CodeChunkType = void 0;
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
var IndexingStatus;
(function (IndexingStatus) {
    IndexingStatus["IDLE"] = "idle";
    IndexingStatus["SCANNING"] = "scanning";
    IndexingStatus["PROCESSING"] = "processing";
    IndexingStatus["EMBEDDING"] = "embedding";
    IndexingStatus["STORING"] = "storing";
    IndexingStatus["COMPLETED"] = "completed";
    IndexingStatus["ERROR"] = "error";
})(IndexingStatus || (exports.IndexingStatus = IndexingStatus = {}));
class VectoringException extends Error {
    constructor(operation, message, details) {
        super(message);
        this.operation = operation;
        this.details = details;
        this.name = 'VectoringException';
    }
}
exports.VectoringException = VectoringException;
//# sourceMappingURL=types.js.map