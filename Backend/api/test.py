from fastapi import APIRouter

test_route = APIRouter(prefix="/test", tags=["Test"])

@test_route.get("/")
def test():
    return {
        "message":"working"
    }