from typing import List, Optional
from application.models.itinerary import ItineraryResponse
from database.database import ItineraryDatabase


class ItineraryRepository:
    def __init__(self, db):
        self.db_layer = ItineraryDatabase(db)

    def create_itinerary(self, itinerary_dict: dict) -> ItineraryResponse:
        """Insert a new itinerary into the database"""
        new_itinerary = self.db_layer.create_itinerary(itinerary_dict)
        return ItineraryResponse.model_validate(new_itinerary, from_attributes = True)

    def get_itinerary_by_id(self, itinerary_id: int) -> Optional[ItineraryResponse]:
        """Get itinerary by ID - return None if not found"""
        database_response = self.db_layer.get_itinerary_by_id(itinerary_id)
        if database_response is None:
            return None
        return ItineraryResponse.model_validate(database_response, from_attributes = True)

    def get_itineraries_by_user(self, user_id: int) -> Optional[List[ItineraryResponse]]:
        """Get all user's itineraries - return None if not found"""
        database_response = self.db_layer.get_itineraries_by_user(user_id)
        return [
            ItineraryResponse.model_validate(itinerary, from_attributes = True)
            for itinerary in database_response
        ]

    def get_all_itineraries(self) -> List[ItineraryResponse]:
        """Retrieve all itineraries"""
        database_responses = self.db_layer.get_all_itineraries()
        return [
            ItineraryResponse.model_validate(itinerary, from_attributes = True)
            for itinerary in database_responses
        ]

    def add_pois_to_itinerary(self, itinerary_id: int, poi_ids: List[int]):
        """Add pois to existing itinerary in order"""
        self.db_layer.add_pois_to_itinerary(itinerary_id, poi_ids)

    def get_itinerary_pois(self, itinerary_id: int) -> List[int]:
        """Returns list of POI ids in order for queried itinerary"""
        pois = self.db_layer.get_itinerary_pois(itinerary_id)
        return [link.poi_id for link in pois]

    def update_itinerary_stats(
        self,
        itinerary_id: int,
        total_time: float,
        total_cost: float,
        total_distance: float,
        total_score: float,
        poi_ids: List[int] | None = None,
        feature_collection: dict | None = None,
    ) -> ItineraryResponse:
        """Updates itinerary summary fields, optional POI order, and FeatureCollection."""

        updated_itinerary = self.db_layer.update_itinerary_stats(
            itinerary_id, total_time, total_cost, total_distance, total_score, poi_ids, feature_collection
        )

        if not updated_itinerary:
            return None
        return ItineraryResponse.model_validate(updated_itinerary, from_attributes=True)

    def delete_itinerary(self, itinerary_id: int) -> bool:
        """Delete itinerary by ID"""
        return self.db_layer.delete_itinerary(itinerary_id)

    def update_itinerary_fields(self, itinerary_id: int, update_data):
        """Update itinerary fields"""
        self.db_layer.update_itinerary_fields(itinerary_id, update_data)
