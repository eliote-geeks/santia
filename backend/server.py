from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
import hashlib
import secrets
import string
from datetime import datetime, timezone, timedelta
import asyncio
import time
import re
import requests
import subprocess
from urllib.parse import quote
from jose import jwt, JWTError
from passlib.context import CryptContext


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

AUTH_SECRET = os.environ.get("AUTH_SECRET", "change_me")
AUTH_ALGORITHM = os.environ.get("AUTH_ALGORITHM", "HS256")
AUTH_TOKEN_EXPIRE_MINUTES = int(os.environ.get("AUTH_TOKEN_EXPIRE_MINUTES", "10080"))
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
ADMIN_NAME = os.environ.get("ADMIN_NAME", "Admin Santia")
ADMIN_PHONE = os.environ.get("ADMIN_PHONE", "")
STANDARD_PAYMENT_AMOUNT = int(os.environ.get("STANDARD_PAYMENT_AMOUNT", "5000"))
EXPRESS_PAYMENT_AMOUNT = int(os.environ.get("EXPRESS_PAYMENT_AMOUNT", "8000"))
DEFAULT_DOCTOR_PASSWORD = os.environ.get("DEFAULT_DOCTOR_PASSWORD")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def parse_cors_origins() -> List[str]:
    raw = os.environ.get("CORS_ORIGINS", "*")
    if raw.strip() == "*":
        return ["*"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]

class OpenEMRError(Exception):
    pass

class OpenIMError(Exception):
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
        "generale": "Generale",
        "addictions": "Addictions",
        "perte-de-poids": "Perte de poids",
        "sommeil": "Sommeil & stress",
        "cheveux": "Cheveux & peau",
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

def payment_amount_for_type(consultation_type: str) -> int:
    if consultation_type == "express":
        return EXPRESS_PAYMENT_AMOUNT
    return STANDARD_PAYMENT_AMOUNT

async def ensure_meeting_url(intake: Optional[dict]) -> Optional[dict]:
    if not intake:
        return intake
    if intake.get("meeting_url"):
        return intake
    intake_id = intake.get("id") or str(uuid.uuid4())
    meeting_url = generate_meeting_url(intake_id)
    intake["meeting_url"] = meeting_url
    if db is not None and intake.get("id"):
        await db.intakes.update_one(
            {"id": intake["id"]},
            {"$set": {"meeting_url": meeting_url}},
        )
    return intake

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

def generate_temp_password(length: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)

def hash_openim_password(password: str) -> str:
    return hashlib.md5(password.encode("utf-8")).hexdigest()

def choose_doctor_password(existing_user: bool) -> Optional[str]:
    if existing_user:
        return DEFAULT_DOCTOR_PASSWORD
    return DEFAULT_DOCTOR_PASSWORD or generate_temp_password()

def create_access_token(subject: str, email: str, role: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=AUTH_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": subject,
        "email": email,
        "role": role,
        "exp": expires_at,
    }
    return jwt.encode(payload, AUTH_SECRET, algorithm=AUTH_ALGORITHM)

def sanitize_user(user: dict) -> dict:
    clean = dict(user)
    clean.pop("password_hash", None)
    clean.pop("password", None)
    clean.pop("openim_password_hash", None)
    return clean

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non authentifie")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, AUTH_SECRET, algorithms=[AUTH_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token invalide")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user

async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acces reserve a l administration")
    return current_user

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

    def create_appointment(
        self,
        pid: str,
        intake: "IntakeCreate | dict",
        scheduled_at: Optional[datetime] = None,
        provider_id: Optional[str] = None,
    ) -> str:
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
        provider = provider_id or self.provider_id
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
            "pc_aid": str(provider),
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

def openemr_db_params() -> Optional[dict]:
    password = (
        os.environ.get("OPENEMR_DB_PASSWORD")
        or os.environ.get("OPENEMR_MYSQL_ROOT_PASSWORD")
        or os.environ.get("OPENEMR_MYSQL_PASSWORD")
    )
    if not password:
        return None
    return {
        "host": os.environ.get("OPENEMR_DB_HOST") or os.environ.get("OPENEMR_MYSQL_HOST") or "openemr-mysql",
        "port": int(os.environ.get("OPENEMR_DB_PORT", "3306")),
        "user": os.environ.get("OPENEMR_DB_USER", "root"),
        "password": password,
        "database": os.environ.get("OPENEMR_DB_NAME", "openemr"),
    }

def _openemr_connect():
    params = openemr_db_params()
    if not params:
        raise RuntimeError("OpenEMR DB not configured")
    import pymysql

    return pymysql.connect(
        host=params["host"],
        port=params["port"],
        user=params["user"],
        password=params["password"],
        database=params["database"],
        cursorclass=pymysql.cursors.DictCursor,
    )

def _openemr_table_info(cursor, table: str) -> List[dict]:
    cursor.execute(f"DESCRIBE `{table}`")
    return cursor.fetchall()

def _openemr_table_columns(info: List[dict]) -> List[str]:
    return [row["Field"] for row in info]

def _openemr_table_extras(info: List[dict]) -> dict:
    return {row["Field"]: row.get("Extra", "") for row in info}

def _openemr_table_types(info: List[dict]) -> dict:
    return {row["Field"]: row.get("Type", "") for row in info}

def _openemr_fetch_template(cursor, table: str, columns: List[str]) -> Optional[dict]:
    name_col = "username" if "username" in columns else "id"
    cursor.execute(f"SELECT * FROM `{table}` WHERE `{name_col}`='admin' LIMIT 1")
    row = cursor.fetchone()
    if row:
        return row
    cursor.execute(f"SELECT * FROM `{table}` LIMIT 1")
    return cursor.fetchone()

def _openemr_build_username(cursor, base: str) -> str:
    candidate = re.sub(r"[^a-z0-9]+", "", (base or "").lower()) or "doctor"
    suffix = 1
    while True:
        cursor.execute("SELECT 1 FROM `users` WHERE `username`=%s LIMIT 1", (candidate,))
        if not cursor.fetchone():
            return candidate
        candidate = f"{candidate}{suffix}"
        suffix += 1

def _openemr_insert_row(cursor, table: str, row: dict) -> None:
    columns = list(row.keys())
    col_sql = ", ".join(f"`{col}`" for col in columns)
    placeholders = ", ".join(["%s"] * len(columns))
    cursor.execute(
        f"INSERT INTO `{table}` ({col_sql}) VALUES ({placeholders})",
        [row[col] for col in columns],
    )

def _openemr_ensure_group(cursor, username: str) -> None:
    cursor.execute("SHOW TABLES LIKE 'groups'")
    if not cursor.fetchone():
        return
    cursor.execute("DESCRIBE `groups`")
    cols = [row["Field"] for row in cursor.fetchall()]
    name_col = "name" if "name" in cols else ("groupname" if "groupname" in cols else None)
    user_col = "user" if "user" in cols else ("username" if "username" in cols else ("user_id" if "user_id" in cols else None))
    if not name_col or not user_col:
        return
    cursor.execute(
        f"SELECT 1 FROM `groups` WHERE `{name_col}`=%s AND `{user_col}`=%s LIMIT 1",
        ("Default", username),
    )
    if cursor.fetchone():
        return
    _openemr_insert_row(cursor, "groups", {name_col: "Default", user_col: username})

def _openemr_enable_globals(cursor) -> None:
    cursor.execute("SHOW TABLES LIKE 'globals'")
    if not cursor.fetchone():
        return
    globals_to_enable = {
        "rest_api": "1",
        "rest_fhir_api": "1",
        "rest_portal_api": "1",
        "portal_onsite_two_enable": "1",
    }
    portal_addr = os.environ.get("OPENEMR_SITE_ADDR") or os.environ.get("OPENEMR_REDIRECT_URI")
    if portal_addr:
        globals_to_enable["portal_onsite_two_address"] = portal_addr
    for key, value in globals_to_enable.items():
        cursor.execute("SELECT 1 FROM `globals` WHERE `gl_name`=%s LIMIT 1", (key,))
        if cursor.fetchone():
            cursor.execute("UPDATE `globals` SET `gl_value`=%s WHERE `gl_name`=%s", (value, key))
        else:
            cursor.execute("INSERT INTO `globals` (`gl_name`, `gl_value`) VALUES (%s, %s)", (key, value))

def _openemr_enable_modules(cursor) -> None:
    cursor.execute("SHOW TABLES LIKE 'modules'")
    if not cursor.fetchone():
        return
    cursor.execute("DESCRIBE `modules`")
    cols = [row["Field"] for row in cursor.fetchall()]
    name_col = "mod_name" if "mod_name" in cols else ("name" if "name" in cols else None)
    active_col = "mod_active" if "mod_active" in cols else ("active" if "active" in cols else None)
    if not name_col or not active_col:
        return
    for module_name in ("telehealth", "patient_portal", "portal", "calendar"):
        cursor.execute(
            f"SELECT 1 FROM `modules` WHERE `{name_col}`=%s LIMIT 1",
            (module_name,),
        )
        if cursor.fetchone():
            cursor.execute(
                f"UPDATE `modules` SET `{active_col}`=1 WHERE `{name_col}`=%s",
                (module_name,),
            )

def provision_openemr_user_sync(doctor: dict, password: str) -> Optional[tuple[str, bool]]:
    params = openemr_db_params()
    if not params:
        return None
    conn = _openemr_connect()
    try:
        cursor = conn.cursor()
        _openemr_enable_globals(cursor)
        _openemr_enable_modules(cursor)
        user_info = _openemr_table_info(cursor, "users")
        secure_info = _openemr_table_info(cursor, "users_secure")
        user_columns = _openemr_table_columns(user_info)
        secure_columns = _openemr_table_columns(secure_info)
        user_extras = _openemr_table_extras(user_info)
        user_types = _openemr_table_types(user_info)
        id_auto = "auto_increment" in user_extras.get("id", "")

        email = (doctor.get("email") or "").lower()
        base = email.split("@")[0] if email else doctor.get("name", "doctor")
        preferred = doctor.get("openemr_provider_id") or base
        username = _openemr_build_username(cursor, preferred)

        cursor.execute("SELECT * FROM `users` WHERE `username`=%s LIMIT 1", (username,))
        existing = cursor.fetchone()
        if existing:
            conn.commit()
            return (str(existing.get("id") or username), False)

        template_user = _openemr_fetch_template(cursor, "users", user_columns)
        template_secure = _openemr_fetch_template(cursor, "users_secure", secure_columns)
        if not template_user or not template_secure:
            return None

        name_parts = split_name(doctor.get("name", ""))
        user_row = dict(template_user)
        if "username" in user_row:
            user_row["username"] = username
        for field, value in {
            "fname": name_parts["fname"],
            "mname": name_parts["mname"],
            "lname": name_parts["lname"],
            "email": email or template_user.get("email"),
            "phone": doctor.get("phone") or template_user.get("phone"),
            "authorized": 1,
            "active": 1,
            "calendar": 1,
            "info": "Medecin Santia",
        }.items():
            if field in user_row:
                user_row[field] = value
        if "uuid" in user_row:
            uuid_type = (user_types.get("uuid") or "").lower()
            new_uuid = uuid.uuid4()
            user_row["uuid"] = new_uuid.bytes if "binary" in uuid_type else str(new_uuid)
        if id_auto and "id" in user_row:
            user_row.pop("id", None)
        _openemr_insert_row(cursor, "users", user_row)
        user_id = cursor.lastrowid

        secure_row = dict(template_secure)
        secure_row["id"] = user_id
        if "username" in secure_row:
            secure_row["username"] = username
        if "password" in secure_row:
            secure_row["password"] = pwd_context.hash(password)
        if "salt" in secure_row:
            secure_row["salt"] = ""
        if "last_update" in secure_row:
            secure_row["last_update"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        _openemr_insert_row(cursor, "users_secure", secure_row)
        _openemr_ensure_group(cursor, username)
        conn.commit()
        return (str(user_id), True)
    finally:
        conn.close()

class OpenIMClient:
    def __init__(self) -> None:
        self.chat_base_url = os.environ.get("OPENIM_CHAT_BASE_URL", "").rstrip("/")
        self.admin_base_url = os.environ.get("OPENIM_ADMIN_BASE_URL", "").rstrip("/")
        self.api_base_url = os.environ.get("OPENIM_API_BASE_URL", "").rstrip("/")
        self.admin_account = os.environ.get("OPENIM_ADMIN_ACCOUNT", "chatAdmin")
        self.admin_password = os.environ.get("OPENIM_ADMIN_PASSWORD", "")
        self.admin_version = os.environ.get("OPENIM_ADMIN_VERSION", "1.0")
        self.platform_id = int(os.environ.get("OPENIM_PLATFORM_ID", "5"))
        self._admin_token = None
        self._admin_token_expires_at = 0.0
        self._admin_im_token = None
        self._admin_im_expires_at = 0.0

    def can_login(self) -> bool:
        return bool(self.chat_base_url)

    def can_register(self) -> bool:
        return bool(self.chat_base_url and self.admin_base_url)

    def can_send_message(self) -> bool:
        return bool(self.api_base_url and self.admin_base_url)

    def _admin_password(self) -> str:
        if self.admin_password:
            normalized = self.admin_password.strip()
            if re.fullmatch(r"[a-f0-9]{32}", normalized):
                return normalized
            return self._hash_password(normalized)
        return self._hash_password(self.admin_account)

    def _hash_password(self, password: str) -> str:
        return hashlib.md5(password.encode("utf-8")).hexdigest()

    def _headers(self, token: Optional[str] = None) -> dict:
        headers = {
            "Content-Type": "application/json",
            "operationID": str(uuid.uuid4()),
        }
        if token:
            headers["token"] = token
        return headers

    def _post(self, url: str, payload: dict, token: Optional[str] = None) -> dict:
        response = requests.post(
            url,
            json=payload,
            headers=self._headers(token),
            timeout=15,
        )
        if response.status_code != 200:
            raise OpenIMError(f"HTTP {response.status_code}: {response.text}")
        data = response.json()
        err_code = data.get("errCode", 0)
        if err_code:
            raise OpenIMError(f"OpenIM error {err_code}: {data.get('errMsg')}")
        return data.get("data") or {}

    def _ensure_admin_token(self) -> str:
        now = time.time()
        if self._admin_token and now < self._admin_token_expires_at - 60:
            return self._admin_token
        if not self.admin_base_url:
            raise OpenIMError("OpenIM admin base URL is not configured")
        payload = {
            "account": self.admin_account,
            "password": self._admin_password(),
            "version": self.admin_version,
        }
        data = self._post(f"{self.admin_base_url}/account/login", payload)
        token = data.get("adminToken")
        if not token:
            raise OpenIMError("Admin token missing from response")
        self._admin_token = token
        self._admin_token_expires_at = now + 3600
        im_token = data.get("imToken")
        if im_token:
            self._admin_im_token = im_token
            self._admin_im_expires_at = now + 3600
        return token

    def _ensure_admin_im_token(self) -> str:
        now = time.time()
        if self._admin_im_token and now < self._admin_im_expires_at - 60:
            return self._admin_im_token
        self._ensure_admin_token()
        if not self._admin_im_token:
            raise OpenIMError("Admin IM token missing from response")
        return self._admin_im_token

    def _api_post(self, path: str, payload: dict, token: str) -> dict:
        if not self.api_base_url:
            raise OpenIMError("OpenIM API base URL is not configured")
        response = requests.post(
            f"{self.api_base_url}{path}",
            json=payload,
            headers=self._headers(token),
            timeout=15,
        )
        if response.status_code != 200:
            raise OpenIMError(f"HTTP {response.status_code}: {response.text}")
        data = response.json()
        err_code = data.get("errCode", 0)
        if err_code:
            raise OpenIMError(f"OpenIM error {err_code}: {data.get('errMsg')}")
        return data.get("data") or {}

    def send_text_message(self, send_id: str, recv_id: str, text: str) -> dict:
        if not self.can_send_message():
            raise OpenIMError("OpenIM message sending is not configured")
        token = self._ensure_admin_im_token()
        payload = {
            "sendID": send_id,
            "recvID": recv_id,
            "sessionType": 1,
            "contentType": 101,
            "content": {"content": text},
        }
        return self._api_post("/msg/send_msg", payload, token)

    def register_user(self, name: str, email: str, password: str) -> dict:
        if not self.can_register():
            raise OpenIMError("OpenIM register is not configured")
        token = self._ensure_admin_token()
        payload = {
            "deviceID": "santia-web",
            "platform": self.platform_id,
            "autoLogin": True,
            "user": {
                "nickname": name,
                "email": email,
                "password": self._hash_password(password),
            },
        }
        return self._post(f"{self.chat_base_url}/account/register", payload, token=token)

    def login_user(self, email: str, password: str) -> dict:
        if not self.can_login():
            raise OpenIMError("OpenIM login is not configured")
        payload = {
            "deviceID": "santia-web",
            "platform": self.platform_id,
            "email": email,
            "password": self._hash_password(password),
        }
        return self._post(f"{self.chat_base_url}/account/login", payload)

    def login_user_hashed(self, email: str, password_hash: str) -> dict:
        if not self.can_login():
            raise OpenIMError("OpenIM login is not configured")
        payload = {
            "deviceID": "santia-web",
            "platform": self.platform_id,
            "email": email,
            "password": password_hash,
        }
        return self._post(f"{self.chat_base_url}/account/login", payload)

openim_client = OpenIMClient()

# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str = Field(min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    email: EmailStr
    phone: str
    openim_user_id: Optional[str] = None
    role: str
    created_at: str

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class OpenIMTokens(BaseModel):
    im_token: str
    chat_token: str
    user_id: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    openim: Optional[OpenIMTokens] = None

def build_openim_tokens(payload: Optional[dict]) -> Optional[OpenIMTokens]:
    if not payload:
        return None
    im_token = payload.get("imToken") or payload.get("im_token")
    chat_token = payload.get("chatToken") or payload.get("chat_token")
    user_id = payload.get("userID") or payload.get("user_id")
    if not (im_token and chat_token and user_id):
        return None
    return OpenIMTokens(im_token=im_token, chat_token=chat_token, user_id=user_id)

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
    consultation_type: Optional[Literal["standard", "express"]] = "standard"
    payment_method: Optional[str] = None
    payment_phone: Optional[str] = None
    payment_reference: Optional[str] = None
    payment_proof: Optional[dict] = None
    payment_amount: Optional[int] = None
    payment_status: Optional[str] = None
    requested_doctor_id: Optional[str] = None

class DoctorCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    specialty: str
    category: str = "generale"
    openemr_provider_id: Optional[str] = None

class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    category: Optional[str] = None
    openemr_provider_id: Optional[str] = None

class DoctorResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    email: EmailStr
    phone: str
    specialty: str
    category: Optional[str] = None
    openemr_provider_id: Optional[str] = None
    openim_user_id: Optional[str] = None
    created_at: str

class DoctorCreateResponse(DoctorResponse):
    openim_password: Optional[str] = None
    openim_created: bool = False
    santia_password: Optional[str] = None
    santia_created: bool = False
    openemr_password: Optional[str] = None
    openemr_created: bool = False

class DoctorPublicResponse(BaseModel):
    id: str
    name: str
    specialty: str
    category: Optional[str] = None

class DoctorSeedResponse(BaseModel):
    created: List[DoctorCreateResponse]
    skipped: List[str]

class DoctorSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    specialty: str
    email: EmailStr
    phone: str
    category: Optional[str] = None
    openemr_provider_id: Optional[str] = None
    openim_user_id: Optional[str] = None

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
    consultation_type: Optional[str] = None
    created_at: str
    scheduled_at: Optional[str] = None
    meeting_url: Optional[str] = None
    whatsapp_link: Optional[str] = None
    user_id: Optional[str] = None
    assigned_doctor_id: Optional[str] = None
    assigned_doctor: Optional[DoctorSummary] = None
    openim_patient_id: Optional[str] = None
    openim_doctor_id: Optional[str] = None
    openim_intro_sent: Optional[bool] = None
    openemr_patient_id: Optional[str] = None
    openemr_appointment_id: Optional[str] = None
    requested_doctor_id: Optional[str] = None
    payment_method: Optional[str] = None
    payment_phone: Optional[str] = None
    payment_reference: Optional[str] = None
    payment_proof: Optional[dict] = None
    payment_amount: Optional[int] = None
    payment_status: Optional[str] = None
    payment_chat_notified: Optional[bool] = None

class IntakeScheduleUpdate(BaseModel):
    scheduled_at: datetime
    meeting_url: Optional[str] = None

class IntakeAssignDoctor(BaseModel):
    doctor_id: str

class IntakePaymentUpdate(BaseModel):
    status: Literal["pending", "confirmed", "rejected"]

class AdminMetricsResponse(BaseModel):
    totals: dict
    payments: dict
    statuses: dict
    types: dict
    recent: dict
    categories: List[dict]
    doctors: List[dict]

class ProvisionDoctorsResponse(BaseModel):
    status: str
    message: Optional[str] = None
    csv: Optional[str] = None

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

@api_router.post("/auth/register", response_model=TokenResponse)
async def register_user(input: UserCreate):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    email = input.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email deja utilise")
    user_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    openim_tokens = None
    openim_user_id = None
    if openim_client.can_register():
        try:
            openim_payload = await asyncio.to_thread(
                openim_client.register_user,
                input.name.strip(),
                email,
                input.password,
            )
            openim_tokens = build_openim_tokens(openim_payload)
            if openim_tokens:
                openim_user_id = openim_tokens.user_id
        except OpenIMError as exc:
            logger.warning("OpenIM register failed: %s", exc)
    user_doc = {
        "id": user_id,
        "name": input.name.strip(),
        "email": email,
        "phone": input.phone.strip(),
        "password_hash": hash_password(input.password),
        "openim_password_hash": hash_openim_password(input.password),
        "role": "patient",
        "created_at": created_at,
        "openim_user_id": openim_user_id,
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_id, email, "patient")
    return TokenResponse(
        access_token=token,
        user=UserResponse(**sanitize_user(user_doc)),
        openim=openim_tokens,
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login_user(input: UserLogin):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    email = input.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(input.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Identifiants invalides")
    openim_password_hash = hash_openim_password(input.password)
    if user.get("openim_password_hash") != openim_password_hash:
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"openim_password_hash": openim_password_hash}},
        )
        user["openim_password_hash"] = openim_password_hash
    openim_tokens = None
    if openim_client.can_login():
        try:
            if not user.get("openim_user_id") and openim_client.can_register():
                try:
                    openim_payload = await asyncio.to_thread(
                        openim_client.register_user,
                        user.get("name", "").strip() or "Patient",
                        email,
                        input.password,
                    )
                    openim_tokens = build_openim_tokens(openim_payload)
                except OpenIMError as exc:
                    logger.warning("OpenIM auto-register failed: %s", exc)

            if not openim_tokens:
                openim_payload = await asyncio.to_thread(
                    openim_client.login_user,
                    email,
                    input.password,
                )
                openim_tokens = build_openim_tokens(openim_payload)

            if openim_tokens and user.get("openim_user_id") != openim_tokens.user_id:
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {"openim_user_id": openim_tokens.user_id}},
                )
                user["openim_user_id"] = openim_tokens.user_id
        except OpenIMError as exc:
            logger.warning("OpenIM login failed: %s", exc)
    token = create_access_token(user["id"], user["email"], user.get("role", "patient"))
    return TokenResponse(
        access_token=token,
        user=UserResponse(**sanitize_user(user)),
        openim=openim_tokens,
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**sanitize_user(current_user))

@api_router.post("/auth/openim/refresh", response_model=OpenIMTokens)
async def refresh_openim_tokens(current_user: dict = Depends(get_current_user)):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    if not openim_client.can_login():
        raise HTTPException(status_code=503, detail="Messagerie indisponible")

    user = await db.users.find_one({"id": current_user.get("id")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    password_hash = user.get("openim_password_hash")
    if not password_hash:
        raise HTTPException(status_code=409, detail="Mot de passe requis pour reconnecter la messagerie")

    try:
        openim_payload = await asyncio.to_thread(
            openim_client.login_user_hashed,
            user.get("email", ""),
            password_hash,
        )
        openim_tokens = build_openim_tokens(openim_payload)
        if not openim_tokens:
            raise OpenIMError("OpenIM tokens missing")
        if user.get("openim_user_id") != openim_tokens.user_id:
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"openim_user_id": openim_tokens.user_id}},
            )
        return openim_tokens
    except OpenIMError as exc:
        logger.warning("OpenIM refresh failed: %s", exc)
        raise HTTPException(status_code=502, detail="Impossible de rafraichir la messagerie")

@api_router.get("/doctors", response_model=List[DoctorResponse])
async def get_doctors(_: dict = Depends(require_admin)):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    doctors = (
        await db.doctors.find({}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(1000)
    )
    return doctors

@api_router.patch("/doctors/{doctor_id}", response_model=DoctorResponse)
async def update_doctor(doctor_id: str, input: DoctorUpdate, _: dict = Depends(require_admin)):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    update_fields = {k: v for k, v in input.model_dump(exclude_none=True).items()}
    if not update_fields:
        doctor = await db.doctors.find_one({"id": doctor_id}, {"_id": 0})
        if not doctor:
            raise HTTPException(status_code=404, detail="Medecin introuvable")
        return doctor
    if "email" in update_fields:
        email = update_fields["email"].lower()
        existing = await db.doctors.find_one({"email": email, "id": {"$ne": doctor_id}}, {"_id": 1})
        if existing:
            raise HTTPException(status_code=400, detail="Email deja utilise")
        update_fields["email"] = email
    await db.doctors.update_one({"id": doctor_id}, {"$set": update_fields})
    doctor = await db.doctors.find_one({"id": doctor_id}, {"_id": 0})
    if not doctor:
        raise HTTPException(status_code=404, detail="Medecin introuvable")
    return doctor

@api_router.delete("/doctors/{doctor_id}")
async def delete_doctor(doctor_id: str, _: dict = Depends(require_admin)):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    assigned_count = await db.intakes.count_documents({"assigned_doctor_id": doctor_id})
    if assigned_count > 0:
        raise HTTPException(status_code=409, detail="Ce medecin est assigne a des consultations")
    result = await db.doctors.delete_one({"id": doctor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medecin introuvable")
    return {"status": "deleted"}

@api_router.get("/doctors/public", response_model=List[DoctorPublicResponse])
async def get_public_doctors(category: Optional[str] = None):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    doctors = await fetch_doctors_for_category(category)
    if not doctors and category:
        doctors = await fetch_doctors_for_category("generale")
    if not doctors:
        doctors = await fetch_doctors_for_category(None)
    return [
        DoctorPublicResponse(
            id=doctor.get("id", ""),
            name=doctor.get("name", ""),
            specialty=doctor.get("specialty", ""),
            category=doctor.get("category"),
        )
        for doctor in doctors
    ]

@api_router.get("/patients", response_model=List[UserResponse])
async def get_patients(_: dict = Depends(require_admin)):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    patients = (
        await db.users.find({"role": "patient"}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(1000)
    )
    return [UserResponse(**sanitize_user(user)) for user in patients]

@api_router.get("/admin/metrics", response_model=AdminMetricsResponse)
async def get_admin_metrics(_: dict = Depends(require_admin)):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")

    intakes = await db.intakes.find({}, {"_id": 0}).to_list(5000)
    doctors = await db.doctors.find({}, {"_id": 0}).to_list(1000)

    status_counts = {"pending": 0, "scheduled": 0, "done": 0}
    type_counts = {"standard": 0, "express": 0}
    payment_counts = {"pending": 0, "confirmed": 0, "rejected": 0}
    payment_total_confirmed = 0
    category_counts = {}
    doctor_counts = {}
    now = datetime.now(timezone.utc)
    last7 = 0
    last30 = 0

    for intake in intakes:
        status = intake.get("status", "pending")
        status_counts[status] = status_counts.get(status, 0) + 1
        ctype = intake.get("consultation_type") or "standard"
        type_counts[ctype] = type_counts.get(ctype, 0) + 1
        pstatus = intake.get("payment_status") or "pending"
        payment_counts[pstatus] = payment_counts.get(pstatus, 0) + 1
        if pstatus == "confirmed":
            payment_total_confirmed += int(intake.get("payment_amount") or 0)
        category = intake.get("category") or "generale"
        category_counts[category] = category_counts.get(category, 0) + 1
        doctor_id = intake.get("assigned_doctor_id")
        if doctor_id:
            doctor_counts[doctor_id] = doctor_counts.get(doctor_id, 0) + 1

        created_at_raw = intake.get("created_at")
        if created_at_raw:
            try:
                created_at = datetime.fromisoformat(created_at_raw.replace("Z", "+00:00"))
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                delta = now - created_at
                if delta <= timedelta(days=7):
                    last7 += 1
                if delta <= timedelta(days=30):
                    last30 += 1
            except ValueError:
                pass

    doctor_lookup = {doc.get("id"): doc.get("name", "") for doc in doctors}
    top_categories = sorted(
        [{"category": key, "count": value} for key, value in category_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:8]
    top_doctors = sorted(
        [
            {
                "doctor_id": doctor_id,
                "doctor_name": doctor_lookup.get(doctor_id, "Inconnu"),
                "count": count,
            }
            for doctor_id, count in doctor_counts.items()
        ],
        key=lambda x: x["count"],
        reverse=True,
    )[:8]

    return AdminMetricsResponse(
        totals={
            "requests": len(intakes),
            "doctors": len(doctors),
            "patients": await db.users.count_documents({"role": "patient"}),
        },
        payments={
            "confirmed_amount": payment_total_confirmed,
            "pending": payment_counts.get("pending", 0),
            "confirmed": payment_counts.get("confirmed", 0),
            "rejected": payment_counts.get("rejected", 0),
        },
        statuses=status_counts,
        types=type_counts,
        recent={"last7": last7, "last30": last30},
        categories=top_categories,
        doctors=top_doctors,
    )

@api_router.post("/admin/provision-doctors", response_model=ProvisionDoctorsResponse)
async def provision_doctors(_: dict = Depends(require_admin)):
    output_path = "/tmp/doctor_accounts.csv"
    try:
        result = await asyncio.to_thread(
            subprocess.run,
            ["python", "/app/scripts/provision_doctors.py", "--output", output_path],
            capture_output=True,
            text=True,
            check=False,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur provisionnement: {exc}") from exc

    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "Erreur de provisionnement"
        raise HTTPException(status_code=500, detail=detail)

    csv_content = None
    try:
        csv_content = Path(output_path).read_text(encoding="utf-8")
    except Exception:
        csv_content = None

    return ProvisionDoctorsResponse(
        status="ok",
        message=result.stdout.strip() or "Provisionnement termine.",
        csv=csv_content,
    )

@api_router.patch("/patients/{patient_id}", response_model=UserResponse)
async def update_patient(patient_id: str, input: PatientUpdate, _: dict = Depends(require_admin)):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    update_fields = {k: v for k, v in input.model_dump(exclude_none=True).items()}
    if not update_fields:
        user = await db.users.find_one({"id": patient_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="Patient introuvable")
        return UserResponse(**sanitize_user(user))
    if "email" in update_fields:
        email = update_fields["email"].lower()
        existing = await db.users.find_one({"email": email, "id": {"$ne": patient_id}}, {"_id": 1})
        if existing:
            raise HTTPException(status_code=400, detail="Email deja utilise")
        update_fields["email"] = email
    await db.users.update_one({"id": patient_id}, {"$set": update_fields})
    user = await db.users.find_one({"id": patient_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Patient introuvable")
    return UserResponse(**sanitize_user(user))

@api_router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, _: dict = Depends(require_admin)):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    intake_count = await db.intakes.count_documents({"user_id": patient_id})
    if intake_count > 0:
        raise HTTPException(status_code=409, detail="Ce patient a deja des consultations")
    result = await db.users.delete_one({"id": patient_id, "role": "patient"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient introuvable")
    return {"status": "deleted"}

async def fetch_doctors_for_category(category: Optional[str]) -> List[dict]:
    if db is None:
        return []
    query = {}
    if category:
        if category == "generale":
            query = {"$or": [{"category": "generale"}, {"category": {"$exists": False}}]}
        else:
            query = {"category": category}
    doctors = (
        await db.doctors.find(query, {"_id": 0})
        .sort("created_at", -1)
        .to_list(1000)
    )
    return doctors

def build_doctor_summary(doctor: dict) -> dict:
    return {
        "id": doctor.get("id", ""),
        "name": doctor.get("name", ""),
        "specialty": doctor.get("specialty", ""),
        "email": doctor.get("email", ""),
        "phone": doctor.get("phone", ""),
        "category": doctor.get("category"),
        "openemr_provider_id": doctor.get("openemr_provider_id"),
        "openim_user_id": doctor.get("openim_user_id"),
    }

async def pick_doctor_for_category(category: str) -> Optional[dict]:
    doctors = await fetch_doctors_for_category(category)
    if not doctors and category != "generale":
        doctors = await fetch_doctors_for_category("generale")
    if not doctors and db is not None:
        doctors = (
            await db.doctors.find({}, {"_id": 0})
            .sort("created_at", -1)
            .to_list(1000)
        )
    return doctors[0] if doctors else None

async def create_doctor_record(input: DoctorCreate) -> DoctorCreateResponse:
    email = input.email.lower()
    existing_user = None
    if db is not None:
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        if existing_user and existing_user.get("role") != "doctor":
            raise HTTPException(status_code=400, detail="Email deja utilise par un patient")
    doctor_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    openemr_provider_id = input.openemr_provider_id.strip() if input.openemr_provider_id else None
    category = (input.category or "generale").strip() or "generale"
    doctor_password = choose_doctor_password(existing_user is not None)
    openim_user_id = None
    openim_password = None
    openim_created = False

    if doctor_password and openim_client.can_register():
        try:
            openim_payload = await asyncio.to_thread(
                openim_client.register_user,
                input.name.strip(),
                email,
                doctor_password,
            )
            openim_tokens = build_openim_tokens(openim_payload)
            if openim_tokens:
                openim_user_id = openim_tokens.user_id
                openim_password = doctor_password
                openim_created = True
        except OpenIMError as exc:
            logger.warning("OpenIM doctor register failed: %s", exc)

    doctor_doc = {
        "id": doctor_id,
        "name": input.name.strip(),
        "email": email,
        "phone": input.phone.strip(),
        "specialty": input.specialty.strip(),
        "category": category,
        "openemr_provider_id": openemr_provider_id,
        "openim_user_id": openim_user_id,
        "created_at": created_at,
    }
    await db.doctors.insert_one(doctor_doc)
    santia_user_id = None
    santia_created = False
    santia_password = None
    if db is not None:
        if existing_user:
            santia_user_id = existing_user.get("id")
            await db.users.update_one(
                {"id": santia_user_id},
                {"$set": {
                    "doctor_id": doctor_id,
                    "phone": input.phone.strip(),
                    "name": input.name.strip(),
                    "openim_user_id": openim_user_id or existing_user.get("openim_user_id"),
                }},
            )
        elif doctor_password:
            santia_user_id = str(uuid.uuid4())
            await db.users.insert_one({
                "id": santia_user_id,
                "name": input.name.strip(),
                "email": email,
                "phone": input.phone.strip(),
                "password_hash": hash_password(doctor_password),
                "openim_password_hash": hash_openim_password(doctor_password),
                "role": "doctor",
                "doctor_id": doctor_id,
                "created_at": created_at,
                "openim_user_id": openim_user_id,
            })
            santia_created = True
            santia_password = doctor_password

    openemr_created = False
    openemr_password = None
    if not openemr_provider_id and doctor_password and openemr_db_params():
        try:
            result = await asyncio.to_thread(provision_openemr_user_sync, doctor_doc, doctor_password)
            if result:
                openemr_provider_id, openemr_created = result
                if openemr_provider_id:
                    await db.doctors.update_one(
                        {"id": doctor_id},
                        {"$set": {"openemr_provider_id": openemr_provider_id}},
                    )
                    doctor_doc["openemr_provider_id"] = openemr_provider_id
                if openemr_created:
                    openemr_password = doctor_password
        except Exception as exc:
            logger.warning("OpenEMR doctor provision failed: %s", exc)

    if santia_user_id:
        await db.doctors.update_one(
            {"id": doctor_id},
            {"$set": {"santia_user_id": santia_user_id}},
        )
    return DoctorCreateResponse(
        **doctor_doc,
        openim_password=openim_password,
        openim_created=openim_created,
        santia_password=santia_password,
        santia_created=santia_created,
        openemr_password=openemr_password,
        openemr_created=openemr_created,
    )

@api_router.post("/doctors", response_model=DoctorCreateResponse)
async def create_doctor(input: DoctorCreate, _: dict = Depends(require_admin)):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    email = input.email.lower()
    existing = await db.doctors.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email deja utilise")
    user_conflict = await db.users.find_one({"email": email}, {"_id": 0})
    if user_conflict and user_conflict.get("role") != "doctor":
        raise HTTPException(status_code=400, detail="Email deja utilise par un patient")
    return await create_doctor_record(input)

def default_doctor_samples_by_category() -> dict:
    return {
        "generale": [
            DoctorCreate(
                name="Armand Tchokote",
                email="armand.tchokote@santia.care",
                phone="+237 6 75 44 33 22",
                specialty="Medecine generale",
                category="generale",
            ),
            DoctorCreate(
                name="Mireille Ndi",
                email="mireille.ndi@santia.care",
                phone="+237 6 56 12 34 45",
                specialty="Medecine generale",
                category="generale",
            ),
            DoctorCreate(
                name="Patrick Nkoulou",
                email="patrick.nkoulou@santia.care",
                phone="+237 6 62 45 78 90",
                specialty="Medecine generale",
                category="generale",
            ),
        ],
        "perte-de-poids": [
            DoctorCreate(
                name="Sandrine Mbida",
                email="sandrine.mbida@santia.care",
                phone="+237 6 70 11 22 33",
                specialty="Nutrition et perte de poids",
                category="perte-de-poids",
            ),
            DoctorCreate(
                name="Clarisse Ndi",
                email="clarisse.ndi@santia.care",
                phone="+237 6 79 14 28 36",
                specialty="Nutrition clinique",
                category="perte-de-poids",
            ),
            DoctorCreate(
                name="Josephine Mbarga",
                email="josephine.mbarga@santia.care",
                phone="+237 6 88 41 77 09",
                specialty="Metabolisme et controle du poids",
                category="perte-de-poids",
            ),
        ],
        "sante-sexuelle": [
            DoctorCreate(
                name="Prisca Fotsing",
                email="prisca.fotsing@santia.care",
                phone="+237 6 88 32 10 98",
                specialty="Sante sexuelle",
                category="sante-sexuelle",
            ),
            DoctorCreate(
                name="Nadia Mballa",
                email="nadia.mballa@santia.care",
                phone="+237 6 93 22 15 47",
                specialty="Sante sexuelle et IST",
                category="sante-sexuelle",
            ),
            DoctorCreate(
                name="Yannick Ndi",
                email="yannick.ndi@santia.care",
                phone="+237 6 54 90 11 66",
                specialty="Sante reproductive",
                category="sante-sexuelle",
            ),
        ],
        "addictions": [
            DoctorCreate(
                name="Alain Njoya",
                email="alain.njoya@santia.care",
                phone="+237 6 91 23 45 67",
                specialty="Addictologie",
                category="addictions",
            ),
            DoctorCreate(
                name="Samuel Fotso",
                email="samuel.fotso@santia.care",
                phone="+237 6 52 60 11 24",
                specialty="Sevrage et accompagnement",
                category="addictions",
            ),
            DoctorCreate(
                name="Carine Meka",
                email="carine.meka@santia.care",
                phone="+237 6 84 31 09 58",
                specialty="Tabac, alcool, dependances",
                category="addictions",
            ),
        ],
        "sommeil": [
            DoctorCreate(
                name="Aline Kengne",
                email="aline.kengne@santia.care",
                phone="+237 6 50 98 76 54",
                specialty="Sommeil et stress",
                category="sommeil",
            ),
            DoctorCreate(
                name="Judith Ebana",
                email="judith.ebana@santia.care",
                phone="+237 6 78 30 14 22",
                specialty="Anxiete et fatigue chronique",
                category="sommeil",
            ),
            DoctorCreate(
                name="Olivier Ndi",
                email="olivier.ndi@santia.care",
                phone="+237 6 69 42 18 07",
                specialty="Troubles du sommeil",
                category="sommeil",
            ),
        ],
        "cheveux": [
            DoctorCreate(
                name="Serge Mbarga",
                email="serge.mbarga@santia.care",
                phone="+237 6 96 55 44 11",
                specialty="Dermatologie, peau et cheveux",
                category="cheveux",
            ),
            DoctorCreate(
                name="Odile Essomba",
                email="odile.essomba@santia.care",
                phone="+237 6 83 27 56 44",
                specialty="Dermatologie clinique",
                category="cheveux",
            ),
            DoctorCreate(
                name="Loic Fomba",
                email="loic.fomba@santia.care",
                phone="+237 6 72 19 88 33",
                specialty="Chute de cheveux et cuir chevelu",
                category="cheveux",
            ),
        ],
    }

def default_doctor_samples() -> List[DoctorCreate]:
    samples_by_category = default_doctor_samples_by_category()
    return [sample for group in samples_by_category.values() for sample in group]

@api_router.post("/doctors/seed", response_model=DoctorSeedResponse)
async def seed_doctors(_: dict = Depends(require_admin)):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")

    samples = default_doctor_samples()

    created = []
    skipped = []
    for sample in samples:
        email = sample.email.lower()
        existing = await db.doctors.find_one({"email": email})
        if existing:
            skipped.append(email)
            continue
        created.append(await create_doctor_record(sample))

    return DoctorSeedResponse(created=created, skipped=skipped)

# Intake Form Endpoint
@api_router.post("/intake", response_model=IntakeResponse)
async def create_intake(input: IntakeCreate, current_user: dict = Depends(get_current_user)):
    if not input.consent:
        raise HTTPException(status_code=400, detail="Le consentement est requis")
    
    intake_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    meeting_url = generate_meeting_url(intake_id)
    consultation_type = input.consultation_type or "standard"
    payment_amount = payment_amount_for_type(consultation_type)

    openemr_patient_id = None
    if openemr_client.is_configured():
        try:
            openemr_patient_id = await asyncio.to_thread(openemr_client.create_patient, input)
        except OpenEMRError as exc:
            logger.error("OpenEMR integration failed: %s", exc)
            raise HTTPException(status_code=502, detail="Erreur lors de la creation du dossier patient")

    assigned_doctor = None
    requested_doctor_id = (input.requested_doctor_id or "").strip() or None
    if db is not None:
        if requested_doctor_id:
            requested_doctor = await db.doctors.find_one({"id": requested_doctor_id}, {"_id": 0})
            if not requested_doctor:
                raise HTTPException(status_code=400, detail="Medecin indisponible")
            doctor_category = requested_doctor.get("category")
            if doctor_category and doctor_category not in {"generale", input.category}:
                raise HTTPException(status_code=400, detail="Medecin incompatible avec la pathologie")
            assigned_doctor = requested_doctor
        if assigned_doctor is None:
            assigned_doctor = await pick_doctor_for_category(input.category)
    patient_openim_id = current_user.get("openim_user_id")
    doctor_openim_id = assigned_doctor.get("openim_user_id") if assigned_doctor else None
    doctor_summary = build_doctor_summary(assigned_doctor) if assigned_doctor else None
    
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
        "consultation_type": consultation_type,
        "payment_method": input.payment_method,
        "payment_phone": input.payment_phone,
        "payment_reference": input.payment_reference,
        "payment_proof": input.payment_proof,
        "payment_amount": payment_amount,
        "payment_status": input.payment_status or "pending",
        "status": "pending",
        "created_at": created_at,
        "scheduled_at": None,
        "meeting_url": meeting_url,
        "whatsapp_link": None,
        "user_id": current_user.get("id"),
        "requested_doctor_id": requested_doctor_id,
        "assigned_doctor_id": assigned_doctor.get("id") if assigned_doctor else None,
        "assigned_doctor": doctor_summary,
        "openim_patient_id": patient_openim_id if patient_openim_id else None,
        "openim_doctor_id": doctor_openim_id if doctor_openim_id else None,
        "openim_intro_sent": False,
        "openemr_patient_id": openemr_patient_id,
        "openemr_appointment_id": None,
    }
    
    if db is not None:
        await db.intakes.insert_one(doc)

    if assigned_doctor and patient_openim_id and doctor_openim_id and openim_client.can_send_message():
        patient_name = doc.get("name", "Patient")
        doctor_name = assigned_doctor.get("name", "Votre medecin")
        intro = (
            f"Bonjour {patient_name}, je suis Dr {doctor_name}. "
            "Je vais assurer votre teleconsultation. "
            "Vous pouvez m ecrire ici pour preparer le rendez-vous."
        )
        try:
            await asyncio.to_thread(
                openim_client.send_text_message,
                doctor_openim_id,
                patient_openim_id,
                intro,
            )
            doc["openim_intro_sent"] = True
            if db is not None:
                await db.intakes.update_one(
                    {"id": intake_id},
                    {"$set": {"openim_intro_sent": True}},
                )
        except OpenIMError as exc:
            logger.warning("OpenIM intro message failed: %s", exc)
    
    # Return without _id
    if "_id" in doc:
        del doc["_id"]
    
    return IntakeResponse(**doc)

@api_router.get("/intakes", response_model=List[IntakeResponse])
async def get_intakes(_: dict = Depends(require_admin)):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    intakes = await db.intakes.find({}, {"_id": 0}).to_list(1000)
    updated = []
    for intake in intakes:
        updated.append(await ensure_meeting_url(intake))
    return updated

@api_router.get("/intakes/me", response_model=List[IntakeResponse])
async def get_my_intakes(current_user: dict = Depends(get_current_user)):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    intakes = (
        await db.intakes.find({"user_id": current_user.get("id")}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(1000)
    )
    updated = []
    for intake in intakes:
        updated.append(await ensure_meeting_url(intake))
    return updated

@api_router.get("/intakes/{intake_id}", response_model=IntakeResponse)
async def get_intake(intake_id: str, current_user: dict = Depends(get_current_user)):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    intake = await db.intakes.find_one({"id": intake_id}, {"_id": 0})
    if not intake:
        raise HTTPException(status_code=404, detail="Dossier introuvable")
    if current_user.get("role") != "admin" and intake.get("user_id") and intake.get("user_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Acces refuse")
    return await ensure_meeting_url(intake)

@api_router.patch("/intakes/{intake_id}/schedule", response_model=IntakeResponse)
async def schedule_intake(intake_id: str, input: IntakeScheduleUpdate, _: dict = Depends(require_admin)):
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

    assigned_doctor = intake.get("assigned_doctor") or {}
    provider_id = assigned_doctor.get("openemr_provider_id")

    if openemr_client.is_configured() and intake.get("openemr_patient_id") and not intake.get("openemr_appointment_id"):
        try:
            appt_id = await asyncio.to_thread(
                openemr_client.create_appointment,
                intake["openemr_patient_id"],
                intake,
                input.scheduled_at,
                provider_id,
            )
            update_fields["openemr_appointment_id"] = appt_id
        except OpenEMRError as exc:
            logger.error("OpenEMR appointment scheduling failed: %s", exc)
            raise HTTPException(status_code=502, detail="Erreur lors de la creation du rendez-vous")

    await db.intakes.update_one({"id": intake_id}, {"$set": update_fields})
    updated = {**intake, **update_fields}
    return updated

@api_router.patch("/intakes/{intake_id}/assign", response_model=IntakeResponse)
async def assign_doctor(intake_id: str, input: IntakeAssignDoctor, _: dict = Depends(require_admin)):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    intake = await db.intakes.find_one({"id": intake_id}, {"_id": 0})
    if not intake:
        raise HTTPException(status_code=404, detail="Dossier introuvable")
    doctor = await db.doctors.find_one({"id": input.doctor_id}, {"_id": 0})
    if not doctor:
        raise HTTPException(status_code=404, detail="Medecin introuvable")

    doctor_summary = build_doctor_summary(doctor)
    update_fields = {
        "assigned_doctor_id": doctor["id"],
        "assigned_doctor": doctor_summary,
    }

    patient_openim_id = None
    doctor_openim_id = doctor.get("openim_user_id")
    patient_user = None
    if intake.get("user_id"):
        patient_user = await db.users.find_one({"id": intake["user_id"]}, {"_id": 0})
        if patient_user:
            patient_openim_id = patient_user.get("openim_user_id")

    if patient_openim_id:
        update_fields["openim_patient_id"] = patient_openim_id
    if doctor_openim_id:
        update_fields["openim_doctor_id"] = doctor_openim_id

    should_send_intro = (
        openim_client.can_send_message()
        and patient_openim_id
        and doctor_openim_id
        and (
            not intake.get("openim_intro_sent")
            or intake.get("openim_doctor_id") != doctor_openim_id
        )
    )

    if should_send_intro:
        patient_name = intake.get("name", "Patient")
        doctor_name = doctor.get("name", "Votre medecin")
        intro = (
            f"Bonjour {patient_name}, je suis Dr {doctor_name}. "
            "Je vais assurer votre teleconsultation. "
            "Vous pouvez m ecrire ici pour preparer le rendez-vous."
        )
        try:
            await asyncio.to_thread(
                openim_client.send_text_message,
                doctor_openim_id,
                patient_openim_id,
                intro,
            )
            update_fields["openim_intro_sent"] = True
        except OpenIMError as exc:
            logger.warning("OpenIM intro message failed: %s", exc)

    await db.intakes.update_one({"id": intake_id}, {"$set": update_fields})
    updated = {**intake, **update_fields}
    return updated

@api_router.patch("/intakes/{intake_id}/payment", response_model=IntakeResponse)
async def update_payment_status(intake_id: str, input: IntakePaymentUpdate, _: dict = Depends(require_admin)):
    if db is None:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    intake = await db.intakes.find_one({"id": intake_id}, {"_id": 0})
    if not intake:
        raise HTTPException(status_code=404, detail="Dossier introuvable")
    previous_status = intake.get("payment_status")
    update_fields = {"payment_status": input.status}

    if input.status == "confirmed" and previous_status != "confirmed":
        patient_openim_id = intake.get("openim_patient_id")
        doctor_openim_id = intake.get("openim_doctor_id")
        if not doctor_openim_id and intake.get("assigned_doctor_id"):
            doctor = await db.doctors.find_one({"id": intake["assigned_doctor_id"]}, {"_id": 0})
            if doctor:
                doctor_openim_id = doctor.get("openim_user_id")
                if doctor_openim_id:
                    update_fields["openim_doctor_id"] = doctor_openim_id
        if not patient_openim_id and intake.get("user_id"):
            patient_user = await db.users.find_one({"id": intake["user_id"]}, {"_id": 0})
            if patient_user:
                patient_openim_id = patient_user.get("openim_user_id")
                if patient_openim_id:
                    update_fields["openim_patient_id"] = patient_openim_id
        if openim_client.can_send_message() and patient_openim_id and doctor_openim_id:
            patient_name = intake.get("name", "Patient")
            message = (
                f"Bonjour Dr, le paiement de {patient_name} est approuve. "
                "Merci d initier la conversation pour la teleconsultation."
            )
            try:
                await asyncio.to_thread(
                    openim_client.send_text_message,
                    patient_openim_id,
                    doctor_openim_id,
                    message,
                )
                update_fields["payment_chat_notified"] = True
            except OpenIMError as exc:
                logger.warning("OpenIM payment message failed: %s", exc)
    await db.intakes.update_one({"id": intake_id}, {"$set": update_fields})
    updated = {**intake, **update_fields}
    return updated


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=parse_cors_origins(),
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

@app.on_event("startup")
async def ensure_admin_user():
    if db is None or not ADMIN_EMAIL or not ADMIN_PASSWORD:
        return
    email = ADMIN_EMAIL.strip().lower()
    if not email:
        return
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    password_hash = hash_password(ADMIN_PASSWORD)
    if existing:
        update_fields = {
            "name": ADMIN_NAME.strip() or existing.get("name", "Admin"),
            "phone": ADMIN_PHONE.strip() or existing.get("phone", ""),
            "role": "admin",
            "password_hash": password_hash,
        }
        await db.users.update_one({"id": existing["id"]}, {"$set": update_fields})
        return

    user_doc = {
        "id": str(uuid.uuid4()),
        "name": ADMIN_NAME.strip() or "Admin",
        "email": email,
        "phone": ADMIN_PHONE.strip(),
        "password_hash": password_hash,
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "openim_user_id": None,
    }
    await db.users.insert_one(user_doc)

@app.on_event("startup")
async def ensure_default_doctors():
    if db is None:
        return
    samples_by_category = default_doctor_samples_by_category()
    for category, samples in samples_by_category.items():
        if category == "generale":
            query = {"$or": [{"category": "generale"}, {"category": {"$exists": False}}]}
        else:
            query = {"category": category}
        count = await db.doctors.count_documents(query)
        if count >= 3:
            continue
        for sample in samples:
            if count >= 3:
                break
            existing = await db.doctors.find_one({"email": sample.email.lower()}, {"_id": 1})
            if existing:
                continue
            try:
                await create_doctor_record(sample)
                count += 1
            except Exception as exc:
                logger.warning("Default doctor seed failed for %s: %s", sample.email, exc)
