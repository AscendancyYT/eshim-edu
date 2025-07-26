import {
  getDocs,
  query,
  where,
  addDoc,
  collection,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = window.db;

const accIDInput = document.querySelector(".accIDInput");
const buyBtn = document.querySelector(".buyBtn");
const amount = document.querySelector(".amountInput");
const userTelegram = localStorage.getItem("telegram");
const xBtn = document.querySelector(".x-btn");
const successAlert = document.querySelector(".success-alert");
const priceAmount = document.querySelector(".priceAmount");
const historyList = document.querySelector(".history-list");

const BOT_TOKEN = "7213789475:AAEmE6PldmI0tfVkM1oZ--Ef4HcpvBewIk8";
const URI_API = `https://api.telegram.org/bot${BOT_TOKEN}/SendMessage`;
const CHAT_ID = "-4754251527";

function amountOnChange() {
  priceAmount.innerHTML = amount.value * 100;
}
window.amountOnChange = amountOnChange;

xBtn.onclick = () => {
  successAlert.style.display = "none";
};

async function fillID() {
  try {
    const userQuery = query(
      collection(db, "users"),
      where("telegram", "==", userTelegram)
    );
    const snapshot = await getDocs(userQuery);
    if (snapshot.empty) throw new Error("User not found");
    const user = snapshot.docs[0].data();
    accIDInput.value = user.accID;
    fetchPurchaseHistory(user.accID);
  } catch (err) {
    console.error("Error fetching user accID:", err);
  }
}

async function fetchPurchaseHistory(accID) {
  try {
    const purchaseQuery = query(
      collection(db, "purchaseReq"),
      where("accID", "==", accID)
    );
    const snapshot = await getDocs(purchaseQuery);
    const purchases = snapshot.docs.map((doc) => doc.data()).reverse();

    if (!purchases.length) {
      historyList.innerHTML = "<li>No purchases yet.</li>";
      return;
    }

    historyList.innerHTML = "";
    purchases.forEach((p) => {
      const li = document.createElement("li");
      li.classList.add(p.status.toLowerCase());
      li.innerHTML = `
        <b>Amount:</b> ${p.amount} Eshims<br/>
        <b>Price:</b> ${p.price.toLocaleString()} UZS<br/>
        <b>Status:</b> ${p.status}<br/>
        <b>Date:</b> ${new Date(p.createdAt).toLocaleString()}
      `;
      historyList.appendChild(li);
    });
  } catch (err) {
    console.error("Failed to fetch history:", err);
    historyList.innerHTML = "<li>Error loading history.</li>";
  }
}

buyBtn.onclick = async (e) => {
  e.preventDefault();
  try {
    const userQuery = query(
      collection(db, "users"),
      where("telegram", "==", userTelegram)
    );
    const snapshot = await getDocs(userQuery);
    if (snapshot.empty) throw new Error("User not found");
    const user = snapshot.docs[0].data();
    const accID = user.accID;
    const eshimAmount = parseInt(amount.value);
    const totalPrice = eshimAmount * 100;

    const purchase = {
      createdAt: new Date().toISOString(),
      accID,
      status: "waiting",
      amount: eshimAmount,
      price: totalPrice,
    };

    await addDoc(collection(db, "purchaseReq"), purchase);

    const message = `
<b>🗒 Purchase Request</b>\n
<b>Status:</b> waiting\n
<b>Account:</b> ${accID}\n
<b>Amount:</b> ${eshimAmount}\n
<b>Price:</b> ${totalPrice.toLocaleString()} UZS`;

    await fetch(URI_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parse_mode: "html",
        text: message,
        chat_id: CHAT_ID,
      }),
    });

    successAlert.style.display = "flex";
    amount.value = "";
    priceAmount.innerHTML = "";
    fetchPurchaseHistory(accID);
  } catch (err) {
    alert("Error submitting purchase: " + err.message);
  }
};

fillID();
