# 📁 TÂCHE 3 : SYSTÈME D'INSERTION DE FICHIERS

## 📋 **Vue d'Ensemble**

Implémentation d'un système de gestion du contexte de fichiers inspiré d'Augment, permettant aux utilisateurs d'ajouter des fichiers et dossiers au contexte de conversation, avec gestion automatique des fichiers récemment ouverts et optimisation intelligente du contexte.

## 🎯 **Objectifs Principaux**

- ✅ **Gestion du contexte** avec files/folders dans la sidebar
- ✅ **Recently Opened Files** automatique avec tracking
- ✅ **Focus context** pour analyse ciblée
- ✅ **Clear context** pour nettoyer le contexte
- ✅ **Optimisation intelligente** pour limites de tokens
- ✅ **Indicateurs visuels** de taille et performance

## 🏗️ **Architecture Technique**

### **Modules à Créer :**

#### **1. ContextManager (src/context/contextManager.ts)**
```typescript
interface IContextFile {
  id: string;
  path: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  content?: string;
  language?: string;
  lastModified: Date;
  addedAt: Date;
  priority: number;
  isRecent: boolean;
}

interface IContextStats {
  totalFiles: number;
  totalSize: number;
  estimatedTokens: number;
  compressionRatio: number;
  focusMode: boolean;
}

class ContextManager {
  // Gestion CRUD des fichiers de contexte
  // Optimisation automatique du contexte
  // Calcul de tokens et limites
  // Mode focus et filtrage
}
```

#### **2. FileTracker (src/context/fileTracker.ts)**
```typescript
class FileTracker {
  // Tracking automatique des fichiers ouverts
  // Gestion des fichiers récents
  // Priorisation par fréquence d'usage
  // Nettoyage automatique
}
```

#### **3. ContextPanel (src/context/contextPanel.ts)**
```typescript
class ContextPanel {
  // Interface sidebar pour contexte
  // Sections Files/Folders/Recent
  // Actions Add/Remove/Clear/Focus
  // Indicateurs de performance
}
```

## 🎨 **Interface Utilisateur**

### **Panneau Sidebar "Default Context"**

```
┌─────────────────────────────────────┐
│ 📁 Default Context                 │
├─────────────────────────────────────┤
│ 📊 Context Stats                   │
│ Files: 12 | Size: 2.3MB | ~8.5K tokens │
│ [Focus Context] [Clear Context]     │
├─────────────────────────────────────┤
│ 📂 Files (8)                       │
│ ├─ 📄 src/utils/helpers.ts         │
│ ├─ 📄 src/types/index.ts           │
│ ├─ 📄 package.json                 │
│ └─ 📄 README.md                    │
│ [+ Add Files] [📁 Add Folder]      │
├─────────────────────────────────────┤
│ 📂 Folders (2)                     │
│ ├─ 📁 src/components/              │
│ ├─ 📁 src/hooks/                   │
│ [+ Add Folder]                     │
├─────────────────────────────────────┤
│ 🕒 Recently Opened Files (4)       │
│ ├─ 📄 src/webview/chatWebview.ts   │
│ ├─ 📄 src/actions/types.ts         │
│ ├─ 📄 src/extension.ts             │
│ └─ 📄 tsconfig.json                │
│ [⚙️ Settings]                      │
├─────────────────────────────────────┤
│ ⚠️ Context Size Warning            │
│ Context is approaching token limit │
│ Consider using Focus mode or       │
│ removing less relevant files       │
│ [Optimize Now] [Focus Mode]        │
└─────────────────────────────────────┘
```

### **Dialog d'Ajout de Fichiers**

```
┌─────────────────────────────────────┐
│ ➕ Add Files to Context            │
├─────────────────────────────────────┤
│ 📁 Current: /workspace/project      │
├─────────────────────────────────────┤
│ [🔍 Search files...]               │
├─────────────────────────────────────┤
│ ☐ 📁 src/                          │
│   ☑ 📄 index.ts                    │
│   ☑ 📄 types.ts                    │
│   ☐ 📁 components/                 │
│     ☐ 📄 Button.tsx                │
│     ☐ 📄 Modal.tsx                 │
│ ☐ 📄 package.json                  │
│ ☐ 📄 README.md                     │
├─────────────────────────────────────┤
│ Selected: 2 files (~1.2K tokens)   │
│ [Cancel] [Add Selected]             │
└─────────────────────────────────────┘
```

## 🔧 **Implémentation Détaillée**

### **Étape 1 : Types et Configuration**

#### **1.1 Types de Contexte**
```typescript
// src/context/types.ts
export interface IContextFile {
  id: string;
  path: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  content?: string;
  language?: string;
  lastModified: Date;
  addedAt: Date;
  priority: number;
  isRecent: boolean;
  isExcluded: boolean;
  metadata: IFileMetadata;
}

export interface IFileMetadata {
  lineCount?: number;
  encoding?: string;
  gitStatus?: 'modified' | 'added' | 'deleted' | 'untracked';
  isTest?: boolean;
  isConfig?: boolean;
  dependencies?: string[];
}

export interface IContextStats {
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  estimatedTokens: number;
  compressionRatio: number;
  focusMode: boolean;
  focusFiles: string[];
  lastOptimized: Date;
}

export interface IContextConfig {
  maxFiles: number;
  maxTokens: number;
  recentFilesLimit: number;
  autoTrackRecent: boolean;
  excludePatterns: string[];
  includePatterns: string[];
  autoOptimize: boolean;
  focusModeEnabled: boolean;
}

export enum ContextMode {
  NORMAL = 'normal',
  FOCUS = 'focus',
  MINIMAL = 'minimal'
}
```

#### **1.2 Configuration par Défaut**
```typescript
// src/context/config.ts
export const CONTEXT_CONFIG: IContextConfig = {
  maxFiles: 50,
  maxTokens: 100000, // ~400KB de texte
  recentFilesLimit: 20,
  autoTrackRecent: true,
  excludePatterns: [
    '.git/**',
    'node_modules/**',
    'dist/**',
    'build/**',
    '*.log',
    '*.tmp',
    '.DS_Store',
    'Thumbs.db'
  ],
  includePatterns: [
    '**/*.ts',
    '**/*.tsx',
    '**/*.js',
    '**/*.jsx',
    '**/*.json',
    '**/*.md',
    '**/*.yml',
    '**/*.yaml'
  ],
  autoOptimize: true,
  focusModeEnabled: false
};

export const TOKEN_ESTIMATION = {
  CHARS_PER_TOKEN: 4, // Approximation pour l'anglais
  MAX_FILE_SIZE: 1000000, // 1MB max par fichier
  COMPRESSION_RATIO: 0.7 // Ratio de compression moyen
};
```

### **Étape 2 : ContextManager Core**

#### **2.1 Gestion du Contexte**
```typescript
// src/context/contextManager.ts
export class ContextManager {
  private contextFiles: Map<string, IContextFile> = new Map();
  private recentFiles: IContextFile[] = [];
  private focusFiles: Set<string> = new Set();
  private currentMode: ContextMode = ContextMode.NORMAL;
  private storageService: IStorageService;
  private fileTracker: FileTracker;

  constructor(storageService: IStorageService) {
    this.storageService = storageService;
    this.fileTracker = new FileTracker(this);
    this.loadContext();
  }

  async loadContext(): Promise<void> {
    // Charger contexte sauvegardé
    const savedContext = await this.storageService.get('contextFiles', []);
    savedContext.forEach((file: IContextFile) => {
      this.contextFiles.set(file.id, file);
    });

    // Charger fichiers récents
    this.recentFiles = await this.storageService.get('recentFiles', []);
    
    // Charger mode focus
    const focusData = await this.storageService.get('focusMode', {});
    this.currentMode = focusData.mode || ContextMode.NORMAL;
    this.focusFiles = new Set(focusData.files || []);
  }

  async addFile(filePath: string): Promise<string> {
    const fileStats = await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
    const content = await this.readFileContent(filePath);
    
    const contextFile: IContextFile = {
      id: this.generateFileId(filePath),
      path: filePath,
      name: path.basename(filePath),
      type: 'file',
      size: fileStats.size,
      content,
      language: this.detectLanguage(filePath),
      lastModified: new Date(fileStats.mtime),
      addedAt: new Date(),
      priority: this.calculatePriority(filePath),
      isRecent: false,
      isExcluded: false,
      metadata: await this.extractMetadata(filePath, content)
    };

    this.contextFiles.set(contextFile.id, contextFile);
    await this.saveContext();
    await this.optimizeIfNeeded();
    
    return contextFile.id;
  }

  async addFolder(folderPath: string): Promise<string[]> {
    const files = await this.scanFolder(folderPath);
    const addedFiles: string[] = [];

    for (const filePath of files) {
      if (this.shouldIncludeFile(filePath)) {
        const fileId = await this.addFile(filePath);
        addedFiles.push(fileId);
      }
    }

    return addedFiles;
  }

  async removeFile(fileId: string): Promise<void> {
    this.contextFiles.delete(fileId);
    this.focusFiles.delete(fileId);
    await this.saveContext();
  }

  async clearContext(): Promise<void> {
    this.contextFiles.clear();
    this.focusFiles.clear();
    this.currentMode = ContextMode.NORMAL;
    await this.saveContext();
  }

  async setFocusMode(enabled: boolean, fileIds?: string[]): Promise<void> {
    this.currentMode = enabled ? ContextMode.FOCUS : ContextMode.NORMAL;
    
    if (enabled && fileIds) {
      this.focusFiles = new Set(fileIds);
    } else if (!enabled) {
      this.focusFiles.clear();
    }

    await this.saveFocusMode();
  }

  getContextFiles(): IContextFile[] {
    if (this.currentMode === ContextMode.FOCUS) {
      return Array.from(this.contextFiles.values())
        .filter(file => this.focusFiles.has(file.id));
    }
    
    return Array.from(this.contextFiles.values());
  }

  getRecentFiles(): IContextFile[] {
    return this.recentFiles.slice(0, CONTEXT_CONFIG.recentFilesLimit);
  }

  getContextStats(): IContextStats {
    const files = this.getContextFiles();
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const estimatedTokens = Math.ceil(totalSize / TOKEN_ESTIMATION.CHARS_PER_TOKEN);

    return {
      totalFiles: files.filter(f => f.type === 'file').length,
      totalFolders: files.filter(f => f.type === 'folder').length,
      totalSize,
      estimatedTokens,
      compressionRatio: this.calculateCompressionRatio(),
      focusMode: this.currentMode === ContextMode.FOCUS,
      focusFiles: Array.from(this.focusFiles),
      lastOptimized: new Date()
    };
  }

  async optimizeContext(): Promise<void> {
    const stats = this.getContextStats();
    
    if (stats.estimatedTokens > CONTEXT_CONFIG.maxTokens) {
      // Supprimer fichiers moins prioritaires
      const files = Array.from(this.contextFiles.values())
        .sort((a, b) => a.priority - b.priority);
      
      let currentTokens = stats.estimatedTokens;
      const targetTokens = CONTEXT_CONFIG.maxTokens * 0.8; // 80% de la limite
      
      for (const file of files) {
        if (currentTokens <= targetTokens) break;
        
        if (!this.focusFiles.has(file.id) && !file.isRecent) {
          await this.removeFile(file.id);
          currentTokens -= Math.ceil(file.size / TOKEN_ESTIMATION.CHARS_PER_TOKEN);
        }
      }
    }
  }

  private async readFileContent(filePath: string): Promise<string> {
    try {
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      return Buffer.from(content).toString('utf8');
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return '';
    }
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: { [key: string]: string } = {
      '.ts': 'typescript',
      '.tsx': 'typescriptreact',
      '.js': 'javascript',
      '.jsx': 'javascriptreact',
      '.json': 'json',
      '.md': 'markdown',
      '.yml': 'yaml',
      '.yaml': 'yaml',
      '.css': 'css',
      '.scss': 'scss',
      '.html': 'html'
    };
    
    return languageMap[ext] || 'plaintext';
  }

  private calculatePriority(filePath: string): number {
    let priority = 50; // Base priority
    
    // Augmenter priorité pour certains types
    if (filePath.includes('src/')) priority += 20;
    if (filePath.includes('components/')) priority += 15;
    if (filePath.includes('utils/')) priority += 10;
    if (filePath.includes('types/')) priority += 10;
    
    // Diminuer priorité pour certains types
    if (filePath.includes('test/') || filePath.includes('.test.')) priority -= 20;
    if (filePath.includes('node_modules/')) priority -= 50;
    if (filePath.includes('.config.')) priority -= 10;
    
    return Math.max(0, Math.min(100, priority));
  }

  private shouldIncludeFile(filePath: string): boolean {
    // Vérifier patterns d'exclusion
    for (const pattern of CONTEXT_CONFIG.excludePatterns) {
      if (minimatch(filePath, pattern)) {
        return false;
      }
    }
    
    // Vérifier patterns d'inclusion
    for (const pattern of CONTEXT_CONFIG.includePatterns) {
      if (minimatch(filePath, pattern)) {
        return true;
      }
    }
    
    return false;
  }

  private async scanFolder(folderPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(folderPath));
      
      for (const [name, type] of entries) {
        const fullPath = path.join(folderPath, name);
        
        if (type === vscode.FileType.File) {
          files.push(fullPath);
        } else if (type === vscode.FileType.Directory) {
          // Récursion pour sous-dossiers
          const subFiles = await this.scanFolder(fullPath);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      console.error(`Error scanning folder ${folderPath}:`, error);
    }
    
    return files;
  }

  private generateFileId(filePath: string): string {
    return `file_${Buffer.from(filePath).toString('base64').slice(0, 16)}`;
  }

  private calculateCompressionRatio(): number {
    // Calculer ratio de compression basé sur la déduplication
    // et l'optimisation du contenu
    return TOKEN_ESTIMATION.COMPRESSION_RATIO;
  }

  private async extractMetadata(filePath: string, content: string): Promise<IFileMetadata> {
    const lineCount = content.split('\n').length;
    const isTest = filePath.includes('.test.') || filePath.includes('/test/');
    const isConfig = filePath.includes('.config.') || filePath.includes('config/');
    
    return {
      lineCount,
      encoding: 'utf8',
      isTest,
      isConfig,
      dependencies: this.extractDependencies(content)
    };
  }

  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    
    // Extraire imports/requires
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }
    
    while ((match = requireRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }
    
    return [...new Set(dependencies)]; // Dédupliquer
  }

  private async saveContext(): Promise<void> {
    const contextArray = Array.from(this.contextFiles.values());
    await this.storageService.set('contextFiles', contextArray);
  }

  private async saveFocusMode(): Promise<void> {
    await this.storageService.set('focusMode', {
      mode: this.currentMode,
      files: Array.from(this.focusFiles)
    });
  }

  private async optimizeIfNeeded(): Promise<void> {
    if (CONTEXT_CONFIG.autoOptimize) {
      const stats = this.getContextStats();
      if (stats.estimatedTokens > CONTEXT_CONFIG.maxTokens) {
        await this.optimizeContext();
      }
    }
  }
}
```

### **Étape 3 : FileTracker pour Recently Opened**

#### **3.1 Tracking Automatique**
```typescript
// src/context/fileTracker.ts
export class FileTracker {
  private contextManager: ContextManager;
  private recentFiles: Map<string, IRecentFile> = new Map();
  private disposables: vscode.Disposable[] = [];

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
    this.setupFileWatching();
    this.loadRecentFiles();
  }

  private setupFileWatching(): void {
    // Écouter ouverture de fichiers
    const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(
      this.handleFileOpened.bind(this)
    );

    // Écouter changement d'éditeur actif
    const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(
      this.handleEditorChanged.bind(this)
    );

    this.disposables.push(onDidOpenTextDocument, onDidChangeActiveTextEditor);
  }

  private async handleFileOpened(document: vscode.TextDocument): Promise<void> {
    if (this.shouldTrackFile(document.uri.fsPath)) {
      await this.addRecentFile(document.uri.fsPath);
    }
  }

  private async handleEditorChanged(editor: vscode.TextEditor | undefined): Promise<void> {
    if (editor && this.shouldTrackFile(editor.document.uri.fsPath)) {
      await this.updateFileAccess(editor.document.uri.fsPath);
    }
  }

  private async addRecentFile(filePath: string): Promise<void> {
    const recentFile: IRecentFile = {
      path: filePath,
      name: path.basename(filePath),
      lastAccessed: new Date(),
      accessCount: 1,
      size: 0 // Sera calculé si ajouté au contexte
    };

    // Mettre à jour si existe déjà
    if (this.recentFiles.has(filePath)) {
      const existing = this.recentFiles.get(filePath)!;
      existing.lastAccessed = new Date();
      existing.accessCount++;
    } else {
      this.recentFiles.set(filePath, recentFile);
    }

    await this.saveRecentFiles();
    await this.cleanupOldFiles();
  }

  private shouldTrackFile(filePath: string): boolean {
    // Ne pas tracker certains types de fichiers
    const excludePatterns = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/*.log'
    ];

    return !excludePatterns.some(pattern => minimatch(filePath, pattern));
  }

  getRecentFiles(): IRecentFile[] {
    return Array.from(this.recentFiles.values())
      .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
      .slice(0, CONTEXT_CONFIG.recentFilesLimit);
  }

  async addRecentToContext(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      await this.contextManager.addFile(filePath);
    }
  }

  private async cleanupOldFiles(): Promise<void> {
    const files = Array.from(this.recentFiles.values())
      .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());

    // Garder seulement les N plus récents
    const toKeep = files.slice(0, CONTEXT_CONFIG.recentFilesLimit * 2);
    this.recentFiles.clear();
    
    toKeep.forEach(file => {
      this.recentFiles.set(file.path, file);
    });

    await this.saveRecentFiles();
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}

interface IRecentFile {
  path: string;
  name: string;
  lastAccessed: Date;
  accessCount: number;
  size: number;
}
```

## 🧪 **Tests et Validation**

### **Tests Fonctionnels**
- [ ] **Ajout de fichiers** individuels et par dossier
- [ ] **Tracking automatique** des fichiers récents
- [ ] **Mode focus** avec filtrage
- [ ] **Optimisation automatique** du contexte
- [ ] **Calcul de tokens** et limites

### **Tests de Performance**
- [ ] **Scan de dossiers** volumineux (< 2s)
- [ ] **Calcul de stats** en temps réel (< 100ms)
- [ ] **Optimisation** du contexte (< 500ms)

### **Tests d'Intégration**
- [ ] **Persistance** du contexte entre sessions
- [ ] **Synchronisation** avec VSCode workspace
- [ ] **Gestion d'erreurs** pour fichiers inaccessibles

## 🎯 **Critères de Succès**

- ✅ **Gestion fluide** de 50+ fichiers dans le contexte
- ✅ **Tracking automatique** des fichiers récents
- ✅ **Optimisation intelligente** respectant les limites de tokens
- ✅ **Interface intuitive** pour gestion du contexte
- ✅ **Performance** acceptable même avec gros projets

Cette implémentation créera un système de gestion du contexte révolutionnaire, permettant aux utilisateurs de maintenir un contexte optimal pour leurs conversations avec l'IA !
