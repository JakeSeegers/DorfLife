/**
 * FemaleSelection.js
 * 
 * Female mate selection system implementation.
 * Preserves exact behavior from original evaluateMales(), selectPreferredMale(), 
 * scoreMate(), and acceptMating() functions.
 * 
 * Females evaluate nearby males based on personality traits and
 * reproduction strategies, then select preferred mates.
 */

import { REPRODUCTION_EVENTS } from '../events/ReproductionEventBus.js';

export class FemaleSelection {
    constructor(config, world, eventBus) {
        this.config = config;
        this.world = world;
        this.eventBus = eventBus;
        this.femaleConfig = config.FEMALE_SELECTION;
        
        if (!config || !world || !eventBus) {
            throw new Error('FemaleSelection requires config, world, and eventBus dependencies');
        }
    }
    
    /**
     * Execute female mate evaluation behavior
     * Preserves exact logic from original evaluateMales() method
     * 
     * @param {Object} female - Female dwarf evaluating potential mates
     */
    execute(female) {
        if (female.isPregnant) return;
        
        // Find nearby males (exact same logic as original)
        const nearbyMales = this.world.getNearbyMalesForFemale(
            female,
            this.femaleConfig.proximityRadius
        );
        
        if (nearbyMales.length > 0) {
            const preferredMale = this.selectPreferredMale(female, nearbyMales);
            
            // Attempt mating with preferred male (exact same probability as original)
            if (preferredMale && Math.random() < this.femaleConfig.evaluationChance) {
                this.acceptMating(female, preferredMale);
            }
        }
    }
    
    /**
     * Select preferred male from available candidates
     * Preserves exact logic from original selectPreferredMale() method
     * 
     * @param {Object} female - Female dwarf making selection
     * @param {Array} males - Array of nearby male candidates
     * @returns {Object|null} Selected preferred male or null
     */
    selectPreferredMale(female, males) {
        const scores = {};
        
        // Score each male (exact same logic as original)
        const scoredMales = males.map(male => {
            const score = this.scoreMate(female, male);
            scores[male.name] = score;
            return {
                male: male,
                score: score
            };
        });
        
        // Sort by score (highest first) - exact same as original
        scoredMales.sort((a, b) => b.score - a.score);
        
        const selectedMale = scoredMales.length > 0 ? scoredMales[0].male : null;
        
        // Emit evaluation event
        this.eventBus.emit(REPRODUCTION_EVENTS.FEMALE_EVALUATION, {
            female: {
                name: female.name,
                personality: { ...female.personality },
                x: female.x,
                y: female.y
            },
            evaluatedMales: males.map(male => ({
                name: male.name,
                strategy: male.reproductionStrategy,
                score: scores[male.name] || 0
            })),
            selectedMale: selectedMale ? {
                name: selectedMale.name,
                strategy: selectedMale.reproductionStrategy,
                score: scores[selectedMale.name] || 0
            } : null,
            timestamp: Date.now()
        });
        
        return selectedMale;
    }
    
    /**
     * Score a potential mate based on female personality
     * Preserves exact logic from original scoreMate() method
     * 
     * @param {Object} female - Female dwarf doing the scoring
     * @param {Object} male - Male dwarf being scored
     * @returns {number} Compatibility score
     */
    scoreMate(female, male) {
        let score = this.femaleConfig.baseScore;
        
        // High agreeableness preferences (exact same thresholds as original)
        if (female.personality.agreeableness > this.femaleConfig.agreeableness.threshold) {
            if (male.reproductionStrategy === 'blue') {
                score += this.femaleConfig.agreeableness.blueBonus;
            }
            if (male.reproductionStrategy === 'orange') {
                score += this.femaleConfig.agreeableness.orangePenalty;
            }
        }
        
        // High openness preferences (exact same threshold as original)
        if (female.personality.openness > this.femaleConfig.openness.threshold) {
            if (male.reproductionStrategy === 'yellow') {
                score += this.femaleConfig.openness.yellowBonus;
            }
        }
        
        // Low neuroticism preferences (exact same threshold as original)
        if (female.personality.neuroticism < this.femaleConfig.neuroticism.threshold) {
            if (male.reproductionStrategy === 'orange') {
                score += this.femaleConfig.neuroticism.orangeBonus;
            }
        }
        
        // Add random variance (exact same as original)
        return score + Math.random() * this.femaleConfig.randomVariance;
    }
    
    /**
     * Accept mating with selected male
     * Preserves exact logic from original acceptMating() method
     * 
     * @param {Object} female - Female dwarf accepting mating
     * @param {Object} male - Male dwarf being accepted
     * @returns {boolean} Whether mating was successful
     */
    acceptMating(female, male) {
        // Delegate to male's mating attempt (exact same as original)
        const success = this.attemptMatingWithFemale(male, female);
        
        if (success) {
            this.eventBus.emit(REPRODUCTION_EVENTS.MATE_SELECTED, {
                female: {
                    name: female.name,
                    personality: { ...female.personality }
                },
                male: {
                    name: male.name,
                    strategy: male.reproductionStrategy
                },
                timestamp: Date.now()
            });
        } else {
            this.eventBus.emit(REPRODUCTION_EVENTS.MATE_REJECTED, {
                female: {
                    name: female.name,
                    personality: { ...female.personality }
                },
                male: {
                    name: male.name,
                    strategy: male.reproductionStrategy
                },
                reason: 'mating_failed',
                timestamp: Date.now()
            });
        }
        
        return success;
    }
    
    /**
     * Handle mating attempt initiated by female choice
     * Preserves exact logic from male's attemptMating() method
     * 
     * @param {Object} male - Male dwarf
     * @param {Object} female - Female dwarf
     * @returns {boolean} Whether mating was successful
     */
    attemptMatingWithFemale(male, female) {
        // Check preconditions (exact same as original)
        if (female.reproductionCooldown > 0 || female.isPregnant) {
            return false;
        }
        
        // 70% success rate (exact same as original)
        const success = Math.random() < this.config.MATING_SUCCESS_RATE;
        
        if (success) {
            // Set pregnancy and cooldowns (exact same as original)
            female.isPregnant = true;
            female.pregnancyTimer = 0;
            female.reproductionCooldown = this.config.FEMALE_REPRODUCTION_COOLDOWN;
            male.reproductionCooldown = this.config.MALE_REPRODUCTION_COOLDOWN;
            
            // Log success message (exact same as original)
            this.world.addLog(
                `${male.name} (${male.reproductionStrategy}) and ${female.name} are expecting!`,
                true,
                'success'
            );
            
            // Emit success event
            this.eventBus.emit(REPRODUCTION_EVENTS.MATING_SUCCESS, {
                male: male.name,
                female: female.name,
                strategy: male.reproductionStrategy,
                initiatedBy: 'female',
                timestamp: Date.now()
            });
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Analyze female's mate preferences based on personality
     * @param {Object} female - Female dwarf to analyze
     * @returns {Object} Preference analysis
     */
    analyzePreferences(female) {
        const preferences = {
            preferredStrategies: [],
            avoidedStrategies: [],
            personalityFactors: {}
        };
        
        // High agreeableness
        if (female.personality.agreeableness > this.femaleConfig.agreeableness.threshold) {
            preferences.preferredStrategies.push('blue');
            preferences.avoidedStrategies.push('orange');
            preferences.personalityFactors.agreeableness = 'high';
        }
        
        // High openness
        if (female.personality.openness > this.femaleConfig.openness.threshold) {
            preferences.preferredStrategies.push('yellow');
            preferences.personalityFactors.openness = 'high';
        }
        
        // Low neuroticism
        if (female.personality.neuroticism < this.femaleConfig.neuroticism.threshold) {
            preferences.preferredStrategies.push('orange');
            preferences.personalityFactors.neuroticism = 'low';
        }
        
        return preferences;
    }
    
    /**
     * Get detailed scoring breakdown for a male
     * @param {Object} female - Female dwarf
     * @param {Object} male - Male dwarf
     * @returns {Object} Detailed scoring information
     */
    getDetailedScore(female, male) {
        let score = this.femaleConfig.baseScore;
        const breakdown = {
            baseScore: this.femaleConfig.baseScore,
            personalityBonuses: {},
            finalScore: 0
        };
        
        // High agreeableness
        if (female.personality.agreeableness > this.femaleConfig.agreeableness.threshold) {
            if (male.reproductionStrategy === 'blue') {
                breakdown.personalityBonuses.agreeableness_blue = this.femaleConfig.agreeableness.blueBonus;
                score += this.femaleConfig.agreeableness.blueBonus;
            }
            if (male.reproductionStrategy === 'orange') {
                breakdown.personalityBonuses.agreeableness_orange = this.femaleConfig.agreeableness.orangePenalty;
                score += this.femaleConfig.agreeableness.orangePenalty;
            }
        }
        
        // High openness
        if (female.personality.openness > this.femaleConfig.openness.threshold) {
            if (male.reproductionStrategy === 'yellow') {
                breakdown.personalityBonuses.openness_yellow = this.femaleConfig.openness.yellowBonus;
                score += this.femaleConfig.openness.yellowBonus;
            }
        }
        
        // Low neuroticism
        if (female.personality.neuroticism < this.femaleConfig.neuroticism.threshold) {
            if (male.reproductionStrategy === 'orange') {
                breakdown.personalityBonuses.neuroticism_orange = this.femaleConfig.neuroticism.orangeBonus;
                score += this.femaleConfig.neuroticism.orangeBonus;
            }
        }
        
        breakdown.finalScore = score; // Before random variance
        return breakdown;
    }
}

/**
 * Factory function for creating FemaleSelection instances
 * @param {Object} config - Reproduction configuration
 * @param {Object} world - World interface
 * @param {Object} eventBus - Event bus for communication
 * @returns {FemaleSelection} New female selection instance
 */
export function createFemaleSelection(config, world, eventBus) {
    return new FemaleSelection(config, world, eventBus);
}