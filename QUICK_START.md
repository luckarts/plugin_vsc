# Guide de Démarrage Rapide - CodeAssist AI

## 🚀 Compilation et Test de l'Extension

### 1. Compilation du projet

```bash
# Compiler une fois
npm run compile

# Compiler en mode watch (recompilation automatique)
npm run watch
```

### 2. Test de l'extension dans VSCode

#### Option A: Via F5 (Recommandé)
1. Ouvrir le projet dans VSCode
2. Appuyer sur `F5` pour lancer l'extension en mode debug
3. Une nouvelle fenêtre VSCode s'ouvrira avec l'extension chargée

#### Option B: Via la palette de commandes
1. `Ctrl+Shift+P` → "Debug: Start Debugging"
2. Sélectionner "Run Extension"

### 3. Test du module d'authentification

Une fois l'extension lancée dans la fenêtre de test :

#### Configuration de la clé API
1. `Ctrl+Shift+P` → "Configure Claude API Key"
2. Choisir entre :
   - **Saisie manuelle** : Entrer votre clé API Claude
   - **Variable d'environnement** : Utiliser `CLAUDE_API_KEY`

#### Validation de la clé API
1. `Ctrl+Shift+P` → "Validate Claude API Key"
2. Vérifier que la validation réussit

#### Test de l'interface de chat
1. `Ctrl+Shift+P` → "Start Code Assistant AI"
2. Une interface de chat s'ouvrira dans un panneau latéral

### 4. Commandes disponibles

- `codeAssist.configureApiKey` - Configurer la clé API Claude
- `codeAssist.validateApiKey` - Valider la clé API actuelle
- `codeAssist.revokeApiKey` - Révoquer la clé API
- `codeAssist.start` - Démarrer l'assistant de code
- `codeAssist.indexCode` - Indexer le code du workspace

## 🔧 Configuration

### Variables d'environnement (optionnel)

```bash
# Définir la clé API via variable d'environnement
export CLAUDE_API_KEY="sk-ant-votre-cle-api-ici"

# Redémarrer VSCode pour prendre en compte la variable
```

### Paramètres VSCode

Aller dans `File > Preferences > Settings` et chercher "Code Assistant AI" :

- **Use Environment Variable** : Utiliser une variable d'environnement
- **Environment Variable Name** : Nom de la variable (défaut: CLAUDE_API_KEY)
- **Auto Validate API Key** : Validation automatique au démarrage
- **API Key Validation Timeout** : Timeout pour la validation (ms)

## 🧪 Tests et Débogage

### Logs de débogage
1. Ouvrir la console de développement : `Help > Toggle Developer Tools`
2. Onglet "Console" pour voir les logs de l'extension

### Tests manuels
```bash
# Lancer les tests de linting
npm run lint

# Vérifier la compilation
npm run compile
```

### Tests du module d'authentification
Dans la fenêtre de test de l'extension :
1. `Ctrl+Shift+P` → "Test Authentication Module"
2. Vérifier les résultats dans la console de développement

## 🔍 Résolution de problèmes

### Erreur "API key required"
- Configurer une clé API via `codeAssist.configureApiKey`
- Ou définir la variable d'environnement `CLAUDE_API_KEY`

### Erreur de validation de clé API
- Vérifier que la clé commence par "sk-ant-"
- Vérifier la connexion internet
- Vérifier que la clé n'est pas expirée sur le compte Anthropic

### Extension ne se charge pas
- Vérifier que la compilation a réussi : `npm run compile`
- Redémarrer VSCode
- Vérifier les logs dans la console de développement

### Erreurs TypeScript
```bash
# Nettoyer et recompiler
rm -rf out/
npm run compile
```

## 📁 Structure du projet

```
src/
├── auth/                    # Module d'authentification
│   ├── types.ts            # Types TypeScript
│   ├── secretManager.ts    # Gestion sécurisée des secrets
│   ├── apiKeyValidator.ts  # Validation des clés API
│   ├── authenticationManager.ts # Gestionnaire principal
│   ├── test.ts            # Tests du module
│   └── README.md          # Documentation du module
├── extension.ts            # Point d'entrée de l'extension
├── claudeClient.ts         # Client API Claude
├── vectorDb.ts            # Base de données vectorielle
├── memoryManager.ts       # Gestionnaire de mémoire
└── webview.ts             # Interface utilisateur
```

## 🎯 Prochaines étapes

1. **Tester l'authentification** avec votre clé API Claude
2. **Développer l'indexation vectorielle** du code source
3. **Améliorer l'interface de chat** avec des fonctionnalités avancées
4. **Implémenter les boutons d'action** (Apply, Create)
5. **Ajouter la gestion de la mémoire** des conversations

## 📞 Support

En cas de problème :
1. Vérifier les logs dans la console de développement
2. Consulter la documentation du module d'authentification (`src/auth/README.md`)
3. Tester avec les commandes de test intégrées
