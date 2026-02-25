import os
import time
import logging
import bcrypt
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database.setup import Base, engine, init_db
from database.populate_mock_data import populate_poi_data, populate_poi_relationship_data
from presentation.routes.healthcheck import router as healthRouter
from presentation.routes.signupRoute import router as signupRouter
from presentation.routes.loginRoute import router as loginRouter
from presentation.routes.pois import router as poiRouter
from presentation.routes.users import router as userRouter
from presentation.routes.itineraries import router as itineraryRouter
from database.models.user import UserDatabaseModel
from dotenv import load_dotenv


load_dotenv()

# access environment variables
DEV_USERNAME = os.getenv("DEV_USERNAME")
DEV_PASSWORD = os.getenv("DEV_PASSWORD")

def postgres_test(retries=5, delay=4):
    for i in range(retries):
        try:
            Base.metadata.drop_all(engine)  # drop all tables first
            Base.metadata.create_all(engine)  # create them all again
            logger.info("postgres connection OK!")

            with Session(engine) as session:
                user = session.query(UserDatabaseModel).filter_by(username=DEV_USERNAME).first()

                if not user:
                    password_hash = bcrypt.hashpw(
                        DEV_PASSWORD.encode("utf-8"), bcrypt.gensalt()
                    ).decode("utf-8")

                    new_user = UserDatabaseModel(
                        username=DEV_USERNAME,
                        password_hash=password_hash
                    )
                    session.add(new_user)
                    session.commit()
                    logger.info(f"Inserted default user {DEV_USERNAME}")
                else:
                    logger.info(f"User {DEV_USERNAME} already exists")

            return
        except Exception as e:
            logger.error(f"postgres not connected! {e}")
            time.sleep(delay)

@asynccontextmanager
async def lifespan(app: FastAPI):
    postgres_test()
    init_db()
    populate_poi_data()
    populate_poi_relationship_data()
    yield
    # shutdown events
    # e.g., close database connections, clean up temporary files etc...

app = FastAPI(lifespan=lifespan)
app.include_router(signupRouter)
app.include_router(loginRouter)
app.include_router(userRouter)
app.include_router(itineraryRouter)
app.include_router(poiRouter)
app.include_router(healthRouter)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)  # information levels are shown
logger = logging.getLogger("backend")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
