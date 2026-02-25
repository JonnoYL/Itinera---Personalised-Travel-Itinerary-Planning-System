from fastapi import APIRouter, Depends, HTTPException
from persistence.poi_relationship_repository import POIRelationshipRepository
from sqlalchemy.orm import Session
from typing import List
from database.setup import get_db
from persistence.itinerary_repository import ItineraryRepository
from persistence.user_repository import UserRepository
from persistence.poi_repository import POIRepository
from application.poi_service import POIService
from application.poi_relationship_service import POIRelationshipService
from application.user_service import UserService
from application.itinerary_service import ItineraryService
from application.models.itinerary import ItineraryCreate, ItineraryResponse, ItineraryUpdate
from pydantic import BaseModel
from presentation.dependencies.auth import get_current_user


router = APIRouter(
    prefix="/itineraries",
    tags=["Itineraries"],
)

class ErrorMessage(BaseModel):
    detail: str

def get_service(db: Session):
    """Helper function to initialize repositories and service"""
    user_repo = UserRepository(db)
    user_service = UserService(user_repo)
    itinerary_repo = ItineraryRepository(db)
    poi_repo = POIRepository(db)
    poi_relationship_repo = POIRelationshipRepository(db)
    poi_service = POIService(poi_repo)
    poi_relationship_service = POIRelationshipService(poi_relationship_repo)
    return ItineraryService(poi_service, poi_relationship_service, itinerary_repo, user_service)

@router.post(
    "",
    response_model=ItineraryResponse,
    responses = {
        400: {"description": "Invalid input"}
    }
)

def create_itinerary(itinerary_request: ItineraryCreate, db: Session = Depends(get_db)):
    """
    Creates a new itinerary with user-provided constraints.
    DOES NOT COMPUTE THE ROUTE
    """
    service = get_service(db)
    return service.create_itinerary(itinerary_request)

@router.get("", response_model=List[ItineraryResponse])
def get_all_itineraries(db: Session = Depends(get_db)):
    """Returns all itineraries"""
    service = get_service(db)
    return service.get_all_itineraries()

@router.get(
    "/user",
    response_model=List[ItineraryResponse],
    responses={404: {"description": "User has no itineraries"}},
)

def get_itineraries_by_user(db: Session = Depends(get_db), curr_user = Depends(get_current_user)):
    """Retrieve all user's itineraries"""
    service = get_service(db)
    return service.get_itineraries_by_user(curr_user.user_id)

@router.get(
    "/{itinerary_id}",
    response_model=ItineraryResponse,
    responses={404: {"description": "Itinerary not found"}},
)

def get_itinerary_by_id(itinerary_id: int, db: Session = Depends(get_db)):
    """Retrieve a specific itinerary by ID"""
    service = get_service(db)
    return service.get_itinerary_by_id(itinerary_id)

@router.post("/{itinerary_id}/generate", response_model=ItineraryResponse)
def generate_itinerary(itinerary_id: int, db: Session = Depends(get_db)):
    """Given an itinerary ID, generate the optimised route"""
    service = get_service(db)
    return service.generate_itinerary(itinerary_id)

@router.delete(
    "/{itinerary_id}",
    status_code=204,
    responses={
        404: {"description": "Itinerary not found"},
        500: {"description": "Failed to delete itinerary"}
    }
)

def delete_itinerary(itinerary_id: int, db: Session = Depends(get_db)):
    """Delete an itinerary"""
    service = get_service(db)
    service.delete_itinerary(itinerary_id)

@router.patch(
    "/{itinerary_id}",
    response_model=ItineraryResponse,
    responses={
            400: {"description": "Invalid input or itinerary could not be regenerated with the updated fields"},
            404: {"description": "Itinerary not found or no fields provided"}
        }
)

def update_itinerary(itinerary_id: int, update_data: ItineraryUpdate, db: Session = Depends(get_db)):
    """
    Update an itinerary's start_time, end_time or budget
    and attempts to regenerate the itinerary.
    Returns regenerated itinerary if successful, else
    error message.
    """
    service = get_service(db)
    try:
        updated = service.update_itinerary(itinerary_id, update_data)
        db.commit() # only commit if itinerary can be successfully regenerated with updated fields
        return updated
    except HTTPException as e:
        db.rollback() # rollback to db state before update
        raise e
