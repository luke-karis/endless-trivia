import levenshtein from 'https://cdn.skypack.dev/js-levenshtein';

const CONSTANTS = {
  //Normal ives and mult choice
  INITIAL_LIVES_N: 5,
  INITIAL_MULT_CHOICE_N: 10,
  //Challenging lives and mult choice
  INITIAL_LIVES_C: 3,
  INITIAL_MULT_CHOICE_C: 5,
  //Normal question distribution
  EASY_QUESTIONS_NORMAL: 5,
  MED_QUESTIONS_NORMAL: 10,
  HARD_QUESTIONS_NORMAL: 5,
  //Challenging question distribution
  MED_QUESTIONS_CHAL: 10,
  HARD_QUESTIONS_CHAL: 10,
  TOTAL_QUESTIONS: 20,
  ANSWER_DISTANCE: 5,
  NORMAL_DIFFICULTY: "normal",
  CHALLENGING_DIFFICULTY: "challenging"
};

const gameState = {
  questions: [],
  questionsChal: [],
  difficulty: CONSTANTS.NORMAL_DIFFICULTY,
  categories: new Map(),
  categoryChart: null,
  currentQuestionIndex: 0,
  score: 0,
  lives: CONSTANTS.INITIAL_LIVES,
  multChoice: CONSTANTS.INITIAL_MULT_CHOICE,
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

function filterMultipleChoiceQuestions(question) {
  const multipleChoiceKeywords = ['which of the following', 'which one', 'which of these', 'plot'];
  return !multipleChoiceKeywords.some(keyword =>
    question.question.text.toLowerCase().includes(keyword)
  );
}

function mapToChartData(map) {
  const labels = Array.from(map.keys());
  const data = Array.from(map.values());
  return { labels, data };
}

//THIS IS VERRRRY similar to method below prob should be paramaterized
document.addEventListener('DOMContentLoaded', function() {
  const startButtonNormal = document.getElementById('start-button-normal');

  if (startButtonNormal) {
      startButtonNormal.addEventListener('click', function() {
          const startOverlay = document.getElementById('start-overlay');
          if (startOverlay) {
              startOverlay.style.display = 'none';
          }
          console.log("START GAME NORMAL")
          startGame(CONSTANTS.NORMAL_DIFFICULTY);
      });
  }
});

document.addEventListener('DOMContentLoaded', function() {
  const startButtonChallenging = document.getElementById('start-button-challenging');

  if (startButtonChallenging) {
    startButtonChallenging.addEventListener('click', function() {
        const startOverlay = document.getElementById('start-overlay');
        if (startOverlay) {
            startOverlay.style.display = 'none';
        }
        console.log("START GAME CHALLENGING")
        startGame(CONSTANTS.CHALLENGING_DIFFICULTY);
    });
  }
});

//NEW fetch questions
async function getTriviaQuestions(numToQuery, difficulty, numToDisplay) {
  const apiUrl = `https://the-trivia-api.com/v2/questions?limit=${numToQuery}&difficulties=${difficulty}`;

  const output = [];

  while(output.length < numToDisplay) {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const jsonData = await response.json();
      const filteredData = jsonData.flat().filter(filterMultipleChoiceQuestions);

      filteredData.forEach(e => output.push(e));

    } catch (error) {
      console.error("Error fetching questions:", error);
      alert("Failed to fetch questions. Please try again later.");
    }
  }

  return output;

}

async function fetchQuestions_new() {

  const easyQuestions= await getTriviaQuestions(50, "easy", CONSTANTS.EASY_QUESTIONS_NORMAL);
  const mediumQuestions = await getTriviaQuestions(50, "medium", CONSTANTS.MED_QUESTIONS_NORMAL + CONSTANTS.MED_QUESTIONS_CHAL);
  const hardQuestions = await getTriviaQuestions(50, "hard", CONSTANTS.HARD_QUESTIONS_NORMAL + CONSTANTS.HARD_QUESTIONS_CHAL + CONSTANTS.INITIAL_LIVES_N);

  const normalQuestions = [];
  const chalQuestions = [];

  for(let i = 0; i < CONSTANTS.TOTAL_QUESTIONS + CONSTANTS.INITIAL_LIVES_N; i++) {
    if (i < CONSTANTS.EASY_QUESTIONS_NORMAL) {
      normalQuestions.push(easyQuestions.pop());
    } else if (i < CONSTANTS.EASY_QUESTIONS_NORMAL + CONSTANTS.MED_QUESTIONS_NORMAL) {
      normalQuestions.push(mediumQuestions.pop());
    } else if (i === CONSTANTS.EASY_QUESTIONS_NORMAL + CONSTANTS.MED_QUESTIONS_NORMAL) {
      shuffleArray(normalQuestions);
      normalQuestions.push(hardQuestions.pop());
    } else {
      normalQuestions.push(hardQuestions.pop());
    }

    if (i < CONSTANTS.MED_QUESTIONS_CHAL) {
      chalQuestions.push(mediumQuestions.pop());
    } else {
      chalQuestions.push(hardQuestions.pop());
    }
  }

  gameState.questions = normalQuestions;
  gameState.chalQuestions = chalQuestions;

}

function displayMultipleChoice(question) {
  if(gameState.multChoice === 0) return;

  gameState.multChoice--;
  updateElement('mult-choice-value', gameState.multChoice);

  const answerContainer = document.getElementById('answer-container');

  hideElementsById(true, ['answer-input', 'check-button', 'multiple-choice-button']);

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
  hideElementsById(false, ['answer-input', 'check-button', 'multiple-choice-button', 'score', 'lives', 'mult-choice']);
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
  } else {
    gameState.lives--;
    updateElement('lives-value', gameState.lives);
    showAnswerOverlay(questionText, isCorrect, correctAnswer, userAnswer);
  }
}

function compareAnswers(userAnswer, correctAnswer) {

  const lowerUserAnswer = userAnswer.toLowerCase()
  const lowerCorrectAnswer = correctAnswer.toLowerCase()
  const cleanedAnswer = lowerCorrectAnswer.replace(/^(a|the)\s+/i, '');

  //ADD comments here!!
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

    if (gameState.score === CONSTANTS.TOTAL_QUESTIONS) {
      displayGameOver(true);
    } else if (gameState.lives === 0) {
      displayGameOver(false);
    } else {
      nextQuestion();
    }
  };
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

  if (gameState.difficulty === CONSTANTS.NORMAL_DIFFICULTY) {
    displayQuestion(gameState.questions[gameState.currentQuestionIndex]);
  } else {
    displayQuestion(gameState.chalQuestions[gameState.currentQuestionIndex]);
  }
}

function displayGameOver(gameWon) {
  const container = document.getElementById('trivia-container');

  hideElementsById(true, ['question', 'answer-container', 'answer-input', 'score', 'lives', 'mult-choice']);

  const gameOverMessage = document.createElement('h2');
  gameOverMessage.textContent = gameWon ? `You win!` : `Game Over. Final Score: ${gameState.score}`;
  container.appendChild(gameOverMessage);

  const playAgainButton = document.createElement('button');
  playAgainButton.id = "playAgainButton";
  playAgainButton.textContent = 'Play Again';
  container.appendChild(playAgainButton);

  playAgainButton.onclick = () => { hideElementsById(false, ['start-overlay']) };
}

function removeGameOverElements() {
  const container = document.getElementById('trivia-container');
  const gameOverMessage = container.querySelector('h2');
  const playAgainButton = document.getElementById('playAgainButton');

  if (gameOverMessage) container.removeChild(gameOverMessage);
  if (playAgainButton) container.removeChild(playAgainButton);
}

function resetGameState(gameType) {
  let startingLives = gameType === CONSTANTS.NORMAL_DIFFICULTY ? CONSTANTS.INITIAL_LIVES_N : CONSTANTS.INITIAL_LIVES_C;
  let startingMC = gameType === CONSTANTS.NORMAL_DIFFICULTY ? CONSTANTS.INITIAL_MULT_CHOICE_N : CONSTANTS.INITIAL_MULT_CHOICE_C;

  if (gameState.categoryChart !== null) {
    gameState.categoryChart.destroy();
  }

  Object.assign(gameState, {
    questions: [],
    questionsChal: [],
    difficulty: CONSTANTS.NORMAL_DIFFICULTY,
    categories: new Map(),
    categoryChart: null,
    currentQuestionIndex: 0,
    score: 0,
    lives: startingLives,
    multChoice: startingMC,

  });

  updateUIElements();
}

function updateUIElements() {
  updateElement('score-value', gameState.score);
  updateElement('lives-value', gameState.lives);
  updateElement('mult-choice-value', gameState.multChoice);
}

async function startGame(gameType) {
  resetGameState(gameType);
  removeGameOverElements();
  hideElementsById(false, ['question', 'answer-container']);


  // NEW
  await fetchQuestions_new();

  console.log(gameState.questions);
  console.log(gameState.chalQuestions);

  if (gameType === CONSTANTS.CHALLENGING_DIFFICULTY) {
    gameState.difficulty = CONSTANTS.CHALLENGING_DIFFICULTY;
  }

  if (gameState.questions.length === 0) {
    alert('Failed to fetch questions. Please try again later.');
  } else if (gameState.difficulty === CONSTANTS.NORMAL_DIFFICULTY) {
    displayQuestion(gameState.questions[gameState.currentQuestionIndex]);
  } else {
    displayQuestion(gameState.chalQuestions[gameState.currentQuestionIndex]);
  }
}
