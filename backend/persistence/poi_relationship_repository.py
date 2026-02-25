from typing import List
from application.models.poi_relationship import POIRelationshipResponse
from database.database import POIRelationshipDatabase, POIRelationshipModel


class POIRelationshipRepository:
    def __init__(self, db):
        self.db_layer = POIRelationshipDatabase(db)

    def create_all_relationships(self, poi_relationships: List[POIRelationshipModel]) -> List[POIRelationshipModel]:
        """Creates all POI relationships"""
        return self.db_layer.create_relationships(poi_relationships)

    def get_all_relationships(self) -> List[POIRelationshipResponse]:
        """Retrieve all POI relationships"""
        database_responses = self.db_layer.get_all_relationships()
        return [POIRelationshipResponse.model_validate(rel, from_attributes=True) for rel in database_responses]

    def clear_all_relationships(self):
        """Clears all pois in database"""
        self.db_layer.clear_all_relationships()
