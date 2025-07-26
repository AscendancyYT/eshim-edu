import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyABomqBTkkti8Wzxu2H0UKX1s-UZBoFN0c",
  authDomain: "eshim-edu-eclipse.firebaseapp.com",
  projectId: "eshim-edu-eclipse",
  storageBucket: "eshim-edu-eclipse.firebasestorage.app",
  messagingSenderId: "499244396754",
  appId: "1:499244396754:web:b8add55832b41b1ee5bd0b",
  measurementId: "G-RKW9CEM3NQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.addEventListener("load", fetchUserByTelegram);

async function fetchUserByTelegram() {
  const telegramHandle = localStorage.getItem("telegram");

  if (!telegramHandle) {
    window.location.href = "../index.html";
    return;
  }

  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("telegram", "==", telegramHandle));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      alert("No user found with this Telegram handle.");
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const user = userDoc.data();

    document.getElementById("profile-name").childNodes[0].textContent =
      user.name || "Unnamed";
    document.getElementById("telegram").innerText = user.telegram;
    document.getElementById("accID").innerText = user.accID;
    document.getElementById("balance").innerText = user.eBalance;
    document.getElementById("status").innerText = user.status;
    document.getElementById("avatar").innerText =
      user.name?.charAt(0).toUpperCase() || "E";

    const badgeEl = document.getElementById("badge");
    if (user.badge) {
      badgeEl.textContent = `🏅 ${user.badge}`;
      badgeEl.style.display = "inline-block";

      const badgeType = user.badge.toLowerCase();
      if (badgeType === "vip") badgeEl.style.backgroundColor = "gold";
      else if (badgeType === "founder")
        badgeEl.style.backgroundColor = "#9b59b6";
      else if (badgeType === "mod") badgeEl.style.backgroundColor = "#3498db";
      else badgeEl.style.backgroundColor = "gray";
    } else {
      badgeEl.style.display = "none";
    }

    await fetchUserNFTs(user.telegram);
  } catch (error) {
    console.error("Failed to fetch user from Firebase:", error);
    alert("Error loading user data.");
  }
}

async function fetchUserNFTs(ownerId) {
  const nftContainer = document.querySelector(".NFT1");
  if (!nftContainer) return;
  nftContainer.innerHTML = "<h2>🖼️ Your NFTs</h2>";

  try {
    const nftsRef = collection(db, "NFTs");
    const q = query(nftsRef, where("owner", "==", ownerId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      nftContainer.innerHTML += "<p>No NFTs found.</p>";
      return;
    }

    snapshot.forEach((doc) => {
      const nft = doc.data();
      const card = document.createElement("div");
      card.className = `nft-card ${nft.rarity === "mythic" ? "mythic" : ""}`;
      card.innerHTML = `
        <img src="${nft.imageURL}" alt="${nft.name}" class="nft-img"/>
        <p>${nft.name}</p>
      `;
      nftContainer.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading user's NFTs:", err);
    nftContainer.innerHTML += "<p>⚠️ Failed to load NFTs.</p>";
  }
}


document.getElementById("transactionBtn").addEventListener("click", () => {
  window.location.href = "./transactions.html";
});

document.getElementById("withdrawBtn").addEventListener("click", () => {
  window.location.href = "./wApply.html";
});

document.getElementById("eshimPAYBtn").addEventListener("click", ()=>{
  window.location.href = "./eshimPAY.html"
})

document.getElementById("quitBtn").addEventListener("click", () => {
  localStorage.removeItem("telegram");
  window.location.reload();
});