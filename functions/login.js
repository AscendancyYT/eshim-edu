const firebaseConfig = {
  apiKey: "AIzaSyABomqBTkkti8Wzxu2H0UKX1s-UZBoFN0c",
  authDomain: "eshim-edu-eclipse.firebaseapp.com",
  projectId: "eshim-edu-eclipse",
  storageBucket: "eshim-edu-eclipse.firebasestorage.app",
  messagingSenderId: "499244396754",
  appId: "1:499244396754:web:b8add55832b41b1ee5bd0b",
  measurementId: "G-RKW9CEM3NQ"
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
  }, 1500); 
}

if (typeof firebase === "undefined") {
  showCustomAlert(
    "Error: Firebase SDK failed to load. Please check your internet connection or CDN URLs.",
    "error"
  );
} else {
  firebase.initializeApp(firebaseConfig);

  const auth = firebase.auth();

  const emailInput = document.querySelector(".emailInput");
  const passwordInput = document.querySelector(".passwordInput");
  const form = document.querySelector(".login-form");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const emailValue = emailInput.value;
    const passwordValue = passwordInput.value;

    auth
      .signInWithEmailAndPassword(emailValue, passwordValue)
      .then((userCredential) => {
        const user = userCredential.user;
        showCustomAlert("Login successful! Redirecting to dashboard...", "success");
        setTimeout(() => {
          window.location.href = "../src/dashboard.html";
        }, 1500);
        form.reset();
      })
      .catch((error) => {
        showCustomAlert(`Error: ${error.message}`, "error");
      });
  });
}