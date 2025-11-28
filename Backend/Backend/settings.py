import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
from decouple import config


BASE_DIR = Path(__file__).resolve().parent.parent

os.environ["GENAI_API_KEY"] = config("GOOGLE_GENAI_API_KEY")
load_dotenv() 

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = config("GOOGLE_APPLICATION_CREDENTIALS")
print(">>> DEBUG - DEEPSEEK_API_KEY =", os.getenv("DEEPSEEK_API_KEY"))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

print("DEEPSEEK_API_KEY =", os.getenv("DEEPSEEK_API_KEY"))
def get_env_variable(var_name):
    value = os.getenv(var_name)
    if not value:
        raise Exception(f"La variable d'environnement {var_name} est manquante !")
    return value

SECRET_KEY = get_env_variable("SECRET_KEY")
EMAIL_HOST_PASSWORD = get_env_variable("EMAIL_HOST_PASSWORD")

DEBUG = True
ALLOWED_HOSTS = ["*"]
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Indian/Antananarivo'
USE_I18N = True
USE_TZ = True
STATIC_URL = '/static/'
APPEND_SLASH = False

INSTALLED_APPS = [

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',


    'corsheaders',
    'graphene_django',
    'graphql_jwt.refresh_token',
    'social_django',
   

  
    'users',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'Backend.clerk_auth.ClerkAuthMiddleware',

 
]

ROOT_URLCONF = 'Backend.urls'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'ia_content_db',
        'USER': 'postgres',
        'PASSWORD': 'sylvana',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

AUTH_USER_MODEL = 'users.CustomUser'


GRAPHENE = {
    'SCHEMA': 'Backend.schema.schema',
    'MIDDLEWARE': [
        'graphql_jwt.middleware.JSONWebTokenMiddleware',
    ],
}
AUTH_USER_MODEL = "users.CustomUser"

GRAPHQL_JWT = {
    'JWT_AUTH_HEADER_PREFIX': 'Bearer',
    'JWT_SECRET_KEY': SECRET_KEY,
    'JWT_ALGORITHM': 'HS256',
    'JWT_VERIFY_EXPIRATION': True,
    'JWT_EXPIRATION_DELTA': timedelta(days=7),
    'JWT_ALLOW_REFRESH': True,
    'JWT_REFRESH_EXPIRATION_DELTA': timedelta(days=30),
}


SOCIAL_AUTH_LINKEDIN_OAUTH2_KEY = 'TON_CLIENT_ID_LINKEDIN'
SOCIAL_AUTH_LINKEDIN_OAUTH2_SECRET = 'TON_CLIENT_SECRET_LINKEDIN'
SOCIAL_AUTH_LINKEDIN_OAUTH2_SCOPE = ['r_liteprofile', 'r_emailaddress']
SOCIAL_AUTH_LINKEDIN_OAUTH2_FIELD_SELECTORS = ['emailAddress']
SOCIAL_AUTH_LINKEDIN_OAUTH2_EXTRA_DATA = [('emailAddress', 'email_address')]

AUTHENTICATION_BACKENDS = [
    'graphql_jwt.backends.JSONWebTokenBackend',
    'django.contrib.auth.backends.ModelBackend',
    'social_core.backends.linkedin.LinkedinOAuth2',
]


CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


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

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')