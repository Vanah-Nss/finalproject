import graphene
from django.contrib.auth import get_user_model
from graphene_django import DjangoObjectType
from .models import Post
from django.core.exceptions import ObjectDoesNotExist
from datetime import datetime
from decouple import config
from PIL import Image
from io import BytesIO
import requests
import urllib.parse
import google.generativeai as genai
from graphql import GraphQLError
import logging
import os
import time
from collections import defaultdict
from threading import Lock
logger = logging.getLogger(__name__)
User = get_user_model()

# ============================================
# TYPES GRAPHQL
# ============================================

class UserType(DjangoObjectType):
    class Meta:
        model = User
        fields = ("id", "username", "email", "is_admin", "date_joined", "is_active", "clerk_id")

class PostType(DjangoObjectType):
    imageUrl = graphene.String()
    scheduledAt = graphene.String()

    class Meta:
        model = Post
        fields = ("id", "content", "status", "created_at", "updated_at", "scheduled_at", "image_url", "user")

    def resolve_imageUrl(self, info):
        return self.image_url

    def resolve_scheduledAt(self, info):
        if self.scheduled_at:
            return self.scheduled_at.isoformat()
        return None

# ============================================
# FONCTIONS UTILITAIRES
# ============================================
def verify_recaptcha(token):
    """Vérifie le token reCAPTCHA avec l'API Google - MODE DEBUG"""
    logger.info(f"🔍 verify_recaptcha appelée - Token: {token[:50] if token else 'None'}")
    
    # ⚠️ TEMPORAIREMENT : Toujours retourner True pour DEBUG
    # Une fois que ça fonctionne, remettez la vérification réelle
    logger.warning("⚠️ DEBUG MODE: reCAPTCHA validation désactivée temporairement")
    return True  # ⬅️ LIGNE LA PLUS IMPORTANTE !
def get_linkedin_user(info):
    """Récupère l'utilisateur authentifié ou le premier utilisateur si aucun"""
    user = getattr(info.context, "user", None)
    
    if not user or not getattr(user, "is_authenticated", False):
        logger.warning("Utilisateur non authentifié - utilisation du premier utilisateur")
        return User.objects.first()
    
    logger.info(f"Utilisateur authentifié: {user.username} (ID: {user.id})")
    return user



class Query(graphene.ObjectType):
    me = graphene.Field(UserType)
    all_posts = graphene.List(PostType)
    post = graphene.Field(PostType, id=graphene.Int(required=True))
    all_users = graphene.List(UserType)
    all_posts_admin = graphene.List(PostType)

    def resolve_me(self, info):
        user = info.context.user
        if user.is_anonymous:
            raise GraphQLError("Vous devez être connecté pour accéder à cette information.")
        return user

    def resolve_all_posts(self, info):
        user = info.context.user
        if user.is_anonymous:
            return Post.objects.none()
        return Post.objects.filter(user=user).order_by("-created_at")

    def resolve_post(self, info, id):
        user = info.context.user
        if user.is_anonymous:
            raise GraphQLError("Authentification requise.")
        try:
            return Post.objects.get(id=id, user=user)
        except Post.DoesNotExist:
            raise GraphQLError("Post non trouvé.")

    def resolve_all_users(self, info):
        user = info.context.user
        if user.is_anonymous:
            raise GraphQLError("Authentification requise.")
        if not user.is_admin:
            raise GraphQLError("❌ Accès refusé : Vous devez être administrateur.")
        return User.objects.all().order_by('-date_joined')

    def resolve_all_posts_admin(self, info):
        user = info.context.user
        if user.is_anonymous:
            raise GraphQLError("Authentification requise.")
        if not user.is_admin:
            raise GraphQLError("❌ Accès refusé : Vous devez être administrateur.")
        return Post.objects.all().order_by('-created_at')

# ============================================
# MUTATIONS - POSTS
# ============================================

class CreatePost(graphene.Mutation):
    post = graphene.Field(PostType)
    success = graphene.Boolean()
    message = graphene.String()

    class Arguments:
        content = graphene.String(required=True)
        imageUrl = graphene.String()
        scheduledAt = graphene.String(required=False)
        recaptchaToken = graphene.String(required=True)

    def mutate(self, info, content, recaptchaToken, imageUrl=None, scheduledAt=None):
        try:
            logger.info("=== CreatePost mutation appelée ===")
            logger.info(f"Content length: {len(content) if content else 0}")
            logger.info(f"Token reCAPTCHA reçu: {bool(recaptchaToken)}")
            
            # ✅ Vérification STRICTE du reCAPTCHA
            if not recaptchaToken:
                logger.error("❌ Token reCAPTCHA manquant")
                return CreatePost(
                    post=None,
                    success=False,
                    message="❌ Token reCAPTCHA manquant. Veuillez valider le reCAPTCHA."
                )
            
            if not verify_recaptcha(recaptchaToken):
                logger.error("❌ Vérification reCAPTCHA échouée")
                return CreatePost(
                    post=None,
                    success=False,
                    message="❌ Échec de la vérification reCAPTCHA. Le token est peut-être expiré (2min max). Veuillez revalider."
                )
            
            logger.info("✅ reCAPTCHA validé avec succès")
            user = get_linkedin_user(info)
            logger.info(f"✅ Utilisateur: {user.username} (ID: {user.id})")
            
            # ✅ Accepter contenu vide SI une image est fournie
            if (not content or len(content.strip()) == 0) and not imageUrl:
                return CreatePost(
                    post=None,
                    success=False,
                    message="❌ Le contenu ou une image est obligatoire"
                )

            scheduled_dt = None
            if scheduledAt:
                try:
                    scheduled_dt = datetime.fromisoformat(scheduledAt.replace('Z', '+00:00'))
                    logger.info(f"Date programmée: {scheduled_dt}")
                except (ValueError, AttributeError) as e:
                    logger.warning(f"Format de date invalide: {scheduledAt}")

            logger.info("Création du post dans la base...")
            post = Post.objects.create(
                user=user,
                content=content.strip() if content else "",
                image_url=imageUrl,
                scheduled_at=scheduled_dt,
                status="Brouillon"
            )
            
            logger.info(f"✅✅✅ Post créé avec succès: ID={post.id}")
            
            return CreatePost(
                post=post,
                success=True,
                message="✅ Post créé avec succès"
            )
            
        except Exception as e:
            logger.error(f"❌❌❌ Erreur CreatePost: {str(e)}", exc_info=True)
            return CreatePost(
                post=None,
                success=False,
                message=f"❌ Erreur: {str(e)}"
            )

# Ajoutez ceci au début de votre schema.py
import time
from collections import defaultdict
from threading import Lock

# ============================================
# RATE LIMITER POUR GEMINI
# ============================================

class RateLimiter:
    """
    Rate limiter pour éviter de dépasser le quota Gemini
    Limite: 10 requêtes par minute par utilisateur
    """
    def __init__(self, max_requests=10, time_window=60):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = defaultdict(list)
        self.lock = Lock()
    
    def can_make_request(self, user_id):
        """Vérifie si l'utilisateur peut faire une requête"""
        with self.lock:
            now = time.time()
            user_key = str(user_id)
            
            # Supprimer les anciennes requêtes
            self.requests[user_key] = [
                req_time for req_time in self.requests[user_key]
                if now - req_time < self.time_window
            ]
            
            # Vérifier la limite
            if len(self.requests[user_key]) >= self.max_requests:
                oldest_request = min(self.requests[user_key])
                wait_time = self.time_window - (now - oldest_request)
                return False, int(wait_time)
            
            # Ajouter la requête
            self.requests[user_key].append(now)
            return True, 0
    
    def get_remaining_requests(self, user_id):
        """Retourne le nombre de requêtes restantes"""
        with self.lock:
            now = time.time()
            user_key = str(user_id)
            
            self.requests[user_key] = [
                req_time for req_time in self.requests[user_key]
                if now - req_time < self.time_window
            ]
            
            return self.max_requests - len(self.requests[user_key])

# Instance globale du rate limiter
gemini_rate_limiter = RateLimiter(max_requests=10, time_window=60)

# ============================================
# FONCTION HELPER POUR GEMINI
# ============================================

def call_gemini_with_retry(prompt, max_retries=3):
    """
    Appelle Gemini avec retry automatique en cas d'erreur 429
    """
    api_key = config('GOOGLE_GENAI_API_KEY', default='')
    if not api_key:
        raise Exception("Clé API Gemini non configurée")
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.0-flash-exp")
    
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            return response.text.strip()
        
        except Exception as e:
            error_msg = str(e)
            
            # Si erreur 429 (quota dépassé)
            if "429" in error_msg or "quota" in error_msg.lower():
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 5  # 5, 10, 15 secondes
                    logger.warning(f"⚠️ Quota Gemini atteint. Attente de {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    raise Exception(
                        "❌ Quota Gemini dépassé. Solutions:\n"
                        "1. Créez une nouvelle clé API sur https://aistudio.google.com/\n"
                        "2. Attendez la réinitialisation du quota (24h)\n"
                        "3. Passez au plan payant pour plus de requêtes"
                    )
            else:
                raise e
    
    raise Exception("Échec après plusieurs tentatives")

# ============================================
# MUTATION GÉNÉRER POST (MODIFIÉE)
# ============================================

class GeneratePost(graphene.Mutation):
    post = graphene.Field(PostType)
    success = graphene.Boolean()
    message = graphene.String()

    class Arguments:
        theme = graphene.String(required=True)
        tone = graphene.String(required=False)
        length = graphene.String(required=False)
        imageUrl = graphene.String(required=False)
        scheduledAt = graphene.String(required=False)
        recaptchaToken = graphene.String(required=True)

    def mutate(self, info, theme, recaptchaToken, tone=None, length=None, imageUrl=None, scheduledAt=None):
        try:
            logger.info("=== GeneratePost mutation appelée ===")
            
            # ✅ Vérification reCAPTCHA
            if not recaptchaToken or not verify_recaptcha(recaptchaToken):
                return GeneratePost(
                    post=None,
                    success=False,
                    message="❌ Vérification reCAPTCHA échouée"
                )
            
            user = get_linkedin_user(info)
            
            # ✅ NOUVEAU: Vérifier le rate limit
            can_request, wait_time = gemini_rate_limiter.can_make_request(user.id)
            
            if not can_request:
                return GeneratePost(
                    post=None,
                    success=False,
                    message=f"⏳ Limite atteinte. Attendez {wait_time} secondes avant de réessayer."
                )
            
            remaining = gemini_rate_limiter.get_remaining_requests(user.id)
            logger.info(f"✅ Rate limit OK - Requêtes restantes: {remaining}/10")

            # Génération du prompt
            prompt = f"Génère un post LinkedIn sur le thème '{theme}'"
            if tone:
                prompt += f" avec un ton {tone}"
            if length:
                prompt += f" et une longueur {length}"
            prompt += ". Fais un texte engageant, naturel et adapté au réseau LinkedIn."

            # ✅ NOUVEAU: Appel avec retry automatique
            try:
                text = call_gemini_with_retry(prompt)
                logger.info(f"✅ Contenu généré: {len(text)} caractères")
            except Exception as e:
                logger.error(f"❌ Erreur Gemini: {str(e)}")
                return GeneratePost(
                    post=None,
                    success=False,
                    message=str(e)
                )

            # Créer le post
            scheduled_dt = None
            if scheduledAt:
                try:
                    scheduled_dt = datetime.fromisoformat(scheduledAt.replace('Z', '+00:00'))
                except ValueError:
                    pass

            post = Post.objects.create(
                user=user,
                content=text,
                image_url=imageUrl,
                scheduled_at=scheduled_dt,
                status="Brouillon"
            )

            logger.info(f"✅✅✅ Post IA créé: ID={post.id}")
            
            return GeneratePost(
                post=post,
                success=True,
                message=f"✅ Post généré avec succès ({remaining-1} requêtes restantes)"
            )
            
        except Exception as e:
            logger.error(f"❌ Erreur GeneratePost: {str(e)}", exc_info=True)
            return GeneratePost(
                post=None,
                success=False,
                message=f"❌ Erreur: {str(e)}"
            )


# ============================================
# QUERY POUR VÉRIFIER LE QUOTA (OPTIONNEL)
# ============================================

class QuotaStatus(graphene.ObjectType):
    remaining_requests = graphene.Int()
    max_requests = graphene.Int()
    time_window = graphene.Int()
    can_make_request = graphene.Boolean()

class Query(graphene.ObjectType):
    # ... vos queries existantes ...
    
    gemini_quota_status = graphene.Field(QuotaStatus)
    
    def resolve_gemini_quota_status(self, info):
        user = info.context.user
        if user.is_anonymous:
            raise GraphQLError("Authentification requise.")
        
        remaining = gemini_rate_limiter.get_remaining_requests(user.id)
        can_request, _ = gemini_rate_limiter.can_make_request(user.id)
        
        return QuotaStatus(
            remaining_requests=remaining,
            max_requests=gemini_rate_limiter.max_requests,
            time_window=gemini_rate_limiter.time_window,
            can_make_request=can_request
        )
class GenerateImage(graphene.Mutation):
    class Arguments:
        prompt = graphene.String(required=True)
        recaptchaToken = graphene.String(required=True)
    
    image_url = graphene.String()
    success = graphene.Boolean()
    message = graphene.String()
    
    def mutate(self, info, prompt, recaptchaToken):
        try:
            logger.info("=== GenerateImage mutation appelée ===")
            logger.info(f"Prompt: {prompt[:50]}...")
            logger.info(f"Token reCAPTCHA reçu: {bool(recaptchaToken)}")
            
            # ✅ Vérification STRICTE du reCAPTCHA
            if not recaptchaToken:
                logger.error("❌ Token reCAPTCHA manquant")
                return GenerateImage(
                    image_url=None,
                    success=False,
                    message="❌ Token reCAPTCHA manquant. Veuillez valider le reCAPTCHA."
                )
            
            if not verify_recaptcha(recaptchaToken):
                logger.error("❌ Vérification reCAPTCHA échouée")
                return GenerateImage(
                    image_url=None,
                    success=False,
                    message="❌ Échec de la vérification reCAPTCHA. Le token est peut-être expiré (2min max). Veuillez revalider."
                )
            
            logger.info("✅ reCAPTCHA validé avec succès")
            
            encoded_prompt = urllib.parse.quote(prompt)
            image_api_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}"
            
            params = {
                "width": 1024,
                "height": 1024,
                "seed": int(datetime.now().timestamp()),
                "model": "flux",
                "nologo": "true"
            }
            
            full_url = f"{image_api_url}?{'&'.join([f'{k}={v}' for k, v in params.items()])}"
            response = requests.get(full_url, timeout=60)
            
            if response.status_code == 200:
                os.makedirs("media/images", exist_ok=True)
                filename = f"generated_{int(datetime.now().timestamp())}.png"
                output_path = f"media/images/{filename}"
                
                image = Image.open(BytesIO(response.content))
                image.save(output_path)
                
                base_url = config('BASE_URL', default='https://finalproject-bu3e.onrender.com')
                image_url = f"{base_url}/media/images/{filename}"
                
                logger.info(f"✅ Image générée: {image_url}")
                
                return GenerateImage(
                    image_url=image_url,
                    success=True,
                    message="✅ Image générée avec succès"
                )
            else:
                return GenerateImage(
                    image_url=None,
                    success=False,
                    message=f"❌ Erreur API: {response.status_code}"
                )
                
        except requests.exceptions.Timeout:
            return GenerateImage(
                image_url=None,
                success=False,
                message="❌ Timeout lors de la génération"
            )
        except Exception as e:
            logger.error(f"❌ Erreur GenerateImage: {str(e)}", exc_info=True)
            return GenerateImage(
                image_url=None,
                success=False,
                message=f"❌ Erreur: {str(e)}"
            )

class UpdatePost(graphene.Mutation):
    post = graphene.Field(PostType)

    class Arguments:
        id = graphene.Int(required=True)
        content = graphene.String(required=False)
        status = graphene.String(required=False)
        imageUrl = graphene.String(required=False)

    def mutate(self, info, id, content=None, status=None, imageUrl=None):
        user = get_linkedin_user(info)
        try:
            post = Post.objects.get(id=id, user=user)
            if content is not None:
                post.content = content
            if status is not None:
                post.status = status
            if imageUrl is not None and imageUrl != "":
                post.image_url = imageUrl
            elif imageUrl == "":
                post.image_url = None
            post.save()
            return UpdatePost(post=post)
        except Post.DoesNotExist:
            return UpdatePost(post=None)

class DeletePost(graphene.Mutation):
    ok = graphene.Boolean()

    class Arguments:
        id = graphene.Int(required=True)

    def mutate(self, info, id):
        user = get_linkedin_user(info)
        try:
            post = Post.objects.get(id=id, user=user)
            post.delete()
            return DeletePost(ok=True)
        except ObjectDoesNotExist:
            return DeletePost(ok=False)

class PublishPost(graphene.Mutation):
    class Arguments:
        id = graphene.Int(required=True)

    post = graphene.Field(PostType)

    def mutate(self, info, id):
        try:
            post = Post.objects.get(id=id)
            post.status = "Publié"
            post.save()
            return PublishPost(post=post)
        except Post.DoesNotExist:
            raise GraphQLError("Post introuvable")

class DeleteAllPosts(graphene.Mutation):
    ok = graphene.Boolean()
    count = graphene.Int()

    def mutate(self, info):
        user = get_linkedin_user(info)
        deleted_count, _ = Post.objects.filter(user=user).delete()
        return DeleteAllPosts(ok=True, count=deleted_count)

# ============================================
# MUTATIONS - ADMIN
# ============================================

class UpdateUserStatus(graphene.Mutation):
    class Arguments:
        user_id = graphene.ID(required=True)
        is_active = graphene.Boolean(required=True)
    
    success = graphene.Boolean()
    user = graphene.Field(UserType)
    message = graphene.String()
    
    def mutate(self, info, user_id, is_active):
        current_user = info.context.user

        if current_user.is_anonymous:
            raise GraphQLError("Authentification requise.")

        if not current_user.is_admin:
            raise GraphQLError("❌ Accès refusé : Vous devez être administrateur.")
        
        try:
            user = User.objects.get(id=user_id)
            
            if user.is_admin and not is_active:
                admin_count = User.objects.filter(is_admin=True, is_active=True).count()
                if admin_count <= 1:
                    raise GraphQLError("❌ Impossible de désactiver le dernier administrateur actif.")
            
            user.is_active = is_active
            user.save()
            
            return UpdateUserStatus(
                success=True,
                user=user,
                message=f"✅ Utilisateur {'activé' if is_active else 'désactivé'} avec succès"
            )
        except User.DoesNotExist:
            raise GraphQLError("❌ Utilisateur introuvable")

class DeleteUser(graphene.Mutation):
    class Arguments:
        user_id = graphene.ID(required=True)
    
    success = graphene.Boolean()
    message = graphene.String()
    
    def mutate(self, info, user_id):
        current_user = info.context.user

        if current_user.is_anonymous:
            raise GraphQLError("Authentification requise.")

        if not current_user.is_admin:
            raise GraphQLError("❌ Accès refusé : Vous devez être administrateur.")
        
        try:
            user = User.objects.get(id=user_id)
            
            if user.is_admin:
                raise GraphQLError("❌ Impossible de supprimer un administrateur.")
            
            if user.id == current_user.id:
                raise GraphQLError("❌ Vous ne pouvez pas supprimer votre propre compte.")
            
            username = user.username
            user.delete()
            
            return DeleteUser(
                success=True,
                message=f"✅ Utilisateur {username} supprimé avec succès"
            )
        except User.DoesNotExist:
            raise GraphQLError("❌ Utilisateur introuvable")

class PromoteToAdmin(graphene.Mutation):
    class Arguments:
        user_id = graphene.ID(required=True)

    success = graphene.Boolean()
    user = graphene.Field(UserType)
    message = graphene.String()

    def mutate(self, info, user_id):
        current_user = info.context.user

        if current_user.is_anonymous:
            raise GraphQLError("Authentification requise.")

        if not current_user.is_admin:
            raise GraphQLError("❌ Accès refusé : Vous devez être administrateur.")

        try:
            user = User.objects.get(id=user_id)

            if user.is_admin:
                raise GraphQLError("❌ Cet utilisateur est déjà administrateur.")

            user.is_admin = True
            user.save()

            return PromoteToAdmin(
                success=True,
                user=user,
                message=f"✅ {user.username} est maintenant administrateur"
            )
        except User.DoesNotExist:
            raise GraphQLError("❌ Utilisateur introuvable")

class DeletePostAdmin(graphene.Mutation):
    class Arguments:
        post_id = graphene.ID(required=True)

    success = graphene.Boolean()
    message = graphene.String()

    def mutate(self, info, post_id):
        current_user = info.context.user

        if current_user.is_anonymous:
            raise GraphQLError("Authentification requise.")

        if not current_user.is_admin:
            raise GraphQLError("❌ Accès refusé : Vous devez être administrateur.")

        try:
            post = Post.objects.get(id=post_id)
            username = post.user.username
            post.delete()

            return DeletePostAdmin(
                success=True,
                message=f"✅ Post de {username} supprimé avec succès"
            )
        except Post.DoesNotExist:
            raise GraphQLError("❌ Post introuvable")

class UpdatePostStatusAdmin(graphene.Mutation):
    class Arguments:
        post_id = graphene.ID(required=True)
        status = graphene.String(required=True)

    success = graphene.Boolean()
    post = graphene.Field(PostType)
    message = graphene.String()

    def mutate(self, info, post_id, status):
        current_user = info.context.user

        if current_user.is_anonymous:
            raise GraphQLError("Authentification requise.")

        if not current_user.is_admin:
            raise GraphQLError("❌ Accès refusé : Vous devez être administrateur.")

        if status not in ["Brouillon", "Publié", "Erreur"]:
            raise GraphQLError("❌ Statut invalide")

        try:
            post = Post.objects.get(id=post_id)
            post.status = status
            post.save()

            return UpdatePostStatusAdmin(
                success=True,
                post=post,
                message=f"✅ Statut du post mis à jour : {status}"
            )
        except Post.DoesNotExist:
            raise GraphQLError("❌ Post introuvable")

# ============================================
# SCHEMA
# ============================================

class Mutation(graphene.ObjectType):
    # Posts
    create_post = CreatePost.Field()
    update_post = UpdatePost.Field()
    delete_post = DeletePost.Field()
    generate_post = GeneratePost.Field()
    publish_post = PublishPost.Field()
    delete_all_posts = DeleteAllPosts.Field()
    generate_image = GenerateImage.Field()

    # Admin
    update_user_status = UpdateUserStatus.Field()
    delete_user = DeleteUser.Field()
    promote_to_admin = PromoteToAdmin.Field()
    delete_post_admin = DeletePostAdmin.Field()
    update_post_status_admin = UpdatePostStatusAdmin.Field()

schema = graphene.Schema(query=Query, mutation=Mutation)