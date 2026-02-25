from typing import List, Optional
from application.models.poi import POIResponse
from fastapi import HTTPException
from persistence.poi_repository import POIRepository


class POIService:
    def __init__(self, poi_repo: POIRepository):
        self.poi_repo = poi_repo

    def create_poi(self, poi_dict) -> Optional[POIResponse]:
        """Creates a POI or returns existing POI if already in database"""
        existing = self.poi_repo.get_poi_by_coords(poi_dict['latitude'], poi_dict['longitude'])
        if existing:
            return None
        return self.poi_repo.create_poi(poi_dict)

    def get_all_pois(self) -> List[POIResponse]:
        """Retrieve all pois"""
        return self.poi_repo.get_all_pois()

    def get_all_default_pois(self) -> List[POIResponse]:
        """Retrieve all pois that are NOT user added"""
        return self.poi_repo.get_all_default_pois()

    def get_poi_by_id(self, poi_id: int) -> POIResponse:
        """Get poi by ID"""
        poi = self.poi_repo.get_poi_by_id(poi_id)
        if not poi:
            raise HTTPException(
                status_code=404, detail=f"POI with ID {poi_id} not found"
            )
        return poi

    def get_poi_categories(self) -> List[str]:
        """Retrieves all poi categories for pois that are NOT user added"""
        all_pois = self.get_all_default_pois()
        return list({category for poi in all_pois for category in poi.category})
