$(document).ready(function() {
    // --- State Management ---
   let state = {
        currentView: 'deck-list',
        selectedDeckId: null,
        studySession: {
            cards: [],
            currentIndex: 0
        }
    };

    // --- Authentication (No changes) ---
    let authToken = localStorage.getItem('authToken');
    if (!authToken) {
        const token = prompt("Welcome! Please enter your authentication token to continue.\nYou can get one from the admin panel under 'Auth Token'.");
        if (token) {
            localStorage.setItem('authToken', token);
            authToken = token;
        } else {
            $('body').html('<h1 class="text-red-500 text-center p-8">An auth token is required. Please refresh and provide one.</h1>');
            return;
        }
    }

    // --- CSRF Token & AJAX Setup (No changes) ---
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    const csrftoken = getCookie('csrftoken');

    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            xhr.setRequestHeader('Authorization', 'Token ' + authToken);
            if (!/^(GET|HEAD|OPTIONS|TRACE)$/.test(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            }
        }
    });

    // --- API Functions (Updated) ---
    const api = {
        getDecks: () => $.ajax({ url: '/api/decks/', method: 'GET' }),
        getDeckDetails: (deckId) => $.ajax({ url: `/api/decks/${deckId}/`, method: 'GET' }),
        startStudySession: (deckId) => $.ajax({ url: `/api/decks/${deckId}/study/`, method: 'GET' }),
        createDeck: (data) => $.ajax({ /* ... no changes here ... */ }),
        createQuestion: (data) => $.ajax({ /* ... no changes here ... */ }),
        createChoice: (data) => $.ajax({ /* ... no changes here ... */ }),
        // NEW: API function to rate a card
        rateCard: (questionId, quality) => $.ajax({
            url: `/api/questions/${questionId}/rate/`, // We will create this endpoint next
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ quality: quality })
        })
    };
    // --- UI Rendering ---
    function renderDeck(deck) {
        // ... (No changes to this function)
        const iconMap = { 'FLASHCARDS': 'fa-clone', 'QUIZ': 'fa-question-circle', 'SURVEY': 'fa-poll' };
        const colorMap = { 'FLASHCARDS': 'bg-blue-100 text-blue-800', 'QUIZ': 'bg-green-100 text-green-800', 'SURVEY': 'bg-yellow-100 text-yellow-800' };
        const studyButtonHtml = deck.activity_type === 'FLASHCARDS' ?
            `<button class="study-deck-btn bg-purple-500 text-white py-1 px-3 rounded-lg hover:bg-purple-600 text-xs" data-deck-id="${deck.id}">Study</button>` : '';
        return `
            <div class="deck-card bg-white p-5 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-blue-500" data-deck-id="${deck.id}">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold text-lg text-gray-800">${deck.name}</h3>
                        <p class="text-gray-600 text-sm mt-1">${deck.description || 'No description'}</p>
                    </div>
                    <span class="${colorMap[deck.activity_type]} text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
                        <i class="fas ${iconMap[deck.activity_type]} mr-1"></i>
                        ${deck.activity_type.replace('_', ' ')}
                    </span>
                </div>
                 <div class="mt-4 flex justify-between items-center text-xs text-gray-500">
                    <span>${deck.questions.length} Questions</span>
                    ${studyButtonHtml}
                </div>
            </div>`;
    }

    // NEW: Function to render the detail view
    function renderDeckDetail(deck) {
        const questionsHtml = deck.questions.map(q => `
            <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
                <p class="font-semibold">Q: ${q.question_text}</p>
                ${q.choices.map(c => `<p class="text-gray-700 ml-4 ${c.is_correct ? 'font-bold text-green-600' : ''}">- ${c.choice_text}</p>`).join('')}
            </div>
        `).join('');


        const addQuestionFormHtml = `
            <div class="mt-8 pt-6 border-t">
                <h3 class="text-2xl font-semibold mb-4">Add a New Question</h3>
                <form id="add-question-form" class="space-y-4">
                    <div>
                        <label for="question-text" class="block text-sm font-medium text-gray-700">Question</label>
                        <textarea id="question-text" required class="mt-1 block w-full px-3 py-2 border rounded-md"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Answer / Choices</label>
                        <!-- For Flashcard, this is the answer. For Quiz, it's the correct choice. -->
                        <input type="text" id="correct-answer" placeholder="Correct Answer" required class="mt-1 block w-full px-3 py-2 border rounded-md"/>
                    </div>
                    <button type="submit" class="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600">Add Question</button>
                </form>
            </div>`;

        return `
            <div class="bg-white p-8 rounded-lg shadow-md">
                <button id="back-to-decks" class="bg-gray-200 text-gray-800 py-1 px-3 rounded-lg hover:bg-gray-300 mb-4">&larr; Back to Dashboard</button>
                <h2 class="text-3xl font-bold mb-2">${deck.name}</h2>
                <p class="text-gray-600 mb-6">${deck.description}</p>
                
                <h3 class="text-2xl font-semibold mb-4">Questions</h3>
                <div class="space-y-4 mb-8">
                    ${questionsHtml || '<p class="text-gray-500">No questions in this deck yet.</p>'}
                </div>
                ${addQuestionFormHtml}
            </div>`;
    }
    function renderStudyView() {
        const session = state.studySession;
        if (!session.cards || session.currentIndex >= session.cards.length) {
            $('#study-view').html(`
                <div class="bg-white p-8 rounded-lg shadow-md text-center">
                    <h2 class="text-2xl font-bold text-green-600 mb-4">Session Complete!</h2>
                    <p>You've reviewed all due cards for this deck.</p>
                    <button id="back-to-decks-from-study" class="mt-6 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600">Back to Dashboard</button>
                </div>
            `);
            return;
        }

        const card = session.cards[session.currentIndex];
        const answerHtml = card.choices.filter(c => c.is_correct).map(c => c.choice_text).join('<br>');

        const html = `
            <div class="bg-white p-8 rounded-lg shadow-md">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold">Study Session</h2>
                    <button id="back-to-decks-from-study" class="bg-gray-200 text-gray-800 py-1 px-3 rounded-lg hover:bg-gray-300">&larr; Dashboard</button>
                </div>
                <div class="text-center p-8 border rounded-lg min-h-[200px] flex items-center justify-center">
                    <p class="text-2xl">${card.question_text}</p>
                </div>
                <div id="answer-container" class="hidden text-center p-8 mt-4 border rounded-lg bg-gray-50 min-h-[150px]">
                    <p class="text-xl font-semibold">${answerHtml}</p>
                </div>
                <div id="study-controls" class="mt-6 text-center">
                    <button id="show-answer-btn" class="bg-blue-500 text-white py-2 px-6 rounded-lg">Show Answer</button>
                    <div id="rating-buttons" class="hidden space-x-4">
                        <button class="rate-btn bg-red-500 text-white py-2 px-6 rounded-lg" data-quality="1">Hard</button>
                        <button class="rate-btn bg-yellow-500 text-white py-2 px-6 rounded-lg" data-quality="3">Good</button>
                        <button class="rate-btn bg-green-500 text-white py-2 px-6 rounded-lg" data-quality="5">Easy</button>
                    </div>
                </div>
            </div>`;
        $('#study-view').html(html);
    }

    // --- View Switching ---
    function showView(viewName) {
        state.currentView = viewName;
        $('#deck-list-view, #deck-detail-view, #study-view').hide();
        $(`#${viewName}-view`).show();
    }

    // --- Main Logic ---
    async function loadDecks() {
        // ... (No changes to this function)
        try {
            const response = await api.getDecks();
            const decks = response.results || response;
            const $deckList = $('#deck-list');
            $deckList.empty();
            if (decks.length === 0) {
                $deckList.append('<p class="col-span-full text-gray-500">No decks found. Click "Create New Deck" to get started!</p>');
            } else {
                decks.forEach(deck => $deckList.append(renderDeck(deck)));
            }
        } catch (error) {
            $('#deck-list').html('<p class="col-span-full text-red-500">Failed to load decks. Please check your token and refresh.</p>');
        }
    }

    async function loadDeckDetails(deckId) {
    state.selectedDeckId = deckId; // <--- CORRECT
    try {
        const deck = await api.getDeckDetails(deckId);
        $('#deck-detail-view').html(renderDeckDetail(deck));
        showView('deck-detail');
    } catch (error) {
        alert('Failed to load deck details.');
    }
}
    async function startStudySession(deckId) {
        try {
            const cards = await api.startStudySession(deckId);
            state.studySession.cards = cards;
            state.studySession.currentIndex = 0;
            renderStudyView();
            showView('study');
        } catch (error) {
            alert('Error starting study session: ' + error.responseJSON.error);
        }
    }
    // --- Event Handlers ---
    $('#show-create-deck-modal').on('click', () => $('#create-deck-modal').removeClass('hidden').addClass('flex'));
    $('#cancel-create-deck').on('click', () => $('#create-deck-modal').addClass('hidden').removeClass('flex'));

    $('#create-deck-form').on('submit', async function(e) {
        // ... (No changes to this function)
        e.preventDefault();
        const data = { name: $('#deck-name').val(), description: $('#deck-description').val(), activity_type: $('#deck-activity-type').val() };
        try {
            await api.createDeck(data);
            $('#create-deck-modal').addClass('hidden').removeClass('flex');
            this.reset();
            loadDecks();
        } catch (error) {
            alert('Error creating deck: ' + JSON.stringify(error.responseJSON));
        }
    });


    $('#logout-btn').on('click', function(e) {
        // ... (No changes to this function)
        e.preventDefault();
        localStorage.removeItem('authToken');
        alert("You have been logged out.");
        window.location.href = '/admin/login/';
    });

    // NEW: Event handler for clicking on a deck card
   $('#deck-list').on('click', '.deck-card, .study-deck-btn', function(e) {
        e.stopPropagation(); // Prevent event from bubbling up
        const deckId = $(this).data('deck-id');
        if ($(this).hasClass('study-deck-btn')) {
            startStudySession(deckId);
        } else {
            loadDeckDetails(deckId);
        }
    });

    // NEW: Event handlers for the detail view (must use delegation)
    $('#deck-detail-view').on('click', '#back-to-decks', function() {
        showView('deck-list');
        loadDecks(); // Refresh deck list in case question count changed
    });

    $$('#deck-detail-view').on('submit', '#add-question-form', async function(e) {
    e.preventDefault();
    const questionText = $('#question-text').val();
    const correctAnswerText = $('#correct-answer').val();

    try {
        const questionData = {
            deck: state.selectedDeckId, // <--- CORRECT
            question_text: questionText,
            question_type: 'FLASHCARD'
        };
        const newQuestion = await api.createQuestion(questionData);

        const choiceData = {
            question: newQuestion.id,
            choice_text: correctAnswerText,
            is_correct: true
        };
        await api.createChoice(choiceData);

        loadDeckDetails(state.selectedDeckId);
    } catch (error) {
        alert('Error adding question: ' + JSON.stringify(error.responseJSON));
    }
});
   $('#study-view').on('click', '#back-to-decks-from-study', function() {
        showView('deck-list');
        loadDecks();
    });

    $('#study-view').on('click', '#show-answer-btn', function() {
        $('#answer-container').removeClass('hidden');
        $('#rating-buttons').removeClass('hidden');
        $(this).addClass('hidden');
    });
   $('#study-view').on('click', '.rate-btn', async function() {
        const quality = $(this).data('quality');
        const card = state.studySession.cards[state.studySession.currentIndex];

        try {
            // We will add the API endpoint for this in the next step. For now, it will fail.
            // await api.rateCard(card.id, quality);
            console.log(`Rated card ${card.id} with quality ${quality}`);

            // Move to the next card
            state.studySession.currentIndex++;
            renderStudyView();
        } catch(error) {
            // alert('Error rating card. Check the console.');
            console.error(error);
            // For now, we'll advance even if the API call fails, so we can test the UI flow.
            state.studySession.currentIndex++;
            renderStudyView();
        }
    });

   // --- Initial Load ---
    loadDecks();
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});