const firebaseConfig = {
  apiKey: "AIzaSyABomqBTkkti8Wzxu2H0UKX1s-UZBoFN0c",
  authDomain: "eshim-edu-eclipse.firebaseapp.com",
  projectId: "eshim-edu-eclipse",
  storageBucket: "eshim-edu-eclipse.firebasestorage.app",
  messagingSenderId: "499244396754",
  appId: "1:499244396754:web:b8add55832b41b1ee5bd0b",
  measurementId: "G-RKW9CEM3NQ",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const accID = localStorage.getItem("accID");
const balanceEl = document.getElementById("balance");
const qrCodeDiv = document.getElementById("qr-code");
const errorEl = document.getElementById("error");

if (!accID) {
  balanceEl.textContent = "";
  errorEl.textContent = "No accID found in localStorage.";
} else {
  db.collection("users")
    .where("accID", "==", accID)
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.empty) {
        errorEl.textContent = "No user found for accID: " + accID;
        balanceEl.textContent = "";
        return;
      }

      const userData = querySnapshot.docs[0].data();
      const eBalance = userData.eBalance ?? 0;

      balanceEl.textContent = `💰 ${eBalance} Eshims`;

      const qrURL = `https://eshim-edu.netlify.app/payTransaction.html?accID=${accID}`;
      QRCode.toCanvas(qrURL, { width: 200 }, (err, canvas) => {
        if (err) {
          console.error("QR Error", err);
          errorEl.textContent = "QR Code generation failed.";
        } else {
          qrCodeDiv.appendChild(canvas);
        }
      });
    })
    .catch((err) => {
      console.error("Firebase error:", err);
      errorEl.textContent = "Error loading data from Firestore.";
    });
}
