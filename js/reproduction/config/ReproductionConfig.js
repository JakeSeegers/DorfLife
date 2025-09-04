/**
 * ReproductionConfig.js
 * 
 * Centralized configuration for the dwarf reproduction system.
 * All constants extracted from the original index.html implementation
 * to ensure exact behavioral preservation.
 * 
 * CRITICAL: These values must match the original implementation exactly.
 * Any changes will alter emergent population dynamics and mate selection.
 */

export const REPRODUCTION_CONFIG = {
    // Core reproduction mechanics
    MATING_SUCCESS_RATE: 0.7,              // 70% success rate when mating is attempted
    PREGNANCY_DURATION: 3600,              // Exactly 3600 ticks for pregnancy to complete
    MATURITY_THRESHOLD: 1800,              // Ticks for child to become reproductive adult
    
    // Reproduction cooldowns (in ticks)
    FEMALE_REPRODUCTION_COOLDOWN: 7200,    // Female cooldown after successful mating
    MALE_REPRODUCTION_COOLDOWN: 3600,      // Male cooldown after successful mating
    
    // Strategy selection
    MALE_STRATEGIES: ['orange', 'blue', 'yellow'], // Available male mating strategies
    
    // Orange Strategy (Territorial) Configuration
    ORANGE_STRATEGY: {
        name: 'orange',
        displayName: 'Territorial',
        cooldown: 300,                      // Ticks between mate-seeking attempts
        territoryRadius: 80,                // Distance to establish territory around female
        matingDistance: 25,                 // Distance required for mating attempts
        matingChance: 0.02,                 // 2% chance per tick when in range
        competitorDistance: 60,             // Range for detecting and displacing rivals
        displacementChance: 0.1,            // 10% chance to displace each competitor
        color: '#FF6600'                    // Visual indicator color
    },
    
    // Blue Strategy (Guardian) Configuration  
    BLUE_STRATEGY: {
        name: 'blue',
        displayName: 'Guardian',
        cooldown: 240,                      // Ticks between mate-seeking attempts
        guardDistance: 30,                  // Distance to maintain near guarded female
        matingChance: 0.015,                // 1.5% chance per tick when in range
        maxGuardRange: 40,                  // Maximum random offset while guarding
        color: '#0066FF'                    // Visual indicator color
    },
    
    // Yellow Strategy (Sneaky) Configuration
    YELLOW_STRATEGY: {
        name: 'yellow', 
        displayName: 'Sneaky',
        cooldown: 180,                      // Shortest cooldown (most frequent attempts)
        matingDistance: 35,                 // Distance required for mating attempts
        matingChance: 0.025,                // 2.5% chance per tick (highest success rate)
        guardDetectionRadius: 50,           // Range to detect competing males
        hidingRange: 100,                   // Random positioning range when hiding
        color: '#FFFF00'                    // Visual indicator color
    },
    
    // Female mate selection configuration
    FEMALE_SELECTION: {
        baseScore: 50,                      // Starting score for all potential mates
        randomVariance: 20,                 // Random component added to final score
        
        // Personality trait thresholds and modifiers
        agreeableness: {
            threshold: 60,                  // Threshold for high agreeableness
            blueBonus: 30,                  // Bonus for blue (guardian) males
            orangePenalty: -10              // Penalty for orange (territorial) males
        },
        
        openness: {
            threshold: 70,                  // Threshold for high openness
            yellowBonus: 20                 // Bonus for yellow (sneaky) males
        },
        
        neuroticism: {
            threshold: 40,                  // Threshold for low neuroticism (inverted)
            orangeBonus: 25                 // Bonus for orange (territorial) males when calm
        },
        
        evaluationChance: 0.008,            // 0.8% chance per tick to accept preferred male
        proximityRadius: 40                 // Distance to consider males for evaluation
    },
    
    // Visual display configuration
    VISUAL: {
        strategyIndicatorSize: 3,           // Radius of strategy color indicator
        strategyIndicatorOffset: {          // Offset from dwarf center
            x: 10,
            y: -10
        }
    },
    
    // Spatial and movement constraints
    SPATIAL: {
        fleeDistance: {                     // Distance calculations for territorial displacement
            canvasWidth: true,              // Flee to canvas.width if displacer.x < competitor.x
            canvasHeight: true              // Flee to canvas.height if displacer.y < competitor.y
        },
        fleeTimer: 180,                     // Duration of flee behavior after displacement
        babySpawnRadius: 40                 // Radius around mother for baby spawning
    }
};

/**
 * Strategy color mapping for visual indicators
 * Must match exactly with original strategyColors object
 */
export const STRATEGY_COLORS = {
    'orange': REPRODUCTION_CONFIG.ORANGE_STRATEGY.color,
    'blue': REPRODUCTION_CONFIG.BLUE_STRATEGY.color,
    'yellow': REPRODUCTION_CONFIG.YELLOW_STRATEGY.color
};

/**
 * Get strategy configuration by name
 * @param {string} strategyName - Name of the strategy ('orange', 'blue', 'yellow')
 * @returns {Object} Strategy configuration object
 */
export function getStrategyConfig(strategyName) {
    switch (strategyName) {
        case 'orange':
            return REPRODUCTION_CONFIG.ORANGE_STRATEGY;
        case 'blue':
            return REPRODUCTION_CONFIG.BLUE_STRATEGY;
        case 'yellow':
            return REPRODUCTION_CONFIG.YELLOW_STRATEGY;
        default:
            throw new Error(`Unknown reproduction strategy: ${strategyName}`);
    }
}

/**
 * Comprehensive configuration validation
 * Validates all configuration values are within expected ranges
 * and maintains behavioral consistency with original implementation
 * 
 * @param {Object} config - Configuration object to validate
 * @throws {Error} Descriptive error for invalid configurations
 */
export function validateConfig(config = REPRODUCTION_CONFIG) {
    // Core reproduction mechanics validation
    if (config.MATING_SUCCESS_RATE <= 0 || config.MATING_SUCCESS_RATE > 1) {
        throw new Error(`Invalid MATING_SUCCESS_RATE: ${config.MATING_SUCCESS_RATE}. Must be between 0 and 1.`);
    }
    
    if (config.PREGNANCY_DURATION <= 0 || !Number.isInteger(config.PREGNANCY_DURATION)) {
        throw new Error(`Invalid PREGNANCY_DURATION: ${config.PREGNANCY_DURATION}. Must be positive integer.`);
    }
    
    if (config.MATURITY_THRESHOLD <= 0 || !Number.isInteger(config.MATURITY_THRESHOLD)) {
        throw new Error(`Invalid MATURITY_THRESHOLD: ${config.MATURITY_THRESHOLD}. Must be positive integer.`);
    }
    
    // Cooldown validation
    const cooldowns = [
        config.FEMALE_REPRODUCTION_COOLDOWN,
        config.MALE_REPRODUCTION_COOLDOWN
    ];
    
    cooldowns.forEach((cooldown, index) => {
        if (cooldown <= 0 || !Number.isInteger(cooldown)) {
            throw new Error(`Invalid cooldown at index ${index}: ${cooldown}. Must be positive integer.`);
        }
    });
    
    // Strategy validation
    if (!Array.isArray(config.MALE_STRATEGIES) || config.MALE_STRATEGIES.length !== 3) {
        throw new Error(`Invalid MALE_STRATEGIES: must be array of exactly 3 strategies.`);
    }
    
    const expectedStrategies = ['orange', 'blue', 'yellow'];
    expectedStrategies.forEach(strategy => {
        if (!config.MALE_STRATEGIES.includes(strategy)) {
            throw new Error(`Missing required strategy: ${strategy}`);
        }
    });
    
    // Individual strategy validation
    validateStrategyConfig(config.ORANGE_STRATEGY, 'ORANGE_STRATEGY');
    validateStrategyConfig(config.BLUE_STRATEGY, 'BLUE_STRATEGY');
    validateStrategyConfig(config.YELLOW_STRATEGY, 'YELLOW_STRATEGY');
    
    // Female selection validation
    const femaleConfig = config.FEMALE_SELECTION;
    if (femaleConfig.baseScore <= 0) {
        throw new Error(`Invalid FEMALE_SELECTION.baseScore: ${femaleConfig.baseScore}. Must be positive.`);
    }
    
    if (femaleConfig.randomVariance < 0) {
        throw new Error(`Invalid FEMALE_SELECTION.randomVariance: ${femaleConfig.randomVariance}. Must be non-negative.`);
    }
    
    if (femaleConfig.evaluationChance <= 0 || femaleConfig.evaluationChance > 1) {
        throw new Error(`Invalid FEMALE_SELECTION.evaluationChance: ${femaleConfig.evaluationChance}. Must be between 0 and 1.`);
    }
    
    // Personality threshold validation
    const personalityTraits = ['agreeableness', 'openness', 'neuroticism'];
    personalityTraits.forEach(trait => {
        const traitConfig = femaleConfig[trait];
        if (!traitConfig || typeof traitConfig.threshold !== 'number') {
            throw new Error(`Invalid FEMALE_SELECTION.${trait}.threshold configuration.`);
        }
        if (traitConfig.threshold < 0 || traitConfig.threshold > 100) {
            throw new Error(`Invalid FEMALE_SELECTION.${trait}.threshold: ${traitConfig.threshold}. Must be between 0 and 100.`);
        }
    });
}

/**
 * Validate individual strategy configuration
 * @param {Object} strategyConfig - Strategy configuration to validate
 * @param {string} strategyName - Name of strategy for error reporting
 */
function validateStrategyConfig(strategyConfig, strategyName) {
    if (!strategyConfig || typeof strategyConfig !== 'object') {
        throw new Error(`Invalid ${strategyName}: must be configuration object.`);
    }
    
    // Required numeric properties validation
    const numericProps = ['cooldown', 'matingChance'];
    numericProps.forEach(prop => {
        if (typeof strategyConfig[prop] !== 'number' || strategyConfig[prop] <= 0) {
            throw new Error(`Invalid ${strategyName}.${prop}: ${strategyConfig[prop]}. Must be positive number.`);
        }
    });
    
    // Mating chance should be probability
    if (strategyConfig.matingChance > 1) {
        throw new Error(`Invalid ${strategyName}.matingChance: ${strategyConfig.matingChance}. Must be probability (0-1).`);
    }
    
    // Color validation
    if (!strategyConfig.color || !/^#[0-9A-Fa-f]{6}$/.test(strategyConfig.color)) {
        throw new Error(`Invalid ${strategyName}.color: ${strategyConfig.color}. Must be valid hex color.`);
    }
    
    // Strategy-specific validations
    if (strategyName === 'ORANGE_STRATEGY') {
        const requiredProps = ['territoryRadius', 'matingDistance', 'competitorDistance', 'displacementChance'];
        requiredProps.forEach(prop => {
            if (typeof strategyConfig[prop] !== 'number' || strategyConfig[prop] <= 0) {
                throw new Error(`Invalid ${strategyName}.${prop}: ${strategyConfig[prop]}. Must be positive number.`);
            }
        });
    }
    
    if (strategyName === 'BLUE_STRATEGY') {
        const requiredProps = ['guardDistance', 'maxGuardRange'];
        requiredProps.forEach(prop => {
            if (typeof strategyConfig[prop] !== 'number' || strategyConfig[prop] <= 0) {
                throw new Error(`Invalid ${strategyName}.${prop}: ${strategyConfig[prop]}. Must be positive number.`);
            }
        });
    }
    
    if (strategyName === 'YELLOW_STRATEGY') {
        const requiredProps = ['matingDistance', 'guardDetectionRadius', 'hidingRange'];
        requiredProps.forEach(prop => {
            if (typeof strategyConfig[prop] !== 'number' || strategyConfig[prop] <= 0) {
                throw new Error(`Invalid ${strategyName}.${prop}: ${strategyConfig[prop]}. Must be positive number.`);
            }
        });
    }
}

/**
 * Create a deep copy of the configuration to prevent external modifications
 * @returns {Object} Deep copy of REPRODUCTION_CONFIG
 */
export function getConfigCopy() {
    return JSON.parse(JSON.stringify(REPRODUCTION_CONFIG));
}

/**
 * Initialize and validate configuration on module load
 * This ensures any configuration errors are caught early
 */
try {
    validateConfig();
    console.log('ReproductionConfig: Configuration validated successfully');
} catch (error) {
    console.error('ReproductionConfig: Configuration validation failed:', error.message);
    throw error;
}