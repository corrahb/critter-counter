/**
 * Collision-proof walk ids. The prototype used Date.now(), which collides
 * if two walks save in the same millisecond and is the React key + delete
 * handle. Timestamp keeps rough sortability; counter + random break ties.
 */
let counter = 0;

export function newWalkId(): string {
  counter = (counter + 1) % 46656; // 36^3
  return `w${Date.now().toString(36)}${counter.toString(36).padStart(3, "0")}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}
