from rest_framework import viewsets, permissions, status
from .models import Deck, Question, Choice
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone # Import timezone
from .serializers import DeckSerializer, QuestionSerializer, ChoiceSerializer
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

class DeckViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows decks to be viewed or edited.
    """
    serializer_class = DeckSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return decks owned by the currently authenticated user
        return Deck.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Automatically set the user to the currently authenticated user
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['get'])
    def study(self, request, pk=None):
        """
        Returns questions for a study session.
        For now, it returns all questions. Later, we'll filter by next_review_date.
        """
        deck = self.get_object()
        # We only study FLASHCARDS type decks
        if deck.activity_type != 'FLASHCARDS':
            return Response({'error': 'Only flashcard decks can be studied.'}, status=status.HTTP_400_BAD_REQUEST)

        questions = deck.questions.filter(next_review_date__lte=timezone.now().date()).order_by(
            '?')  # Get due cards, randomized
        serializer = QuestionSerializer(questions, many=True)
        return Response(serializer.data)
class QuestionViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows questions to be viewed or edited.
    """
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return questions that belong to decks owned by the current user
        return Question.objects.filter(deck__user=self.request.user)

class ChoiceViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows choices to be viewed or edited.
    """
    serializer_class = ChoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return choices that belong to questions in decks owned by the current user
        return Choice.objects.filter(question__deck__user=self.request.user)

@login_required
def dashboard_view(request):
    return render(request, 'quiz/dashboard.html')