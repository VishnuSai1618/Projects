# In quiz/admin.py

from django.contrib import admin
from .models import Deck, Question, Choice, QuizSession, UserResponse

# Register models directly for simplicity to resolve the loading issue.
# This removes the inline editing feature from the admin for now, but fixes the server error.
admin.site.register(Deck)
admin.site.register(Question)
admin.site.register(Choice)


# We will register the session models later when we build that functionality
# admin.site.register(QuizSession)
# admin.site.register(UserResponse)