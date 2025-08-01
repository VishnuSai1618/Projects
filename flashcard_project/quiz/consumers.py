# In quiz/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async  # New import for DB access
from .models import QuizSession, Question  # Import models


class QuizConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'quiz_{self.room_name}'
        self.questions = []
        self.current_question_index = 0

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')

        if message_type == 'player_joined':
            player_name = text_data_json.get('player_name', 'Anonymous')
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'player_update',
                    'message': f'{player_name} has joined the quiz!'
                }
            )
        # NEW: Logic to handle starting the quiz
        elif message_type == 'start_quiz':
            # Fetch questions from the database
            await self.fetch_questions()
            # Broadcast the first question
            await self.broadcast_next_question()

    # --- New Helper Methods ---
    @database_sync_to_async
    def fetch_questions(self):
        """
        Fetches questions for the current session from the database.
        This runs in a synchronous thread to safely access the Django ORM.
        """
        try:
            session = QuizSession.objects.get(session_code=self.room_name, is_active=True)
            questions = list(session.deck.questions.all())
            self.questions = [
                {
                    "text": q.question_text,
                    "choices": [{"text": c.choice_text, "is_correct": c.is_correct} for c in q.choices.all()]
                } for q in questions
            ]
        except QuizSession.DoesNotExist:
            self.questions = []

    async def broadcast_next_question(self):
        if self.current_question_index < len(self.questions):
            question_data = self.questions[self.current_question_index]
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'quiz_question',  # Calls quiz_question method below
                    'question': question_data,
                    'question_number': self.current_question_index + 1,
                    'total_questions': len(self.questions)
                }
            )
            self.current_question_index += 1
        else:
            # Handle end of quiz
            await self.channel_layer.group_send(
                self.room_group_name,
                {'type': 'quiz_end'}
            )

    # --- New Message Handlers ---
    async def player_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'player_joined',
            'payload': event['message']
        }))

    async def quiz_question(self, event):
        # Send the question data down to the client
        await self.send(text_data=json.dumps({
            'type': 'new_question',
            'question': event['question'],
            'question_number': event['question_number'],
            'total_questions': event['total_questions']
        }))

    async def quiz_end(self, event):
        # Send a message to the client that the quiz is over
        await self.send(text_data=json.dumps({'type': 'quiz_over'}))