"use strict";
/**
 * Types and interfaces for intelligent context detection and management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextException = exports.CompressionLevel = exports.ContextComplexity = exports.ContentType = exports.SymbolType = exports.ExportType = exports.ImportType = void 0;
var ImportType;
(function (ImportType) {
    ImportType["DEFAULT"] = "default";
    ImportType["NAMED"] = "named";
    ImportType["NAMESPACE"] = "namespace";
    ImportType["SIDE_EFFECT"] = "side-effect";
})(ImportType || (exports.ImportType = ImportType = {}));
var ExportType;
(function (ExportType) {
    ExportType["DEFAULT"] = "default";
    ExportType["NAMED"] = "named";
    ExportType["NAMESPACE"] = "namespace";
})(ExportType || (exports.ExportType = ExportType = {}));
var SymbolType;
(function (SymbolType) {
    SymbolType["FUNCTION"] = "function";
    SymbolType["CLASS"] = "class";
    SymbolType["INTERFACE"] = "interface";
    SymbolType["TYPE"] = "type";
    SymbolType["VARIABLE"] = "variable";
    SymbolType["CONSTANT"] = "constant";
    SymbolType["ENUM"] = "enum";
})(SymbolType || (exports.SymbolType = SymbolType = {}));
var ContentType;
(function (ContentType) {
    ContentType["ACTIVE_FILE"] = "active-file";
    ContentType["IMPORTS"] = "imports";
    ContentType["RELATED_FILES"] = "related-files";
    ContentType["RECENT_FILES"] = "recent-files";
    ContentType["DEPENDENCIES"] = "dependencies";
    ContentType["DOCUMENTATION"] = "documentation";
})(ContentType || (exports.ContentType = ContentType = {}));
var ContextComplexity;
(function (ContextComplexity) {
    ContextComplexity["SIMPLE"] = "simple";
    ContextComplexity["MODERATE"] = "moderate";
    ContextComplexity["COMPLEX"] = "complex";
    ContextComplexity["VERY_COMPLEX"] = "very-complex";
})(ContextComplexity || (exports.ContextComplexity = ContextComplexity = {}));
var CompressionLevel;
(function (CompressionLevel) {
    CompressionLevel["NONE"] = "none";
    CompressionLevel["LIGHT"] = "light";
    CompressionLevel["MODERATE"] = "moderate";
    CompressionLevel["AGGRESSIVE"] = "aggressive";
})(CompressionLevel || (exports.CompressionLevel = CompressionLevel = {}));
class ContextException extends Error {
    constructor(operation, message, details) {
        super(message);
        this.operation = operation;
        this.details = details;
        this.name = 'ContextException';
    }
}
exports.ContextException = ContextException;
//# sourceMappingURL=types.js.map