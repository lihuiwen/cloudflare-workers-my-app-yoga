/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// 导入 Yoga GraphQL 服务器所需的核心函数
// createSchema: 用于创建 GraphQL schema
// createYoga: 用于创建 Yoga GraphQL 服务器实例
import { createSchema, createYoga } from "graphql-yoga";

/**
 * 创建 Yoga GraphQL 服务器实例
 * 这里使用泛型 <Env> 确保 Yoga 可以访问 Cloudflare Workers 的环境变量
 */
const yoga = createYoga<Env>({
    // 创建 GraphQL schema，包含类型定义和解析器
    schema: createSchema({
        typeDefs: /* GraphQL */ `
	  # DeepSeek 聊天消息类型
      type ChatMessage {
        role: String!
        content: String!
      }
      # DeepSeek API 响应类型
      type ChatCompletion {
        id: String
        object: String
        created: Int
        model: String
        choices: [Choice]
        usage: Usage
      }
      # DeepSeek API 响应的选择部分
      type Choice {
        index: Int
        message: ChatMessage
        finish_reason: String
      }

      # DeepSeek API 的使用统计
      type Usage {
        prompt_tokens: Int
        completion_tokens: Int
        total_tokens: Int
      }

      # 输入类型：聊天消息
      input ChatMessageInput {
        role: String!
        content: String!
      }

      # 输入类型：聊天完成请求
      input ChatCompletionInput {
        model: String!
        messages: [ChatMessageInput!]!
        temperature: Float
        top_p: Float
        max_tokens: Int
        stream: Boolean
      }
      # 查询类型
      type Query {
        # 简单的健康检查查询
        health: String!
      }

      # 变更类型
      type Mutation {
        # 创建聊天完成
        createChatCompletion(input: ChatCompletionInput!): ChatCompletion
      }
		  `,
        // 定义解析器，实现上面定义的查询逻辑
        resolvers: {
            Query: {
                // 简单的健康检查
                health: () => "DeepSeek GraphQL API 正常运行",
            },
            Mutation: {
                // 创建聊天完成的解析器
                createChatCompletion: async (_, { input }) => {
                    const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
                    const apiKey = 'sk-c28ffd16a85448e6808d05fcb027883d'; // 在生产环境中应使用环境变量

                    try {
                        // 调用 DeepSeek API
                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${apiKey}`
                            },
                            body: JSON.stringify(input)
                        });

                        // 如果响应不成功，抛出错误
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`DeepSeek API 错误: ${response.status} - ${errorText}`);
                        }

                        // 解析并返回响应
                        const result = await response.json();
                        return result;
                    } catch (error) {
                        console.error("调用 DeepSeek API 时出错:", error);
                        throw error;
                    }
                }
            }
        },
    }),
    graphiql: {
        defaultQuery: /* GraphQL */ `
		mutation SampleChatQuery {
            createChatCompletion(
            input: {
                model: "deepseek-chat"
                messages: [
                { role: "user", content: "你好，请简单介绍一下你自己" }
                ]
                temperature: 0.7
                max_tokens: 500
            }
            ) {
            id
            choices {
                message {
                role
                content
                }
                finish_reason
            }
            usage {
                prompt_tokens
                completion_tokens
                total_tokens
            }
            }
        }
	  `,
    },
    // 配置 CORS
    cors: {
        origin: '*',
        methods: ['POST', 'GET', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }
});

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        return yoga.fetch(request, env);
    },
};
