import levenshtein from 'https://cdn.skypack.dev/js-levenshtein';

// Code Problems/todos
//
// STILL NEED TO DO THIS
// 1. Go through alllll the code and reunderstand it and add comments!! (This will be crucial if I actually want to make progress duh)
//
// 2. Test game And come up with graphical/visual todos (there are so many, just foucs on one at a time
//    2a. also focus on understanding CSS code

// 3. Add all todos for this game as github tasks and:
//    - rename repo
//    - Create functionality to have a report question button which will store them in a datastore that stores the question and how many reports it got
//    - Create baning functionality (ie certain questions will be banned and filtered out when questions are queried)
//      Then I can query the db and get the highest reported questions and add them to the ban list (all programatically if possible)
//    - remove the _ from category names in the graph
//    - the overlay screen after you answer a question jumps to the bottom, would like it to be centered

// Future ideas
//
// 1. Could have different dificulties which would change the variance of easy, medium, and hard questions.
//    might also be a good idea to display the current question difficulty so people will be able to feel the
//    difference between the levels.
//
// 2. Get the questions at the beginning of the day and only let one play per difficult (if difficulties are enabled)
//
// 3. MAYBE a button that you can click that checks your answer again in case the difference checker didn't get it


// Bugs/Weird stuff
//  WIERD ISSUE: Uncaught (in promise) TypeError: question is undefined
//    then displays the same question as before and will conintuously display this one.....
//    MAYBE This happens when you hit the max number of questions queried
////
// when you get an answe wrong and have no answers correctly there is just a big gap where the chart should be
//
// the mult choice buttons are a little squashed if they have two lines of text
//
// it takes a second or two for the game over shit to be removed



const CONSTANTS = {
  //Normal ives and mult choice
  INITIAL_LIVES_N: 1,
  INITIAL_MULT_CHOICE_N: 100,
  //Challenging lives and mult choice
  INITIAL_LIVES_C: 3,
  INITIAL_MULT_CHOICE_C: 5,
  //Normal question distribution
  EASY_MED_QUESTIONS_N: 5,
  MED_QUESTIONS_N: 10,
  MED_HARD_QUESTIONS_N: 5,
  //Challenging question distribution
  EASY_MED_QUESTIONS_C: 0,
  MED_QUESTIONS_C: 10,
  MED_HARD_QUESTIONS_C: 10,
  TOTAL_QUESTIONS: 20,
  ANSWER_DISTANCE: 3,
  NORMAL_DIFFICULTY: "normal",
  CHALLENGING_DIFFICULTY: "challenging"
};

const gameState = {
  questions: [],
  categories: new Map(),
  categoryChart: null,
  currentQuestionIndex: 0,
  score: 0,
  lives: CONSTANTS.INITIAL_LIVES,
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
              console.log("NORMAL");
          }
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
            console.log("CHALLENGING");
        }
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

//TEST: this out some more and see if its always the same ordering
async function fetchQuestions_new(gameType) {

  const easyMedQuestions = gameType === CONSTANTS.NORMAL_DIFFICULTY ? CONSTANTS.EASY_MED_QUESTIONS_N : CONSTANTS.EASY_MED_QUESTIONS_C;
  const mediumQuestions = gameType === CONSTANTS.NORMAL_DIFFICULTY ? CONSTANTS.EASY_MED_QUESTIONS_N : CONSTANTS.EASY_MED_QUESTIONS_C;
  const mediumHardQuestions = gameType === CONSTANTS.NORMAL_DIFFICULTY ? CONSTANTS.EASY_MED_QUESTIONS_N : CONSTANTS.EASY_MED_QUESTIONS_C;

  const easyMediumQs = await getTriviaQuestions(50, "easy,medium", easyMedQuestions);
  const mediumQs = await getTriviaQuestions(50, "medium", mediumQuestions);
  const mediumHardQs = await getTriviaQuestions(50, "medium,hard", mediumHardQuestions);

  const combinedQuestions = [];

  // TODO: make 25 a constant which can be number of questions or something
  for(let i = 0; i < CONSTANTS.TOTAL_QUESTIONS; i++) {
    if(i < 5) {
      combinedQuestions.push(easyMediumQs.pop());
    } else if (i < 15) {
      combinedQuestions.push(mediumQs.pop());
    } else {
      combinedQuestions.push(mediumHardQs.pop());
    }
  }

  gameState.questions = combinedQuestions;
  // combinedQuestions.forEach(e=>console.log(e.difficulty))

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

  //Having some issues with obv correct answers being marked as wrong so leaving logs for now
  // console.log(lowerUserAnswer === lowerCorrectAnswer);
  // console.log(lowerUserAnswer === cleanedAnswer);
  // console.log(isNaN(correctAnswer) && (levenshtein(lowerUserAnswer, lowerCorrectAnswer) < CONSTANTS.ANSWER_DISTANCE));
  // console.log(isNaN(correctAnswer) && (levenshtein(lowerUserAnswer, cleanedAnswer) < CONSTANTS.ANSWER_DISTANCE));

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

//does this have to be async
async function nextQuestion() {
  gameState.currentQuestionIndex++;

  if (gameState.currentQuestionIndex === CONSTANTS.TOTAL_QUESTIONS) {
    displayGameOver(false);
  } else {
    displayQuestion(gameState.questions[gameState.currentQuestionIndex]);
  }
}

function displayGameOver(gameWon) {
  const container = document.getElementById('trivia-container');

  hideElementsById(true, ['question', 'answer-container', 'answer-input', 'score', 'lives', 'mult-choice']);

  const gameOverMessage = document.createElement('h2');
  gameOverMessage.textContent = gameWon ? `You win! Final Score: ${gameState.score}` :
    `Game Over. Final Score: ${gameState.score}`;

  //const displayValue = hide ? 'none' : '';
  const playAgainButton = document.createElement('button');
  playAgainButton.id = "playAgainButton";
  playAgainButton.textContent = 'Play Again';

  //playAgainButton.onclick = startGame;
  playAgainButton.onclick = hideElementsById(false, ['start-overlay']);

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

function resetGameState(gameType) {
  let startingLives = gameType === CONSTANTS.NORMAL_DIFFICULTY ? CONSTANTS.INITIAL_LIVES_N : CONSTANTS.INITIAL_LIVES_C;
  let startingMC = gameType === CONSTANTS.NORMAL_DIFFICULTY ? CONSTANTS.INITIAL_MULT_CHOICE_C : CONSTANTS.INITIAL_MULT_CHOICE_C;

  if (gameState.categoryChart !== null) {
    gameState.categoryChart.destroy();
  }

  Object.assign(gameState, {
    questions: [],
    categories: new Map(),
    categoryChart: null,
    currentQuestionIndex: 0,
    score: 0,
    lives: startingLives,
    multChoice: startingMC,
    //WHAT is this, seems like its not being used
    difficultyIndex: 0
  });

  updateUIElements();
}

function updateUIElements() {
  updateElement('score-value', gameState.score);
  updateElement('lives-value', gameState.lives);
  updateElement('mult-choice-value', gameState.multChoice);
}

//does this have to be async?
async function startGame(gameType) {
  resetGameState(gameType);
  removeGameOverElements();
  hideElementsById(false, ['question', 'answer-container']);

  // OLD
  // await fetchQuestions();

  // NEW
  await fetchQuestions_new(gameType);

  console.log(gameState.questions);
  if (gameState.questions.length > 0) {
    displayQuestion(gameState.questions[gameState.currentQuestionIndex]);
  } else {
    alert('Failed to fetch questions. Please try again later.');
  }
}

//This can be commented out bc we start the game when the start game shit is clicked
//window.onload = startGame();
fetchQuestions_new();
