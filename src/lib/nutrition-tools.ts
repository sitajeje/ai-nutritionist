import { tool } from 'ai';
import { z } from 'zod';
import { getMCPClient } from './mcp-client';

export const searchNutritionTool = tool({
    description: '从USDA数据库搜索食物的营养成分。支持中英文食材名称。例如：鸡蛋、egg、面粉、butter',
    inputSchema: z.object({
        food_name: z.string().describe('食材名称，支持中文或英文'),
    }),
    execute: async ({ food_name }) => {
        const mcpClient = getMCPClient();

        try {
        const result = await mcpClient.searchNutrition(food_name);

        if (result.success) {
            return {
            success: true,
            food: result.data.name,
            fdcId: result.data.fdcId,
            nutritionPer100g: {
                calories: result.data.calories,
                protein: result.data.protein,
                fat: result.data.fat,
                carbs: result.data.carbs,
            },
            dataType: result.data.dataType,
            message: `✅ 找到了"${result.data.name}"的营养数据（每100克）`,
            };
        } else {
            return {
            success: false,
            error: result.error,
            suggestion: result.suggestion,
            };
        }
        } catch (error) {
        console.error('MCP Tool Error:', error);
        return {
            success: false,
            error: '查询营养数据时出错',
        };
        }
    },
});

export const calculateNutritionTool = tool({
    description: '根据食物的USDA ID和实际重量，计算具体的营养成分',
    inputSchema: z.object({
        fdcId: z.number().describe('食物的USDA数据库ID（从search_nutrition获得）'),
        amount: z.number().describe('实际重量（克）'),
    }),
    execute: async ({ fdcId, amount }) => {
        const mcpClient = getMCPClient();

        try {
        const result = await mcpClient.calculateNutrition(fdcId, amount);

        if (result.success) {
            const data = result.data;
            return {
            success: true,
            food: data.food,
            amount: data.amount,
            unit: data.unit,
            nutrition: {
                calories: data.calories,
                protein: data.protein,
                fat: data.fat,
                carbs: data.carbs,
            },
            message: `✅ ${data.food} ${data.amount}g 的营养成分已计算`,
            };
        } else {
            return {
            success: false,
            error: result.error,
            };
        }
        } catch (error) {
        console.error('MCP Tool Error:', error);
        return {
            success: false,
            error: '计算营养成分时出错',
        };
        }
    },
});