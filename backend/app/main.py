from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from . import config, database
from .models import TripRequest, TripCreate, Itinerary
from .itinerary import generate_itinerary


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    yield


app = FastAPI(title="Personalized Travel Itinerary Planner API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[config.FRONTEND_ORIGIN, "http://127.0.0.1:5173"],
                   allow_credentials=False, allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], allow_headers=["*"])


@app.get("/api/health")
def health():
    return {"status": "ok", "ai_configured": config.ai_enabled(), "database": "supabase" if config.supabase_enabled() else "sqlite"}


@app.post("/api/itineraries/generate", response_model=Itinerary)
def create_itinerary(trip: TripRequest):
    try:
        return generate_itinerary(trip)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Could not generate an itinerary. Please try again.") from exc


@app.post("/api/trips", status_code=201)
def save_trip(payload: TripCreate):
    try:
        return database.save_trip(payload.request.model_dump(mode="json"), payload.itinerary.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not save the trip. Check database configuration and try again.") from exc


@app.put("/api/trips/{trip_id}")
def update_saved_trip(trip_id: str, payload: TripCreate):
    try:
        updated = database.update_trip(trip_id, payload.request.model_dump(mode="json"), payload.itinerary.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not update the trip.") from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return updated


@app.get("/api/trips")
def get_trips():
    try:
        return database.list_trips()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not load saved trips.") from exc


@app.delete("/api/trips/{trip_id}", status_code=204)
def remove_trip(trip_id: str):
    try:
        deleted = database.delete_trip(trip_id)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not delete the trip.") from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return None
