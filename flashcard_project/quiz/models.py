# In quiz/models.py

from django.db import models
from django.contrib.auth.models import User
from datetime import timedelta, date


class Deck(models.Model):
    ACTIVITY_CHOICES = [
        ('FLASHCARDS', 'Flashcards'),
        ('QUIZ', 'Quiz'),
        ('SURVEY', 'Survey'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='decks')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_CHOICES, default='FLASHCARDS')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Question(models.Model):
    QUESTION_CHOICES = [
        ('MULTIPLE_CHOICE', 'Multiple Choice'),
        ('OPEN_ENDED', 'Open-Ended'),
        ('FLASHCARD', 'Flashcard (Question/Answer)'),
    ]
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    # For FLASHCARD type, the answer will be stored in a Choice object for consistency
    question_type = models.CharField(max_length=20, choices=QUESTION_CHOICES, default='FLASHCARD')

    # Spaced Repetition Fields (for Anki Mode)
    next_review_date = models.DateField(default=date.today)
    ease_factor = models.FloatField(default=2.5)
    interval = models.IntegerField(default=1)

    def __str__(self):
        return self.question_text


class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choices')
    choice_text = models.CharField(max_length=500)
    # For FLASHCARD type, this will hold the answer text and is_correct will be True.
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return self.choice_text


class QuizSession(models.Model):
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE)
    host = models.ForeignKey(User, on_delete=models.CASCADE)
    session_code = models.CharField(max_length=8, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Session for {self.deck.name} ({self.session_code})"


class UserResponse(models.Model):
    session = models.ForeignKey(QuizSession, on_delete=models.CASCADE, related_name='responses')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_choice = models.ForeignKey(Choice, on_delete=models.CASCADE, null=True, blank=True)
    open_ended_answer = models.TextField(null=True, blank=True)
    is_correct = models.BooleanField(default=False)
    answered_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}'s response to '{self.question.question_text}'"