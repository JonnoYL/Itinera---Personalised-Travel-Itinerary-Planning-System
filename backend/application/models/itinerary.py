from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Any, Dict
from .poi import POIResponse
import datetime


# GeoJSON Models
class Geometry(BaseModel):
    type: str  # e.g. "Point", "LineString"
    coordinates: List[Any]

class Feature(BaseModel):
    type: str = "Feature"
    properties: Dict[str, Any]
    geometry: Geometry

class FeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[Feature]

class ItineraryCreate(BaseModel):
    name: str = Field(..., json_schema_extra="Day Trip in Sydney")
    description: str = Field(..., json_schema_extra="One day itinerary just for fun")
    date: datetime.date = Field(..., json_schema_extra="2025-10-21")
    cover_photos: Optional[List[str]] = Field(None, json_schema_extra=["https://example.com/sydney.jpg"])
    budget: float = Field(..., json_schema_extra=100.0)

    start_time: datetime.time = Field(..., json_schema_extra="06:42:38")
    end_time: datetime.time = Field(..., json_schema_extra="20:42:38")

    start_lat: float = Field(..., json_schema_extra=-33.8568)
    start_long: float = Field(..., json_schema_extra=151.2153)
    start_name: str = Field(..., json_schema_extra="Darling Harbour")
    start_cat: str = Field(..., json_schema_extra="Hotel")
    end_lat: Optional[float] = None
    end_long: Optional[float] = None
    end_name: Optional[str] = None
    end_cat: Optional[str] = None

    categories: Optional[List[str]] = Field(None, json_schema_extra=["Nature"])
    user_id: int = Field(..., json_schema_extra=2)

class ItineraryPOIResponse(BaseModel):
    """Represents one row in itinerary_pois table"""
    order_index: int
    arrival_time: datetime.time
    departure_time: datetime.time
    travel_time_from_prev: float
    travel_distance_from_prev: float
    poi: POIResponse

    class ConfigDict:
        from_attributes = True

class ItineraryResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: str
    date: datetime.date
    cover_photos: Optional[List[str]] = None
    budget: float
    start_time: datetime.time
    end_time: datetime.time
    start_name: str
    start_lat: float
    start_long: float
    start_cat: str
    end_name: Optional[str] = None
    end_lat: Optional[float] = None
    end_long: Optional[float] = None
    end_cat: Optional[str] = None
    categories: Optional[List[str]] = None

    total_time: Optional[float] = None
    total_cost: Optional[float] = None
    total_distance: Optional[float] = None
    total_score: Optional[float] = None

    pois: List[ItineraryPOIResponse] = []

    feature_collection: Optional[FeatureCollection] = None

    class ConfigDict:
        from_attributes = True

class ItineraryUpdate(BaseModel):
    """
    Model for itinerary updates (PATCH).
    Only allows updating start_time, end_time and budget.
    """
    start_time: Optional[datetime.time] = Field(None, json_schema_extra="07:42:38")
    end_time: Optional[datetime.time] = Field(None, json_schema_extra="19:42:38")
    budget: Optional[float] = Field(None, json_schema_extra={"example": 100.0})

    model_config = {
        "extra": "forbid"
    }
    @model_validator(mode="after")
    def at_least_one_field(self):
        if self.start_time is None and self.end_time is None and self.budget is None:
            raise ValueError("At least one field must be provided")
        return self
