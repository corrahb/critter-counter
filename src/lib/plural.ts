const IRREGULAR: Record<string, string> = {
  deer: "deer",
  moose: "moose",
  sheep: "sheep",
  fish: "fish",
  mouse: "mice",
  goose: "geese",
};

/** Pluralises the last word only, so "wild turkey" → "wild turkeys". */
export const plural = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  const last = parts.pop() || "";
  const lower = last.toLowerCase();
  let out: string;
  if (IRREGULAR[lower]) out = IRREGULAR[lower];
  else if (/[^aeiou]y$/i.test(last)) out = last.slice(0, -1) + "ies";
  else if (/(s|x|z|ch|sh)$/i.test(last)) out = last + "es";
  else if (/fe$/i.test(last)) out = last.slice(0, -2) + "ves";
  else if (/[^f]f$/i.test(last)) out = last.slice(0, -1) + "ves";
  else out = last + "s";
  return [...parts, out].join(" ");
};

/** countOf(2, "Rabbit") → "2 rabbits"; countOf(1, "Rabbit") → "1 rabbit". */
export const countOf = (n: number, name: string): string =>
  `${n} ${(n === 1 ? name : plural(name)).toLowerCase()}`;
