import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db, CONFIG } from "../config.js";

const submitBtn = document.querySelector(".submitBtn");
const amntInp = document.querySelector(".amntInp");
const btnText = submitBtn.querySelector(".btnText");
const spinner = submitBtn.querySelector(".spinner");
const withdrawList = document.querySelector(".withdraws");
const balanceDisplay = document.querySelector(".balance");

const characters = "ABCDEFGHIJKLMNOPQRSTUVXYZ1234567890";
let TELEGRAM = localStorage.getItem("telegram") || "";

function idGenerator(length) {
  return Array.from({ length }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length))
  ).join("");
}

async function getUserByTelegram() {
  const q = query(collection(db, "users"), where("telegram", "==", TELEGRAM));
  const snapshot = await getDocs(q);
  if (snapshot.empty) throw new Error("User not found");
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}

async function getWithdrawsByUserId(userId) {
  const q = query(collection(db, "withdraws"), where("by", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function renderWithdraws(withdraws) {
  withdrawList.innerHTML = "";
  if (!withdraws.length) {
    withdrawList.innerHTML = '<li class="no-withdraws">No withdraw history</li>';
    return;
  }

  withdraws.forEach(w => {
    const li = document.createElement("li");
    li.className = "withdraw";
    li.innerHTML = `
      <div class="wContainer">
        <span class="wStatus">${w.status}</span>
        <span class="wDate">${w.date}</span>
      </div>
      <span class="wAmount">Amount: ${w.amount} Eshim</span>
    `;

    if (w.status !== "pending") {
      li.style.cursor = "pointer";
      li.onclick = () => removeWithdraw(w.id);
    }

    Object.assign(li.style, {
      padding: "10px",
      marginBottom: "10px",
      borderRadius: "10px",
      display: "flex",
      justifyContent: "center",
      alignItems: "start",
      color: "#fff",
      fontWeight: "bold"
    });

    withdrawList.appendChild(li);
  });
}

async function removeWithdraw(docId) {
  await deleteDoc(doc(db, "withdraws", docId));
  updateWithdraws();
}

async function getBalance() {
  try {
    const user = await getUserByTelegram();
    balanceDisplay.textContent = "Your Balance: " + user.eBalance;
  } catch {
    balanceDisplay.textContent += "0";
  }
}

document.querySelector(".form").addEventListener("submit", async function (e) {
  e.preventDefault();
  submitBtn.disabled = true;
  btnText.textContent = "Processing...";
  spinner.style.display = "inline-block";
  submitBtn.style.background = "none";

  try {
    const amount = parseFloat(amntInp.value);
    if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");

    const user = await getUserByTelegram();
    if (amount > user.eBalance) throw new Error("Insufficient balance");

    const withdraws = await getWithdrawsByUserId(user.accID);
    if (withdraws.filter(w => w.status === "pending").length >= 3)
      throw new Error("Max 3 pending withdraws");

    const withdrawal = {
      wId: idGenerator(7),
      amount,
      by: user.accID,
      date: new Date().toLocaleString(),
      status: "pending"
    };

    await addDoc(collection(db, "withdraws"), withdrawal);

    await updateDoc(doc(db, "users", user.id), {
      eBalance: user.eBalance - amount
    });

    await fetch(`https://api.telegram.org/bot${CONFIG.ADMIN_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CONFIG.ADMIN_CHAT_ID,
        parse_mode: "HTML",
        text: `<b>New Withdraw Request</b>\n<b>User:</b> ${user.name}\n<b>Date:</b> ${new Date().toLocaleDateString()}\n<b>Amount:</b> ${amount}`
      })
    });

    amntInp.value = "";
    await updateWithdraws();
    await getBalance();
  } catch (err) {
    console.error("Withdraw failed:", err.message);
  } finally {
    resetButton();
  }
});

function resetButton() {
  btnText.textContent = "Submit";
  spinner.style.display = "none";
  submitBtn.disabled = false;
  submitBtn.style.background = "lightgreen";
}

async function updateWithdraws() {
  try {
    const user = await getUserByTelegram();
    const withdraws = await getWithdrawsByUserId(user.accID);
    localStorage.setItem("myWithdraws", JSON.stringify(withdraws));
    renderWithdraws(withdraws);
  } catch (err) {
    console.error("Update withdraws failed:", err);
  }
}

(async () => {
  await getBalance();
  await updateWithdraws();
  setInterval(updateWithdraws, 10000);
})();
