import json
import uuid
import httpx
from . import config
from .models import TripRequest, Itinerary


def demo_itinerary(trip: TripRequest) -> Itinerary:
    destination = trip.destination
    interests = trip.interests
    daily_budget = trip.budget / trip.duration
    activity_templates = [
        ("09:00", "Start with a local breakfast", "Try a well-reviewed local breakfast spot; confirm opening hours before visiting.", "Food", 0.12),
        ("10:30", f"Explore a landmark in {destination}", "Visit a well-known local landmark or cultural attraction. Check ticket prices and opening times.", "Culture", 0.20),
        ("13:00", "Lunch and a relaxed break", "Choose a local restaurant that fits your budget and dietary needs.", "Food", 0.18),
        ("15:00", "Discover a neighborhood", "Explore a walkable area, market, museum, park, or activity that matches your interests.", "Exploration", 0.20),
        ("18:00", "Evening walk and dinner", "Wind down with a scenic walk and dinner. Use verified local transport options to return safely.", "Relaxation", 0.22),
    ]
    days = []
    for day_num in range(1, trip.duration + 1):
        activities = []
        for idx, (time, title, description, category, share) in enumerate(activity_templates):
            if idx == 3 and interests:
                category = interests[(day_num + idx - 1) % len(interests)]
                title = f"Explore {category.lower()} in {destination}"
            if day_num > 1 and idx == 1:
                title = f"Discover another side of {destination}"
            activities.append({"id": str(uuid.uuid4()), "time": time, "title": title,
                               "description": description, "category": category,
                               "estimated_cost": round(daily_budget * share, 2)})
        days.append({"day": day_num, "title": ["Arrival and first discoveries", "Local highlights", "Slow travel and hidden corners"][min(day_num - 1, 2)], "activities": activities})
    estimated = round(sum(a["estimated_cost"] for day in days for a in day["activities"]), 2)
    return Itinerary(title=f"{trip.duration}-day trip to {destination}",
                     summary=f"A {trip.travel_style.lower()}-style starter plan for {destination}, shaped around {', '.join(interests)}. This is demo content, not live-verified research.",
                     days=days,
                     food_suggestions=["Look for busy local restaurants with recent reviews", "Check menu prices and dietary options before ordering", "Try a regional specialty if it suits your preferences"],
                     travel_tips=["Confirm attraction opening hours and entry fees before setting out", "Allow extra time for local traffic and transfers", "Keep some budget aside for unexpected expenses", "Use official transport providers and keep valuables secure"],
                     estimated_total=estimated, currency=trip.currency, source="demo")


def generate_itinerary(trip: TripRequest) -> Itinerary:
    if not config.ai_enabled():
        return demo_itinerary(trip)
    prompt = f"""Create a practical travel itinerary as valid JSON only, with no markdown. User details: destination={trip.destination}; departure_date={trip.departure_date}; duration={trip.duration} days; total budget={trip.budget} {trip.currency}; travelers={trip.travelers}; interests={trip.interests}; travel_style={trip.travel_style}; accommodation={trip.accommodation}. Avoid claiming live availability, current opening hours, verified prices, or real-time research. Estimate costs conservatively. Return object schema: {{title:string, summary:string, days:[{{day:number,title:string,activities:[{{id:string,time:string,title:string,description:string,category:string,estimated_cost:number}}]}}], food_suggestions:[string], travel_tips:[string], estimated_total:number, currency:string}}. Include exactly {trip.duration} days and 3-5 activities per day. Estimated costs must be non-negative and in {trip.currency}."""
    try:
        response = httpx.post(f"{config.AI_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {config.AI_API_KEY}", "Content-Type": "application/json"},
            json={"model": config.AI_MODEL, "temperature": 0.5, "messages": [
                {"role": "system", "content": "You are a careful travel-planning assistant. Return only valid JSON and clearly avoid inventing live facts."},
                {"role": "user", "content": prompt}], "response_format": {"type": "json_object"}}, timeout=45)
        response.raise_for_status()
        raw = response.json()["choices"][0]["message"]["content"]
        parsed = json.loads(raw)
        parsed["source"] = "ai"
        parsed["currency"] = trip.currency
        if len(parsed.get("days", [])) != trip.duration:
            raise ValueError("AI response did not contain the requested number of days")
        # Ensure IDs exist and required activity fields are usable.
        for day in parsed["days"]:
            for activity in day.get("activities", []):
                activity.setdefault("id", str(uuid.uuid4()))
        return Itinerary.model_validate(parsed)
    except Exception:
        # Keep the app usable if a provider is down or returns invalid output.
        return demo_itinerary(trip)
