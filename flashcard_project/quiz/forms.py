from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django import forms

class CustomUserCreationForm(UserCreationForm):
    # Add the first_name field
    first_name = forms.CharField(max_length=150, required=True, help_text='Please enter your full name.')

    class Meta(UserCreationForm.Meta):
        model = User
        # Add first_name to the list of fields
        fields = ('first_name', 'username', 'email')

    def save(self, commit=True):
        user = super(CustomUserCreationForm, self).save(commit=False)
        # Save the first_name from the form
        user.first_name = self.cleaned_data["first_name"]
        if commit:
            user.save()
        return user