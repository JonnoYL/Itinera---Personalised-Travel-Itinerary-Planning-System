from database.setup import Base
from sqlalchemy import Column, Float, Integer, String, Time, Boolean
from sqlalchemy.dialects.postgresql import ARRAY


class POIDatabaseModel(Base):
    __tablename__ = "pois"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    longitude = Column(Float, nullable=False)
    latitude = Column(Float, nullable=False)
    opening_time = Column(Time, nullable=False)
    closing_time = Column(Time, nullable=False)
    category = Column(ARRAY(String), nullable=False)
    intrinsic_score = Column(Float, nullable=False)
    avg_visit_time = Column(Float, nullable=False)
    visit_cost = Column(Float, nullable=False)
    is_user_added = Column(Boolean, default=False)

class POIRelationshipModel(Base):
    __tablename__ = "poi_relationships"

    id = Column(Integer, primary_key=True, index=True)
    from_poi_id = Column(Integer, nullable = False)
    to_poi_id = Column(Integer, nullable = False)
    distance_m = Column(Float, nullable = False)
    duration_s = Column(Float, nullable = False)
    profit = Column(Float, nullable = True)
    category = Column(String, nullable = True)
    mode = Column(String, nullable = False)
