
import { AssetType, TargetStrategy, SettlementConfig } from './types';

// The "Smart Money" Strategy
export const DEFAULT_STRATEGY: TargetStrategy = {
  allocations: {
    [AssetType.QUANT_FUND]: 50,
    [AssetType.GOLD]: 20,
    [AssetType.BOND]: 15,
    [AssetType.NASDAQ]: 10, 
    [AssetType.BITCOIN]: 0,
    [AssetType.CASH]: 5, 
  },
  maxDeviation: 15, // If an asset drifts > 15% from its target weight (relative), trigger RED.
};

export const DEFAULT_SETTLEMENT_CONFIG: SettlementConfig = {
  profitThreshold1: 3,
  profitThreshold2: 5,
  sharingRate1: 20,
  sharingRate2: 50,
  guaranteeThreshold: 3,
};

export const INITIAL_ASSETS: any[] = [];

// Colors for Charts
export const ASSET_COLORS: Record<AssetType, string> = {
  [AssetType.GOLD]: '#EAB308', // Yellow-500
  [AssetType.QUANT_FUND]: '#3B82F6', // Blue-500
  [AssetType.BOND]: '#64748B', // Slate-500
  [AssetType.NASDAQ]: '#8B5CF6', // Violet-500
  [AssetType.BITCOIN]: '#F97316', // Orange-500
  [AssetType.CASH]: '#10B981', // Emerald-500
};
