# MensaPWA Firebase Functions

This is the Firebase Functions code for the MensaPWA.

## 🚀 Functions

### Core Functions

- **`generateDailyData`** - Scheduled daily at 02:00 Europe/Berlin
  - Fetches menu data from HTWK API
  - Generates nutrition information using OpenAI
  - Creates optimized dish images with intelligent caching
  - Generates personalized notifications

- **`checkNotifications`** - Runs every minute
  - Checks for users whose notification time has arrived
  - Sends push notifications via FCM
  - Updates next notification times

### Utility Functions

- **`healthCheck`** - HTTP endpoint for system status
- **`getCacheStats`** - HTTP endpoint for cache monitoring

## 🎯 Enhanced Image Caching

The new caching system dramatically reduces API calls and improves performance:

### Features
- **Title Normalization**: Converts dish titles to canonical keys
- **Fuzzy Matching**: Recognizes similar dishes with different wording
- **Veto Rules**: Prevents mismatches when key ingredients differ
- **Firestore Storage**: Persistent cache with usage analytics

### Example Transformations
```
"Hähnchen Crossies mit Tomaten-Paprika-Dip | Steakhouse Pommes"
→ "crossies_hähnchen_paprika_pommes_tomaten"

"Gemüsekroketten, Tomaten Chili Dip, Orangenpolenta"  
→ "chili_gemüsekroketten_orangenpolenta_tomaten"
```

### Cache Strategy
1. **Exact Match**: Check for identical canonical keys (fastest)
2. **Fuzzy Match**: Find similar dishes with ≥85% similarity
3. **Critical Token Veto**: Prevent protein/ingredient mismatches
4. **Generate New**: Create image only if no suitable match found

## 🔧 Setup

### Environment Variables

Copy `.env.example` to `.env` and fill in the required values.

### Deploy
```bash
# Deploy all functions
firebase deploy --only functions --project=mensapwa-39cd9

# Deploy specific function
firebase deploy --only functions:generateDailyData

# Deploy with environment config
firebase functions:config:set openai.api_key="your-key"
firebase deploy --only functions
```

### Local Testing
```bash
# Test normalization without Firestore
node test.js

# Test with Firebase emulators
firebase emulators:start --only functions,firestore
```

## 📊 Monitoring

### Cache Performance
```bash
# Get cache statistics
curl https://your-region-your-project.cloudfunctions.net/getCacheStats
```

### Logs
```bash
# View function logs
firebase functions:log

# Follow logs in real-time
firebase functions:log --only generateDailyData
```
