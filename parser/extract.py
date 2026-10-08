"""Extragere structurată din CV cu LlamaExtract + normalizare deterministă în Python.

LlamaExtract (AI-ul din LlamaCloud) citește CV-ul după schema de mai jos. Tot ce vine de acolo trece apoi
prin validare Pydantic și normalizare: date în orice format uzual (inclusiv „martie 2022”, „03/2022”,
„prezent”), tip de angajare, skill-uri canonice și seniority inferat când lipsește.
Orice anomalie nu oprește procesarea: rândurile se păstrează cât mai corect, iar candidatul e marcat `needs_review`.
"""
import re
import unicodedata
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, ValidationError, field_validator

EMPLOYMENT_TYPES = ("full_time", "part_time", "contract", "internship", "freelance")
SENIORITY = ("junior", "mid", "senior", "lead")
Seniority = Literal["junior", "mid", "senior", "lead"]

# ---------------------------------------------------------------- schema pentru LlamaExtract
DATA_SCHEMA = {
    "type": "object",
    "properties": {
        "full_name": {"type": ["string", "null"], "description": "Numele complet al candidatului"},
        "email": {"type": ["string", "null"], "description": "Adresa de email a candidatului"},
        "phone": {"type": ["string", "null"], "description": "Numărul de telefon, exact ca în CV"},
        "location": {"type": ["string", "null"], "description": "Orașul (și țara, dacă nu e România) în care locuiește candidatul"},
        "experiences": {
            "type": "array",
            "description": "Toate experiențele profesionale (angajări, stagii, colaborări, freelancing), de la cea mai recentă. Nu include studiile.",
            "items": {
                "type": "object",
                "properties": {
                    "company_name": {"type": "string", "description": "Numele angajatorului sau clientului"},
                    "role_title": {"type": "string", "description": "Titlul postului, exact ca în CV"},
                    "employment_type": {
                        "type": ["string", "null"], "enum": [*EMPLOYMENT_TYPES, None],
                        "description": "full_time, part_time, contract, internship sau freelance; null dacă nu reiese",
                    },
                    "start_date": {"type": ["string", "null"], "description": "Luna de început, format YYYY-MM (YYYY dacă lipsește luna)"},
                    "end_date": {"type": ["string", "null"], "description": "Luna de final, format YYYY-MM; null dacă rolul e actual"},
                    "is_current": {"type": "boolean", "description": "true dacă rolul e actual (prezent, în prezent, current, present)"},
                    "description": {"type": "string", "description": "Responsabilități și realizări, rezumate fidel, în limba CV-ului"},
                    "seniority_level": {
                        "type": ["string", "null"], "enum": [*SENIORITY, None],
                        "description": "junior, mid, senior sau lead, dedus din titlu, responsabilități și vechime; null dacă nu se poate deduce",
                    },
                    "skills": {"type": "array", "items": {"type": "string"}, "description": "Competențele folosite în acest rol, termeni scurți"},
                },
                "required": ["company_name", "role_title"],
            },
        },
        "skills": {"type": "array", "items": {"type": "string"}, "description": "Toate competențele candidatului, termeni scurți (tehnologii, unelte, limbi străine, certificări)"},
        "education": {"type": "array", "items": {"type": "string"}, "description": "Studiile: instituție, specializare, perioadă"},
        "summary": {"type": "string", "description": "Rezumat profesional de 1-2 propoziții, în limba română"},
    },
    "required": ["experiences"],
}
SYSTEM_PROMPT = (
    "Ești un recruiter care citește CV-uri în română și engleză. Extrage doar ce scrie în CV, nu inventa. "
    "Lunile pot fi scrise în română (ian., februarie, mar ...) sau engleză. „Prezent”, „în prezent”, „actual”, "
    "„present”, „current” înseamnă că rolul e actual. Nu confunda studiile sau proiectele personale cu angajările."
)

# ---------------------------------------------------------------- modelul rezultatului (validare)
class ExperienceIn(BaseModel):
    company_name: str = ""
    role_title: str = ""
    employment_type: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_current: bool | None = None
    description: str | None = ""
    seniority_level: str | None = None
    skills: list[str] = Field(default_factory=list)

    @field_validator("skills", mode="before")
    @classmethod
    def _skills(cls, v):
        return [s for s in (v or []) if isinstance(s, str)]


class ExtractResult(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    experiences: list[ExperienceIn] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    education: list[str] = Field(default_factory=list)
    summary: str | None = ""

    @field_validator("skills", "education", mode="before")
    @classmethod
    def _strings(cls, v):
        return [s for s in (v or []) if isinstance(s, str) and s.strip()]


# ---------------------------------------------------------------- normalizare
def fold(s: str) -> str:
    """Litere mici, fără diacritice."""
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


MONTHS = {
    "ian": 1, "jan": 1, "feb": 2, "mar": 3, "apr": 4, "mai": 5, "may": 5, "iun": 6, "jun": 6,
    "iul": 7, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "noi": 11, "nov": 11, "dec": 12,
}
PRESENT = re.compile(r"^(prezent|in prezent|actual|actualmente|present|current|now|curent|pana in prezent|ongoing)$")


def parse_month(value: str | None) -> tuple[date | None, bool, bool]:
    """(dată, valid, înseamnă_prezent). Gol = necunoscut (valid)."""
    if value is None or not str(value).strip():
        return None, True, False
    v = fold(str(value).strip()).rstrip(".")
    if PRESENT.match(v):
        return None, True, True
    y = m = None
    if mt := re.fullmatch(r"(\d{4})(?:[-/.](\d{1,2}))?(?:[-/.]\d{1,2})?", v):          # 2022, 2022-03, 2022-03-01
        y, m = int(mt[1]), int(mt[2] or 1)
    elif mt := re.fullmatch(r"(\d{1,2})[-/.](\d{4})", v):                              # 03/2022, 3.2022
        y, m = int(mt[2]), int(mt[1])
    elif mt := re.fullmatch(r"([a-z]+)\.?\s*(\d{4})", v):                              # martie 2022, mar. 2022
        m, y = MONTHS.get(mt[1][:3]), int(mt[2])
    if not y or not m or not (1950 <= y <= 2100 and 1 <= m <= 12):
        return None, False, False
    return date(y, m, 1), True, False


EMPLOYMENT_ALIASES = {
    "full_time": ("full", "norma intreaga", "permanent", "angajat"),
    "part_time": ("part", "jumatate de norma", "norma partiala"),
    "internship": ("intern", "stagiu", "practica", "trainee"),
    "freelance": ("freelanc", "pfa", "independent", "self-employed"),
    "contract": ("contract", "colaborare", "consultant", "temporar"),
}


def normalize_employment(value: str | None) -> str | None:
    if not value:
        return None
    v = fold(value).replace("-", " ").replace("_", " ")
    if v.replace(" ", "_") in EMPLOYMENT_TYPES:
        return v.replace(" ", "_")
    return next((k for k, words in EMPLOYMENT_ALIASES.items() if any(w in v for w in words)), None)


CANONICAL_SKILLS = {
    "postgres": "PostgreSQL", "postgresql": "PostgreSQL", "js": "JavaScript", "javascript": "JavaScript",
    "ts": "TypeScript", "typescript": "TypeScript", "node": "Node.js", "nodejs": "Node.js", "node.js": "Node.js",
    "react.js": "React", "reactjs": "React", "k8s": "Kubernetes", "ms excel": "Excel", "microsoft excel": "Excel",
    "ms office": "Microsoft Office", "c#": "C#", "c++": "C++", "golang": "Go", "aws": "AWS", "gcp": "Google Cloud",
    "sql server": "SQL Server", "mssql": "SQL Server", "autocad": "AutoCAD", "sap": "SAP", "git": "Git",
    "python": "Python", "java": "Java", "docker": "Docker", "kubernetes": "Kubernetes", "linux": "Linux",
    "excel": "Excel", "word": "Word", "sql": "SQL", "mysql": "MySQL", "html": "HTML", "css": "CSS", "php": "PHP",
    "react": "React", "angular": "Angular", "vue": "Vue", "django": "Django", "fastapi": "FastAPI",
    "spring boot": "Spring Boot", "power bi": "Power BI", "powerbi": "Power BI", "photoshop": "Photoshop",
    "engleza": "Engleză", "english": "Engleză", "germana": "Germană", "franceza": "Franceză",
}


def clean_skills(skills: list[str]) -> list[str]:
    """Deduplicare fără diferențe de litere/diacritice; la dubluri câștigă scrierea cu majuscule („Python” > „python”)."""
    index: dict[str, int] = {}
    out: list[str] = []
    for s in skills:
        s = " ".join(s.split()).strip(" .,;:-•*")[:80]
        if not s:
            continue
        s = CANONICAL_SKILLS.get(fold(s), s)
        key = fold(s)
        if key not in index:
            index[key] = len(out)
            out.append(s)
        elif out[index[key]].islower() and not s.islower():
            out[index[key]] = s
    return out


def months_between(a: date, b: date) -> int:
    return max(0, (b.year - a.year) * 12 + b.month - a.month)


def merged_months(intervals: list[tuple[date, date]]) -> int:
    """Luni de experiență reală: intervalele suprapuse se numără o singură dată."""
    total, cur = 0, None
    for s, e in sorted(intervals):
        if cur and s <= cur[1]:
            cur = (cur[0], max(cur[1], e))
        else:
            if cur:
                total += months_between(*cur)
            cur = (s, e)
    return total + (months_between(*cur) if cur else 0)


TITLE_RULES = (
    ("junior", r"\b(intern|internship|stagiar|trainee|practicant|apprentice|ucenic)\b"),
    ("lead", r"\b(lead|head|principal|staff|director|manager|sef|coordonator|cto|cfo|ceo|vp|architect|arhitect)\b"),
    ("senior", r"\b(senior|sr)\b"),
    ("junior", r"\b(junior|jr|entry|asistent|assistant|debutant)\b"),
    ("mid", r"\b(mid|middle|medior|intermediate)\b"),
)


def infer_seniority(title: str, months_before: int, months_in_role: int) -> str | None:
    t = fold(title)
    for level, pattern in TITLE_RULES:
        if re.search(pattern, t):
            return level
    total = months_before + months_in_role
    if total <= 0:
        return None
    return "junior" if total < 24 else "mid" if total < 60 else "senior"


EMAIL = re.compile(r"[^@\s<>()]+@[^@\s<>()]+\.[a-z]{2,}", re.I)


def contact_fields(parsed: "ExtractResult", text: str) -> dict:
    """Nume, email, telefon, locație. Emailul se validează și, dacă lipsește, se caută direct în text."""
    email = (parsed.email or "").strip().lower()
    if not EMAIL.fullmatch(email):
        m = EMAIL.search(text or "")
        email = m.group(0).lower() if m else ""
    phone = re.sub(r"[^\d+() .-]", "", parsed.phone or "").strip()
    name = " ".join((parsed.full_name or "").split())
    if name.isupper():
        name = name.title()  # „MARIA POP” -> „Maria Pop”
    return {
        "name": name[:200] or None,
        "email": email[:320] or None,
        "phone": phone[:50] if len(re.sub(r"\D", "", phone)) >= 6 else None,
        "location": " ".join((parsed.location or "").split())[:200] or None,
    }


def to_rows(result: dict, org_id: str, candidate_id: str, today: date | None = None, text: str = "") -> tuple[list[dict], dict, list[str]]:
    """(rânduri candidate_experiences, profil: competențe/educație/rezumat + contact, probleme găsite)."""
    today = today or date.today()
    try:
        parsed = ExtractResult.model_validate(result or {})
    except ValidationError as e:
        return [], {"skills": [], "education": [], "summary": "", "contact": {}}, [f"rezultat invalid: {e.error_count()} erori"]

    issues: list[str] = []
    prepared = []
    for i, e in enumerate(parsed.experiences):
        company, role = " ".join(e.company_name.split()), " ".join(e.role_title.split())
        if not company and not role:
            issues.append(f"experiența {i + 1}: fără companie și rol, ignorată")
            continue
        if not company or not role:
            issues.append(f"experiența {i + 1}: lipsește compania sau rolul")
        start, ok_s, _ = parse_month(e.start_date)
        end, ok_e, end_present = parse_month(e.end_date)
        if not ok_s or not ok_e:
            issues.append(f"experiența {i + 1}: dată ilizibilă ({e.start_date!r} – {e.end_date!r})")
        current = bool(e.is_current) or end_present
        if current:
            end = None
        elif not ok_e:
            end = start  # final ilizibil/lipsă (nu „prezent"): NULL ar însemna „în curs" în view
        if start and start > today:
            issues.append(f"experiența {i + 1}: început în viitor")
            start = None
        if end and end > today:
            end = None  # final planificat: rolul e încă în desfășurare
        if start and end and end < start:
            issues.append(f"experiența {i + 1}: final înainte de început")
            end = start  # nu „prezent": un final necunoscut nu trebuie să umfle experiența
        prepared.append((i, e, company or "Necunoscut", role or "Necunoscut", start, end))

    known = [(s, en or today) for *_, s, en in prepared if s]
    rows = []
    for pos, (i, e, company, role, start, end) in enumerate(prepared):
        seniority = e.seniority_level if e.seniority_level in SENIORITY else None
        if seniority is None:
            before = merged_months([(s, min(en, start)) for s, en in known if start and s < start])
            in_role = months_between(start, end or today) if start else 0
            seniority = infer_seniority(role, before, in_role)
        rows.append({
            "organization_id": org_id,
            "candidate_id": candidate_id,
            "position": pos,
            "company_name": company,
            "role_title": role,
            "employment_type": normalize_employment(e.employment_type),
            "start_date": start.isoformat() if start else None,
            "end_date": end.isoformat() if end else None,
            "description": (e.description or "").strip()[:5000],
            "seniority_level": seniority,
            "extracted_skills": clean_skills(e.skills),
        })

    all_skills = clean_skills(parsed.skills + [s for r in rows for s in r["extracted_skills"]])
    profile = {"skills": all_skills, "education": parsed.education, "summary": (parsed.summary or "").strip(),
               "contact": contact_fields(parsed, text)}
    if not rows:
        issues.append("nicio experiență profesională găsită")
    return rows, profile, issues


if __name__ == "__main__":
    today = date(2026, 9, 1)
    assert parse_month("2021-03")[:2] == (date(2021, 3, 1), True)
    assert parse_month("03/2021")[0] == date(2021, 3, 1)
    assert parse_month("Martie 2022")[0] == date(2022, 3, 1)
    assert parse_month("sept. 2020")[0] == date(2020, 9, 1)
    assert parse_month("În prezent") == (None, True, True)
    assert parse_month("ieri")[1] is False
    assert parse_month("2021-13")[1] is False
    assert normalize_employment("Full-time") == "full_time"
    assert normalize_employment("colaborare") == "contract"
    assert normalize_employment("Stagiu de practică") == "internship"
    assert clean_skills(["postgres", "PostgreSQL", " k8s ", "Python", "python"]) == ["PostgreSQL", "Kubernetes", "Python"]
    assert merged_months([(date(2020, 1, 1), date(2022, 1, 1)), (date(2021, 1, 1), date(2021, 6, 1))]) == 24
    assert infer_seniority("Intern Software Engineer", 0, 3) == "junior"
    assert infer_seniority("Team Lead", 0, 1) == "lead"
    assert infer_seniority("Developer", 70, 12) == "senior"
    assert infer_seniority("Developer", 12, 6) == "junior"

    result = {
        "experiences": [
            {"company_name": "Acme", "role_title": "Backend Developer", "start_date": "2022-03", "end_date": "prezent",
             "employment_type": "Full-time", "skills": ["python", "postgres"], "seniority_level": None},
            {"company_name": "Beta", "role_title": "Developer", "start_date": "2019-01", "end_date": "2022-02",
             "skills": ["Java"], "seniority_level": "mid"},
            {"company_name": "Gamma", "role_title": "Intern", "start_date": "2018-06", "end_date": "2018-09"},
        ],
        "skills": ["Docker", "python"], "education": ["UPB"], "summary": "Dev.",
    }
    rows, profile, issues = to_rows(result, "o", "c", today)
    assert issues == [], issues
    # Backend Developer: 40 luni înainte (Beta + Gamma) + 54 în rol = 7,8 ani -> senior; Beta vine de la AI (mid).
    assert [r["seniority_level"] for r in rows] == ["senior", "mid", "junior"]
    assert rows[0]["end_date"] is None and rows[0]["employment_type"] == "full_time"
    assert profile["skills"] == ["Docker", "Python", "PostgreSQL", "Java"]

    c = to_rows({"full_name": "MARIA POP", "email": "nu-e-email", "phone": "tel: 0722 111 222", "location": " Cluj-Napoca ",
                 "experiences": []}, "o", "c", today, text="Contact: Maria.Pop@Example.com")[1]["contact"]
    assert c == {"name": "Maria Pop", "email": "maria.pop@example.com", "phone": "0722 111 222", "location": "Cluj-Napoca"}, c

    rows, _, issues = to_rows({"experiences": [{"company_name": "X", "role_title": "Y", "start_date": "2022-05", "end_date": "2021-01"}]}, "o", "c", today)
    assert rows[0]["end_date"] == "2022-05-01" and len(issues) == 1
    rows, _, issues = to_rows({"experiences": [{"company_name": "X", "role_title": "Y", "start_date": "2015-03", "end_date": "Q3 2016"}]}, "o", "c", today)
    assert rows[0]["end_date"] == "2015-03-01" and issues, rows
    rows, _, _ = to_rows({"experiences": [{"company_name": "X", "role_title": "Y", "start_date": "2015-03", "end_date": "prezent"}]}, "o", "c", today)
    assert rows[0]["end_date"] is None
    rows, _, issues = to_rows({"experiences": [{"company_name": " ", "role_title": ""}]}, "o", "c", today)
    assert rows == [] and len(issues) == 2
    rows, _, issues = to_rows({"experiences": "gunoi"}, "o", "c", today)
    assert rows == [] and issues and issues[0].startswith("rezultat invalid")
    print("OK: extract")
