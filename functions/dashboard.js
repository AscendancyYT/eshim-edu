if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "./index.html";
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query as fsQuery,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  off,
  remove,
  update,
  get,
  query as rtdbQuery,
  orderByChild,
  equalTo,
  serverTimestamp,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyABomqBTkkti8Wzxu2H0UKX1s-UZBoFN0c",
  authDomain: "eshim-edu-eclipse.firebaseapp.com",
  projectId: "eshim-edu-eclipse",
  storageBucket: "eshim-edu-eclipse.firebasestorage.app",
  messagingSenderId: "499244396754",
  appId: "1:499244396754:web:b8add55832b41b1ee5bd0b",
  measurementId: "G-RKW9CEM3NQ",
 databaseURL: "https://eshim-edu-eclipse-default-rtdb.firebaseio.com/",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

const $ = (sel) => document.querySelector(sel);

const userEmailEl = $("#userEmail");
const userPhotoEl = $("#userPhoto");
const userProfilePicEl = $(".userProfilePic");

const gradesSection = $(".section.grades");
const eshimpaySection = $(".section.eshimpay");
const entertainmentSection = $(".section.entertainment");

const balanceIdEl = $("#balanceId");
const balanceEl = $("#balance");

const guessInput = $("#guessInput");
const guessButton = $("#guessButton");
const gameHint = $("#gameHint");
const attemptsEl = $("#attempts");
const resetGameButton = $("#resetGameButton");

const friendNameInput = $("#friendNameInput");
const sendRequestButton = $("#sendRequestButton");
const requestStatus = $("#requestStatus");
const requestList = $("#requestList");

const duelInput = $("#duelInput");
const duelSubmitButton = $("#duelSubmitButton");
const duelExitButton = $("#duelExitButton");
const duelStatus = $("#duelStatus");
const duelProblem = $("#duelProblem");
const duelTimer = $("#duelTimer");
const duelScores = $("#duelScores");
const requestSection = $("#requestSection");
const gameSection = $("#gameSection");

const modal = $("#gradeModal");
const modalSubject = $("#modalSubject");
const modalReward = $("#modalReward");
const modalCreatedAt = $("#modalCreatedAt");
const closeBtn = $(".close");

const sidebar = $(".sidebar");
const content = $(".content");
const sidebarBtn = $(".sidebarButton");

const setText = (el, text) => {
  if (el) el.textContent = String(text);
};

const show = (el) => el && el.classList.remove("hidden");
const hide = (el) => el && el.classList.add("hidden");

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
  const q = fsQuery(collection(db, "users"), where("fullName", "==", fullName));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return;
  }

  querySnapshot.forEach((docSnap) => {
    const userData = docSnap.data();

    if (userEmailEl) setText(userEmailEl, userData.email || "—");
    if (userPhotoEl && userData.photoURL) userPhotoEl.src = userData.photoURL;
    if (balanceIdEl) setText(balanceIdEl, `Balance ID: ${userData.balanceId || "N/A"}`);
    if (balanceEl) setText(balanceEl, `Balance: ${userData.balance ?? 0}`);

    if (userData.role === "student" && Array.isArray(userData.grades)) {
      const coinsList = $(".coins");
      if (!coinsList) return;
      coinsList.innerHTML = "";
      userData.grades.forEach((coin) => {
        const li = document.createElement("li");
        li.className = "coin";
        li.textContent = coin.reward;

        const red = Math.round(255 * (1 - Number(coin.reward || 0)));
        const green = Math.round(255 * Number(coin.reward || 0));
        li.style.backgroundColor = `rgb(${red}, ${green}, 0)`;

        li.addEventListener("click", () => {
          setText(modalSubject, `Subject: ${coin.subject || "N/A"}`);
          setText(modalReward, `Reward: ${coin.reward}`);
          setText(modalCreatedAt, `Created At: ${formatTimestamp(coin.createdAt)}`);
          modal.style.display = "block";
          requestAnimationFrame(() => modal.classList.add("show"));
        });

        coinsList.appendChild(li);
      });
    }
  });
}

let targetNumber = Math.floor(Math.random() * 100) + 1;
let attempts = 0;

function resetGuessGame() {
  targetNumber = Math.floor(Math.random() * 100) + 1;
  attempts = 0;
  if (guessInput) guessInput.value = "";
  setText(gameHint, "Start guessing!");
  setText(attemptsEl, `Attempts: ${attempts}`);
  if (guessButton) guessButton.classList.remove("hidden");
  if (resetGameButton) resetGameButton.classList.add("hidden");
  if (guessInput) guessInput.disabled = false;
}

if (guessButton) {
  guessButton.addEventListener("click", () => {
    const guess = parseInt(guessInput?.value ?? "", 10);
    if (isNaN(guess) || guess < 1 || guess > 100) {
      setText(gameHint, "Please enter a number between 1 and 100.");
      return;
    }
    attempts++;
    setText(attemptsEl, `Attempts: ${attempts}`);
    if (guess === targetNumber) {
      setText(gameHint, `Congratulations! You guessed it in ${attempts} attempts!`);
      guessButton.classList.add("hidden");
      resetGameButton?.classList.remove("hidden");
      if (guessInput) guessInput.disabled = true;
    } else if (guess < targetNumber) {
      setText(gameHint, "Too low! Try a higher number.");
    } else {
      setText(gameHint, "Too high! Try a lower number.");
    }
  });
}
resetGameButton?.addEventListener("click", resetGuessGame);

const WIN_SCORE = 5;
const TURN_SECONDS = 10;

let currentGameId = null;
let currentPlayerName = localStorage.getItem("fullName") || "";
let gameUnsubscribe = null;
let requestUnsubscribe = null;
let timerInterval = null;

function generateProblem() {
  const ops = ["+", "-", "*"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  let answer = 0;
  if (op === "+") answer = a + b;
  else if (op === "-") answer = a - b;
  else answer = a * b;

  return {
    num1: a,
    num2: b,
    operation: op,
    answer,
    problemText: `${a} ${op} ${b} = ?`,
  };
}

function enterLobby() {
  show(requestSection);
  hide(gameSection);
  setText(duelStatus, "Waiting for opponent's turn...");
  setText(duelProblem, "Waiting for game to start...");
  setText(duelScores, "You: 0 | Opponent: 0");
  if (duelInput) {
    duelInput.value = "";
    duelInput.disabled = true;
  }
  duelSubmitButton?.classList.add("hidden");
}

function enterGame() {
  hide(requestSection);
  show(gameSection);
}

function clearTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateCountdown(currentTurnStart) {
  clearTimer();
  const tick = () => {
    const now = Date.now();
    const elapsed = Math.floor((now - currentTurnStart) / 1000);
    const remaining = Math.max(0, TURN_SECONDS - elapsed);
    setText(duelTimer, `Time Left: ${remaining}s`);
    if (remaining <= 0) {
      clearTimer();
    }
  };
  timerInterval = setInterval(tick, 1000);
  tick();
}

async function advanceTurnTx(gameId, payload) {
  const gameRef = ref(rtdb, `games/${gameId}`);
  await runTransaction(gameRef, (gameData) => {
    if (!gameData || gameData.status !== "active") return gameData;

    const me = currentPlayerName;
    if (gameData.currentPlayer !== me) {
      return gameData;
    }

    const nextPlayer =
      gameData.players[0] === me ? gameData.players[1] : gameData.players[0];

    if (payload?.correct) {
      const curr = gameData.scores?.[me] ?? 0;
      gameData.scores = { ...gameData.scores, [me]: curr + 1 };
    }

    const myScore = gameData.scores?.[me] ?? 0;
    if (myScore >= WIN_SCORE) {
      return {
        ...gameData,
        status: "finished",
        finishedAt: serverTimestamp(),
      };
    }

    gameData.currentPlayer = nextPlayer;
    gameData.currentProblem = generateProblem();
    gameData.currentTurnStart = Date.now();

    return gameData;
  });
}

function listenToGame(gameId) {
  if (gameUnsubscribe) {
    gameUnsubscribe();
    gameUnsubscribe = null;
  }

  const gameRef = ref(rtdb, `games/${gameId}`);
  const cb = (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      enterLobby();
      currentGameId = null;
      return;
    }

    const me = currentPlayerName;
    const opponent = data.players.find((p) => p !== me) || "Opponent";
    const myScore = data.scores?.[me] ?? 0;
    const oppScore = data.scores?.[opponent] ?? 0;
    setText(duelScores, `You: ${myScore} | Opponent: ${oppScore}`);

    setText(duelProblem, data.currentProblem?.problemText ?? "Waiting...");

    const myTurn = data.currentPlayer === me;
    if (duelInput) duelInput.disabled = !myTurn;
    if (duelSubmitButton) {
      if (myTurn) duelSubmitButton.classList.remove("hidden");
      else duelSubmitButton.classList.add("hidden");
    }
    setText(duelStatus, myTurn ? "Your Turn: Solve the problem!" : "Waiting for opponent...");

    const turnStart = Number(data.currentTurnStart) || Date.now();
    updateCountdown(turnStart);

    if (data.status === "finished") {
      const winner =
        (data.scores?.[data.players[0]] ?? 0) >= WIN_SCORE
          ? data.players[0]
          : data.players[1];
      setText(duelStatus, `Game Over! ${winner} Wins!`);
      if (duelInput) duelInput.disabled = true;
      duelSubmitButton?.classList.add("hidden");
      clearTimer();
    }
  };

  onValue(gameRef, cb);
  gameUnsubscribe = () => off(gameRef, "value", cb);
}

async function createGameIfMissing(gameId, player1, player2) {
  const gameRef = ref(rtdb, `games/${gameId}`);
  await runTransaction(gameRef, (existing) => {
    if (existing) return existing;
    return {
      players: [player1, player2],
      currentPlayer: player1,
      scores: { [player1]: 0, [player2]: 0 },
      currentProblem: generateProblem(),
      currentTurnStart: Date.now(),
      status: "active",
      createdAt: serverTimestamp(),
    };
  });
}

function joinGame(gameId) {
  currentGameId = gameId;
  enterGame();
  listenToGame(gameId);
}

async function sendGameRequest(friendName) {
  const q = fsQuery(collection(db, "users"), where("fullName", "==", friendName));
  const snap = await getDocs(q);
  if (snap.empty) {
    setText(requestStatus, "No user found with that name.");
    return;
  }

  const reqRef = push(ref(rtdb, "gameRequests"));
  const gameId = reqRef.key;
  await set(reqRef, {
    id: gameId,
    from: currentPlayerName,
    to: friendName,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  setText(requestStatus, `Request sent to ${friendName}!`);
  if (friendNameInput) friendNameInput.value = "";

  if (requestUnsubscribe) {
    requestUnsubscribe();
    requestUnsubscribe = null;
  }
  const cb = async (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    if (data.status === "accepted") {
      await createGameIfMissing(gameId, data.from, data.to);
      joinGame(gameId);
      if (requestUnsubscribe) {
        requestUnsubscribe();
        requestUnsubscribe = null;
      }
    } else if (data.status === "declined") {
      setText(requestStatus, "Your request was declined.");
      if (requestUnsubscribe) {
        requestUnsubscribe();
        requestUnsubscribe = null;
      }
    }
  };
  onValue(reqRef, cb);
  requestUnsubscribe = () => off(reqRef, "value", cb);
}

function renderIncomingRequests(listSnapshot) {
  if (!requestList) return;
  requestList.innerHTML = "";
  listSnapshot.forEach((childSnap) => {
    const req = childSnap.val();
    const requestId = childSnap.key;
    if (req.status !== "pending") return;
    const li = document.createElement("li");
    li.innerHTML = `
      <span>Request from ${req.from}</span>
      <div>
        <button data-id="${requestId}" class="acceptRequest">Accept</button>
        <button data-id="${requestId}" class="declineRequest">Decline</button>
      </div>
    `;
    requestList.appendChild(li);
  });
}

async function acceptRequest(requestId) {
  const reqRef = ref(rtdb, `gameRequests/${requestId}`);
  const snap = await get(reqRef);
  if (!snap.exists()) return;
  const req = snap.val();
  await update(reqRef, { status: "accepted", acceptedAt: serverTimestamp() });
  await createGameIfMissing(requestId, req.from, req.to);
  joinGame(requestId);
}

async function declineRequest(requestId) {
  const reqRef = ref(rtdb, `gameRequests/${requestId}`);
  await update(reqRef, { status: "declined" });
  setText(requestStatus, "Request declined.");
}

async function submitAnswer() {
  if (!currentGameId) return;
  const val = parseInt(duelInput?.value ?? "", 10);
  if (isNaN(val)) {
    setText(duelStatus, "Please enter a valid number!");
    return;
  }
  const gameRef = ref(rtdb, `games/${currentGameId}`);
  const snap = await get(gameRef);
  if (!snap.exists()) return;
  const data = snap.val();

  if (data.currentPlayer !== currentPlayerName || data.status !== "active") {
    return;
  }

  const correct = val === Number(data.currentProblem?.answer);
  await advanceTurnTx(currentGameId, { correct });
  if (duelInput) duelInput.value = "";
}

async function exitGame() {
  clearTimer();
  if (currentGameId) {
    const gameRef = ref(rtdb, `games/${currentGameId}`);
    await update(gameRef, { status: "aborted", abortedAt: serverTimestamp() });
    currentGameId = null;
  }
  if (gameUnsubscribe) {
    gameUnsubscribe();
    gameUnsubscribe = null;
  }
  enterLobby();
}

if (currentPlayerName) {
  const myIncoming = rtdbQuery(
    ref(rtdb, "gameRequests"),
    orderByChild("to"),
    equalTo(currentPlayerName)
  );
  onValue(myIncoming, (snapshot) => {
    renderIncomingRequests(snapshot);
  });
}

sendRequestButton?.addEventListener("click", () => {
  const friendName = (friendNameInput?.value || "").trim();
  if (!friendName) {
    setText(requestStatus, "Please enter a friend's full name.");
    return;
  }
  if (!currentPlayerName) {
    setText(requestStatus, "Your profile name is missing.");
    return;
  }
  if (friendName === currentPlayerName) {
    setText(requestStatus, "You cannot invite yourself!");
    return;
  }
  sendGameRequest(friendName).catch((e) => {
    setText(requestStatus, "Failed to send request. Try again.");
  });
});

requestList?.addEventListener("click", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const id = target.dataset.id;
  if (!id) return;

  if (target.classList.contains("acceptRequest")) {
    acceptRequest(id).catch(console.error);
  } else if (target.classList.contains("declineRequest")) {
    declineRequest(id).catch(console.error);
  }
});

duelSubmitButton?.addEventListener("click", () => {
  submitAnswer().catch(console.error);
});

duelExitButton?.addEventListener("click", () => {
  exitGame().catch(console.error);
});

const sidebarLinks = document.querySelectorAll(".sidebar .center .link, .sidebar .bottom");
sidebarLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const section = link.getAttribute("data-section");
    if (!section) return;

    const map = {
      grades: gradesSection,
      eshimpay: eshimpaySection,
      entertainment: entertainmentSection,
    };

    [gradesSection, eshimpaySection, entertainmentSection].forEach((el) => {
      if (!el) return;
      if (el === map[section]) {
        el.classList.remove("hidden");
        el.classList.add("active");
      } else {
        el.classList.add("hidden");
        el.classList.remove("active");
      }
    });

    if (section === "entertainment") {
      friendNameInput?.focus();
    }
  });
});

closeBtn?.addEventListener("click", () => {
  modal?.classList.remove("show");
  setTimeout(() => {
    if (modal) modal.style.display = "none";
  }, 300);
});

window.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal?.classList.remove("show");
    setTimeout(() => {
      if (modal) modal.style.display = "none";
    }, 300);
  }
});

sidebarBtn?.addEventListener("click", () => {
  sidebar?.classList.toggle("collapsed");
  content?.classList.toggle("expanded");
  setTimeout(() => window.dispatchEvent(new Event("resize")), 400);
});

(function bootstrap() {
  gradesSection?.classList.remove("hidden");
  gradesSection?.classList.add("active");

  const storedFullName = localStorage.getItem("fullName") || "";
  if (storedFullName) {
    getUserByFullName(storedFullName).catch(console.error);
  }

  if (userProfilePicEl) {
    const ch = (storedFullName || "U").trim()[0] || "U";
    userProfilePicEl.innerHTML = ch.toUpperCase();
  }

  enterLobby();
})();