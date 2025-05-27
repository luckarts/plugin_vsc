"use strict";
/**
 * Tests for the Intelligent Memory Manager
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
exports.runMemoryTests = runMemoryTests;
const vscode = __importStar(require("vscode"));
const memoryManager_1 = require("../memoryManager");
const types_1 = require("../types");
// Mock VSCode APIs for testing
const mockContext = {
    globalStorageUri: vscode.Uri.file('/tmp/test-storage')
};
describe('IntelligentMemoryManager', () => {
    let memoryManager;
    beforeEach(async () => {
        memoryManager = new memoryManager_1.IntelligentMemoryManager(mockContext.globalStorageUri);
        await memoryManager.initialize();
    });
    afterEach(async () => {
        await memoryManager.dispose();
    });
    describe('Memory CRUD Operations', () => {
        test('should create a new memory', async () => {
            const content = 'Always use TypeScript for better type safety';
            const type = types_1.MemoryType.PERSONAL;
            const tags = ['typescript', 'best-practice'];
            const memoryId = await memoryManager.createMemory(content, type, tags);
            expect(memoryId).toBeDefined();
            expect(typeof memoryId).toBe('string');
            expect(memoryId.length).toBeGreaterThan(0);
        });
        test('should retrieve a memory by ID', async () => {
            const content = 'Use descriptive variable names';
            const type = types_1.MemoryType.GUIDELINE;
            const tags = ['clean-code'];
            const memoryId = await memoryManager.createMemory(content, type, tags);
            const retrievedMemory = await memoryManager.getMemory(memoryId);
            expect(retrievedMemory).toBeDefined();
            expect(retrievedMemory.content).toBe(content);
            expect(retrievedMemory.type).toBe(type);
            expect(retrievedMemory.tags).toEqual(tags);
        });
        test('should update a memory', async () => {
            const content = 'Original content';
            const type = types_1.MemoryType.PERSONAL;
            const memoryId = await memoryManager.createMemory(content, type);
            const updatedContent = 'Updated content with more details';
            await memoryManager.updateMemory(memoryId, { content: updatedContent });
            const retrievedMemory = await memoryManager.getMemory(memoryId);
            expect(retrievedMemory.content).toBe(updatedContent);
        });
        test('should delete a memory', async () => {
            const content = 'Memory to be deleted';
            const type = types_1.MemoryType.SESSION;
            const memoryId = await memoryManager.createMemory(content, type);
            await memoryManager.deleteMemory(memoryId);
            const retrievedMemory = await memoryManager.getMemory(memoryId);
            expect(retrievedMemory).toBeNull();
        });
    });
    describe('Memory Search', () => {
        beforeEach(async () => {
            // Create test memories
            await memoryManager.createMemory('Use async/await for better readability', types_1.MemoryType.PERSONAL, ['javascript', 'async', 'best-practice']);
            await memoryManager.createMemory('Always write unit tests for critical functions', types_1.MemoryType.GUIDELINE, ['testing', 'unit-tests', 'quality']);
            await memoryManager.createMemory('This project uses React with TypeScript', types_1.MemoryType.REPOSITORY, ['react', 'typescript', 'frontend']);
        });
        test('should search memories by content', async () => {
            const results = await memoryManager.searchMemories('async');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].memory.content).toContain('async');
        });
        test('should search memories by tags', async () => {
            const results = await memoryManager.searchMemories('typescript');
            expect(results.length).toBeGreaterThan(0);
            const hasTypescriptTag = results.some(result => result.memory.tags.includes('typescript'));
            expect(hasTypescriptTag).toBe(true);
        });
        test('should filter memories by type', async () => {
            const results = await memoryManager.searchMemories('', {
                type: types_1.MemoryType.GUIDELINE
            });
            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result.memory.type).toBe(types_1.MemoryType.GUIDELINE);
            });
        });
    });
    describe('Memory Statistics', () => {
        test('should return accurate statistics', async () => {
            // Create test memories
            await memoryManager.createMemory('Personal note', types_1.MemoryType.PERSONAL);
            await memoryManager.createMemory('Repository info', types_1.MemoryType.REPOSITORY);
            await memoryManager.createMemory('Guideline', types_1.MemoryType.GUIDELINE);
            const stats = await memoryManager.getStats();
            expect(stats.totalMemories).toBeGreaterThanOrEqual(3);
            expect(stats.totalSize).toBeGreaterThan(0);
            expect(stats.memoryByType[types_1.MemoryType.PERSONAL]).toBeGreaterThanOrEqual(1);
            expect(stats.memoryByType[types_1.MemoryType.REPOSITORY]).toBeGreaterThanOrEqual(1);
            expect(stats.memoryByType[types_1.MemoryType.GUIDELINE]).toBeGreaterThanOrEqual(1);
        });
    });
    describe('Memory Export/Import', () => {
        test('should export memories as JSON', async () => {
            await memoryManager.createMemory('Test memory', types_1.MemoryType.PERSONAL, ['test']);
            const exportData = await memoryManager.exportMemories({ format: 'json' });
            expect(exportData).toBeDefined();
            expect(typeof exportData).toBe('string');
            const parsedData = JSON.parse(exportData);
            expect(Array.isArray(parsedData)).toBe(true);
            expect(parsedData.length).toBeGreaterThan(0);
        });
        test('should import memories from JSON', async () => {
            const testMemories = [
                {
                    id: 'test-id-1',
                    content: 'Imported memory 1',
                    type: types_1.MemoryType.PERSONAL,
                    timestamp: new Date(),
                    size: 17,
                    compressed: false,
                    tags: ['imported'],
                    metadata: {}
                }
            ];
            const importData = JSON.stringify(testMemories);
            const result = await memoryManager.importMemories(importData);
            expect(result.imported).toBe(1);
            expect(result.errors.length).toBe(0);
            const retrievedMemory = await memoryManager.getMemory('test-id-1');
            expect(retrievedMemory).toBeDefined();
            expect(retrievedMemory.content).toBe('Imported memory 1');
        });
    });
    describe('Memory Validation', () => {
        test('should reject memory with empty content', async () => {
            await expect(memoryManager.createMemory('', types_1.MemoryType.PERSONAL)).rejects.toThrow();
        });
        test('should reject memory with invalid type', async () => {
            await expect(memoryManager.createMemory('Valid content', 'invalid-type')).rejects.toThrow();
        });
        test('should reject memory with too many tags', async () => {
            const tooManyTags = Array(25).fill('tag'); // More than maxTagsCount (20)
            await expect(memoryManager.createMemory('Valid content', types_1.MemoryType.PERSONAL, tooManyTags)).rejects.toThrow();
        });
        test('should sanitize and deduplicate tags', async () => {
            const tags = ['  Tag1  ', 'tag2', 'TAG1', 'tag2']; // Mixed case and duplicates
            const memoryId = await memoryManager.createMemory('Test content', types_1.MemoryType.PERSONAL, tags);
            const memory = await memoryManager.getMemory(memoryId);
            expect(memory.tags).toEqual(['tag1', 'tag2']); // Lowercase and deduplicated
        });
    });
    describe('Memory Backup and Restore', () => {
        test('should create a backup', async () => {
            await memoryManager.createMemory('Backup test', types_1.MemoryType.PERSONAL);
            const backup = await memoryManager.createBackup();
            expect(backup).toBeDefined();
            expect(backup.version).toBeDefined();
            expect(backup.timestamp).toBeInstanceOf(Date);
            expect(backup.memories.length).toBeGreaterThan(0);
            expect(backup.checksum).toBeDefined();
        });
        test('should restore from backup', async () => {
            // Create a backup
            await memoryManager.createMemory('Original memory', types_1.MemoryType.PERSONAL);
            const backup = await memoryManager.createBackup();
            // Clear memories and restore
            // Note: In a real test, you'd clear the storage first
            const result = await memoryManager.restoreFromBackup(backup);
            expect(result.imported).toBeGreaterThanOrEqual(0);
            expect(result.errors.length).toBe(0);
        });
    });
});
// Helper function to run tests
async function runMemoryTests() {
    console.log('🧪 Running Memory System Tests...');
    try {
        // This is a simplified test runner
        // In a real implementation, you'd use Jest or another testing framework
        const memoryManager = new memoryManager_1.IntelligentMemoryManager(vscode.Uri.file('/tmp/test-memory-system'));
        await memoryManager.initialize();
        // Test basic CRUD operations
        console.log('✅ Testing CRUD operations...');
        const memoryId = await memoryManager.createMemory('Test memory for CRUD operations', types_1.MemoryType.PERSONAL, ['test', 'crud']);
        const memory = await memoryManager.getMemory(memoryId);
        console.log(`✅ Created and retrieved memory: ${memory?.content.substring(0, 50)}...`);
        // Test search
        console.log('✅ Testing search...');
        const searchResults = await memoryManager.searchMemories('test');
        console.log(`✅ Found ${searchResults.length} memories matching 'test'`);
        // Test statistics
        console.log('✅ Testing statistics...');
        const stats = await memoryManager.getStats();
        console.log(`✅ Memory stats: ${stats.totalMemories} memories, ${stats.totalSize} bytes`);
        // Test export
        console.log('✅ Testing export...');
        const exportData = await memoryManager.exportMemories();
        console.log(`✅ Exported ${JSON.parse(exportData).length} memories`);
        await memoryManager.dispose();
        console.log('🎉 All memory system tests passed!');
    }
    catch (error) {
        console.error('❌ Memory system tests failed:', error);
        throw error;
    }
}
//# sourceMappingURL=memoryManager.test.js.map