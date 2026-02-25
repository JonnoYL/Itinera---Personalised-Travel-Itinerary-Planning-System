from datetime import date, time
import json

# ------------- helpers ----------------------

def jsonable(obj):
    if isinstance(obj, (date, time)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def test_itineraries_init(client):
    """Creates 1 user and logs in with them prior to each test"""
    user_data = {
        "username": "user1",
        "password": "password1"
    }
    res = client.post("/auth/signup", json=user_data)
    assert res.status_code == 200
    # user_id 1 will be used for testing
    data = res.json()
    assert data["user_id"] == 1

# ------------- get all itineraries ----------------------

def test_get_all_itineraries(client):
    res = client.get("/itineraries")
    # this should always pass
    assert res.status_code == 200

# ------------- create itinerary ----------------------

def test_create_itinerary_success(client):
    test_itineraries_init(client)
    itinerary_data = {
        "name": "Test",
        "description": "string",
        "date": date.today(),
        "cover_photos": [
            "string"
        ],
        "budget": 500,
        "start_time": "10:00:00.000Z",
        "end_time": "22:00:00.000Z",
        "start_lat": -33.84791615,
        "start_long": 151.0676002021898,
        "start_name": "Novotel",
        "start_cat": "accomodation.hotel",
        "user_id": 1
    }
    res = client.post("/itineraries", content=json.dumps(itinerary_data, default=jsonable), headers={"Content-Type": "application/json"})
    assert res.status_code == 200

def test_create_itinerary_validation_error(client):
    test_itineraries_init(client)
    itinerary_data = {}
    res = client.post("/itineraries", content=json.dumps(itinerary_data, default=jsonable), headers={"Content-Type": "application/json"})
    assert res.status_code == 422

def test_create_itinerary_invalid_user(client):
    test_itineraries_init(client)

    itinerary_data = {
        "name": "Test",
        "description": "string",
        "date": date.today(),
        "cover_photos": [
            "string"
        ],
        "budget": 500,
        "start_time": "10:00:00.000Z",
        "end_time": "22:00:00.000Z",
        "start_lat": -33.84791615,
        "start_long": 151.0676002021898,
        "start_name": "Novotel",
        "start_cat": "accomodation.hotel",
        "categories": [
            "beach"
        ],
        "user_id": 0
    }
    res = client.post("/itineraries", content=json.dumps(itinerary_data, default=jsonable), headers={"Content-Type": "application/json"})
    assert res.status_code == 404

def test_create_itinerary_invalid_date(client):
    test_itineraries_init(client)
    itinerary_data = {
        "name": "Test",
        "description": "string",
        "date": date(2018, 6, 1),
        "cover_photos": [
            "string"
        ],
        "budget": 500,
        "start_time": "10:00:00.000Z",
        "end_time": "22:00:00.000Z",
        "start_lat": -33.84791615,
        "start_long": 151.0676002021898,
        "start_name": "Novotel",
        "start_cat": "accomodation.hotel",
        "categories": [
            "beach"
        ],
        "user_id": 1
    }
    res = client.post("/itineraries", content=json.dumps(itinerary_data, default=jsonable), headers={"Content-Type": "application/json"})
    assert res.status_code == 400

def test_create_itinerary_invalid_time(client):
    test_itineraries_init(client)
    itinerary_data = {
        "name": "Test",
        "description": "string",
        "date": date.today(),
        "cover_photos": [
            "string"
        ],
        "budget": 500,
        "start_time": "10:00:00.000Z",
        "end_time": "09:00:00.000Z",
        "start_lat": -33.84791615,
        "start_long": 151.0676002021898,
        "start_name": "Novotel",
        "start_cat": "accomodation.hotel",
        "categories": [
            "beach"
        ],
        "user_id": 1
    }
    res = client.post("/itineraries", content=json.dumps(itinerary_data, default=jsonable), headers={"Content-Type": "application/json"})
    assert res.status_code == 400

def test_create_itinerary_invalid_budget(client):
    test_itineraries_init(client)
    itinerary_data = {
        "name": "Test",
        "description": "string",
        "date": date.today(),
        "cover_photos": [
            "string"
        ],
        "budget": -1,
        "start_time": "10:00:00.000Z",
        "end_time": "22:00:00.000Z",
        "start_lat": -33.84791615,
        "start_long": 151.0676002021898,
        "start_name": "Novotel",
        "start_cat": "accomodation.hotel",
        "categories": [
            "beach"
        ],
        "user_id": 1
    }
    res = client.post("/itineraries", content=json.dumps(itinerary_data, default=jsonable), headers={"Content-Type": "application/json"})
    assert res.status_code == 400

# ------------- get itinerary by id ----------------------

def test_get_itinerary_by_id_success(client):
    test_create_itinerary_success(client)
    params = {
        "itinerary_id": 1
    }
    res = client.get(f"/itineraries/{params['itinerary_id']}")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Test"

def test_get_itinerary_by_id_not_found(client):
    test_create_itinerary_success(client)
    params = {
        "itinerary_id": 2
    }
    res = client.get(f"/itineraries/{params['itinerary_id']}")
    assert res.status_code == 404

# ------------- delete itinerary ----------------------

def test_delete_itinerary_success(client):
    test_create_itinerary_success(client)
    params = {
        "itinerary_id": 1
    }
    res = client.delete(f"/itineraries/{params['itinerary_id']}")
    assert res.status_code == 204

def test_delete_itinerary_invalid_id(client):
    test_create_itinerary_success(client)
    params = {
        "itinerary_id": 2
    }
    res = client.delete(f"/itineraries/{params['itinerary_id']}")
    assert res.status_code == 500

# ------------- update itinerary ----------------------

# def test_update_itinerary_success(client):
#     test_create_itinerary_success(client)
#     params = {
#         "itinerary_id": 1
#     }
#     body = {
#         "start_time": time(10, 0, 0),
#         "end_time": time(22, 0, 0),
#         "budget": 5000
#     }
#     res = client.patch(
#         f"/itineraries/{params['itinerary_id']}",
#         content=json.dumps(body, default=jsonable),
#         headers={"Content-Type": "application/json"}
#     )
#     assert res.status_code == 200

# def test_update_itinerary_invalid_time(client):
#     test_create_itinerary_success(client)
#     params = {
#         "itinerary_id": 1
#     }
#     body = {
#         "start_time": time(17, 0, 0),
#         "end_time": time(10, 0, 0),
#         "budget": 50
#     }
#     res = client.patch(
#         f"/itineraries/{params['itinerary_id']}",
#         content=json.dumps(body, default=jsonable),
#         headers={"Content-Type": "application/json"}
#     )
#     assert res.status_code == 400

# def test_update_itinerary_invalid_budget(client):
#     test_create_itinerary_success(client)
#     params = {
#         "itinerary_id": 1
#     }
#     body = {
#         "start_time": time(10, 0, 0),
#         "end_time": time(17, 0, 0),
#         "budget": -100
#     }
#     res = client.patch(
#         f"/itineraries/{params['itinerary_id']}",
#         content=json.dumps(body, default=jsonable),
#         headers={"Content-Type": "application/json"}
#     )
#     assert res.status_code == 400

# def test_update_itinerary_itinerary_not_found(client):
#     test_create_itinerary_success(client)
#     params = {
#         "itinerary_id": 2
#     }
#     body = {
#         "start_time": time(10, 0, 0),
#         "end_time": time(17, 0, 0),
#         "budget": 50
#     }
#     res = client.patch(
#         f"/itineraries/{params['itinerary_id']}",
#         content=json.dumps(body, default=jsonable),
#         headers={"Content-Type": "application/json"}
#     )
#     assert res.status_code == 404

# ------------- generate itinerary ----------------------

# def test_generate_itinerary_success(client):
#     test_create_itinerary_success(client)
#     params = {
#         "itinerary_id": 1
#     }
#     res = client.post(f"/itineraries/{params['itinerary_id']}/generate")
#     assert res.status_code == 200

# ------------- full flow tests ----------------------

def test_full_itinerary_create(client):
    """Create new itinerary and retrieve it by ID - expect the data to match"""
    # Create itinerary
    test_itineraries_init(client)
    itinerary_data = {
        "name": "Test",
        "description": "string",
        "date": date.today(),
        "cover_photos": [
            "string"
        ],
        "budget": 500,
        "start_time": "10:00:00.000Z",
        "end_time": "22:00:00.000Z",
        "start_lat": -33.84791615,
        "start_long": 151.0676002021898,
        "start_name": "Novotel",
        "start_cat": "accomodation.hotel",
        "categories": [
            "beach"
        ],
        "user_id": 1
    }
    res = client.post("/itineraries", content=json.dumps(itinerary_data, default=jsonable), headers={"Content-Type": "application/json"})
    assert res.status_code == 200
    data = res.json()
    itinerary_id = data["id"]

    # Check that the newly created itinerary exists
    res = client.get(f"/itineraries/{itinerary_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Test"

# def test_full_itinerary_update(client):
#     """Create new itinerary and update it, expect the new data to be returned"""
#     # Create itinerary
#     test_itineraries_init(client)
#     itinerary_data = {
#         "name": "Test",
#         "description": "string",
#         "date": date.today(),
#         "cover_photos": [
#             "string"
#         ],
#         "budget": 500,
#         "start_time": "10:00:00.000Z",
#         "end_time": "22:00:00.000Z",
#         "start_lat": -33.84791615,
#         "start_long": 151.0676002021898,
#         "start_name": "Novotel",
#         "start_cat": "accomodation.hotel",
#         "categories": [
#             "beach"
#         ],
#         "user_id": 1
#     }
#     res = client.post("/itineraries", content=json.dumps(itinerary_data, default=jsonable), headers={"Content-Type": "application/json"})
#     assert res.status_code == 200
#     data = res.json()
#     itinerary_id = data["id"]

#     # Update a field of the itinerary
#     updated_data = {
#         "budget": 1000
#     }
#     res = client.patch(
#         f"/itineraries/{itinerary_id}",
#         content=json.dumps(updated_data, default=jsonable),
#         headers={"Content-Type": "application/json"}
#     )
#     assert res.status_code == 200

#     # Check that getting the itinerary returns the updated data
#     res = client.get(f"/itineraries/{itinerary_id}")
#     assert res.status_code == 200
#     data = res.json()
#     assert data["name"] == "Test"
#     assert data["budget"] == 1000

def test_full_itinerary_delete(client):
    """Create new itinerary and delete it, expect it not to be found"""
    # Create itinerary
    test_itineraries_init(client)
    itinerary_data = {
        "name": "Test",
        "description": "string",
        "date": date.today(),
        "cover_photos": [
            "string"
        ],
        "budget": 500,
        "start_time": "10:00:00.000Z",
        "end_time": "22:00:00.000Z",
        "start_lat": -33.84791615,
        "start_long": 151.0676002021898,
        "start_name": "Novotel",
        "start_cat": "accomodation.hotel",
        "categories": [
            "beach"
        ],
        "user_id": 1
    }
    res = client.post("/itineraries", content=json.dumps(itinerary_data, default=jsonable), headers={"Content-Type": "application/json"})
    assert res.status_code == 200
    data = res.json()
    itinerary_id = data["id"]

    # Check that it exists
    res = client.get(f"/itineraries/{itinerary_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Test"

    # Delete the itinerary
    res = client.delete(f"/itineraries/{itinerary_id}")
    assert res.status_code == 204

    # Check that it no longer exists
    res = client.get(f"/itineraries/{itinerary_id}")
    assert res.status_code == 404
