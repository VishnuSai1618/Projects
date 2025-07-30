# In quiz/views.py

from rest_framework import viewsets, permissions
from .models import Deck, Card
from .serializers import DeckSerializer, CardSerializer

class DeckViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows decks to be viewed or edited.
    """
    queryset = Deck.objects.all()
    serializer_class = DeckSerializer
    # You can set permissions here, for now we'll allow any authenticated user
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return decks owned by the currently authenticated user
        return Deck.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Automatically set the user to the currently authenticated user
        serializer.save(user=self.request.user)

class CardViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows cards to be viewed or edited.
    """
    queryset = Card.objects.all()
    serializer_class = CardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return cards that belong to decks owned by the current user
        return Card.objects.filter(deck__user=self.request.user)
