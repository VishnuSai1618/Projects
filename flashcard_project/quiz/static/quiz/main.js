// In quiz/static/quiz/main.js

$(document).ready(function() {
    // --- State Management ---
    let state = {
        currentView: 'deck-list',
        selectedDeckId: null,
        studySession: {
            cards: [],
            currentIndex: 0
        },
        websocket: null,
        playerName: null // Corrected location
    };

    // --- Authentication & Setup ---
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
    const csrftoken = getCookie('csrftoken');
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            xhr.setRequestHeader('Authorization', 'Token ' + authToken);
            if (!/^(GET|HEAD|OPTIONS|TRACE)$/.test(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            }
        }
    });

    // --- API Functions ---
    const api = {
        getDecks: () => $.ajax({ url: '/api/decks/', method: 'GET' }),
        getDeckDetails: (deckId) => $.ajax({ url: `/api/decks/${deckId}/`, method: 'GET' }),
        startStudySession: (deckId) => $.ajax({ url: `/api/decks/${deckId}/study/`, method: 'GET' }),
        createDeck: (data) => $.ajax({ url: '/api/decks/', method: 'POST', contentType: 'application/json', data: JSON.stringify(data) }),
        createQuestion: (data) => $.ajax({ url: '/api/questions/', method: 'POST', contentType: 'application/json', data: JSON.stringify(data) }),
        createChoice: (data) => $.ajax({ url: '/api/choices/', method: 'POST', contentType: 'application/json', data: JSON.stringify(data) }),
        rateCard: (questionId, quality) => $.ajax({ url: `/api/questions/${questionId}/rate/`, method: 'POST', contentType: 'application/json', data: JSON.stringify({ quality: quality }) }),
        hostSession: (deckId) => $.ajax({ url: `/api/decks/${deckId}/host_session/`, method: 'POST' })
    };

    // --- UI Rendering ---
    function renderDeck(deck) {
        const iconMap = { 'FLASHCARDS': 'fa-clone', 'QUIZ': 'fa-question-circle', 'SURVEY': 'fa-poll' };
        const colorMap = { 'FLASHCARDS': 'bg-blue-100 text-blue-800', 'QUIZ': 'bg-green-100 text-green-800', 'SURVEY': 'bg-yellow-100 text-yellow-800' };
        const studyButtonHtml = deck.activity_type === 'FLASHCARDS' ?
            `<button class="study-deck-btn bg-purple-500 text-white py-1 px-3 rounded-lg hover:bg-purple-600 text-xs" data-deck-id="${deck.id}">Study</button>` : '';
        const hostButtonHtml = deck.activity_type === 'QUIZ' ?
            `<button class="host-quiz-btn bg-red-500 text-white py-1 px-3 rounded-lg hover:bg-red-600 text-xs" data-deck-id="${deck.id}">Host</button>` : '';

        return `
            <div class="bg-white p-5 rounded-lg shadow-md hover:shadow-xl transition-shadow border-l-4 border-blue-500">
                <div class="deck-card cursor-pointer" data-deck-id="${deck.id}">
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
                </div>
                <div class="mt-4 flex justify-between items-center text-xs text-gray-500">
                    <span>${deck.questions.length} Questions</span>
                    <div class="space-x-2">
                        ${studyButtonHtml}
                        ${hostButtonHtml}
                    </div>
                </div>
            </div>`;
    }

    function renderHostLobby(sessionCode, deckName) {
        const html = `
            <div class="bg-white p-8 rounded-lg shadow-md text-center">
                <h2 class="text-2xl font-bold mb-2">Quiz Lobby: ${deckName}</h2>
                <p class="text-gray-600 mb-6">Players can join using the code below.</p>
                <div class="bg-gray-200 p-4 rounded-lg inline-block">
                    <p class="text-5xl font-bold tracking-widest">${sessionCode}</p>
                </div>
                <div class="mt-8">
                    <h3 class="text-xl font-semibold mb-4">Players Joined: <span id="player-count">0</span></h3>
                    <ul id="player-list" class="space-y-2"></ul>
                </div>
                <div class="mt-8">
                    <button id="start-quiz-btn" class="bg-green-600 text-white py-3 px-8 rounded-lg text-lg hover:bg-green-700">Start Quiz</button>
                </div>
            </div>`;
        $('#host-lobby-view').html(html);
    }

    function renderPlayerLobby() {
        const html = `
            <div class="bg-white p-8 rounded-lg shadow-md text-center">
                <h2 class="text-3xl font-bold text-purple-700">You're in!</h2>
                <p class="text-gray-600 mt-2">Waiting for the host to start the quiz...</p>
                <div class="mt-8 text-2xl animate-pulse">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
            </div>`;
        $('#player-lobby-view').html(html);
    }

    function renderQuestionView(data) {
        const choicesHtml = data.question.choices.map((choice, index) => `
            <button class="choice-btn w-full bg-blue-500 text-white p-4 rounded-lg text-lg hover:bg-blue-600" data-index="${index}">
                ${choice.text}
            </button>
        `).join('');

        const html = `
            <div class="bg-white p-8 rounded-lg shadow-md">
                <div class="flex justify-between items-center mb-4 text-gray-600">
                    <span>Question ${data.question_number} of ${data.total_questions}</span>
                    <span id="timer">10</span>
                </div>
                <div class="text-center p-8 border rounded-lg min-h-[200px] flex items-center justify-center mb-6">
                    <p class="text-3xl font-bold">${data.question.text}</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${choicesHtml}
                </div>
            </div>`;
        $('#quiz-question-view').html(html);
    }

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

                <!-- Flippable Card Structure -->
                <div id="flashcard" class="flip-card">
                    <div class="flip-card-inner">
                        <div class="flip-card-front">
                            <p class="text-3xl font-bold">${card.question_text}</p>
                        </div>
                        <div class="flip-card-back">
                            <p class="text-2xl font-semibold mb-6">${answerHtml}</p>
                            <div class="space-x-4">
                                <button class="rate-btn bg-red-500 text-white py-2 px-6 rounded-lg" data-quality="1">Hard</button>
                                <button class="rate-btn bg-yellow-500 text-white py-2 px-6 rounded-lg" data-quality="3">Good</button>
                                <button class="rate-btn bg-green-500 text-white py-2 px-6 rounded-lg" data-quality="5">Easy</button>
                            </div>
                        </div>
                    </div>
                </div>
                <p class="text-center text-gray-500 mt-4">Click the card to flip it.</p>
            </div>`;
        $('#study-view').html(html);
    }

    // --- View Switching ---
    function showView(viewName) {
        state.currentView = viewName;
        $('#deck-list-view, #deck-detail-view, #study-view, #host-lobby-view, #player-lobby-view, #quiz-question-view').hide();
        $(`#${viewName}-view`).show();
    }

    // --- Main Logic ---
    async function loadDecks() {
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
        state.selectedDeckId = deckId;
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

    async function hostQuiz(deckId) {
        try {
            const sessionData = await api.hostSession(deckId);
            renderHostLobby(sessionData.session_code, sessionData.deck_name);
            showView('host-lobby');
            connectToWebSocket(sessionData.session_code, true); // Pass true for host
        } catch (error) {
            alert('Error hosting quiz. Check console.');
            console.error(error);
        }
    }

    function joinQuiz(roomCode) {
        if (!state.playerName) {
            state.playerName = prompt("Please enter your name:", "Player");
            if (!state.playerName) return; // User cancelled
        }
        renderPlayerLobby();
        showView('player-lobby');
        connectToWebSocket(roomCode, false); // Pass false for player
    }

    function connectToWebSocket(roomCode, isHost) {
        if (state.websocket) {
            state.websocket.close();
        }
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        state.websocket = new WebSocket(`${wsProtocol}//${window.location.host}/ws/quiz/${roomCode}/`);

        state.websocket.onopen = function(e) {
            console.log("WebSocket connection established!");
            if (!isHost) {
                state.websocket.send(JSON.stringify({
                    'type': 'player_joined',
                    'player_name': state.playerName
                }));
            }
        };

        state.websocket.onmessage = function(e) {
            const data = JSON.parse(e.data);
            console.log("Data received from server: ", data);

            if (data.type === 'player_joined') {
                const playerName = data.payload.split(' ')[0];
                $('#player-list').append(`<li>${playerName}</li>`);
                const currentCount = parseInt($('#player-count').text());
                $('#player-count').text(currentCount + 1);
            } else if (data.type === 'new_question') {
                renderQuestionView(data);
                showView('quiz-question');
            } else if (data.type === 'quiz_over') {
                alert("The quiz is over! Returning to dashboard.");
                showView('deck-list');
            }
        };

        state.websocket.onclose = function(e) {
            console.error('WebSocket closed unexpectedly');
        };
    }

    // --- Event Handlers ---
    $('#show-create-deck-modal').on('click', () => $('#create-deck-modal').removeClass('hidden').addClass('flex'));
    $('#cancel-create-deck').on('click', () => $('#create-deck-modal').addClass('hidden').removeClass('flex'));

    $('#create-deck-form').on('submit', async function(e) {
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
        e.preventDefault();
        localStorage.removeItem('authToken');
        alert("You have been logged out.");
        window.location.href = '/admin/login/';
    });

    $('#deck-list').on('click', '.deck-card', function() {
        const deckId = $(this).data('deck-id');
        loadDeckDetails(deckId);
    });

    $('#deck-list').on('click', '.study-deck-btn', function(e) {
        e.stopPropagation();
        const deckId = $(this).data('deck-id');
        startStudySession(deckId);
    });

    $('#deck-list').on('click', '.host-quiz-btn', function(e) {
        e.stopPropagation();
        const deckId = $(this).data('deck-id');
        hostQuiz(deckId);
    });

    $('#join-session-form').on('submit', function(e) {
        e.preventDefault();
        const roomCode = $('#session-code-input').val().toUpperCase();
        if (roomCode.length === 6) {
            joinQuiz(roomCode);
        } else {
            alert("Please enter a valid 6-character room code.");
        }
    });

    $('#deck-detail-view').on('click', '#back-to-decks', function() {
        showView('deck-list');
        loadDecks();
    });

    $('#deck-detail-view').on('submit', '#add-question-form', async function(e) {
        e.preventDefault();
        const questionText = $('#question-text').val();
        const correctAnswerText = $('#correct-answer').val();
        try {
            const questionData = { deck: state.selectedDeckId, question_text: questionText, question_type: 'FLASHCARD' };
            const newQuestion = await api.createQuestion(questionData);
            const choiceData = { question: newQuestion.id, choice_text: correctAnswerText, is_correct: true };
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

    // NEW: Click handler for the card itself to trigger the flip
    $('#study-view').on('click', '#flashcard', function() {
        $(this).toggleClass('is-flipped');
    });

    $('#study-view').on('click', '.rate-btn', async function(e) {
        e.stopPropagation(); // Prevent the card from flipping back
        const quality = $(this).data('quality');
        const card = state.studySession.cards[state.studySession.currentIndex];

        try {
            await api.rateCard(card.id, quality);
            console.log(`Rated card ${card.id} with quality ${quality}`);

            // Move to the next card
            state.studySession.currentIndex++;
            // Use a slight delay to allow the user to see their choice
            setTimeout(renderStudyView, 200);
        } catch(error) {
            alert('Error rating card. Check the console.');
            console.error(error);
            state.studySession.currentIndex++;
            setTimeout(renderStudyView, 200);
        }
    });

    $('#host-lobby-view').on('click', '#start-quiz-btn', function() {
        if (state.websocket) {
            state.websocket.send(JSON.stringify({ 'type': 'start_quiz' }));
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
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});