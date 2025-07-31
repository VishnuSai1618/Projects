# In quiz/admin.py

from django.contrib import admin
from .models import Deck, Question, Choice, QuizSession, UserResponse

# These classes allow us to view related items within the admin panel
class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 1 # Show 1 extra empty choice form by default

class QuestionInline(admin.StackedInline):
    model = Question
    extra = 1 # Show 1 extra empty question form by default
    inlines = [ChoiceInline]

@admin.register(Deck)
class DeckAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'activity_type', 'created_at')
    inlines = [QuestionInline]

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('question_text', 'deck', 'question_type')
    inlines = [ChoiceInline]

# We will register the session models later when we build that functionality
# admin.site.register(QuizSession)
# admin.site.register(UserResponse)