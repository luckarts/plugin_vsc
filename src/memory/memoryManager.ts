/**
 * Intelligent Memory Manager
 * Core implementation of the advanced memory system inspired by Augment
 */

import * as vscode from 'vscode';
import { Guid } from 'guid-typescript';
import { 
  IMemoryManager, 
  IMemory, 
  IMemoryStats, 
  IMemoryFilters, 
  IMemorySearchResult, 
  IMemoryBackup, 
  IMemoryImportResult, 
  IMemoryExportOptions,
  IMemoryEvent,
  IMemoryMetadata,
  MemoryType,
  MemoryError,
  ValidationError 
} from './types';
import { StorageService } from './storageService';
import { CompressionService } from './compressionService';
import { MEMORY_CONFIG, VALIDATION_CONFIG } from './config';

export class IntelligentMemoryManager implements IMemoryManager {
  private storageService: StorageService;
  private compressionService: CompressionService;
  private eventCallbacks: Array<(event: IMemoryEvent) => void> = [];
  private isInitialized = false;
  private autoCompressionTimer?: NodeJS.Timeout;

  constructor(globalStorageUri: vscode.Uri) {
    this.storageService = new StorageService(globalStorageUri);
    this.compressionService = new CompressionService();
  }

  /**
   * Initialize the memory manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.storageService.initialize();
      
      // Start auto-compression if enabled
      if (MEMORY_CONFIG.autoCompress) {
        this.startAutoCompression();
      }
      
      this.isInitialized = true;
      
      vscode.window.showInformationMessage('🧠 Intelligent Memory System initialized successfully!');
    } catch (error) {
      throw new MemoryError(
        `Failed to initialize memory manager: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZATION_ERROR'
      );
    }
  }

  /**
   * Create a new memory
   */
  async createMemory(
    content: string, 
    type: MemoryType, 
    tags: string[] = [], 
    metadata: Partial<IMemoryMetadata> = {}
  ): Promise<string> {
    await this.ensureInitialized();
    
    // Validate input
    this.validateMemoryInput(content, type, tags);
    
    // Create memory object
    const memory: IMemory = {
      id: Guid.create().toString(),
      content,
      type,
      timestamp: new Date(),
      size: content.length,
      compressed: false,
      tags: this.sanitizeTags(tags),
      metadata: {
        ...metadata,
        lastAccessed: new Date(),
        accessCount: 0
      }
    };
    
    try {
      // Save memory
      await this.storageService.save(memory);
      
      // Emit event
      this.emitEvent({
        type: 'created',
        memoryId: memory.id,
        timestamp: new Date(),
        metadata: { type, tags, size: memory.size }
      });
      
      // Check if compression is needed
      if (MEMORY_CONFIG.autoCompress) {
        await this.checkAndCompress();
      }
      
      return memory.id;
      
    } catch (error) {
      throw new MemoryError(
        `Failed to create memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CREATE_ERROR'
      );
    }
  }

  /**
   * Get a memory by ID
   */
  async getMemory(id: string): Promise<IMemory | null> {
    await this.ensureInitialized();
    
    try {
      return await this.storageService.load(id);
    } catch (error) {
      console.warn(`Failed to get memory ${id}:`, error);
      return null;
    }
  }

  /**
   * Update a memory
   */
  async updateMemory(id: string, updates: Partial<IMemory>): Promise<void> {
    await this.ensureInitialized();
    
    const existingMemory = await this.storageService.load(id);
    if (!existingMemory) {
      throw new MemoryError(`Memory ${id} not found`, 'NOT_FOUND');
    }
    
    // Validate updates
    if (updates.content) {
      this.validateContent(updates.content);
    }
    
    if (updates.tags) {
      updates.tags = this.sanitizeTags(updates.tags);
    }
    
    // Create updated memory
    const updatedMemory: IMemory = {
      ...existingMemory,
      ...updates,
      size: updates.content ? updates.content.length : existingMemory.size,
      metadata: {
        ...existingMemory.metadata,
        ...updates.metadata,
        lastAccessed: new Date()
      }
    };
    
    try {
      await this.storageService.save(updatedMemory);
      
      // Emit event
      this.emitEvent({
        type: 'updated',
        memoryId: id,
        timestamp: new Date(),
        metadata: { updates }
      });
      
    } catch (error) {
      throw new MemoryError(
        `Failed to update memory ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPDATE_ERROR'
      );
    }
  }

  /**
   * Delete a memory
   */
  async deleteMemory(id: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      await this.storageService.delete(id);
      
      // Emit event
      this.emitEvent({
        type: 'deleted',
        memoryId: id,
        timestamp: new Date()
      });
      
    } catch (error) {
      throw new MemoryError(
        `Failed to delete memory ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DELETE_ERROR'
      );
    }
  }

  /**
   * Search memories
   */
  async searchMemories(query: string, filters?: IMemoryFilters): Promise<IMemorySearchResult[]> {
    await this.ensureInitialized();
    
    if (query.length < 2) {
      return [];
    }
    
    try {
      const results = await this.storageService.search(query, filters);
      
      // Emit event
      this.emitEvent({
        type: 'searched',
        memoryId: 'multiple',
        timestamp: new Date(),
        metadata: { query, filters, resultCount: results.length }
      });
      
      return results;
      
    } catch (error) {
      throw new MemoryError(
        `Failed to search memories: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SEARCH_ERROR'
      );
    }
  }

  /**
   * Get memories by type
   */
  async getMemoriesByType(type: MemoryType): Promise<IMemory[]> {
    const results = await this.searchMemories('', { type });
    return results.map(result => result.memory);
  }

  /**
   * Get memories by tags
   */
  async getMemoriesByTags(tags: string[]): Promise<IMemory[]> {
    const results = await this.searchMemories('', { tags });
    return results.map(result => result.memory);
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<IMemoryStats> {
    await this.ensureInitialized();
    return await this.storageService.getStats();
  }

  /**
   * Get total memory usage in bytes
   */
  async getMemoryUsage(): Promise<number> {
    const stats = await this.getStats();
    return stats.totalSize;
  }

  /**
   * Compress memories
   */
  async compressMemories(): Promise<void> {
    await this.ensureInitialized();
    
    try {
      const memories = await this.storageService.loadAll();
      const shouldCompress = await this.compressionService.shouldCompress(memories);
      
      if (!shouldCompress) {
        vscode.window.showInformationMessage('No compression needed at this time.');
        return;
      }
      
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Compressing memories...",
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: "Analyzing memories..." });
        
        const compressedMemories = await this.compressionService.compressMemories(memories);
        
        progress.report({ increment: 50, message: "Saving compressed memories..." });
        
        // Save compressed memories
        for (const memory of compressedMemories) {
          if (memory.compressed) {
            await this.storageService.save(memory);
          }
        }
        
        progress.report({ increment: 100, message: "Compression complete!" });
        
        const stats = this.compressionService.getCompressionStats(compressedMemories);
        const savedSpace = ((stats.originalSize - stats.compressedSize) / 1024).toFixed(1);
        
        vscode.window.showInformationMessage(
          `✅ Compression complete! Saved ${savedSpace} KB of space.`
        );
      });
      
    } catch (error) {
      throw new MemoryError(
        `Failed to compress memories: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COMPRESSION_ERROR'
      );
    }
  }

  /**
   * Optimize storage
   */
  async optimizeStorage(): Promise<void> {
    await this.ensureInitialized();
    
    try {
      // Compress if needed
      await this.compressMemories();
      
      // Clean up old session memories
      await this.cleanupOldSessionMemories();
      
      // Create backup
      await this.createBackup();
      
      vscode.window.showInformationMessage('✅ Storage optimization complete!');
      
    } catch (error) {
      throw new MemoryError(
        `Failed to optimize storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'OPTIMIZATION_ERROR'
      );
    }
  }

  /**
   * Export memories
   */
  async exportMemories(options: IMemoryExportOptions = {}): Promise<string> {
    await this.ensureInitialized();
    
    const memories = await this.storageService.loadAll();
    let filteredMemories = memories;
    
    // Apply filters
    if (options.types) {
      filteredMemories = filteredMemories.filter(memory => options.types!.includes(memory.type));
    }
    
    if (options.dateRange) {
      filteredMemories = filteredMemories.filter(memory => 
        memory.timestamp >= options.dateRange!.start && 
        memory.timestamp <= options.dateRange!.end
      );
    }
    
    if (!options.includeCompressed) {
      filteredMemories = filteredMemories.filter(memory => !memory.compressed);
    }
    
    // Format export
    const format = options.format || 'json';
    
    switch (format) {
      case 'json':
        return JSON.stringify(filteredMemories, null, 2);
      
      case 'markdown':
        return this.formatAsMarkdown(filteredMemories);
      
      case 'csv':
        return this.formatAsCSV(filteredMemories);
      
      default:
        throw new MemoryError(`Unsupported export format: ${format}`, 'INVALID_FORMAT');
    }
  }

  /**
   * Import memories
   */
  async importMemories(data: string, format: 'json' | 'markdown' = 'json'): Promise<IMemoryImportResult> {
    await this.ensureInitialized();
    
    try {
      let memories: IMemory[];
      
      if (format === 'json') {
        memories = JSON.parse(data);
      } else {
        throw new MemoryError('Markdown import not yet implemented', 'NOT_IMPLEMENTED');
      }
      
      let imported = 0;
      let skipped = 0;
      let duplicates = 0;
      const errors: string[] = [];
      
      for (const memory of memories) {
        try {
          // Check if memory already exists
          const existing = await this.getMemory(memory.id);
          if (existing) {
            duplicates++;
            skipped++;
            continue;
          }
          
          // Validate and save
          this.validateMemoryObject(memory);
          await this.storageService.save(memory);
          imported++;
          
        } catch (error) {
          errors.push(`Failed to import memory ${memory.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          skipped++;
        }
      }
      
      return { imported, skipped, errors, duplicates };
      
    } catch (error) {
      throw new MemoryError(
        `Failed to import memories: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'IMPORT_ERROR'
      );
    }
  }

  /**
   * Create backup
   */
  async createBackup(): Promise<IMemoryBackup> {
    await this.ensureInitialized();
    return await this.storageService.backup();
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backup: IMemoryBackup): Promise<IMemoryImportResult> {
    await this.ensureInitialized();
    return await this.storageService.restore(backup);
  }

  /**
   * Register event callback
   */
  onMemoryEvent(callback: (event: IMemoryEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Dispose resources
   */
  async dispose(): Promise<void> {
    if (this.autoCompressionTimer) {
      clearInterval(this.autoCompressionTimer);
    }
    
    this.eventCallbacks.length = 0;
    this.compressionService.clearCache();
    this.isInitialized = false;
  }

  // Private helper methods
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private validateMemoryInput(content: string, type: MemoryType, tags: string[]): void {
    this.validateContent(content);
    
    if (!Object.values(MemoryType).includes(type)) {
      throw new ValidationError('Invalid memory type');
    }
    
    if (tags.length > VALIDATION_CONFIG.memory.maxTagsCount) {
      throw new ValidationError(`Too many tags (maximum ${VALIDATION_CONFIG.memory.maxTagsCount})`);
    }
    
    for (const tag of tags) {
      if (tag.length > VALIDATION_CONFIG.memory.maxTagLength) {
        throw new ValidationError(`Tag too long: ${tag}`);
      }
      
      if (!VALIDATION_CONFIG.tags.allowedCharacters.test(tag)) {
        throw new ValidationError(`Invalid tag format: ${tag}`);
      }
      
      if (VALIDATION_CONFIG.tags.reservedTags.includes(tag.toLowerCase())) {
        throw new ValidationError(`Reserved tag: ${tag}`);
      }
    }
  }

  private validateContent(content: string): void {
    if (!content || typeof content !== 'string') {
      throw new ValidationError('Content must be a non-empty string');
    }
    
    if (content.length < VALIDATION_CONFIG.memory.minContentLength) {
      throw new ValidationError(`Content too short (minimum ${VALIDATION_CONFIG.memory.minContentLength} characters)`);
    }
    
    if (content.length > VALIDATION_CONFIG.memory.maxContentLength) {
      throw new ValidationError(`Content too long (maximum ${VALIDATION_CONFIG.memory.maxContentLength} characters)`);
    }
  }

  private validateMemoryObject(memory: any): void {
    if (!memory || typeof memory !== 'object') {
      throw new ValidationError('Invalid memory object');
    }
    
    const required = VALIDATION_CONFIG.memory.requiredFields;
    for (const field of required) {
      if (!(field in memory)) {
        throw new ValidationError(`Missing required field: ${field}`);
      }
    }
    
    this.validateContent(memory.content);
  }

  private sanitizeTags(tags: string[]): string[] {
    return tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0)
      .filter((tag, index, array) => array.indexOf(tag) === index); // Remove duplicates
  }

  private emitEvent(event: IMemoryEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.warn('Error in memory event callback:', error);
      }
    }
  }

  private startAutoCompression(): void {
    this.autoCompressionTimer = setInterval(async () => {
      try {
        await this.checkAndCompress();
      } catch (error) {
        console.warn('Auto-compression failed:', error);
      }
    }, MEMORY_CONFIG.backupInterval);
  }

  private async checkAndCompress(): Promise<void> {
    const memories = await this.storageService.loadAll();
    const shouldCompress = await this.compressionService.shouldCompress(memories);
    
    if (shouldCompress) {
      await this.compressMemories();
    }
  }

  private async cleanupOldSessionMemories(): Promise<void> {
    const sessionMemories = await this.getMemoriesByType(MemoryType.SESSION);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep session memories for 7 days
    
    for (const memory of sessionMemories) {
      if (memory.timestamp < cutoffDate) {
        await this.deleteMemory(memory.id);
      }
    }
  }

  private formatAsMarkdown(memories: IMemory[]): string {
    let markdown = '# Memory Export\n\n';
    
    const groupedByType = memories.reduce((groups, memory) => {
      if (!groups[memory.type]) {
        groups[memory.type] = [];
      }
      groups[memory.type].push(memory);
      return groups;
    }, {} as Record<MemoryType, IMemory[]>);
    
    for (const [type, typeMemories] of Object.entries(groupedByType)) {
      markdown += `## ${type.charAt(0).toUpperCase() + type.slice(1)} Memories\n\n`;
      
      for (const memory of typeMemories) {
        markdown += `### ${memory.id}\n\n`;
        markdown += `**Created:** ${memory.timestamp.toISOString()}\n\n`;
        markdown += `**Tags:** ${memory.tags.join(', ')}\n\n`;
        markdown += `**Content:**\n\n${memory.content}\n\n---\n\n`;
      }
    }
    
    return markdown;
  }

  private formatAsCSV(memories: IMemory[]): string {
    const headers = ['ID', 'Type', 'Content', 'Tags', 'Created', 'Size', 'Compressed'];
    const rows = memories.map(memory => [
      memory.id,
      memory.type,
      `"${memory.content.replace(/"/g, '""')}"`, // Escape quotes
      memory.tags.join(';'),
      memory.timestamp.toISOString(),
      memory.size.toString(),
      memory.compressed.toString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}
