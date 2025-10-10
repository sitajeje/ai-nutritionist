'use client';

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';

// 类型安全的辅助函数
function safeString(value: unknown, defaultValue = ''): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return defaultValue;
  return String(value);
}

function safeNumber(value: unknown, defaultValue = 0): number {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

interface ToolInvocation {
  state: 'call' | 'result';
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolInvocation[];
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      // 处理 JSON 响应而不是流式响应
    const data = await response.json();

    // 只在有内容时才创建助手消息
    if (data.text && data.text.trim()) {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text,
        toolInvocations: [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } else {
      // 如果没有内容，显示错误消息
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，我没能生成回复。请稍后再试。',
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
    
  } catch (error) {
    console.error('Error:', error);
    const errorMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '抱歉，发生了错误。请稍后再试。',
    };
    setMessages((prev) => [...prev, errorMessage]);
  } finally {
    setIsLoading(false);
  }
};
      

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-orange-50 to-pink-50">
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">
            🍰 AI 甜点营养师
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            基于 USDA 权威数据 · 支持中英文食材 · MCP 驱动
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {messages.length === 0 && (
            <div className="text-center mt-16">
              <div className="inline-block p-6 bg-white rounded-2xl shadow-lg">
                <p className="text-xl text-gray-800 mb-4">
                  👋 你好！我是你的 AI 营养师
                </p>
                <p className="text-gray-600 mb-6">
                  告诉我你的食材和用量，我来帮你计算营养成分
                </p>
                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition cursor-pointer">
                    <span className="text-2xl">🥚</span>
                    <div>
                      <p className="font-medium text-gray-800">计算单个食材</p>
                      <p className="text-sm text-gray-600">例如：100克鸡蛋有多少卡路里？</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition cursor-pointer">
                    <span className="text-2xl">🎂</span>
                    <div>
                      <p className="font-medium text-gray-800">计算完整配方</p>
                      <p className="text-sm text-gray-600">例如：我用了200g面粉、100g黄油和50g糖</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-800 shadow-md'
                }`}
              >
                {msg.content && (
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap m-0">{msg.content}</p>
                  </div>
                )}

                {msg.toolInvocations?.map((toolInvocation) => {
                  const toolCallId = toolInvocation.toolCallId;

                  if (toolInvocation.state === 'call') {
                    return (
                      <div key={toolCallId} className="mt-2 text-sm text-gray-500 italic">
                        🔍 正在{toolInvocation.toolName === 'search_nutrition' ? '搜索' : '计算'}营养数据...
                      </div>
                    );
                  }

                  if (toolInvocation.state === 'result') {
                    const result = toolInvocation.result;

                    if (!result) return null;

                    // ✅ 提前转换所有值为字符串/数字
                    const isSearchSuccess = result.success && result.nutritionPer100g;
                    const isCalcSuccess = result.success && result.nutrition;

                    if (toolInvocation.toolName === 'search_nutrition' && isSearchSuccess) {
                      const nutritionData = result.nutritionPer100g as Record<string, unknown>;
                      const foodName = safeString(result.food);
                      const calories = safeNumber(nutritionData.calories);
                      const protein = safeNumber(nutritionData.protein);
                      const fat = safeNumber(nutritionData.fat);
                      const carbs = safeNumber(nutritionData.carbs);

                      return (
                        <div key={toolCallId} className="mt-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">✅</span>
                            <span className="font-semibold text-green-800">找到营养数据</span>
                          </div>
                          <p className="text-sm font-medium text-gray-800 mb-2">{foodName}</p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-white p-2 rounded">
                              <span className="text-gray-600">热量</span>
                              <p className="font-bold text-orange-600">{calories} kcal</p>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <span className="text-gray-600">蛋白质</span>
                              <p className="font-bold text-blue-600">{protein}g</p>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <span className="text-gray-600">脂肪</span>
                              <p className="font-bold text-yellow-600">{fat}g</p>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <span className="text-gray-600">碳水</span>
                              <p className="font-bold text-purple-600">{carbs}g</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">每100克的数据</p>
                        </div>
                      );
                    }

                    if (toolInvocation.toolName === 'calculate_nutrition' && isCalcSuccess) {
                      const nutrition = result.nutrition as Record<string, unknown>;
                      const foodName = safeString(result.food);
                      const amount = safeNumber(result.amount);
                      const calories = safeNumber(nutrition.calories);
                      const protein = safeNumber(nutrition.protein);
                      const fat = safeNumber(nutrition.fat);
                      const carbs = safeNumber(nutrition.carbs);

                      return (
                        <div key={toolCallId} className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🧮</span>
                            <span className="font-semibold text-blue-800">营养成分计算</span>
                          </div>
                          <p className="text-sm mb-3">
                            <span className="font-medium">{foodName}</span>
                            <span className="text-gray-600"> · {amount}克</span>
                          </p>
                          <div className="bg-white rounded-lg p-3">
                            <div className="flex items-baseline gap-2 mb-3">
                              <span className="text-3xl font-bold text-orange-600">{calories}</span>
                              <span className="text-gray-600">千卡</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-gray-600">蛋白质</span>
                                <p className="font-bold text-blue-600">{protein}g</p>
                              </div>
                              <div>
                                <span className="text-gray-600">脂肪</span>
                                <p className="font-bold text-yellow-600">{fat}g</p>
                              </div>
                              <div>
                                <span className="text-gray-600">碳水</span>
                                <p className="font-bold text-purple-600">{carbs}g</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (!result.success) {
                      const errorMsg = safeString(result.error, '未知错误');
                      const suggestionMsg = result.suggestion ? safeString(result.suggestion) : null;

                      return (
                        <div key={toolCallId} className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                          <p className="text-red-800">⚠️ {errorMsg}</p>
                          {suggestionMsg && (
                            <p className="text-red-600 mt-1">💡 {suggestionMsg}</p>
                          )}
                        </div>
                      );
                    }
                  }

                  return null;
                })}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-6 py-4 shadow-md border border-gray-100">
                <div className="flex items-center gap-4">
                  {/* 三个跳动的点 */}
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-orange-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="例如：100克鸡蛋有多少卡路里？"
              className="flex-1 p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-8 py-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
            >
              {isLoading ? '...' : '发送'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}