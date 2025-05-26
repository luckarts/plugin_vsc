# CodeAssist AI - Extension VSCode

Une extension VSCode intelligente qui intègre Claude 3.7 Sonnet avec indexation vectorielle du code source pour fournir une assistance contextuelle avancée.

## ✨ Fonctionnalités

### 🔐 Authentification Sécurisée
- **Stockage sécurisé** des clés API via VSCode SecretStorage
- **Support des variables d'environnement** pour les équipes
- **Validation en temps réel** des clés API Claude
- **Migration automatique** depuis les anciennes configurations
- **Gestion des erreurs** avec messages explicites

### 🤖 Assistant IA Intégré
- **Chat contextuel** avec Claude 3.7 Sonnet
- **Compréhension du code** via indexation vectorielle
- **Suggestions intelligentes** basées sur le contexte
- **Intégration native** avec l'éditeur VSCode

### 📚 Indexation Vectorielle
- **Analyse automatique** du code source
- **Recherche sémantique** pour trouver le code pertinent
- **Mise à jour incrémentale** lors des modifications
- **Support multi-langages** de programmation

### 💾 Gestion de la Mémoire
- **Sauvegarde automatique** des conversations
- **Historique persistant** des interactions
- **Organisation par projet** ou par thème
- **Export/import** des conversations

## 🚀 Installation et Configuration

### Prérequis
- VSCode 1.60.0 ou plus récent
- Node.js 16+ (pour le développement)
- Clé API Claude 3.7 Sonnet (Anthropic)

### Installation pour le développement

1. **Cloner le projet**
   ```bash
   git clone <repository-url>
   cd plugin_vsc
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Compiler le projet**
   ```bash
   npm run compile
   ```

4. **Lancer en mode développement**
   - Appuyer sur `F5` dans VSCode
   - Ou utiliser `Debug: Start Debugging`

### Configuration de la clé API

#### Option 1: Configuration manuelle (Recommandé)
1. `Ctrl+Shift+P` → "Configure Claude API Key"
2. Sélectionner "Enter API Key Manually"
3. Saisir votre clé API Claude (sk-ant-...)

#### Option 2: Variable d'environnement
1. Définir la variable d'environnement :
   ```bash
   export CLAUDE_API_KEY="sk-ant-votre-cle-api-ici"
   ```
2. `Ctrl+Shift+P` → "Configure Claude API Key"
3. Sélectionner "Use Environment Variable"

## 🎮 Utilisation

### Commandes principales

| Commande | Description |
|----------|-------------|
| `Configure Claude API Key` | Configurer la clé API |
| `Validate Claude API Key` | Valider la clé API actuelle |
| `Start Code Assistant AI` | Démarrer l'assistant de code |
| `Index Workspace Code` | Indexer le code du workspace |
| `Revoke Claude API Key` | Révoquer la clé API |

### Interface de chat

1. **Démarrer l'assistant** : `Ctrl+Shift+P` → "Start Code Assistant AI"
2. **Poser une question** sur votre code dans l'interface de chat
3. **Recevoir des suggestions** contextuelles basées sur votre code
4. **Appliquer les modifications** suggérées directement

### Fonctionnalités avancées

- **@mention** : Mentionner des fichiers spécifiques dans le chat
- **Attach** : Joindre des fichiers à la conversation
- **Apply** : Appliquer automatiquement les suggestions de code
- **Create** : Créer de nouveaux fichiers basés sur les suggestions

## ⚙️ Configuration

### Paramètres disponibles

```json
{
  "codeAssist.useEnvironmentVariable": false,
  "codeAssist.environmentVariableName": "CLAUDE_API_KEY",
  "codeAssist.autoValidateApiKey": true,
  "codeAssist.apiKeyValidationTimeout": 10000,
  "codeAssist.maxContextLength": 10000,
  "codeAssist.theme": "system",
  "codeAssist.saveConversations": true
}
```

### Sécurité et confidentialité

- ✅ **Stockage chiffré** des clés API via VSCode SecretStorage
- ✅ **Aucune exposition** des clés dans les fichiers de configuration
- ✅ **Validation des entrées** pour prévenir les injections
- ✅ **Gestion sécurisée** des timeouts et erreurs réseau
- ✅ **Conformité RGPD** pour les utilisateurs européens

## 🏗️ Architecture

### Structure du projet

```
src/
├── auth/                    # Module d'authentification
│   ├── authenticationManager.ts
│   ├── secretManager.ts
│   ├── apiKeyValidator.ts
│   └── types.ts
├── extension.ts            # Point d'entrée
├── claudeClient.ts         # Client API Claude
├── vectorDb.ts            # Base de données vectorielle
├── memoryManager.ts       # Gestionnaire de mémoire
└── webview.ts             # Interface utilisateur
```

### Composants clés

1. **AuthenticationManager** - Gestion complète de l'authentification
2. **ClaudeClient** - Interface avec l'API Claude 3.7 Sonnet
3. **VectorDatabase** - Indexation et recherche vectorielle du code
4. **MemoryManager** - Persistance des conversations
5. **WebView** - Interface utilisateur de chat

## 🧪 Tests et Développement

### Scripts disponibles

```bash
npm run compile      # Compiler le projet
npm run watch        # Compilation en mode watch
npm run lint         # Vérification du code
npm run test         # Lancer les tests
```

### Tests du module d'authentification

```bash
# Dans la fenêtre de test VSCode
Ctrl+Shift+P → "Test Authentication Module"
```

### Débogage

1. **Console de développement** : `Help > Toggle Developer Tools`
2. **Logs de l'extension** dans l'onglet Console
3. **Points d'arrêt** dans le code TypeScript

## 📋 Roadmap

### Version actuelle (v0.1.0)
- ✅ Module d'authentification complet
- ✅ Client API Claude fonctionnel
- ✅ Interface de base
- 🔄 Indexation vectorielle (en cours)

### Prochaines versions
- 🔮 Interface de chat avancée
- 🔮 Boutons d'action rapide (Apply, Create)
- 🔮 Intégration avec Git
- 🔮 Support de modèles locaux
- 🔮 Collaboration en temps réel

## 🤝 Contribution

### Guide de contribution

1. **Fork** le projet
2. **Créer une branche** pour votre fonctionnalité
3. **Développer** en suivant les conventions de code
4. **Tester** vos modifications
5. **Soumettre** une pull request

### Standards de code

- **TypeScript strict** avec types explicites
- **ESLint** pour la qualité du code
- **Fonctions courtes** (max 30 lignes)
- **Documentation JSDoc** pour les fonctions publiques
- **Tests unitaires** pour les nouvelles fonctionnalités

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

- **Documentation** : Consulter les README dans chaque module
- **Issues** : Signaler les bugs via GitHub Issues
- **Discussions** : Poser des questions dans GitHub Discussions

---

**Développé avec ❤️ pour améliorer l'expérience de développement avec l'IA**
