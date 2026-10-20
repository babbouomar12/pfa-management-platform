from datetime import datetime, timezone
from app.policy import all_members_confirmed, capacity_reached


def test_capacity():
    assert capacity_reached(2, 2)
    assert not capacity_reached(1, 2)


def test_members():
    assert not all_members_confirmed([])
    assert not all_members_confirmed([{"confirmed_at": None}])
    assert all_members_confirmed([{"confirmed_at": datetime.now(timezone.utc)}])
