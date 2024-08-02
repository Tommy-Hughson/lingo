// Script deffered, DOM already loaded.
const gridEl = document.querySelector(".grid");
const boxes = Array.from({ length: 5 }, (_, i) => Array.from(gridEl.children[i].children));
const rows = Array.from(gridEl.children);

let row, col;
let guessWord;

let wordList;
let answerList;

async function init() {
  try {
    [wordList, answerList] = await Promise.all([
      fetchWordList("data/wordlist.txt"),
      fetchWordList("data/answerlist.txt"),
    ]);

    showControls(); // Show controls once wordlists loaded.
  } catch (error) {
    console.error("Error loading word lists:", error);
  }
}

async function fetchWordList(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.json();
}


const controls = document.querySelector(".controls");

function showControls(delay) {
  controls.classList.add((delay != true ? "visible" : "visible-delay"));
  for (const child of controls.children) child.removeAttribute("disabled");
}

function hideControls() {
  controls.classList.remove("visible");
  controls.classList.remove("visible-delay");
  for (const child of controls.children) child.setAttribute("disabled", "true");
}


const Clock = {
  bar: document.getElementById("progress"),
  raf: null,
  startTime: 0,
  wordTime: 10000,

  start() {
    this.startTime = performance.now();
    this.raf = window.requestAnimationFrame(this.frame.bind(this));
  },
  stop() {
    window.cancelAnimationFrame(this.raf);
  },
  frame(time) {
    const timeLeft = this.wordTime - (time - this.startTime);
    this.bar.style.width = `${timeLeft / this.wordTime * 100}%`;

    if (timeLeft <= 0) {
      this.bar.style.width = `${0}%`;
      gameEnd(false, false);
    } else {
      this.raf = window.requestAnimationFrame(this.frame.bind(this));
    }
  },
};

// Time input.
document.getElementById("time").onchange = (e) => {
  Clock.wordTime = e.target.value * 1000;
};



function startRound() {
  document.body.addEventListener("keydown", keyLog);
  Clock.start();
}

function stopRound() {
  document.body.removeEventListener("keydown", keyLog);
  Clock.stop();
}


const infoBox = document.getElementById("message");

function showMessage(message, delayed) {
  infoBox.innerHTML = message;
  infoBox.classList.add("visible" + (delayed ? "-delay" : ""));
}

function hideMessage() {
  infoBox.className = "message";
}

function showError(error) {
  infoBox.innerHTML = error;
  rows[row].classList.remove("row-error");
  infoBox.classList.remove("error-message");
  rows[row].offsetWidth; // Hack so that DOM recognizes classes were removed, allow for animation repeat.
  infoBox.classList.add("error-message");
  rows[row].classList.add("row-error");
}



////////////////////////////////////////////////////////
////////  KEY INPUTS  //////////////////////////////////
////////////////////////////////////////////////////////



function keyLog(key) {
  if (key.code.startsWith("Key") && col < 5) {
    updateBox(boxes[row][col++], key.key);
  } else if (key.code === "Backspace" && col > 0) {
    updateBox(boxes[row][--col], "");
  }
  else if (key.code === "Enter") {
    handleEnter();
  }
}

function updateBox(box, content) {
  box.innerHTML = content;
  box.classList.toggle("filled", !!content);
  box.classList.remove("placeholder", "placeholder-delay");
}

function handleEnter() {
  const word = boxes[row].map(box => box.innerHTML).join("");

  if (checkError(word)) return; // Stop on error.

  stopRound();

  // Determine if won.
  const result = getResult(guessWord.split(""), word.split(""));
  const win = result.every(r => r === "green");

  displayResults(result, win);

  if (win) {
    gameEnd(true, true);
  } else if (row == 4) {
    gameEnd(false, true);
  } else {
    row++, col = 0;

    // Restart clock after reveals.
    setTimeout(function () {
      startRound();
    }, 2500);
  }
}

function checkError(word) {
  let error = null;
  if (col < 5) {
    error = "Not enough letters";
  } else if (!wordList.includes(word)) {
    error = "Word Not in Wordlist";
  }
  if (error) showError(error);
  return !!error;
}

function getResult(word, input) {
  const result = Array(5).fill("gray");
  const letterCount = {};

  // Find correct positions.
  word.forEach((char, i) => {
    if (char === input[i]) {
      result[i] = "green";
      input[i] = null;
    } else {
      letterCount[char] = (letterCount[char] || 0) + 1;
    }
  });
  // Find postiions correct but in wrong place.
  input.forEach((char, i) => {
    if (char && letterCount[char] > 0) {
      result[i] = "yellow";
      letterCount[char]--;
    }
  });
  return result;
}

function displayResults(outcome, win) {
  outcome.forEach((o, i) => {
    boxes[row][i].classList.add(o, 'solved');

    // Show next line placeholders.
    if (o == "green" && row < 4 && !win) {
      const place = boxes[row + 1][i];
      place.classList.add("placeholder", "placeholder-delay");
      place.innerHTML = boxes[row][i].innerHTML;
    }
  });
}




function newGame() {
  hideControls();
  row = 0, col = 0;

  boxes.flat().forEach(box => {
    box.innerHTML = "";
    box.classList = "box";
  });
  guessWord = answerList[Math.floor(Math.random() * answerList.length)];
  // Show first letter of the word.
  boxes[0][0].innerHTML = guessWord[0];
  boxes[0][0].classList.add("placeholder");

  hideMessage();
  startRound();
}

function gameEnd(didWin, delayed) {
  stopRound();
  showControls(delayed);
  if (!didWin) showMessage(guessWord, delayed);
}


init();