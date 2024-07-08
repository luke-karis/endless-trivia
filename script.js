import levenshtein from 'https://cdn.skypack.dev/js-levenshtein';

const CONSTANTS = {
  NUM_QUESTIONS: 10,
  INITIAL_LIVES: 3,
  INITIAL_SKIPS: 3,
  INITIAL_MULT_CHOICE: 5,
  ANSWER_DISTANCE: 3,
  DIFFICULTIES: ['easy', 'easy,medium', 'medium,hard', 'hard']
};

const gameState = {
  questions: [],
  currentQuestionIndex: 0,
  score: 0,
  lives: CONSTANTS.INITIAL_LIVES,
  skips: CONSTANTS.INITIAL_SKIPS,
  multChoice: CONSTANTS.INITIAL_MULT_CHOICE,
  difficultyIndex: 0
};

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function hideElementsById(hide, ids) {
  const displayValue = hide ? 'none' : '';
  ids.forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.style.display = displayValue;
  });
}

function updateElement(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  }
}

async function fetchQuestions() {
  try {
    const fetchPromises = CONSTANTS.DIFFICULTIES.map(difficulty => {
      const apiUrl = `https://the-trivia-api.com/v2/questions?limit=${CONSTANTS.NUM_QUESTIONS}&difficulties=${difficulty}`;
      return fetch(apiUrl).then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      });
    });

    const results = await Promise.all(fetchPromises);
    gameState.questions = results.flat().filter(filterMultipleChoiceQuestions);
    gameState.difficultyIndex = CONSTANTS.DIFFICULTIES.length;
  } catch (error) {
    console.error("Error fetching questions:", error);
    alert('Failed to fetch questions. Please try again later.');
  }
}

function filterMultipleChoiceQuestions(question) {
  const multipleChoiceKeywords = ['which of the following', 'which one', 'which of these'];
  return !multipleChoiceKeywords.some(keyword =>
    question.question.text.toLowerCase().includes(keyword)
  );
}

function displayMultipleChoice(question) {
  if(gameState.multChoice === 0) return;

  gameState.multChoice--;
  updateElement('mult-choice-value', gameState.multChoice);

  const answerContainer = document.getElementById('answer-container');

  hideElementsById(true, ['answer-input', 'check-button', 'multiple-choice-button', 'skip-button']);

  while (answerContainer.lastChild.id !== 'multiple-choice-button') {
    answerContainer.removeChild(answerContainer.lastChild);
  }

  const allAnswers = [...question.incorrectAnswers, question.correctAnswer];
  shuffleArray(allAnswers);

  allAnswers.forEach(answer => {
    const button = document.createElement('button');
    button.textContent = answer;
    button.onclick = () => checkAnswer(answer, question.correctAnswer);
    answerContainer.appendChild(button);
  });
}

function displayQuestion(question) {
  hideElementsById(false, ['answer-input', 'check-button', 'multiple-choice-button', 'skip-button']);
  const answerContainer = document.getElementById('answer-container');

  while (answerContainer.lastChild.id !== 'multiple-choice-button') {
    answerContainer.removeChild(answerContainer.lastChild);
  }

  const questionElement = document.getElementById('question');
  questionElement.textContent = question.question.text;

  const answerInput = document.getElementById('answer-input');
  answerInput.value = '';

  document.getElementById('check-button').onclick = () => checkAnswer(answerInput.value, question.correctAnswer);
  document.getElementById('multiple-choice-button').onclick = () => displayMultipleChoice(question);
  document.getElementById('skip-button').onclick = () => {
    if (gameState.skips > 0) {
      gameState.skips--;
      updateElement('skips-value', gameState.skips);
      nextQuestion();
    }
  };
}

function checkAnswer(userAnswer, correctAnswer) {
  const cleanedAnswer = correctAnswer.toLowerCase().replace(/^(a|the)\s+/i, '');

  if (userAnswer.toLowerCase() === cleanedAnswer ||
      (isNaN(correctAnswer) && levenshtein(userAnswer.toLowerCase(), cleanedAnswer) < CONSTANTS.ANSWER_DISTANCE)) {
    gameState.score++;
    updateElement('score-value', gameState.score);
    nextQuestion();
  } else if (gameState.lives > 0) {
    gameState.lives--;
    updateElement('lives-value', gameState.lives);
    nextQuestion();
  } else {
    displayGameOver();
  }
}

async function nextQuestion() {
  gameState.currentQuestionIndex++;
  if (gameState.currentQuestionIndex === gameState.questions.length) {
    await fetchQuestions();
  }

  displayQuestion(gameState.questions[gameState.currentQuestionIndex]);
}

function displayGameOver() {
  const container = document.getElementById('trivia-container');

  hideElementsById(true, ['question', 'answer-container']);

  const gameOverMessage = document.createElement('h2');
  gameOverMessage.textContent = `Game Over. Final Score: ${gameState.score}`;

  const playAgainButton = document.createElement('button');
  playAgainButton.id = "playAgainButton";
  playAgainButton.textContent = 'Play Again';
  playAgainButton.onclick = startGame;

  container.appendChild(gameOverMessage);
  container.appendChild(playAgainButton);
}

function removeGameOverElements() {
  const container = document.getElementById('trivia-container');
  const gameOverMessage = container.querySelector('h2');
  const playAgainButton = document.getElementById('playAgainButton');

  if (gameOverMessage) container.removeChild(gameOverMessage);
  if (playAgainButton) container.removeChild(playAgainButton);
}

function resetGameState() {
  Object.assign(gameState, {
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    lives: CONSTANTS.INITIAL_LIVES,
    skips: CONSTANTS.INITIAL_SKIPS,
    multChoice: CONSTANTS.INITIAL_MULT_CHOICE,
    difficultyIndex: 0
  });
  updateUIElements();
}

function updateUIElements() {
  updateElement('score-value', gameState.score);
  updateElement('lives-value', gameState.lives);
  updateElement('skips-value', gameState.skips);
  updateElement('mult-choice-value', gameState.multChoice);
}

async function startGame() {
  resetGameState();
  removeGameOverElements();
  hideElementsById(false, ['question', 'answer-container']);

  await fetchQuestions();
  console.log(gameState.questions)
  if (gameState.questions.length > 0) {
    displayQuestion(gameState.questions[gameState.currentQuestionIndex]);
  } else {
    alert('Failed to fetch questions. Please try again later.');
  }
}

window.onload = startGame;
