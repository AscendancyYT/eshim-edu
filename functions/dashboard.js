// ===== Firebase v10 modular imports (imports must be first in modules) =====
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
  remove,
  update,
  get,
  query as dbQuery,
  orderByChild,
  equalTo,
  serverTimestamp,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ===== Auth gate AFTER imports (to avoid syntax error in modules) =====
if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "./index.html";
}

// ===== Firebase config (fixed storageBucket & databaseURL) =====
const firebaseConfig = {
  apiKey: "AIzaSyABomqBTkkti8Wzxu2H0UKX1s-UZBoFN0c",
  authDomain: "eshim-edu-eclipse.firebaseapp.com",
  projectId: "eshim-edu-eclipse",
  storageBucket: "eshim-edu-eclipse.appspot.com", // ✅ fixed
  messagingSenderId: "499244396754",
  appId: "1:499244396754:web:b8add55832b41b1ee5bd0b",
  measurementId: "G-RKW9CEM3NQ",
  databaseURL: "https://eshim-edu-eclipse-default-rtdb.firebaseio.com", // ✅ fixed (no trailing slash)
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// ===== Tiny DOM helpers =====
const $ = (sel) => document.querySelector(sel);
const setText = (el, t) => { if (el) el.textContent = String(t); };
const show = (el) => el && el.classList.remove("hidden");
const hide = (el) => el && el.classList.add("hidden");

// ===== Cached elements (non-chess only) =====
const userEmailEl = $("#userEmail");
const userPhotoEl = $("#userPhoto");
const userProfilePicEl = $(".userProfilePic");

const gradesSection = $(".section.grades");
const eshimpaySection = $(".section.eshimpay");
const entertainmentSection = $(".section.entertainment");

const balanceIdEl = $("#balanceId");
const balanceEl = $("#balance");

// Guess game
const guessInput = $("#guessInput");
const guessButton = $("#guessButton");
const gameHint = $("#gameHint");
const attemptsEl = $("#attempts");
const resetGameButton = $("#resetGameButton");

// Math duel (turn-based)
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

// UI / modal
const modal = $("#gradeModal");
const modalSubject = $("#modalSubject");
const modalReward = $("#modalReward");
const modalCreatedAt = $("#modalCreatedAt");
const closeBtn = $(".close");
const sidebar = $(".sidebar");
const content = $(".content");
const sidebarBtn = $(".sidebarButton");

// Blitz (kept)
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

// ===== Utilities =====
function formatTimestamp(v) {
  if (!v) return "N/A";
  if (typeof v.toDate === "function") {
    return v.toDate().toLocaleString("en-US", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
  }
  if (typeof v === "number") {
    return new Date(v).toLocaleString("en-US", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
  }
  return "N/A";
}

// ===== Firestore: user profile & grades rendering =====
async function getUserByFullName(fullName) {
  const q = fsQuery(collection(db, "users"), where("fullName", "==", fullName));
  const qs = await getDocs(q);

  if (qs.empty) return;

  qs.forEach((docSnap) => {
    const u = docSnap.data();

    if (userEmailEl) setText(userEmailEl, u.email || "—");
    if (userPhotoEl && u.photoURL) userPhotoEl.src = u.photoURL;
    if (balanceIdEl) setText(balanceIdEl, `Balance ID: ${u.balanceId || "N/A"}`);
    if (balanceEl) setText(balanceEl, `Balance: ${u.balance ?? 0}`);

    // Render grades as coins for students
    if (u.role === "student" && Array.isArray(u.grades)) {
      const list = $(".coins");
      if (!list) return;
      list.innerHTML = "";
      u.grades.forEach((g) => {
        const li = document.createElement("li");
        li.className = "coin";
        li.textContent = g.reward;
        const r = Math.round(255 * (1 - Number(g.reward || 0)));
        const gcol = Math.round(255 * Number(g.reward || 0));
        li.style.backgroundColor = `rgb(${r}, ${gcol}, 0)`;
        li.addEventListener("click", () => {
          setText(modalSubject, `Subject: ${g.subject || "N/A"}`);
          setText(modalReward, `Reward: ${g.reward}`);
          setText(modalCreatedAt, `Created At: ${formatTimestamp(g.createdAt)}`);
          modal.style.display = "block";
          requestAnimationFrame(() => modal.classList.add("show"));
        });
        list.appendChild(li);
      });
    }
  });
}

// ===== Guess the number =====
let targetNumber = Math.floor(Math.random() * 100) + 1;
let attempts = 0;

function resetGuessGame() {
  targetNumber = Math.floor(Math.random() * 100) + 1;
  attempts = 0;
  if (guessInput) guessInput.value = "";
  setText(gameHint, "Start guessing!");
  setText(attemptsEl, `Attempts: ${attempts}`);
  guessButton?.classList.remove("hidden");
  resetGameButton?.classList.add("hidden");
  if (guessInput) guessInput.disabled = false;
}

guessButton?.addEventListener("click", () => {
  const val = parseInt(guessInput?.value ?? "", 10);
  if (isNaN(val) || val < 1 || val > 100) {
    setText(gameHint, "Please enter a number between 1 and 100.");
    return;
  }
  setText(attemptsEl, `Attempts: ${++attempts}`);
  if (val === targetNumber) {
    setText(gameHint, `Congratulations! You guessed it in ${attempts} attempts!`);
    guessButton.classList.add("hidden");
    resetGameButton?.classList.remove("hidden");
    if (guessInput) guessInput.disabled = true;
  } else if (val < targetNumber) {
    setText(gameHint, "Too low! Try a higher number.");
  } else {
    setText(gameHint, "Too high! Try a lower number.");
  }
});
resetGameButton?.addEventListener("click", resetGuessGame);

// ===== Math Duel (turn-based) =====
const WIN_SCORE = 5;
const TURN_SECONDS = 10;
let currentGameId = null;
const currentPlayerName = localStorage.getItem("fullName") || "";
let gameUnsubscribe = null;
let requestUnsubscribe = null;
let timerInterval = null;

function generateProblem() {
  const ops = ["+", "-", "*"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const ans = op === "+" ? a + b : op === "-" ? a - b : a * b;
  return { num1: a, num2: b, operation: op, answer: ans, problemText: `${a} ${op} ${b} = ?` };
}

function enterLobby() {
  show(requestSection);
  hide(gameSection);
  setText(duelStatus, "Waiting for opponent's turn...");
  setText(duelProblem, "Waiting for game to start...");
  setText(duelScores, "You: 0 | Opponent: 0");
  if (duelInput) { duelInput.value = ""; duelInput.disabled = true; }
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

function updateCountdown(turnStartMs) {
  clearTimer();
  const tick = () => {
    const now = Date.now();
    const left = Math.max(0, TURN_SECONDS - Math.floor((now - turnStartMs) / 1000));
    setText(duelTimer, `Time Left: ${left}s`);
    if (left <= 0) clearTimer();
  };
  timerInterval = setInterval(tick, 1000);
  tick();
}

async function advanceTurnTx(gameId, { correct }) {
  const gref = ref(rtdb, `games/${gameId}`);
  await runTransaction(gref, (g) => {
    if (!g || g.status !== "active") return g;
    const me = currentPlayerName;
    if (g.currentPlayer !== me) return g;

    const other = g.players[0] === me ? g.players[1] : g.players[0];

    if (correct) {
      const myScore = g.scores?.[me] ?? 0;
      g.scores = { ...g.scores, [me]: myScore + 1 };
    }

    const myScoreAfter = g.scores?.[me] ?? 0;
    if (myScoreAfter >= WIN_SCORE) {
      return { ...g, status: "finished", finishedAt: serverTimestamp() };
    }

    g.currentPlayer = other;
    g.currentProblem = generateProblem();
    g.currentTurnStart = Date.now();
    return g;
  });
}

function listenToGame(gameId) {
  if (gameUnsubscribe) { gameUnsubscribe(); gameUnsubscribe = null; }

  const gref = ref(rtdb, `games/${gameId}`);
  const handler = (snap) => {
    const g = snap.val();
    if (!g) {
      enterLobby();
      currentGameId = null;
      return;
    }
    const me = currentPlayerName;
    const opp = g.players.find((p) => p !== me) || "Opponent";
    const myScore = g.scores?.[me] ?? 0;
    const oppScore = g.scores?.[opp] ?? 0;
    setText(duelScores, `You: ${myScore} | Opponent: ${oppScore}`);
    setText(duelProblem, g.currentProblem?.problemText ?? "Waiting...");

    const myTurn = g.currentPlayer === me;
    if (duelInput) duelInput.disabled = !myTurn;
    if (duelSubmitButton) {
      if (myTurn) duelSubmitButton.classList.remove("hidden");
      else duelSubmitButton.classList.add("hidden");
    }
    setText(duelStatus, myTurn ? "Your Turn: Solve the problem!" : "Waiting for opponent...");

    const start = Number(g.currentTurnStart) || Date.now();
    updateCountdown(start);

    if (g.status === "finished") {
      const winner = (g.scores?.[g.players[0]] ?? 0) >= WIN_SCORE ? g.players[0] : g.players[1];
      setText(duelStatus, `Game Over! ${winner} Wins!`);
      if (duelInput) duelInput.disabled = true;
      duelSubmitButton?.classList.add("hidden");
      clearTimer();
    }
  };

  gameUnsubscribe = onValue(gref, handler);
}

async function createGameIfMissing(gameId, p1, p2) {
  const gref = ref(rtdb, `games/${gameId}`);
  await runTransaction(gref, (g) => {
    if (g) return g;
    return {
      players: [p1, p2],
      currentPlayer: p1,
      scores: { [p1]: 0, [p2]: 0 },
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

async function sendGameRequest(friendFullName) {
  const q = fsQuery(collection(db, "users"), where("fullName", "==", friendFullName));
  const qs = await getDocs(q);
  if (qs.empty) {
    setText(requestStatus, "No user found with that name.");
    return;
  }

  const reqRef = push(ref(rtdb, "gameRequests"));
  const id = reqRef.key;

  await set(reqRef, {
    id,
    from: currentPlayerName,
    to: friendFullName,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  setText(requestStatus, `Request sent to ${friendFullName}!`);
  if (friendNameInput) friendNameInput.value = "";

  if (requestUnsubscribe) { requestUnsubscribe(); requestUnsubscribe = null; }

  const handler = async (snap) => {
    const req = snap.val();
    if (!req) return;
    if (req.status === "accepted") {
      await createGameIfMissing(id, req.from, req.to);
      joinGame(id);
      if (requestUnsubscribe) { requestUnsubscribe(); requestUnsubscribe = null; }
    } else if (req.status === "declined") {
      setText(requestStatus, "Your request was declined.");
      if (requestUnsubscribe) { requestUnsubscribe(); requestUnsubscribe = null; }
    }
  };

  requestUnsubscribe = onValue(reqRef, handler);
}

function renderIncomingRequests(snap) {
  if (!requestList) return;
  requestList.innerHTML = "";
  snap.forEach((child) => {
    const req = child.val();
    const key = child.key;
    if (req.status !== "pending") return;
    const li = document.createElement("li");
    li.innerHTML = `
      <span>Request from ${req.from}</span>
      <div>
        <button data-id="${key}" class="acceptRequest">Accept</button>
        <button data-id="${key}" class="declineRequest">Decline</button>
      </div>`;
    requestList.appendChild(li);
  });
}

async function acceptRequest(id) {
  const rref = ref(rtdb, `gameRequests/${id}`);
  const s = await get(rref);
  if (!s.exists()) return;
  const req = s.val();
  await update(rref, { status: "accepted", acceptedAt: serverTimestamp() });
  await createGameIfMissing(id, req.from, req.to);
  joinGame(id);
}

async function declineRequest(id) {
  const rref = ref(rtdb, `gameRequests/${id}`);
  await update(rref, { status: "declined" });
  setText(requestStatus, "Request declined.");
}

async function submitAnswer() {
  if (!currentGameId) return;
  const val = parseInt(duelInput?.value ?? "", 10);
  if (isNaN(val)) {
    setText(duelStatus, "Please enter a valid number!");
    return;
  }
  const gref = ref(rtdb, `games/${currentGameId}`);
  const s = await get(gref);
  if (!s.exists()) return;
  const g = s.val();
  if (g.currentPlayer !== currentPlayerName || g.status !== "active") return;
  const correct = val === Number(g.currentProblem?.answer);
  await advanceTurnTx(currentGameId, { correct });
  if (duelInput) duelInput.value = "";
}

async function exitGame() {
  clearTimer();
  if (currentGameId) {
    await update(ref(rtdb, `games/${currentGameId}`), { status: "aborted", abortedAt: serverTimestamp() });
    currentGameId = null;
  }
  if (gameUnsubscribe) { gameUnsubscribe(); gameUnsubscribe = null; }
  enterLobby();
}

// Incoming duel requests listener
if (currentPlayerName) {
  const incQ = dbQuery(ref(rtdb, "gameRequests"), orderByChild("to"), equalTo(currentPlayerName));
  onValue(incQ, (snap) => renderIncomingRequests(snap));
}

// Duel UI wiring
sendRequestButton?.addEventListener("click", () => {
  const friend = (friendNameInput?.value || "").trim();
  if (!friend) return setText(requestStatus, "Please enter a friend's full name.");
  if (!currentPlayerName) return setText(requestStatus, "Your profile name is missing.");
  if (friend === currentPlayerName) return setText(requestStatus, "You cannot invite yourself!");
  sendGameRequest(friend).catch(() => setText(requestStatus, "Failed to send request. Try again."));
});
requestList?.addEventListener("click", (ev) => {
  const target = ev.target;
  if (!(target instanceof HTMLElement)) return;
  const id = target.dataset.id;
  if (!id) return;
  if (target.classList.contains("acceptRequest")) acceptRequest(id).catch(console.error);
  if (target.classList.contains("declineRequest")) declineRequest(id).catch(console.error);
});
duelSubmitButton?.addEventListener("click", () => submitAnswer().catch(console.error));
duelExitButton?.addEventListener("click", () => exitGame().catch(console.error));

// ===== Sidebar / modal UI =====
const sidebarLinks = document.querySelectorAll(".sidebar .center .link, .sidebar .bottom");
sidebarLinks.forEach((el) => {
  el.addEventListener("click", (ev) => {
    ev.preventDefault();
    const section = el.getAttribute("data-section");
    if (!section) return;

    const map = {
      grades: gradesSection,
      eshimpay: eshimpaySection,
      entertainment: entertainmentSection,
    };

    [gradesSection, eshimpaySection, entertainmentSection].forEach((sec) => {
      if (!sec) return;
      if (sec === map[section]) {
        sec.classList.remove("hidden"); sec.classList.add("active");
      } else {
        sec.classList.add("hidden"); sec.classList.remove("active");
      }
    });

    if (section === "entertainment") friendNameInput?.focus();
  });
});

closeBtn?.addEventListener("click", () => {
  modal?.classList.remove("show");
  setTimeout(() => { if (modal) modal.style.display = "none"; }, 300);
});
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal?.classList.remove("show");
    setTimeout(() => { if (modal) modal.style.display = "none"; }, 300);
  }
});
sidebarBtn?.addEventListener("click", () => {
  sidebar?.classList.toggle("collapsed");
  content?.classList.toggle("expanded");
  setTimeout(() => window.dispatchEvent(new Event("resize")), 400);
});

// Initial section + profile avatar
(function bootstrap() {
  gradesSection?.classList.remove("hidden");
  gradesSection?.classList.add("active");

  const fullName = localStorage.getItem("fullName") || "";
  if (fullName) getUserByFullName(fullName).catch(console.error);

  if (userProfilePicEl) {
    const initial = (fullName || "U").trim()[0] || "U";
    userProfilePicEl.innerHTML = initial.toUpperCase();
  }

  enterLobby(); // default view for duel
})();

// ===== Blitz (kept) =====
const BLITZ_WIN_SCORE = 10;
const BLITZ_PROBLEM_INTERVAL_MS = 8000;
const BLITZ_ANSWER_WINDOW_MS = 8000;
let blitzGameId = null;
let blitzUnsub = null;
let blitzReqUnsub = null;
let blitzTimerInterval = null;
let blitzHeartbeatId = null;
let blitzFeedUnsub = null;
let myBlitzStreak = 0;

function blitzShow(el) { if (el) el.classList.remove("hidden"); }
function blitzHide(el) { if (el) el.classList.add("hidden"); }
function blitzSet(el, t) { if (el) el.textContent = String(t); }

function blitzGenerateProblem() {
  const ops = ["+", "-", "*"];
  const a = Math.floor(Math.random() * 30) + 1;
  const b = Math.floor(Math.random() * 30) + 1;
  const op = ops[Math.floor(Math.random() * ops.length)];
  const ans = op === "+" ? a + b : op === "*" ? a * b : a - b;
  return {
    id: crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    a, b, op, ans, text: `${a} ${op} ${b} = ?`,
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
  if (blitzAnswer) { blitzAnswer.value = ""; blitzAnswer.disabled = true; }
  blitzSubmitBtn?.classList.add("hidden");
  if (blitzFeed) blitzFeed.innerHTML = "";
}

function blitzEnterGame() {
  blitzHide(blitzLobby);
  blitzShow(blitzGame);
}

function blitzClearIntervals() {
  if (blitzTimerInterval) { clearInterval(blitzTimerInterval); blitzTimerInterval = null; }
  if (blitzHeartbeatId) { clearInterval(blitzHeartbeatId); blitzHeartbeatId = null; }
}

function blitzStartNextProblemTx(gameId) {
  const bref = ref(rtdb, `blitzGames/${gameId}`);
  return runTransaction(bref, (g) => {
    if (!g || g.status !== "active") return g;
    const now = Date.now();
    const started = g.current?.startedAt ?? 0;
    const alreadyAnswered = !!g.current?.answeredBy;
    const shouldAdvance = !g.current || alreadyAnswered || now - started > BLITZ_ANSWER_WINDOW_MS;
    if (!shouldAdvance) return g;

    const np = blitzGenerateProblem();
    g.current = { id: np.id, text: np.text, ans: np.ans, startedAt: now, answeredBy: null };
    g.nextAt = now + BLITZ_PROBLEM_INTERVAL_MS;
    return g;
  });
}

async function blitzCreateGameIfMissing(gameId, p1, p2) {
  const bref = ref(rtdb, `blitzGames/${gameId}`);
  await runTransaction(bref, (g) => {
    if (g) return g;
    const np = blitzGenerateProblem();
    return {
      players: [p1, p2],
      scores: { [p1]: 0, [p2]: 0 },
      streaks: { [p1]: 0, [p2]: 0 },
      status: "active",
      createdAt: serverTimestamp(),
      current: { id: np.id, text: np.text, ans: np.ans, startedAt: Date.now(), answeredBy: null },
      nextAt: Date.now() + BLITZ_PROBLEM_INTERVAL_MS,
      lastFeed: "",
    };
  });
}

function blitzListenFeed(gameId) {
  if (blitzFeedUnsub) { blitzFeedUnsub(); blitzFeedUnsub = null; }
  const fref = ref(rtdb, `blitzGames/${gameId}/lastFeed`);
  const handler = (snap) => {
    const msg = snap.val();
    if (!msg || !blitzFeed) return;
    const p = document.createElement("p");
    p.textContent = msg;
    p.className = "feed-item";
    blitzFeed.prepend(p);
    p.animate([{ transform: "scale(0.9)" }, { transform: "scale(1)" }], { duration: 150, iterations: 1 });
  };
  blitzFeedUnsub = onValue(fref, handler);
}

function blitzJoinGame(gameId) {
  blitzGameId = gameId;
  blitzEnterGame();
  blitzListen(gameId);
  blitzListenFeed(gameId);
  if (blitzHeartbeatId) clearInterval(blitzHeartbeatId);
  blitzHeartbeatId = setInterval(() => {
    if (blitzGameId) blitzStartNextProblemTx(blitzGameId).catch(console.error);
  }, 2000);
}

function blitzListen(gameId) {
  if (blitzUnsub) { blitzUnsub(); blitzUnsub = null; }

  const bref = ref(rtdb, `blitzGames/${gameId}`);
  const handler = (snap) => {
    const g = snap.val();
    if (!g) {
      blitzEnterLobby();
      blitzGameId = null;
      return;
    }
    const me = currentPlayerName;
    const opp = (g.players || []).find((p) => p !== me) || "Opponent";
    const myScore = g.scores?.[me] ?? 0;
    const oppScore = g.scores?.[opp] ?? 0;

    blitzSet(blitzScore, `You: ${myScore} | Opponent: ${oppScore}`);
    blitzSet(blitzStreak, `🔥 Streak: ${(myBlitzStreak = g.streaks?.[me] ?? 0)}`);

    if (g.current) {
      blitzSet(blitzProblem, g.current.text || "—");
      const answerable = g.status === "active" && !g.current.answeredBy;
      if (blitzAnswer) blitzAnswer.disabled = !answerable;
      if (blitzSubmitBtn) {
        if (answerable) blitzSubmitBtn.classList.remove("hidden");
        else blitzSubmitBtn.classList.add("hidden");
      }
      blitzClearIntervals();
      const nextAt = Number(g.nextAt) || Date.now();
      const tick = () => {
        const secs = Math.max(0, Math.ceil((nextAt - Date.now()) / 1000));
        blitzSet(blitzTimer, `Next problem in: ${secs}s`);
      };
      blitzTimerInterval = setInterval(tick, 500);
      tick();
      if (!blitzHeartbeatId) {
        blitzHeartbeatId = setInterval(() => {
          if (blitzGameId) blitzStartNextProblemTx(blitzGameId).catch(console.error);
        }, 2000);
      }
    } else {
      blitzSet(blitzProblem, "—");
      blitzSet(blitzTimer, "Next problem in: —");
      if (blitzAnswer) blitzAnswer.disabled = true;
      blitzSubmitBtn?.classList.add("hidden");
    }

    if (g.status === "finished") {
      const [p0, p1] = g.players || [];
      const winner =
        (g.scores?.[p0] || 0) >= BLITZ_WIN_SCORE ? p0 :
        (g.scores?.[p1] || 0) >= BLITZ_WIN_SCORE ? p1 :
        ((g.scores?.[p0] || 0) > (g.scores?.[p1] || 0) ? p0 : p1);
      blitzSet(blitzStatus, `Game Over! ${winner === me ? "You" : winner} Win(s)!`);
      if (blitzAnswer) blitzAnswer.disabled = true;
      blitzSubmitBtn?.classList.add("hidden");
      blitzClearIntervals();
    } else {
      blitzSet(blitzStatus, "Answer fast! First correct gets the point.");
    }
  };

  blitzUnsub = onValue(bref, handler);
}

async function blitzSubmit() {
  if (!blitzGameId) return;
  const val = parseInt(blitzAnswer?.value ?? "", 10);
  if (Number.isNaN(val)) {
    blitzSet(blitzStatus, "Enter a number, math wizard 🧙‍♂️");
    return;
  }
  if (blitzAnswer) blitzAnswer.disabled = true;

  const bref = ref(rtdb, `blitzGames/${blitzGameId}`);
  await runTransaction(bref, (g) => {
    if (!g || g.status !== "active" || !g.current || g.current.answeredBy) return g;
    const elapsed = Date.now() - (g.current.startedAt || 0);
    if (elapsed > BLITZ_ANSWER_WINDOW_MS) return g;

    const correct = val === Number(g.current.ans);
    const me = currentPlayerName;
    const opp = (g.players || []).find((p) => p !== me);

    if (!correct) {
      g.lastFeed = `${me} missed. Keep trying!`;
      return g;
    }

    const myScore = g.scores?.[me] ?? 0;
    const myStreak = (g.streaks?.[me] ?? 0) + 1;

    g.scores = { ...g.scores, [me]: myScore + 1 };
    g.streaks = { ...g.streaks, [me]: myStreak, [opp]: 0 };
    g.current.answeredBy = me;
    g.lastFeed = `${me} answered correctly! (+1) 🔥x${myStreak}`;

    if (g.scores[me] >= BLITZ_WIN_SCORE) {
      g.status = "finished";
      g.finishedAt = serverTimestamp();
      return g;
    }

    const np = blitzGenerateProblem();
    const now = Date.now();
    g.current = { id: np.id, text: np.text, ans: np.ans, startedAt: now, answeredBy: null };
    g.nextAt = now + BLITZ_PROBLEM_INTERVAL_MS;
    return g;
  });

  if (blitzAnswer) blitzAnswer.value = "";
}

async function blitzExit() {
  blitzClearIntervals();
  if (blitzGameId) {
    await update(ref(rtdb, `blitzGames/${blitzGameId}`), { status: "aborted", abortedAt: serverTimestamp() });
    blitzGameId = null;
  }
  if (blitzUnsub) { blitzUnsub(); blitzUnsub = null; }
  if (blitzReqUnsub) { blitzReqUnsub(); blitzReqUnsub = null; }
  if (blitzFeedUnsub) { blitzFeedUnsub(); blitzFeedUnsub = null; }
  blitzEnterLobby();
}

function renderBlitzIncoming(snap) {
  if (!blitzIncomingList) return;
  blitzIncomingList.innerHTML = "";
  snap.forEach((child) => {
    const req = child.val();
    const key = child.key;
    if (req.status !== "pending") return;
    const li = document.createElement("li");
    li.innerHTML = `
      <span>Blitz invite from <strong>${req.from}</strong></span>
      <div>
        <button data-id="${key}" class="blitzAccept">Accept</button>
        <button data-id="${key}" class="blitzDecline">Decline</button>
      </div>`;
    blitzIncomingList.appendChild(li);
  });
}

async function blitzSendInvite(friend) {
  const qs = await getDocs(fsQuery(collection(db, "users"), where("fullName", "==", friend)));
  if (qs.empty) {
    blitzSet(blitzInviteStatus, "No user with that name.");
    return;
  }
  const reqRef = push(ref(rtdb, "blitzRequests"));
  const id = reqRef.key;

  await set(reqRef, {
    id,
    from: currentPlayerName,
    to: friend,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  blitzSet(blitzInviteStatus, `Invite sent to ${friend}!`);
  if (blitzFriendInput) blitzFriendInput.value = "";

  if (blitzReqUnsub) { blitzReqUnsub(); blitzReqUnsub = null; }

  const handler = async (snap) => {
    const req = snap.val();
    if (!req) return;
    if (req.status === "accepted") {
      await blitzCreateGameIfMissing(id, req.from, req.to);
      blitzJoinGame(id);
      if (blitzReqUnsub) { blitzReqUnsub(); blitzReqUnsub = null; }
    } else if (req.status === "declined") {
      blitzSet(blitzInviteStatus, "Your invite was declined.");
      if (blitzReqUnsub) { blitzReqUnsub(); blitzReqUnsub = null; }
    }
  };

  blitzReqUnsub = onValue(reqRef, handler);
}

async function blitzAccept(id) {
  const rref = ref(rtdb, `blitzRequests/${id}`);
  const snap = await get(rref);
  if (!snap.exists()) return;
  const req = snap.val();
  await update(rref, { status: "accepted", acceptedAt: serverTimestamp() });
  await blitzCreateGameIfMissing(id, req.from, req.to);
  blitzJoinGame(id);
}

async function blitzDecline(id) {
  await update(ref(rtdb, `blitzRequests/${id}`), { status: "declined" });
  blitzSet(blitzInviteStatus, "Invite declined.");
}

if (currentPlayerName) {
  const incQ = dbQuery(ref(rtdb, "blitzRequests"), orderByChild("to"), equalTo(currentPlayerName));
  onValue(incQ, (snap) => renderBlitzIncoming(snap));
}

blitzInviteBtn?.addEventListener("click", () => {
  const friend = (blitzFriendInput?.value || "").trim();
  if (!friend) return blitzSet(blitzInviteStatus, "Enter a friend's full name.");
  if (!currentPlayerName) return blitzSet(blitzInviteStatus, "Your profile name is missing.");
  if (friend === currentPlayerName) return blitzSet(blitzInviteStatus, "Bro… you can’t invite yourself 😄");
  blitzSendInvite(friend).catch(() => blitzSet(blitzInviteStatus, "Failed to send invite."));
});
blitzIncomingList?.addEventListener("click", (ev) => {
  const t = ev.target;
  if (!(t instanceof HTMLElement)) return;
  const id = t.dataset.id;
  if (!id) return;
  if (t.classList.contains("blitzAccept")) blitzAccept(id).catch(console.error);
  if (t.classList.contains("blitzDecline")) blitzDecline(id).catch(console.error);
});
blitzSubmitBtn?.addEventListener("click", () => blitzSubmit().catch(console.error));
blitzAnswer?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); blitzSubmit().catch(console.error); }
});
blitzExitBtn?.addEventListener("click", () => blitzExit().catch(console.error));