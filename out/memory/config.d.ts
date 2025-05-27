/**
 * Configuration for the intelligent memory system
 */
import { IMemoryConfig } from './types';
export declare const MEMORY_CONFIG: IMemoryConfig;
export declare const COMPRESSION_CONFIG: {
    minSizeForCompression: number;
    targetCompressionRatio: number;
    preservedKeywords: string[];
    preservedPatterns: RegExp[];
};
export declare const SEARCH_CONFIG: {
    minQueryLength: number;
    maxResults: number;
    minRelevanceScore: number;
    fieldBoosts: {
        content: number;
        tags: number;
        metadata: number;
        title: number;
    };
    fuzzySearch: {
        enabled: boolean;
        maxDistance: number;
        prefixLength: number;
    };
};
export declare const UI_CONFIG: {
    defaultPanelState: {
        searchQuery: string;
        selectedType: undefined;
        selectedTags: never[];
        sortBy: "timestamp";
        sortOrder: "desc";
        showCompressed: boolean;
        viewMode: "list";
    };
    pagination: {
        itemsPerPage: number;
        maxPages: number;
    };
    animations: {
        enabled: boolean;
        duration: number;
        easing: string;
    };
    theme: {
        primaryColor: string;
        secondaryColor: string;
        successColor: string;
        warningColor: string;
        errorColor: string;
        backgroundColor: string;
        textColor: string;
    };
};
export declare const STORAGE_CONFIG: {
    directories: {
        memories: string;
        backups: string;
        temp: string;
        exports: string;
    };
    fileNames: {
        memoriesIndex: string;
        memoryFile: (id: string) => string;
        backupFile: (timestamp: string) => string;
        exportFile: (timestamp: string, format: string) => string;
    };
    backup: {
        maxBackups: number;
        autoBackup: boolean;
        compressionEnabled: boolean;
    };
    fileWatcher: {
        enabled: boolean;
        debounceTime: number;
    };
};
export declare const PERFORMANCE_CONFIG: {
    batchSize: number;
    debounce: {
        search: number;
        save: number;
        index: number;
    };
    cache: {
        enabled: boolean;
        maxSize: number;
        ttl: number;
    };
    memoryLimits: {
        maxConcurrentOperations: number;
        maxMemoryUsage: number;
    };
};
export declare const VALIDATION_CONFIG: {
    memory: {
        minContentLength: number;
        maxContentLength: number;
        maxTagsCount: number;
        maxTagLength: number;
        requiredFields: string[];
    };
    tags: {
        allowedCharacters: RegExp;
        reservedTags: string[];
    };
    metadata: {
        maxProjectNameLength: number;
        maxCategoryLength: number;
        maxLanguageLength: number;
    };
};
export declare const CONFIG: {
    memory: IMemoryConfig;
    compression: {
        minSizeForCompression: number;
        targetCompressionRatio: number;
        preservedKeywords: string[];
        preservedPatterns: RegExp[];
    };
    search: {
        minQueryLength: number;
        maxResults: number;
        minRelevanceScore: number;
        fieldBoosts: {
            content: number;
            tags: number;
            metadata: number;
            title: number;
        };
        fuzzySearch: {
            enabled: boolean;
            maxDistance: number;
            prefixLength: number;
        };
    };
    ui: {
        defaultPanelState: {
            searchQuery: string;
            selectedType: undefined;
            selectedTags: never[];
            sortBy: "timestamp";
            sortOrder: "desc";
            showCompressed: boolean;
            viewMode: "list";
        };
        pagination: {
            itemsPerPage: number;
            maxPages: number;
        };
        animations: {
            enabled: boolean;
            duration: number;
            easing: string;
        };
        theme: {
            primaryColor: string;
            secondaryColor: string;
            successColor: string;
            warningColor: string;
            errorColor: string;
            backgroundColor: string;
            textColor: string;
        };
    };
    storage: {
        directories: {
            memories: string;
            backups: string;
            temp: string;
            exports: string;
        };
        fileNames: {
            memoriesIndex: string;
            memoryFile: (id: string) => string;
            backupFile: (timestamp: string) => string;
            exportFile: (timestamp: string, format: string) => string;
        };
        backup: {
            maxBackups: number;
            autoBackup: boolean;
            compressionEnabled: boolean;
        };
        fileWatcher: {
            enabled: boolean;
            debounceTime: number;
        };
    };
    performance: {
        batchSize: number;
        debounce: {
            search: number;
            save: number;
            index: number;
        };
        cache: {
            enabled: boolean;
            maxSize: number;
            ttl: number;
        };
        memoryLimits: {
            maxConcurrentOperations: number;
            maxMemoryUsage: number;
        };
    };
    validation: {
        memory: {
            minContentLength: number;
            maxContentLength: number;
            maxTagsCount: number;
            maxTagLength: number;
            requiredFields: string[];
        };
        tags: {
            allowedCharacters: RegExp;
            reservedTags: string[];
        };
        metadata: {
            maxProjectNameLength: number;
            maxCategoryLength: number;
            maxLanguageLength: number;
        };
    };
};
export declare class ConfigManager {
    /**
     * Get configuration value with fallback
     */
    static get<T>(path: string, fallback: T): T;
    /**
     * Validate configuration values
     */
    static validate(): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Get environment-specific overrides
     */
    static getEnvironmentOverrides(): Partial<typeof CONFIG>;
}
//# sourceMappingURL=config.d.ts.map