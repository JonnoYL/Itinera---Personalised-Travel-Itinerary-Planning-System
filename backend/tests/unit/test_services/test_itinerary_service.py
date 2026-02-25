import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from datetime import date, time
from types import SimpleNamespace
from application.itinerary_service import ItineraryService
from application.models.itinerary import ItineraryCreate, ItineraryUpdate


@pytest.fixture
def mock_repos():
    mock_itinerary_repo = MagicMock()
    mock_poi_service = MagicMock()
    mock_user_repo = MagicMock()
    mock_user_service = MagicMock()
    mock_poi_relationship_repo = MagicMock()
    mock_poi_relationship_service = MagicMock()
    service = ItineraryService(
        poi_service=mock_poi_service,
        poi_relationship_service=mock_poi_relationship_service,
        itinerary_repo=mock_itinerary_repo,
        user_service=mock_user_service
    )
    return service, mock_itinerary_repo, mock_poi_service, mock_poi_relationship_repo, mock_user_repo

def _itinerary_obj(
    *,
    id=1,
    user_id=1,
    name="Test",
    description="Description",
    date=date.today(),
    cover_photos=None,
    budget=100,
    start_time=time(9, 0, 0),
    end_time=time(18, 0, 0),
    start_lat=-33.84791615,
    start_long=151.0676002021898,
    start_name="Start",
    start_cat='Hotel',
    end_lat=None,
    end_long=None,
    end_name=None,
    end_cat='Hotel',
    categories=["Nature"],
    total_time=None,
    total_cost=None,
    total_distance=None,
    total_score=None,
    pois=[],
    user=None,
):
    return SimpleNamespace(
        id=id,
        user_id=user_id,
        name=name,
        description=description,
        date=date,
        cover_photos=None,
        budget=budget,
        start_time=start_time,
        end_time=end_time,
        start_lat=start_lat,
        start_long=start_long,
        start_name=start_name,
        start_cat='Hotel',
        end_lat=end_lat,
        end_long=end_long,
        end_name=end_name,
        end_cat=end_cat,
        categories=categories,
        total_time=None,
        total_cost=None,
        total_distance=None,
        total_score=None,
        pois=[],
        user=None,
    )

def _poi(
    *,
    id,
    name,
    longitude=151.2153,
    latitude=-33.8568,
    opening=time(8, 0, 0),
    closing=time(20, 0, 0),
    avg_visit=60,
    visit_cost=10.0,
    intrinsic=10.0,
    category=["Nature"],
    is_user_added=True
):
    return SimpleNamespace(
        id=id,
        name=name,
        longitude=longitude,
        latitude=latitude,
        opening_time=opening,
        closing_time=closing,
        avg_visit_time=avg_visit,
        visit_cost=visit_cost,
        intrinsic_score=intrinsic,
        category=category,
        is_user_added=is_user_added
    )

def _poi_relationship(*, from_id, to_id, distance_m, duration_s, profit, mode, category=None):
    """
    Create a simple mock POI relationship object for testing.
    """
    return SimpleNamespace(
        from_poi_id=from_id,
        to_poi_id=to_id,
        distance_m=distance_m,
        duration_s=duration_s,
        profit=profit,
        category=category,
        mode=mode
    )

# -------------- get_itinerary_by_id ----------------------
def test_get_itinerary_by_id_success(mock_repos):
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos
    itinerary_repo.get_itinerary_by_id.return_value = _itinerary_obj(id=1)
    out = service.get_itinerary_by_id(1)
    assert out.id == 1
    itinerary_repo.get_itinerary_by_id.assert_called_once()

def test_get_itinerary_by_id_not_found(mock_repos):
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos
    itinerary_repo.get_itinerary_by_id.return_value = None
    with pytest.raises(HTTPException) as exc:
        service.get_itinerary_by_id(1)
    assert exc.value.status_code == 404
    assert "Itinerary with ID 1 not found" in exc.value.detail

# -------------- create_itinerary ----------------------
def test_create_itinerary_success(mock_repos):
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos

    # mock user exists
    user_repo.get_user_by_id.return_value = {"user_id": 1, "username": "dev"}

    itinerary_request = ItineraryCreate(
        name="Day Trip in Sydney",
        description="One day itinerary just for fun",
        date=date.today(),
        cover_photos=None,
        budget=100.0,
        start_time=time(7, 0, 0),
        end_time=time(18, 0, 0),
        start_lat = -33.84791615,
        start_long = 151.0676002021898,
        start_name = 'Novotel',
        start_cat = "Hotel",
        categories=["Nature"],
        user_id=1
    )

    service.create_itinerary(itinerary_request)
    itinerary_repo.create_itinerary.assert_called_once()
    args, kwargs = itinerary_repo.create_itinerary.call_args
    assert args[0]["name"] == "Day Trip in Sydney"

def test_create_itinerary_invalid_budget(mock_repos):
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos

    # mock user exists
    user_repo.get_user_by_id.return_value = {"user_id": 1, "username": "dev"}

    itinerary_request = ItineraryCreate(
        name="Day Trip in Sydney",
        description="One day itinerary just for fun",
        date=date.today(),
        cover_photos=None,
        budget=-1,
        start_time=time(7, 0, 0),
        end_time=time(18, 0, 0),
        start_lat = -33.84791615,
        start_long = 151.0676002021898,
        start_name = 'Novotel',
        start_cat = "Hotel",
        categories=["Nature"],
        user_id=1
    )

    with pytest.raises(HTTPException) as exc:
        service.create_itinerary(itinerary_request)

    assert exc.value.status_code == 400
    assert "Budget cannot be less than 0" in exc.value.detail

def test_create_itinerary_invalid_date(mock_repos):
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos

    # mock user exists
    user_repo.get_user_by_id.return_value = {"user_id": 1, "username": "dev"}

    itinerary_request = ItineraryCreate(
        name="Day Trip in Sydney",
        description="One day itinerary just for fun",
        date=date(2025, 10, 19),
        cover_photos=None,
        budget=100.0,
        start_time=time(7, 0, 0),
        end_time=time(18, 0, 0),
        start_lat = -33.84791615,
        start_long = 151.0676002021898,
        start_name = 'Novotel',
        start_cat = "Hotel",
        categories=["Nature"],
        user_id=1
    )

    with pytest.raises(HTTPException) as exc:
        service.create_itinerary(itinerary_request)

    assert exc.value.status_code == 400
    assert "Date cannot be in the past" in exc.value.detail

def test_create_itinerary_invalid_end_time(mock_repos):
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos

    # mock user exists
    user_repo.get_user_by_id.return_value = {"user_id": 1, "username": "dev"}

    itinerary_request = ItineraryCreate(
        name="Day Trip in Sydney",
        description="One day itinerary just for fun",
        date=date.today(),
        cover_photos=None,
        budget=100.0,
        start_time=time(7, 0, 0),
        end_time=time(6, 0, 0),
        start_lat = -33.84791615,
        start_long = 151.0676002021898,
        start_name = 'Novotel',
        start_cat = "Hotel",
        categories=["Nature"],
        user_id=1
    )

    with pytest.raises(HTTPException) as exc:
        service.create_itinerary(itinerary_request)

    assert exc.value.status_code == 400
    assert "End time must be after start time" in exc.value.detail

def test_create_itinerary_invalid_user(mock_repos):
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos

    # mock user doesn't exist
    service.user_service.get_user_by_id.return_value = None

    itinerary_request = ItineraryCreate(
        name="Day Trip in Sydney",
        description="One day itinerary just for fun",
        date=date.today(),
        cover_photos=None,
        budget=100.0,
        start_time=time(7, 0, 0),
        end_time=time(18, 0, 0),
        start_lat = -33.84791615,
        start_long = 151.0676002021898,
        start_name = 'Novotel',
        start_cat = "Hotel",
        categories=["Nature"],
        user_id=2
    )

    with pytest.raises(HTTPException) as exc:
        service.create_itinerary(itinerary_request)

    assert exc.value.status_code == 404
    assert "User with ID 2 not found" in exc.value.detail

# -------------- generate_itinerary ----------------------
@patch("application.ors_service.requests.post")
def test_generate_itinerary_success(mock_post, mock_repos):
    """
    Confirms control flow and repo
    DOES NOT check actual computation details are correct
    """
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos

    base_itinerary = _itinerary_obj()
    # mock calling get_itinerary_by_id twice
    generated_itinerary = _itinerary_obj(id=1, name="generated")
    itinerary_repo.get_itinerary_by_id.side_effect = [base_itinerary, generated_itinerary]

    # include starting POI + one candidate POI
    start_poi = _poi(id=1, name="Start", visit_cost=0.0, intrinsic=5.0)
    candidate = _poi(id=2, name="Museum", visit_cost=10.0, intrinsic=20.0, avg_visit=30, is_user_added=False)
    end_poi = _poi(id=3, name="End", visit_cost=10.0, intrinsic=20.0, avg_visit=30)
    poi_service.get_all_pois.return_value = [start_poi, candidate, end_poi]

    service.poi_relationship_service.get_all_relationships.return_value = [
        _poi_relationship(from_id=1, to_id=2, distance_m=1000, duration_s=300, profit=20, mode="driving-car", category="Museum"),
        _poi_relationship(from_id=2, to_id=1, distance_m=1000, duration_s=300, profit=5, mode="driving-car", category="Nature"),
        _poi_relationship(from_id=1, to_id=3, distance_m=1000, duration_s=300, profit=5, mode="driving-car", category="Nature"),
        _poi_relationship(from_id=3, to_id=1, distance_m=1000, duration_s=300, profit=5, mode="driving-car", category="Nature"),
        _poi_relationship(from_id=2, to_id=3, distance_m=1000, duration_s=300, profit=5, mode="driving-car", category="Nature"),
    ]

    # mock API call
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "features": [{
            "properties": {
                "summary": {"distance": 1000, "duration": 300}
            },
            "geometry": {"type": "LineString", "coordinates": [[151.2153, -33.8568], [151.216, -33.857]]}
        }]
    }
    mock_post.return_value = mock_response

    out = service.generate_itinerary(1)

    # verify statistics are updated
    itinerary_repo.update_itinerary_stats.assert_called_once()

    # verify returns the second get_itinerary_by_id value
    assert out is generated_itinerary

# ---------- update_itinerary ----------
def test_update_itinerary_success(mock_repos):
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos

    # mock repository returning existing itinerary with budget $50
    itinerary_repo.get_itinerary_by_id.return_value = _itinerary_obj(budget=50.0)
    generated = _itinerary_obj(id=1, name="generated")

    service.generate_itinerary = MagicMock(return_value=generated)

    update_data = ItineraryUpdate(budget=100.0)
    result = service.update_itinerary(1, update_data)

    itinerary_repo.update_itinerary_fields.assert_called_once_with(1, update_data)
    service.generate_itinerary.assert_called_once_with(1)
    assert result == generated

def test_update_itinerary_end_before_start(mock_repos):
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos

    # mock repository returning existing itinerary with start time 8am and end time 6pm
    itinerary_repo.get_itinerary_by_id.return_value = _itinerary_obj(start_time=time(8, 0, 0), end_time=time(18, 0, 0))

    update_data = ItineraryUpdate(start_time=time(10, 0, 0), end_time=time(9, 0, 0))

    with pytest.raises(HTTPException) as exc:
        service.update_itinerary(1, update_data)
    assert exc.value.status_code == 400
    assert "End time must be after start time" in exc.value.detail
    itinerary_repo.update_itinerary_fields.assert_not_called()

def test_update_itinerary_generate_fail(mock_repos):
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos

    # mock repository returning existing itinerary with budget $50
    itinerary_repo.get_itinerary_by_id.return_value = _itinerary_obj(budget=50.0)

    update_data = ItineraryUpdate(budget=0)

    # mock generate itinerary failure
    service.generate_itinerary = MagicMock(
        side_effect=HTTPException(status_code=400, detail="Budget is too low to cover visiting and travel costs")
    )

    with pytest.raises(HTTPException) as exc:
        service.update_itinerary(1, update_data)

    # verify tried to update before failing
    itinerary_repo.update_itinerary_fields.assert_called_once_with(1, update_data)
    service.generate_itinerary.assert_called_once_with(1)
    assert exc.value.status_code == 400
    assert "Budget is too low" in exc.value.detail

# ---------- get_all_itineraries ----------
def test_get_all_itineraries_success(mock_repos):
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos

    # mock two itineraries returned
    itinerary_repo.get_all_itineraries.return_value = [
        _itinerary_obj(id=1),
        _itinerary_obj(id=2)
    ]

    out = service.get_all_itineraries()

    assert len(out) == 2
    assert out[0].id == 1
    assert out[1].id == 2
    itinerary_repo.get_all_itineraries.assert_called_once()

def test_get_all_itineraries_empty(mock_repos):
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos

    itinerary_repo.get_all_itineraries.return_value = []

    out = service.get_all_itineraries()

    assert out == []
    itinerary_repo.get_all_itineraries.assert_called_once()

# ---------- get_itineraries_by_user ----------
def test_get_itineraries_by_user_success(mock_repos):
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos

    itinerary_repo.get_itineraries_by_user.return_value = [
        _itinerary_obj(id=10, user_id=5),
        _itinerary_obj(id=11, user_id=5)
    ]

    out = service.get_itineraries_by_user(5)

    assert len(out) == 2
    assert out[0].user_id == 5
    assert out[1].user_id == 5
    itinerary_repo.get_itineraries_by_user.assert_called_once_with(5)

def test_get_itineraries_by_user_not_found(mock_repos):
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos

    itinerary_repo.get_itineraries_by_user.return_value = []
    out = service.get_itineraries_by_user(2)
    assert out == []
    itinerary_repo.get_itineraries_by_user.assert_called_once_with(2)

# ---------- delete_itinerary ----------
def test_delete_itinerary_success(mock_repos):
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos
    itinerary_repo.get_itinerary_by_id.return_value = _itinerary_obj(id=1)
    itinerary_repo.delete_itinerary.return_value = True
    assert service.delete_itinerary(1) is True
    itinerary_repo.delete_itinerary.assert_called_once_with(1)

def test_delete_itinerary_fail(mock_repos):
    service, itinerary_repo, poi_service, poi_relationship_repo, user_repo = mock_repos
    itinerary_repo.get_itinerary_by_id.return_value = _itinerary_obj(id=1)
    itinerary_repo.delete_itinerary.return_value = False
    with pytest.raises(HTTPException) as exc:
        service.delete_itinerary(1)
    assert exc.value.status_code == 500
    assert "Failed to delete itinerary" in exc.value.detail
