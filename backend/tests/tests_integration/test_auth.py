# ------------- signup ----------------------

def test_signup_success(client):
    user_data = {
        "username": "user1",
        "password": "password1"
    }

    res = client.post("/auth/signup", json=user_data)
    assert res.status_code == 200

def test_signup_empty_username(client):
    user_data = {
        "username": "",
        "password": "password2"
    }

    res = client.post("/auth/signup", json=user_data)
    # should return 422 validation error as username should be at least 1 character
    assert res.status_code == 422

def test_signup_empty_pwd(client):
    user_data = {
        "username": "user1",
        "password": ""
    }

    res = client.post("/auth/signup", json=user_data)
    assert res.status_code == 422

def test_signup_empty_both(client):
    user_data = {
        "username": "",
        "password": ""
    }

    res = client.post("/auth/signup", json=user_data)
    assert res.status_code == 422

def test_signup_user_exists(client):
    user_data = {
        "username": "user1",
        "password": "password1"
    }

    res = client.post("/auth/signup", json=user_data)
    assert res.status_code == 200

    user_data = {
        "username": "user1",
        "password": "newpassword"
    }

    res = client.post("/auth/signup", json=user_data)
    assert res.status_code == 400

def test_signup_pwd_short(client):
    user_data = {
        "username": "user1",
        "password": "abcdefg"
    }

    res = client.post("/auth/signup", json=user_data)
    assert res.status_code == 422

def test_signup_pwd_8(client):
    user_data = {
        "username": "user1",
        "password": "a1b2c3d*"
    }

    res = client.post("/auth/signup", json=user_data)
    assert res.status_code == 200

def test_signup_pwd_long(client):
    user_data = {
        "username": "user1",
        "password": "over8characters?"
    }

    res = client.post("/auth/signup", json=user_data)
    assert res.status_code == 200

def test_signup_validation_error(client):
    user_data = {}
    res = client.post("/auth/signup", json=user_data)
    assert res.status_code == 422

# ------------- login ----------------------

def test_login_init(client):
    """Initialising database with one user prior to each login test"""
    user_data = {
        "username": "user1",
        "password": "password1"
    }

    res = client.post("/auth/signup", json=user_data)
    assert res.status_code == 200

def test_login_success(client):
    test_login_init(client)

    user_data = {
        "username": "user1",
        "password": "password1"
    }

    res = client.post("/auth/login", json=user_data)
    assert res.status_code == 200

def test_login_empty_both(client):
    test_login_init(client)

    user_data = {
        "username": "",
        "password": ""
    }

    res = client.post("/auth/login", json=user_data)
    # returns 422 validation error as username and password are both too short
    assert res.status_code == 422

def test_login_empty_wrong_pwd(client):
    test_login_init(client)

    user_data = {
        "username": "",
        "password": "incorrect"
    }

    res = client.post("/auth/login", json=user_data)
    assert res.status_code == 422

def test_login_empty_username(client):
    test_login_init(client)

    user_data = {
        "username": "",
        "password": "password1"
    }

    res = client.post("/auth/login", json=user_data)
    assert res.status_code == 422

def test_login_username_not_exist(client):
    test_login_init(client)

    user_data = {
        "username": "user2",
        "password": "password1"
    }

    res = client.post("/auth/login", json=user_data)
    assert res.status_code == 400

def test_login_username_not_exist2(client):
    test_login_init(client)

    user_data = {
        "username": "user2",
        "password": "incorrect"
    }

    res = client.post("/auth/login", json=user_data)
    assert res.status_code == 400

def test_login_incorrect_pwd(client):
    test_login_init(client)

    user_data = {
        "username": "user1",
        "password": "incorrect"
    }

    res = client.post("/auth/login", json=user_data)
    assert res.status_code == 400

def test_login_empty_pwd(client):
    test_login_init(client)

    user_data = {
        "username": "user1",
        "password": ""
    }

    res = client.post("/auth/login", json=user_data)
    assert res.status_code == 422

def test_login_validation_error(client):
    test_login_init(client)
    user_data = {}
    res = client.post("/auth/login", json=user_data)
    assert res.status_code == 422

# ------------- full user flow test ----------------------

def test_full_user_signup_flow(client):
    """Tests a full user signup flow, including sign up and retrieving the user"""
    # signup
    user_data = {
        "username": "user1",
        "password": "password1"
    }
    res = client.post("/auth/signup", json=user_data)
    assert res.status_code == 200
    data = res.json()
    user_id = data["user_id"]

    # retrieve user details
    res = client.get(f"/users/{user_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "user1"
