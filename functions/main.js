const firebaseConfig = {
  apiKey: "AIzaSyABomqBTkkti8Wzxu2H0UKX1s-UZBoFN0c",
  authDomain: "eshim-edu-eclipse.firebaseapp.com",
  projectId: "eshim-edu-eclipse",
  storageBucket: "eshim-edu-eclipse.firebasestorage.app",
  messagingSenderId: "499244396754",
  appId: "1:499244396754:web:b8add55832b41b1ee5bd0b",
  measurementId: "G-RKW9CEM3NQ",
};

function showCustomAlert(message, type) {
  const alertDiv = document.createElement("div");
  alertDiv.className = `custom-alert ${type}`;
  alertDiv.textContent = message;
  document.body.prepend(alertDiv);

  setTimeout(() => {
    alertDiv.classList.add("show");
  }, 100);

  setTimeout(() => {
    alertDiv.classList.remove("show");
    setTimeout(() => {
      alertDiv.remove();
    }, 500);
  }, 3000);
}

if (typeof firebase === "undefined") {
  showCustomAlert(
    "Xatolik: Firebase SDK yuklanmadi. Iltimos internetni borligini tekshiring.",
    "error"
  );
} else {
  firebase.initializeApp(firebaseConfig);

  const auth = firebase.auth();
  const db = firebase.firestore();

  const nameInput = document.querySelector(".nameInput");
  const emailInput = document.querySelector(".emailInput");
  const passwordInput = document.querySelector(".passwordInput");
  const classInput = document.querySelector(".classOption");
  const form = document.querySelector(".form");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const nameValue = nameInput.value;
    const emailValue = emailInput.value;
    const passwordValue = passwordInput.value;
    const classValue = classInput.value;

    auth.createUserWithEmailAndPassword(emailValue, passwordValue)
      .then((userCredential) => {
        const user = userCredential.user;
        showCustomAlert(`Akkaunt Muvaffaqiyatli Yaratildi!`, "success");

        return db.collection("users").doc(user.uid).set({
          name: nameValue,
          email: emailValue,
          class: classValue,
          balance: 0,
          status: emailValue === "eshimovazizbekuv@gmail.com" ? "Admin" : "User",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
      .then(() => {
        form.reset();
      })
      .catch((error) => {
        showCustomAlert(`Xatolik: ${error.message}`, "error");
      });
  });
}