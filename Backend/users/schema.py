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

logger = logging.getLogger(__name__)
User = get_user_model()

# ============================================
# TYPES GRAPHQL - À DÉFINIR EN PREMIER
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
    """Vérifie le token reCAPTCHA avec l'API Google"""
    if not token:
        logger.warning("Pas de token reCAPTCHA fourni")
        return True
        
    secret_key = config('RECAPTCHA_SECRET_KEY', default='')
    
    if not secret_key:
        logger.warning("RECAPTCHA_SECRET_KEY non configurée")
        return True
    
    try:
        response = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={
                'secret': secret_key,
                'response': token
            },
            timeout=5
        )
        result = response.json()
        success = result.get('success', False)
        logger.info(f"Vérification reCAPTCHA: {success}")
        return success
    except Exception as e:
        logger.error(f"Erreur vérification reCAPTCHA: {str(e)}")
        return True

def get_linkedin_user(info):
    """Récupère l'utilisateur authentifié ou le premier utilisateur si aucun"""
    user = getattr(info.context, "user", None)
    
    if not user or not getattr(user, "is_authenticated", False):
        logger.warning("Utilisateur non authentifié - utilisation du premier utilisateur")
        return User.objects.first()
    
    logger.info(f"Utilisateur authentifié: {user.username} (ID: {user.id})")
    return user

# ============================================
# QUERIES
# ============================================

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
    post = graphene.Field(PostType)  # ✅ PostType est maintenant défini ci-dessus
    success = graphene.Boolean()
    message = graphene.String()

    class Arguments:
        content = graphene.String(required=True)
        imageUrl = graphene.String()
        scheduledAt = graphene.String(required=False)
        recaptchaToken = graphene.String(required=False)

    def mutate(self, info, content, recaptchaToken=None, imageUrl=None, scheduledAt=None):
        try:
            logger.info("=== CreatePost mutation appelée ===")
            logger.info(f"Content length: {len(content) if content else 0}")
            
            if recaptchaToken and not verify_recaptcha(recaptchaToken):
                return CreatePost(
                    post=None,
                    success=False,
                    message="❌ Échec de la vérification reCAPTCHA"
                )
            
            user = get_linkedin_user(info)
            logger.info(f"✅ Utilisateur: {user.username} (ID: {user.id})")
            
            if not content or len(content.strip()) == 0:
                return CreatePost(
                    post=None,
                    success=False,
                    message="❌ Le contenu ne peut pas être vide"
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
                content=content.strip(),
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
        recaptchaToken = graphene.String(required=False)

    def mutate(self, info, theme, recaptchaToken=None, tone=None, length=None, imageUrl=None, scheduledAt=None):
        try:
            logger.info("=== GeneratePost mutation appelée ===")
            
            # Vérification reCAPTCHA
            if recaptchaToken and not verify_recaptcha(recaptchaToken):
                return GeneratePost(
                    post=None,
                    success=False,
                    message="❌ Échec de la vérification reCAPTCHA"
                )
            
            user = get_linkedin_user(info)

            scheduled_dt = None
            if scheduledAt:
                try:
                    scheduled_dt = datetime.fromisoformat(scheduledAt.replace('Z', '+00:00'))
                except ValueError:
                    pass

            # Génération du contenu
            prompt = f"Génère un post LinkedIn sur le thème '{theme}'"
            if tone:
                prompt += f" avec un ton {tone}"
            if length:
                prompt += f" et une longueur {length}"
            prompt += ". Fais un texte engageant, naturel et adapté au réseau LinkedIn."

            # Utiliser la clé API depuis les variables d'environnement
            api_key = config('GOOGLE_GENAI_API_KEY', default='')
            if not api_key:
                return GeneratePost(
                    post=None,
                    success=False,
                    message="❌ Clé API Gemini non configurée"
                )

            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.0-flash-exp")
            
            try:
                response = model.generate_content(prompt)
                text = response.text.strip()
                logger.info(f"✅ Contenu généré: {len(text)} caractères")
            except Exception as e:
                logger.error(f"Erreur Gemini: {str(e)}")
                text = f"Erreur lors de la génération du post : {str(e)}"

            post = Post.objects.create(
                user=user,
                content=text,
                image_url=imageUrl,  
                scheduled_at=scheduled_dt,
                status="Brouillon"
            )

            return GeneratePost(
                post=post,
                success=True,
                message="✅ Post généré avec succès"
            )
            
        except Exception as e:
            logger.error(f"❌ Erreur GeneratePost: {str(e)}", exc_info=True)
            return GeneratePost(
                post=None,
                success=False,
                message=f"❌ Erreur: {str(e)}"
            )

class GenerateImage(graphene.Mutation):
    class Arguments:
        prompt = graphene.String(required=True)
        recaptchaToken = graphene.String(required=False)
    
    image_url = graphene.String()
    success = graphene.Boolean()
    message = graphene.String()
    
    def mutate(self, info, prompt, recaptchaToken=None):
        try:
            logger.info("=== GenerateImage mutation appelée ===")
            
            # Vérification reCAPTCHA
            if recaptchaToken and not verify_recaptcha(recaptchaToken):
                return GenerateImage(
                    image_url=None,
                    success=False,
                    message="❌ Échec de la vérification reCAPTCHA"
                )
            
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
                
                # URL de production
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