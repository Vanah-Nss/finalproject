

import google.generativeai as genai
import os


genai.configure(api_key="AIzaSyA0jpijHepxS0K1V_BwmqZHP2lMag8Ak_U")

model = genai.GenerativeModel('gemini-2.5-flash')


prompt = "Écris un post LinkedIn inspirant sur le travail d'équipe."

response = model.generate_content(prompt)

print("\n--- Résultat généré ---\n")
print(response.text)
