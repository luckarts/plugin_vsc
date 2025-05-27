/**
 * Démonstration du système de mémoires intelligent
 * Ce fichier peut être utilisé pour tester manuellement le système
 */
import * as vscode from 'vscode';
export declare class MemorySystemDemo {
    private memoryManager;
    constructor(globalStorageUri: vscode.Uri);
    /**
     * Démonstration complète du système de mémoires
     */
    runDemo(): Promise<void>;
    /**
     * Démonstration des opérations CRUD
     */
    private demonstrateCRUD;
    /**
     * Démonstration de la recherche
     */
    private demonstrateSearch;
    /**
     * Démonstration des statistiques
     */
    private demonstrateStats;
    /**
     * Démonstration de l'export/import
     */
    private demonstrateExportImport;
    /**
     * Démonstration de la compression
     */
    private demonstrateCompression;
    /**
     * Nettoyer les ressources
     */
    cleanup(): Promise<void>;
}
/**
 * Fonction utilitaire pour exécuter la démonstration
 */
export declare function runMemorySystemDemo(context: vscode.ExtensionContext): Promise<void>;
/**
 * Commande VSCode pour lancer la démonstration
 */
export declare function registerDemoCommand(context: vscode.ExtensionContext): void;
//# sourceMappingURL=demo.d.ts.map