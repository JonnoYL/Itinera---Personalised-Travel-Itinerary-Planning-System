from typing import List
from application.models.poi import POIResponse
from application.models.poi_relationship import POIRelationshipResponse
from database.models.poi import POIRelationshipModel
from persistence.poi_relationship_repository import POIRelationshipRepository
import requests
import os


API_KEY = os.getenv("ORS_API_KEY")
MATRIX_URL = "https://api.openrouteservice.org/v2/matrix"

class POIRelationshipService:
    def __init__(self, poi_relationship_repo: POIRelationshipRepository):
        self.poi_relationship_repo = poi_relationship_repo

    def create_poi_relationships(self, existing_pois: List[POIResponse], mode: str, new_start: POIResponse = None, new_end: POIResponse = None):
            """
            Calls the API Matrix endpoint to get real distances and durations between POIs for
            the specified mode of transport.

            If new_start/new_end are provided, only compute relationships involving those POIs.
            Otherwise, compute a full NxN matrix for all POIs (initial population).

            Inserts into each poi relationship in POI relationships table in the database.
            """

            headers = {
                "Authorization": API_KEY,
                "Content-Type": "application/json; charset=utf-8"
            }
            url = f"{MATRIX_URL}/{mode}"

            if new_start or new_end:
                print("Adding new relationship edges for new user-defined start/end POIs...")

                # Build ordered list so that new POIs come first
                new_pois = [p for p in (new_start, new_end) if p]
                req_list = new_pois + existing_pois
                coords = [[poi.longitude, poi.latitude] for poi in req_list]

                res = requests.post(
                    url,
                    headers=headers,
                    json={"locations": coords, "metrics": ["distance", "duration"]}
                )
                if not res.ok:
                    raise Exception(f"OpenRouteService API error: {res.status_code} - {res.text}")

                data = res.json()
                distances = data["distances"]
                durations = data["durations"]

                num_new = len(new_pois)

                relationships = []

                # new --> existing edges
                for src_idx, new_poi in enumerate(new_pois):
                    for j, to_poi in enumerate(existing_pois):
                        if new_poi != to_poi:
                            relationships.append(POIRelationshipModel(
                                from_poi_id=new_poi.id,
                                to_poi_id=to_poi.id,
                                distance_m=distances[src_idx][num_new + j],
                                duration_s=durations[src_idx][num_new + j],
                                profit=to_poi.intrinsic_score,
                                category=", ".join(to_poi.category) if isinstance(to_poi.category, list) else to_poi.category,
                                mode=mode
                            )
                        )

                # existing → new edges
                for j, from_poi in enumerate(existing_pois):
                    for src_idx, new_poi in enumerate(new_pois):
                        if from_poi != new_poi:
                            relationships.append(POIRelationshipModel(
                                from_poi_id=from_poi.id,
                                to_poi_id=new_poi.id,
                                distance_m=distances[num_new + j][src_idx],
                                duration_s=durations[num_new + j][src_idx],
                                profit=new_poi.intrinsic_score,
                                category=", ".join(new_poi.category) if isinstance(new_poi.category, list) else new_poi.category,
                                mode=mode
                            )
                        )

                # new → new edges (if multiple new POIs)
                if len(new_pois) > 1:
                    for i, from_poi in enumerate(new_pois):
                        for j, to_poi in enumerate(new_pois):
                            if i != j:
                                relationships.append(POIRelationshipModel(
                                    from_poi_id=from_poi.id,
                                    to_poi_id=to_poi.id,
                                    distance_m=distances[i][j],
                                    duration_s=durations[i][j],
                                    profit=to_poi.intrinsic_score,
                                    category=", ".join(to_poi.category) if isinstance(to_poi.category, list) else to_poi.category,
                                    mode=mode
                                )
                            )

                # for r in relationships:
                #     print(f"FROM: {r.from_poi_id}, TO: {r.to_poi_id}, dis: {r.distance_m}, dur: {r.duration_s}")
                self.poi_relationship_repo.create_all_relationships(relationships)
                print(f"Inserted {len(relationships)} new edges")
                return

            # Full matrix mode (done on population)
            coords = [[poi.longitude, poi.latitude] for poi in existing_pois]
            res = requests.post(
                url,
                headers=headers,
                json={"locations": coords, "metrics": ["distance", "duration"]}
            )
            if not res.ok:
                raise Exception(f"OpenRouteService API error: {res.status_code} - {res.text}")

            data = res.json()
            distances = data["distances"]
            durations = data["durations"]

            relationships = []
            for i, from_poi in enumerate(existing_pois):
                for j, to_poi in enumerate(existing_pois):
                    if i != j:
                        relationships.append(POIRelationshipModel(
                            from_poi_id = from_poi.id,
                            to_poi_id = to_poi.id,
                            distance_m = distances[i][j],
                            duration_s = durations[i][j],
                            profit = to_poi.intrinsic_score,
                            category = ", ".join(to_poi.category) if isinstance(to_poi.category, list) else to_poi.category,
                            mode = mode
                        )
                    )
            self.poi_relationship_repo.create_all_relationships(relationships)
            print(f"Inserted {len(relationships)} edges into POI relationship table")

    def get_all_relationships(self) -> List[POIRelationshipResponse]:
        """Retrieve all POI relationships from the database"""
        return self.poi_relationship_repo.get_all_relationships()

    def clear_all_relationships(self):
        """Clears all POI relationships from the database"""
        self.poi_relationship_repo.clear_all_relationships()
