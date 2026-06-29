// Pure risk-calculation logic. No screen code here — so it can be reused
// and trusted independently of how the page looks.

export type TradeDirection = "long" | "short";

export interface TradePlanInput {
  accountSize: number;
  riskPercent: number; // 1 = 1%
  entry: number;
  stopLoss: number;
  target: number; // 0 / NaN means "not set"
  direction: TradeDirection;
}

export interface TradePlanResult {
  canSize: boolean; // can we compute a position size? (needs a valid stop)
  amountAtRisk: number | null;
  riskPerUnit: number | null;
  positionSize: number | null;
  positionValue: number | null;
  potentialLoss: number | null;
  potentialProfit: number | null;
  rewardToRisk: number | null;
  warnings: string[];
}

const isNum = (n: number) => Number.isFinite(n) && n > 0;

export function calculateTradePlan(input: TradePlanInput): TradePlanResult {
  const { accountSize, riskPercent, entry, stopLoss, target, direction } = input;
  const warnings: string[] = [];

  const result: TradePlanResult = {
    canSize: false,
    amountAtRisk: null,
    riskPerUnit: null,
    positionSize: null,
    positionValue: null,
    potentialLoss: null,
    potentialProfit: null,
    rewardToRisk: null,
    warnings,
  };

  // Need the basics before anything can be computed
  if (!isNum(accountSize) || !isNum(riskPercent) || !isNum(entry)) {
    return result;
  }

  // Amount at risk = account size x risk %
  const amountAtRisk = (accountSize * riskPercent) / 100;
  result.amountAtRisk = amountAtRisk;

  if (riskPercent > 2) {
    warnings.push(
      "Risking more than 2% per trade is aggressive. Many traders cap risk at 1–2%.",
    );
  }

  // A stop-loss (invalidation level) is required to size a trade
  if (!isNum(stopLoss)) {
    warnings.push(
      "Every trade needs a stop-loss. Position size can't be calculated without an invalidation level.",
    );
    return result;
  }

  // Risk per unit depends on direction; stop must be on the correct side
  const riskPerUnit =
    direction === "long" ? entry - stopLoss : stopLoss - entry;

  if (riskPerUnit <= 0) {
    warnings.push(
      direction === "long"
        ? "For a long trade, the stop-loss must be below your entry."
        : "For a short trade, the stop-loss must be above your entry.",
    );
    return result;
  }

  // Position size = amount at risk / risk per unit
  const positionSize = amountAtRisk / riskPerUnit;
  const positionValue = positionSize * entry;
  const potentialLoss = amountAtRisk; // by construction

  result.canSize = true;
  result.riskPerUnit = riskPerUnit;
  result.positionSize = positionSize;
  result.positionValue = positionValue;
  result.potentialLoss = potentialLoss;

  if (positionValue > accountSize) {
    warnings.push(
      "This position would cost more than your whole account. Buying it fully needs leverage, which this tool avoids — consider a smaller risk % or a wider stop.",
    );
  }

  // Target is optional; if set, compute profit + reward-to-risk
  if (isNum(target)) {
    const rewardPerUnit =
      direction === "long" ? target - entry : entry - target;

    if (rewardPerUnit <= 0) {
      warnings.push(
        direction === "long"
          ? "For a long trade, the target should be above your entry."
          : "For a short trade, the target should be below your entry.",
      );
    } else {
      result.potentialProfit = rewardPerUnit * positionSize;
      result.rewardToRisk = rewardPerUnit / riskPerUnit;
      if (result.rewardToRisk < 2) {
        warnings.push(
          "Reward-to-risk is below 2:1. The potential reward may not justify the risk.",
        );
      }
    }
  }

  return result;
}
