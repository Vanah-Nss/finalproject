
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.core.files.storage import default_storage
from django.conf import settings
import os

@csrf_exempt
def upload_image(request):
    if request.method == 'POST' and request.FILES.get('file'):
        file = request.FILES['file']
        
    
        filename = default_storage.save(f'uploads/{file.name}', file)
        
  
        if settings.DEBUG:
            file_url = request.build_absolute_uri(default_storage.url(filename))
        else:
            file_url = default_storage.url(filename)
            
        return JsonResponse({'url': file_url})
    
    return JsonResponse({'error': 'No file provided'}, status=400)