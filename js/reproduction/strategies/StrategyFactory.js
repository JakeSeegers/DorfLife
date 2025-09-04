/**
 * StrategyFactory.js
 * 
 * Factory for creating and managing reproduction strategy instances.
 * Provides centralized strategy creation and validation while
 * maintaining exact behavioral preservation from original implementation.
 */

import { OrangeStrategy } from './OrangeStrategy.js';
import { BlueStrategy } from './BlueStrategy.js';
import { YellowStrategy } from './YellowStrategy.js';

export class StrategyFactory {
    constructor(config, world, eventBus) {
        this.config = config;
        this.world = world;
        this.eventBus = eventBus;
        
        // Strategy instance cache
        this.strategies = new Map();
        
        // Initialize all strategy instances
        this.initializeStrategies();
    }
    
    /**
     * Initialize all strategy instances
     * @private
     */
    initializeStrategies() {
        this.strategies.set('orange', new OrangeStrategy(this.config, this.world, this.eventBus));
        this.strategies.set('blue', new BlueStrategy(this.config, this.world, this.eventBus));
        this.strategies.set('yellow', new YellowStrategy(this.config, this.world, this.eventBus));
    }
    
    /**
     * Get strategy instance by name
     * @param {string} strategyName - Name of strategy ('orange', 'blue', 'yellow')
     * @returns {BaseStrategy} Strategy instance
     */
    getStrategy(strategyName) {
        const strategy = this.strategies.get(strategyName);
        if (!strategy) {
            throw new Error(`Unknown reproduction strategy: ${strategyName}`);
        }
        return strategy;
    }
    
    /**
     * Execute strategy for a male dwarf
     * @param {Object} male - Male dwarf to execute strategy for
     */
    executeStrategy(male) {
        if (!male || !male.reproductionStrategy) {
            throw new Error('Male dwarf must have a reproduction strategy');
        }
        
        const strategy = this.getStrategy(male.reproductionStrategy);
        strategy.execute(male);
    }
    
    /**
     * Get all available strategy names
     * @returns {Array} Array of strategy names
     */
    getAvailableStrategies() {
        return Array.from(this.strategies.keys());
    }
    
    /**
     * Assign random strategy to male dwarf
     * Preserves exact behavior from original constructor logic
     * 
     * @param {Object} male - Male dwarf to assign strategy to
     */
    assignRandomStrategy(male) {
        if (male.gender !== 'male') {
            return; // Only males get strategies
        }
        
        // Exact same random selection as original
        const strategies = this.config.MALE_STRATEGIES;
        const selectedStrategy = strategies[Math.floor(Math.random() * strategies.length)];
        
        male.reproductionStrategy = selectedStrategy;
        
        // Initialize strategy-specific properties
        this.initializeStrategyProperties(male);
        
        // Emit strategy assignment event
        this.eventBus.emit('strategy_assigned', {
            male: {
                name: male.name,
                x: male.x,
                y: male.y
            },
            strategy: selectedStrategy,
            timestamp: Date.now()
        });
    }
    
    /**
     * Initialize strategy-specific properties for a male dwarf
     * @param {Object} male - Male dwarf to initialize
     */
    initializeStrategyProperties(male) {
        switch (male.reproductionStrategy) {
            case 'orange':
                // Initialize territorial properties (exact same as original)
                if (typeof male.territoryX === 'undefined') {
                    male.territoryX = male.x;
                }
                if (typeof male.territoryY === 'undefined') {
                    male.territoryY = male.y;
                }
                break;
                
            case 'blue':
                // Initialize guardian properties (exact same as original)
                if (typeof male.guardedFemale === 'undefined') {
                    male.guardedFemale = null;
                }
                break;
                
            case 'yellow':
                // Yellow strategy doesn't need special properties
                break;
        }
    }
    
    /**
     * Validate strategy assignment for male dwarf
     * @param {Object} male - Male dwarf to validate
     * @returns {boolean} Whether strategy is valid
     */
    validateStrategy(male) {
        if (male.gender !== 'male') {
            return true; // Females don't need strategies
        }
        
        if (!male.reproductionStrategy) {
            return false;
        }
        
        if (!this.strategies.has(male.reproductionStrategy)) {
            return false;
        }
        
        const strategy = this.strategies.get(male.reproductionStrategy);
        return strategy.validateMale(male);
    }
    
    /**
     * Get strategy configuration
     * @param {string} strategyName - Name of strategy
     * @returns {Object} Strategy configuration
     */
    getStrategyConfig(strategyName) {
        const strategy = this.getStrategy(strategyName);
        return strategy.getConfig();
    }
    
    /**
     * Get strategy display information
     * @param {string} strategyName - Name of strategy
     * @returns {Object} Strategy display information
     */
    getStrategyInfo(strategyName) {
        const strategy = this.getStrategy(strategyName);
        const config = strategy.getConfig();
        
        return {
            name: strategy.getName(),
            displayName: strategy.getDisplayName(),
            color: config.color,
            cooldown: config.cooldown,
            matingChance: config.matingChance
        };
    }
    
    /**
     * Get all strategy information
     * @returns {Object} Map of strategy name to info
     */
    getAllStrategyInfo() {
        const info = {};
        for (const strategyName of this.strategies.keys()) {
            info[strategyName] = this.getStrategyInfo(strategyName);
        }
        return info;
    }
    
    /**
     * Reset strategy instances (useful for testing)
     */
    reset() {
        this.strategies.clear();
        this.initializeStrategies();
    }
}

/**
 * Factory function for creating StrategyFactory instances
 * @param {Object} config - Reproduction configuration
 * @param {Object} world - World interface
 * @param {Object} eventBus - Event bus for communication
 * @returns {StrategyFactory} New strategy factory instance
 */
export function createStrategyFactory(config, world, eventBus) {
    return new StrategyFactory(config, world, eventBus);
}