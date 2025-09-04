# Lifespan & Combat Auto-Save Integration Guide

## Overview

This guide explains how to integrate the enhanced AutoSaveSystem with the lifespan and combat mechanics for DorfFriend. The updated system now properly saves and restores:

- Dwarf lifespan data (age, max lifespan)
- Health system data (current health, max health)
- Combat statistics and states
- Death records and skull sprites
- Combat targeting relationships

## Quick Integration

### 1. Initialize Systems

```javascript
// Initialize auto-save system first
const autoSaveSystem = new AutoSaveSystem({
    gameId: 'dorfriend',
    version: '2.0.0',
    maxSlots: 5,
    autoSaveInterval: 30000, // 30 seconds
    compression: true
});

// Initialize reproduction system
const reproductionSystem = new ReproductionSystem(game, worldInterface, eventBus);

// Initialize lifespan integration
const lifespanIntegration = new DorfFriendLifespanIntegration(
    game, 
    reproductionSystem, 
    autoSaveSystem
);

// Store references on game object
game.autoSaveSystem = autoSaveSystem;
game.reproductionSystem = reproductionSystem;
game.lifespanIntegration = lifespanIntegration;
```

### 2. Start Auto-Save

```javascript
// Start automatic saving
autoSaveSystem.startAutoSave();

// Listen for save events
window.addEventListener('autosave', (event) => {
    const { type, success, slot } = event.detail;
    console.log(`Save event: ${type} on slot ${slot}, success: ${success}`);
});
```

### 3. Manual Save/Load

```javascript
// Manual save to slot 1
async function saveGame() {
    const success = await autoSaveSystem.saveToSlot(1, 'Manual Save');
    if (success) {
        console.log('Game saved successfully!');
    }
}

// Load from slot 1
async function loadGame() {
    const saveData = await autoSaveSystem.loadFromSlot(1);
    if (saveData) {
        const restored = autoSaveSystem.restoreSaveData(saveData, game);
        if (restored) {
            console.log('Game loaded successfully!');
            // Reinitialize systems after loading
            initializeExistingDwarfs();
        }
    }
}

// Reinitialize lifespan system for restored dwarfs
function initializeExistingDwarfs() {
    if (game.dwarfs) {
        game.dwarfs.forEach(dwarf => {
            if (!dwarf.maxLifespan) {
                game.lifespanIntegration.initializeDwarf(dwarf);
            }
        });
    }
}
```

## Enhanced Save Data Structure

The updated AutoSaveSystem now saves the following data:

### Dwarf Properties
```javascript
{
    // Basic properties
    name: "Dwarf_1",
    x: 100, y: 150,
    gender: "male",
    
    // Lifespan data
    maxLifespan: 45000,
    age: 12000,
    
    // Health data
    maxHealth: 105,
    health: 87,
    
    // Combat data
    combatStats: {
        attack: 12,
        defense: 8,
        accuracy: 85
    },
    attackCooldown: 0,
    isInCombat: false,
    combatTarget: "Enemy_Name", // or null
    lastAttacker: "Attacker_Name", // or null
    
    // Death data
    isDead: false,
    deathTime: null,
    deathCause: null,
    
    // All other existing properties...
}
```

### Lifespan System Data
```javascript
{
    lifespanSystem: {
        skulls: [
            {
                x: 120, y: 80,
                name: "DeadDwarf_1",
                deathTime: 15000,
                fadeTime: 5000,
                opacity: 0.8
            }
        ],
        stats: {
            totalDeaths: 5,
            deathsFromAge: 3,
            deathsFromCombat: 2,
            combatKills: 4,
            averageLifespan: 38500
        },
        config: {
            maxLifespan: 54000,
            minLifespan: 27000,
            maxHealth: 100,
            baseDamage: 20
            // ... other configuration values
        }
    }
}
```

## Advanced Usage

### Custom Serializers

You can add custom serializers for additional data:

```javascript
// Add custom serializer for special objects
autoSaveSystem.addSerializer('customObject', (obj) => {
    return {
        id: obj.id,
        customData: obj.customData,
        // Include only serializable properties
    };
});

// Add corresponding deserializer
autoSaveSystem.addDeserializer('customObject', (data, gameRef) => {
    const obj = new CustomObject(data.id);
    Object.assign(obj, data);
    return obj;
});
```

### Save Validation

The system includes validation to ensure save integrity:

```javascript
// Check if save data is valid before using
const saveData = await autoSaveSystem.loadFromSlot(2);
if (saveData) {
    // Data is automatically validated during load
    // Additional custom validation can be added here
    if (validateCustomData(saveData)) {
        autoSaveSystem.restoreSaveData(saveData, game);
    }
}

function validateCustomData(saveData) {
    // Custom validation logic
    return saveData.dwarfs && saveData.dwarfs.length > 0;
}
```

### Export/Import with Combat Data

```javascript
// Export save with all combat data
autoSaveSystem.exportSave(1, 'dorfriend_with_combat.json');

// Import from file
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.json';
fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
        const success = await autoSaveSystem.importSave(file, 2);
        if (success) {
            console.log('Combat save imported successfully!');
        }
    }
};
fileInput.click();
```

## Game Loop Integration

Update your main game loop to include the lifespan system:

```javascript
function gameLoop() {
    // Update reproduction system
    if (game.reproductionSystem) {
        game.reproductionSystem.update();
    }
    
    // Update lifespan and combat system
    if (game.lifespanIntegration) {
        game.lifespanIntegration.update();
    }
    
    // Auto-save runs automatically in background
    
    // Render everything
    render();
    
    requestAnimationFrame(gameLoop);
}

function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw dwarfs (includes health bars and combat effects)
    game.dwarfs.forEach(dwarf => drawDwarf(dwarf));
    
    // Draw lifespan system elements (skulls, health bars, etc.)
    if (game.lifespanIntegration) {
        game.lifespanIntegration.draw(ctx);
    }
}
```

## Debugging and Monitoring

### Save System Statistics
```javascript
// Get comprehensive save statistics
const stats = autoSaveSystem.getStatistics();
console.log('Save Stats:', stats);

// Get lifespan system statistics
const lifespanStats = game.lifespanIntegration.getStatistics();
console.log('Lifespan Stats:', lifespanStats);
```

### Combat Monitoring
```javascript
// Monitor combat events through reproduction event bus
game.reproductionSystem.eventBus.subscribe('combat_started', (event) => {
    console.log('Combat started:', event.data);
});

game.reproductionSystem.eventBus.subscribe('dwarf_died', (event) => {
    console.log('Dwarf died:', event.data);
});
```

### Save Slot Management
```javascript
// List all saves
const saveList = autoSaveSystem.getSaveList();
saveList.forEach(save => {
    console.log(`Slot ${save.slot}: ${save.description} (${new Date(save.timestamp)})`);
});

// Delete specific save
autoSaveSystem.deleteSave(3);

// Clear all saves (use with caution!)
SaveUtils.clearAllSaves('dorfriend');
```

## Migration from Old Saves

If you have existing saves without lifespan data:

```javascript
async function migrateOldSave(slot) {
    const saveData = await autoSaveSystem.loadFromSlot(slot);
    if (saveData && saveData.dwarfs) {
        // Initialize lifespan data for all dwarfs
        saveData.dwarfs.forEach(dwarfData => {
            if (!dwarfData.maxLifespan) {
                // Add default lifespan values
                dwarfData.maxLifespan = 30000 + Math.random() * 24000;
                dwarfData.age = Math.random() * dwarfData.maxLifespan * 0.5;
                dwarfData.maxHealth = 90 + Math.random() * 20;
                dwarfData.health = dwarfData.maxHealth;
                dwarfData.combatStats = {
                    attack: 8 + Math.random() * 8,
                    defense: 6 + Math.random() * 6,
                    accuracy: 70 + Math.random() * 20
                };
            }
        });
        
        // Re-save with lifespan data
        await autoSaveSystem.saveToSlot(slot, 'Migrated Save');
        console.log('Save migrated to include lifespan data');
    }
}
```

## Performance Considerations

- The enhanced save system includes compression to minimize localStorage usage
- Combat target references are restored asynchronously to avoid circular dependency issues
- Dead dwarfs are automatically filtered from the game array during updates
- Skull sprites have automatic cleanup after fade completion

## Troubleshooting

### Common Issues

1. **Combat targets not restored**: Ensure dwarfs are loaded before attempting to restore combat references
2. **Health not displaying**: Check that the lifespan integration draw method is called in your render loop
3. **Saves corrupted**: The system includes validation - corrupted saves will fail to load safely

### Debug Commands

```javascript
// Force save validation
const isValid = autoSaveSystem.validateSaveData(saveObject);

// Check storage usage
const usage = SaveUtils.getStorageUsage('dorfriend');
console.log('Storage usage:', usage);

// Force combat between two dwarfs (testing)
game.lifespanIntegration.forceCombat(dwarf1, dwarf2);

// Heal dwarf (testing)
game.lifespanIntegration.healDwarf(dwarf, 50);
```

The enhanced AutoSaveSystem is now fully integrated with the lifespan and combat mechanics, providing robust save/load functionality that preserves all game state including health, combat, and aging data.