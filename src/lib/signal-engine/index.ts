export { scoreAsset, explainScore, MIN_CANDLES, TREND_THRESHOLDS } from "./scorer";
export type { ScoreResult, SignalVerdict, ExplanationPoint } from "./scorer";

export { scoreWithProfile, buildContext } from "./engine";
export type { ScoreOutcome } from "./engine";

export {
  PROFILES,
  DEFAULT_PROFILE_ID,
  classicProfile,
  profileById,
  profilesForStyle,
} from "./profiles";
export type {
  ScoringProfile,
  ProfileScoreResult,
  ComponentResult,
  GateResult,
  OverlaySeries,
  IndicatorContext,
  EvidenceTier,
} from "./profiles";

export { checkAvailability } from "./availability";

import type { SignalDetail } from "@/types";
import type { ProfileScoreResult } from "./profiles";

// One shared mapping from an engine result to the popover payload, so the
// live and mock providers can't drift apart.
export function toSignalDetail(r: ProfileScoreResult): SignalDetail {
  return {
    profileId: r.profileId,
    profileName: r.profileName,
    components: r.components.map((c) => ({
      name: c.name,
      points: c.points,
      maxPoints: c.maxPoints,
      hint: c.hint,
    })),
  };
}
