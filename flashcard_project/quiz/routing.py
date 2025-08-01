from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # This regex will match WebSocket connections to URLs like /ws/quiz/ROOM_NAME/
    re_path(r'ws/quiz/(?P<room_name>\w+)/$', consumers.QuizConsumer.as_asgi()),
]