import {
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = window.db;
const resultBox = document.getElementById("result");

async function scanAndApply() {
  const params = new URLSearchParams(window.location.search);
  const wIdParam = params.get("id");
  const telegram = localStorage.getItem("telegram");

  if (!wIdParam) {
    resultBox.classList.add("error");
    resultBox.textContent = "❌ Missing 'id' in URL.";
    return;
  }

  if (!telegram) {
    resultBox.classList.add("error");
    resultBox.textContent = "❌ No Telegram ID in localStorage.";
    return;
  }

  try {
    const userQuery = query(collection(db, "users"), where("telegram", "==", telegram));
    const userSnap = await getDocs(userQuery);
    if (userSnap.empty) throw new Error("User not found");

    const userDoc = userSnap.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };

    const withdrawQuery = query(collection(db, "withdraws"), where("wId", "==", wIdParam));
    const withdrawSnap = await getDocs(withdrawQuery);
    if (withdrawSnap.empty) {
      resultBox.classList.add("error");
      resultBox.textContent = `❌ Withdraw ID '${wIdParam}' not found.`;
      return;
    }

    const withdrawDoc = withdrawSnap.docs[0];
    const withdraw = { id: withdrawDoc.id, ...withdrawDoc.data() };

    if (withdraw.isUsed === "true") {
      resultBox.classList.add("error");
      resultBox.textContent = `⚠️ This code has already been used.`;
      return;
    }

    const updatedBalance = user.eBalance + Number(withdraw.amount);

    await updateDoc(doc(db, "users", user.id), {
      eBalance: updatedBalance
    });

    await updateDoc(doc(db, "withdraws", withdraw.id), {
      isUsed: "true"
    });

    resultBox.classList.add("success");
    resultBox.innerHTML = `
      ✅ <b>Balance Updated!</b><br/>
      You received <b>${Number(withdraw.amount).toLocaleString()} Eshims</b><br/>
      <b>New Balance:</b> ${updatedBalance.toLocaleString()}<br/>
      <b>Date:</b> ${withdraw.date}<br/>
      <b>wId:</b> ${withdraw.wId}
    `;
  } catch (err) {
    console.error(err);
    resultBox.classList.add("error");
    resultBox.textContent = "⚠️ Something went wrong during the scan.";
  }
}

scanAndApply();
