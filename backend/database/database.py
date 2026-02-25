from sqlalchemy.orm import Session, joinedload
from .models.poi import POIDatabaseModel, POIRelationshipModel
from .models.user import UserDatabaseModel
from .models.itinerary import ItineraryDatabaseModel, ItineraryPOI
from typing import List, Optional


class UserDatabase:
    """Handles CRUD operations for User entities."""
    def __init__(self, db: Session):
        self.db = db

    def create_user(self, user_data: dict) -> UserDatabaseModel:
        """Creates a new user in the database"""
        new_user = UserDatabaseModel(**user_data)
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        return new_user

    def get_user_by_id(self, user_id: int) -> Optional[UserDatabaseModel]:
        """Retrieve user by ID, or None if not found"""
        return self.db.query(UserDatabaseModel).filter(UserDatabaseModel.user_id == user_id).first()

    def get_user_by_username(self, username: str) -> Optional[UserDatabaseModel]:
        """Retrieve user by username"""
        return self.db.query(UserDatabaseModel).filter(UserDatabaseModel.username == username).first()

class POIDatabase:
    """Handles CRUD operations for Points of Interest."""
    def __init__(self, db: Session):
        self.db = db

    def create_poi(self, poi_data: dict) -> POIDatabaseModel:
        """Create a POI in the database"""
        new_poi = POIDatabaseModel(**poi_data)
        self.db.add(new_poi)
        self.db.commit()
        self.db.refresh(new_poi)
        return new_poi

    def get_poi_by_id(self, poi_id: int) -> Optional[POIDatabaseModel]:
        """Retrieve POI by id"""
        return (
            self.db.query(POIDatabaseModel)
            .filter(POIDatabaseModel.id == poi_id)
            .first()
        )

    def get_poi_by_coords(self, poi_lat: float, poi_long: float) -> Optional[POIDatabaseModel]:
        """Retrieve POI by exact latitute and longitude match"""
        return (
            self.db.query(POIDatabaseModel)
            .filter(
                POIDatabaseModel.latitude == poi_lat,
                POIDatabaseModel.longitude == poi_long
            )
            .first()
        )

    def get_all_pois(self) -> List[type[POIDatabaseModel]]:
        """Retrieve all POIs from the database"""
        return self.db.query(POIDatabaseModel).all()

    def get_all_default_pois(self) -> List[type[POIDatabaseModel]]:
        """Retrieve all POIs that are NOT user added"""
        return (
            self.db.query(POIDatabaseModel)
            .filter(POIDatabaseModel.is_user_added.is_(False))
        )

    def clear_all_pois(self):
        """Delete all POIs"""
        self.db.query(POIDatabaseModel).delete()
        self.db.commit()

class POIRelationshipDatabase:
    """Handles CRUD operations for POI-to-POI relationships"""
    def __init__(self, db: Session):
        self.db = db

    def create_relationships(self, poi_relationships: List[POIRelationshipModel]) -> List[POIRelationshipModel]:
        """Create a batch of POI relationships"""
        self.db.add_all(poi_relationships)
        self.db.commit()
        return poi_relationships

    def get_all_relationships(self) -> List[type[POIRelationshipModel]]:
        """Return all POI relationships"""
        return self.db.query(POIRelationshipModel).all()

    def clear_all_relationships(self):
        """Delete all relationship records"""
        self.db.query(POIRelationshipModel).delete()
        self.db.commit()

class ItineraryDatabase:
    """Handles CRUD operations for Itineraries and their POI associations."""
    def __init__(self, db: Session):
        self.db = db

    def create_itinerary(self, itinerary_data: dict) -> ItineraryDatabaseModel:
        """Create a new itinerary in the database"""
        itinerary = ItineraryDatabaseModel(**itinerary_data)
        self.db.add(itinerary)
        self.db.commit()
        self.db.refresh(itinerary)
        return itinerary

    def get_all_itineraries(self) -> List[ItineraryDatabaseModel]:
        """Retrieve all itineraries from the database including their POI details"""
        return (
            self.db.query(ItineraryDatabaseModel)
            .options(
                joinedload(ItineraryDatabaseModel.pois).joinedload(ItineraryPOI.poi)
            )
            .all()
        )

    def get_itinerary_by_id(
        self, itinerary_id: int
    ) -> Optional[ItineraryDatabaseModel]:
        """Retrieve itinerary by ID + POI details"""
        return (
            self.db.query(ItineraryDatabaseModel)
            .options(
                joinedload(ItineraryDatabaseModel.pois).joinedload(
                    ItineraryPOI.poi
                )  # load the actual POI data
            )
            .filter(ItineraryDatabaseModel.id == itinerary_id)
            .first()
        )

    def get_itineraries_by_user(
        self, user_id: int
    ) -> Optional[List[ItineraryDatabaseModel]]:
        """Returns all itineraries filtered by user id"""
        return (
            self.db.query(ItineraryDatabaseModel)
            .options(
                joinedload(ItineraryDatabaseModel.pois).joinedload(
                    ItineraryPOI.poi
                )
            )
            .filter(ItineraryDatabaseModel.user_id == user_id)
            .all()
        )

    def delete_itinerary(self, itinerary_id: int) -> bool:
        """
        Delete an itinerary by ID
        Cascades automatically remove related ItineraryPOI rows
        """
        itinerary = self.get_itinerary_by_id(itinerary_id)
        if itinerary:
            self.db.delete(itinerary)
            self.db.commit()
            return True
        return False

    # itinerary to POI mapping
    def add_pois_to_itinerary(self, itinerary_id: int, poi_details: List[dict]):
        """
        Replace the itinerary's POI sequence with the provided list.

        Each dict requires:
        - poi_id
        - order_index
        - arrival_time
        - departure_time
        - travel_time_from_prev
        - travel_distance_from_prev
        """
        itinerary = self.get_itinerary_by_id(itinerary_id)

        # clear existing mappings
        itinerary.pois.clear()

        # add new mappings in order
        for poi_info in poi_details:
            itinerary.pois.append(ItineraryPOI(**poi_info))

        self.db.commit()
        self.db.refresh(itinerary)
        return itinerary

    def get_itinerary_pois(self, itinerary_id: int) -> List[ItineraryPOI]:
        """Return ordered POIs for an itinerary."""
        return (
            self.db.query(ItineraryPOI)
            .filter(ItineraryPOI.itinerary_id == itinerary_id)
            .order_by(ItineraryPOI.order_index)
            .all()
        )

    def update_itinerary_stats(
        self,
        itinerary_id: int,
        total_time: float,
        total_cost: float,
        total_distance: float,
        total_score: float,
        poi_details: Optional[List[dict]] = None,
        feature_collection: Optional[dict] = None,
    ) -> ItineraryDatabaseModel:
        """Updates itinerary summary fields, optional POI order, and FeatureCollection."""
        itinerary = self.get_itinerary_by_id(itinerary_id)
        if not itinerary:
            return None

        itinerary.total_time = total_time
        itinerary.total_cost = total_cost
        itinerary.total_distance = total_distance
        itinerary.total_score = total_score

        if poi_details is not None:
            self.add_pois_to_itinerary(itinerary_id, poi_details)

        if feature_collection is not None:
            itinerary.feature_collection = feature_collection

        self.db.commit()
        self.db.refresh(itinerary)
        return itinerary

    def update_itinerary_fields(self, itinerary_id: int, update_data) -> Optional[ItineraryDatabaseModel]:
        """
        Updates editable itinerary fields: start_time, end_time, budget
        """
        itinerary = self.get_itinerary_by_id(itinerary_id)
        if not itinerary:
            return None

        update_dict = update_data.model_dump(exclude_unset=True)
        if not update_dict:
            return None

        for field, value in update_dict.items():
            setattr(itinerary, field, value)

        self.db.flush() # stage changes
