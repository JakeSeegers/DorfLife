/**
 * LifespanCombatSystem.js
 * 
 * Comprehensive lifespan and combat system for DorfFriend.
 * Adds aging, health, death, and melee combat mechanics while
 * preserving all existing reproduction and behavioral systems.
 * 
 * Features:
 * - Aging system with natural death from old age
 * - Health system with damage, healing, and status effects  
 * - Melee combat with attack/defense mechanics
 * - Death system that spawns skull sprites
 * - Combat integration with reproduction (territorial disputes)
 * - Visual health indicators and combat effects
 */

export class LifespanCombatSystem {
    constructor(config = {}) {
        this.config = {
            // Lifespan settings (in game ticks)
            maxLifespan: config.maxLifespan || 36000, // ~30 minutes at 20fps
            minLifespan: config.minLifespan || 18000, // ~15 minutes minimum
            agingStartAge: config.agingStartAge || 25200, // Start aging effects at 70% lifespan
            
            // Health settings
            maxHealth: config.maxHealth || 100,
            naturalHealing: config.naturalHealing || 0.1, // HP per tick when healthy
            agingDamage: config.agingDamage || 0.05, // HP loss per tick when old
            
            // Combat settings
            baseDamage: config.baseDamage || 15,
            damageVariance: config.damageVariance || 5,
            attackRange: config.attackRange || 20,
            attackCooldown: config.attackCooldown || 60, // Ticks between attacks
            criticalChance: config.criticalChance || 0.1,
            criticalMultiplier: config.criticalMultiplier || 1.5,
            
            // Combat chances
            territorialCombatChance: config.territorialCombatChance || 0.02,
            randomCombatChance: config.randomCombatChance || 0.001,
            
            // Visual settings
            combatEffectDuration: config.combatEffectDuration || 30,
            deathEffectDuration: config.deathEffectDuration || 60
        };
        
        // System state
        this.skulls = []; // Dead dwarf skulls
        this.combatEffects = []; // Visual combat effects
        this.deathEffects = []; // Death animation effects
        
        // Statistics
        this.stats = {
            totalDeaths: 0,
            deathsByAge: 0,
            deathsByCombat: 0,
            totalCombats: 0,
            totalDamageDealt: 0
        };
        
        console.log('LifespanCombatSystem initialized', this.config);
    }
    
    /**
     * Initialize lifespan and health for a dwarf
     * @param {Object} dwarf - Dwarf to initialize
     */
    initializeDwarf(dwarf) {
        // Set random lifespan
        dwarf.maxLifespan = this.config.minLifespan + 
            Math.random() * (this.config.maxLifespan - this.config.minLifespan);
        
        // Initialize health system
        dwarf.maxHealth = this.config.maxHealth + Math.random() * 20 - 10; // ±10 variation
        dwarf.health = dwarf.maxHealth;
        dwarf.age = dwarf.age || 0;
        
        // Combat properties
        dwarf.attackCooldown = 0;
        dwarf.isInCombat = false;
        dwarf.combatTarget = null;
        dwarf.lastAttacker = null;
        dwarf.combatEffectTimer = 0;
        
        // Combat stats based on class
        this.assignCombatStats(dwarf);
        
        // Visual properties
        dwarf.healthBarVisible = false;
        dwarf.damageNumbers = [];
        
        console.log(`Initialized ${dwarf.name}: lifespan ${Math.floor(dwarf.maxLifespan/60)}min, health ${Math.floor(dwarf.maxHealth)}`);
    }
    
    /**
     * Assign combat stats based on dwarf class
     * @param {Object} dwarf - Dwarf to assign stats to
     */
    assignCombatStats(dwarf) {
        switch (dwarf.class) {
            case 'fighter':
                dwarf.combatStats = {
                    attack: 1.2,
                    defense: 1.1,
                    speed: 1.0,
                    critChance: 0.12
                };
                break;
            case 'mage':
                dwarf.combatStats = {
                    attack: 0.9,
                    defense: 0.8,
                    speed: 1.1,
                    critChance: 0.15
                };
                break;
            case 'archer':
                dwarf.combatStats = {
                    attack: 1.0,
                    defense: 0.9,
                    speed: 1.2,
                    critChance: 0.1
                };
                break;
            default:
                dwarf.combatStats = {
                    attack: 1.0,
                    defense: 1.0,
                    speed: 1.0,
                    critChance: 0.1
                };
        }
    }
    
    /**
     * Update lifespan and health for a dwarf
     * @param {Object} dwarf - Dwarf to update
     * @param {Object} world - World interface for interactions
     */
    updateDwarf(dwarf, world) {
        if (!dwarf.health || dwarf.health <= 0) return; // Skip dead dwarfs
        
        // Age the dwarf
        dwarf.age = (dwarf.age || 0) + 1;
        
        // Handle aging effects
        this.handleAging(dwarf);
        
        // Handle health regeneration/decay
        this.handleHealthUpdate(dwarf);
        
        // Update combat cooldowns
        if (dwarf.attackCooldown > 0) dwarf.attackCooldown--;
        if (dwarf.combatEffectTimer > 0) dwarf.combatEffectTimer--;
        
        // Update damage number effects
        this.updateDamageNumbers(dwarf);
        
        // Handle combat behavior
        this.handleCombatBehavior(dwarf, world);
        
        // Check for death
        if (dwarf.health <= 0 || dwarf.age >= dwarf.maxLifespan) {
            this.handleDeath(dwarf, world);
        }
    }
    
    /**
     * Handle aging effects on dwarf
     * @param {Object} dwarf - Dwarf to age
     */
    handleAging(dwarf) {
        const ageRatio = dwarf.age / dwarf.maxLifespan;
        
        if (ageRatio >= 0.7) { // Start aging effects at 70% of lifespan
            // Gradual health loss from aging
            const agingFactor = (ageRatio - 0.7) / 0.3; // 0 to 1 over the last 30% of life
            dwarf.health -= this.config.agingDamage * agingFactor;
            
            // Reduce efficiency when old
            if (dwarf.efficiency) {
                dwarf.efficiency = Math.max(0.3, dwarf.efficiency * (1 - agingFactor * 0.3));
            }
        }
    }
    
    /**
     * Handle health updates (healing/decay)
     * @param {Object} dwarf - Dwarf to update health for
     */
    handleHealthUpdate(dwarf) {
        // Natural healing when healthy and not in combat
        if (dwarf.health < dwarf.maxHealth && !dwarf.isInCombat && dwarf.health > dwarf.maxHealth * 0.3) {
            dwarf.health = Math.min(dwarf.maxHealth, dwarf.health + this.config.naturalHealing);
        }
        
        // Show health bar when injured
        dwarf.healthBarVisible = dwarf.health < dwarf.maxHealth * 0.9;
    }
    
    /**
     * Handle combat behavior
     * @param {Object} dwarf - Dwarf potentially engaging in combat
     * @param {Object} world - World interface
     */
    handleCombatBehavior(dwarf, world) {
        if (!dwarf.isAdult || dwarf.attackCooldown > 0) return;
        
        // Find potential combat targets
        const nearbyDwarfs = world.getNearbyDwarfs(dwarf, this.config.attackRange * 2);
        const potentialTargets = nearbyDwarfs.filter(target => 
            target.health > 0 && 
            target !== dwarf && 
            this.shouldEngageInCombat(dwarf, target)
        );
        
        if (potentialTargets.length > 0) {
            const target = potentialTargets[0]; // Attack nearest valid target
            const distance = world.calculateDistance(dwarf, target);
            
            if (distance <= this.config.attackRange) {
                this.performAttack(dwarf, target, world);
            } else if (dwarf.combatTarget === target) {
                // Move towards combat target
                this.moveTowardsTarget(dwarf, target);
            }
        }
    }
    
    /**
     * Determine if a dwarf should engage in combat with another
     * @param {Object} attacker - Potential attacker
     * @param {Object} target - Potential target
     * @returns {boolean} Whether combat should occur
     */
    shouldEngageInCombat(attacker, target) {
        // Don't attack same gender (except territorial disputes)
        if (attacker.gender === target.gender && !this.isTerritorialDispute(attacker, target)) {
            return false;
        }
        
        // Territorial disputes (Orange males)
        if (this.isTerritorialDispute(attacker, target)) {
            return Math.random() < this.config.territorialCombatChance;
        }
        
        // Random combat (rare)
        if (Math.random() < this.config.randomCombatChance) {
            // Personality influences combat likelihood
            if (attacker.personality) {
                const aggression = (100 - attacker.personality.agreeableness) + attacker.personality.neuroticism;
                return Math.random() * 200 < aggression;
            }
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if this is a territorial dispute
     * @param {Object} dwarf1 - First dwarf
     * @param {Object} dwarf2 - Second dwarf  
     * @returns {boolean} Whether this is territorial combat
     */
    isTerritorialDispute(dwarf1, dwarf2) {
        // Orange males fighting over territory
        return dwarf1.reproductionStrategy === 'orange' && 
               dwarf2.reproductionStrategy === 'orange' &&
               dwarf1.gender === 'male' && dwarf2.gender === 'male';
    }
    
    /**
     * Perform a melee attack
     * @param {Object} attacker - Attacking dwarf
     * @param {Object} target - Target dwarf
     * @param {Object} world - World interface
     */
    performAttack(attacker, target, world) {
        if (attacker.attackCooldown > 0) return;
        
        // Calculate damage
        const baseDamage = this.config.baseDamage + Math.random() * this.config.damageVariance;
        const attackMultiplier = attacker.combatStats.attack;
        const defenseMultiplier = target.combatStats.defense;
        
        let damage = baseDamage * attackMultiplier / defenseMultiplier;
        
        // Check for critical hit
        const critChance = this.config.criticalChance + attacker.combatStats.critChance;
        const isCritical = Math.random() < critChance;
        if (isCritical) {
            damage *= this.config.criticalMultiplier;
        }
        
        // Apply damage
        const finalDamage = Math.floor(damage);
        target.health -= finalDamage;
        target.lastAttacker = attacker;
        
        // Set combat states
        attacker.isInCombat = true;
        target.isInCombat = true;
        attacker.combatTarget = target;
        target.combatTarget = attacker;
        
        // Set cooldowns
        attacker.attackCooldown = this.config.attackCooldown / attacker.combatStats.speed;
        attacker.combatEffectTimer = this.config.combatEffectDuration;
        target.combatEffectTimer = this.config.combatEffectDuration;
        
        // Add damage number effect
        this.addDamageNumber(target, finalDamage, isCritical);
        
        // Add combat effect
        this.addCombatEffect(attacker, target);
        
        // Update statistics
        this.stats.totalCombats++;
        this.stats.totalDamageDealt += finalDamage;
        
        // Log combat
        const combatType = isCritical ? 'CRITICAL HIT' : 'hit';
        console.log(`${attacker.name} ${combatType} ${target.name} for ${finalDamage} damage`);
        
        // Trigger retaliation chance
        if (target.health > 0 && target.attackCooldown === 0 && Math.random() < 0.7) {
            setTimeout(() => {
                if (target.health > 0 && world.calculateDistance(attacker, target) <= this.config.attackRange) {
                    this.performAttack(target, attacker, world);
                }
            }, 10);
        }
    }
    
    /**
     * Move dwarf towards target
     * @param {Object} dwarf - Dwarf to move
     * @param {Object} target - Target to move towards
     */
    moveTowardsTarget(dwarf, target) {
        const dx = target.x - dwarf.x;
        const dy = target.y - dwarf.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const moveSpeed = (dwarf.speed || 1) * dwarf.combatStats.speed;
            dwarf.x += (dx / distance) * moveSpeed;
            dwarf.y += (dy / distance) * moveSpeed;
            
            // Update target position for movement
            dwarf.targetX = target.x;
            dwarf.targetY = target.y;
        }
    }
    
    /**
     * Add floating damage number
     * @param {Object} target - Target that took damage
     * @param {number} damage - Damage amount
     * @param {boolean} isCritical - Whether it was a critical hit
     */
    addDamageNumber(target, damage, isCritical) {
        if (!target.damageNumbers) target.damageNumbers = [];
        
        target.damageNumbers.push({
            damage: damage,
            x: target.x + Math.random() * 20 - 10,
            y: target.y - 20,
            timer: 60,
            isCritical: isCritical,
            velocity: { x: Math.random() * 2 - 1, y: -2 }
        });
    }
    
    /**
     * Update floating damage numbers
     * @param {Object} dwarf - Dwarf with damage numbers
     */
    updateDamageNumbers(dwarf) {
        if (!dwarf.damageNumbers) return;
        
        for (let i = dwarf.damageNumbers.length - 1; i >= 0; i--) {
            const dmgNum = dwarf.damageNumbers[i];
            dmgNum.timer--;
            dmgNum.x += dmgNum.velocity.x;
            dmgNum.y += dmgNum.velocity.y;
            dmgNum.velocity.y += 0.1; // Gravity
            
            if (dmgNum.timer <= 0) {
                dwarf.damageNumbers.splice(i, 1);
            }
        }
    }
    
    /**
     * Add combat visual effect
     * @param {Object} attacker - Attacking dwarf
     * @param {Object} target - Target dwarf
     */
    addCombatEffect(attacker, target) {
        this.combatEffects.push({
            x: (attacker.x + target.x) / 2,
            y: (attacker.y + target.y) / 2,
            timer: this.config.combatEffectDuration,
            type: 'melee'
        });
    }
    
    /**
     * Handle dwarf death
     * @param {Object} dwarf - Dying dwarf
     * @param {Object} world - World interface
     */
    handleDeath(dwarf, world) {
        const deathCause = dwarf.health <= 0 ? 'combat' : 'age';
        
        // Create skull at death location
        this.createSkull(dwarf);
        
        // Add death effect
        this.addDeathEffect(dwarf);
        
        // Update statistics
        this.stats.totalDeaths++;
        if (deathCause === 'age') {
            this.stats.deathsByAge++;
        } else {
            this.stats.deathsByCombat++;
        }
        
        // Log death
        const ageInMinutes = Math.floor(dwarf.age / 60);
        console.log(`${dwarf.name} died of ${deathCause} at age ${ageInMinutes}m`);
        
        // Add to game log if available
        if (typeof addLog === 'function') {
            addLog(`${dwarf.name} died of ${deathCause} (age: ${ageInMinutes}m)`, true, 'warning');
        }
        
        // Clear combat states for other dwarfs targeting this one
        world.getAllDwarfs().forEach(otherDwarf => {
            if (otherDwarf.combatTarget === dwarf) {
                otherDwarf.combatTarget = null;
                otherDwarf.isInCombat = false;
            }
        });
        
        // Mark dwarf as dead (for removal by game system)
        dwarf.isDead = true;
        dwarf.health = 0;
    }
    
    /**
     * Create skull sprite at death location
     * @param {Object} dwarf - Dead dwarf
     */
    createSkull(dwarf) {
        const skull = {
            x: dwarf.x,
            y: dwarf.y,
            name: `${dwarf.name}'s remains`,
            age: 0,
            maxAge: 18000, // Skulls last ~15 minutes
            opacity: 1.0
        };
        
        this.skulls.push(skull);
    }
    
    /**
     * Add death visual effect
     * @param {Object} dwarf - Dead dwarf
     */
    addDeathEffect(dwarf) {
        this.deathEffects.push({
            x: dwarf.x,
            y: dwarf.y,
            timer: this.config.deathEffectDuration,
            name: dwarf.name
        });
    }
    
    /**
     * Update skull sprites
     */
    updateSkulls() {
        for (let i = this.skulls.length - 1; i >= 0; i--) {
            const skull = this.skulls[i];
            skull.age++;
            
            // Fade out over time
            skull.opacity = Math.max(0, 1 - (skull.age / skull.maxAge));
            
            // Remove old skulls
            if (skull.age >= skull.maxAge) {
                this.skulls.splice(i, 1);
            }
        }
    }
    
    /**
     * Update visual effects
     */
    updateEffects() {
        // Update combat effects
        for (let i = this.combatEffects.length - 1; i >= 0; i--) {
            const effect = this.combatEffects[i];
            effect.timer--;
            
            if (effect.timer <= 0) {
                this.combatEffects.splice(i, 1);
            }
        }
        
        // Update death effects
        for (let i = this.deathEffects.length - 1; i >= 0; i--) {
            const effect = this.deathEffects[i];
            effect.timer--;
            
            if (effect.timer <= 0) {
                this.deathEffects.splice(i, 1);
            }
        }
    }
    
    /**
     * Draw health bar for a dwarf
     * @param {Object} ctx - Canvas context
     * @param {Object} dwarf - Dwarf to draw health bar for
     */
    drawHealthBar(ctx, dwarf) {
        if (!dwarf.healthBarVisible || dwarf.health >= dwarf.maxHealth) return;
        
        const barWidth = 20;
        const barHeight = 4;
        const x = dwarf.x - barWidth / 2;
        const y = dwarf.y - 25;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Health bar
        const healthPercent = dwarf.health / dwarf.maxHealth;
        const healthWidth = barWidth * healthPercent;
        
        if (healthPercent > 0.6) {
            ctx.fillStyle = '#27ae60';
        } else if (healthPercent > 0.3) {
            ctx.fillStyle = '#f1c40f';
        } else {
            ctx.fillStyle = '#e74c3c';
        }
        
        ctx.fillRect(x, y, healthWidth, barHeight);
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
    }
    
    /**
     * Draw floating damage numbers
     * @param {Object} ctx - Canvas context
     * @param {Object} dwarf - Dwarf with damage numbers
     */
    drawDamageNumbers(ctx, dwarf) {
        if (!dwarf.damageNumbers) return;
        
        dwarf.damageNumbers.forEach(dmgNum => {
            ctx.save();
            
            const alpha = dmgNum.timer / 60;
            ctx.globalAlpha = alpha;
            
            ctx.font = dmgNum.isCritical ? 'bold 16px Arial' : '12px Arial';
            ctx.fillStyle = dmgNum.isCritical ? '#ff0000' : '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            
            const text = dmgNum.damage.toString();
            ctx.strokeText(text, dmgNum.x, dmgNum.y);
            ctx.fillText(text, dmgNum.x, dmgNum.y);
            
            ctx.restore();
        });
    }
    
    /**
     * Draw skull sprites
     * @param {Object} ctx - Canvas context
     */
    drawSkulls(ctx) {
        this.skulls.forEach(skull => {
            ctx.save();
            ctx.globalAlpha = skull.opacity;
            
            // Draw skull sprite (placeholder - use actual sprite from colored.png)
            ctx.fillStyle = '#f8f8ff';
            ctx.beginPath();
            ctx.arc(skull.x, skull.y, 8, 0, Math.PI * 2);
            ctx.fill();
            
            // Skull details
            ctx.fillStyle = '#000000';
            ctx.fillRect(skull.x - 3, skull.y - 2, 2, 2); // Eye socket
            ctx.fillRect(skull.x + 1, skull.y - 2, 2, 2); // Eye socket
            ctx.fillRect(skull.x - 1, skull.y + 1, 2, 3); // Mouth
            
            ctx.restore();
        });
    }
    
    /**
     * Draw combat effects
     * @param {Object} ctx - Canvas context
     */
    drawCombatEffects(ctx) {
        this.combatEffects.forEach(effect => {
            ctx.save();
            
            const alpha = effect.timer / this.config.combatEffectDuration;
            ctx.globalAlpha = alpha;
            
            // Combat spark effect
            ctx.fillStyle = '#ffff00';
            ctx.strokeStyle = '#ff4500';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Add some random sparks
            for (let i = 0; i < 3; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 10;
                const sx = effect.x + Math.cos(angle) * distance;
                const sy = effect.y + Math.sin(angle) * distance;
                
                ctx.fillStyle = '#ffa500';
                ctx.beginPath();
                ctx.arc(sx, sy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        });
    }
    
    /**
     * Get system statistics
     * @returns {Object} Combat and lifespan statistics
     */
    getStatistics() {
        return {
            ...this.stats,
            activeSkulls: this.skulls.length,
            activeCombatEffects: this.combatEffects.length,
            activeDeathEffects: this.deathEffects.length,
            averageDamagePerCombat: this.stats.totalCombats > 0 ? 
                Math.floor(this.stats.totalDamageDealt / this.stats.totalCombats) : 0
        };
    }
    
    /**
     * Main update function - call this each game tick
     * @param {Array} dwarfs - Array of all dwarfs
     * @param {Object} world - World interface
     */
    update(dwarfs, world) {
        // Update all dwarfs
        dwarfs.forEach(dwarf => {
            if (!dwarf.isDead) {
                this.updateDwarf(dwarf, world);
            }
        });
        
        // Update skulls
        this.updateSkulls();
        
        // Update effects
        this.updateEffects();
    }
    
    /**
     * Draw all system elements
     * @param {Object} ctx - Canvas context
     * @param {Array} dwarfs - Array of all dwarfs
     */
    draw(ctx, dwarfs) {
        // Draw skulls first (behind dwarfs)
        this.drawSkulls(ctx);
        
        // Draw health bars and damage numbers for living dwarfs
        dwarfs.forEach(dwarf => {
            if (!dwarf.isDead) {
                this.drawHealthBar(ctx, dwarf);
                this.drawDamageNumbers(ctx, dwarf);
            }
        });
        
        // Draw combat effects on top
        this.drawCombatEffects(ctx);
    }
}

/**
 * Utility functions for lifespan and combat system
 */
export class LifespanUtils {
    /**
     * Calculate age-based efficiency modifier
     * @param {number} age - Current age
     * @param {number} maxLifespan - Maximum lifespan
     * @returns {number} Efficiency modifier (0.0 to 1.0)
     */
    static calculateAgeEfficiency(age, maxLifespan) {
        const ageRatio = age / maxLifespan;
        
        if (ageRatio < 0.7) {
            return 1.0; // Full efficiency when young/middle-aged
        } else {
            const agingFactor = (ageRatio - 0.7) / 0.3;
            return Math.max(0.3, 1.0 - agingFactor * 0.7); // Decline to 30% minimum
        }
    }
    
    /**
     * Get health status description
     * @param {number} health - Current health
     * @param {number} maxHealth - Maximum health
     * @returns {string} Health status description
     */
    static getHealthStatus(health, maxHealth) {
        const healthPercent = health / maxHealth;
        
        if (healthPercent >= 0.9) return 'Healthy';
        if (healthPercent >= 0.7) return 'Bruised';
        if (healthPercent >= 0.5) return 'Wounded';
        if (healthPercent >= 0.3) return 'Badly Hurt';
        if (healthPercent > 0) return 'Critical';
        return 'Dead';
    }
    
    /**
     * Calculate combat power based on class and stats
     * @param {Object} dwarf - Dwarf to calculate power for
     * @returns {number} Combat power rating
     */
    static calculateCombatPower(dwarf) {
        if (!dwarf.combatStats) return 50;
        
        const basepower = 50;
        const attackBonus = (dwarf.combatStats.attack - 1) * 30;
        const defenseBonus = (dwarf.combatStats.defense - 1) * 20;
        const speedBonus = (dwarf.combatStats.speed - 1) * 10;
        
        return Math.floor(basepower + attackBonus + defenseBonus + speedBonus);
    }
}

export default LifespanCombatSystem;