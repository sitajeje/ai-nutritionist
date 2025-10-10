import { tool } from 'ai';
import { z } from 'zod';

// 食材中英文映射
const FOOD_NAME_MAP: Record<string, string> = {
    '鸡蛋': 'egg',
    '蛋': 'egg',
    '蛋黄': 'egg yolk',
    '蛋清': 'egg white',
    '黄油': 'butter',
    '葡萄籽油': 'grapeseed oil',
    '橄榄油': 'olive oil',
    '植物油': 'vegetable oil',
    '油': 'oil',
    '糖': 'sugar',
    '砂糖': 'sugar',
    '白糖': 'sugar',
    '红糖': 'brown sugar',
    '牛奶': 'milk',
    '奶': 'milk',
    '奶油': 'cream',
    '奶油奶酪': 'cream cheese',
    '马斯卡彭': 'mascarpone',
    '面粉': 'wheat flour',
    '粉': 'flour',
    '低筋面粉': 'cake flour',
    '高筋面粉': 'bread flour',
    '香草': 'vanilla',
    '香草精': 'vanilla extract',
    '盐': 'salt',
    '蜂蜜': 'honey',
};

// 定义 USDA API 的类型
interface USDAFoodNutrient {
    nutrientId: number;
    value: number;
}

interface USDAFood {
    fdcId: number;
    description: string;
    dataType: string;
    foodNutrients: USDAFoodNutrient[];
}

interface USDASearchResponse {
    foods: USDAFood[];
}

function translateFoodName(chineseName: string): string {
    const cleaned = chineseName.replace(/\d+/g, '').replace(/[克g]/g, '').trim();
    
    if (FOOD_NAME_MAP[cleaned]) {
        return FOOD_NAME_MAP[cleaned];
    }
    
    for (const [chinese, english] of Object.entries(FOOD_NAME_MAP)) {
        if (cleaned.includes(chinese) || chinese.includes(cleaned)) {
        return english;
        }
    }
    
    return cleaned;
    }

    async function searchUSDAFood(query: string): Promise<USDAFood | null> {
    const apiKey = process.env.USDA_API_KEY;
    
    if (!apiKey) {
        throw new Error('USDA API key not configured');
    }

    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=20&api_key=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`USDA API error: ${response.status}`);
    }

    const data: USDASearchResponse = await response.json();
    
    if (!data.foods || data.foods.length === 0) {
        return null;
    }

    const filteredFoods = data.foods.filter((food: USDAFood) => {
        return food.dataType !== 'Branded' && 
            ['Survey (FNDDS)', 'SR Legacy', 'Foundation'].includes(food.dataType);
    });

    if (filteredFoods.length === 0) {
        return data.foods[0];
    }

    return filteredFoods[0];
    }

    function extractNutrition(food: USDAFood) {
    const nutrients = food.foodNutrients || [];
    
    const findNutrient = (nutrientIds: number[]): number => {
        for (const id of nutrientIds) {
        const nutrient = nutrients.find((n: USDAFoodNutrient) => n.nutrientId === id);
        if (nutrient) return nutrient.value || 0;
        }
        return 0;
    };

    return {
        name: food.description,
        fdcId: food.fdcId,
        calories: findNutrient([1008, 2047]),
        protein: findNutrient([1003, 2055]),
        fat: findNutrient([1004, 2079]),
        carbs: findNutrient([1005, 2039]),
        dataType: food.dataType,
    };
}

export const directSearchNutritionTool = tool({
    description: '从USDA数据库搜索食物的营养成分。支持中英文食材名称。例如：鸡蛋、egg、面粉、butter',
    inputSchema: z.object({
        food_name: z.string().describe('食材名称，支持中文或英文'),
    }),
    execute: async ({ food_name }) => {
        try {
        console.log('🔍 [Direct] Searching for:', food_name);
        
        const englishName = translateFoodName(food_name);
        console.log('🌐 [Direct] Translated:', food_name, '->', englishName);
        
        const food = await searchUSDAFood(englishName);
        
        if (!food) {
            return {
            success: false,
            error: `未找到 "${food_name}" 的营养数据`,
            suggestion: '请尝试使用更通用的名称',
            };
        }

        const nutrition = extractNutrition(food);
        
        return {
            success: true,
            food: nutrition.name,
            fdcId: nutrition.fdcId,
            nutritionPer100g: {
            calories: nutrition.calories,
            protein: nutrition.protein,
            fat: nutrition.fat,
            carbs: nutrition.carbs,
            },
            dataType: nutrition.dataType,
            message: `✅ 找到了"${nutrition.name}"的营养数据（每100克）`,
        };
        } catch (error) {
        console.error('Direct Tool Error:', error);
        return {
            success: false,
            error: '查询营养数据时出错',
        };
        }
    },
});

export const directCalculateNutritionTool = tool({
    description: '根据食物的USDA ID和实际重量，计算具体的营养成分',
    inputSchema: z.object({
        fdcId: z.number().describe('食物的USDA数据库ID（从search_nutrition获得）'),
        amount: z.number().describe('实际重量（克）'),
    }),
    execute: async ({ fdcId, amount }) => {
        try {
        console.log('🧮 [Direct] Calculating for:', { fdcId, amount });
        
        const apiKey = process.env.USDA_API_KEY;
        const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`USDA API error: ${response.status}`);
        }

        const food: USDAFood = await response.json();
        const nutrition = extractNutrition(food);
        
        const ratio = amount / 100;
        const calculated = {
            food: nutrition.name,
            amount: amount,
            unit: 'g',
            calories: Math.round(nutrition.calories * ratio),
            protein: Math.round(nutrition.protein * ratio * 10) / 10,
            fat: Math.round(nutrition.fat * ratio * 10) / 10,
            carbs: Math.round(nutrition.carbs * ratio * 10) / 10,
        };

        return {
            success: true,
            food: calculated.food,
            amount: calculated.amount,
            unit: calculated.unit,
            nutrition: {
            calories: calculated.calories,
            protein: calculated.protein,
            fat: calculated.fat,
            carbs: calculated.carbs,
            },
            message: `✅ ${calculated.food} ${calculated.amount}g 的营养成分已计算`,
        };
        } catch (error) {
        console.error('Direct Tool Error:', error);
        return {
            success: false,
            error: '计算营养成分时出错',
        };
        }
    },
});