# Module d'Authentification Claude API

Ce module fournit une gestion complète et sécurisée de l'authentification pour l'API Claude 3.7 Sonnet dans l'extension VSCode CodeAssist AI.

## Fonctionnalités

### ✅ Stockage sécurisé des clés API
- Utilise l'API SecretStorage de VSCode pour un stockage chiffré
- Migration automatique depuis l'ancienne méthode de configuration
- Protection contre l'exposition accidentelle des clés

### ✅ Validation robuste des clés API
- Validation du format des clés Claude (sk-ant-*)
- Test de connectivité avec l'API Claude
- Vérification des permissions et de la validité
- Gestion des timeouts et erreurs réseau

### ✅ Interface de configuration intuitive
- Configuration manuelle via boîte de dialogue sécurisée
- Support des variables d'environnement
- Validation en temps réel lors de la saisie
- Messages d'erreur explicites et utiles

### ✅ Gestion des erreurs avancée
- Types d'erreurs spécialisés (AuthenticationException)
- Messages d'erreur contextuels et actionables
- Récupération gracieuse des erreurs d'authentification
- Logging détaillé pour le débogage

### ✅ Support des variables d'environnement
- Configuration via CLAUDE_API_KEY ou variable personnalisée
- Basculement facile entre stockage sécurisé et variables d'environnement
- Validation automatique au démarrage

### ✅ Système de révocation
- Suppression sécurisée des clés stockées
- Confirmation utilisateur avant révocation
- Nettoyage complet des configurations associées

## Architecture

### Composants principaux

1. **SecretManager** (`secretManager.ts`)
   - Gestion du stockage sécurisé via VSCode SecretStorage
   - Migration depuis l'ancienne configuration
   - Support des variables d'environnement

2. **ApiKeyValidator** (`apiKeyValidator.ts`)
   - Validation du format des clés API
   - Tests de connectivité et permissions
   - Gestion des timeouts et erreurs

3. **AuthenticationManager** (`authenticationManager.ts`)
   - Orchestration de l'authentification
   - Interface utilisateur pour la configuration
   - Gestion du cycle de vie des clés API

4. **Types** (`types.ts`)
   - Interfaces TypeScript pour tous les composants
   - Types d'erreurs spécialisés
   - Structures de données pour les réponses API

## Utilisation

### Configuration initiale

```typescript
import { AuthenticationManager } from './auth/authenticationManager';

const authManager = new AuthenticationManager(context);
await authManager.initialize();
```

### Obtenir une clé API valide

```typescript
try {
  const apiKey = await authManager.getValidApiKey();
  // Utiliser la clé pour les appels API
} catch (error) {
  if (error instanceof AuthenticationException) {
    // Gérer l'erreur d'authentification
    vscode.commands.executeCommand('codeAssist.configureApiKey');
  }
}
```

### Validation manuelle

```typescript
const result = await authManager.validateCurrentApiKey();
if (result.isValid) {
  console.log('Clé API valide');
} else {
  console.error('Erreur:', result.error);
}
```

## Commandes VSCode

- `codeAssist.configureApiKey` - Configurer la clé API
- `codeAssist.validateApiKey` - Valider la clé API actuelle
- `codeAssist.revokeApiKey` - Révoquer la clé API

## Configuration

### Paramètres disponibles

- `codeAssist.useEnvironmentVariable` - Utiliser une variable d'environnement
- `codeAssist.environmentVariableName` - Nom de la variable d'environnement
- `codeAssist.autoValidateApiKey` - Validation automatique au démarrage
- `codeAssist.apiKeyValidationTimeout` - Timeout pour la validation (ms)

### Variables d'environnement

```bash
export CLAUDE_API_KEY="sk-ant-your-api-key-here"
```

## Sécurité

- Les clés API sont stockées de manière chiffrée via VSCode SecretStorage
- Aucune clé n'est jamais loggée ou exposée dans les fichiers de configuration
- Validation des entrées utilisateur pour prévenir les injections
- Gestion sécurisée des timeouts et erreurs réseau

## Gestion des erreurs

Le module utilise des types d'erreurs spécialisés :

- `NO_API_KEY` - Aucune clé configurée
- `INVALID_API_KEY` - Clé invalide ou expirée
- `VALIDATION_TIMEOUT` - Timeout lors de la validation
- `NETWORK_ERROR` - Erreur de connectivité
- `PERMISSION_DENIED` - Permissions insuffisantes

## Tests

Pour tester le module d'authentification :

1. Configurer une clé API via la commande VSCode
2. Valider la clé avec `codeAssist.validateApiKey`
3. Tester la révocation avec `codeAssist.revokeApiKey`
4. Vérifier le support des variables d'environnement

## Évolutions futures

- Support de l'authentification OAuth
- Rotation automatique des clés
- Métriques d'utilisation des API
- Cache des validations pour améliorer les performances
- Support de multiples fournisseurs d'IA
