# 🎯 Guide de Test - Récupération Contextuelle de Code

## ✅ **Implémentation Terminée !**

Le système de récupération contextuelle intelligent est maintenant complètement implémenté avec un algorithme de scoring multi-dimensionnel avancé !

## 🎯 **Nouvelles Fonctionnalités Disponibles**

### **🔍 Recherche Sémantique Avancée**
- ✅ **Algorithme de scoring intelligent** combinant 4 dimensions
- ✅ **Normalisation des scores** pour un ranking optimal
- ✅ **Filtrage par seuils** pour éliminer les résultats non pertinents
- ✅ **Stratégies de scoring avancées** (diversité, qualité, récence)

### **⏰ Priorisation Temporelle**
- ✅ **Tracking des modifications** en temps réel
- ✅ **Bonus pour les fichiers récents** (configurable)
- ✅ **Décroissance exponentielle** basée sur l'âge
- ✅ **Persistance des timestamps** avec nettoyage automatique

### **📍 Pondération Spatiale**
- ✅ **Proximité du fichier actif** avec scoring intelligent
- ✅ **Bonus pour même fichier/répertoire** (configurable)
- ✅ **Calcul de distance** basé sur l'arborescence
- ✅ **Cache des fichiers** pour optimiser les performances

### **🏗️ Analyse Structurelle**
- ✅ **Scoring par type de code** (fonction, classe, interface)
- ✅ **Bonus pour même langage** que le fichier actif
- ✅ **Analyse de complexité** (complexité modérée favorisée)
- ✅ **Détection d'exports/imports** et documentation

### **🎯 Combinaison Intelligente**
- ✅ **Poids configurables** pour chaque dimension
- ✅ **Transformation non-linéaire** pour améliorer la séparation
- ✅ **Bonus de diversité** pour éviter la concentration
- ✅ **Boost de qualité** pour le code bien documenté

## 🧪 **Comment Tester la Récupération Contextuelle**

### **1. Compiler et installer l'extension**
```bash
# Compiler
npm run compile

# Créer le package
vsce package

# Installer
code --install-extension code-assist-ai-0.1.0.vsix
```

### **2. Préparer un environnement de test**

#### **Créer un projet de test :**
```typescript
// src/auth/authManager.ts
export class AuthManager {
  async login(username: string, password: string): Promise<boolean> {
    // Implementation here
    return true;
  }
}

// src/utils/helpers.ts
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// src/components/UserProfile.tsx
import React from 'react';
export const UserProfile: React.FC = () => {
  return <div>User Profile</div>;
};
```

### **3. Tester la recherche sémantique**

#### **Test 1 : Recherche basique**
1. Ouvrir `src/auth/authManager.ts`
2. `Ctrl+Shift+P` → "Start Code Assistant AI"
3. Poser la question : "How to validate user credentials?"
4. **Résultat attendu** : Le code d'authentification devrait avoir un score élevé

#### **Test 2 : Influence du fichier actif (spatial)**
1. Ouvrir `src/utils/helpers.ts`
2. Poser la question : "email validation"
3. **Résultat attendu** : `validateEmail` devrait être en tête avec un bonus spatial

#### **Test 3 : Priorisation temporelle**
1. Modifier `src/components/UserProfile.tsx` (ajouter du code)
2. Immédiatement après, poser : "React component"
3. **Résultat attendu** : `UserProfile` devrait avoir un bonus temporel

### **4. Tester les différentes dimensions de scoring**

#### **Scoring Sémantique :**
```
Question : "authentication login"
Fichier actif : Aucun
Résultat attendu : AuthManager.login en tête (haute similarité sémantique)
```

#### **Scoring Temporel :**
```
1. Modifier un fichier
2. Question : "any function"
3. Résultat attendu : Le fichier modifié a un bonus temporel visible
```

#### **Scoring Spatial :**
```
1. Ouvrir src/auth/authManager.ts
2. Question : "helper function"
3. Résultat attendu : Les fichiers dans src/ ont des scores spatiaux plus élevés
```

#### **Scoring Structurel :**
```
Question : "React component"
Résultat attendu : Les composants React ont des scores structurels élevés
```

### **5. Tester les commandes de débogage**

#### **Statistiques contextuelles :**
1. `Ctrl+Shift+P` → "Show Index Statistics"
2. Vérifier les informations temporelles et spatiales

#### **Explication du ranking :**
1. Dans la console de développement (`Help > Toggle Developer Tools`)
2. Utiliser `vectorDb.explainContextualRanking("your query")`
3. Analyser les scores détaillés

### **6. Tester la configuration avancée**

#### **Modifier les poids de scoring :**
```typescript
// Dans les paramètres VSCode
"codeAssist.contextual.semanticWeight": 0.5,
"codeAssist.contextual.temporalWeight": 0.3,
"codeAssist.contextual.spatialWeight": 0.15,
"codeAssist.contextual.structuralWeight": 0.05
```

#### **Ajuster les bonus :**
```typescript
"codeAssist.contextual.sameFileBonus": 0.4,
"codeAssist.contextual.recentModificationBonus": 300000, // 5 minutes
"codeAssist.contextual.maxResults": 15
```

## 🎯 **Scénarios de Test Spécifiques**

### **Scénario 1 : Développement d'une nouvelle fonctionnalité**
1. Créer un nouveau fichier `src/features/newFeature.ts`
2. Commencer à coder
3. Poser des questions liées à la fonctionnalité
4. **Vérifier** : Le nouveau fichier reçoit des bonus temporels et spatiaux

### **Scénario 2 : Debugging dans un fichier spécifique**
1. Ouvrir un fichier avec des erreurs
2. Poser : "error handling patterns"
3. **Vérifier** : Les patterns du même fichier/répertoire sont prioritaires

### **Scénario 3 : Recherche de patterns similaires**
1. Sélectionner une fonction complexe
2. Poser : "similar function implementation"
3. **Vérifier** : Les fonctions de complexité similaire sont favorisées

### **Scénario 4 : Travail multi-langages**
1. Avoir des fichiers TypeScript et Python
2. Ouvrir un fichier TypeScript
3. Poser une question générale
4. **Vérifier** : Le code TypeScript a un bonus de langage

## 📊 **Métriques de Performance Attendues**

### **Scores typiques :**
- **Même fichier + récent + sémantique élevée** : 0.85-0.95
- **Même répertoire + sémantique moyenne** : 0.60-0.75
- **Autre répertoire + sémantique élevée** : 0.50-0.70
- **Ancien fichier + sémantique faible** : 0.20-0.40

### **Temps de réponse :**
- **Recherche contextuelle** : < 500ms
- **Calcul des scores** : < 200ms
- **Ranking final** : < 100ms

## 🔧 **Configuration Optimale**

### **Pour développement actif :**
```json
{
  "semanticWeight": 0.35,
  "temporalWeight": 0.35,
  "spatialWeight": 0.25,
  "structuralWeight": 0.05,
  "recentModificationBonus": 600000
}
```

### **Pour exploration de codebase :**
```json
{
  "semanticWeight": 0.5,
  "temporalWeight": 0.1,
  "spatialWeight": 0.3,
  "structuralWeight": 0.1,
  "maxResults": 15
}
```

### **Pour debugging :**
```json
{
  "semanticWeight": 0.3,
  "temporalWeight": 0.2,
  "spatialWeight": 0.4,
  "structuralWeight": 0.1,
  "sameFileBonus": 0.5
}
```

## 🚨 **Résolution de Problèmes**

### **Scores incohérents :**
- Vérifier que les poids totalisent 1.0
- Redémarrer l'extension après changement de config
- Vérifier les logs dans la console de développement

### **Pas de bonus temporel :**
- Vérifier que l'indexation s'est bien passée
- Modifier un fichier et réessayer
- Vérifier la configuration `recentModificationBonus`

### **Mauvais scoring spatial :**
- Vérifier que le fichier actif est bien détecté
- Tester avec différents fichiers ouverts
- Vérifier la structure des répertoires

## 🎉 **Prochaines Étapes**

Une fois la récupération contextuelle testée et validée :

1. **Optimiser les performances** avec du cache intelligent
2. **Ajouter des filtres avancés** par type de code
3. **Implémenter l'apprentissage** des préférences utilisateur
4. **Créer des templates** de configuration par projet
5. **Ajouter des métriques** de qualité des résultats

---

**🎯 Votre système de récupération contextuelle intelligent est maintenant opérationnel !**

Ce système révolutionnaire transforme la qualité des réponses de Claude en fournissant le contexte le plus pertinent basé sur une analyse multi-dimensionnelle sophistiquée. Les réponses seront maintenant beaucoup plus précises et adaptées à votre contexte de travail actuel !
