

import google.generativeai as genai
import os


genai.configure(api_key="AIzaSyCrktq9GmksxkGBTnIYFOB6V1VoIumc1dE")

model = genai.GenerativeModel('gemini-2.5-flash')


prompt = "Écris un post LinkedIn inspirant sur le travail d'équipe."

response = model.generate_content(prompt)

print("\n--- Résultat généré ---\n")
print(response.text)
