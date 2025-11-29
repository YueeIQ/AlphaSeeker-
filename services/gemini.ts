import { GoogleGenAI } from "@google/genai";
import { Asset, PortfolioSummary, TargetStrategy, AssetType } from '../types';

const getClient = () => {
  // Use process.env.API_KEY as per Google GenAI SDK guidelines
  const apiKey = process.env.API_KEY;
  
  // 强制校验逻辑
  if (!apiKey) {
    console.error("API_KEY not found in process.env");
    throw new Error("API_KEY not found, please check your environment settings.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateStrategyReport = async (
  portfolio: PortfolioSummary,
  assets: Asset[],
  strategy: TargetStrategy
): Promise<string> => {
  try {
    const ai = getClient();
    
    // Construct the context for Gemini
    const holdingsDetail = assets.map(a => ({
       code: a.code,
       name: a.name, 
       type: a.type, 
       market_value: (a.quantity * a.currentPrice).toFixed(2),
       pnl_percent: a.costBasis > 0 ? (((a.currentPrice - a.costBasis) / a.costBasis) * 100).toFixed(2) + '%' : '0%'
    }));

    const context = {
      objective: "目标年化15%。对冲通胀和美债危机。",
      current_portfolio: {
        total_value: portfolio.totalValue,
        cash_balance: portfolio.cashBalance,
        allocation_breakdown: portfolio.allocation,
        top_holdings: holdingsDetail
      },
      target_strategy: strategy.allocations,
      market_thesis: "做多黄金/比特币/人民币核心资产以对冲美元风险。做多纳斯达克科技龙头。配置量化基金获取Alpha。",
    };

    const prompt = `
      你是一位世界顶级的资深投资策略师（聪明钱视角）。
      
      请审阅以下投资组合的JSON数据：
      \`\`\`json
      ${JSON.stringify(context, null, 2)}
      \`\`\`

      请分析当前组合与目标策略的偏离度。
      请用 **中文** 输出一份简洁的Markdown报告，包含以下内容：
      1. **健康度检查**: 组合是否符合“抗通胀+科技成长”的核心逻辑？(请单独点评占比最大的具体基金或股票)
      2. **持仓明细诊断**: 针对\`top_holdings\`中的具体标的，如果有显著亏损或盈利，简要点评操作（止盈/止损/加仓）。
      3. **偏离预警**: 哪些大类资产严重超配或低配？
      4. **操作建议**: 具体的买入/卖出/再平衡建议（Rebalancing）。特别是现金仓位是否合适。

      保持专业、直接、可操作。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "无法生成分析报告。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    // 这里的错误信息会直接显示在前端，方便你调试
    return `生成策略报告时出错: ${error instanceof Error ? error.message : String(error)}`;
  }
};