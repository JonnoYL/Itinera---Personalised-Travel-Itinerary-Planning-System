from typing import List
from application.models.poi import POIResponse
from application.poi_service import POIService
from database.setup import get_db
from fastapi import APIRouter, Depends
from persistence.poi_repository import POIRepository
from sqlalchemy.orm import Session


router = APIRouter(
    prefix="/pois",
    tags=["POIs"],
)

def get_service(db: Session):
    """Helper function to initialize repositories and service"""
    poi_repo = POIRepository(db)
    return POIService(poi_repo)

@router.get("/categories", response_model=List[str])
def get_poi_categories(db: Session = Depends(get_db)):
    """Returns all POI categories"""
    service = get_service(db)
    return service.get_poi_categories()

@router.get("", response_model=List[POIResponse])
def get_all_pois(db: Session = Depends(get_db)):
    """Returns all POIs"""
    service = get_service(db)
    return service.get_all_pois()

@router.get(
    "/{poi_id}",
    response_model=POIResponse,
    responses={404: {"description": "POI not found"}},
)

def get_poi_details(poi_id: int, db: Session = Depends(get_db)):
    """Returns specific POI by id"""
    service = get_service(db)
    return service.get_poi_by_id(poi_id)
