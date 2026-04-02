from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    needs_onboarding: bool = False


class RefreshRequest(BaseModel):
    refresh_token: str


class GoogleAuthRequest(BaseModel):
    id_token: str


class OnboardingRequest(BaseModel):
    username: str
    goal: str
    posting_window_start: int = 0
    posting_window_end: int = 23
