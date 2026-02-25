from pydantic import BaseModel
from typing import Optional


class POIRelationshipResponse(BaseModel):
    id: int
    from_poi_id: int
    to_poi_id: int
    distance_m: float
    duration_s: float
    profit: float
    category: Optional[str] = None
    mode: str

    class ConfigDict:
        from_attributes = True
