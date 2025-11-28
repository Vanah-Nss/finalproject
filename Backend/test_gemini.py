import google.generativeai as genai
import os


genai.configure(api_key="AIzaSyDUp3XbDtqmAqfx6-frsbRCiePJ26GrlA8")

model = genai.GenerativeModel("models/gemini-2.5-pro")

prompt = "Écris un post LinkedIn inspirant sur le travail d'équipe."

response = model.generate_content(prompt)

print("\n--- Résultat généré ---\n")
print(response.text)
