/**
 * LifespanCombatIntegration.js
 * 
 * Integration module for adding lifespan and combat systems to DorfFriend.
 * This module handles the integration with existing reproduction system,
 * auto-save system, and provides enhanced territorial combat mechanics.
 */

import { LifespanCombatSystem, LifespanUtils } from './LifespanCombatSystem.js';

export class DorfFriendLifespanIntegration {
    constructor(gameReference, reproductionSystem, autoSaveSystem) {
        this.game = gameReference;
        this.reproductionSystem = reproductionSystem;
        this.autoSave = autoSaveSystem;
        
        // Initialize lifespan combat system
        this.lifespanSystem = new LifespanCombatSystem({
            maxLifespan: 54000, // ~45 minutes
            minLifespan: 27000, // ~22.5 minutes
            agingStartAge: 37800, // Start aging at 70% lifespan
            
            // Enhanced combat for territorial disputes
            territorialCombatChance: 0.05, // Higher chance for orange males
            baseDamage: 20,
            damageVariance: 8,
            attackRange: 25,
            criticalChance: 0.12
        });
        
        // Enhanced reproduction integration
        this.setupReproductionCombatIntegration();
        
        // Enhanced auto-save integration
        this.setupAutoSaveIntegration();
        
        console.log('DorfFriend Lifespan Combat Integration initialized');
    }
    
    /**
     * Setup integration with reproduction system
     */
    setupReproductionCombatIntegration() {
        if (!this.reproductionSystem) return;
        
        // Listen for reproduction events to trigger combat
        this.reproductionSystem.eventBus.subscribe('territory_established', (event) => {
            this.handleTerritorialDispute(event.data);
        });
        
        this.reproductionSystem.eventBus.subscribe('competitor_displaced', (event) => {
            this.handleCompetitorCombat(event.data);
        });
        
        this.reproductionSystem.eventBus.subscribe('mating_success', (event) => {
            this.handleMatingRivalry(event.data);
        });
        
        // Override original strategy displacement with combat
        this.enhanceOrangeStrategy();
    }
    
    /**
     * Enhance Orange (Territorial) strategy with combat
     */
    enhanceOrangeStrategy() {
        if (!this.reproductionSystem.strategyFactory) return;
        
        const originalOrangeStrategy = this.reproductionSystem.strategyFactory.getStrategy('orange');
        
        // Override establishTerritory method to include combat
        const originalEstablishTerritory = originalOrangeStrategy.establishTerritory;
        
        originalOrangeStrategy.establishTerritory = (male, female) => {
            const distance = this.reproductionSystem.world.calculateDistance(male, female);
            
            if (distance < originalOrangeStrategy.config.territoryRadius) {
                // Set territory center
                male.territoryX = female.x;
                male.territoryY = female.y;
                
                // Find competitors for combat instead of just displacement
                const competitors = this.reproductionSystem.world.getNearbyMales(
                    female,
                    originalOrangeStrategy.config.competitorDistance,
                    male
                );
                
                // Combat with competitors instead of just displacing
                competitors.forEach(competitor => {
                    if (this.shouldEngageInTerritorialCombat(male, competitor)) {
                        this.initiateTerritorialCombat(male, competitor, female);
                    }
                });
                
                // Attempt mating if close enough
                if (distance < originalOrangeStrategy.config.matingDistance && 
                    Math.random() < originalOrangeStrategy.config.matingChance) {
                    originalOrangeStrategy.attemptMating(male, female);
                }
            }
            
            originalOrangeStrategy.setMateSeekingTimer(male, originalOrangeStrategy.config.cooldown);
        };
    }
    
    /**
     * Handle territorial dispute combat
     * @param {Object} eventData - Territory establishment event data
     */
    handleTerritorialDispute(eventData) {
        const territorial = this.findDwarfByName(eventData.male.name);
        if (!territorial || territorial.reproductionStrategy !== 'orange') return;
        
        // Find nearby orange males for combat
        const nearbyCompetitors = this.reproductionSystem.world.getNearbyMales(
            territorial,
            40, // Combat range
            territorial
        ).filter(competitor => 
            competitor.reproductionStrategy === 'orange' &&
            competitor.health > 0
        );
        
        nearbyCompetitors.forEach(competitor => {
            if (Math.random() < 0.3) { // 30% chance of combat per territorial establishment
                this.initiateTerritorialCombat(territorial, competitor, null);
            }
        });
    }
    
    /**
     * Handle competitor combat from displacement
     * @param {Object} eventData - Competitor displacement event data
     */
    handleCompetitorCombat(eventData) {
        const territorial = this.findDwarfByName(eventData.territorial.name);
        const displaced = this.findDwarfByName(eventData.displaced.name);
        
        if (territorial && displaced && Math.random() < 0.4) {
            // Combat instead of just fleeing
            this.initiateTerritorialCombat(territorial, displaced, null);
        }
    }
    
    /**
     * Handle mating rivalry combat
     * @param {Object} eventData - Mating success event data
     */
    handleMatingRivalry(eventData) {
        const successfulMale = this.findDwarfByName(eventData.male);
        if (!successfulMale) return;
        
        // Find nearby rival males who might attack
        const rivals = this.reproductionSystem.world.getNearbyMales(
            successfulMale,
            50,
            successfulMale
        ).filter(rival => 
            rival.reproductionStrategy === successfulMale.reproductionStrategy &&
            rival.health > 0 &&
            rival.reproductionCooldown > 0 // Was seeking mate but failed
        );
        
        rivals.forEach(rival => {
            if (Math.random() < 0.2) { // 20% chance of jealous attack
                setTimeout(() => {
                    this.lifespanSystem.performAttack(rival, successfulMale, this.reproductionSystem.world);
                }, Math.random() * 300); // Delayed attack
            }
        });
    }
    
    /**
     * Determine if territorial combat should occur
     * @param {Object} territorial - Territorial male
     * @param {Object} competitor - Competing male
     * @returns {boolean} Whether combat should occur
     */
    shouldEngageInTerritorialCombat(territorial, competitor) {
        if (!competitor || competitor.health <= 0) return false;
        if (competitor.reproductionStrategy !== 'orange') return false;
        
        // Higher chance if both are healthy and aggressive
        const territorialAggression = territorial.personality ? 
            (100 - territorial.personality.agreeableness) / 100 : 0.5;
        const competitorAggression = competitor.personality ? 
            (100 - competitor.personality.agreeableness) / 100 : 0.5;
        
        const combatChance = 0.3 * (territorialAggression + competitorAggression);
        return Math.random() < combatChance;
    }
    
    /**
     * Initiate territorial combat between two males
     * @param {Object} male1 - First combatant
     * @param {Object} male2 - Second combatant
     * @param {Object} female - Female they're fighting over (optional)
     */
    initiateTerritorialCombat(male1, male2, female) {
        if (!male1 || !male2 || male1.health <= 0 || male2.health <= 0) return;
        
        // Set combat targets
        male1.combatTarget = male2;
        male2.combatTarget = male1;
        male1.isInCombat = true;
        male2.isInCombat = true;
        
        // Log territorial combat
        const femaleInfo = female ? ` over ${female.name}` : '';
        console.log(`Territorial combat: ${male1.name} vs ${male2.name}${femaleInfo}`);
        
        if (typeof addLog === 'function') {
            addLog(`${male1.name} and ${male2.name} fight for territory!`, true, 'warning');
        }
        
        // First attack
        setTimeout(() => {
            if (male1.health > 0 && male2.health > 0) {
                this.lifespanSystem.performAttack(male1, male2, this.reproductionSystem.world);
            }
        }, 100);
    }
    
    /**
     * Setup auto-save integration for combat data
     */
    setupAutoSaveIntegration() {
        if (!this.autoSave) return;
        
        // Add serializer for combat/health data
        this.autoSave.addSerializer('dwarf', (dwarf) => {
            const baseData = this.autoSave.serializers.get('dwarf')(dwarf);
            
            // Add lifespan and combat data
            return {
                ...baseData,
                
                // Lifespan data
                maxLifespan: dwarf.maxLifespan,
                age: dwarf.age,
                
                // Health data
                maxHealth: dwarf.maxHealth,
                health: dwarf.health,
                
                // Combat data
                combatStats: dwarf.combatStats,
                attackCooldown: dwarf.attackCooldown,
                isInCombat: dwarf.isInCombat,
                combatTarget: dwarf.combatTarget ? dwarf.combatTarget.name : null,
                lastAttacker: dwarf.lastAttacker ? dwarf.lastAttacker.name : null
            };
        });
        
        // Add serializer for skulls and effects
        this.autoSave.addSerializer('lifespanSystem', () => ({
            skulls: this.lifespanSystem.skulls,
            stats: this.lifespanSystem.stats
        }));
        
        // Add deserializer for combat data
        this.autoSave.addDeserializer('dwarf', (data, gameRef) => {
            // Use base deserializer first
            const dwarf = new Dwarf(data.x, data.y, data.name, data.isAdult);
            
            // Restore all properties
            Object.assign(dwarf, data);
            
            // Initialize combat system for restored dwarf
            if (!dwarf.maxLifespan) {
                this.lifespanSystem.initializeDwarf(dwarf);
            }
            
            // Restore combat references
            if (data.combatTarget && gameRef.dwarfs) {
                setTimeout(() => {
                    dwarf.combatTarget = gameRef.dwarfs.find(d => d.name === data.combatTarget);
                }, 100);
            }
            
            if (data.lastAttacker && gameRef.dwarfs) {
                setTimeout(() => {
                    dwarf.lastAttacker = gameRef.dwarfs.find(d => d.name === data.lastAttacker);
                }, 100);
            }
            
            return dwarf;
        });
    }
    
    /**
     * Find dwarf by name
     * @param {string} name - Dwarf name
     * @returns {Object|null} Found dwarf or null
     */
    findDwarfByName(name) {
        return this.game.dwarfs ? this.game.dwarfs.find(d => d.name === name) : null;
    }
    
    /**
     * Initialize existing dwarf for lifespan/combat system
     * @param {Object} dwarf - Dwarf to initialize
     */
    initializeDwarf(dwarf) {
        this.lifespanSystem.initializeDwarf(dwarf);
    }
    
    /**
     * Update all systems
     */
    update() {
        if (!this.game.dwarfs) return;
        
        // Update lifespan/combat system
        this.lifespanSystem.update(this.game.dwarfs, this.reproductionSystem.world);
        
        // Remove dead dwarfs from game array
        this.game.dwarfs = this.game.dwarfs.filter(dwarf => !dwarf.isDead);
    }
    
    /**
     * Draw all lifespan/combat elements
     * @param {Object} ctx - Canvas context
     */
    draw(ctx) {
        this.lifespanSystem.draw(ctx, this.game.dwarfs || []);
    }
    
    /**
     * Get combined statistics
     * @returns {Object} Combined system statistics
     */
    getStatistics() {
        const lifespanStats = this.lifespanSystem.getStatistics();
        const populationStats = this.reproductionSystem ? 
            this.reproductionSystem.world.getPopulationStats() : {};
        
        return {
            ...lifespanStats,
            population: populationStats,
            averageAge: this.calculateAverageAge(),
            oldestDwarf: this.findOldestDwarf(),
            healthiestDwarf: this.findHealthiestDwarf()
        };
    }
    
    /**
     * Calculate average age of living dwarfs
     * @returns {number} Average age in game ticks
     */
    calculateAverageAge() {
        const livingDwarfs = (this.game.dwarfs || []).filter(d => !d.isDead && d.age);
        if (livingDwarfs.length === 0) return 0;
        
        const totalAge = livingDwarfs.reduce((sum, dwarf) => sum + (dwarf.age || 0), 0);
        return Math.floor(totalAge / livingDwarfs.length);
    }
    
    /**
     * Find oldest living dwarf
     * @returns {Object|null} Oldest dwarf or null
     */
    findOldestDwarf() {
        const livingDwarfs = (this.game.dwarfs || []).filter(d => !d.isDead);
        return livingDwarfs.reduce((oldest, current) => {
            return (current.age || 0) > (oldest.age || 0) ? current : oldest;
        }, null);
    }
    
    /**
     * Find healthiest living dwarf
     * @returns {Object|null} Healthiest dwarf or null
     */
    findHealthiestDwarf() {
        const livingDwarfs = (this.game.dwarfs || []).filter(d => !d.isDead);
        return livingDwarfs.reduce((healthiest, current) => {
            const currentHealthPercent = current.health / current.maxHealth;
            const healthiestPercent = healthiest ? healthiest.health / healthiest.maxHealth : 0;
            return currentHealthPercent > healthiestPercent ? current : healthiest;
        }, null);
    }
    
    /**
     * Manual combat between two dwarfs (for testing)
     * @param {Object} attacker - Attacking dwarf
     * @param {Object} target - Target dwarf
     */
    forceCombat(attacker, target) {
        if (attacker && target && attacker.health > 0 && target.health > 0) {
            this.lifespanSystem.performAttack(attacker, target, this.reproductionSystem.world);
        }
    }
    
    /**
     * Heal a dwarf (for testing)
     * @param {Object} dwarf - Dwarf to heal
     * @param {number} amount - Amount to heal
     */
    healDwarf(dwarf, amount = 50) {
        if (dwarf && dwarf.health > 0) {
            dwarf.health = Math.min(dwarf.maxHealth, dwarf.health + amount);
            console.log(`Healed ${dwarf.name} for ${amount} HP (now ${Math.floor(dwarf.health)}/${Math.floor(dwarf.maxHealth)})`);
        }
    }
    
    /**
     * Get detailed dwarf info including combat stats
     * @param {Object} dwarf - Dwarf to get info for
     * @returns {Object} Detailed dwarf information
     */
    getDwarfInfo(dwarf) {
        if (!dwarf) return null;
        
        return {
            name: dwarf.name,
            age: Math.floor((dwarf.age || 0) / 60), // Convert to minutes
            maxAge: Math.floor((dwarf.maxLifespan || 0) / 60),
            health: Math.floor(dwarf.health || 0),
            maxHealth: Math.floor(dwarf.maxHealth || 0),
            healthPercent: Math.floor(((dwarf.health || 0) / (dwarf.maxHealth || 1)) * 100),
            healthStatus: LifespanUtils.getHealthStatus(dwarf.health || 0, dwarf.maxHealth || 1),
            combatPower: LifespanUtils.calculateCombatPower(dwarf),
            isInCombat: dwarf.isInCombat || false,
            combatTarget: dwarf.combatTarget ? dwarf.combatTarget.name : 'None'
        };
    }
}

/**
 * Factory function for easy integration
 * @param {Object} game - Game reference
 * @param {Object} reproductionSystem - Reproduction system
 * @param {Object} autoSaveSystem - Auto-save system
 * @returns {DorfFriendLifespanIntegration} Integration instance
 */
export function createLifespanIntegration(game, reproductionSystem, autoSaveSystem) {
    return new DorfFriendLifespanIntegration(game, reproductionSystem, autoSaveSystem);
}

export default DorfFriendLifespanIntegration;