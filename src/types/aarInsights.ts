import {
  DroneThreatClass,
  ScoreBreakdown
} from './index';

export interface ArchetypeMetric {
  archetype: DroneThreatClass;
  presented: number;
  correct: number;
  misclassified: number;
  accuracyPercentage: number | null;
}

export type TrendDirection = 'improving' | 'declining' | 'stable' | 'insufficient_history';

export interface HistoricalTrendMetric {
  hasBaseline: boolean;
  priorSessionCount: number;
  scoreDelta: number | null;
  accuracyDelta: number | null;
  latencyDeltaSec: number | null;
  trendDirection: TrendDirection;
}

export interface DeterministicMetrics {
  totalTargets: number;
  totalAttempts: number;
  correctClassifications: number;
  incorrectClassifications: number;
  unattemptedTargets: number;
  accuracyPercentage: number | null;
  targetCoveragePercentage: number;
  averageLatencySec: number | null;
  minLatencySec: number | null;
  maxLatencySec: number | null;
  falseAlarmCount: number;
  archetypeBreakdown: Record<DroneThreatClass, ArchetypeMetric>;
  historicalTrend: HistoricalTrendMetric;
}

export interface MetricEvidence {
  label: string;
  value: string | number;
  detail?: string;
}

export interface InsightFinding {
  id: string;
  category: 'accuracy' | 'speed' | 'trigger_discipline' | 'coverage' | 'threat_recognition';
  title: string;
  detail: string;
  evidence: MetricEvidence[];
}

export interface PracticeRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  targetArchetype?: DroneThreatClass;
  suggestedScenarioCodename?: string;
  actionPlan: string;
  rationale: string;
}

export interface DeterministicInsights {
  version: string;
  analyzedAt: number;
  metrics: DeterministicMetrics;
  strengths: InsightFinding[];
  areasToImprove: InsightFinding[];
  recommendations: PracticeRecommendation[];
  dataLimitations: string[];
}

export interface AiExplanation {
  performanceSummary: string;
  whatWentWell: string[];
  areasToImprove: string[];
  recommendedPractice: string[];
  dataLimitations: string[];
  providerName: string;
  isAiGenerated: boolean;
  generatedAt: number;
}

export interface AuthoritativeScoreSnapshot {
  totalScore: number;
  passed: boolean;
  rating: 'EXEMPLARY' | 'QUALIFIED' | 'NEEDS_REMEDIATION';
  breakdown: ScoreBreakdown;
  scoringVersion: string;
}

export interface AarInsightReport {
  sessionId: string;
  scenarioId: string;
  scenarioName: string;
  analyzedAt: number;
  engineVersion: string;
  authoritativeScore: AuthoritativeScoreSnapshot;
  deterministicInsights: DeterministicInsights;
  explanation: AiExplanation;
}

export interface SessionSummaryContext {
  sessionId: string;
  scenarioName: string;
  difficulty: string;
  durationSeconds: number;
  totalScore: number;
  rating: string;
  scoringVersion: string;
}

export interface InsightThresholdConfig {
  rapidLatencyThresholdSec: number;
  sluggishLatencyThresholdSec: number;
  targetLifetimeWarningRatio: number;
  minAttemptsForAccuracyRatio: number;
}

export const DEFAULT_INSIGHT_THRESHOLDS: InsightThresholdConfig = {
  rapidLatencyThresholdSec: 4.0,
  sluggishLatencyThresholdSec: 10.0,
  targetLifetimeWarningRatio: 0.75,
  minAttemptsForAccuracyRatio: 1
};
