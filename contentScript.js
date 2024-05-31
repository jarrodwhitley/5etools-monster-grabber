(() => {
    const button = document.createElement('button');
    button.id = 'copyJson';
    button.textContent = 'Copy JSON';
    let buttonStyleStr = 'background: linear-gradient(to bottom, #ce0000, #8a0000); color: white; border: none; margin-left: 5px; border-radius: 3px 3px 0 0; cursor: pointer;';
    let buttonStyleStrGreen = 'background: linear-gradient(to bottom, #5cb85c, #366c36); color: white; border: none; margin-left: 5px; border-radius: 3px 3px 0 0; cursor: pointer;';
    button.style = buttonStyleStr;
    document.querySelector('.wrp-stat-tab').appendChild(button);
    
    function reAlignment(array) {
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
            .replace(/{@atk ms}/, 'Melee Spell Attack')
            .replace(/{@atk rs}/, 'Ranged Spell Attack')
            .replace(/{@atk ms,rs}/, 'Melee or Ranged Spell Attack')
            .replace(/{@atk mw,rw}/, 'Melee or Ranged Weapon Attack')
            .replace(/{@atk mw}/, 'Melee Weapon Attack')
            .replace(/{@atk rw}/, 'Ranged Weapon Attack')
            .replace(/{@dc (\d+)}/, ' DC $1')
            .replace(/{@h}/, 'Hit: ')
            .replace(/{@recharge (\d+)}/, '')
            .replace(/{@damage (\d+d\d+)(\s?[+-]\s?\d+)?}/, '$1$2')
            .replace(/{@spell (\w+)}/, '$1')
            .replace(/{@condition (\w+)}/, '$1')
            .trim();
    }
    
    function checkRecharge(string) {
        if (!string) return;
        let actionRecharge;
        if (string.includes('recharge')) {
            let rechargeKey = {
                "4": "4-6",
                "5": "5-6",
                "6": "6",
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
    
    function reActions(array) {
        let actionsArray = [];
        array.forEach((action) => {
            let descString = removeRollCharacters(action.entries[0]);
            let sectionsArray = [];
            if (!descString.includes('+') && action.entries.length === 1) { // Handle non-attack actions
                let actionObject = {
                    name: removeRollCharacters(action.name),
                    desc: removeRollCharacters(removeRollCharacters(action.entries[0])), // FIXME: Figure out why I have to run this function twice...one day haha
                    recharge: checkRecharge(action.name),
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
                    recharge: checkRecharge(action.name)
                })
                
            } else { // Handle attack actions
                descString = removeRollCharacters(descString);
                let [type, reach, roll] = descString.split(',');
                if (!type || !reach || !roll) return;
                let attackType = type.split('+')[0].trim();
                let attackBonus = type.split('+')[1]
                attackBonus = Number(attackBonus.split(' ')[0]);
                let attackAverage = Number(roll.split('Hit: ')[1]?.split(' ')[0]);
                let targetCount = roll.split('target')[0].trim();
                let remainder = roll.split(')')[1].trim();
                let damageType = remainder.split(' ')[0];
                let damageDiceRoll = roll.split('(')[1].split(')')[0];
                let dice = damageDiceRoll.split(' +')[0];
                let diceCount = Number(dice.split('d')[0]);
                let diceType = Number(dice.split('d')[1]);
                let fixedValue = Number(damageDiceRoll.split('+ ')[1]);
                
                // console.table({
                //     descString,
                //     attackBonus,
                //     attackType,
                //     attackReach,
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
                
                let typeKey = {
                    "Melee Weapon Attack": "melee_weapon",
                    "Ranged Weapon Attack": "ranged_weapon",
                    "Melee or Ranged Spell Attack": "melee_or_ranged_spell",
                }
                attackType = typeKey[attackType];
                
                let attackRolls = [
                    {
                        special: [],
                        damage_type: damageType,
                        dice_count: diceCount,
                        dice_type: diceType,
                        fixed_val: fixedValue,
                        miss_mod: 0
                    }]
                
                let actionList = [
                    {
                        "type": attackType,
                        "attack_bonus": attackBonus,
                        "rolls": attackRolls
                    }
                ]
                
                let actionObject = {
                    name: removeRollCharacters(action.name),
                    desc: removeRollCharacters(action.entries[0]),
                    reach: getAttackDistance(reach, 'reach'),
                    range: getAttackDistance(reach, 'range'),
                    action_list: actionList,
                }
                actionsArray.push(actionObject);
            }
            
        });
        return actionsArray;
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
    
    function reChallengeRating(string) {
        if (!string) return;
        if (string.includes('/')) {
            let fraction = string.split('/');
            return Number(fraction[0]) / Number(fraction[1]);
        }
        return Number(string);
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
    
    function closeJsonModal() {
        document.querySelector('.hwin .glyphicon-remove').click();
    }
    
    function copyJsonToClipboard(data) {
        const json = JSON.stringify(data, null, 2);
        navigator.clipboard.writeText(json);
        closeJsonModal();
    }
    
    function restructureData(data) {
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
            challenge_rating: reChallengeRating(data.cr),
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
            avatar: document.querySelector('#float-token img').src,
        };
    }
    
    function createNonLoadableModal(array) {
        let modal = document.createElement('div');
        modal.id = 'modal';
        modal.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 10';
        
        let modalContent = document.createElement('div');
        modalContent.style = 'color: #333; width: 500px; background: white; padding: 20px; border-radius: 5px; position: relative;';
        
        let modalTitle = document.createElement('h3');
        modalTitle.style = 'color: #333;';
        modalTitle.textContent = 'Non-loadable properties';
        modalContent.appendChild(modalTitle);
        
        let modalDescription = `<strong>The creature JSON data as been copied to your clipboard,</strong> but some data was not loadable. Please add these manually in Shieldmaiden.`;
        modalContent.innerHTML += modalDescription;
        
        let closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style = 'color: black; border: none; border-radius: 3px 3px 0 0; cursor: pointer; position: absolute; top: 5px; right: 5px;';
        closeButton.addEventListener('click', function () {
            document.body.removeChild(modal);
        });
        modalContent.appendChild(closeButton);
        
        let ul = document.createElement('ul');
        modalContent.appendChild(ul);
        array.forEach((property) => {
            let li = document.createElement('li');
            li.textContent = property;
            ul.appendChild(li);
        });
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }
    
    function grabMonster() {
        let event = new MouseEvent('click', {
            shiftKey: true,
        });
        document.querySelector('button[title*="Source"]').dispatchEvent(event);
        let data = JSON.parse(document.querySelector('.hwin pre').textContent);
        copyJsonToClipboard(restructureData(data));
        // openJsonInNewTab(restructureData(data));
        document.querySelector('#copyJson').style.width = document.querySelector('#copyJson').offsetWidth + 'px';
        document.querySelector('#copyJson').textContent = 'Copied!';
        document.querySelector('#copyJson').style.buttonStyleStrGreen;
        setTimeout(() => {
            document.querySelector('#copyJson').textContent = 'Copy JSON';
            document.querySelector('#copyJson').style.buttonStyleStr;
        }, 2000);
        
        // Modal for non-loadable properties
        if (nonLoadableProperties.length > 0) {
            createNonLoadableModal(nonLoadableProperties);
        }
    }
    
    let nonLoadableProperties = [];
    
    document.querySelector('#copyJson').addEventListener('click', function () {
        grabMonster();
    });
})();