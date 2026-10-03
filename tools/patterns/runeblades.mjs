// Compiler patterns for the Briar and Florian event decks. Every regex is anchored to the whole sentence.
// See tools/build-cards.mjs for the shape of each table.
let h;
export function init(helpers) { h = helpers; }
export const KW_LINES = {};
export const CONDS = [];
export const EFFECTS = [];
export const TRIGGERS = [];
export const STATICS = [];
export const ACTCONDS = [];
export const LABELS = [];
export const SPLIT = [];
export const COSTS = [];
export const LINES = [];
