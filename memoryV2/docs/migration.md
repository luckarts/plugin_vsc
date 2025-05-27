# 🔄 Guide de migration Memory V1 → V2

## Vue d'ensemble

Ce guide détaille la migration du système de mémoire V1 vers V2, incluant la transformation des données, la préservation des fonctionnalités et la mise à jour des intégrations.

## Différences principales V1 vs V2

| Aspect | Memory V1 | Memory V2 |
|--------|-----------|-----------|
| **Architecture** | Monolithique VSCode | Modulaire MCP |
| **Stockage** | JSON local | Vector DB + Metadata |
| **Recherche** | Text-based | Semantic similarity |
| **Protocole** | Propriétaire | MCP Standard |
| **Clients** | VSCode uniquement | Multi-clients MCP |
| **Embeddings** | Non | Oui (automatique) |
| **Compression** | Basique | Intelligente |
| **API** | Interne | REST + MCP |

## Stratégie de migration

### Phase 1: Préparation (1-2 jours)
1. **Audit des données V1**
2. **Sauvegarde complète**
3. **Installation de V2**
4. **Tests de compatibilité**

### Phase 2: Migration des données (2-3 jours)
1. **Export des mémoires V1**
2. **Transformation des données**
3. **Import vers V2**
4. **Génération des embeddings**

### Phase 3: Validation (1 jour)
1. **Tests de fonctionnalité**
2. **Validation des données**
3. **Tests de performance**

### Phase 4: Déploiement (1 jour)
1. **Mise à jour de l'extension VSCode**
2. **Configuration des clients MCP**
3. **Formation utilisateur**

## Étapes détaillées

### 1. Audit et sauvegarde V1

#### Inventaire des données existantes
```bash
# Analyser les mémoires V1
npm run v1:analyze

# Résultat attendu:
# - Nombre total de mémoires
# - Répartition par type
# - Taille totale des données
# - Mémoires corrompues ou invalides
```

#### Sauvegarde complète
```bash
# Créer une sauvegarde complète
npm run v1:backup --output ./migration/backup-$(date +%Y%m%d)

# Vérifier l'intégrité de la sauvegarde
npm run v1:verify-backup --file ./migration/backup-20241201
```

#### Rapport d'audit
```typescript
interface V1AuditReport {
  totalMemories: number
  memoriesByType: Record<MemoryType, number>
  totalSize: number
  corruptedMemories: string[]
  duplicateMemories: Array<{
    ids: string[]
    similarity: number
  }>
  migrationComplexity: 'low' | 'medium' | 'high'
  estimatedMigrationTime: number
}
```

### 2. Transformation des données

#### Mapping des structures
```typescript
// V1 Memory Structure
interface V1Memory {
  id: string
  content: string
  type: string
  timestamp: Date
  tags: string[]
  metadata: {
    project?: string
    language?: string
    category?: string
  }
}

// V2 Memory Structure (cible)
interface V2Memory {
  id: string
  content: string
  type: MemoryType
  embedding?: number[]
  metadata: MemoryMetadata
  created: Date
  updated: Date
  accessed: Date
  accessCount: number
  compressed: boolean
  version: number
}
```

#### Script de transformation
```bash
# Transformer les données V1 vers V2
npm run migrate:transform --input ./migration/backup-20241201 --output ./migration/v2-data

# Options de transformation:
# --preserve-ids: Conserver les IDs originaux
# --merge-duplicates: Fusionner les doublons
# --update-metadata: Enrichir les métadonnées
# --validate: Valider les données transformées
```

#### Règles de transformation

**Types de mémoires**:
```typescript
const typeMapping: Record<string, MemoryType> = {
  'personal': MemoryType.PERSONAL,
  'project': MemoryType.REPOSITORY,
  'guideline': MemoryType.GUIDELINE,
  'temp': MemoryType.SESSION,
  'template': MemoryType.TEMPLATE
}
```

**Métadonnées enrichies**:
```typescript
function enrichMetadata(v1Memory: V1Memory): MemoryMetadata {
  return {
    tags: v1Memory.tags || [],
    project: v1Memory.metadata.project,
    language: v1Memory.metadata.language,
    framework: detectFramework(v1Memory.content),
    importance: calculateImportance(v1Memory),
    category: v1Memory.metadata.category || 'general',
    source: 'migration-v1',
    context: extractContext(v1Memory.content),
    relations: []
  }
}
```

### 3. Import vers V2

#### Préparation de l'environnement V2
```bash
# Installer et configurer V2
npm install
npm run setup:vectordb
npm run setup:embeddings

# Démarrer le serveur V2
npm run dev
```

#### Import des données transformées
```bash
# Import avec génération d'embeddings
npm run v2:import \
  --file ./migration/v2-data.json \
  --generate-embeddings \
  --batch-size 100 \
  --validate

# Suivi du progrès:
# [████████████████████████████████] 100% | 1250/1250 memories imported
# Embeddings generated: 1250/1250
# Validation: PASSED
# Import time: 15m 32s
```

#### Validation post-import
```bash
# Vérifier l'intégrité des données
npm run v2:validate-import --report ./migration/import-report.json

# Tests de recherche
npm run v2:test-search --queries ./migration/test-queries.json

# Comparaison V1 vs V2
npm run migrate:compare --v1-backup ./migration/backup-20241201 --v2-data current
```

### 4. Génération des embeddings

#### Configuration du modèle
```json
{
  "embedding": {
    "model": "sentence-transformers/all-MiniLM-L6-v2",
    "batchSize": 50,
    "device": "cpu",
    "timeout": 10000
  }
}
```

#### Génération par lots
```bash
# Générer les embeddings pour toutes les mémoires
npm run v2:generate-embeddings \
  --batch-size 50 \
  --parallel 2 \
  --resume-on-error

# Progression:
# Batch 1/25: [████████████████████████████████] 100% | 50/50 embeddings
# Batch 2/25: [████████████████████████████████] 100% | 50/50 embeddings
# ...
# Total: 1250 embeddings generated in 8m 45s
```

### 5. Tests de migration

#### Tests fonctionnels
```bash
# Test de création de mémoire
npm run test:create-memory

# Test de recherche sémantique
npm run test:semantic-search

# Test de mise à jour
npm run test:update-memory

# Test de suppression
npm run test:delete-memory
```

#### Tests de performance
```bash
# Benchmark de recherche
npm run benchmark:search --memories 1000 --queries 100

# Résultats attendus:
# Average search time: 45ms
# 95th percentile: 78ms
# Throughput: 1,200 searches/second
```

#### Tests de régression
```bash
# Comparer les résultats V1 vs V2
npm run test:regression \
  --v1-queries ./migration/v1-test-results.json \
  --v2-queries ./migration/v2-test-results.json

# Métriques de comparaison:
# - Précision de recherche: 92% (vs 78% en V1)
# - Rappel: 89% (vs 65% en V1)
# - Temps de réponse: 45ms (vs 120ms en V1)
```

### 6. Mise à jour des intégrations

#### Extension VSCode
```bash
# Mettre à jour l'extension pour utiliser MCP
npm run build:vscode-extension

# Installer la nouvelle version
code --install-extension ./dist/memory-v2-extension.vsix
```

#### Configuration des clients MCP
```json
// Claude Desktop
{
  "mcpServers": {
    "memory-v2": {
      "command": "node",
      "args": ["./memoryV2/dist/mcp-server.js"],
      "env": {
        "MEMORY_CONFIG": "./config/claude.json"
      }
    }
  }
}

// Cursor
{
  "mcp": {
    "servers": [
      {
        "name": "memory-v2",
        "url": "http://localhost:3000/mcp"
      }
    ]
  }
}
```

## Rollback et récupération

### Plan de rollback
```bash
# Sauvegarder l'état V2 avant rollback
npm run v2:backup --output ./rollback/v2-state-$(date +%Y%m%d)

# Restaurer V1 depuis la sauvegarde
npm run v1:restore --file ./migration/backup-20241201

# Vérifier la restauration
npm run v1:verify
```

### Récupération partielle
```bash
# Récupérer des mémoires spécifiques depuis V2
npm run v2:export --ids "mem1,mem2,mem3" --output ./recovery/specific-memories.json

# Importer dans V1
npm run v1:import --file ./recovery/specific-memories.json --merge
```

## Checklist de migration

### Pré-migration
- [ ] Audit complet des données V1
- [ ] Sauvegarde vérifiée
- [ ] V2 installé et testé
- [ ] Plan de rollback préparé
- [ ] Équipe formée sur V2

### Migration
- [ ] Données transformées et validées
- [ ] Import V2 réussi
- [ ] Embeddings générés
- [ ] Tests fonctionnels passés
- [ ] Tests de performance validés

### Post-migration
- [ ] Extension VSCode mise à jour
- [ ] Clients MCP configurés
- [ ] Documentation utilisateur mise à jour
- [ ] Formation équipe effectuée
- [ ] Monitoring activé

### Validation finale
- [ ] Toutes les mémoires V1 migrées
- [ ] Recherche sémantique fonctionnelle
- [ ] Performance améliorée
- [ ] Aucune perte de données
- [ ] Utilisateurs formés

## Support et dépannage

### Problèmes courants

#### Échec de génération d'embeddings
```bash
# Régénérer les embeddings manqués
npm run v2:fix-embeddings --missing-only

# Utiliser un modèle alternatif
npm run v2:generate-embeddings --model paraphrase-MiniLM-L6-v2
```

#### Données corrompues
```bash
# Identifier les mémoires corrompues
npm run v2:validate --fix-corrupted

# Récupérer depuis la sauvegarde V1
npm run migrate:recover --ids "corrupted-id-1,corrupted-id-2"
```

#### Performance dégradée
```bash
# Optimiser les index vectoriels
npm run v2:optimize-indexes

# Nettoyer le cache
npm run v2:clear-cache

# Recompresser les mémoires
npm run v2:recompress --force
```

### Contact support
- **Documentation**: [docs/troubleshooting.md](./troubleshooting.md)
- **Issues GitHub**: [Repository Issues](https://github.com/your-repo/issues)
- **Discord**: [Support Channel](https://discord.gg/your-channel)
