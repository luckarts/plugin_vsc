# 📋 Task 003: Interfaces et types MCP

## 🎯 Comportement attendu (Langage métier)

**En tant que développeur du système Memory V2, je veux des types TypeScript complets et une validation robuste pour toutes les entités MCP afin de garantir la compatibilité avec le standard MCP et d'éviter les erreurs de runtime.**

## 📝 Spécifications détaillées

### Comportement principal
1. **Types TypeScript complets**
   - Définition de tous les types MCP selon le standard
   - Types spécifiques au domaine des mémoires
   - Interfaces pour les outils et leurs paramètres
   - Types pour les réponses et erreurs

2. **Validation runtime**
   - Validation automatique des données entrantes
   - Messages d'erreur descriptifs
   - Validation des schémas JSON
   - Conversion de types automatique quand possible

3. **Sérialisation/Désérialisation**
   - Conversion automatique JSON ↔ TypeScript
   - Gestion des dates et types complexes
   - Préservation des métadonnées
   - Optimisation pour la performance

## 🏗️ Structure des types

### Types MCP de base
```typescript
// Standard MCP Protocol Types
interface MCPRequest {
  jsonrpc: '2.0'
  method: string
  params?: object
  id: string | number
}

interface MCPResponse {
  jsonrpc: '2.0'
  result?: object
  error?: MCPError
  id: string | number
}

interface MCPError {
  code: number
  message: string
  data?: object
}

interface MCPTool {
  name: string
  description: string
  inputSchema: JSONSchema7
}

interface MCPToolCall {
  name: string
  arguments: object
}

interface MCPToolResult {
  content: MCPContent[]
  isError?: boolean
}

interface MCPContent {
  type: 'text' | 'image' | 'resource'
  text?: string
  data?: string
  mimeType?: string
}
```

### Types spécifiques aux mémoires
```typescript
// Memory Domain Types
enum MemoryType {
  PERSONAL = 'personal',
  REPOSITORY = 'repository',
  GUIDELINE = 'guideline',
  SESSION = 'session',
  TEMPLATE = 'template'
}

interface Memory {
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
  compressionRatio?: number
  version: number
}

interface MemoryMetadata {
  tags: string[]
  project?: string
  language?: string
  framework?: string
  importance: number
  category: string
  source: string
  context?: ContextInfo
  relations?: MemoryRelation[]
}

interface ContextInfo {
  file?: string
  line?: number
  function?: string
  class?: string
  module?: string
  workspace?: string
}

interface MemoryRelation {
  type: 'similar' | 'related' | 'parent' | 'child' | 'reference'
  targetId: string
  strength: number
  description?: string
}
```

### Types pour les outils MCP
```typescript
// Tool Parameter Types
interface CreateMemoryParams {
  content: string
  type?: MemoryType
  tags?: string[]
  metadata?: Partial<MemoryMetadata>
}

interface SearchMemoriesParams {
  query: string
  type?: MemoryType | MemoryType[]
  tags?: string[]
  limit?: number
  threshold?: number
  filters?: SearchFilters
  sortBy?: 'similarity' | 'date' | 'importance' | 'relevance'
}

interface SearchFilters {
  project?: string
  language?: string
  dateRange?: {
    from: Date
    to: Date
  }
  importance?: {
    min: number
    max: number
  }
  hasEmbedding?: boolean
  compressed?: boolean
}

interface UpdateMemoryParams {
  memoryId: string
  content?: string
  tags?: string[]
  metadata?: Partial<MemoryMetadata>
  importance?: number
}

interface DeleteMemoryParams {
  memoryId: string
  force?: boolean
}

interface GetStatsParams {
  includeDetails?: boolean
  groupBy?: 'type' | 'project' | 'language' | 'date'
}
```

### Types pour les réponses
```typescript
// Response Types
interface CreateMemoryResult {
  memoryId: string
  status: 'created' | 'updated'
  embedding?: {
    model: string
    dimensions: number
    generationTime: number
  }
}

interface SearchMemoriesResult {
  memories: SearchResultMemory[]
  total: number
  queryTime: number
  query: {
    original: string
    processed: string
    embedding?: number[]
  }
}

interface SearchResultMemory {
  memory: Memory
  similarity: number
  rank: number
  highlights?: string[]
  explanation?: string
}

interface MemoryStatsResult {
  total: number
  byType: Record<MemoryType, number>
  byProject: Record<string, number>
  byLanguage: Record<string, number>
  storage: {
    totalSize: number
    compressedSize: number
    compressionRatio: number
  }
  performance: {
    averageSearchTime: number
    averageCreateTime: number
    cacheHitRate: number
  }
  recent: {
    created: number
    accessed: number
    updated: number
  }
}
```

## 🔧 Schémas de validation

### Schémas Zod pour validation
```typescript
import { z } from 'zod'

// Base schemas
const MemoryTypeSchema = z.enum(['personal', 'repository', 'guideline', 'session', 'template'])

const ContextInfoSchema = z.object({
  file: z.string().optional(),
  line: z.number().optional(),
  function: z.string().optional(),
  class: z.string().optional(),
  module: z.string().optional(),
  workspace: z.string().optional()
})

const MemoryMetadataSchema = z.object({
  tags: z.array(z.string()),
  project: z.string().optional(),
  language: z.string().optional(),
  framework: z.string().optional(),
  importance: z.number().min(0).max(10),
  category: z.string(),
  source: z.string(),
  context: ContextInfoSchema.optional(),
  relations: z.array(z.object({
    type: z.enum(['similar', 'related', 'parent', 'child', 'reference']),
    targetId: z.string(),
    strength: z.number().min(0).max(1),
    description: z.string().optional()
  })).optional()
})

// Tool parameter schemas
const CreateMemoryParamsSchema = z.object({
  content: z.string().min(1).max(100000),
  type: MemoryTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  metadata: MemoryMetadataSchema.partial().optional()
})

const SearchMemoriesParamsSchema = z.object({
  query: z.string().min(1),
  type: z.union([MemoryTypeSchema, z.array(MemoryTypeSchema)]).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).optional(),
  threshold: z.number().min(0).max(1).optional(),
  filters: z.object({
    project: z.string().optional(),
    language: z.string().optional(),
    dateRange: z.object({
      from: z.date(),
      to: z.date()
    }).optional(),
    importance: z.object({
      min: z.number().min(0).max(10),
      max: z.number().min(0).max(10)
    }).optional(),
    hasEmbedding: z.boolean().optional(),
    compressed: z.boolean().optional()
  }).optional(),
  sortBy: z.enum(['similarity', 'date', 'importance', 'relevance']).optional()
})
```

## ✅ Critères d'acceptation

### 🎯 Critères fonctionnels

#### CA-F01: Types MCP complets et conformes
- [ ] **Tous les types MCP de base sont définis** selon le standard officiel
  - `MCPRequest`, `MCPResponse`, `MCPError` avec propriétés exactes
  - `MCPTool`, `MCPToolCall`, `MCPToolResult` avec schémas complets
  - `MCPContent` avec support des types text/image/resource
- [ ] **Types spécifiques au domaine des mémoires** sont implémentés
  - `Memory` avec tous les champs requis (id, content, type, metadata, dates, etc.)
  - `MemoryType` enum avec toutes les valeurs (personal, repository, guideline, session, template)
  - `MemoryMetadata` avec structure complète (tags, project, language, importance, etc.)
  - `ContextInfo` pour la localisation du code
  - `MemoryRelation` pour les liens entre mémoires
- [ ] **Types pour les paramètres d'outils** sont définis
  - `CreateMemoryParams`, `SearchMemoriesParams`, `UpdateMemoryParams`
  - `DeleteMemoryParams`, `GetStatsParams` avec tous les champs optionnels
  - `SearchFilters` avec filtres avancés (dateRange, importance, etc.)
- [ ] **Types pour les réponses** sont complets
  - `CreateMemoryResult`, `SearchMemoriesResult`, `MemoryStatsResult`
  - `SearchResultMemory` avec similarity, rank, highlights
  - Tous les types de résultats incluent les métadonnées nécessaires

#### CA-F02: Validation runtime robuste avec Zod
- [ ] **Schémas Zod pour tous les types** sont implémentés
  - Schémas de base : `MemoryTypeSchema`, `ContextInfoSchema`, `MemoryMetadataSchema`
  - Schémas de paramètres : validation complète avec contraintes (min/max, required)
  - Schémas de réponses : validation des structures de sortie
- [ ] **Validation automatique des données entrantes**
  - Validation des requêtes MCP avant traitement
  - Validation des paramètres d'outils avec messages d'erreur descriptifs
  - Conversion automatique des types quand possible (string → number, etc.)
- [ ] **Messages d'erreur descriptifs et localisés**
  - Erreurs de validation avec chemin exact du champ en erreur
  - Messages en français avec contexte métier
  - Codes d'erreur standardisés selon MCP
- [ ] **Gestion des cas limites**
  - Validation des UUIDs pour les IDs de mémoire
  - Validation des dates avec formats multiples acceptés
  - Validation des embeddings (arrays de nombres)
  - Validation des tailles de contenu (1-100000 caractères)

#### CA-F03: Sérialisation/Désérialisation complète
- [ ] **Conversion JSON ↔ TypeScript sans perte**
  - Préservation des types Date lors de la sérialisation
  - Gestion correcte des types optionnels et undefined
  - Support des types complexes (embeddings, metadata)
- [ ] **Optimisation pour la performance**
  - Sérialisation lazy pour les gros objets
  - Cache des schémas de validation compilés
  - Streaming pour les grandes collections de mémoires
- [ ] **Gestion des métadonnées**
  - Préservation des propriétés custom dans metadata
  - Support des relations entre mémoires
  - Versioning des structures de données

#### CA-F04: Compatibilité MCP stricte
- [ ] **Respect du standard MCP officiel**
  - Structure JSON-RPC 2.0 exacte
  - Codes d'erreur conformes (-32000 à -32099)
  - Format des réponses tools/call standardisé
- [ ] **Support des extensions MCP**
  - Extensibilité pour futures versions du protocole
  - Backward compatibility avec versions antérieures
  - Support des capabilities optionnelles

#### CA-F05: Documentation complète avec JSDoc
- [ ] **Tous les types publics documentés**
  - Description claire de chaque interface/type
  - Exemples d'utilisation pour les types complexes
  - Documentation des contraintes et validations
- [ ] **Exemples de code fonctionnels**
  - Snippets d'utilisation pour chaque outil
  - Cas d'usage typiques documentés
  - Patterns d'intégration recommandés

### ⚡ Critères non-fonctionnels

#### CA-NF01: Performance optimale
- [ ] **Validation ultra-rapide**
  - Validation < 10ms par requête (99e percentile)
  - Validation < 5ms par requête (médiane)
  - Pas de régression de performance vs version actuelle
- [ ] **Sérialisation efficace**
  - Sérialisation < 5ms pour objets complexes (Memory avec embedding)
  - Désérialisation < 3ms pour réponses typiques
  - Mémoire stable (pas de fuites lors de validations répétées)
- [ ] **Taille optimisée**
  - Bundle des types compilés < 100KB
  - Tree-shaking efficace (types non utilisés exclus)
  - Pas de dépendances runtime inutiles

#### CA-NF02: Type Safety maximale
- [ ] **Zéro `any` en production**
  - Tous les types explicitement définis
  - Utilisation de `unknown` pour les cas génériques
  - Strict TypeScript configuration (noImplicitAny, strictNullChecks)
- [ ] **Inférence de types complète**
  - Auto-completion parfaite dans l'IDE
  - Détection d'erreurs à la compilation
  - Types guards pour les validations runtime

#### CA-NF03: Maintenabilité et extensibilité
- [ ] **Architecture modulaire**
  - Séparation claire types/validation/sérialisation
  - Réutilisabilité des composants entre projets
  - Couplage faible entre modules
- [ ] **Extensibilité future**
  - Ajout de nouveaux types sans breaking changes
  - Support des versions multiples du protocole MCP
  - Plugin system pour validations custom

### 🔧 Critères techniques

#### CA-T01: Standards de code
- [ ] **Conventions de nommage respectées**
  - PascalCase pour interfaces/types/classes
  - camelCase pour propriétés/méthodes
  - SCREAMING_SNAKE_CASE pour constantes
  - Préfixe "I" pour interfaces publiques
- [ ] **Structure de fichiers organisée**
  - Séparation par domaine fonctionnel
  - Index files pour exports propres
  - Pas plus de 300 lignes par fichier
- [ ] **Qualité du code**
  - ESLint + Prettier configurés et respectés
  - Pas de code mort ou commentaires obsolètes
  - Imports organisés et optimisés

#### CA-T02: Tests et validation
- [ ] **Couverture de tests complète**
  - 100% de couverture pour les schémas de validation
  - Tests unitaires pour chaque type/interface
  - Tests d'intégration pour les workflows complets
- [ ] **Tests de performance**
  - Benchmarks pour validation/sérialisation
  - Tests de charge (1000+ validations simultanées)
  - Profiling mémoire pour détecter les fuites
- [ ] **Tests de compatibilité**
  - Validation contre le standard MCP officiel
  - Tests avec différentes versions de TypeScript
  - Tests cross-platform (Node.js versions multiples)

### 🧪 Critères de validation

#### CA-V01: Tests automatisés
- [ ] **Suite de tests complète**
  - Tests unitaires : validation de chaque schéma individuellement
  - Tests d'intégration : workflows end-to-end
  - Tests de régression : non-régression vs version actuelle
- [ ] **Scénarios de test exhaustifs**
  - Cas nominaux : données valides de tous types
  - Cas d'erreur : validation des messages d'erreur
  - Cas limites : valeurs min/max, types edge cases
  - Cas de performance : gros volumes, objets complexes

#### CA-V02: Validation manuelle
- [ ] **Review de code approfondie**
  - Architecture validée par l'équipe
  - Conformité aux standards du projet
  - Sécurité des validations (pas d'injection)
- [ ] **Tests d'intégration manuels**
  - Intégration avec le serveur MCP existant
  - Compatibilité avec les clients MCP
  - Validation des messages d'erreur côté utilisateur

#### CA-V03: Métriques de qualité
- [ ] **Métriques de code**
  - Complexité cyclomatique < 10 par fonction
  - Profondeur d'imbrication < 4 niveaux
  - Longueur des fonctions < 50 lignes
- [ ] **Métriques de performance**
  - Temps de validation médian < 5ms
  - Utilisation mémoire stable (< 50MB pour 10k validations)
  - Pas de memory leaks détectés

## 🧪 Scénarios de test

### Test 1: Validation des paramètres valides
```gherkin
Given des paramètres valides pour create_memory
When je valide les paramètres avec le schéma
Then la validation réussit
And les types TypeScript sont corrects
```

### Test 2: Validation des paramètres invalides
```gherkin
Given des paramètres invalides (contenu vide)
When je valide les paramètres
Then la validation échoue
And un message d'erreur descriptif est retourné
```

### Test 3: Sérialisation/Désérialisation
```gherkin
Given un objet Memory complet
When je le sérialise en JSON puis le désérialise
Then l'objet résultant est identique à l'original
And tous les types sont préservés
```

### Test 4: Compatibilité MCP
```gherkin
Given une requête MCP standard
When je la parse avec nos types
Then la structure est correctement typée
And compatible avec le standard MCP
```

### Test 5: Performance de validation
```gherkin
Given 1000 requêtes de création de mémoire
When je valide toutes les requêtes
Then la validation prend moins de 10ms en moyenne
```

### 🏁 Definition of Done (DoD)

#### DoD-01: Code complet et fonctionnel
- [ ] **Tous les types sont implémentés** selon les spécifications
- [ ] **Tous les schémas Zod sont fonctionnels** et testés
- [ ] **Aucune régression** par rapport à l'implémentation actuelle
- [ ] **Intégration réussie** avec le serveur MCP existant
- [ ] **Pas de breaking changes** pour les clients existants

#### DoD-02: Qualité et tests
- [ ] **Tous les tests passent** (unitaires + intégration + performance)
- [ ] **Couverture de code ≥ 95%** pour les nouveaux composants
- [ ] **Aucun warning** ESLint/TypeScript en mode strict
- [ ] **Documentation à jour** (README, JSDoc, exemples)
- [ ] **Review de code approuvée** par au moins 2 développeurs

#### DoD-03: Performance et sécurité
- [ ] **Benchmarks de performance** respectés (< 10ms validation)
- [ ] **Audit de sécurité** passé (pas d'injection, validation robuste)
- [ ] **Tests de charge** réussis (1000+ requêtes simultanées)
- [ ] **Profiling mémoire** sans fuites détectées

#### DoD-04: Déploiement et monitoring
- [ ] **Build de production** réussi sans erreurs
- [ ] **Tests d'intégration** en environnement de staging
- [ ] **Métriques de monitoring** configurées
- [ ] **Plan de rollback** documenté et testé

## 📊 Métriques de succès

### 🎯 Métriques de qualité du code
| Métrique | Cible | Mesure | Status |
|----------|-------|---------|---------|
| **Couverture TypeScript** | 100% (zéro `any`) | Analyse statique | ⏳ |
| **Types exportés documentés** | 100% | JSDoc coverage | ⏳ |
| **Erreurs de compilation** | 0 | `tsc --noEmit` | ⏳ |
| **Warnings ESLint** | 0 | `eslint --max-warnings 0` | ⏳ |
| **Complexité cyclomatique** | < 10 par fonction | SonarQube/CodeClimate | ⏳ |
| **Duplication de code** | < 3% | Analyse statique | ⏳ |

### ⚡ Métriques de performance
| Métrique | Cible | Mesure | Status |
|----------|-------|---------|---------|
| **Validation simple** | < 5ms (médiane) | Benchmark Jest | ⏳ |
| **Validation complexe** | < 10ms (99e percentile) | Benchmark Jest | ⏳ |
| **Sérialisation Memory** | < 5ms | Benchmark avec embedding | ⏳ |
| **Désérialisation JSON** | < 3ms | Benchmark réponses API | ⏳ |
| **Taille bundle** | < 100KB | webpack-bundle-analyzer | ⏳ |
| **Memory usage** | < 50MB pour 10k validations | Node.js profiler | ⏳ |

### 🧪 Métriques de tests
| Métrique | Cible | Mesure | Status |
|----------|-------|---------|---------|
| **Couverture globale** | ≥ 95% | Jest coverage | ⏳ |
| **Couverture validation** | 100% | Jest coverage | ⏳ |
| **Tests unitaires** | 100% des types | Nombre de tests | ⏳ |
| **Tests d'intégration** | 100% des workflows | E2E tests | ⏳ |
| **Tests de performance** | Tous les benchmarks | Performance suite | ⏳ |
| **Tests de régression** | Aucune régression | Comparison tests | ⏳ |

### 🔧 Métriques de maintenabilité
| Métrique | Cible | Mesure | Status |
|----------|-------|---------|---------|
| **Modules découplés** | < 5 dépendances par module | Dependency graph | ⏳ |
| **Réutilisabilité** | 80% des types réutilisés | Usage analysis | ⏳ |
| **Documentation** | 100% des APIs publiques | Doc coverage | ⏳ |
| **Exemples fonctionnels** | 1 par type complexe | Manual review | ⏳ |
| **Temps de build** | < 30s | CI/CD metrics | ⏳ |
| **Temps de tests** | < 2min | CI/CD metrics | ⏳ |

### 📈 Métriques de compatibilité
| Métrique | Cible | Mesure | Status |
|----------|-------|---------|---------|
| **Conformité MCP** | 100% | Validation spec | ⏳ |
| **Backward compatibility** | 100% | API diff analysis | ⏳ |
| **Cross-platform** | Node.js 18+ | CI matrix | ⏳ |
| **TypeScript versions** | 4.9+ | CI matrix | ⏳ |
| **Browser compatibility** | ES2020+ | Babel analysis | ⏳ |

## � Critères de livraison et d'acceptation client

### 📦 Critères de livraison

#### CD-01: Livrables techniques
- [ ] **Package npm publié** avec version sémantique (ex: 2.0.0)
- [ ] **Types TypeScript compilés** dans `/dist` avec source maps
- [ ] **Documentation générée** (TypeDoc) accessible en ligne
- [ ] **Exemples d'utilisation** fonctionnels dans `/examples`
- [ ] **Guide de migration** depuis la version précédente
- [ ] **Changelog détaillé** avec breaking changes documentés

#### CD-02: Validation en environnement
- [ ] **Tests d'intégration** réussis en staging
- [ ] **Performance validée** en conditions réelles
- [ ] **Compatibilité vérifiée** avec les clients existants
- [ ] **Monitoring opérationnel** configuré et fonctionnel
- [ ] **Rollback testé** et procédure documentée

### ✅ Critères d'acceptation client

#### CAC-01: Fonctionnalités métier
- [ ] **Création de mémoires** avec validation complète
  - Validation du contenu (1-100k caractères)
  - Types de mémoires supportés (personal, repository, etc.)
  - Métadonnées enrichies (tags, projet, importance)
- [ ] **Recherche de mémoires** avec filtres avancés
  - Recherche textuelle avec seuil de similarité
  - Filtres par type, tags, projet, dates
  - Tri par pertinence, date, importance
- [ ] **Gestion complète du cycle de vie**
  - Mise à jour partielle ou complète
  - Suppression avec confirmation
  - Statistiques détaillées d'utilisation

#### CAC-02: Expérience développeur
- [ ] **Intégration transparente** dans l'IDE
  - Auto-completion complète des types
  - Validation en temps réel des erreurs
  - Documentation contextuelle (hover)
- [ ] **Messages d'erreur compréhensibles**
  - Erreurs en français avec contexte
  - Suggestions de correction automatique
  - Codes d'erreur documentés
- [ ] **Performance acceptable**
  - Pas de latence perceptible (< 100ms)
  - Pas de blocage de l'interface utilisateur
  - Gestion gracieuse des gros volumes

#### CAC-03: Fiabilité et robustesse
- [ ] **Gestion d'erreurs complète**
  - Récupération automatique des erreurs temporaires
  - Validation côté client ET serveur
  - Logs détaillés pour le debugging
- [ ] **Compatibilité garantie**
  - Pas de breaking changes non documentés
  - Migration automatique des données existantes
  - Support des versions antérieures (N-1)
- [ ] **Sécurité renforcée**
  - Validation stricte contre l'injection
  - Sanitisation des entrées utilisateur
  - Audit de sécurité passé avec succès

### 🎯 Critères d'acceptation métier

#### CAM-01: Valeur ajoutée
- [ ] **Amélioration de la productivité**
  - Réduction du temps de développement (mesurable)
  - Moins d'erreurs de runtime grâce à la validation
  - Meilleure découvrabilité des APIs
- [ ] **Qualité du code améliorée**
  - Type safety renforcée (zéro `any`)
  - Documentation automatique à jour
  - Patterns de développement standardisés
- [ ] **Maintenabilité accrue**
  - Refactoring facilité par les types stricts
  - Détection précoce des breaking changes
  - Tests automatisés plus robustes

#### CAM-02: Adoption et utilisation
- [ ] **Formation et documentation**
  - Guide de démarrage rapide (< 15min)
  - Exemples pratiques pour chaque cas d'usage
  - FAQ avec solutions aux problèmes courants
- [ ] **Support et maintenance**
  - Canal de support technique défini
  - SLA de résolution des bugs critiques (< 24h)
  - Roadmap de développement communiquée

### 📋 Checklist finale d'acceptation

#### ✅ Validation technique
- [ ] Tous les tests automatisés passent (100%)
- [ ] Performance validée en charge (1000+ req/s)
- [ ] Sécurité auditée et approuvée
- [ ] Documentation complète et à jour
- [ ] Compatibilité multi-plateforme vérifiée

#### ✅ Validation fonctionnelle
- [ ] Tous les cas d'usage métier couverts
- [ ] Validation utilisateur réussie (UAT)
- [ ] Intégration avec l'écosystème existant
- [ ] Migration des données existantes réussie
- [ ] Formation des équipes terminée

#### ✅ Validation opérationnelle
- [ ] Déploiement en production réussi
- [ ] Monitoring et alertes configurés
- [ ] Plan de rollback testé et validé
- [ ] Support technique opérationnel
- [ ] Métriques de succès collectées

## �🔄 Dépendances

### Techniques
- Zod pour la validation runtime
- JSON Schema pour la documentation
- TypeScript 5.0+ pour les types avancés

### Métier
- **Utilisé par**: Toutes les autres tâches
- **Prérequis pour**: Task 001 (MCP Server), Task 002 (Vector Store)

## 📅 Estimation

**Complexité**: Moyenne
**Effort**: 2-3 jours
**Risques**:
- Évolution du standard MCP
- Complexité des types imbriqués
- Performance de la validation runtime
