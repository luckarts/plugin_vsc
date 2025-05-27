"use strict";
/**
 * Configuration for the intelligent memory system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = exports.CONFIG = exports.VALIDATION_CONFIG = exports.PERFORMANCE_CONFIG = exports.STORAGE_CONFIG = exports.UI_CONFIG = exports.SEARCH_CONFIG = exports.COMPRESSION_CONFIG = exports.MEMORY_CONFIG = void 0;
exports.MEMORY_CONFIG = {
    // Storage limits
    maxMemorySize: 1000000, // 1MB total
    compressionThreshold: 500000, // 500KB - trigger compression
    maxMemoriesPerType: 100, // Maximum memories per type
    // Automation settings
    autoCompress: true,
    backupInterval: 300000, // 5 minutes in milliseconds
    searchDebounce: 300, // ms
    enableAnalytics: true,
    // Retention policy
    retentionPolicy: {
        maxAge: 365, // 1 year in days
        maxCount: 1000 // Maximum total memories
    }
};
// Compression settings
exports.COMPRESSION_CONFIG = {
    // Minimum size to consider for compression (in characters)
    minSizeForCompression: 1000,
    // Target compression ratio (0.0 to 1.0)
    targetCompressionRatio: 0.6,
    // Keywords to always preserve during compression
    preservedKeywords: [
        'function', 'class', 'interface', 'type', 'const', 'let', 'var',
        'import', 'export', 'async', 'await', 'return', 'throw', 'try', 'catch',
        'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue',
        'TODO', 'FIXME', 'NOTE', 'WARNING', 'ERROR', 'DEBUG'
    ],
    // Patterns to preserve (regex patterns)
    preservedPatterns: [
        /\b[A-Z][a-zA-Z0-9]*\b/, // PascalCase identifiers
        /\b[a-z][a-zA-Z0-9]*\b/, // camelCase identifiers
        /\b\d+\.\d+\.\d+\b/, // Version numbers
        /https?:\/\/[^\s]+/, // URLs
        /\b[A-Z_][A-Z0-9_]*\b/, // CONSTANTS
        /@[a-zA-Z]+/, // Decorators/annotations
        /\/\*\*[\s\S]*?\*\//, // JSDoc comments
        /\/\/\s*TODO:.*/, // TODO comments
        /\/\/\s*FIXME:.*/, // FIXME comments
    ]
};
// Search configuration
exports.SEARCH_CONFIG = {
    // Minimum query length for search
    minQueryLength: 2,
    // Maximum search results to return
    maxResults: 50,
    // Minimum relevance score to include in results (0.0 to 1.0)
    minRelevanceScore: 0.1,
    // Boost factors for different fields
    fieldBoosts: {
        content: 1.0,
        tags: 2.0,
        metadata: 1.5,
        title: 3.0
    },
    // Fuzzy search settings
    fuzzySearch: {
        enabled: true,
        maxDistance: 2, // Maximum edit distance
        prefixLength: 1 // Minimum prefix length for fuzzy matching
    }
};
// UI configuration
exports.UI_CONFIG = {
    // Default panel state
    defaultPanelState: {
        searchQuery: '',
        selectedType: undefined,
        selectedTags: [],
        sortBy: 'timestamp',
        sortOrder: 'desc',
        showCompressed: true,
        viewMode: 'list'
    },
    // Pagination settings
    pagination: {
        itemsPerPage: 20,
        maxPages: 10
    },
    // Animation settings
    animations: {
        enabled: true,
        duration: 200, // ms
        easing: 'ease-in-out'
    },
    // Theme settings
    theme: {
        primaryColor: '#007acc',
        secondaryColor: '#6c757d',
        successColor: '#28a745',
        warningColor: '#ffc107',
        errorColor: '#dc3545',
        backgroundColor: 'var(--vscode-editor-background)',
        textColor: 'var(--vscode-editor-foreground)'
    }
};
// File system configuration
exports.STORAGE_CONFIG = {
    // Directory structure
    directories: {
        memories: 'memories',
        backups: 'backups',
        temp: 'temp',
        exports: 'exports'
    },
    // File naming patterns
    fileNames: {
        memoriesIndex: 'memories-index.json',
        memoryFile: (id) => `memory-${id}.json`,
        backupFile: (timestamp) => `backup-${timestamp}.json`,
        exportFile: (timestamp, format) => `export-${timestamp}.${format}`
    },
    // Backup settings
    backup: {
        maxBackups: 10,
        autoBackup: true,
        compressionEnabled: true
    },
    // File watching
    fileWatcher: {
        enabled: true,
        debounceTime: 1000 // ms
    }
};
// Performance configuration
exports.PERFORMANCE_CONFIG = {
    // Batch processing settings
    batchSize: 50,
    // Debounce times for various operations
    debounce: {
        search: 300,
        save: 1000,
        index: 2000
    },
    // Cache settings
    cache: {
        enabled: true,
        maxSize: 100, // Number of memories to cache
        ttl: 300000 // 5 minutes in milliseconds
    },
    // Memory usage limits
    memoryLimits: {
        maxConcurrentOperations: 5,
        maxMemoryUsage: 50 * 1024 * 1024 // 50MB
    }
};
// Validation rules
exports.VALIDATION_CONFIG = {
    memory: {
        minContentLength: 10,
        maxContentLength: 100000, // 100KB
        maxTagsCount: 20,
        maxTagLength: 50,
        requiredFields: ['content', 'type']
    },
    tags: {
        allowedCharacters: /^[a-zA-Z0-9\-_]+$/,
        reservedTags: ['system', 'internal', 'temp']
    },
    metadata: {
        maxProjectNameLength: 100,
        maxCategoryLength: 50,
        maxLanguageLength: 20
    }
};
// Export all configurations
exports.CONFIG = {
    memory: exports.MEMORY_CONFIG,
    compression: exports.COMPRESSION_CONFIG,
    search: exports.SEARCH_CONFIG,
    ui: exports.UI_CONFIG,
    storage: exports.STORAGE_CONFIG,
    performance: exports.PERFORMANCE_CONFIG,
    validation: exports.VALIDATION_CONFIG
};
// Helper functions for configuration
class ConfigManager {
    /**
     * Get configuration value with fallback
     */
    static get(path, fallback) {
        const keys = path.split('.');
        let current = exports.CONFIG;
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            }
            else {
                return fallback;
            }
        }
        return current !== undefined ? current : fallback;
    }
    /**
     * Validate configuration values
     */
    static validate() {
        const errors = [];
        // Validate memory config
        if (exports.MEMORY_CONFIG.maxMemorySize <= 0) {
            errors.push('maxMemorySize must be positive');
        }
        if (exports.MEMORY_CONFIG.compressionThreshold >= exports.MEMORY_CONFIG.maxMemorySize) {
            errors.push('compressionThreshold must be less than maxMemorySize');
        }
        if (exports.MEMORY_CONFIG.maxMemoriesPerType <= 0) {
            errors.push('maxMemoriesPerType must be positive');
        }
        // Validate search config
        if (exports.SEARCH_CONFIG.minQueryLength < 1) {
            errors.push('minQueryLength must be at least 1');
        }
        if (exports.SEARCH_CONFIG.maxResults <= 0) {
            errors.push('maxResults must be positive');
        }
        // Validate validation config
        if (exports.VALIDATION_CONFIG.memory.minContentLength >= exports.VALIDATION_CONFIG.memory.maxContentLength) {
            errors.push('minContentLength must be less than maxContentLength');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Get environment-specific overrides
     */
    static getEnvironmentOverrides() {
        const overrides = {};
        // Check for environment variables
        if (process.env.MEMORY_MAX_SIZE) {
            overrides.memory = { ...exports.MEMORY_CONFIG };
            overrides.memory.maxMemorySize = parseInt(process.env.MEMORY_MAX_SIZE, 10);
        }
        if (process.env.MEMORY_AUTO_COMPRESS) {
            overrides.memory = overrides.memory || { ...exports.MEMORY_CONFIG };
            overrides.memory.autoCompress = process.env.MEMORY_AUTO_COMPRESS === 'true';
        }
        return overrides;
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=config.js.map