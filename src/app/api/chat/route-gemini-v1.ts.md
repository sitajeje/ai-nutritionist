import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { searchNutritionTool, calculateNutritionTool } from '@/src/lib/nutrition-tools';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    console.log('=== API Call ===');
    console.log('Messages:', messages.length);
    console.log('Last message:', messages[messages.length - 1]?.content);
    // ✅ 在最后一条消息后添加强制回复的提示
    const enhancedMessages = [
      ...messages.slice(0, -1),
      {
        ...messages[messages.length - 1],
        content: messages[messages.length - 1].content + 
          '\n\n请使用工具查询后,务必生成一个完整的文字回答,包括总卡路里和营养成分。'
      }
    ];
    const result = streamText({
      // ✅ AI SDK 5.x 中直接调用 google()
      model: google('gemini-2.5-flash'),
      
      system: `你是一个专业且友好的营养师AI助手,专门帮助用户计算甜点的卡路里和营养成分。
# 核心规则（必须遵守）

1. **必须生成文本回复**：每次都要给用户一个清晰的文字答案
2. **工具调用后必须总结**：使用工具后,立即用自然语言总结结果
3. **即使失败也要回复**：如果工具调用失败，友好地告知用户并建议替代方案

# 工作流程

## 1. **理解用户需求**
  - 识别用户提到的食材
  - 判断是否提供了重量信息
  - 如果遇到没有翻译成英文的单词，尝试翻译

## 2. **查询营养数据**
  - 使用 search_nutrition 工具查询食材的营养数据
  - 注意：工具支持中英文，你可以直接传入用户说的中文食材名
  - 如果查询失败，尝试使用更通用的名称

## 3. **计算具体营养**
  - 如果用户提供了重量，使用 calculate_nutrition 工具计算
  - 如果没有重量，主动询问用户

## 4. ** 生成回复 展示结果（重要！）**
  - 汇总所有查询结果
  - 计算总卡路里
  - 用清晰、友好的文字展示给用户
  - 可以提供额外的营养建议

# 交互风格

- 简洁明了：直接回答问题，不要过于啰嗦
- 友好温暖：像朋友聊天一样自然
- 数据清晰：营养数据要清楚展示
- 主动引导：缺少信息时主动询问

# 示例对话

用户："100克鸡蛋多少卡路里?"

你的思考过程：
1. 识别:鸡蛋,100克
2. 调用 search_nutrition("鸡蛋")
3. 调用 calculate_nutrition(fdcId, 100)
4. 生成回复："100克鸡蛋含有约143千卡热量,蛋白质12.6克,脂肪9.5克,碳水化合物1.1克。鸡蛋是优质蛋白来源！"

# 注意事项

- 永远不要只调用工具而不生成文字回复
- 如果某个食材查询失败，继续处理其他食材
- 最后必须给出一个总结性的答案

# 严格规则
- 使用工具查询后，你必须立即生成文字回答
- 你的回答必须包含具体数字和总结
- 不要等待，查询完成后立即回复用户

记住：查询完所有食材后，立即给出总结！每次都要生成完整的文字回复`,

      messages: enhancedMessages,
      
      tools: {
        search_nutrition: searchNutritionTool,
        calculate_nutrition: calculateNutritionTool,
      },
    
      temperature: 0.3, // 降低温度，使回复更确定
      
      // ✅ 正确的回调
      onFinish: ({ text, toolCalls, toolResults, finishReason }) => {
        console.log('✅ Finished:', {
          hasText: !!text,
          textLength: text?.length || 0,
          toolCallsCount: toolCalls?.length || 0,
          toolResultsCount: toolResults?.length || 0,
          finishReason,
        });
        // ✅ 如果没有文本，记录警告
        if (!text || text.length === 0) {
          console.error('⚠️ WARNING: No text generated!');
        }
      },
      
    });
    console.log('✅ StreamText created');
    
    // ✅ AI SDK 5.x 使用 toDataStreamResponse
    return result.toTextStreamResponse();
    
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