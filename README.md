# AI Dessert Nutritionist

An AI-powered dessert nutrition calculator that helps users accurately calculate calories and nutritional values of baking recipes.

## Project Overview

AI Dessert Nutritionist is an intelligent nutrition analysis tool designed specifically for baking enthusiasts and nutritionists. Users simply input ingredients and quantities, and the system automatically queries authoritative nutrition databases to calculate accurate calories and nutritional content. It supports complex recipe calculations with multiple ingredients and provides professional nutrition analysis reports.

## Core Features

- **Smart Ingredient Recognition**: Supports both Chinese and English ingredient names with automatic translation and matching
- **Authoritative Data Source**: Based on USDA (United States Department of Agriculture) nutrition database
- **Complex Recipe Calculation**: Supports multi-ingredient, multi-weight composite recipe analysis
- **Real-time Queries**: Fast response with instant nutrition analysis
- **User-friendly Interface**: Intuitive conversational interaction, like consulting with a professional nutritionist

## Technology Stack

### Frontend
- **Next.js 15** - React full-stack framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Responsive design
- **AI SDK 5.x** - AI model integration

### Backend
- **Google Gemini 1.5 Pro** - Large language model
- **MCP (Model Context Protocol)** - Modular tool calling architecture
- **Node.js** - Server runtime
- **USDA FoodData Central API** - Nutrition data source

### Tools & Integration
- **Zod** - Data validation
- **Model Context Protocol** - Standardized AI tool interface

## System Architecture

### Layered Architecture Design

```
User Interface (Next.js + React)
    ↓
AI Conversation Layer (Gemini + AI SDK)
    ↓
Tool Calling Layer (MCP Client)
    ↓
MCP Server (Nutrition Tools)
    ↓
USDA API (Nutrition Database)
```

### Core Implementation Strategy

#### 1. Separated AI Tool Calling
Due to discovering that Gemini tends to hang after complex tool calls without generating responses, we implemented an innovative separated processing approach:

- **Phase 1**: AI calls tools to collect all nutrition data
- **Phase 2**: Re-invoke AI based on collected data to generate final response

This approach ensures stable user experience and avoids the issue of AI becoming unresponsive after tool calls.

#### 2. Smart Ingredient Matching
- **Chinese-English Mapping Table**: Predefined mapping of common ingredients
- **Fuzzy Matching Algorithm**: Supports various ingredient name variants
- **Priority Filtering**: Prioritizes basic ingredients, avoiding processed foods

#### 3. MCP Tool Architecture
Built modular nutrition query tools using Model Context Protocol:

- `search_nutrition`: Query nutrition data by ingredient name
- `calculate_nutrition`: Calculate specific nutrition content by weight

#### 4. Error Handling & Optimization
- **Timeout Protection**: All API requests have timeout mechanisms
- **Error Handling**: Comprehensive error messages and fallback strategies
- **Data Validation**: Using Zod for type safety

## Installation & Setup

### Requirements
- Node.js 18+
- npm or yarn

### Installation Steps

1. **Clone Repository**
```bash
git clone <repository-url>
cd calorie-agent
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment Variables**
Create `.env.local` file:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key
USDA_API_KEY=your_usda_api_key
MCP_NUTRITION_SERVER_PATH=/absolute/path/to/mcp-server/nutrition/dist/server.js
```

4. **Build MCP Server**
```bash
cd mcp-server/nutrition
npm install
npm run build
cd ../..
```

5. **Start Development Server**
```bash
npm run dev
```

Visit `http://localhost:3000` to start using the application.

## API Key Setup

### Google Gemini API
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create new API key
3. Copy key to environment variables

### USDA API
1. Visit [USDA FoodData Central](https://fdc.nal.usda.gov/api-key-signup.html)
2. Register and get free API key
3. Copy key to environment variables

## Usage Examples

### Simple Query
```
Input: "How many calories are in 100g of eggs?"
Output: Detailed nutritional analysis
```

### Complex Recipe
```
Input: "My cake recipe: 200g eggs, 300g flour, 150g sugar, 100g butter, what's the total calories?"
Output: Complete recipe nutrition analysis and total calorie calculation
```

## Project Highlights

- **Authoritative Data**: Based on official USDA nutrition database for data accuracy
- **Smart Understanding**: AI understands complex recipe descriptions and automatically identifies ingredients and quantities
- **Professional Analysis**: Provides detailed nutritional breakdown, not just calories
- **User-friendly**: Conversational interaction like talking to a real nutritionist

## Contributing

Issues and Pull Requests are welcome. Before contributing code, please ensure:

1. Code passes TypeScript type checking
2. Follows project code style
3. Adds necessary test cases
4. Updates relevant documentation

## License

MIT License