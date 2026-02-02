#!/usr/bin/env python3
import argparse
import csv
import os
import re
import uuid
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from passlib.context import CryptContext
from pymongo import MongoClient
import pymysql


ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def hash_openim_password(password: str) -> str:
    import hashlib

    return hashlib.md5(password.encode("utf-8")).hexdigest()


def generate_password(length: int = 10) -> str:
    import secrets
    import string

    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "", (value or "").lower())
    return slug or "doctor"


def split_name(full_name: str) -> dict:
    parts = [p for p in re.split(r"\s+", (full_name or "").strip()) if p]
    if not parts:
        return {"fname": "Medecin", "mname": "", "lname": "Santia"}
    if len(parts) == 1:
        return {"fname": parts[0], "mname": "", "lname": "Santia"}
    if len(parts) == 2:
        return {"fname": parts[0], "mname": "", "lname": parts[1]}
    return {"fname": parts[0], "mname": " ".join(parts[1:-1]), "lname": parts[-1]}


def connect_mongo():
    mongo_url = os.environ.get("MONGO_URL")
    if not mongo_url:
        raise RuntimeError("MONGO_URL manquant")
    client = MongoClient(mongo_url)
    db_name = os.environ.get("DB_NAME", "santia")
    return client[db_name]


def connect_openemr():
    host = os.environ.get("OPENEMR_DB_HOST") or os.environ.get("OPENEMR_MYSQL_HOST") or "openemr-mysql"
    port = int(os.environ.get("OPENEMR_DB_PORT", "3306"))
    user = os.environ.get("OPENEMR_DB_USER", "root")
    password = os.environ.get("OPENEMR_DB_PASSWORD")
    if not password:
        password = os.environ.get("OPENEMR_MYSQL_ROOT_PASSWORD") or os.environ.get("OPENEMR_MYSQL_PASSWORD")
    if not password:
        raise RuntimeError("OPENEMR_DB_PASSWORD/OPENEMR_MYSQL_ROOT_PASSWORD manquant")
    database = os.environ.get("OPENEMR_DB_NAME", "openemr")
    return pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        cursorclass=pymysql.cursors.DictCursor,
    )


def fetch_table_info(cursor, table: str) -> list[dict]:
    cursor.execute(f"DESCRIBE `{table}`")
    return cursor.fetchall()


def table_columns(info: list[dict]) -> list[str]:
    return [row["Field"] for row in info]


def table_extras(info: list[dict]) -> dict:
    return {row["Field"]: row.get("Extra", "") for row in info}


def table_types(info: list[dict]) -> dict:
    return {row["Field"]: row.get("Type", "") for row in info}


def fetch_template_row(cursor, table: str, columns: list[str]):
    name_col = "username" if "username" in columns else "id"
    cursor.execute(f"SELECT * FROM `{table}` WHERE `{name_col}`='admin' LIMIT 1")
    row = cursor.fetchone()
    if row:
        return row
    cursor.execute(f"SELECT * FROM `{table}` LIMIT 1")
    return cursor.fetchone()


def build_username(cursor, base: str, name_col: str) -> str:
    candidate = slugify(base)
    suffix = 1
    while True:
        cursor.execute(
            "SELECT 1 FROM `users` WHERE `username`=%s LIMIT 1",
            (candidate,),
        )
        if not cursor.fetchone():
            return candidate
        candidate = f"{slugify(base)}{suffix}"
        suffix += 1


def insert_row(cursor, table: str, row: dict):
    columns = list(row.keys())
    col_sql = ", ".join(f"`{col}`" for col in columns)
    placeholders = ", ".join(["%s"] * len(columns))
    sql = f"INSERT INTO `{table}` ({col_sql}) VALUES ({placeholders})"
    cursor.execute(sql, [row[col] for col in columns])


def ensure_group_membership(cursor, username: str, group_name: str = "Default"):
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
        (group_name, username),
    )
    if cursor.fetchone():
        return
    row = {name_col: group_name, user_col: username}
    insert_row(cursor, "groups", row)


def enable_openemr_globals(cursor):
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


def enable_openemr_modules(cursor):
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


def ensure_openemr_user(conn, doctor: dict, password: str, reset_password: bool = False) -> tuple[str, bool]:
    cursor = conn.cursor()
    user_info = fetch_table_info(cursor, "users")
    secure_info = fetch_table_info(cursor, "users_secure")
    user_columns = table_columns(user_info)
    secure_columns = table_columns(secure_info)
    user_extras = table_extras(user_info)
    user_types = table_types(user_info)
    id_auto = "auto_increment" in user_extras.get("id", "")
    name_col = "username" if "username" in user_columns else "id"
    name_parts = split_name(doctor.get("name", ""))
    email = (doctor.get("email") or "").lower()
    base = email.split("@")[0] if email else doctor.get("name", "doctor")
    preferred = doctor.get("openemr_provider_id") or base
    username = build_username(cursor, preferred, name_col)

    cursor.execute("SELECT * FROM `users` WHERE `username`=%s LIMIT 1", (username,))
    existing = cursor.fetchone()
    if existing:
        if reset_password:
            _reset_openemr_password(conn, existing.get("id") or username, password)
        return str(existing.get("id") or username), False

    template_user = fetch_template_row(cursor, "users", user_columns)
    template_secure = fetch_template_row(cursor, "users_secure", secure_columns)
    if not template_user or not template_secure:
        raise RuntimeError("Impossible de trouver les tables users/users_secure dans OpenEMR.")

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
    insert_row(cursor, "users", user_row)
    user_id = cursor.lastrowid

    password_hash = pwd_context.hash(password)
    secure_row = dict(template_secure)
    secure_row["id"] = user_id
    if "username" in secure_row:
        secure_row["username"] = username
    if "password" in secure_row:
        secure_row["password"] = password_hash
    if "salt" in secure_row:
        secure_row["salt"] = ""
    if "last_update" in secure_row:
        secure_row["last_update"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    insert_row(cursor, "users_secure", secure_row)

    ensure_group_membership(cursor, username)
    conn.commit()
    return str(user_id), True


def _reset_openemr_password(conn, user_identifier: str, password: str) -> None:
    cursor = conn.cursor()
    password_hash = pwd_context.hash(password)
    cursor.execute(
        "SELECT * FROM `users_secure` WHERE `id`=%s OR `username`=%s LIMIT 1",
        (user_identifier, user_identifier),
    )
    row = cursor.fetchone()
    if not row:
        return
    updates = {}
    if "password" in row:
        updates["password"] = password_hash
    if "salt" in row:
        updates["salt"] = ""
    if "last_update" in row:
        updates["last_update"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    if not updates:
        return
    set_clause = ", ".join(f"`{key}`=%s" for key in updates.keys())
    cursor.execute(
        f"UPDATE `users_secure` SET {set_clause} WHERE `id`=%s OR `username`=%s",
        [*updates.values(), user_identifier, user_identifier],
    )
    conn.commit()


def main():
    parser = argparse.ArgumentParser(description="Provisionne les medecins Santia dans OpenEMR.")
    parser.add_argument("--default-password", dest="default_password", help="Mot de passe par defaut")
    parser.add_argument("--reset-openemr-passwords", action="store_true", help="Met a jour le mot de passe OpenEMR si le compte existe")
    parser.add_argument("--output", default="doctor_accounts.csv", help="Chemin du fichier CSV de sortie")
    args = parser.parse_args()

    db = connect_mongo()
    openemr = connect_openemr()

    enable_openemr_globals(openemr.cursor())
    enable_openemr_modules(openemr.cursor())
    openemr.commit()

    doctors = list(db.doctors.find({}, {"_id": 0}))
    if not doctors:
        print("Aucun medecin Santia trouve.")
        return

    created_rows = []
    for doctor in doctors:
        email = (doctor.get("email") or "").lower()
        doctor_id = doctor.get("id")
        if not doctor_id:
            continue

        user = db.users.find_one(
            {"role": "doctor", "$or": [{"doctor_id": doctor_id}, {"email": email}]},
            {"_id": 0},
        )
        password = args.default_password or generate_password()
        if user:
            santia_user_id = user["id"]
        else:
            santia_user_id = str(uuid.uuid4())
            db.users.insert_one({
                "id": santia_user_id,
                "name": doctor.get("name", "Medecin Santia"),
                "email": email,
                "phone": doctor.get("phone", ""),
                "password_hash": hash_password(password),
                "openim_password_hash": hash_openim_password(password),
                "role": "doctor",
                "doctor_id": doctor_id,
                "created_at": datetime.utcnow().isoformat(),
                "openim_user_id": doctor.get("openim_user_id"),
            })

        openemr_username, openemr_created = ensure_openemr_user(
            openemr,
            doctor,
            password,
            reset_password=args.reset_openemr_passwords,
        )
        db.doctors.update_one(
            {"id": doctor_id},
            {"$set": {"santia_user_id": santia_user_id, "openemr_provider_id": openemr_username}},
        )

        created_rows.append({
            "doctor_name": doctor.get("name", ""),
            "doctor_email": email,
            "santia_email": email,
            "santia_password": password if not user else "",
            "openemr_username": openemr_username,
            "openemr_password": password if openemr_created or args.reset_openemr_passwords else "",
        })

    output_path = Path(args.output).resolve()
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=[
            "doctor_name",
            "doctor_email",
            "santia_email",
            "santia_password",
            "openemr_username",
            "openemr_password",
        ])
        writer.writeheader()
        writer.writerows(created_rows)

    print(f"Provision termine. CSV: {output_path}")


if __name__ == "__main__":
    main()
