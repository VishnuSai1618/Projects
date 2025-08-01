# In quiz/views.py

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import render,redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login,logout
from .forms import CustomUserCreationForm

from .models import Deck, Question, Choice
from .serializers import DeckSerializer, QuestionSerializer, ChoiceSerializer
import random
import string
from .models import Deck, Question, Choice, QuizSession, UserResponse # Add QuizSession to imports

def landing_page_view(request):
    return render(request, 'quiz/landing.html')

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
        deck = self.get_object()
        if deck.activity_type != 'FLASHCARDS':
            return Response({'error': 'Only flashcard decks can be studied.'}, status=status.HTTP_400_BAD_REQUEST)
        questions = deck.questions.filter(next_review_date__lte=timezone.now().date()).order_by('?')
        serializer = QuestionSerializer(questions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def host_session(self, request, pk=None):
        deck = self.get_object()

        # Generate a unique 6-character code
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            if not QuizSession.objects.filter(session_code=code, is_active=True).exists():
                break

        # Create the new session
        session = QuizSession.objects.create(
            deck=deck,
            host=request.user,
            session_code=code
        )

        return Response({'session_code': session.session_code, 'deck_name': deck.name})

class QuestionViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows questions to be viewed or edited.
    """
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return questions that belong to decks owned by the current user
        return Question.objects.filter(deck__user=self.request.user)

    # NEW: Custom action to rate a card and update its review date
    @action(detail=True, methods=['post'])
    def rate(self, request, pk=None):
        question = self.get_object()
        quality = request.data.get('quality')

        if quality is None or not isinstance(quality, int) or not (0 <= quality <= 5):
            return Response({'error': 'A valid quality rating (0-5) is required.'}, status=status.HTTP_400_BAD_REQUEST)

        question.update_review_date(quality)
        return Response({'status': 'success', 'next_review_date': question.next_review_date})


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
    # ... (dashboard_view is unchanged) ...
    return render(request, 'quiz/dashboard.html')
def signup_view(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user) # Log the user in immediately after signing up
            return redirect('dashboard') # Redirect to the dashboard
    else:
        form = CustomUserCreationForm()
    return render(request, 'quiz/signup.html', {'form': form})
# NEW: View for the signin page
def signin_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            # Redirect to the dashboard after successful login
            return redirect('dashboard')
    else:
        form = AuthenticationForm()
    return render(request, 'quiz/signin.html', {'form': form})

# NEW: View for logging out
def signout_view(request):
    logout(request)
    return redirect('landing_page')
