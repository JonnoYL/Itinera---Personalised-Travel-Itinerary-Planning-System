from database.setup import Base
from sqlalchemy import ARRAY, Column, Date, Float, ForeignKey, Integer, String, Time, JSON
from sqlalchemy.orm import relationship


class ItineraryDatabaseModel(Base):
    __tablename__ = "itineraries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("public.login_accounts.user_id"), nullable=False
    )

    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    cover_photos = Column(ARRAY(String), nullable=True)

    start_lat = Column(Float, nullable=False)
    start_long = Column(Float, nullable=False)
    start_name = Column(String, nullable=False)
    start_cat = Column(String, nullable=True)
    end_lat = Column(Float, nullable=True)
    end_long = Column(Float, nullable=True)
    end_name = Column(String, nullable=True)
    end_cat = Column(String, nullable=True)

    budget = Column(Float, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    categories = Column(ARRAY(String), nullable=True)

    # Computed stats after route generation
    total_time = Column(Float, nullable=True)
    total_cost = Column(Float, nullable=True)
    total_distance = Column(Float, nullable=True)
    total_score = Column(Float, nullable=True)

    user = relationship("UserDatabaseModel", back_populates="itineraries", lazy="joined")

    # Virtual relationship to join table
    # doesn't actually have a pois column
    pois = relationship(
        "ItineraryPOI",
        back_populates="itinerary",
        cascade="all, delete-orphan",
        order_by="ItineraryPOI.order_index",
    )

    feature_collection = Column(JSON, nullable=True)

# Join table
class ItineraryPOI(Base):
    __tablename__ = "itinerary_pois"

    id = Column(Integer, primary_key=True, index=True)
    itinerary_id = Column(Integer, ForeignKey("itineraries.id", ondelete="CASCADE"))
    poi_id = Column(Integer, ForeignKey("pois.id"))
    order_index = Column(Integer, nullable=False)  # order of pois

    arrival_time = Column(Time, nullable=True)
    departure_time = Column(Time, nullable=True)
    travel_time_from_prev = Column(Float, nullable=True)
    travel_distance_from_prev = Column(Float, nullable=True)

    itinerary = relationship("ItineraryDatabaseModel", back_populates="pois")
    poi = relationship("POIDatabaseModel")
