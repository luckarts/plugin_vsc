"use strict";
/**
 * Context module exports
 * Provides intelligent context detection, filtering, optimization, and preview
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
exports.SmartContextManager = exports.ContextPreview = exports.ContextOptimizer = exports.ContextFilter = exports.ContextDetector = void 0;
var contextDetector_1 = require("./contextDetector");
Object.defineProperty(exports, "ContextDetector", { enumerable: true, get: function () { return contextDetector_1.ContextDetector; } });
var contextFilter_1 = require("./contextFilter");
Object.defineProperty(exports, "ContextFilter", { enumerable: true, get: function () { return contextFilter_1.ContextFilter; } });
var contextOptimizer_1 = require("./contextOptimizer");
Object.defineProperty(exports, "ContextOptimizer", { enumerable: true, get: function () { return contextOptimizer_1.ContextOptimizer; } });
var contextPreview_1 = require("./contextPreview");
Object.defineProperty(exports, "ContextPreview", { enumerable: true, get: function () { return contextPreview_1.ContextPreview; } });
var smartContextManager_1 = require("./smartContextManager");
Object.defineProperty(exports, "SmartContextManager", { enumerable: true, get: function () { return smartContextManager_1.SmartContextManager; } });
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map