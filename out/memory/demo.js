"use strict";
/**
 * Démonstration du système de mémoires intelligent
 * Ce fichier peut être utilisé pour tester manuellement le système
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
exports.MemorySystemDemo = void 0;
exports.runMemorySystemDemo = runMemorySystemDemo;
exports.registerDemoCommand = registerDemoCommand;
const vscode = __importStar(require("vscode"));
const memoryManager_1 = require("./memoryManager");
const types_1 = require("./types");
class MemorySystemDemo {
    constructor(globalStorageUri) {
        this.memoryManager = new memoryManager_1.IntelligentMemoryManager(globalStorageUri);
    }
    /**
     * Démonstration complète du système de mémoires
     */
    async runDemo() {
        try {
            console.log('🧠 Démarrage de la démonstration du système de mémoires...');
            // Initialisation
            await this.memoryManager.initialize();
            console.log('✅ Système de mémoires initialisé');
            // Démonstration des opérations CRUD
            await this.demonstrateCRUD();
            // Démonstration de la recherche
            await this.demonstrateSearch();
            // Démonstration des statistiques
            await this.demonstrateStats();
            // Démonstration de l'export/import
            await this.demonstrateExportImport();
            // Démonstration de la compression
            await this.demonstrateCompression();
            console.log('🎉 Démonstration terminée avec succès !');
        }
        catch (error) {
            console.error('❌ Erreur lors de la démonstration :', error);
            throw error;
        }
    }
    /**
     * Démonstration des opérations CRUD
     */
    async demonstrateCRUD() {
        console.log('\n📝 Démonstration des opérations CRUD...');
        // Créer des mémoires de différents types
        const personalMemoryId = await this.memoryManager.createMemory('Toujours utiliser TypeScript pour une meilleure sécurité de type. Éviter any autant que possible.', types_1.MemoryType.PERSONAL, ['typescript', 'best-practice', 'type-safety'], {
            language: 'typescript',
            category: 'coding-standard',
            priority: 5
        });
        console.log(`✅ Mémoire personnelle créée : ${personalMemoryId.substring(0, 8)}...`);
        const repositoryMemoryId = await this.memoryManager.createMemory('Ce projet utilise React avec TypeScript. Structure : src/components, src/hooks, src/utils.', types_1.MemoryType.REPOSITORY, ['react', 'typescript', 'project-structure'], {
            project: 'code-assist-ai',
            language: 'typescript',
            category: 'architecture'
        });
        console.log(`✅ Mémoire de repository créée : ${repositoryMemoryId.substring(0, 8)}...`);
        const guidelineMemoryId = await this.memoryManager.createMemory('Toujours écrire des tests unitaires pour les fonctions critiques. Utiliser des noms descriptifs.', types_1.MemoryType.GUIDELINE, ['testing', 'unit-tests', 'naming'], {
            category: 'quality-assurance',
            priority: 4
        });
        console.log(`✅ Mémoire guideline créée : ${guidelineMemoryId.substring(0, 8)}...`);
        // Lire une mémoire
        const retrievedMemory = await this.memoryManager.getMemory(personalMemoryId);
        console.log(`✅ Mémoire récupérée : "${retrievedMemory?.content.substring(0, 50)}..."`);
        // Mettre à jour une mémoire
        await this.memoryManager.updateMemory(personalMemoryId, {
            content: retrievedMemory.content + ' Utiliser des interfaces pour définir les contrats.',
            tags: [...retrievedMemory.tags, 'interfaces']
        });
        console.log(`✅ Mémoire mise à jour avec succès`);
        // Vérifier la mise à jour
        const updatedMemory = await this.memoryManager.getMemory(personalMemoryId);
        console.log(`✅ Contenu mis à jour : "${updatedMemory?.content.substring(0, 60)}..."`);
    }
    /**
     * Démonstration de la recherche
     */
    async demonstrateSearch() {
        console.log('\n🔍 Démonstration de la recherche...');
        // Recherche par contenu
        const typeScriptResults = await this.memoryManager.searchMemories('typescript');
        console.log(`✅ Recherche "typescript" : ${typeScriptResults.length} résultats`);
        if (typeScriptResults.length > 0) {
            const topResult = typeScriptResults[0];
            console.log(`   📌 Meilleur résultat (score: ${(topResult.relevanceScore * 100).toFixed(1)}%) : "${topResult.memory.content.substring(0, 50)}..."`);
        }
        // Recherche par tags
        const testingResults = await this.memoryManager.searchMemories('testing');
        console.log(`✅ Recherche "testing" : ${testingResults.length} résultats`);
        // Recherche avec filtres
        const personalMemories = await this.memoryManager.searchMemories('', {
            type: types_1.MemoryType.PERSONAL
        });
        console.log(`✅ Mémoires personnelles : ${personalMemories.length} résultats`);
        const repositoryMemories = await this.memoryManager.getMemoriesByType(types_1.MemoryType.REPOSITORY);
        console.log(`✅ Mémoires de repository : ${repositoryMemories.length} résultats`);
    }
    /**
     * Démonstration des statistiques
     */
    async demonstrateStats() {
        console.log('\n📊 Démonstration des statistiques...');
        const stats = await this.memoryManager.getStats();
        console.log(`✅ Statistiques globales :`);
        console.log(`   📝 Total des mémoires : ${stats.totalMemories}`);
        console.log(`   💾 Taille totale : ${(stats.totalSize / 1024).toFixed(2)} KB`);
        console.log(`   🗜️ Mémoires compressées : ${stats.compressedCount}`);
        console.log(`   📈 Taille moyenne : ${Math.round(stats.averageSize)} caractères`);
        console.log(`✅ Répartition par type :`);
        console.log(`   📝 Personal : ${stats.memoryByType.personal}`);
        console.log(`   🏢 Repository : ${stats.memoryByType.repository}`);
        console.log(`   📋 Guidelines : ${stats.memoryByType.guideline}`);
        console.log(`   💬 Session : ${stats.memoryByType.session}`);
        if (stats.oldestMemory && stats.newestMemory) {
            console.log(`✅ Période :`);
            console.log(`   📅 Plus ancienne : ${stats.oldestMemory.toLocaleDateString()}`);
            console.log(`   📅 Plus récente : ${stats.newestMemory.toLocaleDateString()}`);
        }
    }
    /**
     * Démonstration de l'export/import
     */
    async demonstrateExportImport() {
        console.log('\n💾 Démonstration de l\'export/import...');
        // Export JSON
        const jsonExport = await this.memoryManager.exportMemories({ format: 'json' });
        const exportedMemories = JSON.parse(jsonExport);
        console.log(`✅ Export JSON : ${exportedMemories.length} mémoires exportées`);
        // Export Markdown
        const markdownExport = await this.memoryManager.exportMemories({ format: 'markdown' });
        console.log(`✅ Export Markdown : ${markdownExport.length} caractères`);
        // Créer une sauvegarde
        const backup = await this.memoryManager.createBackup();
        console.log(`✅ Sauvegarde créée : ${backup.memories.length} mémoires, checksum: ${backup.checksum.substring(0, 8)}...`);
        // Test d'import (avec des données de test)
        const testMemory = {
            id: 'demo-import-test',
            content: 'Mémoire importée pour la démonstration',
            type: types_1.MemoryType.SESSION,
            timestamp: new Date(),
            size: 42,
            compressed: false,
            tags: ['demo', 'import'],
            metadata: { category: 'test' }
        };
        const importResult = await this.memoryManager.importMemories(JSON.stringify([testMemory]));
        console.log(`✅ Import test : ${importResult.imported} importées, ${importResult.skipped} ignorées`);
    }
    /**
     * Démonstration de la compression
     */
    async demonstrateCompression() {
        console.log('\n🗜️ Démonstration de la compression...');
        // Créer une mémoire volumineuse pour tester la compression
        const largeContent = `
    /**
     * Fonction complexe avec beaucoup de commentaires et de code
     * Cette fonction démontre les capacités de compression du système
     */
    function complexFunction(param1: string, param2: number, param3: boolean): Promise<any> {
      // TODO: Optimiser cette fonction
      // FIXME: Gérer les cas d'erreur
      
      const result = {
        data: param1.repeat(param2),
        isValid: param3,
        timestamp: new Date(),
        metadata: {
          version: '1.0.0',
          author: 'demo',
          description: 'Fonction de démonstration pour la compression'
        }
      };
      
      // Traitement complexe avec beaucoup de lignes
      for (let i = 0; i < param2; i++) {
        console.log(\`Processing iteration \${i}\`);
        // Simulation de traitement
        if (i % 2 === 0) {
          result.data += \` - even \${i}\`;
        } else {
          result.data += \` - odd \${i}\`;
        }
      }
      
      return Promise.resolve(result);
    }
    
    export { complexFunction };
    `;
        const largeMemoryId = await this.memoryManager.createMemory(largeContent, types_1.MemoryType.REPOSITORY, ['function', 'complex', 'demo'], {
            language: 'typescript',
            category: 'code-example',
            source: 'demo.ts'
        });
        console.log(`✅ Mémoire volumineuse créée : ${largeContent.length} caractères`);
        // Vérifier si la compression est nécessaire
        const allMemories = await this.memoryManager.searchMemories('');
        const totalSize = allMemories.reduce((sum, result) => sum + result.memory.size, 0);
        console.log(`✅ Taille totale actuelle : ${(totalSize / 1024).toFixed(2)} KB`);
        // Déclencher la compression si nécessaire
        try {
            await this.memoryManager.compressMemories();
            console.log(`✅ Compression effectuée`);
            // Vérifier les statistiques après compression
            const statsAfterCompression = await this.memoryManager.getStats();
            console.log(`✅ Après compression : ${statsAfterCompression.compressedCount} mémoires compressées`);
        }
        catch (error) {
            console.log(`ℹ️ Compression non nécessaire ou erreur : ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Nettoyer les ressources
     */
    async cleanup() {
        await this.memoryManager.dispose();
        console.log('✅ Ressources nettoyées');
    }
}
exports.MemorySystemDemo = MemorySystemDemo;
/**
 * Fonction utilitaire pour exécuter la démonstration
 */
async function runMemorySystemDemo(context) {
    const demo = new MemorySystemDemo(context.globalStorageUri);
    try {
        await demo.runDemo();
    }
    finally {
        await demo.cleanup();
    }
}
/**
 * Commande VSCode pour lancer la démonstration
 */
function registerDemoCommand(context) {
    const command = vscode.commands.registerCommand('codeAssist.runMemoryDemo', async () => {
        try {
            vscode.window.showInformationMessage('🧠 Démarrage de la démonstration du système de mémoires...');
            await runMemorySystemDemo(context);
            vscode.window.showInformationMessage('🎉 Démonstration du système de mémoires terminée ! Consultez la console pour les détails.');
        }
        catch (error) {
            vscode.window.showErrorMessage(`❌ Erreur lors de la démonstration : ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    context.subscriptions.push(command);
}
//# sourceMappingURL=demo.js.map