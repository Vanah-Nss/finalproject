import graphene
from django.contrib.auth import get_user_model
from graphene_django import DjangoObjectType
from .models import Post
from openai import OpenAI
import os
from django.core.exceptions import ObjectDoesNotExist
from datetime import datetime
from decouple import config
from PIL import Image
from io import BytesIO
import requests
import urllib.parse
import google.generativeai as genai
from graphql import GraphQLError

User = get_user_model()

def get_linkedin_user(info):
    user = getattr(info.context, "user", None)
    if not user or not getattr(user, "is_authenticated", False):
        return User.objects.first()
    return user

# ============================================
# TYPES
# ============================================

class UserType(DjangoObjectType):
    class Meta:
        model = User
        fields = ("id", "username", "email", "is_admin", "date_joined", "is_active")

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
# QUERIES
# ============================================

class Query(graphene.ObjectType):
    me = graphene.Field(UserType)
    all_posts = graphene.List(PostType)
    post = graphene.Field(PostType, id=graphene.Int(required=True))
    all_users = graphene.List(UserType)  # ✨ Pour l'admin
    all_posts_admin = graphene.List(PostType)  # ✨ Pour l'admin - tous les posts

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
        """Liste tous les utilisateurs - Réservé aux admins"""
        user = info.context.user
        if user.is_anonymous:
            raise GraphQLError("Authentification requise.")
        if not user.is_admin:
            raise GraphQLError("❌ Accès refusé : Vous devez être administrateur.")

        return User.objects.all().order_by('-date_joined')

    def resolve_all_posts_admin(self, info):
        """Liste tous les posts - Réservé aux admins"""
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

    class Arguments:
        content = graphene.String(required=True)
        imageUrl = graphene.String()
        scheduledAt = graphene.String(required=False)

    def mutate(self, info, content, imageUrl=None, scheduledAt=None):
        user = get_linkedin_user(info)

        scheduled_dt = None
        if scheduledAt:
            try:
                scheduled_dt = datetime.fromisoformat(scheduledAt)
            except ValueError:
                pass

        post = Post.objects.create(
            user=user,
            content=content,
            image_url=imageUrl,
            scheduled_at=scheduled_dt,
            status="Brouillon"
        )
        return CreatePost(post=post)

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
            post = Post.objects.get(id=id)
            post.delete()
            return DeletePost(ok=True)
        except ObjectDoesNotExist:
            return DeletePost(ok=False)

class GeneratePost(graphene.Mutation):
    post = graphene.Field(PostType)

    class Arguments:
        theme = graphene.String(required=True)
        tone = graphene.String(required=False)
        length = graphene.String(required=False)
        imageUrl = graphene.String(required=False) 
        scheduledAt = graphene.String(required=False)

    def mutate(self, info, theme, tone=None, length=None, imageUrl=None, scheduledAt=None):
        user = get_linkedin_user(info)

        scheduled_dt = None
        if scheduledAt:
            try:
                scheduled_dt = datetime.fromisoformat(scheduledAt)
            except ValueError:
                pass

        prompt = f"Génère un post LinkedIn sur le thème '{theme}'"
        if tone:
            prompt += f" avec un ton {tone}"
        if length:
            prompt += f" et une longueur {length}"
        prompt += ". Fais un texte engageant, naturel et adapté au réseau LinkedIn."

        genai.configure(api_key="AIzaSyDUp3XbDtqmAqfx6-frsbRCiePJ26GrlA8")
        model = genai.GenerativeModel("gemini-2.5-pro")
        try:
            response = model.generate_content(prompt)
            text = response.text.strip()
        except Exception as e:
            text = f"Erreur lors de la génération du post : {str(e)}"

        post = Post.objects.create(
            user=user,
            content=text,
            image_url=imageUrl,  
            scheduled_at=scheduled_dt,
            status="Brouillon"
        )

        return GeneratePost(post=post)

class GenerateImage(graphene.Mutation):
    class Arguments:
        prompt = graphene.String(required=True)
    
    image_url = graphene.String()
    success = graphene.Boolean()
    message = graphene.String()
    
    def mutate(self, info, prompt):
        try:
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
                
                image_url = f"http://127.0.0.1:8000/media/images/{filename}"
                
                return GenerateImage(
                    image_url=image_url,
                    success=True,
                    message="Image générée avec succès via Pollinations AI"
                )
            else:
                return GenerateImage(
                    image_url=None,
                    success=False,
                    message=f"Erreur API Pollinations: {response.status_code}"
                )
                
        except requests.exceptions.Timeout:
            return GenerateImage(
                image_url=None,
                success=False,
                message="Timeout: La génération prend trop de temps. Réessayez."
            )
        except Exception as e:
            print(f"Erreur GenerateImage: {str(e)}")
            return GenerateImage(
                image_url=None,
                success=False,
                message=f"Erreur: {str(e)}"
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
            raise Exception("Post introuvable")

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
    """Active ou désactive un utilisateur"""
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
            
            # Empêcher de désactiver le dernier admin
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
    """Supprime un utilisateur (sauf les admins)"""
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
            
            # Empêcher de supprimer un admin
            if user.is_admin:
                raise GraphQLError("❌ Impossible de supprimer un administrateur.")
            
            # Empêcher de se supprimer soi-même
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
    """Promouvoir un utilisateur au rang d'administrateur"""
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
    """Supprimer n'importe quel post - Réservé aux admins"""
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
    """Changer le statut de n'importe quel post - Réservé aux admins"""
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