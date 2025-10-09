import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { searchNutritionTool, calculateNutritionTool } from '@/src/lib/nutrition-tools';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    console.log('=== API Call ===');
    console.log('Messages:', messages.length);
    console.log('Has API Key:', !!process.env.ANTHROPIC_API_KEY);

    // ✅ 在 0.0.50 版本中，anthropic 是一个对象，需要这样使用
    const result = await streamText({
      model: anthropic('claude-3-5-haiku-20241022'),
      
      system: `你是一个专业且友好的营养师AI助手，专门帮助用户计算甜点的卡路里和营养成分。

# 你的工作流程

1. **理解用户需求**
2. **查询营养数据** - 使用 search_nutrition 工具
3. **计算具体营养** - 使用 calculate_nutrition 工具
4. **展示结果**

# 交互风格

- 🎯 简洁明了
- 😊 友好温暖
- 📊 数据清晰
- 💡 主动引导`,

      messages,
      
      tools: {
        search_nutrition: searchNutritionTool,
        calculate_nutrition: calculateNutritionTool,
      },
      
      maxSteps: 10,
    });

    return result.toDataStreamResponse();
    
  } catch (error) {
    console.error('=== Error ===');
    console.error(error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}