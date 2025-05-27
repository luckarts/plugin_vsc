"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeParser = void 0;
const vscode = __importStar(require("vscode"));
const types_1 = require("./types");
/**
 * Intelligent code parser that extracts actionable code suggestions from Claude responses
 * Identifies code blocks, determines action types, and assesses risk levels
 */
class CodeParser {
    constructor() {
        this.codeBlockRegex = /```(\w+)?\s*(?:\/\/\s*(.+?))?\n([\s\S]*?)```/g;
        this.filePathRegex = /(?:file|path|create|save):\s*([^\s\n]+\.[a-zA-Z0-9]+)/gi;
        this.actionKeywords = new Map([
            ['create', types_1.ActionType.CREATE_FILE],
            ['add', types_1.ActionType.CREATE_FUNCTION],
            ['modify', types_1.ActionType.APPLY_MODIFICATION],
            ['update', types_1.ActionType.APPLY_MODIFICATION],
            ['fix', types_1.ActionType.FIX_ERROR],
            ['refactor', types_1.ActionType.REFACTOR_CODE],
            ['import', types_1.ActionType.ADD_IMPORT],
            ['remove', types_1.ActionType.REMOVE_CODE],
            ['delete', types_1.ActionType.REMOVE_CODE]
        ]);
    }
    /**
     * Parse code suggestions from Claude's response
     * @param content The full response content from Claude
     * @returns Array of actionable code actions
     */
    async parseCodeSuggestions(content) {
        try {
            const codeBlocks = this.extractCodeBlocks(content);
            const actions = [];
            for (const block of codeBlocks) {
                const actionType = this.detectActionType(block, content);
                const riskLevel = this.estimateRisk({ ...block, type: actionType });
                const action = {
                    id: this.generateActionId(),
                    type: actionType,
                    description: this.generateDescription(block, actionType),
                    targetFile: this.extractTargetFile(block, content),
                    content: block.content,
                    language: block.language,
                    metadata: {
                        confidence: this.calculateConfidence(block, content),
                        riskLevel,
                        estimatedImpact: this.estimateImpact(actionType, block),
                        dependencies: this.extractDependencies(block),
                        backupRequired: riskLevel !== types_1.RiskLevel.LOW,
                        previewAvailable: true
                    }
                };
                // Add target range for modifications
                if (actionType === types_1.ActionType.APPLY_MODIFICATION) {
                    action.targetRange = await this.findTargetRange(block, action.targetFile);
                }
                actions.push(action);
            }
            return this.rankActionsByRelevance(actions);
        }
        catch (error) {
            throw new types_1.ActionException('parseCodeSuggestions', 'Failed to parse code suggestions', error);
        }
    }
    /**
     * Extract code blocks from content
     * @param content Content to parse
     * @returns Array of code blocks
     */
    extractCodeBlocks(content) {
        const blocks = [];
        let match;
        // Reset regex state
        this.codeBlockRegex.lastIndex = 0;
        while ((match = this.codeBlockRegex.exec(content)) !== null) {
            const [fullMatch, language = 'text', description, code] = match;
            // Skip empty or very short code blocks
            if (!code || code.trim().length < 10) {
                continue;
            }
            // Extract filename from description or code
            const filename = this.extractFilename(description, code);
            blocks.push({
                id: this.generateBlockId(),
                language: this.normalizeLanguage(language),
                content: code.trim(),
                startIndex: match.index,
                endIndex: match.index + fullMatch.length,
                filename,
                description: description?.trim(),
                isComplete: this.isCompleteCodeBlock(code, language)
            });
        }
        return blocks;
    }
    /**
     * Detect the most appropriate action type for a code block
     * @param codeBlock The code block to analyze
     * @param context The surrounding context
     * @returns Detected action type
     */
    detectActionType(codeBlock, context) {
        const content = codeBlock.content.toLowerCase();
        const description = (codeBlock.description || '').toLowerCase();
        const contextLower = context.toLowerCase();
        // Check for explicit action keywords in description or context
        for (const [keyword, actionType] of this.actionKeywords) {
            if (description.includes(keyword) || contextLower.includes(keyword)) {
                return actionType;
            }
        }
        // Analyze code content patterns
        if (codeBlock.filename) {
            return types_1.ActionType.CREATE_FILE;
        }
        if (this.isNewFileContent(codeBlock)) {
            return types_1.ActionType.CREATE_FILE;
        }
        if (this.isComponentCode(codeBlock)) {
            return types_1.ActionType.CREATE_COMPONENT;
        }
        if (this.isFunctionCode(codeBlock)) {
            return types_1.ActionType.CREATE_FUNCTION;
        }
        if (this.isClassCode(codeBlock)) {
            return types_1.ActionType.CREATE_CLASS;
        }
        if (this.isImportStatement(codeBlock)) {
            return types_1.ActionType.ADD_IMPORT;
        }
        if (this.isErrorFix(codeBlock, context)) {
            return types_1.ActionType.FIX_ERROR;
        }
        if (this.isRefactoring(codeBlock, context)) {
            return types_1.ActionType.REFACTOR_CODE;
        }
        // Default to modification if we can't determine specific type
        return types_1.ActionType.APPLY_MODIFICATION;
    }
    /**
     * Estimate risk level for an action
     * @param action The action to assess
     * @returns Risk level
     */
    estimateRisk(action) {
        let riskScore = 0;
        // File operations are generally riskier
        if (action.type === types_1.ActionType.CREATE_FILE) {
            riskScore += 1;
        }
        // Modifications to existing files
        if (action.type === types_1.ActionType.APPLY_MODIFICATION) {
            riskScore += 2;
        }
        // Deletions are high risk
        if (action.type === types_1.ActionType.REMOVE_CODE) {
            riskScore += 3;
        }
        // Large code changes
        if (action.content.split('\n').length > 50) {
            riskScore += 2;
        }
        // Critical files (config, package.json, etc.)
        if (action.targetFile && this.isCriticalFile(action.targetFile)) {
            riskScore += 3;
        }
        // System or core modifications
        if (this.isSystemModification(action.content)) {
            riskScore += 2;
        }
        // Convert score to risk level
        if (riskScore <= 2)
            return types_1.RiskLevel.LOW;
        if (riskScore <= 4)
            return types_1.RiskLevel.MEDIUM;
        if (riskScore <= 6)
            return types_1.RiskLevel.HIGH;
        return types_1.RiskLevel.CRITICAL;
    }
    /**
     * Generate a unique action ID
     */
    generateActionId() {
        return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Generate a unique block ID
     */
    generateBlockId() {
        return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Generate description for an action
     */
    generateDescription(block, actionType) {
        if (block.description) {
            return block.description;
        }
        switch (actionType) {
            case types_1.ActionType.CREATE_FILE:
                return `Create new ${block.language} file${block.filename ? `: ${block.filename}` : ''}`;
            case types_1.ActionType.CREATE_FUNCTION:
                return `Create new function`;
            case types_1.ActionType.CREATE_CLASS:
                return `Create new class`;
            case types_1.ActionType.CREATE_COMPONENT:
                return `Create new component`;
            case types_1.ActionType.APPLY_MODIFICATION:
                return `Apply code modification`;
            case types_1.ActionType.FIX_ERROR:
                return `Fix code error`;
            case types_1.ActionType.REFACTOR_CODE:
                return `Refactor code`;
            case types_1.ActionType.ADD_IMPORT:
                return `Add import statement`;
            case types_1.ActionType.REMOVE_CODE:
                return `Remove code`;
            default:
                return `Apply ${actionType}`;
        }
    }
    /**
     * Extract target file from block or context
     */
    extractTargetFile(block, context) {
        if (block.filename) {
            return block.filename;
        }
        // Look for file references in context around the code block
        const contextAroundBlock = this.getContextAroundBlock(context, block);
        const fileMatch = contextAroundBlock.match(this.filePathRegex);
        if (fileMatch) {
            return fileMatch[1];
        }
        // Try to infer from current active file
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && block.language === activeEditor.document.languageId) {
            return activeEditor.document.fileName;
        }
        return undefined;
    }
    /**
     * Extract filename from description or code
     */
    extractFilename(description, code) {
        if (description) {
            const match = description.match(/([^\s\/\\]+\.[a-zA-Z0-9]+)/);
            if (match) {
                return match[1];
            }
        }
        if (code) {
            // Look for filename in comments
            const commentMatch = code.match(/\/\/\s*(?:file|filename|path):\s*([^\s\n]+)/i);
            if (commentMatch) {
                return commentMatch[1];
            }
        }
        return undefined;
    }
    /**
     * Normalize language identifier
     */
    normalizeLanguage(language) {
        const languageMap = {
            'js': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescriptreact',
            'jsx': 'javascriptreact',
            'py': 'python',
            'rb': 'ruby',
            'sh': 'shellscript',
            'bash': 'shellscript',
            'yml': 'yaml'
        };
        return languageMap[language.toLowerCase()] || language.toLowerCase();
    }
    /**
     * Check if code block is complete
     */
    isCompleteCodeBlock(code, language) {
        const trimmed = code.trim();
        // Check for basic completeness indicators
        if (language === 'javascript' || language === 'typescript') {
            // Check for balanced braces
            const openBraces = (trimmed.match(/\{/g) || []).length;
            const closeBraces = (trimmed.match(/\}/g) || []).length;
            return openBraces === closeBraces;
        }
        if (language === 'python') {
            // Python: check for proper indentation and structure
            return !trimmed.endsWith(':') && !trimmed.includes('...');
        }
        // For other languages, assume complete if it's not obviously incomplete
        return !trimmed.endsWith(',') && !trimmed.endsWith('\\');
    }
    /**
     * Check if code represents new file content
     */
    isNewFileContent(block) {
        const content = block.content;
        // Look for file-level constructs
        return content.includes('import ') ||
            content.includes('export ') ||
            content.includes('package ') ||
            content.includes('module.exports') ||
            content.includes('#!/') ||
            content.match(/^(class|interface|function|const|let|var)\s+\w+/m) !== null;
    }
    /**
     * Check if code is a React/Vue component
     */
    isComponentCode(block) {
        const content = block.content;
        return content.includes('React') ||
            content.includes('Component') ||
            content.includes('useState') ||
            content.includes('useEffect') ||
            content.includes('Vue') ||
            content.includes('<template>');
    }
    /**
     * Check if code is a function definition
     */
    isFunctionCode(block) {
        const content = block.content.trim();
        return content.startsWith('function ') ||
            content.startsWith('const ') && content.includes('=>') ||
            content.startsWith('async function') ||
            content.match(/^(export\s+)?(async\s+)?function\s+\w+/m) !== null;
    }
    /**
     * Check if code is a class definition
     */
    isClassCode(block) {
        const content = block.content.trim();
        return content.startsWith('class ') ||
            content.startsWith('export class ') ||
            content.match(/^(export\s+)?class\s+\w+/m) !== null;
    }
    /**
     * Check if code is an import statement
     */
    isImportStatement(block) {
        const content = block.content.trim();
        return content.startsWith('import ') ||
            content.startsWith('from ') ||
            content.includes('require(');
    }
    /**
     * Check if code is an error fix
     */
    isErrorFix(block, context) {
        const contextLower = context.toLowerCase();
        return contextLower.includes('error') ||
            contextLower.includes('fix') ||
            contextLower.includes('bug') ||
            contextLower.includes('issue');
    }
    /**
     * Check if code is a refactoring
     */
    isRefactoring(block, context) {
        const contextLower = context.toLowerCase();
        return contextLower.includes('refactor') ||
            contextLower.includes('improve') ||
            contextLower.includes('optimize') ||
            contextLower.includes('clean up');
    }
    /**
     * Check if file is critical
     */
    isCriticalFile(filePath) {
        const criticalFiles = [
            'package.json',
            'tsconfig.json',
            'webpack.config.js',
            '.env',
            'docker-compose.yml',
            'Dockerfile'
        ];
        return criticalFiles.some(file => filePath.includes(file));
    }
    /**
     * Check if modification affects system code
     */
    isSystemModification(content) {
        const systemKeywords = [
            'process.env',
            'require.cache',
            'global.',
            'window.',
            '__dirname',
            '__filename'
        ];
        return systemKeywords.some(keyword => content.includes(keyword));
    }
    /**
     * Calculate confidence level for action
     */
    calculateConfidence(block, context) {
        let confidence = 0.5; // Base confidence
        // Higher confidence for complete code blocks
        if (block.isComplete) {
            confidence += 0.2;
        }
        // Higher confidence if filename is specified
        if (block.filename) {
            confidence += 0.15;
        }
        // Higher confidence if description is clear
        if (block.description && block.description.length > 10) {
            confidence += 0.1;
        }
        // Higher confidence for common languages
        if (['typescript', 'javascript', 'python'].includes(block.language)) {
            confidence += 0.05;
        }
        return Math.min(1.0, confidence);
    }
    /**
     * Estimate impact of action
     */
    estimateImpact(actionType, block) {
        const lineCount = block.content.split('\n').length;
        switch (actionType) {
            case types_1.ActionType.CREATE_FILE:
                return `Create new file with ${lineCount} lines`;
            case types_1.ActionType.APPLY_MODIFICATION:
                return `Modify existing code (${lineCount} lines)`;
            case types_1.ActionType.CREATE_FUNCTION:
                return `Add new function (${lineCount} lines)`;
            case types_1.ActionType.CREATE_CLASS:
                return `Add new class (${lineCount} lines)`;
            case types_1.ActionType.FIX_ERROR:
                return `Fix error in code (${lineCount} lines affected)`;
            default:
                return `Apply changes (${lineCount} lines)`;
        }
    }
    /**
     * Extract dependencies from code
     */
    extractDependencies(block) {
        const dependencies = [];
        const content = block.content;
        // Extract import dependencies
        const importMatches = content.match(/import\s+.*?from\s+['"`]([^'"`]+)['"`]/g);
        if (importMatches) {
            importMatches.forEach(match => {
                const dep = match.match(/from\s+['"`]([^'"`]+)['"`]/);
                if (dep) {
                    dependencies.push(dep[1]);
                }
            });
        }
        // Extract require dependencies
        const requireMatches = content.match(/require\(['"`]([^'"`]+)['"`]\)/g);
        if (requireMatches) {
            requireMatches.forEach(match => {
                const dep = match.match(/require\(['"`]([^'"`]+)['"`]\)/);
                if (dep) {
                    dependencies.push(dep[1]);
                }
            });
        }
        return [...new Set(dependencies)]; // Remove duplicates
    }
    /**
     * Find target range for modifications
     */
    async findTargetRange(block, targetFile) {
        // This would implement intelligent range finding
        // For now, return null to indicate whole file or append
        return null;
    }
    /**
     * Get context around a code block
     */
    getContextAroundBlock(content, block) {
        const start = Math.max(0, block.startIndex - 200);
        const end = Math.min(content.length, block.endIndex + 200);
        return content.substring(start, end);
    }
    /**
     * Rank actions by relevance
     */
    rankActionsByRelevance(actions) {
        return actions.sort((a, b) => {
            // Prioritize by confidence
            if (a.metadata.confidence !== b.metadata.confidence) {
                return b.metadata.confidence - a.metadata.confidence;
            }
            // Then by risk level (lower risk first)
            const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
            return riskOrder[a.metadata.riskLevel] - riskOrder[b.metadata.riskLevel];
        });
    }
}
exports.CodeParser = CodeParser;
//# sourceMappingURL=codeParser.js.map