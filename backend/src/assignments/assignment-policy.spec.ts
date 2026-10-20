import { allMembersConfirmed, capacityReached } from './assignment-policy';

describe('UC06 — règles métier élémentaires', () => {
  it('rejette une affectation lorsque la capacité est atteinte', () => {
    expect(capacityReached(2, 2)).toBe(true);
    expect(capacityReached(1, 2)).toBe(false);
  });

  it('exige un groupe non vide et tous ses membres confirmés', () => {
    const confirmed = { confirmedAt: new Date('2026-10-01T10:00:00Z') };
    expect(allMembersConfirmed([])).toBe(false);
    expect(allMembersConfirmed([confirmed, { confirmedAt: null }])).toBe(false);
    expect(allMembersConfirmed([confirmed, confirmed])).toBe(true);
  });
});
