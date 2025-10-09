export class USDAClient {
    apiKey;
    baseUrl = 'https://api.nal.usda.gov/fdc/v1';
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    /**
     * 搜索食物并返回最佳匹配
     */
    async searchFood(query) {
        try {
            console.error('🔍 [USDA] Starting search for:', query);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.error('⏰ [USDA] Request timeout!');
                controller.abort();
            }, 8000);
            const url = `${this.baseUrl}/foods/search?query=${encodeURIComponent(query)}&pageSize=20&api_key=${this.apiKey}`;
            console.error('🌐 [USDA] Fetching:', url.replace(this.apiKey, 'API_KEY_HIDDEN'));
            const response = await fetch(url, {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            console.error('📡 [USDA] Response status:', response.status);
            if (!response.ok) {
                throw new Error(`USDA API error: ${response.status}`);
            }
            const data = await response.json();
            console.error('✅ [USDA] Got results:', data.foods?.length || 0);
            if (!data.foods || data.foods.length === 0) {
                console.error('❌ [USDA] No foods found');
                return null;
            }
            // 过滤和排序：优先选择基础食材
            const filteredFoods = data.foods
                .filter((food) => {
                if (food.dataType === 'Branded')
                    return false;
                return ['Survey (FNDDS)', 'SR Legacy', 'Foundation'].includes(food.dataType);
            })
                .sort((a, b) => {
                const priority = {
                    'Survey (FNDDS)': 3,
                    'SR Legacy': 2,
                    'Foundation': 1,
                };
                return (priority[b.dataType] || 0) - (priority[a.dataType] || 0);
            });
            console.error('🔍 [USDA] Filtered to:', filteredFoods.length, 'foods');
            console.error('🔍 [USDA] Food options:', filteredFoods.slice(0, 5).map((f) => f.description));
            if (filteredFoods.length === 0) {
                console.error('⚠️ [USDA] No non-branded foods, using first result');
                // 如果没有基础食材，就用第一个结果
                return this.extractNutrition(data.foods[0]);
            }
            // ✅ 优化食物选择：优先选择简单、基础的食物
            const bestFood = this.selectBestFood(filteredFoods, query);
            console.error('✅ [USDA] Selected:', bestFood.description);
            return this.extractNutrition(bestFood);
        }
        catch (error) {
            console.error('USDA API Error:', error);
            return null;
        }
    }
    // 新增：智能食物选择方法
    selectBestFood(foods, query) {
        const lowerQuery = query.toLowerCase();
        // 排除复合食品的关键词
        const excludeKeywords = [
            'benedict', 'scrambled', 'fried', 'poached', 'sandwich', 'salad',
            'soup', 'casserole', 'prepared', 'cooked with', 'dish', 'recipe'
        ];
        // 优先简单食物的关键词
        const preferKeywords = [
            'raw', 'fresh', 'whole', 'plain', 'basic'
        ];
        // 第一优先级：排除复合食物
        const simpleFood = foods.find(food => {
            const desc = food.description.toLowerCase();
            return !excludeKeywords.some(keyword => desc.includes(keyword));
        });
        if (simpleFood) {
            console.error('✅ [USDA] Found simple food:', simpleFood.description);
            return simpleFood;
        }
        // 第二优先级：选择包含优先关键词的
        const preferredFood = foods.find(food => {
            const desc = food.description.toLowerCase();
            return preferKeywords.some(keyword => desc.includes(keyword));
        });
        if (preferredFood) {
            console.error('✅ [USDA] Found preferred food:', preferredFood.description);
            return preferredFood;
        }
        // 最后：返回第一个结果
        console.error('⚠️ [USDA] Using first filtered food:', foods[0].description);
        return foods[0];
    }
    /**
     * 通过 FDC ID 获取详细信息
     */
    async getFoodById(fdcId) {
        try {
            const url = `${this.baseUrl}/food/${fdcId}?api_key=${this.apiKey}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`USDA API error: ${response.status}`);
            }
            const food = await response.json();
            return this.extractNutrition(food);
        }
        catch (error) {
            console.error('USDA API Error:', error);
            return null;
        }
    }
    /**
     * 从 USDA 数据提取营养成分
     */
    extractNutrition(food) {
        const nutrients = {};
        food.foodNutrients?.forEach((n) => {
            // 能量（卡路里）
            if (n.nutrientName === 'Energy' && n.unitName === 'KCAL') {
                nutrients.calories = n.value;
            }
            // 蛋白质
            if (n.nutrientName === 'Protein') {
                nutrients.protein = n.value;
            }
            // 脂肪
            if (n.nutrientName === 'Total lipid (fat)') {
                nutrients.fat = n.value;
            }
            // 碳水化合物
            if (n.nutrientName === 'Carbohydrate, by difference') {
                nutrients.carbs = n.value;
            }
        });
        return {
            name: food.description,
            fdcId: food.fdcId,
            calories: Math.round(nutrients.calories || 0),
            protein: Math.round((nutrients.protein || 0) * 10) / 10,
            fat: Math.round((nutrients.fat || 0) * 10) / 10,
            carbs: Math.round((nutrients.carbs || 0) * 10) / 10,
            per: 100, // USDA 数据都是每100g
            dataType: food.dataType,
        };
    }
}
// 食材中英文映射（帮助用户）
export const FOOD_NAME_MAP = {
    // 蛋类
    '鸡蛋': 'egg',
    '蛋黄': 'egg yolk',
    '蛋清': 'egg white',
    // 油脂类
    '黄油': 'butter',
    '葡萄籽油': 'grapeseed oil',
    '橄榄油': 'olive oil',
    '植物油': 'vegetable oil',
    // 糖类
    '糖': 'sugar',
    '砂糖': 'sugar',
    '糖粉': 'sugar',
    '白糖': 'sugar',
    '红糖': 'brown sugar',
    // 奶制品
    '牛奶': 'milk',
    '奶油': 'cream',
    '奶油奶酪': 'cream cheese',
    '马斯卡彭': 'mascarpone',
    '芝士': 'cheese',
    '奶酪': 'cheese',
    '酸奶': 'yogurt',
    // 粉类
    '面粉': 'wheat flour',
    '低筋面粉': 'cake flour',
    '高筋面粉': 'bread flour',
    '玉米淀粉': 'cornstarch',
    '可可粉': 'cocoa powder',
    '咖啡粉': 'coffee powder',
    '抹茶粉': 'matcha powder',
    // 调味料
    '香草': 'vanilla',
    '香草精': 'vanilla extract',
    '盐': 'salt',
    '酵母': 'yeast',
    '泡打粉': 'baking powder',
    '小苏打': 'baking soda',
    // 水果
    '草莓': 'strawberry',
    '蓝莓': 'blueberry',
    '香蕉': 'banana',
    '苹果': 'apple',
    '橙子': 'orange',
    '柠檬': 'lemon',
    '西瓜': 'watermelon',
    '葡萄': 'grape',
    '菠萝': 'pineapple',
    '榴莲': 'durian',
    // 坚果
    '杏仁': 'almond',
    '核桃': 'walnut',
    '花生': 'peanut',
    // 巧克力
    '巧克力': 'chocolate',
    '黑巧克力': 'dark chocolate',
    '牛奶巧克力': 'milk chocolate',
    // 其他
    '蜂蜜': 'honey',
    '肉松': 'pork floss',
    '椰奶': 'coconut milk',
    '椰浆': 'coconut milk'
};
/**
 * 将中文食材名转换为英文
 */
export function translateFoodName(chineseName) {
    return FOOD_NAME_MAP[chineseName] || chineseName;
}
