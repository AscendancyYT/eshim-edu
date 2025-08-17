if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "./index.html";
}

// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  remove,
  update,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyABomqBTkkti8Wzxu2H0UKX1s-UZBoFN0c",
  authDomain: "eshim-edu-eclipse.firebaseapp.com",
  projectId: "eshim-edu-eclipse",
  storageBucket: "eshim-edu-eclipse.firebasestorage.app",
  messagingSenderId: "499244396754",
  appId: "1:499244396754:web:b8add55832b41b1ee5bd0b",
  measurementId: "G-RKW9CEM3NQ",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// DOM Elements
const userEmailEl = document.getElementById("userEmail");
const userPhotoEl = document.getElementById("userPhoto");
const userProfilePicEl = document.querySelector(".userProfilePic");
const gradesSection = document.querySelector(".section.grades");
const eshimpaySection = document.querySelector(".section.eshimpay");
const entertainmentSection = document.querySelector(".section.entertainment");
const balanceIdEl = document.getElementById("balanceId");
const balanceEl = document.getElementById("balance");
const guessInput = document.getElementById("guessInput");
const guessButton = document.getElementById("guessButton");
const gameHint = document.getElementById("gameHint");
const attemptsEl = document.getElementById("attempts");
const resetGameButton = document.getElementById("resetGameButton");
const friendNameInput = document.getElementById("friendNameInput");
const sendRequestButton = document.getElementById("sendRequestButton");
const requestStatus = document.getElementById("requestStatus");
const requestList = document.getElementById("requestList");
const duelInput = document.getElementById("duelInput");
const duelSubmitButton = document.getElementById("duelSubmitButton");
const duelExitButton = document.getElementById("duelExitButton");
const duelStatus = document.getElementById("duelStatus");
const duelProblem = document.getElementById("duelProblem");
const duelTimer = document.getElementById("duelTimer");
const duelScores = document.getElementById("duelScores");

// Modal elements
const modal = document.getElementById("gradeModal");
const modalSubject = document.getElementById("modalSubject");
const modalReward = document.getElementById("modalReward");
const modalCreatedAt = document.getElementById("modalCreatedAt");
const closeBtn = document.querySelector(".close");

// Math Guessing Game (Single Player) Logic
let targetNumber = Math.floor(Math.random() * 100) + 1;
let attempts = 0;

function resetGuessGame() {
  targetNumber = Math.floor(Math.random() * 100) + 1;
  attempts = 0;
  guessInput.value = "";
  gameHint.textContent = "Start guessing!";
  attemptsEl.textContent = `Attempts: ${attempts}`;
  guessButton.classList.remove("hidden");
  resetGameButton.classList.add("hidden");
  guessInput.disabled = false;
}

guessButton.addEventListener("click", () => {
  const guess = parseInt(guessInput.value);
  if (isNaN(guess) || guess < 1 || guess > 100) {
    gameHint.textContent = "Please enter a number between 1 and 100.";
    return;
  }
  attempts++;
  attemptsEl.textContent = `Attempts: ${attempts}`;
  if (guess === targetNumber) {
    gameHint.textContent = `Congratulations! You guessed it in ${attempts} attempts!`;
    guessButton.classList.add("hidden");
    resetGameButton.classList.remove("hidden");
    guessInput.disabled = true;
  } else if (guess < targetNumber) {
    gameHint.textContent = "Too low! Try a higher number.";
  } else {
    gameHint.textContent = "Too high! Try a lower number.";
  }
});

resetGameButton.addEventListener("click", resetGuessGame);

// Math Duel (Online Two Players) Logic
let currentGameId = null;
let currentPlayerName = localStorage.getItem("fullName");
let timerInterval;
const timeLimit = 10;

function generateProblem() {
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  const num1 = Math.floor(Math.random() * 20) + 1;
  const num2 = Math.floor(Math.random() * 20) + 1;
  let answer;
  switch (operation) {
    case '+':
      answer = num1 + num2;
      break;
    case '-':
      answer = num1 - num2;
      break;
    case '*':
      answer = num1 * num2;
      break;
  }
  return { num1, num2, operation, answer, problemText: `${num1} ${operation} ${num2} = ?` };
}

async function sendGameRequest(friendName) {
  const q = query(collection(db, "users"), where("fullName", "==", friendName));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    requestStatus.textContent = "No user found with that name.";
    return;
  }
  const gameRef = push(ref(rtdb, "gameRequests"));
  await set(gameRef, {
    from: currentPlayerName,
    to: friendName,
    status: "pending",
    createdAt: Date.now(),
  });
  requestStatus.textContent = `Request sent to ${friendName}!`;
  friendNameInput.value = "";
}

function displayRequests(snapshot) {
  requestList.innerHTML = "";
  snapshot.forEach((childSnapshot) => {
    const request = childSnapshot.val();
    const requestId = childSnapshot.key;
    if (request.to === currentPlayerName && request.status === "pending") {
      const li = document.createElement("li");
      li.innerHTML = `
        Request from ${request.from}
        <button data-id="${requestId}" class="acceptRequest">Accept</button>
        <button data-id="${requestId}" class="declineRequest">Decline</button>
      `;
      requestList.appendChild(li);
    }
  });
}

async function startGame(gameId, player1, player2) {
  currentGameId = gameId;
  const gameRef = ref(rtdb, `games/${gameId}`);
  await set(gameRef, {
    players: [player1, player2],
    currentPlayer: player1,
    scores: { [player1]: 0, [player2]: 0 },
    currentProblem: generateProblem(),
    currentTurnStart: Date.now(),
    status: "active",
  });
  requestSection.classList.add("hidden");
  gameSection.classList.remove("hidden");
  duelInput.disabled = player1 !== currentPlayerName;
  startTimer();
}

function startTimer() {
  let timeLeft = timeLimit;
  duelTimer.textContent = `Time Left: ${timeLeft}s`;
  timerInterval = setInterval(async () => {
    timeLeft--;
    duelTimer.textContent = `Time Left: ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      const gameRef = ref(rtdb, `games/${currentGameId}`);
      const gameSnapshot = await getDocs(gameRef);
      if (gameSnapshot.exists()) {
        const gameData = gameSnapshot.val();
        const nextPlayer = gameData.currentPlayer === gameData.players[0] ? gameData.players[1] : gameData.players[0];
        await update(gameRef, {
          currentPlayer: nextPlayer,
          currentProblem: generateProblem(),
          currentTurnStart: Date.now(),
        });
      }
    }
  }, 1000);
}

async function exitGame() {
  if (currentGameId) {
    await remove(ref(rtdb, `games/${currentGameId}`));
    currentGameId = null;
  }
  clearInterval(timerInterval);
  requestSection.classList.remove("hidden");
  gameSection.classList.add("hidden");
  duelStatus.textContent = "Waiting for opponent's turn...";
  duelProblem.textContent = "Waiting for game to start...";
  duelScores.textContent = "You: 0 | Opponent: 0";
  duelInput.value = "";
  duelInput.disabled = true;
  duelSubmitButton.classList.add("hidden");
}

// Event Listeners
sendRequestButton.addEventListener("click", () => {
  const friendName = friendNameInput.value.trim();
  if (!friendName) {
    requestStatus.textContent = "Please enter a friend's full name.";
    return;
  }
  if (friendName === currentPlayerName) {
    requestStatus.textContent = "You cannot invite yourself!";
    return;
  }
  sendGameRequest(friendName);
});

requestList.addEventListener("click", async (e) => {
  const requestId = e.target.dataset.id;
  if (e.target.classList.contains("acceptRequest")) {
    const requestRef = ref(rtdb, `gameRequests/${requestId}`);
    const requestSnapshot = await getDocs(requestRef);
    if (requestSnapshot.exists()) {
      const request = requestSnapshot.val();
      await update(requestRef, { status: "accepted" });
      await startGame(requestId, request.from, request.to);
    }
  } else if (e.target.classList.contains("declineRequest")) {
    await remove(ref(rtdb, `gameRequests/${requestId}`));
    requestStatus.textContent = "Request declined.";
  }
});

duelSubmitButton.addEventListener("click", async () => {
  const answer = parseInt(duelInput.value);
  if (isNaN(answer)) {
    duelStatus.textContent = "Please enter a valid number!";
    return;
  }
  const gameRef = ref(rtdb, `games/${currentGameId}`);
  const gameSnapshot = await getDocs(gameRef);
  if (gameSnapshot.exists()) {
    const gameData = gameSnapshot.val();
    if (gameData.currentPlayer === currentPlayerName) {
      const correct = answer === gameData.currentProblem.answer;
      if (correct) {
        const newScores = { ...gameData.scores, [currentPlayerName]: gameData.scores[currentPlayerName] + 1 };
        if (newScores[currentPlayerName] >= 5) {
          duelStatus.textContent = `Game Over! ${currentPlayerName} Wins!`;
          duelSubmitButton.classList.add("hidden");
          duelInput.disabled = true;
          await update(gameRef, { status: "finished" });
          clearInterval(timerInterval);
          return;
        }
        await update(gameRef, {
          scores: newScores,
          currentPlayer: gameData.players[0] === currentPlayerName ? gameData.players[1] : gameData.players[0],
          currentProblem: generateProblem(),
          currentTurnStart: Date.now(),
        });
        duelStatus.textContent = `Correct! Waiting for opponent's turn...`;
      } else {
        duelStatus.textContent = `Incorrect! The answer was ${gameData.currentProblem.answer}.`;
        await update(gameRef, {
          currentPlayer: gameData.players[0] === currentPlayerName ? gameData.players[1] : gameData.players[0],
          currentProblem: generateProblem(),
          currentTurnStart: Date.now(),
        });
      }
      duelInput.value = "";
      duelInput.disabled = true;
      clearInterval(timerInterval);
    }
  }
});

duelExitButton.addEventListener("click", exitGame);

// Listen for game requests
onValue(ref(rtdb, "gameRequests"), (snapshot) => {
  displayRequests(snapshot);
});

// Listen for game state changes
onValue(ref(rtdb, "games"), async (snapshot) => {
  if (currentGameId && snapshot.val()[currentGameId]) {
    const gameData = snapshot.val()[currentGameId];
    duelScores.textContent = `You: ${gameData.scores[currentPlayerName]} | Opponent: ${gameData.scores[gameData.players[0] === currentPlayerName ? gameData.players[1] : gameData.players[0]]}`;
    duelProblem.textContent = gameData.currentProblem.problemText;
    duelInput.disabled = gameData.currentPlayer !== currentPlayerName;
    duelSubmitButton.classList.toggle("hidden", gameData.currentPlayer !== currentPlayerName);
    duelStatus.textContent = gameData.currentPlayer === currentPlayerName ? "Your Turn: Solve the problem!" : "Waiting for opponent's turn...";
    if (gameData.status === "finished") {
      duelStatus.textContent = `Game Over! ${gameData.scores[gameData.players[0]] >= 5 ? gameData.players[0] : gameData.players[1]} Wins!`;
      duelSubmitButton.classList.add("hidden");
      duelInput.disabled = true;
      clearInterval(timerInterval);
    } else if (gameData.currentPlayer === currentPlayerName) {
      clearInterval(timerInterval);
      startTimer();
    }
  }
});

// Section toggling
const sidebarLinks = document.querySelectorAll(".sidebar .center .link, .sidebar .bottom");
sidebarLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const section = link.getAttribute("data-section");
    gradesSection.classList.toggle("hidden", section !== "grades");
    eshimpaySection.classList.toggle("hidden", section !== "eshimpay");
    entertainmentSection.classList.toggle("hidden", section !== "entertainment");
    gradesSection.classList.toggle("active", section === "grades");
    eshimpaySection.classList.toggle("active", section === "eshimpay");
    entertainmentSection.classList.toggle("active", section === "entertainment");
    if (section === "entertainment") {
      friendNameInput.focus();
    }
  });
});

// Close modal when clicking on close button
closeBtn.addEventListener("click", () => {
  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);
});

// Close modal when clicking outside of it
window.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  }
});

// Function to convert Firestore Timestamp to readable date
function formatTimestamp(timestamp) {
  if (!timestamp || !timestamp.toDate) return "N/A";
  const date = timestamp.toDate();
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

async function getUserByFullName(fullName) {
  const q = query(collection(db, "users"), where("fullName", "==", fullName));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    querySnapshot.forEach((docSnap) => {
      const userData = docSnap.data();
      console.log("✅ User found:", docSnap.id, userData);

      if (userEmailEl) userEmailEl.textContent = userData.email;
      if (userPhotoEl && userData.photoURL) {
        userPhotoEl.src = userData.photoURL;
      }
      if (balanceIdEl) balanceIdEl.textContent = `Balance ID: ${userData.balanceId || 'N/A'}`;
      if (balanceEl) balanceEl.textContent = `Balance: ${userData.balance || 0}`;

      if (userData.role == "student") {
        userData.grades.forEach(coin => {
          const coinEl = document.createElement("li");
          coinEl.classList.add("coin");
          coinEl.textContent = coin.reward;
          const red = Math.round(255 * (1 - coin.reward));
          const green = Math.round(255 * coin.reward);
          coinEl.style.backgroundColor = `rgb(${red}, ${green}, 0)`;

          coinEl.addEventListener("click", () => {
            modalSubject.textContent = `Subject: ${coin.subject || 'N/A'}`;
            modalReward.textContent = `Reward: ${coin.reward}`;
            modalCreatedAt.textContent = `Created At: ${formatTimestamp(coin.createdAt)}`;
            modal.style.display = "block";
            setTimeout(() => {
              modal.classList.add("show");
            }, 10);
          });

          document.querySelector(".coins").appendChild(coinEl);
        });
      }
    });
  } else {
    console.log("⚠️ No user found with this fullName.");
  }
}

// Run on load
const storedFullName = localStorage.getItem("fullName");
if (storedFullName) {
  getUserByFullName(storedFullName);
} else {
  console.log("⚠️ No fullName stored in localStorage.");
}

userProfilePicEl.innerHTML = localStorage.getItem("fullName")[0] || "U";

// Sidebar toggle
const sidebar = document.querySelector(".sidebar");
const content = document.querySelector(".content");
const sidebarBtn = document.querySelector(".sidebarButton");

sidebarBtn.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  content.classList.toggle("expanded");
  setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
  }, 400);
});

// Show grades section by default on page load
gradesSection.classList.remove("hidden");
gradesSection.classList.add("active");