import {
  ScenarioDefinition,
  SimulationEvent,
  TrainingScore,
  TargetAssessment,
  ScoreBreakdown
} from '../../types';

export const CURRENT_SCORING_VERSION = 'v1.0.0';

export function evaluateSession(
  scenario: ScenarioDefinition,
  events: SimulationEvent[],
  sessionId: string,
  scoringVersion = CURRENT_SCORING_VERSION
): TrainingScore {
  const targetCount = scenario.targets.length;
  if (targetCount === 0) {
    return {
      id: `score-${sessionId}`,
      sessionId,
      scoringVersion,
      totalScore: 0,
      passed: false,
      rating: 'NEEDS_REMEDIATION',
      breakdown: {
        detectionLatencyScore: 0,
        classificationAccuracyScore: 0,
        trackingCoverageScore: 0,
        falseAlarmPenalty: 0
      },
      targetAssessments: [],
      feedbackNotes: ['No targets present in scenario configuration.'],
      calculatedAt: Date.now()
    };
  }

  // Weight distributions
  const MAX_ACCURACY_POINTS = 50;
  const MAX_LATENCY_POINTS = 30;
  const MAX_TRACKING_POINTS = 20;

  const pointsPerTargetAccuracy = MAX_ACCURACY_POINTS / targetCount;
  const pointsPerTargetLatency = MAX_LATENCY_POINTS / targetCount;
  const pointsPerTargetTracking = MAX_TRACKING_POINTS / targetCount;

  // Group events by targetId
  const classificationsByTarget = new Map<string, SimulationEvent>();
  const locksByTarget = new Map<string, SimulationEvent[]>();
  let falseAlarmCount = 0;

  for (const ev of events) {
    if (ev.eventType === 'CLASSIFICATION_SUBMITTED') {
      const targetId = ev.payload.targetId;
      if (targetId && scenario.targets.some((t) => t.id === targetId)) {
        // Record earliest or latest classification
        if (!classificationsByTarget.has(targetId)) {
          classificationsByTarget.set(targetId, ev);
        }
      } else {
        // False positive / blind guess
        falseAlarmCount++;
      }
    } else if (ev.eventType === 'TARGET_LOCK_ACQUIRED') {
      const targetId = ev.payload.targetId;
      if (targetId) {
        const list = locksByTarget.get(targetId) || [];
        list.push(ev);
        locksByTarget.set(targetId, list);
      }
    }
  }

  let totalAccuracyScore = 0;
  let totalLatencyScore = 0;
  let totalTrackingScore = 0;
  const feedbackNotes: string[] = [];
  const targetAssessments: TargetAssessment[] = [];

  for (const target of scenario.targets) {
    const classificationEvent = classificationsByTarget.get(target.id);
    const targetLifetimeSec = target.despawnTimeSec - target.spawnTimeSec;

    let isCorrect = false;
    let detectionLatencySec: number | null = null;
    let trackingDurationSec = 0;
    let targetScoreContrib = 0;

    if (classificationEvent) {
      const simTimeSec = classificationEvent.simulationTimeMs / 1000;
      detectionLatencySec = Math.max(0, simTimeSec - target.spawnTimeSec);

      const submitted = classificationEvent.payload.submittedClass;
      if (submitted === target.threatClass) {
        isCorrect = true;
        totalAccuracyScore += pointsPerTargetAccuracy;
        targetScoreContrib += pointsPerTargetAccuracy;
      }

      // Latency calculation: linear drop from 0s (100%) to maxAllowedLatency (0%)
      // Max allowed latency before target is considered late: 20 seconds
      const maxAllowedLatency = Math.min(20, targetLifetimeSec * 0.8);
      const latencyRatio = Math.max(0, 1 - detectionLatencySec / maxAllowedLatency);
      const latencyPts = pointsPerTargetLatency * latencyRatio;
      totalLatencyScore += latencyPts;
      targetScoreContrib += latencyPts;

      // Estimate tracking coverage from lock events
      const locks = locksByTarget.get(target.id) || [];
      trackingDurationSec = Math.min(targetLifetimeSec, locks.length * 0.5 + 2.0);
      const trackingRatio = Math.min(1.0, trackingDurationSec / Math.max(5, targetLifetimeSec * 0.5));
      const trackingPts = pointsPerTargetTracking * trackingRatio;
      totalTrackingScore += trackingPts;
      targetScoreContrib += trackingPts;

      if (isCorrect) {
        feedbackNotes.push(
          `Acquired and verified ${target.callsign} (${target.threatClass}) in ${detectionLatencySec.toFixed(1)}s (+${targetScoreContrib.toFixed(1)} pts).`
        );
      } else {
        feedbackNotes.push(
          `Misclassified ${target.callsign}: reported as "${submitted}" but ground truth was "${target.threatClass}".`
        );
      }
    } else {
      // Missed contact entirely
      feedbackNotes.push(
        `Missed contact ${target.callsign} (${target.threatClass}): target exited airspace without classification.`
      );
    }

    targetAssessments.push({
      targetId: target.id,
      callsign: target.callsign,
      expectedClass: target.threatClass,
      classifiedAs: classificationEvent?.payload.submittedClass,
      isCorrect,
      detectionLatencySec,
      trackingDurationSec,
      scoreContribution: Math.round(targetScoreContrib * 10) / 10
    });
  }

  const falseAlarmPenalty = falseAlarmCount * 10;
  if (falseAlarmCount > 0) {
    feedbackNotes.push(
      `Deduction: ${falseAlarmCount} unverified / false alarm classification trigger(s) (-${falseAlarmPenalty} pts).`
    );
  }

  const rawTotal = totalAccuracyScore + totalLatencyScore + totalTrackingScore - falseAlarmPenalty;
  const totalScore = Math.max(0, Math.min(100, Math.round(rawTotal * 10) / 10));

  const passed = totalScore >= 70;
  let rating: 'EXEMPLARY' | 'QUALIFIED' | 'NEEDS_REMEDIATION' = 'NEEDS_REMEDIATION';
  if (totalScore >= 88) {
    rating = 'EXEMPLARY';
  } else if (totalScore >= 70) {
    rating = 'QUALIFIED';
  }

  const breakdown: ScoreBreakdown = {
    detectionLatencyScore: Math.round(totalLatencyScore * 10) / 10,
    classificationAccuracyScore: Math.round(totalAccuracyScore * 10) / 10,
    trackingCoverageScore: Math.round(totalTrackingScore * 10) / 10,
    falseAlarmPenalty
  };

  return {
    id: `score-${sessionId}`,
    sessionId,
    scoringVersion,
    totalScore,
    passed,
    rating,
    breakdown,
    targetAssessments,
    feedbackNotes,
    calculatedAt: Date.now()
  };
}
