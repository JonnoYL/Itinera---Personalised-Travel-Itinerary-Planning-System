import requests
import os
from dotenv import load_dotenv
from typing import List, Dict


load_dotenv()

API_KEY = os.getenv("ORS_API_KEY")
ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions"

def get_route(
        pois: List[Dict],
        mode_per_leg: List[str],
        distance_lookup: Dict,
        duration_lookup: Dict,
    ) -> Dict:
    """
    Fetch a multi-stop route from OpenRouteService (ORS).

    Returns a GeoJSON FeatureCollection with:
        - Point features for each POI
        - LineString features for each route leg
    Falls back to straight-line geometry if:
        - ORS API key missing
        - ORS request fails
        - ORS response missing expected geometry/waypoints
    """

    # prepare output: add each POI as a point feature
    features = []
    for idx, poi in enumerate(pois):
        features.append({
            "type": "Feature",
            "properties": {
                "name": poi["name"],
                "category": poi["category"],
                "order": idx + 1,
            },
            "geometry": {
                "type": "Point",
                "coordinates": [poi["lon"], poi["lat"]],
            },
        }
    )

    # ORS "coordinates" input format: [[lon, lat], [lon, lat], ...]
    coords = [[poi["lon"], poi["lat"]] for poi in pois]

    # attempt single ORS API call for full route geometry
    use_fallback = False
    polyline = None
    waypoints = None
    try:
        if not API_KEY:
            # fallback to straight line
            use_fallback = True

        url = f"{ORS_BASE_URL}/driving-car/geojson"
        payload = {
            "coordinates": coords,
            "instructions": False,
            "geometry_simplify": True,
        }
        headers = {
            "Authorization": API_KEY,
            "Content-Type": "application/json"
        }

        response = requests.post(url, json=payload, headers=headers, timeout=12)

        if response.status_code == 200:
            data = response.json()
            feature0 = (data.get("features") or [None])[0]
            if feature0:
                polyline = feature0["geometry"]["coordinates"]
                waypoints = feature0["properties"]["way_points"]
    except Exception:
        # any error -> fallback
        use_fallback = True

    use_fallback = not polyline or not waypoints

    # build route leg LineString features
    for i in range(len(pois) - 1):
        poi_a = pois[i]
        poi_b = pois[i + 1]

        dist_m = distance_lookup.get((poi_a["id"], poi_b["id"]), 0)
        dur_min = duration_lookup.get((poi_a["id"], poi_b["id"]), 0)

        if use_fallback:
            # straight line between the two points as a minimal geometry
            leg_geom = {
                "type": "LineString",
                "coordinates": [
                    [poi_a["lon"], poi_a["lat"]],
                    [poi_b["lon"], poi_b["lat"]],
                ],
            }
        else:
            # extract route segment between ORS waypoint indices
            start_idx = waypoints[i]
            end_idx = waypoints[i + 1]
            leg_geom = {
                "type": "LineString",
                "coordinates": polyline[start_idx:end_idx + 1]
            }

        features.append({
            "type": "Feature",
            "properties": {
                "mode": mode_per_leg[i],
                "distance_m": dist_m,
                "duration_min": dur_min,
                "from": poi_a["name"],
                "to": poi_b["name"],
            },
            "geometry": leg_geom,
        })

    # return final GeoJSON FeatureCollection
    feature_collection = {
        "type": "FeatureCollection",
        "features": features,
    }
    return feature_collection
