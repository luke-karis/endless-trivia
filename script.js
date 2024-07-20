import levenshtein from 'https://cdn.skypack.dev/js-levenshtein';

const CONSTANTS = {
  NUM_QUESTIONS: 10,
  INITIAL_LIVES: 3,
  INITIAL_SKIPS: 3,
  INITIAL_MULT_CHOICE: 10,
  ANSWER_DISTANCE: 3,
  DIFFICULTIES: ['easy', 'easy,medium', 'medium,hard', 'hard']
};

const gameState = {
  questions: [],
  categories: new Map(),
  categoryChart: null,
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
    button.onclick = () => checkAnswer(question.question.text, question.category, answer, question.correctAnswer);
    answerContainer.appendChild(button);
  });
}

function displayQuestion(question) {
  hideElementsById(false, ['answer-input', 'check-button', 'multiple-choice-button', 'skip-button']);
  const answerContainer = document.getElementById('answer-container');

  while (answerContainer.lastChild.id !== 'multiple-choice-button') {
    answerContainer.removeChild(answerContainer.lastChild);
  }

  const questionText = question.question.text;
  const questionElement = document.getElementById('question');
  questionElement.textContent = questionText;

  const answerInput = document.getElementById('answer-input');
  answerInput.value = '';

  document.getElementById('check-button').onclick = () => checkAnswer(questionText, question.category, answerInput.value, question.correctAnswer);
  document.getElementById('multiple-choice-button').onclick = () => displayMultipleChoice(question);
  document.getElementById('skip-button').onclick = () => {
    if (gameState.skips > 0) {
      gameState.skips--;
      updateElement('skips-value', gameState.skips);
      nextQuestion();
    }
  };
}

function checkAnswer(questionText, category, userAnswer, correctAnswer) {

  if (userAnswer === '') {
    return;
  }

  const isCorrect = compareAnswers(userAnswer, correctAnswer);
  // showAnswerOverlay(questionText, isCorrect, correctAnswer, userAnswer);

  if (isCorrect) {
    gameState.score++;
    updateElement('score-value', gameState.score);
    gameState.categories.set(category, (gameState.categories.get(category) ?? 0) + 1);
    createOrUpdateBarChart(gameState.categories);
    showAnswerOverlay(questionText, isCorrect, correctAnswer, userAnswer);
    nextQuestion();
  } else if (gameState.lives > 0) {
    gameState.lives--;
    updateElement('lives-value', gameState.lives);
    showAnswerOverlay(questionText, isCorrect, correctAnswer, userAnswer);
    nextQuestion();
  } else {
    displayGameOver();
  }
}

function compareAnswers(userAnswer, correctAnswer) {

  const lowerUserAnswer = userAnswer.toLowerCase()
  const lowerCorrectAnswer = correctAnswer.toLowerCase()
  const cleanedAnswer = lowerCorrectAnswer.replace(/^(a|the)\s+/i, '');

  //Having some issues with obv correct answers being marked as wrong so leaving logs for now
  console.log(lowerUserAnswer === lowerCorrectAnswer);
  console.log(lowerUserAnswer === cleanedAnswer);
  console.log(isNaN(correctAnswer) && (levenshtein(lowerUserAnswer, lowerCorrectAnswer) < CONSTANTS.ANSWER_DISTANCE));
  console.log(isNaN(correctAnswer) && (levenshtein(lowerUserAnswer, cleanedAnswer) < CONSTANTS.ANSWER_DISTANCE));

  if (lowerUserAnswer === lowerCorrectAnswer ||
      lowerUserAnswer === cleanedAnswer ||
      (isNaN(correctAnswer) && (levenshtein(lowerUserAnswer, lowerCorrectAnswer) < CONSTANTS.ANSWER_DISTANCE)) ||
      (isNaN(correctAnswer) && (levenshtein(lowerUserAnswer, cleanedAnswer) < CONSTANTS.ANSWER_DISTANCE))) {
        return true;
  }

  return false;
}

function showAnswerOverlay(questionText, isCorrect, correctAnswer, userAnswer) {
  const overlay = document.getElementById('answer-overlay');
  const feedback = document.getElementById('answer-feedback');
  const questionElement = document.getElementById('question-overlay');
  const answerElement = document.getElementById('correct-answer');
  const continueButton = document.getElementById('continue-button');

  feedback.textContent = isCorrect ? "Correct!" : `${userAnswer} is Incorrect`;
  if(!isCorrect) {
    answerElement.textContent = "Answer: " + correctAnswer;
    questionElement.textContent = "Question: " + questionText;
  } else {
    answerElement.textContent = "";
    questionElement.textContent = "";
  }

  overlay.style.display = 'flex';

  continueButton.onclick = () => {
    overlay.style.display = 'none';
    if (gameState.lives > 0) {
      nextQuestion();
    } else {
      displayGameOver();
    }
  };
}

function mapToChartData(map) {
  const labels = Array.from(map.keys());
  const data = Array.from(map.values());
  return { labels, data };
}

function createOrUpdateBarChart(map) {
  const ctx = document.getElementById("categories-chart").getContext('2d');
  const { labels, data } = mapToChartData(map);

  if (gameState.categoryChart) {
      // Update existing chart
      gameState.categoryChart.data.labels = labels;
      gameState.categoryChart.data.datasets[0].data = data;
      gameState.categoryChart.update();
  } else {
      // Create new chart
      gameState.categoryChart = new Chart(ctx, {
          type: 'bar',
          data: {
              labels: labels,
              datasets: [{
                  label: 'Correct Answers by Category',
                  data: data,
                  backgroundColor: 'rgba(75, 192, 192, 0.6)',
                  borderColor: 'rgba(75, 192, 192, 1)',
                  borderWidth: 1
              }]
          },
          options: {
              scales: {
                  y: {
                      beginAtZero: true,
                      ticks: {
                          stepSize: 1
                      }
                  }
              },
              responsive: true,
              maintainAspectRatio: false
          }
      });
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
    categories: new Map(),
    categoryChart: null,
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
