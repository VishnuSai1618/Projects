from django.db import models
from django.contrib.auth.models import User
from datetime import timedelta, date

class Deck(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class Card(models.Model):
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='cards')
    question = models.TextField()
    answer = models.TextField()

    # Spaced Repetition Fields
    next_review_date = models.DateField(default=date.today)
    last_review_date = models.DateField(null=True, blank=True)
    ease_factor = models.FloatField(default=2.5)
    interval = models.IntegerField(default=1) # in days

    def update_review_date(self, quality):
        """
        Updates the next review date based on the user's recall quality.
        'quality' is an integer from 0-5 (0: complete blackout, 5: perfect recall).
        """
        if quality < 3:
            # If recall was poor, reset the interval
            self.interval = 1
        else:
            # Update the ease factor
            self.ease_factor += (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
            if self.ease_factor < 1.3:
                self.ease_factor = 1.3

            # Calculate the new interval
            if self.interval == 1:
                self.interval = 6
            else:
                self.interval = round(self.interval * self.ease_factor)

        self.next_review_date = date.today() + timedelta(days=self.interval)
        self.last_review_date = date.today()
        self.save()

    def __str__(self):
        return self.question