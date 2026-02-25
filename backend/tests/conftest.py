# from datetime import time/
import sys
import os

# import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, JSON
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import MagicMock, patch

# ensure /app is in sys.path so 'from application...' works
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_root not in sys.path:
    sys.path.append(project_root)

# from database.models.poi import POIDatabaseModel # noqa: E402
# from persistence.poi_repository import POIRepository # noqa: E402
from main import app # noqa: E402
from database.setup import Base, get_db # noqa: E402

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def adjust_sqlite_types(engine):
    if engine.url.get_backend_name() != "sqlite":
        return
    for table in Base.metadata.tables.values():
        table.schema = None
    for table in Base.metadata.tables.values():
        for column in table.columns:
            if str(column.type).startswith("ARRAY"):
                column.type = JSON()

app.dependency_overrides[get_db] = override_get_db
adjust_sqlite_types(engine)
Base.metadata.create_all(bind=engine)

@pytest.fixture(scope="function", autouse=True)
def reset_test_db():
    """Recreate all tables before each test in memory."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

# @pytest.fixture(scope="function", autouse=True)
# def seed_test_db(reset_test_db):
#     """
#     Seed the in-memory SQLite test DB with POI data from CSV.
#     """
#     db = TestingSessionLocal()
#     poi_repo = POIRepository(db)

#     poi_path = "backend/database/poi/SydneyPOIData.csv"
#     pois_df = pd.read_csv(poi_path)

#     pois = []

#     for _, row in pois_df.iterrows():
#         open_time_hours, open_time_mins = [int(x) for x in str(row['opening_time']).split(':')]
#         close_time_hours, closing_time_mins = [int(x) for x in str(row['closing_time']).split(':')]
#         opening_time = time(open_time_hours, open_time_mins)
#         closing_time = time(close_time_hours, closing_time_mins)

#         poi = POIDatabaseModel(
#             name = row['poiName'],
#             latitude = float(row['lat']),
#             longitude = float(row['long']),
#             category = row['category'].split('/'),
#             avg_visit_time = int(row['avg_visit_time_min']),
#             intrinsic_score = float(row['utility_score']),
#             visit_cost = float(row['fees']),
#             opening_time=opening_time,
#             closing_time=closing_time
#         )
#         pois.append(poi)

#     poi_repo.clear_all_pois()
#     db.add_all(pois)
#     db.commit()
#     db.close()

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

@pytest.fixture(autouse=True)
def mock_ors_requests():
    """Automatically mocks all OpenRouteService API calls (Matrix + Directions)."""
    with patch("application.ors_service.requests.post") as mock_post:
        def fake_post(url, *args, **kwargs):
            mock_response = MagicMock()
            mock_response.ok = True

            if "matrix" in url:
                # mock response for Matrix API
                coords = kwargs["json"]["locations"]
                n = len(coords)

                distances = [[(i + j) * 100 for j in range(n)] for i in range(n)]
                durations = [[(i + j) * 10 for j in range(n)] for i in range(n)]

                mock_response.json.return_value = {
                    "distances": distances,
                    "durations": durations
                }

            else:
                # mock response for Directions API
                mock_response.json.return_value = {
                    "type": "FeatureCollection",
                    "features": [{
                        "properties": {"summary": {"distance": 1000, "duration": 300}},
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [[151.2153, -33.8568], [151.216, -33.857]]
                        }
                    }]
                }
            return mock_response

        mock_post.side_effect = fake_post
        yield mock_post
