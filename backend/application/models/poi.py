from datetime import time
from pydantic import BaseModel, ConfigDict


class POIResponse(BaseModel):
    id: int
    name: str
    longitude: float
    latitude: float
    opening_time: time
    closing_time: time
    category: list[str]
    intrinsic_score: float
    avg_visit_time: float
    visit_cost: float
    is_user_added: bool

    model_config = ConfigDict(from_attributes=True)
