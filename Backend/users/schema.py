# Ajoutez ceci en haut du fichier
import requests as req
import graphene
import urllib.parse
import os
from datetime import datetime
from PIL import Image
from io import BytesIO
from graphql import GraphQLError  # ✅ AJOUT
from decouple import config  # ✅ AJOUT
import google.generativeai as genai
# Fonction de validation reCAPTCHA
def verify_recaptcha(token):
    """Vérifie le token reCAPTCHA avec l'API Google"""
    secret_key = config('RECAPTCHA_SECRET_KEY')
    
    response = req.post(
        'https://www.google.com/recaptcha/api/siteverify',
        data={
            'secret': secret_key,
            'response': token
        }
    )
    
    result = response.json()
    return result.get('success', False)

# ============================================
# MUTATIONS CORRIGÉES
# ============================================

class CreatePost(graphene.Mutation):
    post = graphene.Field(PostType)

    class Arguments:
        content = graphene.String(required=True)
        imageUrl = graphene.String()
        scheduledAt = graphene.String(required=False)
        recaptchaToken = graphene.String(required=True)  # ✅ AJOUTÉ

    def mutate(self, info, content, recaptchaToken, imageUrl=None, scheduledAt=None):
        # ✅ Vérification reCAPTCHA
        if not verify_recaptcha(recaptchaToken):
            raise GraphQLError("❌ Échec de la vérification reCAPTCHA")
        
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


class GeneratePost(graphene.Mutation):
    post = graphene.Field(PostType)

    class Arguments:
        theme = graphene.String(required=True)
        tone = graphene.String(required=False)
        length = graphene.String(required=False)
        imageUrl = graphene.String(required=False) 
        scheduledAt = graphene.String(required=False)
        recaptchaToken = graphene.String(required=True)  # ✅ AJOUTÉ

    def mutate(self, info, theme, recaptchaToken, tone=None, length=None, imageUrl=None, scheduledAt=None):
        # ✅ Vérification reCAPTCHA
        if not verify_recaptcha(recaptchaToken):
            raise GraphQLError("❌ Échec de la vérification reCAPTCHA")
        
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
        recaptchaToken = graphene.String(required=True)  # ✅ AJOUTÉ
    
    image_url = graphene.String()
    success = graphene.Boolean()
    message = graphene.String()
    
    def mutate(self, info, prompt, recaptchaToken):
        # ✅ Vérification reCAPTCHA
        if not verify_recaptcha(recaptchaToken):
            return GenerateImage(
                image_url=None,
                success=False,
                message="❌ Échec de la vérification reCAPTCHA"
            )
        
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
            response = req.get(full_url, timeout=60)
            
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
                
        except req.exceptions.Timeout:
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