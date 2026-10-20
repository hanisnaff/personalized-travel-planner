from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, field_validator


class TripRequest(BaseModel):
    destination: str = Field(min_length=2, max_length=100)
    departure_date: date
    duration: int = Field(ge=1, le=21)
    budget: float = Field(gt=0, le=100_000_000)
    currency: Literal["INR", "USD", "EUR", "GBP"] = "INR"
    travelers: int = Field(default=1, ge=1, le=30)
    interests: list[str] = Field(default_factory=lambda: ["Sightseeing"], max_length=10)
    travel_style: Literal["Budget", "Balanced", "Comfort", "Luxury"] = "Balanced"
    accommodation: Literal["No preference", "Hostel", "Hotel", "Resort", "Homestay"] = "No preference"

    @field_validator("destination")
    @classmethod
    def clean_destination(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Enter a destination.")
        return cleaned

    @field_validator("interests")
    @classmethod
    def clean_interests(cls, value: list[str]) -> list[str]:
        clean = list(dict.fromkeys(" ".join(v.split()) for v in value if v.strip()))
        if not clean:
            raise ValueError("Choose at least one interest.")
        return clean


class Activity(BaseModel):
    id: str
    time: str
    title: str
    description: str
    category: str = "Sightseeing"
    estimated_cost: float = Field(ge=0)


class ItineraryDay(BaseModel):
    day: int = Field(ge=1)
    title: str
    activities: list[Activity]


class Itinerary(BaseModel):
    title: str
    summary: str
    days: list[ItineraryDay]
    food_suggestions: list[str] = Field(default_factory=list)
    travel_tips: list[str] = Field(default_factory=list)
    estimated_total: float = Field(ge=0)
    currency: str
    source: Literal["demo", "ai"] = "demo"


class TripCreate(BaseModel):
    request: TripRequest
    itinerary: Itinerary


class SavedTrip(BaseModel):
    id: str
    destination: str
    departure_date: str
    duration: int
    budget: float
    currency: str
    created_at: str
    itinerary: Itinerary
