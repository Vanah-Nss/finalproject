from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser

from django.contrib.auth import get_user_model

class CustomUser(AbstractUser):
     
    clerk_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    is_admin = models.BooleanField(default=False)  

    def __str__(self):
        return self.username

class Post(models.Model):
    STATUS_CHOICES = [
        ("Brouillon", "Brouillon"),
        ("Publié", "Publié"),
        ("Erreur", "Erreur"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="posts")
    content = models.TextField()
    image_url = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Brouillon")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    

    scheduled_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - {self.status}"