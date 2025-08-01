from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from quiz import views

router = routers.DefaultRouter()
router.register(r'decks', views.DeckViewSet, basename='deck')
router.register(r'questions', views.QuestionViewSet, basename='question')
router.register(r'choices', views.ChoiceViewSet, basename='choice')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('api/', include(router.urls)),

    path('', views.landing_page_view, name='landing_page'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('signup/', views.signup_view, name='signup'),

    # NEW: URLs for signin and signout
    path('signin/', views.signin_view, name='signin'),
    path('signout/', views.signout_view, name='signout'),
]