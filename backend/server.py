from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import jwt
import bcrypt
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'cosmos_stargazers_secret_key_2026')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRE_DAYS = 30

app = FastAPI(title="Cosmos API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)


# ===== MODELS =====
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    user_id: str
    email: str
    name: str
    avatar: Optional[str] = None
    created_at: str
    stats: dict = Field(default_factory=lambda: {"sightings": 0, "nebulae": 0, "planets": 0, "galaxies": 0, "meteors": 0})

class AuthResponse(BaseModel):
    token: str
    user: User

class CelestialEvent(BaseModel):
    event_id: str
    title: str
    date: str  # ISO date
    end_date: Optional[str] = None
    category: str  # meteor_shower, eclipse, opposition, conjunction, phase
    description_beginner: str
    description_advanced: str
    visibility: str
    image_key: str  # maps to design_guidelines media
    peak_time: Optional[str] = None

class Reminder(BaseModel):
    reminder_id: str
    user_id: str
    event_id: str
    note: Optional[str] = ""
    created_at: str

class ReminderCreate(BaseModel):
    event_id: str
    note: Optional[str] = ""

class Sighting(BaseModel):
    sighting_id: str
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    title: str
    object_type: str  # nebula, planet, galaxy, meteor, moon, comet, star_cluster
    location_name: str
    sky_conditions: str  # clear, partly_cloudy, hazy
    equipment: str
    notes: str
    image_base64: Optional[str] = None
    created_at: str
    likes: int = 0
    liked_by: List[str] = Field(default_factory=list)

class SightingCreate(BaseModel):
    title: str
    object_type: str
    location_name: str
    sky_conditions: str
    equipment: str
    notes: str
    image_base64: Optional[str] = None

class DarkSkySpot(BaseModel):
    spot_id: str
    name: str
    latitude: float
    longitude: float
    bortle_scale: int  # 1 (darkest) - 9
    description: str
    region: str


# ===== HELPERS =====
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)


# ===== AUTH ROUTES =====
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": data.email.lower(),
        "name": data.name,
        "password_hash": hash_password(data.password),
        "avatar": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "stats": {"sightings": 0, "nebulae": 0, "planets": 0, "galaxies": 0, "meteors": 0},
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return AuthResponse(token=token, user=User(**user_doc))

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(data: UserLogin):
    user_doc = await db.users.find_one({"email": data.email.lower()})
    if not user_doc or not user_doc.get("password_hash") or not verify_password(data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user_doc["user_id"])
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return AuthResponse(token=token, user=User(**user_doc))

@api_router.get("/auth/me", response_model=User)
async def get_me(user: User = Depends(get_current_user)):
    return user


# ===== EVENTS =====
@api_router.get("/events", response_model=List[CelestialEvent])
async def list_events(upcoming_only: bool = False):
    query = {}
    if upcoming_only:
        today = datetime.now(timezone.utc).date().isoformat()
        query = {"date": {"$gte": today}}
    events = await db.events.find(query, {"_id": 0}).sort("date", 1).to_list(200)
    return [CelestialEvent(**e) for e in events]

@api_router.get("/events/{event_id}", response_model=CelestialEvent)
async def get_event(event_id: str):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return CelestialEvent(**event)


# ===== REMINDERS =====
@api_router.get("/reminders", response_model=List[Reminder])
async def list_reminders(user: User = Depends(get_current_user)):
    reminders = await db.reminders.find({"user_id": user.user_id}, {"_id": 0}).to_list(500)
    return [Reminder(**r) for r in reminders]

@api_router.post("/reminders", response_model=Reminder)
async def create_reminder(data: ReminderCreate, user: User = Depends(get_current_user)):
    existing = await db.reminders.find_one({"user_id": user.user_id, "event_id": data.event_id})
    if existing:
        raise HTTPException(status_code=400, detail="Reminder already set")
    reminder = {
        "reminder_id": f"rem_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "event_id": data.event_id,
        "note": data.note or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reminders.insert_one(reminder)
    reminder.pop("_id", None)
    return Reminder(**reminder)

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, user: User = Depends(get_current_user)):
    result = await db.reminders.delete_one({"reminder_id": reminder_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ===== SIGHTINGS =====
@api_router.get("/sightings", response_model=List[Sighting])
async def list_sightings(limit: int = 50):
    items = await db.sightings.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [Sighting(**i) for i in items]

@api_router.post("/sightings", response_model=Sighting)
async def create_sighting(data: SightingCreate, user: User = Depends(get_current_user)):
    sighting = {
        "sighting_id": f"s_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "user_name": user.name,
        "user_avatar": user.avatar,
        "title": data.title,
        "object_type": data.object_type,
        "location_name": data.location_name,
        "sky_conditions": data.sky_conditions,
        "equipment": data.equipment,
        "notes": data.notes,
        "image_base64": data.image_base64,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "likes": 0,
        "liked_by": [],
    }
    await db.sightings.insert_one(sighting)
    # Update user stats
    type_key_map = {"nebula": "nebulae", "planet": "planets", "galaxy": "galaxies", "meteor": "meteors"}
    stat_key = type_key_map.get(data.object_type)
    update = {"$inc": {"stats.sightings": 1}}
    if stat_key:
        update["$inc"][f"stats.{stat_key}"] = 1
    await db.users.update_one({"user_id": user.user_id}, update)
    sighting.pop("_id", None)
    return Sighting(**sighting)

@api_router.get("/sightings/me", response_model=List[Sighting])
async def my_sightings(user: User = Depends(get_current_user)):
    items = await db.sightings.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [Sighting(**i) for i in items]

@api_router.post("/sightings/{sighting_id}/like")
async def like_sighting(sighting_id: str, user: User = Depends(get_current_user)):
    sighting = await db.sightings.find_one({"sighting_id": sighting_id}, {"_id": 0})
    if not sighting:
        raise HTTPException(status_code=404, detail="Not found")
    liked_by = sighting.get("liked_by") or []
    if user.user_id in liked_by:
        # unlike
        await db.sightings.update_one(
            {"sighting_id": sighting_id},
            {"$pull": {"liked_by": user.user_id}, "$inc": {"likes": -1}},
        )
        return {"liked": False, "likes": max(0, (sighting.get("likes") or 0) - 1)}
    else:
        await db.sightings.update_one(
            {"sighting_id": sighting_id},
            {"$addToSet": {"liked_by": user.user_id}, "$inc": {"likes": 1}},
        )
        return {"liked": True, "likes": (sighting.get("likes") or 0) + 1}


# ===== DARK SKY SPOTS =====
@api_router.get("/sky-spots", response_model=List[DarkSkySpot])
async def list_spots():
    spots = await db.sky_spots.find({}, {"_id": 0}).to_list(200)
    return [DarkSkySpot(**s) for s in spots]


# ===== SEED =====
async def seed_data():
    # Events seed (2026 real astronomical events)
    count = await db.events.count_documents({})
    if count == 0:
        events_seed = [
            {"event_id": "evt_quadrantids_2026", "title": "Quadrantids Meteor Shower", "date": "2026-01-03", "end_date": "2026-01-04", "category": "meteor_shower", "description_beginner": "One of the year's best meteor showers, but with a sharp peak — look up on the night of January 3-4 for up to 120 meteors per hour!", "description_advanced": "Radiant near Boötes. ZHR ~120 at peak (6-hour window). Parent body: asteroid 2003 EH1. Best after midnight.", "visibility": "Northern Hemisphere", "image_key": "meteor_shower", "peak_time": "22:00 UTC"},
            {"event_id": "evt_feb_total_lunar_2026", "title": "Total Lunar Eclipse", "date": "2026-03-03", "category": "eclipse", "description_beginner": "The Moon will pass through Earth's shadow and turn a coppery red — a 'Blood Moon' visible across the Pacific, Americas, and East Asia.", "description_advanced": "Umbral magnitude 1.15. Totality duration ~58 minutes. Greatest eclipse 11:33 UTC. L=2.3 brightness expected.", "visibility": "Americas, Pacific, East Asia", "image_key": "lunar_eclipse", "peak_time": "11:33 UTC"},
            {"event_id": "evt_lyrids_2026", "title": "Lyrid Meteor Shower Peak", "date": "2026-04-22", "category": "meteor_shower", "description_beginner": "A reliable April meteor shower that has been observed for 2,700 years. Expect 15-20 bright meteors per hour.", "description_advanced": "Radiant in Lyra near Vega. ZHR ~18. Parent body: Comet C/1861 G1 (Thatcher). Waning crescent moon 2026 — excellent conditions.", "visibility": "Worldwide", "image_key": "meteor_shower", "peak_time": "04:00 local"},
            {"event_id": "evt_eta_aquariids_2026", "title": "Eta Aquariids", "date": "2026-05-06", "category": "meteor_shower", "description_beginner": "Fast, bright meteors from Halley's Comet's debris trail. Best seen from the Southern Hemisphere.", "description_advanced": "Radiant in Aquarius. ZHR ~50. Parent: 1P/Halley. Meteors enter atmosphere at 66 km/s.", "visibility": "Southern Hemisphere preferred", "image_key": "meteor_shower"},
            {"event_id": "evt_aug_total_solar_2026", "title": "Total Solar Eclipse", "date": "2026-08-12", "category": "eclipse", "description_beginner": "A total solar eclipse visible across Greenland, Iceland, and northern Spain — the Moon will completely block the Sun.", "description_advanced": "Path of totality crosses Iceland and Spain. Maximum duration 2m 18s. Saros 126. Use ISO 12312-2 filters for partial phases.", "visibility": "Greenland, Iceland, Spain", "image_key": "lunar_eclipse", "peak_time": "17:46 UTC"},
            {"event_id": "evt_perseids_2026", "title": "Perseid Meteor Shower", "date": "2026-08-12", "end_date": "2026-08-13", "category": "meteor_shower", "description_beginner": "The most popular meteor shower of the year — warm August nights and up to 100 meteors per hour from Comet Swift-Tuttle's dust.", "description_advanced": "Radiant in Perseus. ZHR ~100. Parent: 109P/Swift-Tuttle. 2026 coincides with new moon — ideal dark-sky viewing.", "visibility": "Northern Hemisphere", "image_key": "meteor_shower", "peak_time": "02:00 local"},
            {"event_id": "evt_saturn_opp_2026", "title": "Saturn at Opposition", "date": "2026-09-19", "category": "opposition", "description_beginner": "Saturn shines its brightest tonight, visible all night long. A small telescope reveals its magnificent rings.", "description_advanced": "Magnitude +0.3, apparent diameter 19.1\". Ring tilt 1.7° — nearly edge-on this year. Best telescope session around local midnight.", "visibility": "Worldwide", "image_key": "jupiter"},
            {"event_id": "evt_orionids_2026", "title": "Orionid Meteor Shower", "date": "2026-10-21", "category": "meteor_shower", "description_beginner": "Meteors appearing to radiate from the famous Orion constellation — another gift from Halley's Comet.", "description_advanced": "Radiant near Betelgeuse. ZHR ~20. Parent: 1P/Halley. Waxing gibbous moon may interfere.", "visibility": "Worldwide", "image_key": "meteor_shower"},
            {"event_id": "evt_jupiter_opp_2026", "title": "Jupiter at Opposition", "date": "2026-11-10", "category": "opposition", "description_beginner": "The king of planets is at its biggest and brightest — even binoculars show its four Galilean moons.", "description_advanced": "Magnitude -2.9, disk diameter 48.9\". Closest approach 591 million km. Great Red Spot transits near midnight local time.", "visibility": "Worldwide", "image_key": "jupiter"},
            {"event_id": "evt_geminids_2026", "title": "Geminid Meteor Shower", "date": "2026-12-14", "category": "meteor_shower", "description_beginner": "The year's best meteor shower — up to 150 multicolored meteors per hour from asteroid 3200 Phaethon.", "description_advanced": "Radiant near Castor. ZHR ~150. Parent: asteroid 3200 Phaethon. Slow (35 km/s) bright meteors with frequent fireballs.", "visibility": "Worldwide", "image_key": "meteor_shower", "peak_time": "02:00 local"},
        ]
        await db.events.insert_many(events_seed)

    spots_count = await db.sky_spots.count_documents({})
    if spots_count == 0:
        spots_seed = [
            {"spot_id": "sp_cherrysprings", "name": "Cherry Springs State Park", "latitude": 41.6628, "longitude": -77.8236, "bortle_scale": 2, "description": "Gold-tier dark sky park, one of the East Coast's darkest spots.", "region": "Pennsylvania, USA"},
            {"spot_id": "sp_natural_bridges", "name": "Natural Bridges National Monument", "latitude": 37.6102, "longitude": -110.0103, "bortle_scale": 2, "description": "First International Dark Sky Park. Pristine skies over sandstone arches.", "region": "Utah, USA"},
            {"spot_id": "sp_deathvalley", "name": "Death Valley National Park", "latitude": 36.5054, "longitude": -117.0794, "bortle_scale": 2, "description": "Vast, remote desert park with exceptionally dark skies.", "region": "California, USA"},
            {"spot_id": "sp_atacama", "name": "Atacama Desert", "latitude": -24.5000, "longitude": -69.2500, "bortle_scale": 1, "description": "The driest place on Earth — home to world-class observatories.", "region": "Chile"},
            {"spot_id": "sp_namibrand", "name": "NamibRand Nature Reserve", "latitude": -25.0000, "longitude": 16.0000, "bortle_scale": 1, "description": "Africa's first International Dark Sky Reserve.", "region": "Namibia"},
            {"spot_id": "sp_mauna_kea", "name": "Mauna Kea Summit", "latitude": 19.8206, "longitude": -155.4681, "bortle_scale": 2, "description": "Hawaii's astronomy capital at 4,200m elevation.", "region": "Hawaii, USA"},
            {"spot_id": "sp_kerry", "name": "Kerry International Dark-Sky Reserve", "latitude": 51.8200, "longitude": -10.2500, "bortle_scale": 2, "description": "Ireland's Wild Atlantic Way dark-sky reserve.", "region": "Ireland"},
            {"spot_id": "sp_pic_du_midi", "name": "Pic du Midi", "latitude": 42.9369, "longitude": 0.1411, "bortle_scale": 2, "description": "Historic Pyrenees observatory with public viewing.", "region": "France"},
        ]
        await db.sky_spots.insert_many(spots_seed)


@app.on_event("startup")
async def on_startup():
    await seed_data()


@api_router.get("/")
async def root():
    return {"message": "Cosmos API", "version": "1.0"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
