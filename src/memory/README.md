# 🧠 Intelligent Memory System

Un système de mémoires avancé inspiré d'Augment, permettant de stocker, gérer et compresser automatiquement les informations contextuelles pour améliorer les interactions avec l'IA.

## 🎯 Fonctionnalités Principales

### ✨ Gestion Intelligente des Mémoires
- **Types de mémoires** : Personal, Repository, Guidelines, Session
- **Stockage persistant** entre les sessions VSCode
- **Compression automatique** pour optimiser l'espace
- **Recherche full-text** avec scoring de pertinence
- **Système de tags** pour l'organisation
- **Métadonnées enrichies** (projet, langage, catégorie)

### 🔍 Recherche et Filtrage
- Recherche par contenu, tags, et métadonnées
- Filtres par type, date, taille, statut de compression
- Scoring de pertinence intelligent
- Génération automatique de snippets

### 💾 Import/Export et Sauvegarde
- Export en JSON, Markdown, CSV
- Import avec détection de doublons
- Système de backup automatique
- Restauration avec validation d'intégrité

## 🏗️ Architecture

```
src/memory/
├── types.ts              # Types et interfaces TypeScript
├── config.ts             # Configuration du système
├── memoryManager.ts      # Gestionnaire principal
├── storageService.ts     # Service de stockage persistant
├── compressionService.ts # Service de compression intelligente
├── commands.ts           # Commandes VSCode
├── index.ts             # Exports principaux
├── test/                # Tests unitaires
└── README.md            # Documentation
```

## 🚀 Utilisation

### Commandes VSCode Disponibles

#### Gestion des Mémoires
- `Code Assistant: Add Memory` - Ajouter une nouvelle mémoire
- `Code Assistant: Add Selection to Memory` - Ajouter la sélection comme mémoire
- `Code Assistant: Search Memories` - Rechercher dans les mémoires
- `Code Assistant: Open Memory Panel` - Ouvrir le panneau de gestion

#### Types Spécifiques
- `Code Assistant: Add Personal Memory` - Ajouter une mémoire personnelle
- `Code Assistant: Add Repository Memory` - Ajouter une mémoire de projet
- `Code Assistant: Add Guideline Memory` - Ajouter une guideline

#### Maintenance
- `Code Assistant: Compress Memories` - Compresser manuellement
- `Code Assistant: Optimize Memory Storage` - Optimiser le stockage
- `Code Assistant: Show Memory Statistics` - Afficher les statistiques

#### Import/Export
- `Code Assistant: Export Memories` - Exporter les mémoires
- `Code Assistant: Import Memories` - Importer des mémoires
- `Code Assistant: Create Memory Backup` - Créer une sauvegarde
- `Code Assistant: Restore Memory Backup` - Restaurer une sauvegarde

### Utilisation Programmatique

```typescript
import { IntelligentMemoryManager, MemoryType } from './memory';

// Initialisation
const memoryManager = new IntelligentMemoryManager(context.globalStorageUri);
await memoryManager.initialize();

// Créer une mémoire
const memoryId = await memoryManager.createMemory(
  'Always use TypeScript for better type safety',
  MemoryType.PERSONAL,
  ['typescript', 'best-practice'],
  { language: 'typescript', category: 'coding-standard' }
);

// Rechercher des mémoires
const results = await memoryManager.searchMemories('typescript');

// Obtenir des statistiques
const stats = await memoryManager.getStats();
console.log(`Total: ${stats.totalMemories} mémoires, ${stats.totalSize} bytes`);
```

## ⚙️ Configuration

### Settings VSCode

```json
{
  "codeAssist.memories.maxSize": 1000000,
  "codeAssist.memories.autoCompress": true,
  "codeAssist.memories.compressionThreshold": 500000,
  "codeAssist.memories.maxMemoriesPerType": 100,
  "codeAssist.memories.backupInterval": 300000,
  "codeAssist.memories.enableAnalytics": true,
  "codeAssist.memories.retentionDays": 365
}
```

### Configuration Avancée

```typescript
import { MEMORY_CONFIG } from './memory/config';

// Personnaliser la configuration
MEMORY_CONFIG.maxMemorySize = 2000000; // 2MB
MEMORY_CONFIG.autoCompress = false;
MEMORY_CONFIG.compressionThreshold = 1000000; // 1MB
```

## 🧪 Tests

### Exécuter les Tests

```bash
# Compiler le projet
npm run compile

# Exécuter les tests (si configuré avec Jest)
npm test

# Test manuel dans VSCode
# Utiliser la commande "Developer: Reload Window" après compilation
```

### Tests Inclus

- ✅ CRUD des mémoires
- ✅ Recherche et filtrage
- ✅ Compression intelligente
- ✅ Import/Export
- ✅ Validation des données
- ✅ Backup/Restore
- ✅ Statistiques

## 📊 Métriques et Analytics

Le système collecte automatiquement des métriques pour optimiser les performances :

- **Utilisation des mémoires** : Fréquence d'accès, patterns d'utilisation
- **Efficacité de compression** : Ratios, temps de traitement
- **Performance de recherche** : Temps de réponse, pertinence
- **Stockage** : Taille totale, croissance, fragmentation

## 🔧 Compression Intelligente

### Algorithme de Compression

Le service de compression préserve automatiquement :
- **Mots-clés importants** : function, class, interface, etc.
- **Structures de code** : Déclarations, imports, exports
- **Commentaires critiques** : TODO, FIXME, WARNING
- **Patterns spéciaux** : URLs, versions, identifiants

### Configuration de Compression

```typescript
export const COMPRESSION_CONFIG = {
  minSizeForCompression: 1000,
  targetCompressionRatio: 0.6,
  preservedKeywords: ['function', 'class', 'interface', ...],
  preservedPatterns: [/\b[A-Z][a-zA-Z0-9]*\b/, ...]
};
```

## 🚨 Gestion d'Erreurs

Le système inclut une gestion d'erreurs robuste :

```typescript
try {
  await memoryManager.createMemory(content, type, tags);
} catch (error) {
  if (error instanceof ValidationError) {
    // Erreur de validation
  } else if (error instanceof StorageError) {
    // Erreur de stockage
  } else if (error instanceof CompressionError) {
    // Erreur de compression
  }
}
```

## 🔮 Roadmap

### Phase 1 ✅ (Implémentée)
- [x] Types et interfaces de base
- [x] MemoryManager principal
- [x] Service de stockage
- [x] Service de compression
- [x] Commandes VSCode
- [x] Tests unitaires

### Phase 2 🚧 (En cours)
- [ ] Interface webview pour gestion visuelle
- [ ] Panneau sidebar intégré
- [ ] Recherche avancée avec filtres UI
- [ ] Prévisualisation des mémoires

### Phase 3 📋 (Planifiée)
- [ ] Synchronisation cloud
- [ ] Partage de mémoires entre équipes
- [ ] Intelligence artificielle pour suggestions
- [ ] Intégration avec l'assistant IA principal

## 🤝 Contribution

Pour contribuer au système de mémoires :

1. Suivre les principes de clean code définis
2. Ajouter des tests pour toute nouvelle fonctionnalité
3. Documenter les changements d'API
4. Respecter l'architecture modulaire existante

## 📝 Licence

Ce système fait partie du projet Code Assistant AI et suit la même licence.
