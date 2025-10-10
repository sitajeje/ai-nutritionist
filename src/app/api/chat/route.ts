import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { directSearchNutritionTool, directCalculateNutritionTool } from '@/src/lib/direct-nutrition-tools';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1]?.content || '';

    console.log('=== Direct Integration ===');
    console.log('Input:', userMessage);

    // 第一步：调用工具
    const toolResult = await generateText({
      model: google('gemini-2.5-flash'),
      messages: [{ role: 'user', content: userMessage }],
      tools: {
        search_nutrition: directSearchNutritionTool,
        calculate_nutrition: directCalculateNutritionTool,
      },
    
    });

    console.log('🔧 Tool steps completed:', toolResult.steps.length);

    // 提取工具结果
    const toolData: unknown[] = [];
    
    for (const step of toolResult.steps) {
      if (step.toolResults && step.toolResults.length > 0) {
        for (const toolResultItem of step.toolResults) {
          if ('output' in toolResultItem) {
            toolData.push(toolResultItem.output);
          }
        }
      }
    }

    console.log('📊 Tool data collected:', toolData.length, 'results');

    if (toolData.length === 0) {
      return Response.json({
        text: '抱歉，我无法获取营养数据。请稍后再试。',
        success: false,
      });
    }

    // 第二步：生成回答
    const summaryPrompt = `用户问："${userMessage}"

基于以下营养数据，生成完整的中文回答：

${toolData.map((data, i) => `数据${i + 1}：${JSON.stringify(data, null, 2)}`).join('\n\n')}

请计算总卡路里，并给出友好的营养分析。用自然的中文回答，包含具体数字。`;

    const finalResult = await generateText({
      model: google('gemini-1.5-pro'),
      prompt: summaryPrompt,
    });

    console.log('✅ Final answer generated:', finalResult.text.length, 'chars');

    return Response.json({
      text: finalResult.text,
      success: true,
      toolDataCount: toolData.length,
    });
    
  } catch (error) {
    console.error('=== Error ===');
    console.error(error);
    
    return Response.json({ 
      text: '抱歉，发生了错误。请稍后再试。',
      success: false
    }, { status: 500 });
  }
}