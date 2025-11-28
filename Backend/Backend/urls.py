from django.contrib import admin
from django.urls import path

from django.contrib import admin
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from graphene_django.views import GraphQLView
from users import views
from django.conf import settings
from django.conf.urls.static import static

class CustomGraphQLView(GraphQLView):
    def get_context(self, request):
        return request

def graphql_view(request):
    return CustomGraphQLView.as_view(graphiql=True)(request)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/upload-image",  views.upload_image, name="upload_image"),
    path("api/graphql/", csrf_exempt(graphql_view)),

]




if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)