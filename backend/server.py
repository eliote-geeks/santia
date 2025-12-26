from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import asyncio
import time
import re
import requests
from urllib.parse import quote


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db = None
mongo_client = None
if mongo_url:
    mongo_client = AsyncIOMotorClient(mongo_url)
    db = mongo_client[os.environ.get('DB_NAME', 'santia')]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

class OpenEMRError(Exception):
    pass

def split_name(full_name: str) -> dict:
    parts = [p for p in re.split(r"\s+", full_name.strip()) if p]
    if not parts:
        return {"fname": "Patient", "mname": "", "lname": "Inconnu"}
    if len(parts) == 1:
        return {"fname": parts[0], "mname": "", "lname": "Patient"}
    if len(parts) == 2:
        return {"fname": parts[0], "mname": "", "lname": parts[1]}
    return {"fname": parts[0], "mname": " ".join(parts[1:-1]), "lname": parts[-1]}

def normalize_gender(raw_gender: str) -> str:
    gender = raw_gender.strip().lower()
    if gender in {"homme", "male", "m", "masculin"}:
        return "Male"
    if gender in {"femme", "female", "f", "feminin"}:
        return "Female"
    return "Other"

def dob_from_age(age: int) -> str:
    year = datetime.now().year - age
    return f"{year}-01-01"

def category_label(category_id: str) -> str:
    mapping = {
        "sante-sexuelle": "Sante sexuelle",
        "addictions": "Addictions",
        "perte-de-poids": "Perte de poids",
        "sommeil": "Sommeil",
        "cheveux": "Cheveux",
        "fertilite": "Fertilite",
    }
    return mapping.get(category_id, category_id)

def intake_value(intake: "IntakeCreate | dict", field: str, default: str = "") -> str:
    if isinstance(intake, dict):
        return intake.get(field, default)
    return getattr(intake, field, default)

def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D+", "", phone or "")
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("0") and not digits.startswith("237"):
        digits = f"237{digits[1:]}"
    return digits

def format_schedule(dt: datetime) -> str:
    try:
        return dt.strftime("%d/%m/%Y %H:%M")
    except ValueError:
        return dt.isoformat()

def jitsi_base_url() -> str:
    return os.environ.get("JITSI_BASE_URL", "http://localhost:8000").rstrip("/")

def generate_meeting_url(intake_id: str) -> str:
    prefix = os.environ.get("JITSI_ROOM_PREFIX", "santia")
    slug = intake_id.split("-")[0]
    room = f"{prefix}-{slug}-{uuid.uuid4().hex[:6]}"
    return f"{jitsi_base_url()}/{room}"

def build_whatsapp_link(intake: dict, scheduled_at: datetime, meeting_url: str) -> Optional[str]:
    phone = normalize_phone(intake.get("phone", ""))
    if not phone:
        return None
    name = intake.get("name", "Patient")
    when = format_schedule(scheduled_at)
    message = (
        f"Bonjour {name}, votre teleconsultation Santia est confirmee.\n"
        f"Date/heure: {when}\n"
        f"Lien: {meeting_url}\n"
        "Merci."
    )
    return f"https://wa.me/{phone}?text={quote(message)}"

class OpenEMRClient:
    def __init__(self) -> None:
        self.base_url = os.environ.get("OPENEMR_BASE_URL", "").rstrip("/")
        self.site = os.environ.get("OPENEMR_SITE", "default")
        self.client_id = os.environ.get("OPENEMR_CLIENT_ID")
        self.client_secret = os.environ.get("OPENEMR_CLIENT_SECRET")
        self.username = os.environ.get("OPENEMR_USERNAME")
        self.password = os.environ.get("OPENEMR_PASSWORD")
        self.scope = os.environ.get(
            "OPENEMR_SCOPE",
            "openid api:oemr user/patient.read user/patient.write user/appointment.write"
        )
        self.verify_tls = os.environ.get("OPENEMR_VERIFY_TLS", "true").lower() == "true"
        self.country_code = os.environ.get("OPENEMR_COUNTRY_CODE", "CM")
        self.facility_id = os.environ.get("OPENEMR_APPT_FACILITY_ID", "3")
        self.billing_location_id = os.environ.get("OPENEMR_APPT_BILLING_LOCATION_ID", self.facility_id)
        self.provider_id = os.environ.get("OPENEMR_PROVIDER_ID", "1")
        self.appt_category_id = os.environ.get("OPENEMR_APPT_CATEGORY_ID", "10")
        self.appt_duration = os.environ.get("OPENEMR_APPT_DURATION", "900")
        self.appt_status = os.environ.get("OPENEMR_APPT_STATUS", "-")
        self.appt_title = os.environ.get("OPENEMR_APPT_TITLE", "Teleconsultation")
        self._token = None
        self._token_expires_at = 0.0

    def is_configured(self) -> bool:
        return bool(self.base_url and self.client_id and self.username and self.password)

    def _token_endpoint(self) -> str:
        return f"{self.base_url}/oauth2/{self.site}/token"

    def _api_base(self) -> str:
        return f"{self.base_url}/apis/{self.site}/api"

    def _get_access_token(self) -> str:
        now = time.time()
        if self._token and now < self._token_expires_at - 60:
            return self._token
        if not self.is_configured():
            raise OpenEMRError("OpenEMR credentials are not configured")
        data = {
            "grant_type": "password",
            "client_id": self.client_id,
            "username": self.username,
            "password": self.password,
            "user_role": "users",
            "scope": self.scope,
        }
        if self.client_secret:
            data["client_secret"] = self.client_secret
        response = requests.post(
            self._token_endpoint(),
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
            verify=self.verify_tls,
        )
        if response.status_code != 200:
            raise OpenEMRError(f"Token error {response.status_code}: {response.text}")
        payload = response.json()
        token = payload.get("access_token")
        if not token:
            raise OpenEMRError("OpenEMR token missing from response")
        self._token = token
        self._token_expires_at = now + int(payload.get("expires_in", 3600))
        return token

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Content-Type": "application/json",
        }

    def create_patient(self, intake: "IntakeCreate") -> str:
        name_parts = split_name(intake.name)
        payload = {
            "fname": name_parts["fname"],
            "mname": name_parts["mname"],
            "lname": name_parts["lname"],
            "DOB": dob_from_age(intake.age),
            "sex": normalize_gender(intake.gender),
            "phone_contact": intake.phone,
            "email": intake.email,
            "city": intake.city,
            "country_code": self.country_code,
        }
        response = requests.post(
            f"{self._api_base()}/patient",
            json=payload,
            headers=self._headers(),
            timeout=15,
            verify=self.verify_tls,
        )
        if response.status_code not in {200, 201}:
            raise OpenEMRError(f"Patient create error {response.status_code}: {response.text}")
        payload = response.json()
        if payload.get("validationErrors") or payload.get("internalErrors"):
            raise OpenEMRError(f"Patient validation error: {payload}")
        data = payload.get("data", {})
        if isinstance(data, list) and data:
            data = data[0]
        pid = data.get("pid") or data.get("id")
        if not pid:
            raise OpenEMRError(f"Patient id missing: {payload}")
        return str(pid)

    def create_appointment(self, pid: str, intake: "IntakeCreate | dict", scheduled_at: Optional[datetime] = None) -> str:
        when = scheduled_at or datetime.now()
        if when.tzinfo is not None:
            when = when.astimezone().replace(tzinfo=None)
        appt_date = when.strftime("%Y-%m-%d")
        appt_time = when.strftime("%H:%M")
        comment_lines = [
            f"Motif: {category_label(intake_value(intake, 'category'))}",
            f"Symptomes: {intake_value(intake, 'symptoms')}",
            f"Duree: {intake_value(intake, 'duration')}",
            f"Antecedents: {intake_value(intake, 'history') or 'N/A'}",
            f"Ville: {intake_value(intake, 'city')}",
            f"Telephone: {intake_value(intake, 'phone')}",
            f"Email: {intake_value(intake, 'email')}",
        ]
        comment = "\n".join(comment_lines)[:2000]
        payload = {
            "pc_catid": str(self.appt_category_id),
            "pc_title": self.appt_title,
            "pc_duration": str(self.appt_duration),
            "pc_hometext": comment,
            "pc_apptstatus": self.appt_status,
            "pc_eventDate": appt_date,
            "pc_startTime": appt_time,
            "pc_facility": str(self.facility_id),
            "pc_billing_location": str(self.billing_location_id),
            "pc_aid": str(self.provider_id),
        }
        response = requests.post(
            f"{self._api_base()}/patient/{pid}/appointment",
            json=payload,
            headers=self._headers(),
            timeout=15,
            verify=self.verify_tls,
        )
        if response.status_code not in {200, 201}:
            raise OpenEMRError(f"Appointment create error {response.status_code}: {response.text}")
        data = response.json()
        appt_id = data.get("id") or data.get("data", {}).get("id")
        if not appt_id:
            raise OpenEMRError(f"Appointment id missing: {data}")
        return str(appt_id)

    def create_patient_and_appointment(self, intake: "IntakeCreate", scheduled_at: Optional[datetime] = None) -> dict:
        pid = self.create_patient(intake)
        appt_id = self.create_appointment(pid, intake, scheduled_at)
        return {"patient_id": pid, "appointment_id": appt_id}

openemr_client = OpenEMRClient()

# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Intake Form Model
class IntakeCreate(BaseModel):
    category: str
    symptoms: str
    duration: str
    history: Optional[str] = ""
    name: str
    age: int
    gender: str
    phone: str
    email: EmailStr
    city: str
    consent: bool

class IntakeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    category: str
    symptoms: str
    duration: str
    history: Optional[str] = ""
    name: str
    age: int
    gender: str
    phone: str
    email: str
    city: str
    consent: bool
    status: str
    created_at: str
    scheduled_at: Optional[str] = None
    meeting_url: Optional[str] = None
    whatsapp_link: Optional[str] = None
    openemr_patient_id: Optional[str] = None
    openemr_appointment_id: Optional[str] = None

class IntakeScheduleUpdate(BaseModel):
    scheduled_at: datetime
    meeting_url: Optional[str] = None

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Intake Form Endpoint
@api_router.post("/intake", response_model=IntakeResponse)
async def create_intake(input: IntakeCreate):
    if not input.consent:
        raise HTTPException(status_code=400, detail="Le consentement est requis")
    
    intake_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    openemr_patient_id = None
    if openemr_client.is_configured():
        try:
            openemr_patient_id = await asyncio.to_thread(openemr_client.create_patient, input)
        except OpenEMRError as exc:
            logger.error("OpenEMR integration failed: %s", exc)
            raise HTTPException(status_code=502, detail="Erreur lors de la creation du dossier patient")
    
    doc = {
        "id": intake_id,
        "category": input.category,
        "symptoms": input.symptoms,
        "duration": input.duration,
        "history": input.history or "",
        "name": input.name,
        "age": input.age,
        "gender": input.gender,
        "phone": input.phone,
        "email": input.email,
        "city": input.city,
        "consent": input.consent,
        "status": "pending",
        "created_at": created_at,
        "scheduled_at": None,
        "meeting_url": None,
        "whatsapp_link": None,
        "openemr_patient_id": openemr_patient_id,
        "openemr_appointment_id": None,
    }
    
    if db is not None:
        await db.intakes.insert_one(doc)
    
    # Return without _id
    if "_id" in doc:
        del doc["_id"]
    
    return IntakeResponse(**doc)

@api_router.get("/intakes", response_model=List[IntakeResponse])
async def get_intakes():
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    intakes = await db.intakes.find({}, {"_id": 0}).to_list(1000)
    return intakes

@api_router.get("/intakes/{intake_id}", response_model=IntakeResponse)
async def get_intake(intake_id: str):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    intake = await db.intakes.find_one({"id": intake_id}, {"_id": 0})
    if not intake:
        raise HTTPException(status_code=404, detail="Dossier introuvable")
    return intake

@api_router.patch("/intakes/{intake_id}/schedule", response_model=IntakeResponse)
async def schedule_intake(intake_id: str, input: IntakeScheduleUpdate):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    intake = await db.intakes.find_one({"id": intake_id}, {"_id": 0})
    if not intake:
        raise HTTPException(status_code=404, detail="Dossier introuvable")

    meeting_url = input.meeting_url or intake.get("meeting_url") or generate_meeting_url(intake_id)
    whatsapp_link = build_whatsapp_link(intake, input.scheduled_at, meeting_url)

    update_fields = {
        "status": "scheduled",
        "scheduled_at": input.scheduled_at.isoformat(),
        "meeting_url": meeting_url,
        "whatsapp_link": whatsapp_link,
    }

    if openemr_client.is_configured() and intake.get("openemr_patient_id") and not intake.get("openemr_appointment_id"):
        try:
            appt_id = await asyncio.to_thread(
                openemr_client.create_appointment,
                intake["openemr_patient_id"],
                intake,
                input.scheduled_at,
            )
            update_fields["openemr_appointment_id"] = appt_id
        except OpenEMRError as exc:
            logger.error("OpenEMR appointment scheduling failed: %s", exc)
            raise HTTPException(status_code=502, detail="Erreur lors de la creation du rendez-vous")

    await db.intakes.update_one({"id": intake_id}, {"$set": update_fields})
    updated = {**intake, **update_fields}
    return updated


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    if mongo_client is not None:
        mongo_client.close()
