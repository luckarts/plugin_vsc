# 📋 Task 002: Stockage vectoriel de base

## 🎯 Comportement attendu (Langage métier)

**En tant qu'utilisateur du système Memory V2, je veux que mes mémoires soient stockées avec leurs représentations vectorielles pour permettre une recherche sémantique rapide et précise, même quand je ne me souviens pas des mots exacts utilisés.**

## 📝 Spécifications détaillées

### Comportement principal
1. **Stockage des embeddings**
   - Chaque mémoire est automatiquement convertie en embedding vectoriel
   - Les embeddings sont stockés de manière persistante
   - Les métadonnées sont associées aux vecteurs pour le filtrage
   - Le système gère les mises à jour d'embeddings

2. **Recherche par similarité**
   - Recherche des mémoires les plus similaires à une requête
   - Calcul de scores de similarité (cosinus, euclidienne)
   - Filtrage par métadonnées combiné à la similarité
   - Pagination et limitation des résultats

3. **Persistance et performance**
   - Les données survivent aux redémarrages du système
   - Indexation optimisée pour des recherches rapides
   - Gestion de la mémoire pour de gros volumes
   - Sauvegarde et restauration des index

## 🔧 Interface du Vector Store

### Méthodes principales

#### `store(memory: Memory): Promise<void>`
**Description**: Stocker une mémoire avec son embedding
**Comportement**:
- Génère l'embedding du contenu de la mémoire
- Stocke le vecteur avec les métadonnées
- Met à jour l'index de recherche
- Gère les erreurs de génération d'embedding

#### `search(query: string, options: SearchOptions): Promise<SearchResult[]>`
**Description**: Rechercher des mémoires par similarité sémantique
**Paramètres**:
- `query`: Texte de recherche
- `options`: Filtres et paramètres de recherche

**Comportement**:
- Génère l'embedding de la requête
- Calcule la similarité avec tous les vecteurs stockés
- Applique les filtres de métadonnées
- Retourne les résultats triés par pertinence

#### `update(memoryId: string, memory: Memory): Promise<void>`
**Description**: Mettre à jour une mémoire existante
**Comportement**:
- Régénère l'embedding si le contenu a changé
- Met à jour les métadonnées
- Préserve l'historique si configuré

#### `delete(memoryId: string): Promise<void>`
**Description**: Supprimer une mémoire du store
**Comportement**:
- Supprime le vecteur et les métadonnées
- Met à jour l'index
- Libère l'espace de stockage

#### `getStats(): Promise<VectorStoreStats>`
**Description**: Obtenir les statistiques du store
**Retour**:
- Nombre total de vecteurs
- Taille de l'index
- Métriques de performance
- Utilisation de la mémoire

## 🏗️ Structure des données

### Memory avec embedding
```typescript
interface StoredMemory {
  id: string
  content: string
  embedding: number[]
  metadata: MemoryMetadata
  created: Date
  updated: Date
  embeddingModel: string
  embeddingVersion: string
}

interface MemoryMetadata {
  type: MemoryType
  tags: string[]
  project?: string
  language?: string
  importance: number
  category: string
  source: string
}
```

### Options de recherche
```typescript
interface SearchOptions {
  limit?: number
  threshold?: number
  filters?: MetadataFilters
  includeEmbeddings?: boolean
  sortBy?: 'similarity' | 'date' | 'importance'
}

interface MetadataFilters {
  type?: MemoryType[]
  tags?: string[]
  project?: string
  language?: string
  dateRange?: { from: Date; to: Date }
  importance?: { min: number; max: number }
}
```

### Résultats de recherche
```typescript
interface SearchResult {
  memory: StoredMemory
  similarity: number
  rank: number
  explanation?: string
}

interface VectorStoreStats {
  totalVectors: number
  indexSize: number
  averageSearchTime: number
  memoryUsage: number
  embeddingModel: string
  lastOptimization: Date
}
```

## ⚙️ Configuration

### Configuration du Vector Store
```json
{
  "vectorStore": {
    "provider": "chroma",
    "dimensions": 384,
    "similarity": "cosine",
    "indexType": "hnsw",
    "storageDir": "./data/vectors",
    "maxVectors": 100000,
    "batchSize": 100
  },
  "embedding": {
    "model": "sentence-transformers/all-MiniLM-L6-v2",
    "provider": "local",
    "cacheSize": 1000,
    "timeout": 5000
  },
  "search": {
    "defaultLimit": 10,
    "maxLimit": 100,
    "defaultThreshold": 0.7,
    "enableFilters": true
  }
}
```

## ✅ Critères d'acceptation

### Fonctionnels
1. **Stockage persistant**: Les embeddings survivent aux redémarrages
2. **Recherche sémantique**: Trouve des mémoires similaires même avec des mots différents
3. **Performance**: Recherche < 100ms pour 1000 mémoires
4. **Filtrage**: Combine similarité et filtres de métadonnées
5. **Gestion d'erreurs**: Gère les échecs de génération d'embeddings
6. **Mise à jour**: Met à jour les embeddings quand le contenu change

### Non-fonctionnels
1. **Scalabilité**: Support de 10,000+ mémoires
2. **Précision**: Résultats pertinents dans 85%+ des cas
3. **Fiabilité**: Zéro perte de données
4. **Maintenabilité**: Interface claire et documentée

## 🧪 Scénarios de test

### Test 1: Stockage d'une mémoire
```gherkin
Given un Vector Store initialisé
When je stocke une mémoire avec du contenu
Then un embedding est généré automatiquement
And la mémoire est persistée avec son vecteur
And l'index de recherche est mis à jour
```

### Test 2: Recherche sémantique basique
```gherkin
Given des mémoires stockées sur différents sujets
When je recherche "problème de performance"
Then les mémoires sur l'optimisation sont retournées
And les résultats sont triés par similarité
And le score de similarité est inclus
```

### Test 3: Recherche avec filtres
```gherkin
Given des mémoires de différents types et projets
When je recherche avec des filtres de type et projet
Then seules les mémoires correspondantes sont retournées
And la similarité est calculée uniquement sur ce sous-ensemble
```

### Test 4: Mise à jour d'embedding
```gherkin
Given une mémoire existante dans le store
When je mets à jour son contenu
Then un nouvel embedding est généré
And l'ancien embedding est remplacé
And la recherche utilise le nouvel embedding
```

### Test 5: Performance avec volume
```gherkin
Given 1000 mémoires stockées dans le Vector Store
When je lance une recherche sémantique
Then les résultats sont retournés en moins de 100ms
And la précision reste élevée
```

### Test 6: Persistance des données
```gherkin
Given des mémoires stockées dans le Vector Store
When le système redémarre
Then toutes les mémoires et embeddings sont récupérés
And les recherches fonctionnent immédiatement
```

## 📊 Métriques de succès

### Performance
- Génération d'embedding < 200ms par mémoire
- Recherche < 100ms pour 1000 mémoires
- Indexation < 500ms pour 100 nouvelles mémoires

### Qualité
- Précision de recherche > 85%
- Rappel de recherche > 80%
- Zéro perte de données lors des redémarrages

### Scalabilité
- Support de 10,000 mémoires sans dégradation
- Utilisation mémoire < 500MB pour 1000 mémoires
- Temps d'indexation linéaire avec le volume

## 🔄 Dépendances

### Techniques
- Modèle d'embedding (Sentence Transformers)
- Base de données vectorielle (Chroma/Qdrant)
- Bibliothèque de calcul vectoriel (NumPy/TensorFlow.js)

### Métier
- **Dépend de**: Task 001 (MCP Server) pour l'interface
- **Prérequis pour**: Task 005 (Recherche sémantique)

## 📅 Estimation

**Complexité**: Élevée
**Effort**: 4-6 jours
**Risques**:
- Performance des modèles d'embedding
- Gestion de la mémoire pour gros volumes
- Compatibilité entre différents modèles d'embedding
- Optimisation des index vectoriels
