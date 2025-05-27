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
exports.FileCreator = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const types_1 = require("./types");
/**
 * Creates new files based on code actions
 * Handles file path suggestion, validation, and creation
 */
class FileCreator {
    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }
    /**
     * Create a new file based on action
     * @param action The action containing file creation details
     * @returns Result of file creation
     */
    async createFile(action) {
        try {
            // Determine target file path
            const targetPath = action.targetFile || this.suggestFilePath(action.content, action.language);
            // Validate file path
            const validation = this.validateFilePath(targetPath);
            if (!validation.isValid) {
                return {
                    success: false,
                    message: 'File path validation failed',
                    filesModified: [],
                    filesCreated: [],
                    errors: validation.errors,
                    warnings: validation.warnings
                };
            }
            // Ensure directory exists
            await this.ensureDirectoryExists(targetPath);
            // Check if file already exists
            const fileExists = await this.fileExists(targetPath);
            if (fileExists) {
                const overwrite = await this.confirmOverwrite(targetPath);
                if (!overwrite) {
                    return {
                        success: false,
                        message: 'File creation cancelled - file already exists',
                        filesModified: [],
                        filesCreated: [],
                        errors: [],
                        warnings: ['File already exists']
                    };
                }
            }
            // Prepare file content
            const finalContent = this.prepareFileContent(action);
            // Create the file
            const uri = vscode.Uri.file(targetPath);
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(uri, encoder.encode(finalContent));
            // Open the created file
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            return {
                success: true,
                message: `File created successfully: ${path.basename(targetPath)}`,
                filesModified: [],
                filesCreated: [targetPath],
                errors: [],
                warnings: validation.warnings
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                filesModified: [],
                filesCreated: [],
                errors: [error instanceof Error ? error.message : 'Unknown error'],
                warnings: []
            };
        }
    }
    /**
     * Suggest an appropriate file path based on content and language
     * @param content The file content
     * @param language The programming language
     * @returns Suggested file path
     */
    suggestFilePath(content, language) {
        try {
            // Extract name from content
            const suggestedName = this.extractNameFromContent(content, language);
            // Get appropriate extension
            const extension = this.getExtensionForLanguage(language);
            // Determine appropriate directory
            const directory = this.suggestDirectory(content, language);
            // Combine into full path
            const fileName = `${suggestedName}${extension}`;
            const fullPath = path.join(this.workspaceRoot, directory, fileName);
            return fullPath;
        }
        catch (error) {
            // Fallback to generic name
            const extension = this.getExtensionForLanguage(language);
            return path.join(this.workspaceRoot, `newFile${extension}`);
        }
    }
    /**
     * Validate a file path
     * @param filePath The file path to validate
     * @returns Validation result
     */
    validateFilePath(filePath) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        try {
            // Check if path is absolute or relative
            if (!path.isAbsolute(filePath)) {
                filePath = path.resolve(this.workspaceRoot, filePath);
            }
            // Check if path is within workspace
            if (!filePath.startsWith(this.workspaceRoot)) {
                errors.push('File path must be within the workspace');
            }
            // Check file name validity
            const fileName = path.basename(filePath);
            if (!this.isValidFileName(fileName)) {
                errors.push('Invalid file name - contains illegal characters');
            }
            // Check extension
            const extension = path.extname(filePath);
            if (!extension) {
                warnings.push('No file extension specified');
                suggestions.push('Consider adding an appropriate file extension');
            }
            // Check directory depth
            const relativePath = path.relative(this.workspaceRoot, filePath);
            const depth = relativePath.split(path.sep).length;
            if (depth > 10) {
                warnings.push('File path is very deep - consider a shorter path');
            }
            // Check for common naming conventions
            if (fileName.includes(' ')) {
                warnings.push('File name contains spaces - consider using camelCase or kebab-case');
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                suggestions,
                canProceed: errors.length === 0
            };
        }
        catch (error) {
            return {
                isValid: false,
                errors: [`Path validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
                warnings,
                suggestions,
                canProceed: false
            };
        }
    }
    /**
     * Ensure directory exists for file path
     * @param filePath The file path
     */
    async ensureDirectoryExists(filePath) {
        try {
            const directory = path.dirname(filePath);
            const uri = vscode.Uri.file(directory);
            try {
                await vscode.workspace.fs.stat(uri);
            }
            catch {
                // Directory doesn't exist, create it
                await vscode.workspace.fs.createDirectory(uri);
            }
        }
        catch (error) {
            throw new types_1.ActionException('ensureDirectoryExists', `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
        }
    }
    /**
     * Extract name from content based on language
     */
    extractNameFromContent(content, language) {
        try {
            // Try to extract class name
            const classMatch = content.match(/(?:export\s+)?class\s+(\w+)/);
            if (classMatch) {
                return classMatch[1];
            }
            // Try to extract function name
            const functionMatch = content.match(/(?:export\s+)?(?:function\s+(\w+)|const\s+(\w+)\s*=)/);
            if (functionMatch) {
                return functionMatch[1] || functionMatch[2];
            }
            // Try to extract component name (React)
            const componentMatch = content.match(/(?:export\s+)?(?:const|function)\s+(\w+).*?(?:React\.FC|JSX\.Element)/);
            if (componentMatch) {
                return componentMatch[1];
            }
            // Try to extract interface name
            const interfaceMatch = content.match(/(?:export\s+)?interface\s+(\w+)/);
            if (interfaceMatch) {
                return interfaceMatch[1];
            }
            // Try to extract type name
            const typeMatch = content.match(/(?:export\s+)?type\s+(\w+)/);
            if (typeMatch) {
                return typeMatch[1];
            }
            // Try to extract module name from comments
            const moduleMatch = content.match(/\/\*\*?\s*@?(?:module|file|name)\s+(\w+)/i);
            if (moduleMatch) {
                return moduleMatch[1];
            }
            // Fallback to generic name based on content type
            if (content.includes('class '))
                return 'NewClass';
            if (content.includes('function ') || content.includes('=>'))
                return 'newFunction';
            if (content.includes('interface '))
                return 'NewInterface';
            if (content.includes('type '))
                return 'NewType';
            if (content.includes('React') || content.includes('JSX'))
                return 'NewComponent';
            return 'newFile';
        }
        catch (error) {
            return 'newFile';
        }
    }
    /**
     * Get file extension for language
     */
    getExtensionForLanguage(language) {
        const extensionMap = {
            'typescript': '.ts',
            'typescriptreact': '.tsx',
            'javascript': '.js',
            'javascriptreact': '.jsx',
            'python': '.py',
            'java': '.java',
            'csharp': '.cs',
            'cpp': '.cpp',
            'c': '.c',
            'go': '.go',
            'rust': '.rs',
            'php': '.php',
            'ruby': '.rb',
            'swift': '.swift',
            'kotlin': '.kt',
            'scala': '.scala',
            'html': '.html',
            'css': '.css',
            'scss': '.scss',
            'less': '.less',
            'json': '.json',
            'yaml': '.yaml',
            'xml': '.xml',
            'markdown': '.md',
            'sql': '.sql',
            'shell': '.sh',
            'powershell': '.ps1'
        };
        return extensionMap[language.toLowerCase()] || '.txt';
    }
    /**
     * Suggest appropriate directory based on content and language
     */
    suggestDirectory(content, language) {
        // Check for specific patterns in content
        if (content.includes('React') || content.includes('Component') || content.includes('JSX')) {
            return 'src/components';
        }
        if (content.includes('test') || content.includes('spec') || content.includes('describe(')) {
            return 'src/tests';
        }
        if (content.includes('interface ') || content.includes('type ')) {
            return 'src/types';
        }
        if (content.includes('class ') && (content.includes('Service') || content.includes('Manager'))) {
            return 'src/services';
        }
        if (content.includes('function ') && (content.includes('util') || content.includes('helper'))) {
            return 'src/utils';
        }
        if (content.includes('const ') && content.includes('=')) {
            return 'src/constants';
        }
        // Language-specific defaults
        switch (language.toLowerCase()) {
            case 'typescript':
            case 'typescriptreact':
            case 'javascript':
            case 'javascriptreact':
                return 'src';
            case 'python':
                return 'src';
            case 'java':
                return 'src/main/java';
            case 'csharp':
                return 'src';
            case 'css':
            case 'scss':
            case 'less':
                return 'src/styles';
            case 'html':
                return 'public';
            case 'json':
                return 'config';
            case 'markdown':
                return 'docs';
            default:
                return 'src';
        }
    }
    /**
     * Check if file name is valid
     */
    isValidFileName(fileName) {
        // Check for illegal characters
        const illegalChars = /[<>:"/\\|?*\x00-\x1f]/;
        if (illegalChars.test(fileName)) {
            return false;
        }
        // Check for reserved names (Windows)
        const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        const nameWithoutExt = path.parse(fileName).name.toUpperCase();
        if (reservedNames.includes(nameWithoutExt)) {
            return false;
        }
        // Check length
        if (fileName.length > 255) {
            return false;
        }
        return true;
    }
    /**
     * Check if file exists
     */
    async fileExists(filePath) {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.workspace.fs.stat(uri);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Confirm file overwrite
     */
    async confirmOverwrite(filePath) {
        const fileName = path.basename(filePath);
        const result = await vscode.window.showWarningMessage(`File "${fileName}" already exists. Do you want to overwrite it?`, { modal: true }, 'Overwrite', 'Cancel');
        return result === 'Overwrite';
    }
    /**
     * Prepare final file content with proper formatting
     */
    prepareFileContent(action) {
        let content = action.content;
        // Add file header comment if appropriate
        if (this.shouldAddFileHeader(action)) {
            const header = this.generateFileHeader(action);
            content = header + '\n\n' + content;
        }
        // Ensure proper line endings
        content = content.replace(/\r\n/g, '\n');
        // Ensure file ends with newline
        if (!content.endsWith('\n')) {
            content += '\n';
        }
        return content;
    }
    /**
     * Check if file header should be added
     */
    shouldAddFileHeader(action) {
        // Don't add header if content already has one
        if (action.content.startsWith('/**') || action.content.startsWith('/*') || action.content.startsWith('//')) {
            return false;
        }
        // Add header for certain file types
        const headerLanguages = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact', 'java', 'csharp'];
        return headerLanguages.includes(action.language.toLowerCase());
    }
    /**
     * Generate file header comment
     */
    generateFileHeader(action) {
        const fileName = action.targetFile ? path.basename(action.targetFile) : 'newFile';
        const date = new Date().toISOString().split('T')[0];
        return `/**
 * ${fileName}
 * 
 * ${action.description}
 * 
 * Created: ${date}
 * Generated by Code Assistant AI
 */`;
    }
}
exports.FileCreator = FileCreator;
//# sourceMappingURL=fileCreator.js.map