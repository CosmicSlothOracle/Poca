import { SimulationResult } from './aiTestRunner';
import { GameLogEntry } from './gameLogger';

// AI Performance Metrics
export interface AIPerformanceMetrics {
  // Basic stats
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  averageGameLength: number;
  averageRoundsPerGame: number;

  // Strategic metrics
  aggressionRatio: number; // Cards played vs passes
  efficiency: number; // Cards per AP
  interventionSuccessRate: number;
  abilityUsageRate: number;

  // Mechanic usage patterns
  preferredMechanics: string[];
  mechanicDiversity: number;
  mostUsedMechanic: string;
  leastUsedMechanic: string;

  // Timing metrics
  earlyGameActivity: number; // Activity in first 25% of game
  midGameActivity: number; // Activity in middle 50% of game
  lateGameActivity: number; // Activity in last 25% of game

  // Decision quality metrics
  averagePriorityScore: number; // Average priority of chosen actions
  optimalChoiceRate: number; // How often the AI chose the highest priority option
  reactionTimeScore: number; // How quickly AI responds to opponent actions
}

// AI Strategy Analysis
export interface AIStrategyAnalysis {
  strengths: string[];
  weaknesses: string[];
  tendencies: string[];
  improvementAreas: string[];
  matchupPerformance: Record<string, number>; // Win rate vs different opponents
}

// Comprehensive AI Evaluation Report
export interface AIEvaluationReport {
  aiIdentifier: string;
  metrics: AIPerformanceMetrics;
  strategyAnalysis: AIStrategyAnalysis;
  recommendations: string[];
  performanceScore: number; // 0-100 score
  comparisonData?: {
    vsBaseline: number; // Performance vs baseline AI
    vsOptimal: number; // Performance vs theoretical optimal
    consistency: number; // How consistent the AI performs
  };
}

// AI Evaluator Class
export class AIEvaluator {
  private baselineWinRate: number = 0.5; // 50% baseline
  private optimalWinRate: number = 0.85; // 85% optimal target

  evaluateAI(
    aiIdentifier: string,
    results: SimulationResult[],
    opponentIdentifier?: string
  ): AIEvaluationReport {
    const metrics = this.calculateMetrics(results);
    const strategyAnalysis = this.analyzeStrategy(results);
    const recommendations = this.generateRecommendations(metrics, strategyAnalysis);
    const performanceScore = this.calculatePerformanceScore(metrics);

    const comparisonData = opponentIdentifier ? undefined : {
      vsBaseline: (metrics.winRate - this.baselineWinRate) / this.baselineWinRate * 100,
      vsOptimal: (metrics.winRate / this.optimalWinRate) * 100,
      consistency: this.calculateConsistency(results)
    };

    return {
      aiIdentifier,
      metrics,
      strategyAnalysis,
      recommendations,
      performanceScore,
      comparisonData
    };
  }

  private calculateMetrics(results: SimulationResult[]): AIPerformanceMetrics {
    const gamesPlayed = results.length;
    const wins = results.filter(r => r.winner === 1).length; // Assuming AI is player 1
    const losses = results.filter(r => r.winner === 2).length;
    const draws = results.filter(r => r.winner === 'draw').length;
    const winRate = wins / gamesPlayed;

    const averageGameLength = results.reduce((sum, r) => sum + r.totalTurns, 0) / gamesPlayed;
    const averageRoundsPerGame = results.reduce((sum, r) => sum + r.roundsPlayed, 0) / gamesPlayed;

    // Calculate strategic metrics
    const totalCardPlays = results.reduce((sum, r) =>
      sum + r.moveHistory.filter(m => m.action.type === 'card_play').length, 0);
    const totalPasses = results.reduce((sum, r) =>
      sum + r.moveHistory.filter(m => m.action.type === 'pass').length, 0);
    const aggressionRatio = totalCardPlays / (totalCardPlays + totalPasses);

    const totalAPUsed = results.reduce((sum, r) =>
      sum + r.moveHistory.filter(m => m.details.apCost !== undefined).length, 0);
    const efficiency = totalAPUsed > 0 ? totalCardPlays / totalAPUsed : 0;

    const interventionTriggers = results.reduce((sum, r) =>
      sum + (r.mechanicsUsed['intervention_triggered']?.count || 0), 0);
    const interventionSuccessRate = interventionTriggers / gamesPlayed;

    const abilityUses = results.reduce((sum, r) =>
      sum + (r.mechanicsUsed['ability_used']?.count || 0), 0);
    const abilityUsageRate = abilityUses / gamesPlayed;

    // Mechanic usage patterns
    const allMechanics = this.aggregateMechanics(results);
    const preferredMechanics = Object.entries(allMechanics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([mechanic, count]) => mechanic);

    const mechanicDiversity = Object.keys(allMechanics).length;
    const mostUsedMechanic = Object.entries(allMechanics)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';
    const leastUsedMechanic = Object.entries(allMechanics)
      .sort((a, b) => a[1] - b[1])[0]?.[0] || 'none';

    // Timing metrics
    const timingData = this.analyzeTiming(results);
    const { earlyGameActivity, midGameActivity, lateGameActivity } = timingData;

    // Decision quality metrics (simplified)
    const averagePriorityScore = 75; // Placeholder - would need actual priority tracking
    const optimalChoiceRate = 0.8; // Placeholder - would need priority comparison
    const reactionTimeScore = 0.7; // Placeholder - would need timing analysis

    return {
      gamesPlayed,
      wins,
      losses,
      draws,
      winRate,
      averageGameLength,
      averageRoundsPerGame,
      aggressionRatio,
      efficiency,
      interventionSuccessRate,
      abilityUsageRate,
      preferredMechanics,
      mechanicDiversity,
      mostUsedMechanic,
      leastUsedMechanic,
      earlyGameActivity,
      midGameActivity,
      lateGameActivity,
      averagePriorityScore,
      optimalChoiceRate,
      reactionTimeScore
    };
  }

  private analyzeStrategy(results: SimulationResult[]): AIStrategyAnalysis {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const tendencies: string[] = [];
    const improvementAreas: string[] = [];
    const matchupPerformance: Record<string, number> = {};

    // Analyze mechanic usage for tendencies
    const allMechanics = this.aggregateMechanics(results);

    // Check for specific strategic patterns
    if (allMechanics['intervention_placed'] > allMechanics['card_played'] * 0.5) {
      tendencies.push('Heavy intervention focus');
      improvementAreas.push('Balance card playing with intervention setting');
    }

    if (allMechanics['ability_used'] > allMechanics['card_played'] * 0.3) {
      tendencies.push('Frequent ability usage');
      strengths.push('Good ability utilization');
    }

    if (allMechanics['government_card_played'] > allMechanics['public_card_played'] * 2) {
      tendencies.push('Government-focused strategy');
      improvementAreas.push('Consider more public card utilization');
    }

    // Check for timing patterns
    const timingData = this.analyzeTiming(results);
    if (timingData.earlyGameActivity > 0.6) {
      tendencies.push('Aggressive early game');
      strengths.push('Strong opening pressure');
    } else if (timingData.earlyGameActivity < 0.3) {
      tendencies.push('Conservative early game');
      improvementAreas.push('Consider more aggressive openings');
    }

    // Check for efficiency patterns
    const avgEfficiency = results.reduce((sum, r) => sum + r.efficiency.cardsPerAP, 0) / results.length;
    if (avgEfficiency > 0.8) {
      strengths.push('High AP efficiency');
    } else {
      improvementAreas.push('Improve AP utilization');
    }

    // Check intervention success
    const avgInterventionRate = results.reduce((sum, r) => sum + r.efficiency.interventionsSuccessRate, 0) / results.length;
    if (avgInterventionRate > 0.3) {
      strengths.push('Effective intervention usage');
    } else {
      weaknesses.push('Low intervention success rate');
      improvementAreas.push('Improve intervention targeting');
    }

    return {
      strengths,
      weaknesses,
      tendencies,
      improvementAreas,
      matchupPerformance
    };
  }

  private generateRecommendations(metrics: AIPerformanceMetrics, analysis: AIStrategyAnalysis): string[] {
    const recommendations: string[] = [];

    // Win rate recommendations
    if (metrics.winRate < 0.4) {
      recommendations.push('Focus on improving overall win rate through better decision making');
    } else if (metrics.winRate > 0.7) {
      recommendations.push('Maintain current strategy while looking for minor optimizations');
    }

    // Efficiency recommendations
    if (metrics.efficiency < 0.6) {
      recommendations.push('Improve AP efficiency by making more impactful plays');
    }

    // Mechanic diversity recommendations
    if (metrics.mechanicDiversity < 5) {
      recommendations.push('Increase mechanic diversity to adapt to different situations');
    }

    // Timing recommendations
    if (metrics.earlyGameActivity < 0.3) {
      recommendations.push('Consider more aggressive early game plays to set the pace');
    } else if (metrics.earlyGameActivity > 0.7) {
      recommendations.push('Balance early aggression with sustainable mid-game strategy');
    }

    // Intervention recommendations
    if (metrics.interventionSuccessRate < 0.2) {
      recommendations.push('Improve intervention targeting and timing');
    }

    // Add strategy-specific recommendations
    analysis.improvementAreas.forEach(area => {
      recommendations.push(area);
    });

    return recommendations;
  }

  private calculatePerformanceScore(metrics: AIPerformanceMetrics): number {
    let score = 0;

    // Win rate (40% weight)
    score += metrics.winRate * 100 * 0.4;

    // Efficiency (20% weight)
    score += Math.min(metrics.efficiency * 100, 100) * 0.2;

    // Mechanic diversity (10% weight)
    score += Math.min(metrics.mechanicDiversity * 10, 100) * 0.1;

    // Intervention success (15% weight)
    score += Math.min(metrics.interventionSuccessRate * 100 * 3.33, 100) * 0.15;

    // Ability usage (15% weight)
    score += Math.min(metrics.abilityUsageRate * 100, 100) * 0.15;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  private calculateConsistency(results: SimulationResult[]): number {
    const winRates = results.map(r => r.winner === 1 ? 1 : 0);
    const mean = winRates.reduce((sum: number, rate: number) => sum + rate, 0) / winRates.length;
    const variance = winRates.reduce((sum: number, rate: number) => sum + Math.pow(rate - mean, 2), 0) / winRates.length;
    const stdDev = Math.sqrt(variance);

    // Convert to consistency score (lower std dev = higher consistency)
    return Math.max(0, 100 - (stdDev * 100));
  }

  private aggregateMechanics(results: SimulationResult[]): Record<string, number> {
    const allMechanics: Record<string, number> = {};

    results.forEach(result => {
      Object.entries(result.mechanicsUsed).forEach(([mechanic, usage]) => {
        allMechanics[mechanic] = (allMechanics[mechanic] || 0) + (usage.count || 0);
      });
    });

    return allMechanics;
  }

  private analyzeTiming(results: SimulationResult[]) {
    let earlyGameActions = 0;
    let midGameActions = 0;
    let lateGameActions = 0;
    let totalActions = 0;

    results.forEach(result => {
      const gameLength = result.totalTurns;
      const earlyThreshold = Math.floor(gameLength * 0.25);
      const lateThreshold = Math.floor(gameLength * 0.75);

      result.moveHistory.forEach(move => {
        totalActions++;
        if (move.turn <= earlyThreshold) {
          earlyGameActions++;
        } else if (move.turn <= lateThreshold) {
          midGameActions++;
        } else {
          lateGameActions++;
        }
      });
    });

    return {
      earlyGameActivity: totalActions > 0 ? earlyGameActions / totalActions : 0,
      midGameActivity: totalActions > 0 ? midGameActions / totalActions : 0,
      lateGameActivity: totalActions > 0 ? lateGameActions / totalActions : 0
    };
  }

  // Compare two AI evaluations
  compareAIs(ai1Report: AIEvaluationReport, ai2Report: AIEvaluationReport) {
    console.log('\n🤖 AI COMPARISON REPORT');
    console.log('=' .repeat(50));
    console.log(`${ai1Report.aiIdentifier} vs ${ai2Report.aiIdentifier}`);

    const metrics = ['winRate', 'efficiency', 'interventionSuccessRate', 'mechanicDiversity'] as const;

    metrics.forEach(metric => {
      const val1 = ai1Report.metrics[metric];
      const val2 = ai2Report.metrics[metric];
      const winner = val1 > val2 ? ai1Report.aiIdentifier : ai2Report.aiIdentifier;
      const diff = Math.abs(val1 - val2);

      console.log(`${metric}: ${val1.toFixed(3)} vs ${val2.toFixed(3)} (${winner} leads by ${diff.toFixed(3)})`);
    });

    console.log(`\nOverall Performance Score: ${ai1Report.performanceScore} vs ${ai2Report.performanceScore}`);

    // Strengths comparison
    console.log(`\n${ai1Report.aiIdentifier} Strengths:`);
    ai1Report.strategyAnalysis.strengths.forEach(strength => console.log(`  ✓ ${strength}`));

    console.log(`\n${ai2Report.aiIdentifier} Strengths:`);
    ai2Report.strategyAnalysis.strengths.forEach(strength => console.log(`  ✓ ${strength}`));
  }
}

// Utility functions for AI evaluation
export function generateAIPerformanceReport(
  aiName: string,
  results: SimulationResult[],
  opponentName?: string
): void {
  const evaluator = new AIEvaluator();
  const report = evaluator.evaluateAI(aiName, results, opponentName);

  console.log('\n📊 AI PERFORMANCE EVALUATION REPORT');
  console.log('=' .repeat(50));
  console.log(`AI: ${report.aiIdentifier}`);
  console.log(`Performance Score: ${report.performanceScore}/100`);
  console.log(`Games Analyzed: ${report.metrics.gamesPlayed}`);

  console.log('\n📈 BASIC METRICS:');
  console.log(`Win Rate: ${(report.metrics.winRate * 100).toFixed(1)}% (${report.metrics.wins}W-${report.metrics.losses}L-${report.metrics.draws}D)`);
  console.log(`Average Game Length: ${report.metrics.averageGameLength.toFixed(1)} turns`);
  console.log(`Average Rounds: ${report.metrics.averageRoundsPerGame.toFixed(1)}`);

  console.log('\n⚙️  STRATEGIC METRICS:');
  console.log(`Aggression Ratio: ${(report.metrics.aggressionRatio * 100).toFixed(1)}%`);
  console.log(`AP Efficiency: ${report.metrics.efficiency.toFixed(2)} cards/AP`);
  console.log(`Intervention Success: ${(report.metrics.interventionSuccessRate * 100).toFixed(1)}%`);
  console.log(`Ability Usage: ${report.metrics.abilityUsageRate.toFixed(1)} per game`);

  console.log('\n🔧 MECHANIC USAGE:');
  console.log(`Mechanic Diversity: ${report.metrics.mechanicDiversity} different mechanics`);
  console.log(`Most Used: ${report.metrics.mostUsedMechanic}`);
  console.log(`Preferred Mechanics: ${report.metrics.preferredMechanics.join(', ')}`);

  console.log('\n⏰ TIMING ANALYSIS:');
  console.log(`Early Game Activity: ${(report.metrics.earlyGameActivity * 100).toFixed(1)}%`);
  console.log(`Mid Game Activity: ${(report.metrics.midGameActivity * 100).toFixed(1)}%`);
  console.log(`Late Game Activity: ${(report.metrics.lateGameActivity * 100).toFixed(1)}%`);

  console.log('\n💪 STRENGTHS:');
  report.strategyAnalysis.strengths.forEach(strength => console.log(`  ✓ ${strength}`));

  console.log('\n⚠️  WEAKNESSES:');
  report.strategyAnalysis.weaknesses.forEach(weakness => console.log(`  ✗ ${weakness}`));

  console.log('\n📝 RECOMMENDATIONS:');
  report.recommendations.forEach((rec, index) => console.log(`  ${index + 1}. ${rec}`));

  if (report.comparisonData) {
    console.log('\n📊 COMPARISON DATA:');
    console.log(`vs Baseline AI: ${report.comparisonData.vsBaseline > 0 ? '+' : ''}${report.comparisonData.vsBaseline.toFixed(1)}%`);
    console.log(`vs Theoretical Optimal: ${report.comparisonData.vsOptimal.toFixed(1)}%`);
    console.log(`Consistency Score: ${report.comparisonData.consistency.toFixed(1)}%`);
  }
}

// Batch evaluation function
export function evaluateMultipleAIs(
  aiResults: Array<{ name: string; results: SimulationResult[] }>
): AIEvaluationReport[] {
  const evaluator = new AIEvaluator();
  const reports: AIEvaluationReport[] = [];

  console.log('\n🏆 MULTI-AI EVALUATION TOURNAMENT');
  console.log('=' .repeat(60));

  aiResults.forEach(({ name, results }) => {
    const report = evaluator.evaluateAI(name, results);
    reports.push(report);

    console.log(`\n🤖 ${name}:`);
    console.log(`   Performance Score: ${report.performanceScore}/100`);
    console.log(`   Win Rate: ${(report.metrics.winRate * 100).toFixed(1)}%`);
    console.log(`   Key Mechanic: ${report.metrics.mostUsedMechanic}`);
    console.log(`   Strengths: ${report.strategyAnalysis.strengths.length}`);
    console.log(`   Areas for Improvement: ${report.strategyAnalysis.improvementAreas.length}`);
  });

  // Rank AIs by performance
  const ranked = reports.sort((a, b) => b.performanceScore - a.performanceScore);

  console.log('\n🏅 FINAL RANKINGS:');
  ranked.forEach((report, index) => {
    console.log(`${index + 1}. ${report.aiIdentifier}: ${report.performanceScore}/100 (${(report.metrics.winRate * 100).toFixed(1)}% win rate)`);
  });

  return reports;
}
