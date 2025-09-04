/**
 * ReproductionSystem.js
 * 
 * Main coordinator for the modular reproduction system.
 * Orchestrates all reproduction behaviors while preserving exact
 * behavioral patterns from the original monolithic implementation.
 * 
 * This is the primary entry point for the game loop integration.
 */

import { REPRODUCTION_CONFIG, validateConfig } from '../config/ReproductionConfig.js';
import { WorldInterface } from '../core/WorldInterface.js';
import { ReproductionEventBus, REPRODUCTION_EVENTS } from '../events/ReproductionEventBus.js';
import { StrategyFactory } from '../strategies/StrategyFactory.js';
import { FemaleSelection } from './FemaleSelection.js';
import { PregnancyManager } from './PregnancyManager.js';

export class ReproductionSystem {
    constructor(options = {}) {
        // Initialize configuration
        this.config = options.config || REPRODUCTION_CONFIG;
        validateConfig(this.config);
        
        // Initialize dependencies with dependency injection
        this.world = options.worldInterface || new WorldInterface(options.gameReference);
        this.eventBus = options.eventBus || new ReproductionEventBus();
        this.strategyFactory = options.strategyFactory || new StrategyFactory(this.config, this.world, this.eventBus);
        this.femaleSelection = options.femaleSelection || new FemaleSelection(this.config, this.world, this.eventBus);
        this.pregnancyManager = options.pregnancyManager || new PregnancyManager(this.config, this.world, this.eventBus, this);
        
        // System state
        this.isInitialized = false;
        this.statistics = {
            matingsAttempted: 0,
            matingsSuccessful: 0,
            birthsOccurred: 0,
            strategiesExecuted: { orange: 0, blue: 0, yellow: 0 }
        };
        
        // Initialize system
        this.initialize();
    }
    
    /**
     * Initialize the reproduction system
     * @private
     */
    initialize() {
        if (this.isInitialized) return;
        
        // Set up event listeners for statistics tracking
        this.setupEventListeners();
        
        this.isInitialized = true;
        
        console.log('ReproductionSystem: Initialized successfully');
    }
    
    /**
     * Set up event listeners for system monitoring
     * @private
     */
    setupEventListeners() {
        this.eventBus.subscribe(REPRODUCTION_EVENTS.MATING_ATTEMPT, (event) => {
            this.statistics.matingsAttempted++;
            if (event.data.success) {
                this.statistics.matingsSuccessful++;
            }
        });
        
        this.eventBus.subscribe(REPRODUCTION_EVENTS.BIRTH, (event) => {
            this.statistics.birthsOccurred++;
        });
        
        // Track strategy usage
        ['orange', 'blue', 'yellow'].forEach(strategy => {
            this.eventBus.subscribe(REPRODUCTION_EVENTS.TERRITORY_ESTABLISHED, (event) => {
                if (strategy === 'orange') this.statistics.strategiesExecuted.orange++;
            });
            this.eventBus.subscribe(REPRODUCTION_EVENTS.FEMALE_GUARDED, (event) => {
                if (strategy === 'blue') this.statistics.strategiesExecuted.blue++;
            });
            this.eventBus.subscribe(REPRODUCTION_EVENTS.SNEAKY_ATTEMPT, (event) => {
                if (strategy === 'yellow') this.statistics.strategiesExecuted.yellow++;
            });
        });
    }
    
    /**
     * Main entry point for reproduction behavior updates
     * Called from the game loop for each dwarf
     * 
     * @param {Object} dwarf - Dwarf to update reproduction behavior for
     */
    updateReproductionBehavior(dwarf) {
        if (!this.canParticipateInReproduction(dwarf)) {
            return;
        }
        
        try {
            if (dwarf.gender === 'male' && dwarf.mateSeekingTimer <= 0) {
                this.handleMaleReproductiveBehavior(dwarf);
            } else if (dwarf.gender === 'female' && !dwarf.isPregnant) {
                this.handleFemaleReproductiveBehavior(dwarf);
            }
        } catch (error) {
            console.error(`ReproductionSystem: Error updating ${dwarf.name}:`, error);
            // Set fail-safe cooldown to prevent repeated errors
            dwarf.reproductionCooldown = 600;
        }
    }
    
    /**
     * Check if dwarf can participate in reproduction
     * Preserves exact conditions from original implementation
     * 
     * @param {Object} dwarf - Dwarf to check
     * @returns {boolean} Whether dwarf can reproduce
     */
    canParticipateInReproduction(dwarf) {
        return dwarf && 
               dwarf.isAdult && 
               dwarf.reproductionCooldown <= 0;
    }
    
    /**
     * Handle male reproductive behavior
     * Orchestrates male strategy execution
     * 
     * @param {Object} male - Male dwarf
     */
    handleMaleReproductiveBehavior(male) {
        if (!male.reproductionStrategy) {
            // Assign strategy if not present (should not happen in normal flow)
            this.strategyFactory.assignRandomStrategy(male);
        }
        
        // Validate strategy setup
        if (!this.strategyFactory.validateStrategy(male)) {
            console.warn(`ReproductionSystem: Invalid strategy for ${male.name}, reassigning`);
            this.strategyFactory.assignRandomStrategy(male);
        }
        
        // Execute strategy
        this.strategyFactory.executeStrategy(male);
    }
    
    /**
     * Handle female reproductive behavior
     * Orchestrates female mate selection
     * 
     * @param {Object} female - Female dwarf
     */
    handleFemaleReproductiveBehavior(female) {
        this.femaleSelection.execute(female);
    }
    
    /**
     * Initialize reproduction traits for a new dwarf
     * Preserves exact initialization logic from original constructor
     * 
     * @param {Object} dwarf - Newly created dwarf
     */
    initializeReproductionTraits(dwarf) {
        if (!dwarf) return;
        
        // Initialize reproduction strategy for males (exact same as original)
        if (dwarf.gender === 'male') {
            this.strategyFactory.assignRandomStrategy(dwarf);
        }
        
        // Initialize reproduction-related properties (exact same as original)
        if (typeof dwarf.isPregnant === 'undefined') {
            dwarf.isPregnant = false;
        }
        if (typeof dwarf.pregnancyTimer === 'undefined') {
            dwarf.pregnancyTimer = 0;
        }
        if (typeof dwarf.reproductionCooldown === 'undefined') {
            dwarf.reproductionCooldown = 0;
        }
        if (typeof dwarf.mateSeekingTimer === 'undefined') {
            dwarf.mateSeekingTimer = 0;
        }
        
        // Emit initialization event
        this.eventBus.emit('dwarf_reproduction_initialized', {
            dwarf: {
                name: dwarf.name,
                gender: dwarf.gender,
                strategy: dwarf.reproductionStrategy || null,
                isAdult: dwarf.isAdult
            },
            timestamp: Date.now()
        });
    }
    
    /**
     * Handle pregnancy completion and birth
     * Delegates to PregnancyManager for exact behavioral preservation
     * 
     * @param {Object} mother - Pregnant female dwarf giving birth
     */
    giveBirth(mother) {
        return this.pregnancyManager.giveBirth(mother);
    }
    
    /**
     * Update pregnancy progression for all pregnant females
     * Should be called each game tick to handle births
     */
    updatePregnancies() {
        this.pregnancyManager.updatePregnancies();
    }
    
    /**
     * Handle dwarf reaching maturity
     * @param {Object} dwarf - Dwarf reaching maturity
     */
    handleMaturity(dwarf) {
        if (!dwarf.isAdult) return;
        
        this.eventBus.emit(REPRODUCTION_EVENTS.MATURITY_REACHED, {
            dwarf: {
                name: dwarf.name,
                gender: dwarf.gender,
                strategy: dwarf.reproductionStrategy || null
            },
            timestamp: Date.now()
        });
    }
    
    /**
     * Get system statistics
     * @returns {Object} Reproduction system statistics
     */
    getStatistics() {
        const populationStats = this.world.getPopulationStats();
        
        return {
            ...this.statistics,
            population: populationStats,
            successRate: this.statistics.matingsAttempted > 0 
                ? (this.statistics.matingsSuccessful / this.statistics.matingsAttempted * 100).toFixed(1)
                : 0,
            eventHistory: this.eventBus.getEventHistory(null, 100)
        };
    }
    
    /**
     * Reset system statistics
     */
    resetStatistics() {
        this.statistics = {
            matingsAttempted: 0,
            matingsSuccessful: 0,
            birthsOccurred: 0,
            strategiesExecuted: { orange: 0, blue: 0, yellow: 0 }
        };
        
        this.eventBus.clearHistory();
    }
    
    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Whether to enable debug logging
     */
    setDebugMode(enabled) {
        this.eventBus.setDebugMode(enabled);
        console.log(`ReproductionSystem: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Validate system integrity
     * @returns {Object} Validation results
     */
    validateSystem() {
        const issues = [];
        const warnings = [];
        
        // Check configuration
        try {
            validateConfig(this.config);
        } catch (error) {
            issues.push(`Configuration invalid: ${error.message}`);
        }
        
        // Check strategy factory
        const availableStrategies = this.strategyFactory.getAvailableStrategies();
        if (availableStrategies.length !== 3) {
            issues.push(`Expected 3 strategies, found ${availableStrategies.length}`);
        }
        
        // Check population
        const populationStats = this.world.getPopulationStats();
        if (populationStats.total === 0) {
            warnings.push('No dwarfs in population');
        }
        
        return {
            isValid: issues.length === 0,
            issues,
            warnings,
            populationStats
        };
    }
}

/**
 * Factory function for creating ReproductionSystem instances
 * @param {Object} options - System configuration options
 * @returns {ReproductionSystem} New reproduction system instance
 */
export function createReproductionSystem(options = {}) {
    return new ReproductionSystem(options);
}