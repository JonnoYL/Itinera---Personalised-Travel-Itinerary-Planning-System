import pytest
import bcrypt
from unittest.mock import MagicMock
from fastapi import HTTPException
from application.user_service import UserService
from application.models.authModels import AuthRequest
from application.models.user import UserResponse
from pydantic import ValidationError


@pytest.fixture
def mock_repo():
    repo = MagicMock()
    service = UserService(repo)
    return service, repo

# ------------- get user by id ----------------------

def test_get_user_by_id_success(mock_repo):
    service, repo = mock_repo
    repo.get_user_by_id.return_value = UserResponse(user_id=1, username='test', password_hash='hash')
    r = service.get_user_by_id(1)
    assert r.username == 'test'
    repo.get_user_by_id.assert_called_once_with(1)

def test_get_user_by_id_not_found(mock_repo):
    service, repo = mock_repo
    repo.get_user_by_id.return_value = None

    with pytest.raises(HTTPException) as exc:
        service.get_user_by_id(0)

    assert exc.value.status_code == 404
    assert 'not found' in exc.value.detail

# ------------- get user by username ---------------------

def test_get_user_by_username_success(mock_repo):
    service, repo = mock_repo
    repo.get_user_by_username.return_value = UserResponse(user_id=1, username='alice', password_hash='hash')
    r = service.get_user_by_username('alice')
    assert r.user_id == 1
    repo.get_user_by_username.assert_called_once_with('alice')

def test_get_user_by_username_not_found(mock_repo):
    service, repo = mock_repo
    repo.get_user_by_username.return_value = None

    with pytest.raises(HTTPException) as exc:
        service.get_user_by_username('nonexistant')

    assert exc.value.status_code == 404
    assert 'not found' in exc.value.detail

# ------------- signup ----------------------

def test_signup_success(mock_repo):
    service, repo = mock_repo
    # mock username not taken
    repo.get_user_by_username.return_value = None
    repo.create_user.return_value = MagicMock(user_id=1)

    req = AuthRequest(username='alice', password='strongpassword')
    res = service.signup(req)
    assert 'token' in res
    assert res['user_id'] == 1
    repo.create_user.assert_called_once()

def test_signup_username_already_exists(mock_repo):
    service, repo = mock_repo
    # mock user exists
    repo.get_user_by_username.return_value = MagicMock()

    req = AuthRequest(username='existing', password='strongpassword')

    with pytest.raises(HTTPException) as exc:
        service.signup(req)

    assert exc.value.status_code == 400
    assert "exists" in exc.value.detail

def test_signup_username_weak_pwd(mock_repo):
    service, repo = mock_repo
    repo.get_user_by_username.return_value = None

    with pytest.raises(ValidationError) as exc:
        AuthRequest(username="alice", password="weak")
    assert "at least 8 characters" in str(exc.value)

def test_signup_empty_username(mock_repo):
    service, repo = mock_repo

    with pytest.raises(ValidationError) as exc:
        AuthRequest(username="", password="aaaaaaaa")
    assert "at least 1 character" in str(exc.value)

def test_signup_empty_pwd(mock_repo):
    service, repo = mock_repo

    with pytest.raises(ValidationError) as exc:
        AuthRequest(username="alice", password="")
    assert "at least 8 characters" in str(exc.value)

# ------------- login ----------------------

def test_login_success(mock_repo):
    service, repo = mock_repo
    password = "strongpassword"
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user = MagicMock(user_id=1, username="alice", password_hash=password_hash)
    repo.get_user_by_username.return_value = user

    req = AuthRequest(username="alice", password=password)
    res = service.login(req)

    assert "token" in res
    assert res["user_id"] == 1

def test_login_not_found(mock_repo):
    service, repo = mock_repo
    repo.get_user_by_username.return_value = None

    req = AuthRequest(username="alice", password='strongpassword')

    with pytest.raises(HTTPException) as exc:
        service.login(req)

    assert exc.value.status_code == 400
    assert "No such username" in exc.value.detail

def test_login_incorrect_pwd(mock_repo):
    service, repo = mock_repo
    password = "strongpassword"
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user = MagicMock(user_id=1, username="alice", password_hash=password_hash)
    repo.get_user_by_username.return_value = user

    req = AuthRequest(username="alice", password='wrongpwd')

    with pytest.raises(HTTPException) as exc:
        service.login(req)

    assert exc.value.status_code == 400
    assert "Incorrect password" in exc.value.detail