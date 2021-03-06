import { getAbilityMods } from "./abilities.js";


function parseSpellcasting(text) {
  let spellcasting = "";
  const abilitySearch = "spellcasting ability is (\\w+) ";
  const match = text.match(abilitySearch);
  if (match) {
    spellcasting = match[1].toLowerCase().substr(0, 3);
  }
  return spellcasting;
}

function parseSpellLevel(text) {
  let spellLevel = "";
  const levelSearch = "is a (\\d+)(?:th|nd|rd|st)(?:-| )level spellcaster";
  const match = text.match(levelSearch);
  if (match) {
    spellLevel = parseInt(match[1]);
  }
  return spellLevel;
}

function parseSpelldc(text) {
  let dc = 10;
  const dcSearch = "spell\\s+save\\s+DC\\s*(\\d+)(?:,|\\)|\\s)";
  const match = text.match(dcSearch);
  // console.log("£££££")
  // console.log(match);
  if (match) {
    dc = parseInt(match[1]);
  }
  return dc;
}

function parseBonusSpellAttack(text, monster, DDB_CONFIG) {
  let spellAttackBonus = 0;
  const dcSearch = "([+-]\\d+)\\s+to\\s+hit\\s+with\\s+spell\\s+attacks";
  const match = text.match(dcSearch);
  if (match) {
    const toHit = match[1];
    const proficiencyBonus = DDB_CONFIG.challengeRatings.find((cr) => cr.id == monster.challengeRatingId).proficiencyBonus;
    const abilities = getAbilityMods(monster, DDB_CONFIG);
    const castingAbility = parseSpellcasting(text);
    spellAttackBonus = toHit - proficiencyBonus - abilities[castingAbility];
  }
  return spellAttackBonus;
}

function parseInnateSpells(text, spells, spellList) {
 // handle innate style spells here
  // 3/day each: charm person (as 5th-level spell), color spray, detect thoughts, hold person (as 3rd-level spell)
  // console.log(text);
  const innateSeatch = /^(\d+)\/(\w+)\s+each:\s+(.*$)"/;
  const innateMatch = text.match(innateSeatch);
  // console.log(innateMatch);
  if (innateMatch) {
    const spellArray = innateMatch[3].split(",").map((spell) => spell.split('(', 1)[0].trim());
    spellArray.forEach((spell) => {
      spellList.innate.push({ name: spell, type: innateMatch[2], value: innateMatch[1] });
    });
  }

  return [spells, spellList];

}

function parseSpells(text, spells, spellList) {
    // let = JSON.parse(JSON.stringify(spells));
    // console.log(text);


    const spellLevelSearch = "^(Cantrip|\\d)(?:st|th|nd|rd)?(?:\\s*level)?(?:s)?\\s+\\((at will|\\d)\\s*(?:slot|slots)?\\):\\s+(.*$)";
    // const spellLevelSearch = "^(Cantrip|\\d)";
    const match = text.match(spellLevelSearch);

    // console.log(match);

    if (!match) return parseInnateSpells(text, spells, spellList);

    const spellLevel = match[1];
    const slots = match[2];

    if (Number.isInteger(parseInt(spellLevel)) && Number.isInteger(parseInt(slots))) {
      spells[`spell${spellLevel}`]['value'] = slots;
      spells[`spell${spellLevel}`]['max'] = slots;
      const spellArray = match[3].split(",").map((spell) => spell.trim());
      spellList.class.push(...spellArray);
    } else if (slots == "at will") {
      // at will spells
      const spellArray = match[3].replace(/\*/g, '').split(",").map((spell) => spell.trim());
      spellList.atwill.push(...spellArray);
    }

    // console.log(spellList);

    return [spells, spellList];

}

// <p><em><strong>Innate Spellcasting.</strong></em> The oblex&rsquo;s innate spellcasting ability is Intelligence (spell save DC 15). It can innately cast the following spells, requiring no components:</p>\r\n<p>3/day each: charm person (as 5th-level spell), color spray, detect thoughts, hold person (as 3rd-level spell)</p>


export function getSpells(monster, DDB_CONFIG) {
  let spelldc = 10;
  // data.details.spellLevel (spellcasting level)
  let spellLevel = 0;
  let spellList = {
    class: [],
    atwill: [],
    // {name: "", type: "srt/lng/day", value: 0} // check these values
    innate: [],
  };

  // ability associated
  let spellcasting = "";
  let spellAttackBonus = 0;

  let spells = {
    "spell1": {
      "value": 0,
      "max": 0,
      "override": null
    },
    "spell2": {
      "value": 0,
      "max": 0,
      "override": null
    },
    "spell3": {
      "value": 0,
      "max": 0,
      "override": null
    },
    "spell4": {
      "value": 0,
      "max": 0,
      "override": null
    },
    "spell5": {
      "value": 0,
      "max": 0,
      "override": null
    },
    "spell6": {
      "value": 0,
      "max": 0,
      "override": null
    },
    "spell7": {
      "value": 0,
      "max": 0,
      "override": null
    },
    "spell8": {
      "value": 0,
      "max": 0,
      "override": null
    },
    "spell9": {
      "value": 0,
      "max": 0,
      "override": null
    },
    "pact": {
      "value": 0,
      "max": 0,
      "override": null,
      "level": 0
    }
  };

  let dom = new DocumentFragment();
  $.parseHTML(monster.specialTraitsDescription).forEach((element) => {
    dom.appendChild(element);
  });

  dom.childNodes.forEach((node) => {
    if (node.textContent == "\n") {
      dom.removeChild(node);
    }
  });

  dom.childNodes.forEach((node) => {
    const spellcastingMatch = node.textContent.trim().match(/^Spellcasting|Innate Spellcasting/);
    if (spellcastingMatch) {
      spellcasting = parseSpellcasting(node.textContent);
      spelldc = parseSpelldc(node.textContent);
      spellLevel = parseSpellLevel(node.textContent);
      spellAttackBonus = parseBonusSpellAttack(node.textContent, monster, DDB_CONFIG);
    }

    [spells, spellList] = parseSpells(node.textContent, spells, spellList);


  });


  // console.log("*****")

  const result = {
    spelldc: spelldc,
    spellcasting: spellcasting,
    spellLevel: spellLevel,
    spells: spells,
    spellList: spellList,
    spellAttackBonus: spellAttackBonus,
  };

  // console.log(JSON.stringify(result, null, 4));
  return result;

}

