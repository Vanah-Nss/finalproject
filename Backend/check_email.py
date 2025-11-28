import os
import django


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Backend.settings')  
django.setup()

from django.contrib.auth import get_user_model

def check_email(email):
    User = get_user_model()
    user = User.objects.filter(email__iexact=email).first()
    if user:
        print(f"Utilisateur trouvé : {user.username} - {user.email}")
    else:
        print("Aucun utilisateur trouvé avec cet email.")

if __name__ == "__main__":
    email_to_test = input("Entrez l'email à vérifier : ").strip()
    check_email(email_to_test)
