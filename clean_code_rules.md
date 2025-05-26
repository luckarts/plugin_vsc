# Règles de Clean Code et Tests Unitaires pour le Projet CodeAssist AI

## Règles de Clean Code

### 1. Structure et Organisation

- **Séparation des préoccupations**
  - [ ] Séparer clairement les modules par responsabilité (API, UI, DB, etc.)
  - [ ] Utiliser des interfaces pour définir les contrats entre modules
  - [ ] Éviter les dépendances circulaires entre modules

- **Architecture de fichiers**
  - [ ] Organiser les fichiers par domaine fonctionnel plutôt que par type
  - [ ] Limiter chaque fichier à une seule classe/module
  - [ ] Maintenir une profondeur d'arborescence raisonnable (max 3-4 niveaux)

### 2. Nommage

- **Conventions de nommage**
  - [ ] Utiliser le camelCase pour les variables et fonctions
  - [ ] Utiliser le PascalCase pour les classes et interfaces
  - [ ] Préfixer les interfaces avec "I" (ex: IClaudeClient)
  - [ ] Utiliser des noms descriptifs et éviter les abréviations obscures

- **Sémantique**
  - [ ] Les noms de fonctions doivent commencer par un verbe (ex: getApiKey(), validateInput())
  - [ ] Les noms de variables booléennes doivent être formulés comme une question (ex: isValid, hasPermission)
  - [ ] Les noms de classes doivent être des noms ou des groupes nominaux

### 3. Fonctions et Méthodes

- **Taille et complexité**
  - [ ] Limiter les fonctions à 20-30 lignes maximum
  - [ ] Limiter la complexité cyclomatique à 10 maximum
  - [ ] Limiter le nombre de paramètres à 3 maximum (utiliser des objets pour plus)

- **Principe de responsabilité unique**
  - [ ] Chaque fonction ne doit faire qu'une seule chose
  - [ ] Extraire les blocs conditionnels complexes dans des fonctions séparées
  - [ ] Éviter les effets de bord non documentés

### 4. Gestion des erreurs

- **Traitement des erreurs**
  - [ ] Utiliser try/catch pour capturer les erreurs attendues
  - [ ] Créer des classes d'erreur personnalisées pour différents types d'erreurs
  - [ ] Logger les erreurs avec des informations contextuelles suffisantes

- **Validation**
  - [ ] Valider les entrées au début des fonctions (fail fast)
  - [ ] Utiliser des assertions pour les préconditions importantes
  - [ ] Retourner des types de données cohérents (éviter null/undefined quand possible)

### 5. Commentaires et Documentation

- **Documentation du code**
  - [ ] Documenter toutes les fonctions publiques avec JSDoc
  - [ ] Inclure des exemples d'utilisation pour les API complexes
  - [ ] Expliquer le "pourquoi" plutôt que le "comment" dans les commentaires

- **Lisibilité**
  - [ ] Le code doit être auto-documenté (noms clairs, structure logique)
  - [ ] Éviter les commentaires obsolètes ou redondants
  - [ ] Utiliser des TODO/FIXME pour marquer le code temporaire

### 6. TypeScript Spécifique

- **Types**
  - [ ] Définir des types explicites pour toutes les fonctions et variables
  - [ ] Éviter l'utilisation de "any" sauf cas exceptionnels
  - [ ] Utiliser des types d'union et d'intersection plutôt que des hiérarchies complexes

- **Immutabilité**
  - [ ] Utiliser "const" par défaut pour les variables
  - [ ] Utiliser "readonly" pour les propriétés qui ne doivent pas changer
  - [ ] Préférer les méthodes non-mutatives (map, filter) aux boucles mutatives

## Règles de Tests Unitaires

### 1. Structure des Tests

- **Organisation**
  - [ ] Suivre la convention "une classe de test par classe testée"
  - [ ] Organiser les tests en "describe" pour regrouper les tests liés
  - [ ] Utiliser des noms de test descriptifs qui expliquent le comportement attendu

- **Nommage**
  - [ ] Format recommandé: "should [résultat attendu] when [condition]"
  - [ ] Les descriptions doivent former une phrase complète avec le nom du test

### 2. Couverture de Tests

- **Métriques**
  - [ ] Viser une couverture de code d'au moins 80%
  - [ ] Tester tous les chemins d'exécution (branches conditionnelles)
  - [ ] Tester les cas limites et les cas d'erreur

- **Priorités**
  - [ ] Prioriser les tests pour la logique métier critique
  - [ ] Tester en priorité le code complexe ou sujet aux régressions
  - [ ] Tester les API publiques de chaque module

### 3. Qualité des Tests

- **Indépendance**
  - [ ] Chaque test doit être indépendant des autres
  - [ ] Éviter les dépendances d'état entre les tests
  - [ ] Réinitialiser l'état global avant/après chaque test

- **Déterminisme**
  - [ ] Les tests doivent toujours produire le même résultat
  - [ ] Éviter les dépendances externes non mockées
  - [ ] Éviter les tests qui dépendent du timing ou de l'ordre d'exécution

### 4. Mocks et Stubs

- **Isolation**
  - [ ] Mocker les dépendances externes (API, filesystem, etc.)
  - [ ] Utiliser des stubs pour simuler des comportements spécifiques
  - [ ] Tester les composants en isolation

- **Vérification**
  - [ ] Vérifier que les mocks sont appelés avec les bons paramètres
  - [ ] Vérifier le nombre d'appels aux mocks quand pertinent
  - [ ] Éviter de trop spécifier le comportement interne dans les tests

### 5. Tests Spécifiques à VSCode

- **Extension API**
  - [ ] Utiliser vscode-test pour tester l'extension dans un environnement VSCode
  - [ ] Mocker l'API VSCode pour les tests unitaires
  - [ ] Tester l'activation de l'extension et l'enregistrement des commandes

- **Webview**
  - [ ] Tester la génération du HTML de la webview
  - [ ] Tester la communication entre la webview et l'extension
  - [ ] Utiliser JSDOM pour tester le comportement du JavaScript côté webview

### 6. Automatisation

- **CI/CD**
  - [ ] Exécuter les tests automatiquement à chaque commit
  - [ ] Bloquer les merge si les tests échouent
  - [ ] Générer des rapports de couverture de tests

- **Maintenance**
  - [ ] Revoir et mettre à jour les tests régulièrement
  - [ ] Éliminer les tests flaky (instables)
  - [ ] Ajouter des tests pour chaque nouveau bug corrigé