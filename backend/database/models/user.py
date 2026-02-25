from database.setup import Base
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship


class UserDatabaseModel(Base):
    __tablename__ = "login_accounts"
    __table_args__ = {"schema": "public"}

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    itineraries = relationship("ItineraryDatabaseModel", back_populates="user")
