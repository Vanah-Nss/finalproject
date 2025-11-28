from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
import jwt
import requests
import os

User = get_user_model()

CLERK_FRONTEND_API = "fit-collie-65.clerk.accounts.dev"
CLERK_JWKS_URL = f"https://{CLERK_FRONTEND_API}/.well-known/jwks.json"
CLERK_API_KEY = os.getenv("CLERK_SECRET_KEY")  # À configurer

def get_clerk_public_key(token):
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        jwks = requests.get(CLERK_JWKS_URL, timeout=5).json()
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return key
        return None
    except Exception as e:
        print(f"❌ Erreur récupération clé JWKS: {e}")
        return None

def get_user_metadata_from_clerk(user_id):
    """Récupère les métadonnées à jour depuis l'API Clerk"""
    try:
        url = f"https://api.clerk.com/v1/users/{user_id}"
        headers = {
            "Authorization": f"Bearer {CLERK_API_KEY}",
            "Content-Type": "application/json"
        }
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            user_data = response.json()
            return user_data.get("public_metadata", {})
        return {}
    except Exception as e:
        print(f"❌ Erreur récupération métadonnées Clerk: {e}")
        return {}

class ClerkAuthMiddleware(MiddlewareMixin):
    def process_request(self, request):
        auth_header = request.headers.get("Authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            request.user = AnonymousUser()
            return
        
        token = auth_header.split(" ")[1]
        
        try:
            jwk = get_clerk_public_key(token)
            if not jwk:
                request.user = AnonymousUser()
                return
            
            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(jwk)
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                options={"verify_exp": True, "verify_aud": False}
            )
            
            user_id = payload.get("sub")
            email = payload.get("email", "")
            first_name = payload.get("given_name", "")
            last_name = payload.get("family_name", "")
            
            # ⭐ IMPORTANT : Les métadonnées peuvent être au niveau racine du JWT
            # ou nécessiter une requête API supplémentaire
            role = payload.get("role")  # Essayer d'abord au niveau racine
            
            if not role:
                # Si pas dans le JWT, récupérer via l'API Clerk
                metadata = get_user_metadata_from_clerk(user_id)
                role = metadata.get("role")
            
            print(f"🔍 User ID: {user_id}, Role détecté: {role}")
            
            user, created = User.objects.get_or_create(
                username=user_id,
                defaults={
                    'clerk_id': user_id,
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name
                }
            )
            
            # Mettre à jour le rôle admin
            if role == "admin" or email == "sitehars@gmail.com":
                user.is_admin = True
                user.is_staff = True  # Pour accéder à l'admin Django
                user.is_superuser = True  # Permissions complètes
            else:
                # Ne pas réinitialiser à False si l'utilisateur est déjà admin (pour les admins manuels)
                if not user.is_admin:
                    user.is_admin = False
                    user.is_staff = False
                    user.is_superuser = False
            
            user.save()
            request.user = user
            print(f"✅ User set in request: {user.username}, is_admin: {user.is_admin}")

        except Exception as e:
            print(f"❌ Erreur Clerk auth: {e}")
            import traceback
            traceback.print_exc()
            request.user = AnonymousUser()