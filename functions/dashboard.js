// --- auth gate ---
if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "./index.html";
}

// --- firebase imports ---
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

// --- firebase config ---
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

// --- dom helpers / refs ---
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

// --- blitz UI refs ---
const blitzFriendInput = $("#blitzFriendInput");
const blitzInviteBtn = $("#blitzInviteBtn");
const blitzInviteStatus = $("#blitzInviteStatus");
const blitzIncomingList = $("#blitzIncomingList");

const blitzLobby = $("#blitzLobby");
const blitzGame = $("#blitzGame");

const blitzStatus = $("#blitzStatus");
const blitzTimer = $("#blitzTimer");
const blitzProblem = $("#blitzProblem");

const blitzAnswer = $("#blitzAnswer");
const blitzSubmitBtn = $("#blitzSubmitBtn");
const blitzExitBtn = $("#blitzExitBtn");

const blitzScore = $("#blitzScore");
const blitzStreak = $("#blitzStreak");
const blitzFeed = $("#blitzFeed");

// --- small helpers ---
const setText = (el, text) => {
  if (el) el.textContent = String(text);
};
const show = (el) => el && el.classList.remove("hidden");
const hide = (el) => el && el.classList.add("hidden");

// --- utils ---
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

// --- profile + grades render ---
async function getUserByFullName(fullName) {
  const q = fsQuery(collection(db, "users"), where("fullName", "==", fullName));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return;

  querySnapshot.forEach((docSnap) => {
    const userData = docSnap.data();

    if (userEmailEl) setText(userEmailEl, userData.email || "—");
    if (userPhotoEl && userData.photoURL) userPhotoEl.src = userData.photoURL;
    if (balanceIdEl)
      setText(balanceIdEl, `Balance ID: ${userData.balanceId || "N/A"}`);
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
          setText(
            modalCreatedAt,
            `Created At: ${formatTimestamp(coin.createdAt)}`
          );
          modal.style.display = "block";
          requestAnimationFrame(() => modal.classList.add("show"));
        });

        coinsList.appendChild(li);
      });
    }
  });
}

// --- tiny guess game (solo) ---
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
      setText(
        gameHint,
        `Congratulations! You guessed it in ${attempts} attempts!`
      );
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

// --- classic duel (turn-based) ---
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
    if (remaining <= 0) clearTimer();
  };
  timerInterval = setInterval(tick, 1000);
  tick();
}

async function advanceTurnTx(gameId, payload) {
  const gameRef = ref(rtdb, `games/${gameId}`);
  await runTransaction(gameRef, (gameData) => {
    if (!gameData || gameData.status !== "active") return gameData;

    const me = currentPlayerName;
    if (gameData.currentPlayer !== me) return gameData;

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
    setText(
      duelStatus,
      myTurn ? "Your Turn: Solve the problem!" : "Waiting for opponent..."
    );

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
  const q = fsQuery(
    collection(db, "users"),
    where("fullName", "==", friendName)
  );
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

  if (data.currentPlayer !== currentPlayerName || data.status !== "active")
    return;

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

// --- incoming requests watcher ---
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

// --- UI events (duel) ---
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
  sendGameRequest(friendName).catch(() =>
    setText(requestStatus, "Failed to send request. Try again.")
  );
});

requestList?.addEventListener("click", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const id = target.dataset.id;
  if (!id) return;
  if (target.classList.contains("acceptRequest"))
    acceptRequest(id).catch(console.error);
  else if (target.classList.contains("declineRequest"))
    declineRequest(id).catch(console.error);
});

duelSubmitButton?.addEventListener("click", () => {
  submitAnswer().catch(console.error);
});
duelExitButton?.addEventListener("click", () => {
  exitGame().catch(console.error);
});

// --- sidebar / modal / bootstrap UI ---
const sidebarLinks = document.querySelectorAll(
  ".sidebar .center .link, .sidebar .bottom"
);
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

    if (section === "entertainment") friendNameInput?.focus();
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
  if (storedFullName) getUserByFullName(storedFullName).catch(console.error);

  if (userProfilePicEl) {
    const ch = (storedFullName || "U").trim()[0] || "U";
    userProfilePicEl.innerHTML = ch.toUpperCase();
  }

  enterLobby();
})();

const BLITZ_WIN_SCORE = 10;
const BLITZ_PROBLEM_INTERVAL_MS = 8000;
const BLITZ_ANSWER_WINDOW_MS = 8000;

// local state
let blitzGameId = null;
let blitzUnsub = null;
let blitzReqUnsub = null;
let blitzTimerInterval = null;
let blitzHeartbeatId = null;
let blitzFeedUnsub = null;
let myBlitzStreak = 0;

// helpers
function blitzShow(el) {
  el && el.classList.remove("hidden");
}
function blitzHide(el) {
  el && el.classList.add("hidden");
}
function blitzSet(el, txt) {
  if (el) el.textContent = String(txt);
}

function blitzGenerateProblem() {
  const ops = ["+", "-", "*"];
  const a = Math.floor(Math.random() * 30) + 1;
  const b = Math.floor(Math.random() * 30) + 1;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let ans = 0;
  if (op === "+") ans = a + b;
  else if (op === "*") ans = a * b;
  else ans = a - b;
  return {
    id:
      crypto?.randomUUID?.() ??
      `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    a,
    b,
    op,
    ans,
    text: `${a} ${op} ${b} = ?`,
  };
}

function blitzEnterLobby() {
  blitzShow(blitzLobby);
  blitzHide(blitzGame);
  blitzSet(blitzStatus, "Get Ready…");
  blitzSet(blitzProblem, "—");
  blitzSet(blitzTimer, "Next problem in: —");
  blitzSet(blitzScore, "You: 0 | Opponent: 0");
  blitzSet(blitzStreak, "🔥 Streak: 0");
  if (blitzAnswer) {
    blitzAnswer.value = "";
    blitzAnswer.disabled = true;
  }
  blitzSubmitBtn?.classList.add("hidden");
  if (blitzFeed) blitzFeed.innerHTML = "";
}

function blitzEnterGame() {
  blitzHide(blitzLobby);
  blitzShow(blitzGame);
}

function blitzClearIntervals() {
  if (blitzTimerInterval) {
    clearInterval(blitzTimerInterval);
    blitzTimerInterval = null;
  }
  if (blitzHeartbeatId) {
    clearInterval(blitzHeartbeatId);
    blitzHeartbeatId = null;
  }
}

function blitzStartNextProblemTx(gameId) {
  const gref = ref(rtdb, `blitzGames/${gameId}`);
  return runTransaction(gref, (g) => {
    if (!g || g.status !== "active") return g;

    const now = Date.now();
    const started = g.current?.startedAt ?? 0;
    const answered = !!g.current?.answeredBy;
    const expired = now - started > BLITZ_PROBLEM_INTERVAL_MS;
    const needNew = !g.current || answered || expired;
    if (!needNew) return g;

    const prob = blitzGenerateProblem();
    g.current = {
      id: prob.id,
      text: prob.text,
      ans: prob.ans,
      startedAt: now,
      answeredBy: null,
    };
    g.nextAt = now + BLITZ_PROBLEM_INTERVAL_MS;
    return g;
  });
}

async function blitzCreateGameIfMissing(gameId, p1, p2) {
  const gref = ref(rtdb, `blitzGames/${gameId}`);
  await runTransaction(gref, (exist) => {
    if (exist) return exist;
    const prob = blitzGenerateProblem();
    return {
      players: [p1, p2],
      scores: { [p1]: 0, [p2]: 0 },
      streaks: { [p1]: 0, [p2]: 0 },
      status: "active",
      createdAt: serverTimestamp(),
      current: {
        id: prob.id,
        text: prob.text,
        ans: prob.ans,
        startedAt: Date.now(),
        answeredBy: null,
      },
      nextAt: Date.now() + BLITZ_PROBLEM_INTERVAL_MS,
      lastFeed: "",
    };
  });
}

function blitzListenFeed(gameId) {
  // clean previous
  if (blitzFeedUnsub) {
    blitzFeedUnsub();
    blitzFeedUnsub = null;
  }
  const lfRef = ref(rtdb, `blitzGames/${gameId}/lastFeed`);
  const cb = (snap) => {
    const msg = snap.val();
    if (msg) {
      const p = document.createElement("p");
      p.textContent = msg;
      p.className = "feed-item";
      blitzFeed.prepend(p);
      p.animate([{ transform: "scale(0.9)" }, { transform: "scale(1)" }], {
        duration: 150,
        iterations: 1,
      });
    }
  };
  onValue(lfRef, cb);
  blitzFeedUnsub = () => off(lfRef, "value", cb);
}

function blitzJoinGame(gameId) {
  blitzGameId = gameId;
  blitzEnterGame();
  blitzListen(gameId);
  blitzListenFeed(gameId);

  // NEW: heartbeat to rotate problems even if nobody answers
  if (blitzHeartbeatId) {
    clearInterval(blitzHeartbeatId);
  }
  blitzHeartbeatId = setInterval(() => {
    if (blitzGameId) blitzStartNextProblemTx(blitzGameId).catch(console.error);
  }, 2000);
}

function blitzListen(gameId) {
  if (blitzUnsub) {
    blitzUnsub();
    blitzUnsub = null;
  }

  const gref = ref(rtdb, `blitzGames/${gameId}`);
  const cb = (snap) => {
    const g = snap.val();
    if (!g) {
      blitzEnterLobby();
      blitzGameId = null;
      return;
    }

    const me = currentPlayerName;
    const opponent = (g.players || []).find((n) => n !== me) || "Opponent";

    const myScore = g.scores?.[me] ?? 0;
    const oppScore = g.scores?.[opponent] ?? 0;
    blitzSet(blitzScore, `You: ${myScore} | Opponent: ${oppScore}`);
    myBlitzStreak = g.streaks?.[me] ?? 0;
    blitzSet(blitzStreak, `🔥 Streak: ${myBlitzStreak}`);

    if (g.current) {
      blitzSet(blitzProblem, g.current.text || "—");
      const enable = g.status === "active" && !g.current.answeredBy;
      if (blitzAnswer) blitzAnswer.disabled = !enable;
      if (blitzSubmitBtn)
        enable
          ? blitzSubmitBtn.classList.remove("hidden")
          : blitzSubmitBtn.classList.add("hidden");

      // visible countdown to the next rotation
      blitzClearIntervals(); // clears timer + heartbeat; we'll re-arm heartbeat below
      const endAt = Number(g.nextAt) || Date.now();
      const tick = () => {
        const remain = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        blitzSet(blitzTimer, `Next problem in: ${remain}s`);
      };
      blitzTimerInterval = setInterval(tick, 500);
      tick();

      // re-arm heartbeat if cleared
      if (!blitzHeartbeatId) {
        blitzHeartbeatId = setInterval(() => {
          if (blitzGameId)
            blitzStartNextProblemTx(blitzGameId).catch(console.error);
        }, 2000);
      }
    } else {
      blitzSet(blitzProblem, "—");
      blitzSet(blitzTimer, "Next problem in: —");
      if (blitzAnswer) blitzAnswer.disabled = true;
      blitzSubmitBtn?.classList.add("hidden");
    }

    if (g.status === "finished") {
      const p0 = g.players?.[0];
      const p1 = g.players?.[1];
      const w =
        (g.scores?.[p0] || 0) >= BLITZ_WIN_SCORE
          ? p0
          : (g.scores?.[p1] || 0) >= BLITZ_WIN_SCORE
          ? p1
          : (g.scores?.[p0] || 0) > (g.scores?.[p1] || 0)
          ? p0
          : p1;
      blitzSet(blitzStatus, `Game Over! ${w === me ? "You" : w} Win(s)!`);
      if (blitzAnswer) blitzAnswer.disabled = true;
      blitzSubmitBtn?.classList.add("hidden");
      blitzClearIntervals();
    } else {
      blitzSet(blitzStatus, "Answer fast! First correct gets the point.");
    }
  };

  onValue(gref, cb);
  blitzUnsub = () => off(gref, "value", cb);
}

async function blitzSubmit() {
  if (!blitzGameId) return;

  const val = parseInt(blitzAnswer?.value ?? "", 10);
  if (Number.isNaN(val)) {
    blitzSet(blitzStatus, "Enter a number, math wizard 🧙‍♂️");
    return;
  }

  // immediate UX lock to avoid double-submits until state echoes back
  if (blitzAnswer) blitzAnswer.disabled = true;

  const gref = ref(rtdb, `blitzGames/${blitzGameId}`);

  await runTransaction(gref, (g) => {
    if (!g || g.status !== "active" || !g.current) return g;

    if (g.current.answeredBy) return g;

    const age = Date.now() - (g.current.startedAt || 0);
    if (age > BLITZ_ANSWER_WINDOW_MS) return g;

    const correct = val === Number(g.current.ans);
    const me = currentPlayerName;
    const players = g.players || [];
    const opp = players.find((n) => n !== me);

    if (correct) {
      const curr = g.scores?.[me] ?? 0;
      const sMe = (g.streaks?.[me] ?? 0) + 1;
      const sOpp = 0;
      g.scores = { ...g.scores, [me]: curr + 1 };
      g.streaks = { ...g.streaks, [me]: sMe, [opp]: sOpp };
      g.current.answeredBy = me;
      g.lastFeed = `${me} answered correctly! (+1) 🔥x${sMe}`;

      if (g.scores[me] >= BLITZ_WIN_SCORE) {
        g.status = "finished";
        g.finishedAt = serverTimestamp();
        return g;
      }

      const np = blitzGenerateProblem();
      const now = Date.now();
      g.current = {
        id: np.id,
        text: np.text,
        ans: np.ans,
        startedAt: now,
        answeredBy: null,
      };
      g.nextAt = now + BLITZ_PROBLEM_INTERVAL_MS;
      return g;
    } else {
      g.lastFeed = `${me} missed. Keep trying!`;
      return g;
    }
  });

  if (blitzAnswer) blitzAnswer.value = "";
}

async function blitzExit() {
  blitzClearIntervals();
  if (blitzGameId) {
    const gref = ref(rtdb, `blitzGames/${blitzGameId}`);
    await update(gref, { status: "aborted", abortedAt: serverTimestamp() });
    blitzGameId = null;
  }
  if (blitzUnsub) {
    blitzUnsub();
    blitzUnsub = null;
  }
  if (blitzReqUnsub) {
    blitzReqUnsub();
    blitzReqUnsub = null;
  }
  if (blitzFeedUnsub) {
    blitzFeedUnsub();
    blitzFeedUnsub = null;
  }
  blitzEnterLobby();
}

/************ Blitz invitations ************/
function renderBlitzIncoming(listSnap) {
  if (!blitzIncomingList) return;
  blitzIncomingList.innerHTML = "";
  listSnap.forEach((child) => {
    const req = child.val();
    const id = child.key;
    if (req.status !== "pending") return;
    const li = document.createElement("li");
    li.innerHTML = `
      <span>Blitz invite from <strong>${req.from}</strong></span>
      <div>
        <button data-id="${id}" class="blitzAccept">Accept</button>
        <button data-id="${id}" class="blitzDecline">Decline</button>
      </div>
    `;
    blitzIncomingList.appendChild(li);
  });
}

async function blitzSendInvite(friendName) {
  const q = fsQuery(
    collection(db, "users"),
    where("fullName", "==", friendName)
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    blitzSet(blitzInviteStatus, "No user with that name.");
    return;
  }

  const reqRef = push(ref(rtdb, "blitzRequests"));
  const gameId = reqRef.key;
  await set(reqRef, {
    id: gameId,
    from: currentPlayerName,
    to: friendName,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  blitzSet(blitzInviteStatus, `Invite sent to ${friendName}!`);
  if (blitzFriendInput) blitzFriendInput.value = "";

  if (blitzReqUnsub) {
    blitzReqUnsub();
    blitzReqUnsub = null;
  }
  const cb = async (s) => {
    const data = s.val();
    if (!data) return;
    if (data.status === "accepted") {
      await blitzCreateGameIfMissing(gameId, data.from, data.to);
      blitzJoinGame(gameId);
      if (blitzReqUnsub) {
        blitzReqUnsub();
        blitzReqUnsub = null;
      }
    } else if (data.status === "declined") {
      blitzSet(blitzInviteStatus, "Your invite was declined.");
      if (blitzReqUnsub) {
        blitzReqUnsub();
        blitzReqUnsub = null;
      }
    }
  };
  onValue(reqRef, cb);
  blitzReqUnsub = () => off(reqRef, "value", cb);
}

async function blitzAccept(id) {
  const rr = ref(rtdb, `blitzRequests/${id}`);
  const s = await get(rr);
  if (!s.exists()) return;
  const req = s.val();
  await update(rr, { status: "accepted", acceptedAt: serverTimestamp() });
  await blitzCreateGameIfMissing(id, req.from, req.to);
  blitzJoinGame(id);
}

async function blitzDecline(id) {
  const rr = ref(rtdb, `blitzRequests/${id}`);
  await update(rr, { status: "declined" });
  blitzSet(blitzInviteStatus, "Invite declined.");
}

// global incoming listener for blitz
if (currentPlayerName) {
  const myBlitzIncoming = rtdbQuery(
    ref(rtdb, "blitzRequests"),
    orderByChild("to"),
    equalTo(currentPlayerName)
  );
  onValue(myBlitzIncoming, (snap) => renderBlitzIncoming(snap));
}

// blitz events
blitzInviteBtn?.addEventListener("click", () => {
  const friend = (blitzFriendInput?.value || "").trim();
  if (!friend)
    return blitzSet(blitzInviteStatus, "Enter a friend's full name.");
  if (!currentPlayerName)
    return blitzSet(blitzInviteStatus, "Your profile name is missing.");
  if (friend === currentPlayerName)
    return blitzSet(blitzInviteStatus, "Bro… you can’t invite yourself 😄");
  blitzSendInvite(friend).catch(() =>
    blitzSet(blitzInviteStatus, "Failed to send invite.")
  );
});

blitzIncomingList?.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  const id = t.dataset.id;
  if (!id) return;
  if (t.classList.contains("blitzAccept")) blitzAccept(id).catch(console.error);
  if (t.classList.contains("blitzDecline"))
    blitzDecline(id).catch(console.error);
});

blitzSubmitBtn?.addEventListener("click", () =>
  blitzSubmit().catch(console.error)
);
blitzAnswer?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    blitzSubmit().catch(console.error);
  }
});
blitzExitBtn?.addEventListener("click", () => blitzExit().catch(console.error));

const chessFriendInput = document.getElementById("chessFriendInput");
const chessInviteBtn = document.getElementById("chessInviteBtn");
const chessInviteStatus = document.getElementById("chessInviteStatus");
const chessIncomingList = document.getElementById("chessIncomingList");

const chessLobby = document.getElementById("chessLobby");
const chessGame = document.getElementById("chessGame");
const chessBoardEl = document.getElementById("chessBoard");
const chessStatus = document.getElementById("chessStatus");
const chessTurnEl = document.getElementById("chessTurn");
const chessCapturedEl = document.getElementById("chessCaptured");
const chessExitBtn = document.getElementById("chessExitBtn");
const chessFlipBtn = document.getElementById("chessFlipBtn");

function cShow(el) {
  el && el.classList.remove("hidden");
}
function cHide(el) {
  el && el.classList.add("hidden");
}
function cSet(el, txt) {
  if (el) el.textContent = String(txt);
}

const PIECE = {
  wp: "♙",
  wr: "♖",
  wn: "♘",
  wb: "♗",
  wq: "♕",
  wk: "♔",
  bp: "♟",
  br: "♜",
  bn: "♞",
  bb: "♝",
  bq: "♛",
  bk: "♚",
};
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w";
let chessGameId = null;
let chessUnsub = null;
let myChessColor = null; // 'w' | 'b'
let chessFlip = false; 
let selectedIdx = null;
let legalDestinations = [];

function fenToBoard(fen) {
  const [boardPart] = fen.split(" ");
  const rows = boardPart.split("/");
  const board = [];
  for (let r = 0; r < 8; r++) {
    const row = rows[r];
    for (const ch of row) {
      if (/\d/.test(ch)) board.push(...Array(Number(ch)).fill(""));
      else {
        const isWhite = ch === ch.toUpperCase();
        const color = isWhite ? "w" : "b";
        const pt = ch.toLowerCase();
        const map = { p: "p", r: "r", n: "n", b: "b", q: "q", k: "k" };
        board.push(color + map[pt]);
      }
    }
  }
  return board; // length 64, from a8..h1
}
function boardToFen(board, turn = "w") {
  let out = "",
    count = 0;
  for (let i = 0; i < 64; i++) {
    const cell = board[i];
    if (cell === "") count++;
    else {
      if (count) {
        out += String(count);
        count = 0;
      }
      const color = cell[0],
        t = cell[1];
      const map = { p: "p", r: "r", n: "n", b: "b", q: "q", k: "k" };
      const letter = color === "w" ? map[t].toUpperCase() : map[t];
      out += letter;
    }
    if (i % 8 === 7) {
      if (count) {
        out += String(count);
        count = 0;
      }
      if (i !== 63) out += "/";
    }
  }
  return `${out} ${turn}`;
}
const idxToRC = (idx) => ({ r: Math.floor(idx / 8), c: idx % 8 });
const rcToIdx = (r, c) => r * 8 + c;
const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const isWhite = (p) => p && p[0] === "w";
const isBlack = (p) => p && p[0] === "b";
const sameColor = (a, b) => !!a && !!b && a[0] === b[0];
const oppColor = (a, b) => !!a && !!b && a[0] !== b[0];

/** generate pseudo-legal moves (no castling/en passant; we’ll prevent moving when not your turn) */
function genMoves(board, fromIdx) {
  const src = board[fromIdx];
  if (!src) return [];
  const color = src[0],
    type = src[1];
  const { r, c } = idxToRC(fromIdx);
  const moves = [];
  const forward = color === "w" ? -1 : 1; // board 0 is a8 (top-left)

  function pushIfEmpty(rr, cc) {
    if (!inBounds(rr, cc)) return false;
    const t = board[rcToIdx(rr, cc)];
    if (t === "") {
      moves.push(rcToIdx(rr, cc));
      return true;
    }
    return false;
  }
  function pushIfCapture(rr, cc) {
    if (!inBounds(rr, cc)) return;
    const t = board[rcToIdx(rr, cc)];
    if (t && t[0] !== color) moves.push(rcToIdx(rr, cc));
  }
  function rays(dirs) {
    for (const [dr, dc] of dirs) {
      let rr = r + dr,
        cc = c + dc;
      while (inBounds(rr, cc)) {
        const t = board[rcToIdx(rr, cc)];
        if (t === "") {
          moves.push(rcToIdx(rr, cc));
        } else {
          if (t[0] !== color) moves.push(rcToIdx(rr, cc));
          break;
        }
        rr += dr;
        cc += dc;
      }
    }
  }

  if (type === "p") {
    // one forward
    if (pushIfEmpty(r + forward, c)) {
      // double from rank 6 (white pawns start row 6) or rank 1 (black pawns start row 1)
      if ((color === "w" && r === 6) || (color === "b" && r === 1)) {
        pushIfEmpty(r + 2 * forward, c);
      }
    }
    // captures
    pushIfCapture(r + forward, c - 1);
    pushIfCapture(r + forward, c + 1);
  } else if (type === "n") {
    const K = [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ];
    for (const [dr, dc] of K) {
      const rr = r + dr,
        cc = c + dc;
      if (!inBounds(rr, cc)) continue;
      const t = board[rcToIdx(rr, cc)];
      if (!t || t[0] !== color) moves.push(rcToIdx(rr, cc));
    }
  } else if (type === "b") {
    rays([
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ]);
  } else if (type === "r") {
    rays([
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]);
  } else if (type === "q") {
    rays([
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]);
  } else if (type === "k") {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr,
          cc = c + dc;
        if (!inBounds(rr, cc)) continue;
        const t = board[rcToIdx(rr, cc)];
        if (!t || t[0] !== color) moves.push(rcToIdx(rr, cc));
      }
    }
  }
  return moves;
}

/** detect simple “check” (for status text) */
function kingInCheck(board, color) {
  let kingIdx = -1;
  for (let i = 0; i < 64; i++)
    if (board[i] === color + "k") {
      kingIdx = i;
      break;
    }
  if (kingIdx < 0) return false;
  // brute: if any opponent move hits king
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p[0] === color) continue;
    const moves = genMoves(board, i);
    if (moves.includes(kingIdx)) return true;
  }
  return false;
}

function cEnterLobby() {
  cShow(chessLobby);
  cHide(chessGame);
  cSet(chessStatus, "—");
  cSet(chessTurnEl, "Turn: —");
  cSet(chessCapturedEl, "Captured: —");
  if (chessBoardEl) chessBoardEl.innerHTML = "";
  selectedIdx = null;
  legalDestinations = [];
}
function cEnterGame() {
  cHide(chessLobby);
  cShow(chessGame);
}

function drawBoard(board) {
  if (!chessBoardEl) return;
  chessBoardEl.innerHTML = "";
  const order = [...Array(64).keys()];
  const oriented = chessFlip ? order.reverse() : order; // Reverse for flip
  for (let i = 0; i < 64; i++) {
    const dispIdx = oriented[i];
    const { r, c } = idxToRC(dispIdx);
    const modelIdx = dispIdx; // Model index matches display for simplicity
    const piece = board[modelIdx];
    const sq = document.createElement("div");
    sq.className = "chess-square " + ((r + c) % 2 === 0 ? "light" : "dark");
    sq.dataset.idx = String(modelIdx);

    // Add piece with span for better centering
    if (piece) {
      const pieceSpan = document.createElement("span");
      pieceSpan.textContent = PIECE[piece] || "•";
      pieceSpan.style.fontSize = "clamp(18px, 4vw, 30px)"; // Responsive sizing
      pieceSpan.style.lineHeight = "1";
      sq.appendChild(pieceSpan);
    }

    if (selectedIdx === modelIdx) sq.classList.add("sel");
    if (legalDestinations.includes(modelIdx)) {
      if (board[modelIdx]) sq.classList.add("capture");
      else sq.classList.add("move");
    }

    sq.addEventListener("click", onSquareClick);
    chessBoardEl.appendChild(sq);
  }
}

function onSquareClick(e) {
  if (!chessGameId) return;
  const idx = Number(e.currentTarget.dataset.idx || -1);
  if (idx < 0) return;
  // We don’t have direct board here; we will read from snapshot cache in listener (stored on window)
  const g = window.__chessState;
  if (!g || g.status !== "active") return;

  const board = g.board || [];
  const myTurn = g.turn === myChessColor;
  if (!myTurn) return;

  const piece = board[idx];
  if (selectedIdx === null) {
    if (!piece || piece[0] !== myChessColor) return; // must select own piece
    selectedIdx = idx;
    legalDestinations = genMoves(board, idx)
      // don’t allow landing on same-color
      .filter((d) => !sameColor(board[idx], board[d]));
    drawBoard(board);
  } else {
    // if clicking same color piece, reselect
    if (piece && piece[0] === myChessColor && idx !== selectedIdx) {
      selectedIdx = idx;
      legalDestinations = genMoves(board, idx).filter(
        (d) => !sameColor(board[idx], board[d])
      );
      drawBoard(board);
      return;
    }
    // if destination allowed -> try move
    if (legalDestinations.includes(idx)) {
      chessMakeMove(selectedIdx, idx).catch(console.error);
    }
    // clear selection regardless
    selectedIdx = null;
    legalDestinations = [];
    drawBoard(board);
  }
}

async function chessMakeMove(fromIdx, toIdx) {
  if (!chessGameId) return;
  const gref = ref(rtdb, `chessGames/${chessGameId}`);
  await runTransaction(gref, (g) => {
    if (!g || g.status !== "active") return g;
    const me = currentPlayerName;
    if (!g.colors || g.colors[me] !== g.turn) return g;

    const board = (g.board || []).slice();
    const src = board[fromIdx],
      dst = board[toIdx];
    if (!src) return g;
    const myColor = src[0];
    if (myColor !== g.turn) return g;

    // validate with same move generator
    const moves = genMoves(board, fromIdx).filter(
      (d) => !sameColor(board[fromIdx], board[d])
    );
    if (!moves.includes(toIdx)) return g;

    // make the move
    const captured = dst || "";
    board[toIdx] = src;
    board[fromIdx] = "";

    // promotion (auto-queen)
    const { r: toR } = idxToRC(toIdx);
    if (
      src[1] === "p" &&
      ((myColor === "w" && toR === 0) || (myColor === "b" && toR === 7))
    ) {
      board[toIdx] = myColor + "q";
    }

    // next turn
    const nextTurn = g.turn === "w" ? "b" : "w";
    const capW = g.captured?.w || [];
    const capB = g.captured?.b || [];
    if (captured) {
      if (myColor === "w") capW.push(captured);
      else capB.push(captured);
    }

    const newG = {
      ...g,
      board,
      turn: nextTurn,
      lastMove: {
        from: fromIdx,
        to: toIdx,
        piece: src,
        captured: captured || null,
      },
      captured: { w: capW, b: capB },
      updatedAt: serverTimestamp(),
    };

    // (Optional) simple check info
    newG.inCheck = {
      w: kingInCheck(board, "w"),
      b: kingInCheck(board, "b"),
    };
    return newG;
  });
}

async function chessCreateGameIfMissing(gameId, p1, p2) {
  const gref = ref(rtdb, `chessGames/${gameId}`);
  await runTransaction(gref, (exist) => {
    if (exist) return exist;
    const board = fenToBoard(START_FEN);
    const whiteFirst = Math.random() < 0.5;
    const colors = whiteFirst
      ? { [p1]: "w", [p2]: "b" }
      : { [p1]: "b", [p2]: "w" };
    return {
      players: [p1, p2],
      colors,
      board,
      turn: "w",
      status: "active",
      createdAt: serverTimestamp(),
      captured: { w: [], b: [] },
      lastMove: null,
      inCheck: { w: false, b: false },
    };
  });
}

function chessListen(gameId) {
  if (chessUnsub) {
    chessUnsub();
    chessUnsub = null;
  }
  const gref = ref(rtdb, `chessGames/${gameId}`);
  const cb = (snap) => {
    const g = snap.val();
    if (!g) {
      cEnterLobby();
      chessGameId = null;
      return;
    }
    window.__chessState = g;
    console.log("Current board state:", g.board); // Debug log

    const me = currentPlayerName;
    myChessColor = g.colors?.[me] || null;

    let status = `You are ${myChessColor === "w" ? "White" : "Black"} vs ${
      g.players.find((x) => x !== me) || "Opponent"
    }.`;
    if (g.status === "active" && g.inCheck && g.inCheck[g.turn])
      status += ` ${g.turn.toUpperCase()} is in check!`;
    else if (g.status === "finished") status = "Game Over.";
    else if (g.status === "aborted") status = "Game aborted.";
    cSet(chessStatus, status);

    const board = g.board || [];
    drawBoard(board);

    cSet(chessTurnEl, `Turn: ${g.turn === "w" ? "White" : "Black"}`);
    const capText = (arr) => (arr || []).map((x) => PIECE[x] || "").join(" ");
    cSet(
      chessCapturedEl,
      `Captured — W: ${capText(g.captured?.w)} | B: ${capText(g.captured?.b)}`
    );

    const myTurn = g.turn === myChessColor && g.status === "active";
    chessBoardEl.style.pointerEvents = myTurn ? "auto" : "none";
  };
  onValue(gref, cb);
  chessUnsub = () => off(gref, "value", cb);
}

function chessJoin(gameId) {
  chessGameId = gameId;
  cEnterGame();
  chessListen(gameId);
  selectedIdx = null;
  legalDestinations = [];
}

/************ Invites ************/
function renderChessIncoming(listSnap) {
  if (!chessIncomingList) return;
  chessIncomingList.innerHTML = "";
  listSnap.forEach((child) => {
    const req = child.val();
    const id = child.key;
    if (req.status !== "pending") return;
    const li = document.createElement("li");
    li.innerHTML = `
      <span>Invite from <strong>${req.from}</strong></span>
      <div>
        <button data-id="${id}" class="chessAccept">Accept</button>
        <button data-id="${id}" class="chessDecline">Decline</button>
      </div>
    `;
    chessIncomingList.appendChild(li);
  });
}

async function chessSendInvite(friendName) {
  const qSnap = await getDocs(
    fsQuery(collection(db, "users"), where("fullName", "==", friendName))
  );
  if (qSnap.empty) {
    cSet(chessInviteStatus, "No user with that name.");
    return;
  }

  const reqRef = push(ref(rtdb, "chessRequests"));
  const gameId = reqRef.key;
  await set(reqRef, {
    id: gameId,
    from: currentPlayerName,
    to: friendName,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  cSet(chessInviteStatus, `Invite sent to ${friendName}!`);
  if (chessFriendInput) chessFriendInput.value = "";

  // watch own request status
  const cb = async (s) => {
    const d = s.val();
    if (!d) return;
    if (d.status === "accepted") {
      await chessCreateGameIfMissing(gameId, d.from, d.to);
      chessJoin(gameId);
      off(reqRef, "value", cb);
    } else if (d.status === "declined") {
      cSet(chessInviteStatus, "Your invite was declined.");
      off(reqRef, "value", cb);
    }
  };
  onValue(reqRef, cb);
}

async function chessAccept(id) {
  const rr = ref(rtdb, `chessRequests/${id}`);
  const s = await get(rr);
  if (!s.exists()) return;
  const req = s.val();
  await update(rr, { status: "accepted", acceptedAt: serverTimestamp() });
  await chessCreateGameIfMissing(id, req.from, req.to);
  chessJoin(id);
}
async function chessDecline(id) {
  const rr = ref(rtdb, `chessRequests/${id}`);
  await update(rr, { status: "declined" });
  cSet(chessInviteStatus, "Invite declined.");
}

async function chessExit() {
  if (chessGameId) {
    await update(ref(rtdb, `chessGames/${chessGameId}`), {
      status: "aborted",
      abortedAt: serverTimestamp(),
    });
    chessGameId = null;
  }
  if (chessUnsub) {
    chessUnsub();
    chessUnsub = null;
  }
  cEnterLobby();
}

/************ Global incoming listener ************/
if (currentPlayerName) {
  const myChessIncoming = rtdbQuery(
    ref(rtdb, "chessRequests"),
    orderByChild("to"),
    equalTo(currentPlayerName)
  );
  onValue(myChessIncoming, (snap) => renderChessIncoming(snap));
}

/************ UI Events ************/
chessInviteBtn?.addEventListener("click", () => {
  const friend = (chessFriendInput?.value || "").trim();
  if (!friend) return cSet(chessInviteStatus, "Enter a friend's full name.");
  if (!currentPlayerName)
    return cSet(chessInviteStatus, "Your profile name is missing.");
  if (friend === currentPlayerName)
    return cSet(chessInviteStatus, "You can’t invite yourself 😄");
  chessSendInvite(friend).catch(() =>
    cSet(chessInviteStatus, "Failed to send invite.")
  );
});

chessIncomingList?.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  const id = t.dataset.id;
  if (!id) return;
  if (t.classList.contains("chessAccept")) chessAccept(id).catch(console.error);
  if (t.classList.contains("chessDecline"))
    chessDecline(id).catch(console.error);
});

chessExitBtn?.addEventListener("click", () => chessExit().catch(console.error));
chessFlipBtn?.addEventListener("click", () => {
  chessFlip = !chessFlip;
  const g = window.__chessState;
  if (g?.board) drawBoard(g.board);
});

// default state
cEnterLobby();
