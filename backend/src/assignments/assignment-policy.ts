/** Règles pures : testables sans base et réutilisées par le service. */
export function capacityReached(currentPfa: number, maxPfa: number): boolean {
  return currentPfa >= maxPfa;
}

export function allMembersConfirmed(
  members: ReadonlyArray<{ confirmedAt: Date | null }>,
): boolean {
  return members.length > 0 && members.every((m) => m.confirmedAt !== null);
}
