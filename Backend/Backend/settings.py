import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
from decouple import config
import dj_database_url

# ============================
# Base Directory
# ============================
BASE_DIR = Path(__file__).resolve().parent.parent

# ============================
# Charger le fichier .env
# ============================
load_dotenv(os.path.join(BASE_DIR, ".env"))

# ============================
# Variables d'environnement
# ============================
def get_env_variable(var_name):
    value = config(var_name, default=None)
    if not value:
        raise Exception(f"La variable d'environnement {var_name} est manquante !")
    return value

SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)

# Variables optionnelles avec valeurs par défaut
OPENAI_API_KEY = config("OPENAI_API_KEY", default="")
GOOGLE_GENAI_API_KEY = config("GOOGLE_GENAI_API_KEY", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
CLERK_SECRET_KEY = config("CLERK_SECRET_KEY", default="")
GOOGLE_APPLICATION_CREDENTIALS = config("GOOGLE_APPLICATION_CREDENTIALS", default="")

# Définir les variables d'environnement seulement si elles existent
if GOOGLE_GENAI_API_KEY:
    os.environ["GENAI_API_KEY"] = GOOGLE_GENAI_API_KEY
if GOOGLE_APPLICATION_CREDENTIALS:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS

# ============================
# Debug & Hosts
# ============================
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1,.onrender.com").split(",")

# ============================
# CORS Configuration
# ============================
# Pour le développement et la production
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://localhost:3000",
    "https://localhost:5173",
]

# En production, vous pouvez autoriser toutes les origines temporairement
# Attention : pas recommandé en production finale !
CORS_ALLOW_ALL_ORIGINS = config("CORS_ALLOW_ALL_ORIGINS", default=True, cast=bool)
ALLOWED_HOSTS = ["finalproject-bu3e.onrender.com", "localhost", "127.0.0.1"]

# ============================
# Application definition
# ============================
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Apps tierces
    "corsheaders",
    "graphene_django",
    "graphql_jwt.refresh_token",
    "social_django",

    # Mes apps
    "users",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # Ajouté pour servir les fichiers statiques
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "Backend.clerk_auth.ClerkAuthMiddleware",
]

ROOT_URLCONF = "Backend.urls"

# ============================
# Templates
# ============================
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "Backend.wsgi.application"

# ============================
# Database
# ============================
DATABASES = {
   "default": dj_database_url.parse(config("DATABASE_URL"))
}

# ============================
# Auth
# ============================
AUTH_USER_MODEL = "users.CustomUser"

AUTHENTICATION_BACKENDS = [
    "graphql_jwt.backends.JSONWebTokenBackend",
    "django.contrib.auth.backends.ModelBackend",
    "social_core.backends.linkedin.LinkedinOAuth2",
]

# ============================
# Password validation
# ============================
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# ============================
# GraphQL / JWT
# ============================
GRAPHENE = {
    "SCHEMA": "Backend.schema.schema",
    "MIDDLEWARE": [
        "graphql_jwt.middleware.JSONWebTokenMiddleware",
    ],
}

GRAPHQL_JWT = {
    "JWT_AUTH_HEADER_PREFIX": "Bearer",
    "JWT_SECRET_KEY": SECRET_KEY,
    "JWT_ALGORITHM": "HS256",
    "JWT_VERIFY_EXPIRATION": True,
    "JWT_EXPIRATION_DELTA": timedelta(days=7),
    "JWT_ALLOW_REFRESH": True,
    "JWT_REFRESH_EXPIRATION_DELTA": timedelta(days=30),
}

# ============================
# Social Auth (LinkedIn)
# ============================
SOCIAL_AUTH_LINKEDIN_OAUTH2_KEY = config("SOCIAL_AUTH_LINKEDIN_OAUTH2_KEY", default="")
SOCIAL_AUTH_LINKEDIN_OAUTH2_SECRET = config("SOCIAL_AUTH_LINKEDIN_OAUTH2_SECRET", default="")
SOCIAL_AUTH_LINKEDIN_OAUTH2_SCOPE = ["r_liteprofile", "r_emailaddress"]
SOCIAL_AUTH_LINKEDIN_OAUTH2_FIELD_SELECTORS = ["emailAddress"]
SOCIAL_AUTH_LINKEDIN_OAUTH2_EXTRA_DATA = [("emailAddress", "email_address")]

# ============================
# Internationalization
# ============================
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Indian/Antananarivo"
USE_I18N = True
USE_TZ = True

# ============================
# Static & Media
# ============================
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

# STATICFILES_DIRS commenté car le dossier n'existe pas
# Créez le dossier Backend/static si vous voulez l'utiliser
# STATICFILES_DIRS = [
#     os.path.join(BASE_DIR, "static"),
# ]

# Configuration pour WhiteNoise (servir les fichiers statiques en production)
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ============================
# Default primary key field type
# ============================
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"