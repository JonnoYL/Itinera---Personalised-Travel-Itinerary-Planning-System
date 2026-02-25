from typing import List, Optional
from application.models.poi import POIResponse
from database.database import POIDatabase


class POIRepository:
    def __init__(self, db):
        self.db_layer = POIDatabase(db)

    def create_poi(self, poi_data: dict) -> POIResponse:
        """Insert a new poi into the database"""
        new_poi = self.db_layer.create_poi(poi_data)
        return POIResponse.model_validate(new_poi, from_attributes = True)

    def get_poi_by_id(self, poi_id: int) -> Optional[POIResponse]:
        """Get poi by ID - return None if not found"""
        database_response = self.db_layer.get_poi_by_id(poi_id)
        if database_response is None:
            return None
        return POIResponse.model_validate(database_response)

    def get_poi_by_coords(self, poi_lat: float, poi_long: float) -> Optional[POIResponse]:
        """Get poi by lat and long - return None if not found"""
        database_response = self.db_layer.get_poi_by_coords(poi_lat, poi_long)
        if database_response is None:
            return None
        return POIResponse.model_validate(database_response, from_attributes=True)

    def get_all_default_pois(self) -> List[POIResponse]:
        """Retrieve all pois that are NOT user added"""
        database_responses = self.db_layer.get_all_default_pois()
        return [POIResponse.model_validate(poi, from_attributes=True) for poi in database_responses]

    def get_all_pois(self) -> List[POIResponse]:
        """Retrieve all POIs"""
        database_responses = self.db_layer.get_all_pois()
        return [POIResponse.model_validate(poi, from_attributes=True) for poi in database_responses]

    def clear_all_pois(self):
        """Clears all pois in database"""
        self.db_layer.clear_all_pois()
