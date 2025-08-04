# In quiz/serializers.py

from rest_framework import serializers
from .models import Deck, Question, Choice

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        # Add 'question' to the fields list
        fields = ['id', 'question', 'choice_text', 'is_correct']
        # 'question' is only needed when creating a choice, not when reading it.
        extra_kwargs = {'question': {'write_only': True}}

class QuestionSerializer(serializers.ModelSerializer):
    # This correctly shows the choices when we read a question
    choices = ChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        # Add 'deck' to the fields list
        fields = ['id', 'deck', 'question_text', 'question_type', 'choices']
        # 'deck' is only needed when creating a question, not when reading it.
        extra_kwargs = {'deck': {'write_only': True}}


class DeckSerializer(serializers.ModelSerializer):
    # This correctly shows the questions when we read a deck
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Deck
        fields = ['id', 'name', 'description', 'activity_type', 'user', 'questions']
        read_only_fields = ['user']