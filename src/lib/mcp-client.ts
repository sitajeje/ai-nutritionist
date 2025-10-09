import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

interface ToolResult {
    content: Array<{
        type: string;
        text: string;
    }>;
}
// ✅ 添加超时工具函数
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
        ),
    ]);
}
export class MCPNutritionClient {
    private client: Client | null = null;
    private transport: StdioClientTransport | null = null;

    async connect() {
        if (this.client) {
        return; // 已经连接
        }

        const serverPath = process.env.MCP_NUTRITION_SERVER_PATH;
        
        if (!serverPath) {
        throw new Error('MCP_NUTRITION_SERVER_PATH not configured');
        }

        // 启动 MCP Server 进程
        const serverProcess = spawn('node', [serverPath], {
        env: {
            ...process.env,
            USDA_API_KEY: process.env.USDA_API_KEY,
        },
        });

        // 创建传输层
        this.transport = new StdioClientTransport({
            command: 'node',
            args: [serverPath],
            env: {
                USDA_API_KEY: process.env.USDA_API_KEY || '',
            },
        });

        // 创建客户端
        this.client = new Client(
        {
            name: 'nutrition-client',
            version: '1.0.0',
        },
        {
            capabilities: {},
        }
        );

        // 连接到 MCP Server
        await this.client.connect(this.transport);

        console.log('✅ MCP Client connected to Nutrition Server');
    }

    async searchNutrition(foodName: string) {
        if (!this.client) {
        await this.connect();
        }

        const result = (await this.client!.callTool({
            name: 'search_nutrition',
            arguments: {
                food_name: foodName,
            },
        })) as ToolResult;

        // 解析返回的 JSON
        const text = result.content[0]?.text || '{}';
        return JSON.parse(text);
    }

    async calculateNutrition(fdcId: number, amount: number) {
        if (!this.client) {
            await this.connect();
        }

        const result = (await this.client!.callTool({
        name: 'calculate_nutrition',
        arguments: {
            fdcId,
            amount,
        },
        })) as ToolResult;

        const text = result.content[0]?.text || '{}';
        return JSON.parse(text);
    }

    async disconnect() {
        if (this.client) {
        await this.client.close();
        this.client = null;
        this.transport = null;
        }
    }
}

// 单例模式
let mcpClient: MCPNutritionClient | null = null;

export function getMCPClient(): MCPNutritionClient {
    if (!mcpClient) {
        mcpClient = new MCPNutritionClient();
    }
    return mcpClient;
}