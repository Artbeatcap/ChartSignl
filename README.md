# ChartSignl

> AI-powered chart analysis app - "Show me the levels" 📊

A cross-platform app (iOS, Android, Web) that lets you search stocks/crypto, view interactive charts, and get AI-powered analysis of support, resistance, and key trading levels.

## Features

- 🔍 **Search any symbol** - Stocks, crypto, forex, futures
- 📈 **Interactive TradingView charts** - Built-in chart viewer with multiple timeframes
- 📸 **One-tap chart capture** - Capture the exact chart you're viewing
- 🤖 **AI-powered level detection** - Using OpenAI Vision
- 🎯 **Identifies support, resistance, patterns, and breakout zones**
- 📱 **Native iOS & Android apps + web version**
- 🧘 **Calm, habit-app inspired design** - Not a typical "trading terminal" look
- 🔐 **Supabase authentication** - Email, Google, Apple
- 💾 **Analysis history** - Saved to cloud

## Tech Stack

- **Mobile/Web**: Expo + React Native + Expo Router
- **Charts**: Recharts (custom line & candlestick charts)
- **Styling**: NativeWind (Tailwind for RN)
- **State**: Zustand + TanStack Query
- **Backend**: Node.js + Hono
- **Database/Auth/Storage**: Supabase
- **Market Data**: Polygon.io (reliable, professional-grade data)
- **AI**: OpenAI API (GPT-4o-mini for data analysis)
- **Monorepo**: Turborepo

## Project Structure

```
chartsignl/
├── apps/
│   ├── mobile/          # Expo app (iOS, Android, Web)
│   │   ├── src/
│   │   │   ├── app/     # Expo Router screens
│   │   │   ├── components/
│   │   │   ├── lib/     # API client, Supabase
│   │   │   ├── store/   # Zustand stores
│   │   │   └── theme/   # Colors, typography
│   │   └── ...
│   └── backend/         # Node.js API server
│       └── src/
│           ├── routes/  # API endpoints
│           ├── lib/     # Supabase, OpenAI clients
│           └── prompts/ # AI system prompts
├── packages/
│   └── core/            # Shared TypeScript types
└── supabase/            # Database schema & setup
```

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account
- OpenAI API key

### 1. Clone and Install

```bash
git clone <your-repo>
cd chartsignl
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the schema in `supabase/schema.sql` via the SQL Editor
3. Create a storage bucket called `chart_uploads` (public)
4. See `supabase/SETUP.md` for detailed instructions

### 3. Configure Environment

**Backend** (`apps/backend/.env`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
POLYGON_API_KEY=your-polygon-api-key
PORT=4000
CORS_ORIGINS=https://app.chartsignl.com,http://localhost:8081,http://localhost:19006,http://localhost:3000
```

**Note**: `CORS_ORIGINS` should be a comma-separated list of allowed origins. In production, ensure it includes your frontend domain (e.g., `https://app.chartsignl.com`).

**Mobile** (`apps/mobile/.env`):
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=http://localhost:4000
```

### 4. Run Development Servers

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Mobile/Web
npm run dev:mobile
```

The app will open in Expo. Press:
- `w` for web
- `i` for iOS simulator
- `a` for Android emulator

## Deployment

### Backend (Hostinger VPS)

See `apps/backend/deploy/` for Docker and Nginx configs.

```bash
# Build and deploy
cd apps/backend
docker build -t chartsignl-api .
docker run -d -p 4000:4000 --env-file .env chartsignl-api
```

### Web App (Static)

```bash
cd apps/mobile
npx expo export --platform web
# Upload dist/ to your static hosting
```

### Mobile Apps

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build for app stores
eas build --platform ios
eas build --platform android
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze-chart` | POST | Upload & analyze a chart image |
| `/api/analyses` | GET | Get analysis history |
| `/api/analyses/:id` | GET | Get single analysis |
| `/api/analyses/:id` | DELETE | Delete an analysis |
| `/api/user/me` | GET | Get current user profile |
| `/api/user/profile` | PUT | Update profile |
| `/api/user/usage` | GET | Get usage stats |
| `/health` | GET | Health check |

## Chart Analysis Response

The AI returns structured JSON with:

```typescript
interface ChartAnalysis {
  meta: {
    symbol: string | null;
    timeframe: string | null;
    trend: { type: string; confidence: number; notes: string };
  };
  levels: Array<{
    id: string;
    role: 'support' | 'resistance' | 'demand_zone' | 'supply_zone';
    approxPrice: number | null;
    strength: 'strong' | 'medium' | 'weak';
    confidence: number;
    imageRegion: { x0, y0, x1, y1 }; // normalized 0-1
  }>;
  patterns: Array<{ type, bias, confidence, notes }>;
  breakoutZones: Array<{ direction, approxPrice, notes }>;
  summary: {
    headline: string;
    keyLevelsCommentary: string[];
    tradingIdeas: Array<{ idea, riskNote }>;
  };
}
```

## Design Philosophy

ChartSignl intentionally avoids the typical "trading terminal" aesthetic:

- **Light backgrounds** with soft gradients
- **Large, friendly typography**
- **Calm colors** (teal/mint primary, lavender accents)
- **Quittr-inspired onboarding** with emotional, reflective questions
- **Focus on clarity** over feature density

The goal is to make chart analysis feel approachable, not intimidating.

## License

Private - All rights reserved

## Support

For issues or questions, contact [your-email]
