from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid

from src.infrastructure.database.session import get_db
from src.domain.models.user import User
from src.domain.models.user_preference import UserPreference
from src.infrastructure.security import get_password_hash
from src.api.v1.deps import get_current_user

router = APIRouter()

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    is_verified: bool

    class Config:
        from_attributes = True

class UserPreferenceSchema(BaseModel):
    timezone: str
    language: str
    adult_content: bool
    notification_email: bool
    notification_push: bool

    class Config:
        from_attributes = True

class UserPreferenceUpdate(BaseModel):
    timezone: Optional[str] = None
    language: Optional[str] = None
    adult_content: Optional[bool] = None
    notification_email: Optional[bool] = None
    notification_push: Optional[bool] = None

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = get_password_hash(user_in.password)
    user = User(email=user_in.email, password_hash=hashed_password)
    db.add(user)
    await db.flush() # flush to get user.id
    
    preferences = UserPreference(user_id=user.id)
    db.add(preferences)
    
    await db.commit()
    await db.refresh(user)
    return user

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/me/preferences", response_model=UserPreferenceSchema)
async def get_user_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
    prefs = result.scalars().first()
    if not prefs:
        raise HTTPException(status_code=404, detail="Preferences not found")
    return prefs

@router.patch("/me/preferences", response_model=UserPreferenceSchema)
async def update_user_preferences(
    prefs_in: UserPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
    prefs = result.scalars().first()
    if not prefs:
        raise HTTPException(status_code=404, detail="Preferences not found")
        
    update_data = prefs_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prefs, key, value)
        
    await db.commit()
    await db.refresh(prefs)
    return prefs
