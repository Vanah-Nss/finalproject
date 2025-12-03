import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
from decouple import config
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent


load_dotenv(os.path.join(BASE_DIR, ".env"))

def get_env_variable(var_name):
    value = config(var_name, default=None)
    if not value:
        raise Exception(f"La variable d'environnement {var_name} est manquante !")
    return value

SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)

OPENAI_API_KEY = config("OPENAI_API_KEY", default="")
GOOGLE_GENAI_API_KEY = config("GOOGLE_GENAI_API_KEY", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
CLERK_SECRET_KEY = config("CLERK_SECRET_KEY", default="")
GOOGLE_APPLICATION_CREDENTIALS = config("GOOGLE_APPLICATION_CREDENTIALS", default="")
RECAPTCHA_SECRET_KEY = config("RECAPTCHA_SECRET_KEY", default="")


if GOOGLE_GENAI_API_KEY:
    os.environ["GENAI_API_KEY"] = GOOGLE_GENAI_API_KEY
if GOOGLE_APPLICATION_CREDENTIALS:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS



# ============================
# CORS Configuration
# ============================
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://finalproject-frontend-three.vercel.app",
    "https://finalproject-fro-git-4e9069-safidysylvana333-gmailcoms-projects.vercel.app",
]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [
    "https://finalproject-bu3e.onrender.com",
    "https://finalproject-frontend-three.vercel.app",
    "https://finalproject-fro-git-4e9069-safidysylvana333-gmailcoms-projects.vercel.app",
]


ALLOWED_HOSTS = ["finalproject-bu3e.onrender.com", "localhost", "127.0.0.1"]
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",


    "corsheaders",
    "graphene_django",
    "graphql_jwt.refresh_token",
    "social_django",

    # Mes apps
    "users",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # Ajouté pour servir les fichiers statiques

    "django.middleware.common.CommonMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "Backend.clerk_auth.ClerkAuthMiddleware",
]

ROOT_URLCONF = "Backend.urls"

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


DATABASES = {
   "default": dj_database_url.parse(config("DATABASE_URL"))
}

AUTH_USER_MODEL = "users.CustomUser"

AUTHENTICATION_BACKENDS = [
    "graphql_jwt.backends.JSONWebTokenBackend",
    "django.contrib.auth.backends.ModelBackend",
    "social_core.backends.linkedin.LinkedinOAuth2",
]

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

SOCIAL_AUTH_LINKEDIN_OAUTH2_KEY = config("SOCIAL_AUTH_LINKEDIN_OAUTH2_KEY", default="")
SOCIAL_AUTH_LINKEDIN_OAUTH2_SECRET = config("SOCIAL_AUTH_LINKEDIN_OAUTH2_SECRET", default="")
SOCIAL_AUTH_LINKEDIN_OAUTH2_SCOPE = ["r_liteprofile", "r_emailaddress"]
SOCIAL_AUTH_LINKEDIN_OAUTH2_FIELD_SELECTORS = ["emailAddress"]
SOCIAL_AUTH_LINKEDIN_OAUTH2_EXTRA_DATA = [("emailAddress", "email_address")]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Indian/Antananarivo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")


STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
