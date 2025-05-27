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
exports.ContextPreview = void 0;
const path = __importStar(require("path"));
const types_1 = require("./types");
/**
 * Generates previews and statistics for context before sending to AI
 * Helps users understand what context will be sent and make adjustments
 */
class ContextPreview {
    constructor() {
        this.tokensPerCharacter = 0.25;
    }
    /**
     * Generate comprehensive preview of context
     * @param context Array of context strings
     * @returns Preview data with summary and file details
     */
    generatePreview(context) {
        try {
            const files = this.parseContextFiles(context);
            const summary = this.generateSummary(files);
            const totalTokens = this.calculateTotalTokens(context);
            const estimatedCost = this.estimateCost(totalTokens);
            return {
                summary,
                files,
                totalTokens,
                estimatedCost
            };
        }
        catch (error) {
            throw new types_1.ContextException('generatePreview', 'Failed to generate context preview', error);
        }
    }
    /**
     * Format preview data for display
     * @param preview Preview data to format
     * @returns Formatted string for display
     */
    formatForDisplay(preview) {
        try {
            const lines = [];
            // Header
            lines.push('📋 Context Preview');
            lines.push('═'.repeat(50));
            lines.push('');
            // Summary
            lines.push('📊 Summary:');
            lines.push(`   Files: ${preview.summary.totalFiles}`);
            lines.push(`   Languages: ${preview.summary.languages.join(', ')}`);
            lines.push(`   Topics: ${preview.summary.mainTopics.join(', ')}`);
            lines.push(`   Complexity: ${this.formatComplexity(preview.summary.complexity)}`);
            lines.push(`   Relevance: ${(preview.summary.relevanceScore * 100).toFixed(1)}%`);
            lines.push('');
            // Token usage
            lines.push('🎯 Token Usage:');
            lines.push(`   Total Tokens: ${preview.totalTokens.toLocaleString()}`);
            lines.push(`   Estimated Cost: $${preview.estimatedCost.toFixed(4)}`);
            lines.push('');
            // File breakdown
            lines.push('📁 Files Included:');
            const includedFiles = preview.files.filter(f => f.included);
            const excludedFiles = preview.files.filter(f => !f.included);
            if (includedFiles.length > 0) {
                lines.push('   ✅ Included:');
                for (const file of includedFiles.slice(0, 10)) { // Show top 10
                    const fileName = path.basename(file.filePath);
                    const relevanceBar = this.createRelevanceBar(file.relevance);
                    lines.push(`      ${fileName} (${file.tokens} tokens) ${relevanceBar}`);
                    if (file.preview) {
                        lines.push(`         Preview: ${file.preview.substring(0, 60)}...`);
                    }
                }
                if (includedFiles.length > 10) {
                    lines.push(`      ... and ${includedFiles.length - 10} more files`);
                }
            }
            if (excludedFiles.length > 0) {
                lines.push('');
                lines.push('   ❌ Excluded:');
                for (const file of excludedFiles.slice(0, 5)) { // Show top 5 excluded
                    const fileName = path.basename(file.filePath);
                    lines.push(`      ${fileName} - ${file.reason}`);
                }
                if (excludedFiles.length > 5) {
                    lines.push(`      ... and ${excludedFiles.length - 5} more files`);
                }
            }
            // Recommendations
            lines.push('');
            lines.push('💡 Recommendations:');
            const recommendations = this.generateRecommendations(preview);
            for (const rec of recommendations) {
                lines.push(`   • ${rec}`);
            }
            return lines.join('\n');
        }
        catch (error) {
            throw new types_1.ContextException('formatForDisplay', 'Failed to format preview for display', error);
        }
    }
    /**
     * Get detailed statistics about context
     * @param context Array of context strings
     * @returns Detailed context statistics
     */
    getContextStats(context) {
        try {
            const files = this.parseContextFiles(context);
            const totalTokens = this.calculateTotalTokens(context);
            const totalLines = context.reduce((sum, content) => sum + content.split('\n').length, 0);
            // Language distribution
            const languageDistribution = {};
            const fileTypeDistribution = {};
            let totalRelevance = 0;
            for (const file of files) {
                // Language distribution
                languageDistribution[file.language] = (languageDistribution[file.language] || 0) + 1;
                // File type distribution
                const ext = path.extname(file.filePath) || 'no-extension';
                fileTypeDistribution[ext] = (fileTypeDistribution[ext] || 0) + 1;
                totalRelevance += file.relevance;
            }
            const averageRelevance = files.length > 0 ? totalRelevance / files.length : 0;
            // Largest files by token count
            const largestFiles = files
                .sort((a, b) => b.tokens - a.tokens)
                .slice(0, 5)
                .map(file => ({
                path: path.basename(file.filePath),
                tokens: file.tokens
            }));
            return {
                totalFiles: files.length,
                totalLines,
                totalTokens,
                averageRelevance,
                languageDistribution,
                fileTypeDistribution,
                largestFiles
            };
        }
        catch (error) {
            throw new types_1.ContextException('getContextStats', 'Failed to get context statistics', error);
        }
    }
    /**
     * Generate quick summary for UI display
     * @param context Array of context strings
     * @returns Quick summary string
     */
    generateQuickSummary(context) {
        try {
            const stats = this.getContextStats(context);
            const languages = Object.keys(stats.languageDistribution).slice(0, 3);
            return `${stats.totalFiles} files, ${stats.totalTokens.toLocaleString()} tokens, ${languages.join('/')}`;
        }
        catch (error) {
            return 'Unable to generate summary';
        }
    }
    /**
     * Check if context is within recommended limits
     * @param context Array of context strings
     * @param maxTokens Maximum recommended tokens
     * @returns Warning information
     */
    checkContextLimits(context, maxTokens) {
        const warnings = [];
        const suggestions = [];
        const totalTokens = this.calculateTotalTokens(context);
        const isWithinLimits = totalTokens <= maxTokens;
        if (!isWithinLimits) {
            warnings.push(`Context exceeds recommended limit by ${(totalTokens - maxTokens).toLocaleString()} tokens`);
            suggestions.push('Consider filtering by language or file type');
            suggestions.push('Exclude large or less relevant files');
        }
        const files = this.parseContextFiles(context);
        const largeFiles = files.filter(f => f.tokens > 1000);
        if (largeFiles.length > 0) {
            warnings.push(`${largeFiles.length} files are very large (>1000 tokens each)`);
            suggestions.push('Consider truncating large files');
        }
        const lowRelevanceFiles = files.filter(f => f.relevance < 0.3);
        if (lowRelevanceFiles.length > 0) {
            warnings.push(`${lowRelevanceFiles.length} files have low relevance (<30%)`);
            suggestions.push('Consider increasing relevance threshold');
        }
        return {
            isWithinLimits,
            warnings,
            suggestions
        };
    }
    /**
     * Parse context strings into file information
     */
    parseContextFiles(context) {
        const files = [];
        for (const content of context) {
            const fileInfo = this.extractFileInfo(content);
            if (fileInfo) {
                files.push(fileInfo);
            }
        }
        return files;
    }
    /**
     * Extract file information from context string
     */
    extractFileInfo(content) {
        try {
            const lines = content.split('\n');
            const firstLine = lines[0];
            // Parse file header: // File: filename.ts (Lines 1-50)
            const fileMatch = firstLine.match(/\/\/ File: (.+?) \(Lines (\d+)-(\d+)\)/);
            if (!fileMatch) {
                return null;
            }
            const filePath = fileMatch[1];
            const startLine = parseInt(fileMatch[2]);
            const endLine = parseInt(fileMatch[3]);
            const lineCount = endLine - startLine + 1;
            // Parse relevance: // Relevance: 85.2% [S:90% T:80% P:85% C:85%]
            let relevance = 0.5; // Default
            const relevanceMatch = content.match(/\/\/ Relevance: ([\d.]+)%/);
            if (relevanceMatch) {
                relevance = parseFloat(relevanceMatch[1]) / 100;
            }
            // Detect language from file extension
            const language = this.detectLanguageFromPath(filePath);
            // Calculate tokens
            const tokens = this.estimateTokenCount(content);
            // Generate preview (first few lines of actual code)
            const codeLines = lines.slice(2).filter(line => !line.startsWith('//')); // Skip headers and comments
            const preview = codeLines.slice(0, 3).join(' ').substring(0, 100);
            return {
                filePath,
                language,
                lines: lineCount,
                tokens,
                relevance,
                preview,
                included: true, // Assume included if in context
                reason: relevance > 0.5 ? 'High relevance' : 'Included in context'
            };
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Generate summary from file information
     */
    generateSummary(files) {
        const languages = [...new Set(files.map(f => f.language))];
        const totalRelevance = files.reduce((sum, f) => sum + f.relevance, 0);
        const averageRelevance = files.length > 0 ? totalRelevance / files.length : 0;
        // Extract main topics from file names and content
        const topics = this.extractMainTopics(files);
        // Determine complexity
        const complexity = this.determineComplexity(files);
        return {
            totalFiles: files.length,
            languages,
            mainTopics: topics,
            complexity,
            relevanceScore: averageRelevance
        };
    }
    /**
     * Extract main topics from files
     */
    extractMainTopics(files) {
        const topics = new Set();
        for (const file of files) {
            const fileName = path.basename(file.filePath, path.extname(file.filePath));
            // Extract topics from file names
            if (fileName.includes('auth'))
                topics.add('Authentication');
            if (fileName.includes('user'))
                topics.add('User Management');
            if (fileName.includes('api'))
                topics.add('API');
            if (fileName.includes('component'))
                topics.add('Components');
            if (fileName.includes('util') || fileName.includes('helper'))
                topics.add('Utilities');
            if (fileName.includes('test') || fileName.includes('spec'))
                topics.add('Testing');
            if (fileName.includes('config'))
                topics.add('Configuration');
            if (fileName.includes('db') || fileName.includes('database'))
                topics.add('Database');
            // Extract from file path
            const pathParts = file.filePath.split('/');
            for (const part of pathParts) {
                if (part === 'components')
                    topics.add('Components');
                if (part === 'services')
                    topics.add('Services');
                if (part === 'utils')
                    topics.add('Utilities');
                if (part === 'types')
                    topics.add('Type Definitions');
                if (part === 'hooks')
                    topics.add('React Hooks');
            }
        }
        return Array.from(topics).slice(0, 5); // Top 5 topics
    }
    /**
     * Determine complexity level
     */
    determineComplexity(files) {
        const totalFiles = files.length;
        const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);
        const languages = new Set(files.map(f => f.language)).size;
        if (totalFiles <= 3 && totalTokens <= 1000 && languages <= 2) {
            return types_1.ContextComplexity.SIMPLE;
        }
        else if (totalFiles <= 8 && totalTokens <= 5000 && languages <= 3) {
            return types_1.ContextComplexity.MODERATE;
        }
        else if (totalFiles <= 15 && totalTokens <= 15000 && languages <= 5) {
            return types_1.ContextComplexity.COMPLEX;
        }
        else {
            return types_1.ContextComplexity.VERY_COMPLEX;
        }
    }
    /**
     * Calculate total tokens for context
     */
    calculateTotalTokens(context) {
        return context.reduce((sum, content) => sum + this.estimateTokenCount(content), 0);
    }
    /**
     * Estimate token count for content
     */
    estimateTokenCount(content) {
        return Math.ceil(content.length * this.tokensPerCharacter);
    }
    /**
     * Estimate cost based on token count
     */
    estimateCost(tokens) {
        // Rough estimate based on Claude pricing (adjust as needed)
        const costPerToken = 0.000008; // $8 per million tokens
        return tokens * costPerToken;
    }
    /**
     * Detect language from file path
     */
    detectLanguageFromPath(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const languageMap = {
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript React',
            '.js': 'JavaScript',
            '.jsx': 'JavaScript React',
            '.py': 'Python',
            '.java': 'Java',
            '.cs': 'C#',
            '.cpp': 'C++',
            '.c': 'C',
            '.go': 'Go',
            '.rs': 'Rust',
            '.php': 'PHP',
            '.rb': 'Ruby',
            '.swift': 'Swift',
            '.kt': 'Kotlin',
            '.scala': 'Scala',
            '.html': 'HTML',
            '.css': 'CSS',
            '.scss': 'SCSS',
            '.json': 'JSON',
            '.yaml': 'YAML',
            '.yml': 'YAML',
            '.md': 'Markdown'
        };
        return languageMap[ext] || 'Unknown';
    }
    /**
     * Create visual relevance bar
     */
    createRelevanceBar(relevance) {
        const barLength = 10;
        const filledLength = Math.round(relevance * barLength);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        return `${bar} ${(relevance * 100).toFixed(0)}%`;
    }
    /**
     * Format complexity for display
     */
    formatComplexity(complexity) {
        const icons = {
            [types_1.ContextComplexity.SIMPLE]: '🟢 Simple',
            [types_1.ContextComplexity.MODERATE]: '🟡 Moderate',
            [types_1.ContextComplexity.COMPLEX]: '🟠 Complex',
            [types_1.ContextComplexity.VERY_COMPLEX]: '🔴 Very Complex'
        };
        return icons[complexity] || complexity;
    }
    /**
     * Generate recommendations based on preview
     */
    generateRecommendations(preview) {
        const recommendations = [];
        if (preview.totalTokens > 10000) {
            recommendations.push('Consider reducing context size to improve response speed');
        }
        if (preview.summary.complexity === types_1.ContextComplexity.VERY_COMPLEX) {
            recommendations.push('Context is very complex - consider focusing on specific areas');
        }
        if (preview.summary.relevanceScore < 0.5) {
            recommendations.push('Average relevance is low - consider filtering for more relevant files');
        }
        const excludedFiles = preview.files.filter(f => !f.included);
        if (excludedFiles.length > 0) {
            recommendations.push(`${excludedFiles.length} files were excluded - review if any are important`);
        }
        if (preview.summary.languages.length > 5) {
            recommendations.push('Many languages detected - consider filtering by primary language');
        }
        if (recommendations.length === 0) {
            recommendations.push('Context looks good! Ready to send to AI assistant.');
        }
        return recommendations;
    }
}
exports.ContextPreview = ContextPreview;
//# sourceMappingURL=contextPreview.js.map