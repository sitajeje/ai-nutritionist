import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { searchNutritionTool, calculateNutritionTool } from '@/src/lib/nutrition-tools';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    console.log('=== API Call ===');
    console.log('Messages:', messages.length);
    console.log('Last:', messages[messages.length - 1]?.content?.substring(0, 100));

    const result = await generateText({
      // ✅ 切换到对工具调用支持更好的模型
      model: groq('llama-3.1-8b-instant'), // 这个模型工具调用更稳定
      
      system: `你是营养师AI助手。

规则：
1. 使用工具查询每个食材的营养数据
2. 查询完成后，生成完整的文字回答
3. 必须包含总卡路里和详细营养成分`,

      messages,
      
      tools: {
        search_nutrition: searchNutritionTool,
        calculate_nutrition: calculateNutritionTool,
      },
      
    });

    console.log('✅ Generated:', {
      hasText: !!result.text,
      textLength: result.text.length,
      steps: result.steps.length,
    });

    const response = {
      text: result.text,
      toolCalls: result.steps
        .filter(step => step.toolCalls && step.toolCalls.length > 0)
        .flatMap(step => step.toolCalls),
      toolResults: result.steps
        .filter(step => step.toolResults && step.toolResults.length > 0)
        .flatMap(step => step.toolResults),
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
    
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