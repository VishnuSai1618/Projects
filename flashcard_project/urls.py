# In flashcard_project/urls.py

from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from quiz import views

# The router provides an easy way of automatically determining the URL conf.
router = routers.DefaultRouter()
router.register(r'decks', views.DeckViewSet, basename='deck')
router.register(r'cards', views.CardViewSet, basename='card')

urlpatterns = [
    path('admin/', admin.site.urls),
    # This includes the URLs for the browsable API's login and logout views.
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    # This includes the API endpoints we registered with the router.
    path('api/', include(router.urls)),
]

