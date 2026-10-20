def all_members_confirmed(members: list[dict]) -> bool:
    return bool(members) and all(member["confirmed_at"] is not None for member in members)


def capacity_reached(current: int, maximum: int) -> bool:
    return current >= maximum
