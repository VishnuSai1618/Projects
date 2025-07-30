# quiz/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class QuizConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'quiz_{self.room_name}'

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
        data = json.loads(text_data)
        message_type = data['type']

        if message_type == 'start_quiz':
            # Logic to start the quiz, get questions, etc.
            # Then broadcast the first question
            pass
        elif message_type == 'submit_answer':
            # Logic to check the answer, update scores
            # Then broadcast the results and the next question
            pass

    # Broadcast messages to the group
    async def broadcast_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps(message))