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
exports.SpatialAnalyzer = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const types_1 = require("./types");
/**
 * Analyzes spatial relationships between files for contextual retrieval
 * Prioritizes code based on proximity to the active file
 */
class SpatialAnalyzer {
    constructor() {
        this.fileCache = new Map(); // Directory -> files mapping
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.initializeFileCache();
    }
    /**
     * Calculate spatial score based on file proximity
     * @param chunkPath Path of the code chunk
     * @param activeFilePath Path of the currently active file
     * @param config Configuration for spatial scoring
     * @returns Spatial score (0-1, higher = closer proximity)
     */
    calculateSpatialScore(chunkPath, activeFilePath, config) {
        if (!activeFilePath) {
            return 0.5; // Neutral score when no active file
        }
        const proximity = this.getFileProximity(chunkPath, activeFilePath);
        // Same file gets maximum score
        if (proximity.distance === 0) {
            return 1.0;
        }
        // Same directory gets high score
        if (proximity.isInSameDirectory) {
            return 0.8 + (config.sameDirectoryBonus * 0.2);
        }
        // Calculate score based on shared path depth and distance
        const maxDistance = config.maxSpatialDistance;
        const normalizedDistance = Math.min(proximity.distance, maxDistance) / maxDistance;
        // Exponential decay based on distance
        const distanceScore = Math.exp(-2 * normalizedDistance);
        // Bonus for shared path depth
        const sharedPathBonus = proximity.sharedPathDepth * 0.1;
        // Bonus for same project
        const projectBonus = proximity.isInSameProject ? 0.2 : 0;
        return Math.max(0.1, Math.min(1.0, distanceScore + sharedPathBonus + projectBonus));
    }
    /**
     * Get detailed proximity information between two files
     * @param filePath1 First file path
     * @param filePath2 Second file path
     * @returns Proximity information
     */
    getFileProximity(filePath1, filePath2) {
        const normalizedPath1 = this.normalizePath(filePath1);
        const normalizedPath2 = this.normalizePath(filePath2);
        // Same file
        if (normalizedPath1 === normalizedPath2) {
            return {
                filePath: normalizedPath1,
                distance: 0,
                isInSameDirectory: true,
                isInSameProject: true,
                sharedPathDepth: this.getPathDepth(normalizedPath1)
            };
        }
        const dir1 = path.dirname(normalizedPath1);
        const dir2 = path.dirname(normalizedPath2);
        // Same directory
        const isInSameDirectory = dir1 === dir2;
        // Calculate shared path depth
        const sharedPathDepth = this.calculateSharedPathDepth(normalizedPath1, normalizedPath2);
        // Calculate distance (number of directory levels between files)
        const distance = this.calculatePathDistance(normalizedPath1, normalizedPath2);
        // Check if in same project (both under workspace root)
        const isInSameProject = this.isInWorkspace(normalizedPath1) && this.isInWorkspace(normalizedPath2);
        return {
            filePath: normalizedPath1,
            distance,
            isInSameDirectory,
            isInSameProject,
            sharedPathDepth
        };
    }
    /**
     * Get all files in a directory
     * @param directoryPath Path to the directory
     * @param recursive Whether to search recursively
     * @returns Array of file paths
     */
    async getFilesInDirectory(directoryPath, recursive = false) {
        try {
            const normalizedDir = this.normalizePath(directoryPath);
            // Check cache first
            const cacheKey = `${normalizedDir}:${recursive}`;
            if (this.fileCache.has(cacheKey)) {
                return this.fileCache.get(cacheKey);
            }
            const pattern = recursive ? '**/*' : '*';
            const files = await vscode.workspace.findFiles(new vscode.RelativePattern(directoryPath, pattern), '**/node_modules/**');
            const filePaths = files.map(file => this.normalizePath(file.fsPath));
            // Cache the result
            this.fileCache.set(cacheKey, filePaths);
            return filePaths;
        }
        catch (error) {
            throw new types_1.ContextualRetrievalException('getFilesInDirectory', `Failed to get files in directory ${directoryPath}`, error);
        }
    }
    /**
     * Get files in the same directory as the given file
     * @param filePath Path to the reference file
     * @returns Array of file paths in the same directory
     */
    async getSiblingFiles(filePath) {
        const directory = path.dirname(filePath);
        const files = await this.getFilesInDirectory(directory, false);
        // Exclude the reference file itself
        return files.filter(file => file !== this.normalizePath(filePath));
    }
    /**
     * Get files in nearby directories
     * @param filePath Path to the reference file
     * @param maxDepth Maximum depth to search
     * @returns Array of file paths with their distances
     */
    async getNearbyFiles(filePath, maxDepth = 2) {
        const nearbyFiles = [];
        const baseDir = path.dirname(filePath);
        const visited = new Set();
        await this.searchNearbyFilesRecursive(baseDir, baseDir, 0, maxDepth, nearbyFiles, visited);
        // Sort by distance
        return nearbyFiles.sort((a, b) => a.distance - b.distance);
    }
    /**
     * Get the most relevant files based on spatial proximity
     * @param activeFilePath Currently active file
     * @param config Configuration for spatial analysis
     * @param maxResults Maximum number of results
     * @returns Array of relevant file paths with scores
     */
    async getRelevantFilesByProximity(activeFilePath, config, maxResults = 10) {
        try {
            const allFiles = await this.getAllWorkspaceFiles();
            const scoredFiles = [];
            for (const filePath of allFiles) {
                if (filePath === activeFilePath) {
                    continue; // Skip the active file itself
                }
                const score = this.calculateSpatialScore(filePath, activeFilePath, config);
                if (score > 0.1) { // Only include files with meaningful proximity
                    scoredFiles.push({ path: filePath, score });
                }
            }
            // Sort by score (descending) and limit results
            return scoredFiles
                .sort((a, b) => b.score - a.score)
                .slice(0, maxResults);
        }
        catch (error) {
            throw new types_1.ContextualRetrievalException('getRelevantFilesByProximity', 'Failed to get relevant files by proximity', error);
        }
    }
    /**
     * Initialize file cache for better performance
     */
    async initializeFileCache() {
        try {
            if (!this.workspaceRoot) {
                return;
            }
            // Pre-cache common directory listings
            const commonDirs = [
                this.workspaceRoot,
                path.join(this.workspaceRoot, 'src'),
                path.join(this.workspaceRoot, 'lib'),
                path.join(this.workspaceRoot, 'components'),
                path.join(this.workspaceRoot, 'utils')
            ];
            for (const dir of commonDirs) {
                try {
                    await this.getFilesInDirectory(dir, false);
                }
                catch {
                    // Directory might not exist, skip
                }
            }
        }
        catch (error) {
            console.error('Failed to initialize file cache:', error);
        }
    }
    /**
     * Calculate the distance between two file paths
     */
    calculatePathDistance(path1, path2) {
        const parts1 = path1.split('/').filter(part => part.length > 0);
        const parts2 = path2.split('/').filter(part => part.length > 0);
        // Find the common prefix
        let commonLength = 0;
        const minLength = Math.min(parts1.length, parts2.length);
        for (let i = 0; i < minLength; i++) {
            if (parts1[i] === parts2[i]) {
                commonLength++;
            }
            else {
                break;
            }
        }
        // Distance is the sum of steps to go up from path1 and down to path2
        const stepsUp = parts1.length - commonLength - 1; // -1 because we don't count the filename
        const stepsDown = parts2.length - commonLength - 1;
        return stepsUp + stepsDown;
    }
    /**
     * Calculate shared path depth between two files
     */
    calculateSharedPathDepth(path1, path2) {
        const parts1 = path1.split('/').filter(part => part.length > 0);
        const parts2 = path2.split('/').filter(part => part.length > 0);
        let sharedDepth = 0;
        const minLength = Math.min(parts1.length, parts2.length);
        for (let i = 0; i < minLength; i++) {
            if (parts1[i] === parts2[i]) {
                sharedDepth++;
            }
            else {
                break;
            }
        }
        return sharedDepth;
    }
    /**
     * Get the depth of a path (number of directory levels)
     */
    getPathDepth(filePath) {
        return filePath.split('/').filter(part => part.length > 0).length - 1; // -1 for filename
    }
    /**
     * Check if a file is within the workspace
     */
    isInWorkspace(filePath) {
        if (!this.workspaceRoot) {
            return false;
        }
        const normalizedWorkspaceRoot = this.normalizePath(this.workspaceRoot);
        const normalizedFilePath = this.normalizePath(filePath);
        return normalizedFilePath.startsWith(normalizedWorkspaceRoot);
    }
    /**
     * Normalize file path for consistent comparison
     */
    normalizePath(filePath) {
        return path.normalize(filePath).replace(/\\/g, '/');
    }
    /**
     * Get all files in the workspace
     */
    async getAllWorkspaceFiles() {
        try {
            const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
            return files.map(file => this.normalizePath(file.fsPath));
        }
        catch (error) {
            throw new types_1.ContextualRetrievalException('getAllWorkspaceFiles', 'Failed to get all workspace files', error);
        }
    }
    /**
     * Recursive helper for searching nearby files
     */
    async searchNearbyFilesRecursive(currentDir, baseDir, currentDepth, maxDepth, results, visited) {
        if (currentDepth > maxDepth || visited.has(currentDir)) {
            return;
        }
        visited.add(currentDir);
        try {
            const files = await this.getFilesInDirectory(currentDir, false);
            for (const file of files) {
                results.push({
                    path: file,
                    distance: currentDepth
                });
            }
            // Search parent and sibling directories
            if (currentDepth < maxDepth) {
                const parentDir = path.dirname(currentDir);
                if (parentDir !== currentDir && !visited.has(parentDir)) {
                    await this.searchNearbyFilesRecursive(parentDir, baseDir, currentDepth + 1, maxDepth, results, visited);
                }
            }
        }
        catch (error) {
            // Skip directories that can't be accessed
        }
    }
    /**
     * Clear the file cache
     */
    clearCache() {
        this.fileCache.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            entries: this.fileCache.size,
            directories: Array.from(this.fileCache.keys())
        };
    }
}
exports.SpatialAnalyzer = SpatialAnalyzer;
//# sourceMappingURL=spatialAnalyzer.js.map