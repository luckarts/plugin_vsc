# 🚀 Task 001: Configuration du serveur MCP

## Vue d'ensemble

Cette tâche consiste à créer le serveur MCP (Model Context Protocol) qui servira de point d'entrée pour tous les clients compatibles MCP. Le serveur expose les outils de base pour la gestion des mémoires.

## Objectifs

1. **Serveur MCP fonctionnel** exposant les outils de gestion des mémoires
2. **Authentification et sécurité** pour les clients
3. **Validation robuste** des entrées et sorties
4. **Logging et monitoring** pour le débogage
5. **Configuration flexible** pour différents environnements

## Structure du projet

```
task-001-mcp-server/
├── src/
│   ├── server.ts           # Point d'entrée du serveur
│   ├── mcp/
│   │   ├── server.ts       # Serveur MCP principal
│   │   ├── tools/          # Outils MCP
│   │   │   ├── index.ts
│   │   │   ├── create-memory.ts
│   │   │   ├── search-memories.ts
│   │   │   ├── get-memory.ts
│   │   │   ├── update-memory.ts
│   │   │   ├── delete-memory.ts
│   │   │   └── get-stats.ts
│   │   └── types.ts        # Types MCP
│   ├── auth/
│   │   ├── manager.ts      # Gestionnaire d'authentification
│   │   └── middleware.ts   # Middleware d'auth
│   ├── validation/
│   │   ├── schemas.ts      # Schémas Zod
│   │   └── middleware.ts   # Middleware de validation
│   ├── logging/
│   │   ├── logger.ts       # Configuration Winston
│   │   └── middleware.ts   # Middleware de logging
│   ├── config/
│   │   └── index.ts        # Configuration centralisée
│   └── utils/
│       ├── errors.ts       # Classes d'erreur
│       └── helpers.ts      # Fonctions utilitaires
├── tests/
│   ├── unit/
│   │   ├── server.test.ts
│   │   ├── tools/
│   │   └── auth/
│   ├── integration/
│   │   ├── mcp-client.test.ts
│   │   └── end-to-end.test.ts
│   └── fixtures/
│       └── test-data.json
├── config/
│   └── test.json           # Configuration de test
├── behavior.md             # Spécification comportementale
└── README.md              # Ce fichier
```

## Développement TDD

### 1. Définir le comportement (✅ Fait)
Le fichier `behavior.md` contient la spécification complète du comportement attendu.

### 2. Créer les tests qui échouent (Red)

#### Test du serveur MCP
```typescript
// tests/unit/server.test.ts
describe('MCP Server', () => {
  it('should start and listen on configured port', async () => {
    const server = new MCPServer(testConfig)
    await server.start()
    
    expect(server.isRunning()).toBe(true)
    expect(server.getPort()).toBe(testConfig.port)
    
    await server.stop()
  })
  
  it('should register all required tools', async () => {
    const server = new MCPServer(testConfig)
    await server.start()
    
    const tools = server.getTools()
    expect(tools).toHaveLength(6)
    expect(tools.map(t => t.name)).toEqual([
      'create_memory',
      'search_memories', 
      'get_memory',
      'update_memory',
      'delete_memory',
      'get_stats'
    ])
    
    await server.stop()
  })
})
```

#### Test des outils MCP
```typescript
// tests/unit/tools/create-memory.test.ts
describe('create_memory tool', () => {
  it('should create a memory with valid parameters', async () => {
    const params = {
      content: 'Test memory content',
      type: 'personal',
      tags: ['test', 'example']
    }
    
    const result = await createMemoryTool.handler(params)
    
    expect(result.memory_id).toBeDefined()
    expect(result.status).toBe('created')
  })
  
  it('should reject invalid parameters', async () => {
    const params = {
      content: '', // Invalid: empty content
      type: 'invalid_type'
    }
    
    await expect(createMemoryTool.handler(params))
      .rejects.toThrow('Validation error')
  })
})
```

#### Test d'intégration client MCP
```typescript
// tests/integration/mcp-client.test.ts
describe('MCP Client Integration', () => {
  it('should connect and list tools', async () => {
    const client = new MCPClient('http://localhost:3000')
    await client.connect()
    
    const response = await client.request({
      method: 'tools/list',
      id: 1
    })
    
    expect(response.result.tools).toHaveLength(6)
    
    await client.disconnect()
  })
  
  it('should create and retrieve a memory', async () => {
    const client = new MCPClient('http://localhost:3000')
    await client.connect()
    
    // Create memory
    const createResponse = await client.callTool('create_memory', {
      content: 'Integration test memory',
      type: 'session'
    })
    
    const memoryId = createResponse.memory_id
    expect(memoryId).toBeDefined()
    
    // Retrieve memory
    const getResponse = await client.callTool('get_memory', {
      memory_id: memoryId
    })
    
    expect(getResponse.memory.content).toBe('Integration test memory')
    
    await client.disconnect()
  })
})
```

### 3. Implémenter la fonctionnalité (Green)

#### Configuration du serveur
```typescript
// src/config/index.ts
export interface ServerConfig {
  port: number
  host: string
  maxConnections: number
  timeout: number
  auth: AuthConfig
  logging: LoggingConfig
}

export const loadConfig = (): ServerConfig => {
  return {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || 'localhost',
    maxConnections: parseInt(process.env.MAX_CONNECTIONS || '100'),
    timeout: parseInt(process.env.TIMEOUT || '30000'),
    auth: loadAuthConfig(),
    logging: loadLoggingConfig()
  }
}
```

#### Serveur MCP principal
```typescript
// src/mcp/server.ts
import { MCPServer as BaseMCPServer } from '@modelcontextprotocol/sdk'
import { tools } from './tools'

export class MCPServer {
  private server: BaseMCPServer
  private config: ServerConfig
  private isRunning = false

  constructor(config: ServerConfig) {
    this.config = config
    this.server = new BaseMCPServer({
      name: 'memory-v2',
      version: '2.0.0'
    })
    
    this.registerTools()
    this.setupMiddleware()
  }

  private registerTools(): void {
    tools.forEach(tool => {
      this.server.setRequestHandler(tool.name, tool.handler)
    })
  }

  async start(): Promise<void> {
    await this.server.listen(this.config.port, this.config.host)
    this.isRunning = true
    logger.info(`MCP Server started on ${this.config.host}:${this.config.port}`)
  }

  async stop(): Promise<void> {
    await this.server.close()
    this.isRunning = false
    logger.info('MCP Server stopped')
  }

  getTools(): MCPTool[] {
    return tools
  }

  isRunning(): boolean {
    return this.isRunning
  }
}
```

#### Outil de création de mémoire
```typescript
// src/mcp/tools/create-memory.ts
import { z } from 'zod'
import { MCPTool } from '../types'
import { createMemorySchema } from '../../validation/schemas'

export const createMemoryTool: MCPTool = {
  name: 'create_memory',
  description: 'Create a new memory',
  inputSchema: createMemorySchema,
  
  async handler(params: unknown) {
    // Validation
    const validatedParams = createMemorySchema.parse(params)
    
    // Business logic (à implémenter avec le memory engine)
    const memoryId = await memoryEngine.createMemory(
      validatedParams.content,
      validatedParams.type,
      validatedParams.tags,
      validatedParams.metadata
    )
    
    return {
      memory_id: memoryId,
      status: 'created'
    }
  }
}
```

### 4. Refactoring (Refactor)

#### Extraction des responsabilités
- Séparer la logique métier des outils MCP
- Créer des services dédiés pour chaque domaine
- Améliorer la gestion d'erreurs
- Optimiser les performances

#### Amélioration de la structure
```typescript
// src/services/memory-service.ts
export class MemoryService {
  async createMemory(params: CreateMemoryParams): Promise<string> {
    // Logique métier pure
  }
  
  async searchMemories(params: SearchParams): Promise<Memory[]> {
    // Logique de recherche
  }
}

// src/mcp/tools/create-memory.ts (refactorisé)
export const createMemoryTool: MCPTool = {
  name: 'create_memory',
  description: 'Create a new memory',
  inputSchema: createMemorySchema,
  
  async handler(params: unknown) {
    const validatedParams = createMemorySchema.parse(params)
    const memoryId = await memoryService.createMemory(validatedParams)
    
    return {
      memory_id: memoryId,
      status: 'created'
    }
  }
}
```

### 5. Tests de non-régression

#### Tests de performance
```typescript
// tests/performance/server.test.ts
describe('Server Performance', () => {
  it('should handle 100 concurrent connections', async () => {
    const promises = Array.from({ length: 100 }, () => 
      createMCPClient().callTool('get_stats', {})
    )
    
    const start = Date.now()
    await Promise.all(promises)
    const duration = Date.now() - start
    
    expect(duration).toBeLessThan(5000) // 5 secondes max
  })
})
```

#### Tests de sécurité
```typescript
// tests/security/auth.test.ts
describe('Authentication Security', () => {
  it('should reject requests without valid token', async () => {
    const client = new MCPClient('http://localhost:3000')
    // Ne pas s'authentifier
    
    await expect(client.callTool('create_memory', {}))
      .rejects.toThrow('Unauthorized')
  })
})
```

## Commandes de développement

```bash
# Installation des dépendances
npm install

# Démarrage en mode développement
npm run dev

# Tests unitaires
npm run test

# Tests d'intégration
npm run test:integration

# Tests de performance
npm run test:performance

# Linting et formatage
npm run lint
npm run format

# Build de production
npm run build

# Démarrage en production
npm run start
```

## Critères de validation

### Tests automatisés
- [ ] Tous les tests unitaires passent
- [ ] Tests d'intégration MCP réussis
- [ ] Tests de performance validés
- [ ] Couverture de code > 90%

### Fonctionnalités
- [ ] Serveur démarre sans erreur
- [ ] Tous les outils MCP fonctionnent
- [ ] Authentification opérationnelle
- [ ] Validation des entrées robuste
- [ ] Gestion d'erreurs complète

### Qualité du code
- [ ] Pas d'erreurs TypeScript
- [ ] Linting sans warnings
- [ ] Code formaté correctement
- [ ] Documentation complète

## Prochaines étapes

Une fois cette tâche terminée :
1. **Task 002**: Implémentation du stockage vectoriel
2. **Task 003**: Définition des interfaces et types complets
3. **Task 004**: Génération d'embeddings

## Support

- **Documentation MCP**: [MCP Specification](https://modelcontextprotocol.io/)
- **Issues**: Créer une issue GitHub pour les problèmes
- **Tests**: Utiliser `npm run test:watch` pour le développement
