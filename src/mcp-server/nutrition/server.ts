#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { USDAClient, translateFoodName } from './usda-api.js';
//import { USDA_API_KEY } from '@next-env.d.ts'; // 确保环境变量已加载

// 获取 API Key
const USDA_API_KEY = process.env.USDA_API_KEY;

if (!USDA_API_KEY) {
    console.error('Error: USDA_API_KEY environment variable is required');
    process.exit(1);
}

// 创建 USDA 客户端
const usdaClient = new USDAClient(USDA_API_KEY);

// 定义工具列表
const TOOLS: Tool[] = [
    {
        name: 'search_nutrition',
        description: '从 USDA 数据库搜索食物的营养成分（卡路里、蛋白质、脂肪、碳水化合物）。支持中英文食材名称。',
        inputSchema: {
        type: 'object',
        properties: {
            food_name: {
            type: 'string',
            description: '食物名称，支持中文或英文。例如：鸡蛋、egg、面粉、wheat flour',
            },
        },
        required: ['food_name'],
        },
    },
    {
        name: 'calculate_nutrition',
        description: '根据已知的营养数据（每100g）计算指定重量的营养成分',
        inputSchema: {
        type: 'object',
        properties: {
            fdcId: {
            type: 'number',
            description: 'USDA 食物 ID（从 search_nutrition 获得）',
            },
            amount: {
            type: 'number',
            description: '实际重量（克）',
            },
        },
        required: ['fdcId', 'amount'],
        },
    },
];

// 创建 MCP Server
const server = new Server(
    {
        name: 'nutrition-data-server',
        version: '1.0.0',
    },
    {
        capabilities: {
        tools: {},
        },
    }
);

// 注册工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});

// 注册工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.error('🔧 [MCP] Tool called:', name, 'with args:', args);
    try {
        if (name === 'search_nutrition') {
        const foodName = args?.food_name as string;
        
        if (!foodName) {
            console.error('❌ [MCP] Missing food_name');
            throw new Error('food_name is required');
        }

        // 尝试翻译中文名称
        const englishName = translateFoodName(foodName);
        
        console.error('🌐 [MCP] Translated:', foodName, '->', englishName);
        
        const nutritionData = await usdaClient.searchFood(englishName);
        console.error('📊 [MCP] Search result:', nutritionData ? 'Success' : 'Failed');
        if (!nutritionData) {
            return {
            content: [
                {
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: `未找到 "${foodName}" 的营养数据`,
                    suggestion: '请尝试使用更通用的名称，如"鸡蛋"而不是"土鸡蛋"',
                }),
                },
            ],
            };
        }
        const response = {
        success: true,
        data: nutritionData,
        message: `找到 "${nutritionData.name}"，数据类型：${nutritionData.dataType}`,
        };

        console.error('✅ [MCP] Returning success response');
        return {
            content: [
            {
                type: 'text',
                text: JSON.stringify({
                success: true,
                data: nutritionData,
                message: `找到 "${nutritionData.name}"，数据类型：${nutritionData.dataType}`,
                }),
            },
            ],
        };
        }

        if (name === 'calculate_nutrition') {
        const fdcId = args?.fdcId as number;
        const amount = args?.amount as number;
        console.error('🧮 [MCP] Calculate:', { fdcId, amount });
        if (!fdcId || !amount) {
            throw new Error('fdcId and amount are required');
        }

        // 获取完整营养数据
        const nutritionData = await usdaClient.getFoodById(fdcId);

        if (!nutritionData) {
            return {
            content: [
                {
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: '无法获取营养数据',
                }),
                },
            ],
            };
        }

        // 计算实际重量的营养成分
        const ratio = amount / 100;
        const calculated = {
            food: nutritionData.name,
            amount: amount,
            unit: 'g',
            calories: Math.round(nutritionData.calories * ratio),
            protein: Math.round(nutritionData.protein * ratio * 10) / 10,
            fat: Math.round(nutritionData.fat * ratio * 10) / 10,
            carbs: Math.round(nutritionData.carbs * ratio * 10) / 10,
        };
        console.error('✅ [MCP] Calculated:', calculated);
        return {
            content: [
            {
                type: 'text',
                text: JSON.stringify({
                success: true,
                data: calculated,
                }),
            },
            ],
        };
        }

        throw new Error(`Unknown tool: ${name}`);
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error executing tool ${name}:`, errorMessage);
        
        return {
        content: [
            {
            type: 'text',
            text: JSON.stringify({
                success: false,
                error: errorMessage,
            }),
            },
        ],
        isError: true,
        };
    }
});

// 启动服务器
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Nutrition MCP Server running on stdio');
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});