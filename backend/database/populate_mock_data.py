from datetime import time
from database.models.poi import POIDatabaseModel
from database.setup import SessionLocal
from application.poi_service import POIService
from application.poi_relationship_service import POIRelationshipService
from persistence.poi_relationship_repository import POIRelationshipRepository
from persistence.poi_repository import POIRepository
import pandas as pd


def populate_poi_data():
    db = SessionLocal()
    poi_repo = POIRepository(db)

    poi_path = './database/poi/SydneyPOIData.csv'
    pois_df = pd.read_csv(poi_path)

    pois = []
    for _, row in pois_df.iterrows():
        open_time_hours, open_time_mins = [int(x) for x in str(row['opening_time']).split(':')]
        close_time_hours, closing_time_mins = [int(x) for x in str(row['closing_time']).split(':')]
        opening_time = time(open_time_hours, open_time_mins)
        closing_time = time(close_time_hours, closing_time_mins)

        poi = POIDatabaseModel(
            name = row['poiName'],
            latitude = float(row['lat']),
            longitude = float(row['long']),
            category = row['category'].split('/'),
            avg_visit_time = int(row['avg_visit_time_min']),
            intrinsic_score = float(row['utility_score']),
            visit_cost = float(row['fees']),
            opening_time=opening_time,
            closing_time=closing_time
        )
        pois.append(poi)

    poi_repo.clear_all_pois()
    db.add_all(pois)
    db.commit()

    all_pois = poi_repo.get_all_pois()
    print(f"Populated database with {len(all_pois)} POIs from dataset")
    # for poi in all_pois:
    #     print(f"{poi.id}: {poi.name} ({poi.category})")

def populate_poi_relationship_data():
    print("Populating POI relationship data...")
    db = SessionLocal()
    poi_repo = POIRepository(db)
    poi_relationship_repo = POIRelationshipRepository(db)
    poi_service = POIService(poi_repo)
    poi_relationship_service = POIRelationshipService(poi_relationship_repo)

    poi_relationship_service.clear_all_relationships()
    all_pois = poi_service.get_all_pois()
    poi_relationship_service.create_poi_relationships(all_pois, "driving-car")

if __name__ == "__main__":
    populate_poi_data()
    populate_poi_relationship_data()
