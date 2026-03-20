(() => {
    const SOURCE_BUTTON_SELECTOR = '#tabs-right > button:nth-child(3)';
    const COPY_CODE_BUTTON_SELECTOR = 'body > div.ve-hwin > div.ve-hwin__wrp-table > table > tbody > tr > td > div > div > button.ve-btn.ve-btn-default.ve-btn-xs.ve-mb-1.ve-mr-2';
    const JSON_TEXT_SELECTOR = '.ve-hwin pre, .hwin pre';
    const ALLOWED_NPC_KEYS = new Set([
        'harmless_key', 'created', 'updated', 'name', 'source', 'avatar', 'storage_avatar', 'size', 'type', 'subtype', 'alignment',
        'environment', 'walk_speed', 'swim_speed', 'fly_speed', 'burrow_speed', 'climb_speed', 'languages', 'challenge_rating',
        'proficiency', 'friendly', 'player_id', 'armor_class', 'hit_points', 'hit_dice', 'senses', 'strength', 'dexterity',
        'constitution', 'intelligence', 'wisdom', 'charisma', 'saving_throws', 'skills', 'skills_expertise', 'skill_modifiers',
        'damage_vulnerabilities', 'damage_resistances', 'damage_immunities', 'condition_immunities', 'caster_ability', 'caster_level',
        'caster_save_dc', 'caster_spell_attack', 'caster_spell_slots', 'caster_spells', 'innate_ability', 'innate_save_dc',
        'innate_spell_attack', 'innate_spells', 'special_abilities', 'actions', 'legendary_count', 'legendary_actions', 'reactions'
    ]);
    const DEFAULT_SETTINGS = {
        autoCloseSourceModal: true,
    };

    let settings = { ...DEFAULT_SETTINGS };

    function loadSettings() {
        if (!chrome?.storage?.sync) {
            settings = { ...DEFAULT_SETTINGS };
            return Promise.resolve(settings);
        }

        return new Promise((resolve) => {
            chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
                settings = { ...DEFAULT_SETTINGS, ...result };
                resolve(settings);
            });
        });
    }

    function waitForElement(selector, timeoutMs = 2500, intervalMs = 50) {
        return new Promise((resolve) => {
            const started = Date.now();

            const tick = () => {
                const node = document.querySelector(selector);
                if (node) {
                    resolve(node);
                    return;
                }

                if (Date.now() - started >= timeoutMs) {
                    resolve(null);
                    return;
                }

                setTimeout(tick, intervalMs);
            };

            tick();
        });
    }

    function createMessageModal(title, message) {
        const existing = document.querySelector('#modal');
        if (existing) {
            existing.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'modal';
        modal.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 10';

        const modalContent = document.createElement('div');
        modalContent.style = 'color: #333; width: 500px; background: white; padding: 20px; border-radius: 5px; position: relative;';

        const modalTitle = document.createElement('h3');
        modalTitle.style = 'color: #333; margin-top: 0;';
        modalTitle.textContent = title;
        modalContent.appendChild(modalTitle);

        const body = document.createElement('p');
        body.textContent = message;
        modalContent.appendChild(body);

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style = 'color: black; border: none; border-radius: 3px 3px 0 0; cursor: pointer; position: absolute; top: 5px; right: 5px;';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        modalContent.appendChild(closeButton);

        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }
    
    function reAlignment(array) {
        if (!array) return;
        if (array.includes('NX') || array.includes('NY')) {
            addNonLoadableProperties('Alignment', 'Non-standard alignment');
            return;
        }
        let alignmentLetterKey = {
            "L": "Lawful",
            "N": "Neutral",
            "C": "Chaotic",
            "G": "good",
            "E": "evil",
            "U": "Unaligned",
            "A": "Any alignment",
        }
        let alignmentString = '';
        array.forEach((letter) => {
            if (alignmentString) {
                alignmentString += ' ';
            }
            alignmentString += alignmentLetterKey[letter];
        });
        return alignmentString;
    }
    
    function reSense(array) {
        if (!array) return
        let sensesObject = {};
        array.forEach((item) => {
            let splitItem = item.split(' ');
            let sense = splitItem[0];
            let range = splitItem[1];
            sensesObject[sense] = {
                [sense]: true,
                "range": Number(range),
                "comments": "",
            }
        });
        return sensesObject;
    }
    
    function getObjectKeys(object) {
        if (!object || typeof object !== 'object') return [];
        let array = [];
        for (let key in object) {
            array.push(key);
        }
        return array;
    }
    
    function reHitDice(string) {
        if (!string) return;
        return string.replace(/\+.*/, '').replace(/\s/g, '');
    }
    
    function reSpecialAbilities(array) {
        if (!array) return;
        let specialAbilitiesArray = [];
        array.forEach((ability) => {
            let specialAbility = {
                "name": removeRollCharacters(ability.name),
                "desc": removeRollCharacters(ability.entries[0]),
            }
            specialAbilitiesArray.push(specialAbility);
        });
        return specialAbilitiesArray;
    }
    
    function removeRollCharacters(string) {
        /***
         replace {@h} with "Hit:"
         replace {@hit 7} with "+7"
         replace {@damage 3d6} with "2d6"
         replace {@damage 3d6 + 4} with "3d6 + 4"
         replace {@dc 15} with " DC 15"
         replace {@atk ms,rs} with "Melee or Ranged Spell Attack"
         replace {@atk mw} with "Melee Weapon Attack"
         replace {@atk rw} with "Ranged Weapon Attack"
         replace {@condition conditionName} with "conditionName"
         replace {@spell spellName} with "spellName"
         */
        if (!string) return
        return string.replace(/{@hit (\d+)}/, '+$1')
            .replace(/{@damage (\d+d\d+)(\s?[+-]\s?\d+)?}/, '$1$2')
            .replace(/{@damage (\d+d\d+)(\s?[+-]\s?\d+)?(\s?[+-]\s?summonSpellLevel)?}/, '$1$2$3')
            .replace(/{@atk ms}/, 'Melee Spell Attack:')
            .replace(/{@atk rs}/, 'Ranged Spell Attack:')
            .replace(/{@atk ms,rs}/, 'Melee or Ranged Spell Attack:')
            .replace(/{@atkr m,r}/, 'Melee or Ranged Weapon Attack:')
            .replace(/{@atkr m}/, 'Melee Weapon Attack:')
            .replace(/{@atkr r}/, 'Ranged Weapon Attack:')
            .replace(/{@atk mw,rw}/, 'Melee or Ranged Weapon Attack:')
            .replace(/{@atk mw}/, 'Melee Weapon Attack:')
            .replace(/{@atk rw}/, 'Ranged Weapon Attack:')
            .replace(/{@dc (\d+)}/, ' DC $1')
            .replace(/{@h}/, 'Hit: ')
            .replace(/{@hitYourSpellAttack}/, 'your spell attack modifier')
            .replace(/{@recharge}/, '')
            .replace(/{@recharge (\d+)}/, '')
            .replace(/{@spell ([^}|]+)(?:\|[^}]+)?}/, '$1')
            .replace(/{@condition (\w+)}/, '$1')
            .trim();
    }
    
    function checkRecharge(string) {
        if (!string) return;
        let actionRecharge;
        if (string.includes('{@recharge}')) {
            actionRecharge = "6";
        } else if (string.includes('recharge')) {
            let rechargeKey = {
                "4": "4-6",
                "5": "5-6",
            }
            let recharge = string.match(/recharge (\d+)/);
            if (recharge) {
                actionRecharge = rechargeKey[recharge[1]];
            }
        }
        return actionRecharge;
    }
    
    function getAttackDistance(input, type) {
        if (!input) return;
        if (type === 'reach') {
            let reach = input.split('reach ')[1]?.split(' ')[0];
            if (reach) return Number(reach);
        }
        if (type === 'range') {
            let range = input.split('range ')[1]?.split(' ')[0];
            if (range) return range.toString();
            if (range) return range.toString();
        }
    }

    // function handleMultiattack(array) {
    //     let multiAttack = array[0];
    //     let multiAttackDesc = removeRollCharacters(multiAttack.entries[0]);
    //     let multiAttackArray = multiAttackDesc.split(', ');
    //     let multiAttackObject = {
    //         name: removeRollCharacters(multiAttack.name),
    //         desc: multiAttackDesc
    //     }
    // }
    
    function reActions(array) {
        if (!array || !array.length) return [];
        let actionsArray = [];
        array.forEach((action) => {
            let descString = removeRollCharacters(action.entries[0]);
            let sectionsArray = [];
            let attackType;
            if (!descString.includes('+') && action.entries.length === 1) { // Handle non-attack actions
                let actionObject = {
                    name: removeRollCharacters(action.name),
                    desc: removeRollCharacters(removeRollCharacters(action.entries[0])), // FIXME: Figure out why I have to run this function twice...one day haha
                    recharge: checkRecharge(action.name),
                    action_list: [{ type: 'other' }],
                }
                actionsArray.push(actionObject);
            } else if (!descString.includes('+') && action.entries.length > 1) { // Handle multi-part descriptions
                action.entries.forEach(entry => {
                    if (typeof entry === 'string') {
                        sectionsArray.push({
                            desc: removeRollCharacters(entry),
                        });
                    } else if (entry.type === 'list') {
                        entry.items.forEach(item => {
                            sectionsArray.push({
                                name: item.name,
                                desc: removeRollCharacters(item.entry),
                            });
                        })
                    } else {
                        console.error('Unknown entry type', entry);
                    }
                });
                let sectionsString = '';
                sectionsArray.forEach((section, index) => {
                    if (section.name) {
                        sectionsString += section.name + '\n';
                    }
                    sectionsString += section.desc + '\n';
                    if (index !== sectionsArray.length - 1) {
                        sectionsString += '\n';
                    }
                });
                actionsArray.push({
                    name: removeRollCharacters(action.name),
                    desc: removeRollCharacters(sectionsString),
                    recharge: checkRecharge(action.name),
                    action_list: [{ type: 'other' }],
                })
            } else { // Handle attack actions
                descString = removeRollCharacters(descString);
                var [type, reach, roll] = descString.split(',');
                if (!type || !reach || !roll) return;
                // console.table({
                //     type,
                //     reach,
                //     roll
                // })
                attackType = type.split('+')[0].trim();
                var attackBonusMatch = type.match(/\+\s*(-?\d+)/);
                var attackBonus = attackBonusMatch ? Number(attackBonusMatch[1]) : 0;
                var attackAverage = Number(roll.split('Hit: ')[1]?.split(' ')[0]) || 0;
                var targetCount = roll.split('target')[0].trim();
                var remainder = roll?.split(')')[1]?.trim();
                var damageType = remainder?.split(' ')[0];
                var damageDiceRoll = roll?.split('(')[1]?.split(')')[0];
                var dice = damageDiceRoll?.split(' +')[0];
                var diceCount = Number(dice?.split('d')[0]);
                var diceType = Number(dice?.split('d')[1]);
                var fixedValue = Number(damageDiceRoll?.split('+ ')[1]);
                
                // console.table({
                //     descString,
                //     attackBonus,
                //     attackType,
                //     attackAverage,
                //     targetCount,
                //     damageType,
                //     damageDiceRoll,
                //     dice,
                //     diceCount,
                //     diceType,
                //     fixedValue,
                //     remainder
                // })
                
                var attackRolls = createAttackRolls(damageType, diceCount, diceType, fixedValue);
                
                var actionList = createActionList(attackType, attackBonus, attackRolls);
                
                let actionObject = createActionObject(action, actionList, reach);
                
                actionsArray.push(actionObject);

                if (attackType === 'Melee or Ranged Weapon Attack') {
                    addNonLoadableProperties('Melee or Ranged Weapon Attack', 'Multi-type attacks are not currently supported');
                }
            }

            //   if (attackType === "Melee or Ranged Weapon Attack") {
            //         let meleeActionObject = {
            //               name: removeRollCharacters(action.name),
            //               desc: removeRollCharacters(action.entries[0]),
            //               reach: getAttackDistance(reach, 'reach'),
            //               action_list: [
            //                     {
            //                           "type": "melee_weapon",
            //                           "attack_bonus": attackBonus,
            //                           "rolls": attackRolls
            //                     }
            //               ],
            //         }
            //         actionsArray.push(meleeActionObject);
            //
            //         var rangedActionObject = {
            //               name: removeRollCharacters(action.name),
            //               desc: removeRollCharacters(action.entries[0]),
            //               range: getAttackDistance(reach, 'range'),
            //               action_list: [
            //                     {
            //                           "type": "ranged_weapon",
            //                           "attack_bonus": attackBonus,
            //                           "rolls": attackRolls
            //                     }
            //               ],
            //         }
            //         actionsArray.push(rangedActionObject);
            //   } else {
            //         let actionObject = {
            //               name: removeRollCharacters(action.name),
            //               desc: removeRollCharacters(action.entries[0]),
            //               reach: getAttackDistance(reach, 'reach'),
            //               range: getAttackDistance(reach, 'range'),
            //               action_list: actionList,
            //         }
            //         actionsArray.push(actionObject);
            //   }
        });
        // console.log('actionsArray before', actionsArray)
        // if (actionsArray[0].name === 'Multiattack') {
        //     let action_list = [];
        //     // add every entry in actionsArray to the action_list array except the first one then remove those entries from teh actionsArray
        //     for (let i = 1; i < actionsArray.length; i++) {
        //         action_list.push(actionsArray[i]);
        //         actionsArray = actionsArray.filter((item, index) => index !== i);
        //     }
        //     actionsArray[0].action_list = action_list;
        //     console.log('actionsArray after', actionsArray)

        // }
        return actionsArray;
    }
    
    function normalizeDamageType(value) {
        if (!value || typeof value !== 'string') {
            return undefined;
        }

        const normalized = value.toLowerCase().replace(/[^a-z_]/g, '');
        const validDamageTypes = new Set([
            'non_magical_bludgeoning',
            'non_magical_piercing',
            'non_magical_slashing',
            'bludgeoning',
            'piercing',
            'slashing',
            'acid',
            'cold',
            'fire',
            'force',
            'lightning',
            'necrotic',
            'poison',
            'psychic',
            'radiant',
            'thunder',
        ]);

        return validDamageTypes.has(normalized) ? normalized : undefined;
    }

    function createAttackRolls(damageType, diceCount, diceType, fixedValue) {
        const roll = {
            special: [],
            damage_type: normalizeDamageType(damageType),
            dice_count: Number.isFinite(diceCount) ? diceCount : 1,
            dice_type: Number.isFinite(diceType) ? diceType : 6,
            miss_mod: 0
        };

        if (Number.isFinite(fixedValue)) {
            roll.fixed_val = fixedValue;
        }

        return [roll];
    }
    
    function createActionObject(action, actionList, reach) {
        let obj = {
            name: removeRollCharacters(action.name),
            desc: removeRollCharacters(action.entries[0]),
            reach: getAttackDistance(reach, 'reach'),
            range: getAttackDistance(reach, 'range'),
            action_list: actionList,
        }
        
        return obj
    }
    
    function createActionList(attackType, attackBonus, attackRolls) {
        return [{
            type: reAttackType(attackType) || 'other',
            attack_bonus: attackBonus,
            rolls: attackRolls
        }]
    }
    
    function reAttackType(string) {
        let typeKeys = {
            "Melee Weapon Attack": "melee_weapon",
            "Ranged Weapon Attack": "ranged_weapon",
            "Melee or Ranged Spell Attack": "spell_attack",
            "Melee Spell Attack": "spell_attack",
            "Ranged Spell Attack": "spell_attack",
            "Melee or Ranged Weapon Attack": "melee_weapon",
        }
        for (let key in typeKeys) {
            if (string.includes(key)) {
                return typeKeys[key];
            }
        }
    }
    
    function reSize(array) {
        let sizeKey = {
            "T": "Tiny",
            "S": "Small",
            "M": "Medium",
            "L": "Large",
            "H": "Huge",
            "G": "Gargantuan",
        }
        return sizeKey[array[0]];
    }
    
    function reSavingThrows(array) {
        if (!array || typeof array !== 'object') return [];
        let statKey = {
            "str": "strength",
            "dex": "dexterity",
            "con": "constitution",
            "int": "intelligence",
            "wis": "wisdom",
            "cha": "charisma",
        }
        let savingThrowsArray = [];
        for (let key in array) {
            savingThrowsArray.push(statKey[key]);
        }
        return savingThrowsArray;
    }
    
    function reType(object) {
        if (typeof object === 'object') return capitalize(object.type);
        return capitalize(object);
    }
    
    function reFly(param) {
        if (typeof param === 'object') return param.number;
        return param;
    }
    
    function reChallengeRating(input, type) {
        if (!input) return;
        if (typeof input === 'string') {
            if (input.includes('/')) {
                let fraction = input.split('/');
                return Number(fraction[0]) / Number(fraction[1]);
            }
            return Number(input);
        } else if (typeof input === 'object') {
            addNonLoadableProperties(type, input.lair + ' (Lair)');
        }
        return Number(input.cr);
    }
    
    function reArmorClass(array) {
        let armorClass = array[0];
        if (!armorClass || typeof armorClass === 'object') {
            armorClass = array[0].ac
        }
        return armorClass;
    }
    
    function reResistances(input, type) {
        if (!input) return;
        let resistancesArray = [];
        input.forEach((item) => {
            if (typeof input === 'string') {
                input.push(item);
            } else if (typeof item === 'object') {
                let arr = item.resist
                let special = item.special
                if (!arr && special) {
                    resistancesArray.push(special);
                } else {
                    arr.forEach((item) => {
                        resistancesArray.push(item);
                    })
                    addNonLoadableProperties(type, item.note);
                }
            }
        })
        let resistanceTypes = [
            "non_magical_bludgeoning",
            "non_magical_piercing",
            "non_magical_slashing",
            "bludgeoning",
            "piercing",
            "slashing",
            "acid",
            "cold",
            "fire",
            "force",
            "lightning",
            "necrotic",
            "poison",
            "psychic",
            "radiant",
            "thunder"
        ]
        // if a value in resistancesArray does not match any of the resistanceTypes, add it to nonLoadableProperties and remove it from the array
        resistancesArray.forEach((resistance) => {
            if (!resistanceTypes.includes(resistance)) {
                addNonLoadableProperties(type, resistance);
                resistancesArray = resistancesArray.filter((item) => item !== resistance);
            }
        })
        return resistancesArray;
    }
    
    function getWalkSpeed(input, type) {
        if (typeof input === 'number') return input;
        if (typeof input === 'object') {
            addNonLoadableProperties(type, input.condition);
            return input.number;
        }
        return input;
    }
    
    function addNonLoadableProperties(type, content) {
        let property = type + ' - ' + content;
        if (!nonLoadableProperties.includes(property)) {
            nonLoadableProperties.push(property);
        }
    }
    
    function reDamageImmunities(input, type) {
        if (!input) return
        if (typeof input === 'string') {
            return input;
        } else if (input.length > 0) { // Array that may contain strings or objects
            let immunitiesArray = [];
            input.forEach((item) => {
                if (typeof item === 'string') {
                    immunitiesArray.push(item);
                } else if (typeof item === 'object') {
                    immunitiesArray = item.immune;
                    addNonLoadableProperties(type, item.note);
                }
            });
            return immunitiesArray;
        } else if (typeof input === 'object') {
            addNonLoadableProperties(type, input[0].note);
            return input[0].immune;
        }
    }
    
    function capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    function openJsonInNewTab(data) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }
    
    function closeJsonModal(modalEl) {
        if (!settings.autoCloseSourceModal) {
            return;
        }

        const scopedCloseButton = modalEl?.querySelector('span.glyphicon.glyphicon-remove[title*="Close"], .glyphicon.glyphicon-remove');
        if (scopedCloseButton) {
            scopedCloseButton.click();
            return;
        }

        const closeButton = document.querySelector('.ve-hwin span.glyphicon.glyphicon-remove[title*="Close"], span.ve-hwin__top-border-icon.glyphicon.glyphicon-remove[title*="Close"], .ve-hwin .glyphicon-remove, .hwin .glyphicon-remove');
        if (closeButton) {
            closeButton.click();
        }
    }
    
    async function copyJsonToClipboard(data) {
        const json = JSON.stringify(data, null, 2);
        await navigator.clipboard.writeText(json);
        closeJsonModal();
    }
    
    function restructureData(data) {
        const avatarEl = document.querySelector('#float-token img');

        return {
            name: data.name,
            hit_points: data.hp.average,
            hit_dice: reHitDice(data.hp.formula),
            size: reSize(data.size),
            type: reType(data.type),
            subtype: data.subtype,
            alignment: reAlignment(data.alignment),
            armor_class: reArmorClass(data.ac),
            walk_speed: getWalkSpeed(data.speed.walk, 'Walk Speed'),
            swim_speed: data.speed?.swim,
            fly_speed: reFly(data.speed?.fly),
            burrow_speed: data.speed?.burrow,
            climb_speed: data.speed?.climb,
            languages: data.languages,
            challenge_rating: reChallengeRating(data.cr, 'Challenge Rating'),
            proficiency: data.proficiency,
            friendly: data.friendly,
            senses: reSense(data.senses),
            strength: data.str,
            dexterity: data.dex,
            constitution: data.con,
            intelligence: data.int,
            wisdom: data.wis,
            charisma: data.cha,
            saving_throws: reSavingThrows(data.save),
            condition_immunities: data.conditionImmune,
            damage_resistances: reResistances(data.resist, 'Damage Resistances'),
            damage_immunities: reDamageImmunities(data.immune, 'Damage Immunities'),
            damage_vulnerabilities: data.vulnerable,
            special_abilities: reSpecialAbilities(data.trait),
            actions: reActions(data.action),
            skills: getObjectKeys(data.skill),
            avatar: avatarEl ? avatarEl.src : undefined,
        };
    }

    function normalizeNpcForSchema(rawNpc) {
        const now = Date.now();
        const validSizes = new Set(['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']);
        const validTypes = new Set([
            'Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon', 'Elemental', 'Fey', 'Fiend',
            'Giant', 'Humanoid', 'Monstrosity', 'Ooze', 'Plant', 'Swarm of tiny beasts', 'Undead'
        ]);
        const validAlignments = new Set([
            'Any', 'Any alignment', 'Unaligned', 'Lawful good', 'Neutral good', 'Chaotic good',
            'Lawful neutral', 'Neutral', 'Chaotic neutral', 'Lawful evil', 'Neutral evil', 'Chaotic evil'
        ]);
        const validAbilities = new Set(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']);
        const validSkills = new Set([
            'acrobatics', 'animal Handling', 'arcana', 'athletics', 'deception', 'history', 'insight',
            'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance',
            'persuasion', 'religion', 'sleight of Hand', 'stealth', 'survival'
        ]);
        const validActionTypes = new Set(['melee_weapon', 'ranged_weapon', 'spell_attack', 'save', 'damage', 'healing', 'other']);

        const normalizeSkillName = (skill) => {
            if (!skill || typeof skill !== 'string') {
                return undefined;
            }

            const key = skill.trim().toLowerCase();
            const skillMap = {
                'animal handling': 'animal Handling',
                'sleight of hand': 'sleight of Hand',
            };
            const normalized = skillMap[key] || key;
            return validSkills.has(normalized) ? normalized : undefined;
        };

        const sanitizeRoll = (roll) => {
            if (!roll || typeof roll !== 'object') {
                return null;
            }

            const cleaned = {};
            const damageType = normalizeDamageType(roll.damage_type);
            if (damageType) {
                cleaned.damage_type = damageType;
            }
            if (Number.isFinite(roll.dice_count)) {
                cleaned.dice_count = Math.max(1, Math.trunc(roll.dice_count));
            }
            if (Number.isFinite(roll.dice_type)) {
                cleaned.dice_type = Math.max(1, Math.trunc(roll.dice_type));
            }
            if (Number.isFinite(roll.fixed_val)) {
                cleaned.fixed_val = Math.trunc(roll.fixed_val);
            }
            if (Number.isFinite(roll.miss_mod)) {
                cleaned.miss_mod = roll.miss_mod;
            }
            if (Number.isFinite(roll.save_fail_mod)) {
                cleaned.save_fail_mod = roll.save_fail_mod;
            }
            if (Array.isArray(roll.special)) {
                cleaned.special = roll.special.filter((entry) => ['siphon_full', 'siphon_half', 'drain'].includes(entry));
            }

            return Object.keys(cleaned).length ? cleaned : null;
        };

        const sanitizeAction = (action) => {
            if (!action || typeof action !== 'object') {
                return null;
            }

            const cleaned = {
                name: typeof action.name === 'string' ? action.name.slice(0, 100) : undefined,
            };
            if (!cleaned.name) {
                return null;
            }

            if (typeof action.desc === 'string') {
                cleaned.desc = action.desc.slice(0, 5000);
            }
            if (typeof action.recharge === 'string' && /^[0-9]+(-[0-9]+)*$|rest$/.test(action.recharge)) {
                cleaned.recharge = action.recharge;
            }
            if (Number.isFinite(action.limit) && action.limit >= 1 && action.limit <= 9) {
                cleaned.limit = Math.trunc(action.limit);
            }
            if (typeof action.limit_type === 'string' && ['day', 'turn'].includes(action.limit_type)) {
                cleaned.limit_type = action.limit_type;
            }
            if (Number.isFinite(action.reach)) {
                cleaned.reach = Math.max(0, Math.trunc(action.reach));
            }
            if (typeof action.range === 'string' && /(^[0-9]+(\/[0-9]+)*$|^$)/.test(action.range)) {
                cleaned.range = action.range;
            }

            if (Array.isArray(action.action_list)) {
                const actionList = action.action_list
                    .slice(0, 1)
                    .map((entry) => {
                        if (!entry || typeof entry !== 'object') {
                            return null;
                        }
                        const actionEntry = {};
                        const mappedType = typeof entry.type === 'string' && validActionTypes.has(entry.type) ? entry.type : 'other';
                        actionEntry.type = mappedType;
                        if (Number.isFinite(entry.attack_bonus)) {
                            actionEntry.attack_bonus = Math.trunc(entry.attack_bonus);
                        }
                        if (typeof entry.save_ability === 'string' && validAbilities.has(entry.save_ability)) {
                            actionEntry.save_ability = entry.save_ability;
                        }
                        if (Number.isFinite(entry.save_dc)) {
                            actionEntry.save_dc = Math.trunc(entry.save_dc);
                        }
                        const sourceRolls = Array.isArray(entry.rolls) ? entry.rolls : (entry.rolls && typeof entry.rolls === 'object' ? [entry.rolls] : []);
                        const rolls = sourceRolls.map(sanitizeRoll).filter(Boolean);
                        if (rolls.length) {
                            actionEntry.rolls = rolls;
                        }
                        return Object.keys(actionEntry).length ? actionEntry : null;
                    })
                    .filter(Boolean);

                if (actionList.length) {
                    cleaned.action_list = actionList;
                }
            }

            return cleaned;
        };

        const normalized = {
            ...rawNpc,
            harmless_key: rawNpc.harmless_key || `${now}-${Math.random().toString(36).slice(2, 10)}`,
            created: Number.isInteger(rawNpc.created) ? rawNpc.created : now,
            updated: now,
            name: rawNpc.name || 'Unnamed Monster',
            size: validSizes.has(rawNpc.size) ? rawNpc.size : 'Medium',
            type: validTypes.has(rawNpc.type) ? rawNpc.type : 'Humanoid',
            alignment: validAlignments.has(rawNpc.alignment) ? rawNpc.alignment : undefined,
            challenge_rating: Number.isFinite(rawNpc.challenge_rating) ? rawNpc.challenge_rating : 0,
            armor_class: Number.isFinite(rawNpc.armor_class) ? Math.max(1, Math.trunc(rawNpc.armor_class)) : 10,
            hit_points: Number.isFinite(rawNpc.hit_points) ? Math.max(1, Math.trunc(rawNpc.hit_points)) : 1,
            strength: Number.isFinite(rawNpc.strength) ? Math.trunc(rawNpc.strength) : 10,
            dexterity: Number.isFinite(rawNpc.dexterity) ? Math.trunc(rawNpc.dexterity) : 10,
            constitution: Number.isFinite(rawNpc.constitution) ? Math.trunc(rawNpc.constitution) : 10,
            intelligence: Number.isFinite(rawNpc.intelligence) ? Math.trunc(rawNpc.intelligence) : 10,
            wisdom: Number.isFinite(rawNpc.wisdom) ? Math.trunc(rawNpc.wisdom) : 10,
            charisma: Number.isFinite(rawNpc.charisma) ? Math.trunc(rawNpc.charisma) : 10,
            saving_throws: Array.isArray(rawNpc.saving_throws) ? rawNpc.saving_throws.filter((a) => validAbilities.has(a)) : undefined,
            skills: Array.isArray(rawNpc.skills) ? rawNpc.skills.map(normalizeSkillName).filter(Boolean) : undefined,
            skills_expertise: Array.isArray(rawNpc.skills_expertise) ? rawNpc.skills_expertise.map(normalizeSkillName).filter(Boolean) : undefined,
            actions: Array.isArray(rawNpc.actions) ? rawNpc.actions.map(sanitizeAction).filter(Boolean) : undefined,
            special_abilities: Array.isArray(rawNpc.special_abilities) ? rawNpc.special_abilities.map(sanitizeAction).filter(Boolean) : undefined,
            reactions: Array.isArray(rawNpc.reactions) ? rawNpc.reactions.map(sanitizeAction).filter(Boolean) : undefined,
            legendary_actions: Array.isArray(rawNpc.legendary_actions) ? rawNpc.legendary_actions.map(sanitizeAction).filter(Boolean) : undefined,
        };

        const filtered = {};
        Object.entries(normalized).forEach(([key, value]) => {
            if (!ALLOWED_NPC_KEYS.has(key)) {
                return;
            }
            if (value === undefined || value === null) {
                return;
            }
            if (Array.isArray(value) && value.length === 0) {
                return;
            }
            filtered[key] = value;
        });

        return filtered;
    }

    async function getMonsterJsonFromModal() {
        const copyCodeButton = await waitForElement(COPY_CODE_BUTTON_SELECTOR, 2500, 50);
        if (copyCodeButton) {
            copyCodeButton.click();
        }

        const jsonNode = await waitForElement(JSON_TEXT_SELECTOR, 3000, 60);
        if (jsonNode?.textContent) {
            return {
                sourceJson: JSON.parse(jsonNode.textContent),
                modalEl: jsonNode.closest('.ve-hwin, .hwin'),
            };
        }

        if (navigator?.clipboard?.readText) {
            const clipboardText = await navigator.clipboard.readText();
            if (clipboardText) {
                return {
                    sourceJson: JSON.parse(clipboardText),
                    modalEl: document.querySelector('.ve-hwin, .hwin'),
                };
            }
        }

        throw new Error('Could not find monster JSON in the source modal.');
    }
    
    async function grabMonster() {
        const sourceButton = document.querySelector(SOURCE_BUTTON_SELECTOR);
        if (!sourceButton) {
            throw new Error('Could not find source button for selected monster.');
        }

        nonLoadableProperties = [];

        const event = new MouseEvent('click', {
            shiftKey: true,
            bubbles: true,
            cancelable: true,
        });
        sourceButton.dispatchEvent(event);

        const { sourceJson, modalEl } = await getMonsterJsonFromModal();
        const transformed = normalizeNpcForSchema(restructureData(sourceJson));
        closeJsonModal(modalEl);

        return {
            monster: transformed,
            warnings: [...nonLoadableProperties],
        };
    }
    
    let nonLoadableProperties = [];

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type !== 'captureMonster') {
            return undefined;
        }

        loadSettings().then(async () => {
            try {
                const result = await grabMonster();
                sendResponse({ ok: true, monster: result.monster, warnings: result.warnings });
            } catch (error) {
                const errorMessage = error?.message || 'Capture failed.';
                sendResponse({ ok: false, error: errorMessage });
            }
        });

        return true;
    });

    loadSettings();
})();