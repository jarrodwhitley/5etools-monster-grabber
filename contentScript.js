(() => {
    // add a button to the page
    // add a <button> to the .wrp-stat-tab element
    const button = document.createElement('button');
    button.id = 'copyJson';
    button.textContent = 'Copy JSON';
    button.style = 'background-color: indianred; color: white; border: none; margin-left: 5px; border-radius: 3px 3px 0 0; cursor: pointer;';
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
        return string.replace(/{@hit (\d+)}/, '+$1')
            .replace(/{@damage (\d+d\d+)(\s?[+-]\s?\d+)?}/, '$1$2')
            .replace(/{@atk ms,rs}/, 'Melee or Ranged Spell Attack')
            .replace(/{@atk mw}/, 'Melee Weapon Attack')
            .replace(/{@atk rw}/, 'Ranged Weapon Attack')
            .replace(/{@dc (\d+)}/, ' DC $1')
            .replace(/{@h}/, 'Hit: ')
            .replace(/{@recharge (\d+)}/, 'Recharge $1-6')
            .replace(/{@damage (\d+d\d+)(\s?[+-]\s?\d+)?}/, '$1$2')
            .replace(/{@condition (\w+)}/, '$1')
            .replace(/{@spell (\w+)}/, '$1');
    }
    
    function reActions(array) {
        let actionsArray = [];
        array.forEach((action) => {
            let actionObject = {
                "name": removeRollCharacters(action.name),
                "desc": removeRollCharacters(action.entries[0]),
            }
            actionsArray.push(actionObject);
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
    
    function reResistances(array) {
        if (!array) return;
        return array.resist;
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
            "name": data.name,
            "hit_points": data.hp.average,
            "hit_dice": reHitDice(data.hp.formula),
            "size": reSize(data.size),
            "type": reType(data.type),
            "subtype": data.subtype,
            "alignment": reAlignment(data.alignment),
            "armor_class": reArmorClass(data.ac),
            "walk_speed": data.speed.walk,
            "swim_speed": data.speed?.swim,
            "fly_speed": reFly(data.speed?.fly),
            "burrow_speed": data.speed?.burrow,
            "climb_speed": data.speed?.climb,
            "languages": data.languages,
            "challenge_rating": reChallengeRating(data.cr),
            "proficiency": data.proficiency,
            "friendly": data.friendly,
            "senses": reSense(data.senses),
            "strength": data.str,
            "dexterity": data.dex,
            "constitution": data.con,
            "intelligence": data.int,
            "wisdom": data.wis,
            "charisma": data.cha,
            "saving_throws": reSavingThrows(data.save),
            "condition_immunities": data.conditionImmune,
            "damage_resistances": reResistances(data.resist),
            "damage_immunities": data.immune,
            "damage_vulnerabilities": data.vulnerable,
            "special_abilities": reSpecialAbilities(data.trait),
            "actions": reActions(data.action),
            "skills": getObjectKeys(data.skill),
            "avatar": document.querySelector('#float-token img').src,
        };
    }
    
    function grabMonster() {
        let event = new MouseEvent('click', {
            shiftKey: true,
        });
        document.querySelector('button[title*="Source"]').dispatchEvent(event);
        let data = JSON.parse(document.querySelector('.hwin pre').textContent);
        copyJsonToClipboard(restructureData(data));
        document.querySelector('#copyJson').style.width = document.querySelector('#copyJson').offsetWidth + 'px';
        document.querySelector('#copyJson').textContent = 'Copied!';
        document.querySelector('#copyJson').style.backgroundColor = '#5cb85c';
        setTimeout(() => {
            document.querySelector('#copyJson').textContent = 'Copy JSON';
            document.querySelector('#copyJson').style.backgroundColor = 'indianred';
        }, 2000);
    }
    
    document.querySelector('#copyJson').addEventListener('click', function () {
        grabMonster();
    });
})();