# In quiz/serializers.py

from rest_framework import serializers
from .models import Deck, Question, Choice

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'choice_text', 'is_correct']

class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'question_text', 'question_type', 'choices']

class DeckSerializer(serializers.ModelSerializer):
    # 'questions' is the related_name we set in the Question model
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Deck
        fields = ['id', 'name', 'description', 'activity_type', 'user', 'questions']
        read_only_fields = ['user'] # User will be set automatically from the request