# In quiz/serializers.py

from rest_framework import serializers
from .models import Deck, Card
from django.contrib.auth.models import User


class CardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = ['id', 'question', 'answer', 'next_review_date', 'deck']


class DeckSerializer(serializers.ModelSerializer):
    # 'cards' is the related_name we set in the Card model's ForeignKey
    cards = CardSerializer(many=True, read_only=True)

    class Meta:
        model = Deck
        fields = ['id', 'name', 'description', 'user', 'cards']