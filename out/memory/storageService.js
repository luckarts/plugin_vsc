"use strict";
/**
 * Storage service for the intelligent memory system
 * Handles persistent storage of memories using VSCode's file system API
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
exports.StorageService = void 0;
const vscode = __importStar(require("vscode"));
const types_1 = require("./types");
const config_1 = require("./config");
class StorageService {
    constructor(globalStorageUri) {
        this.memoryIndex = new Map();
        this.isInitialized = false;
        this.storageUri = vscode.Uri.joinPath(globalStorageUri, 'intelligent-memories');
        this.memoriesUri = vscode.Uri.joinPath(this.storageUri, config_1.STORAGE_CONFIG.directories.memories);
        this.backupsUri = vscode.Uri.joinPath(this.storageUri, config_1.STORAGE_CONFIG.directories.backups);
        this.indexUri = vscode.Uri.joinPath(this.storageUri, config_1.STORAGE_CONFIG.fileNames.memoriesIndex);
    }
    /**
     * Initialize the storage service
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            // Create directory structure
            await this.ensureDirectoryExists(this.storageUri);
            await this.ensureDirectoryExists(this.memoriesUri);
            await this.ensureDirectoryExists(this.backupsUri);
            // Load existing index
            await this.loadIndex();
            this.isInitialized = true;
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to initialize storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Save a memory to storage
     */
    async save(memory) {
        await this.ensureInitialized();
        try {
            // Validate memory
            this.validateMemory(memory);
            // Save memory file
            const memoryUri = vscode.Uri.joinPath(this.memoriesUri, config_1.STORAGE_CONFIG.fileNames.memoryFile(memory.id));
            const memoryData = JSON.stringify(memory, null, 2);
            await vscode.workspace.fs.writeFile(memoryUri, new TextEncoder().encode(memoryData));
            // Update index
            this.memoryIndex.set(memory.id, memory);
            await this.saveIndex();
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to save memory ${memory.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Load a memory by ID
     */
    async load(id) {
        await this.ensureInitialized();
        try {
            // Check index first
            const indexedMemory = this.memoryIndex.get(id);
            if (!indexedMemory) {
                return null;
            }
            // Load from file
            const memoryUri = vscode.Uri.joinPath(this.memoriesUri, config_1.STORAGE_CONFIG.fileNames.memoryFile(id));
            const data = await vscode.workspace.fs.readFile(memoryUri);
            const memory = JSON.parse(new TextDecoder().decode(data));
            // Update last accessed
            memory.metadata.lastAccessed = new Date();
            memory.metadata.accessCount = (memory.metadata.accessCount || 0) + 1;
            // Save updated metadata
            await this.save(memory);
            return memory;
        }
        catch (error) {
            console.warn(`Failed to load memory ${id}:`, error);
            return null;
        }
    }
    /**
     * Load all memories
     */
    async loadAll() {
        await this.ensureInitialized();
        const memories = [];
        for (const [id, indexedMemory] of this.memoryIndex) {
            try {
                const memory = await this.load(id);
                if (memory) {
                    memories.push(memory);
                }
            }
            catch (error) {
                console.warn(`Failed to load memory ${id}:`, error);
                // Remove from index if file doesn't exist
                this.memoryIndex.delete(id);
            }
        }
        // Save cleaned index
        await this.saveIndex();
        return memories;
    }
    /**
     * Delete a memory
     */
    async delete(id) {
        await this.ensureInitialized();
        try {
            // Remove from index
            this.memoryIndex.delete(id);
            // Delete file
            const memoryUri = vscode.Uri.joinPath(this.memoriesUri, config_1.STORAGE_CONFIG.fileNames.memoryFile(id));
            try {
                await vscode.workspace.fs.delete(memoryUri);
            }
            catch (error) {
                // File might not exist, that's okay
                console.warn(`Memory file ${id} not found during deletion:`, error);
            }
            // Save updated index
            await this.saveIndex();
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to delete memory ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Search memories
     */
    async search(query, filters) {
        await this.ensureInitialized();
        const memories = await this.loadAll();
        const results = [];
        const queryLower = query.toLowerCase();
        for (const memory of memories) {
            // Apply filters
            if (!this.matchesFilters(memory, filters)) {
                continue;
            }
            // Calculate relevance score
            const relevanceScore = this.calculateRelevanceScore(memory, queryLower);
            if (relevanceScore > 0) {
                results.push({
                    memory,
                    relevanceScore,
                    matchedFields: this.getMatchedFields(memory, queryLower),
                    snippet: this.generateSnippet(memory.content, queryLower)
                });
            }
        }
        // Sort by relevance score
        results.sort((a, b) => b.relevanceScore - a.relevanceScore);
        return results;
    }
    /**
     * Get storage statistics
     */
    async getStats() {
        await this.ensureInitialized();
        const memories = await this.loadAll();
        const totalSize = memories.reduce((sum, memory) => sum + memory.size, 0);
        const compressedCount = memories.filter(memory => memory.compressed).length;
        const memoryByType = {
            [types_1.MemoryType.PERSONAL]: 0,
            [types_1.MemoryType.REPOSITORY]: 0,
            [types_1.MemoryType.GUIDELINE]: 0,
            [types_1.MemoryType.SESSION]: 0
        };
        let oldestMemory;
        let newestMemory;
        for (const memory of memories) {
            memoryByType[memory.type]++;
            if (!oldestMemory || memory.timestamp < oldestMemory) {
                oldestMemory = memory.timestamp;
            }
            if (!newestMemory || memory.timestamp > newestMemory) {
                newestMemory = memory.timestamp;
            }
        }
        return {
            totalMemories: memories.length,
            totalSize,
            compressedCount,
            compressionRatio: totalSize > 0 ? compressedCount / memories.length : 0,
            memoryByType,
            averageSize: memories.length > 0 ? totalSize / memories.length : 0,
            oldestMemory,
            newestMemory
        };
    }
    /**
     * Create a backup
     */
    async backup() {
        await this.ensureInitialized();
        const memories = await this.loadAll();
        const stats = await this.getStats();
        const timestamp = new Date();
        const backup = {
            version: '1.0.0',
            timestamp,
            memories,
            stats,
            checksum: this.calculateChecksum(memories)
        };
        // Save backup file
        const backupUri = vscode.Uri.joinPath(this.backupsUri, config_1.STORAGE_CONFIG.fileNames.backupFile(timestamp.toISOString().replace(/[:.]/g, '-')));
        const backupData = JSON.stringify(backup, null, 2);
        await vscode.workspace.fs.writeFile(backupUri, new TextEncoder().encode(backupData));
        // Clean old backups
        await this.cleanOldBackups();
        return backup;
    }
    /**
     * Restore from backup
     */
    async restore(backup) {
        await this.ensureInitialized();
        let imported = 0;
        let skipped = 0;
        let duplicates = 0;
        const errors = [];
        // Verify checksum
        const calculatedChecksum = this.calculateChecksum(backup.memories);
        if (calculatedChecksum !== backup.checksum) {
            errors.push('Backup checksum verification failed');
        }
        for (const memory of backup.memories) {
            try {
                // Check if memory already exists
                const existing = await this.load(memory.id);
                if (existing) {
                    duplicates++;
                    skipped++;
                    continue;
                }
                // Validate and save
                this.validateMemory(memory);
                await this.save(memory);
                imported++;
            }
            catch (error) {
                errors.push(`Failed to restore memory ${memory.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                skipped++;
            }
        }
        return { imported, skipped, errors, duplicates };
    }
    /**
     * Clear all memories
     */
    async clear() {
        await this.ensureInitialized();
        try {
            // Clear index
            this.memoryIndex.clear();
            // Delete all memory files
            try {
                await vscode.workspace.fs.delete(this.memoriesUri, { recursive: true });
                await this.ensureDirectoryExists(this.memoriesUri);
            }
            catch (error) {
                console.warn('Failed to delete memories directory:', error);
            }
            // Save empty index
            await this.saveIndex();
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to clear storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // Private helper methods
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initialize();
        }
    }
    async ensureDirectoryExists(uri) {
        try {
            await vscode.workspace.fs.stat(uri);
        }
        catch {
            await vscode.workspace.fs.createDirectory(uri);
        }
    }
    validateMemory(memory) {
        if (!memory.id || typeof memory.id !== 'string') {
            throw new types_1.StorageError('Memory must have a valid ID');
        }
        if (!memory.content || typeof memory.content !== 'string') {
            throw new types_1.StorageError('Memory must have valid content');
        }
        if (memory.content.length < config_1.VALIDATION_CONFIG.memory.minContentLength) {
            throw new types_1.StorageError(`Memory content too short (minimum ${config_1.VALIDATION_CONFIG.memory.minContentLength} characters)`);
        }
        if (memory.content.length > config_1.VALIDATION_CONFIG.memory.maxContentLength) {
            throw new types_1.StorageError(`Memory content too long (maximum ${config_1.VALIDATION_CONFIG.memory.maxContentLength} characters)`);
        }
        if (!Object.values(types_1.MemoryType).includes(memory.type)) {
            throw new types_1.StorageError('Memory must have a valid type');
        }
    }
    async loadIndex() {
        try {
            const data = await vscode.workspace.fs.readFile(this.indexUri);
            const indexData = JSON.parse(new TextDecoder().decode(data));
            this.memoryIndex.clear();
            for (const [id, memory] of Object.entries(indexData)) {
                this.memoryIndex.set(id, memory);
            }
        }
        catch (error) {
            // Index doesn't exist yet, that's okay
            this.memoryIndex.clear();
        }
    }
    async saveIndex() {
        const indexData = Object.fromEntries(this.memoryIndex);
        const data = JSON.stringify(indexData, null, 2);
        await vscode.workspace.fs.writeFile(this.indexUri, new TextEncoder().encode(data));
    }
    matchesFilters(memory, filters) {
        if (!filters) {
            return true;
        }
        if (filters.type && memory.type !== filters.type) {
            return false;
        }
        if (filters.tags && filters.tags.length > 0) {
            const hasMatchingTag = filters.tags.some(tag => memory.tags.includes(tag));
            if (!hasMatchingTag) {
                return false;
            }
        }
        if (filters.compressed !== undefined && memory.compressed !== filters.compressed) {
            return false;
        }
        if (filters.dateRange) {
            if (memory.timestamp < filters.dateRange.start || memory.timestamp > filters.dateRange.end) {
                return false;
            }
        }
        if (filters.sizeRange) {
            if (memory.size < filters.sizeRange.min || memory.size > filters.sizeRange.max) {
                return false;
            }
        }
        return true;
    }
    calculateRelevanceScore(memory, query) {
        let score = 0;
        // Content match
        if (memory.content.toLowerCase().includes(query)) {
            score += 1.0;
        }
        // Tag matches
        for (const tag of memory.tags) {
            if (tag.toLowerCase().includes(query)) {
                score += 2.0; // Tags are more important
            }
        }
        // Metadata matches
        if (memory.metadata.category?.toLowerCase().includes(query)) {
            score += 1.5;
        }
        if (memory.metadata.language?.toLowerCase().includes(query)) {
            score += 1.5;
        }
        return score;
    }
    getMatchedFields(memory, query) {
        const fields = [];
        if (memory.content.toLowerCase().includes(query)) {
            fields.push('content');
        }
        if (memory.tags.some(tag => tag.toLowerCase().includes(query))) {
            fields.push('tags');
        }
        if (memory.metadata.category?.toLowerCase().includes(query)) {
            fields.push('category');
        }
        if (memory.metadata.language?.toLowerCase().includes(query)) {
            fields.push('language');
        }
        return fields;
    }
    generateSnippet(content, query) {
        const index = content.toLowerCase().indexOf(query);
        if (index === -1) {
            return content.substring(0, 100) + '...';
        }
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + query.length + 50);
        return (start > 0 ? '...' : '') +
            content.substring(start, end) +
            (end < content.length ? '...' : '');
    }
    calculateChecksum(memories) {
        const data = memories.map(m => `${m.id}:${m.content}:${m.timestamp.toISOString()}`).join('|');
        // Simple checksum - in production, use a proper hash function
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }
    async cleanOldBackups() {
        try {
            const backupFiles = await vscode.workspace.fs.readDirectory(this.backupsUri);
            const backupEntries = backupFiles
                .filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.json'))
                .sort(([a], [b]) => b.localeCompare(a)); // Sort by name (newest first)
            // Keep only the most recent backups
            const toDelete = backupEntries.slice(config_1.STORAGE_CONFIG.backup.maxBackups);
            for (const [name] of toDelete) {
                const backupUri = vscode.Uri.joinPath(this.backupsUri, name);
                await vscode.workspace.fs.delete(backupUri);
            }
        }
        catch (error) {
            console.warn('Failed to clean old backups:', error);
        }
    }
}
exports.StorageService = StorageService;
//# sourceMappingURL=storageService.js.map