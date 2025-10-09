import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { searchNutritionTool, calculateNutritionTool } from '@/src/lib/nutrition-tools';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1]?.content || '';

    console.log('=== Two-Step Processing ===');
    console.log('Input:', userMessage);

    // ✅ 第一步：只调用工具，收集数据
    const toolResult = await generateText({
      model: google('gemini-2.5-flash'),
      
      messages: [{
        role: 'user',
        content: userMessage
      }],
      
      tools: {
        search_nutrition: searchNutritionTool,
        calculate_nutrition: calculateNutritionTool,
      },
    });

    console.log('🔧 Tool steps completed:', toolResult.steps.length);

    // ✅ 提取工具调用结果
    const toolData: unknown[] = [];
    
    for (const step of toolResult.steps) {
      if (step.toolResults && step.toolResults.length > 0) {
        for (const toolResultItem of step.toolResults) {
          console.log('Tool result keys:', Object.keys(toolResultItem));
          
          // 安全地访问属性
          if ('result' in toolResultItem) {
            toolData.push(toolResultItem.result);
          } else if ('content' in toolResultItem) {
            toolData.push(toolResultItem.content);
          } else {
            toolData.push(toolResultItem);
          }
        }
      }
    }

    console.log('📊 Tool data collected:', toolData.length, 'results');
    console.log('📋 First tool data:', toolData[0]);
    if (toolData.length === 0) {
      return Response.json({
        text: '抱歉，我无法获取营养数据。请稍后再试。',
        success: false,
        debug: 'No tool data collected'
      });
    }
    // ✅ 第二步：基于工具数据生成回答
    const summaryPrompt = `用户问："${userMessage}"

基于以下营养数据，生成完整的中文回答：

${toolData.map((data, i) => `数据${i + 1}：${JSON.stringify(data, null, 2)}`).join('\n\n')}

请计算总卡路里，并给出友好的营养分析。用自然的中文回答，包含具体数字。`;

    const finalResult = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: summaryPrompt,
    });

    console.log('✅ Final answer generated:', finalResult.text.length, 'chars');

    return Response.json({
      text: finalResult.text,
      success: true,
      toolDataCount: toolData.length,
      debug: {
        toolSteps: toolResult.steps.length,
        hasToolData: toolData.length > 0,
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ 
      error: String(error),
      success: false
    }, { status: 500 });
  }
}