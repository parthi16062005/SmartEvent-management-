from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_events(): response = client.get("/events"); assert response.status_code == 200

def test_get_event_details(): response = client.get("/events/1"); assert response.status_code in [200, 404]

def test_profile_without_token(): response = client.get("/profile"); assert response.status_code in [401, 403]

def test_bookings_without_token(): response = client.get("/bookings"); assert response.status_code in [401, 403]

def test_notifications_without_token(): response = client.get("/notifications"); assert response.status_code in [401, 403]

def test_unread_notifications_without_token(): response = client.get("/notifications/unread-count"); assert response.status_code in [401, 403]

def test_invalid_ticket(): response = client.get("/verify-ticket/INVALID-TICKET-123"); assert response.status_code in [400, 404]

def test_invalid_login(): response = client.post("/login", data={"username": "[wrong@example.com](mailto:wrong@example.com)", "password": "wrongpassword"}); assert response.status_code == 401
