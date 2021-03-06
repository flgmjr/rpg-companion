import { Dice } from "../models/dice";
import { store } from "../store";
import { attributeBonusCalc } from "../helpers/attribute-bonus";
import { levelDamageMultiplier } from "../enums/skill-constants";
import { observable, decorate, action } from "mobx";

class SkillUsage {
  constructor (skill) {
    this.skill = skill;

    this.finalCost = 0;
    this.resultingValue = 0;
    this.message = "";

    this.baseCost = 0;

    this.cost = 0;
    this.damage = 0;

    this.roundsHeld = 0;
    this.usageCritical = false;
    this.attackCritical = false;
    this.inUse = false;
    this.critThreshold = 0.95; // percentage
    this.resultingValue = 0;
  }

  use() {
    if (this.inUse) return;

    this.inUse = true;

    this.setCost();
    this.setDamage();
    
    if (this.skill.activation !== "charge" && this.skill.activation !== "toggle") this.endUsage();
  }

  addRound () {
    this.roundsHeld += 1;
    this.cost = this.baseCost * this.roundsHeld;

    if (this.skill.activation === "toggle") {
      store.activeValues.decreaseValue("currentEnergy", this.baseCost);
      this.resultingValue = this.calculateResult();
    }
  }

  endUsage() {
    this.inUse = false;
    if (this.skill.activation !== "toggle") store.activeValues.decreaseValue("currentEnergy", this.cost);

    this.resultingValue = this.calculateResult();
  }

  calculateResult () {
    const damage = this.damage;
  
    const effectiveness = this.usageCritical ?
      this.getEffectiveness() : this.getEffectiveness() * 2;

    let finalEffectiveness = effectiveness;
    if (!this.skill.activation === "toggle" && !this.skill.activation === "charge") {
      finalEffectiveness *= this.roundsHeld;
    }

    const damageFormula = ((finalEffectiveness) + damage) * levelDamageMultiplier[this.skill.level];

    return Math.ceil(this.skill.calculateDamage(damageFormula, 1, false)); // Todo: Add inputs for these
  }

  getEffectiveness() {
    return this.baseCost + attributeBonusCalc(store.character.getModifiedAttribute("hability"));
  }

  setDamage() {
    if (this.skill.type !== "attack") return;

    const dice = new Dice();
    this.maxAttributeRoll = store.character.getModifiedAttribute(this.skill.auxiliaryAttribute);
    this.damageRoll = dice.rollD(this.maxAttributeRoll);

    if (this.damageRoll >= this.maxAttributeRoll * this.critThreshold) {
      this.attackCritical = true;
    }

    const critMultiplier = this.attackCritical ? 2 : 1;

    this.damage = Math.ceil((this.damageRoll + attributeBonusCalc(this.maxAttributeRoll)) * critMultiplier);
  }

  setCost () {
    const dice = new Dice();
    this.skillUsageRoll = dice.rollD(4);

    if (this.skillUsageRoll >= 4) {
      this.usageCritical = true;
    }

    this.baseCost = this.skillUsageRoll + this.skill.level;
    this.cost = this.baseCost;
  }

  critText() {
    const magicCrit = "_Crítico Mágico!_";
    const attributeCrit = "_Crítico de Atributo!_";

    const completeCrit = "_CRÍTICO COMPLETO!_";

    if (this.usageCritical && this.attackCritical) return completeCrit;

    if (this.attackCritical) return attributeCrit;

    if (this.usageCritical) return magicCrit;

    return "";
  }

  toggleRoundMessage () {
    const title = `**${store.character.name}** manteve **${this.skill.name}** (lvl.${this.skill.level}) ativado! ${this.critText()}`
    const habilityDice = `Rolagem de Habilidade d4[${this.skillUsageRoll}]`;
    const damageDice = this.damageDicePhrase();
    const cost = `> Custo Total: ${this.cost}Ep`;
    const roundCost = `> Custo do Round: ${this.baseCost}Ep`
    const finalValue = `> Resultado: **${this.resultingValue}**`;
    const text = this.skill.description.replace("@resultado", `**${this.resultingValue}**`);
    
    return `${title}\n${cost}\n${roundCost}\n${finalValue}\n> Descrição: ${text} \n ------------ \n ${habilityDice} \n ${damageDice}`
  }

  message () {
    const title = `**${store.character.name}** usou **${this.skill.name}** (lvl.${this.skill.level})! ${this.critText()}`
    const habilityDice = `Rolagem de Habilidade d4[${this.skillUsageRoll}]`;
    const damageDice = this.damageDicePhrase();
    const cost = `> Custo: ${this.cost}`;
    const finalValue = `> Resultado: **${this.resultingValue}**`;
    const text = this.skill.description.replace("@resultado", `**${this.resultingValue}**`);
    
    return `${title}\n${cost}\n${finalValue}\n> Descrição: ${text} \n ------------ \n ${habilityDice} \n ${damageDice}`
  }
}

export default decorate(SkillUsage, {
  baseCost: observable,
  cost: observable,
  damage: observable,
  roundsHeld: observable,
  usageCritical: observable,
  attackCritical: observable,
  inUse: observable,
  critThreshold: observable,
  resultingValue: observable,
  use: action,
  addRound: action,
  endUsage: action
})
