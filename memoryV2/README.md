# 🧠 Memory System V2 - OpenMemory MCP Integration

## Vue d'ensemble

Le système Memory V2 est une refonte complète du système de mémoire existant, intégrant les concepts d'OpenMemory MCP pour créer une couche de mémoire persistante et contextuelle pour les clients compatibles MCP (Cursor, Claude Desktop, Windsurf, Cline, etc.).

## Objectifs principaux

### 🎯 Amélioration de la conscience contextuelle
- Mémoire persistante entre les sessions
- Contexte personnel et portable
- Contrôle total des données en local

### 🔄 Intégration MCP (Model Context Protocol)
- Compatible avec les clients MCP standards
- API standardisée pour l'échange de contexte
- Interopérabilité entre différents outils IA

### 🚀 Fonctionnalités avancées
- Mémoire vectorielle avec embeddings
- Compression intelligente du contexte
- Recherche sémantique avancée
- Dashboard de gestion des mémoires

## Architecture

```
memoryV2/
├── core/                   # Logique métier principale
│   ├── memory-engine/      # Moteur de mémoire
│   ├── mcp-server/         # Serveur MCP
│   └── vector-store/       # Stockage vectoriel
├── interfaces/             # Interfaces et types
├── services/              # Services spécialisés
├── utils/                 # Utilitaires
├── tests/                 # Tests unitaires et d'intégration
└── docs/                  # Documentation détaillée
```

## Différences avec Memory V1

| Aspect | Memory V1 | Memory V2 |
|--------|-----------|-----------|
| **Protocol** | Propriétaire | MCP Standard |
| **Stockage** | JSON local | Vector DB + MCP |
| **Contexte** | Statique | Dynamique/Sémantique |
| **Interop** | VSCode only | Multi-clients MCP |
| **Recherche** | Text-based | Vector similarity |

## Roadmap de développement

### Phase 1: Fondations MCP
- [ ] Configuration du serveur MCP
- [ ] Interfaces de base
- [ ] Stockage vectoriel

### Phase 2: Moteur de mémoire
- [ ] Gestion des embeddings
- [ ] Recherche sémantique
- [ ] Compression intelligente

### Phase 3: Intégration VSCode
- [ ] Extension VSCode MCP
- [ ] Interface utilisateur
- [ ] Migration depuis V1

### Phase 4: Fonctionnalités avancées
- [ ] Dashboard web
- [ ] Analytics avancées
- [ ] Synchronisation cloud

## Technologies utilisées

- **MCP (Model Context Protocol)**: Standard pour l'échange de contexte
- **Mem0**: Couche de mémoire pour agents IA
- **Vector Database**: Stockage et recherche vectorielle
- **TypeScript**: Développement type-safe
- **VSCode Extension API**: Intégration IDE

## Démarrage rapide

```bash
# Installation des dépendances
npm install

# Configuration MCP
npm run setup:mcp

# Démarrage du serveur de développement
npm run dev

# Tests
npm run test
```

## Documentation

- [Architecture détaillée](./docs/architecture.md)
- [Guide d'installation](./docs/installation.md)
- [API Reference](./docs/api.md)
- [Migration depuis V1](./docs/migration.md)
- [Tâches de développement](./docs/tasks.md)
