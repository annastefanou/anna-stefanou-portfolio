const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#site-navigation");
const editButton = document.querySelector("#edit-toggle");
const resetButton = document.querySelector("#edit-reset");
const editStatus = document.querySelector("#edit-status");
const editableFields = [...document.querySelectorAll("[data-editable]")];
const editsStorageKey = "anna-personal-portfolio-edits";
const imagesStorageKey = "anna-personal-portfolio-images";
let storageError = false;
let savedImages = {};

const imageTargets = {
  hero: "hero-photo",
  "me-one": "me-photo-one",
  "me-two": "me-photo-two",
  "studies-one": "studies-photo-one",
  "studies-two": "studies-photo-two",
  "university-one": "university-photo-one",
  "university-two": "university-photo-two"
};

function appendSafeMarkup(parent, sourceNode) {
  for (const child of sourceNode.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      parent.append(document.createTextNode(child.textContent));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      if (["DIV", "P"].includes(child.tagName)) {
        if (parent.hasChildNodes() && parent.lastChild.tagName !== "BR") parent.append(document.createElement("br"));
        appendSafeMarkup(parent, child);
      } else if (["BR", "EM", "STRONG", "B", "I"].includes(child.tagName)) {
        const safeElement = document.createElement(child.tagName.toLowerCase());
        appendSafeMarkup(safeElement, child);
        parent.append(safeElement);
      } else {
        appendSafeMarkup(parent, child);
      }
    }
  }
}

function restoreSafeMarkup(field, markup) {
  const parsed = new DOMParser().parseFromString(markup, "text/html");
  const safeContent = document.createDocumentFragment();
  appendSafeMarkup(safeContent, parsed.body);
  field.replaceChildren(safeContent);
}

function updateEmailLink() {
  const emailField = document.querySelector('[data-editable="contact-email"]');
  const email = emailField.textContent.trim();
  const link = document.querySelector(".contact-email");
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    link.href = `mailto:${email}`;
  } else {
    link.removeAttribute("href");
  }
}

try {
  const saved = JSON.parse(localStorage.getItem(editsStorageKey) || "{}");
  for (const field of editableFields) {
    const value = saved[field.dataset.editable];
    if (typeof value === "string") restoreSafeMarkup(field, value);
  }
} catch {
  storageError = true;
}

updateEmailLink();

function showSavedImage(targetName) {
  const photoId = imageTargets[targetName];
  const photo = document.querySelector(`#${photoId}`);
  const removeButton = document.querySelector(`[data-remove-image="${targetName}"]`);
  if (!photo) return;
  if (savedImages[targetName]) {
    photo.src = savedImages[targetName];
    photo.hidden = false;
    if (removeButton) removeButton.hidden = false;
  } else {
    photo.hidden = true;
    photo.removeAttribute("src");
    if (removeButton) removeButton.hidden = true;
  }
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Δεν ήταν δυνατή η ανάγνωση της εικόνας."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Η εικόνα δεν φορτώθηκε σωστά."));
      image.onload = () => {
        const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

try {
  savedImages = JSON.parse(localStorage.getItem(imagesStorageKey) || "{}");
} catch {
  savedImages = {};
}

for (const targetName of Object.keys(imageTargets)) showSavedImage(targetName);

for (const input of document.querySelectorAll('[type="file"][accept^="image"]')) {
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      editStatus.hidden = false;
      editStatus.textContent = "Επίλεξε PNG, JPG ή WebP εικόνα.";
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      editStatus.hidden = false;
      editStatus.textContent = "Η εικόνα πρέπει να είναι μικρότερη από 15 MB.";
      return;
    }
    try {
      const targetName = input.id.replace("-upload", "");
      const dataUrl = await resizeImage(file);
      savedImages[targetName] = dataUrl;
      localStorage.setItem(imagesStorageKey, JSON.stringify(savedImages));
      showSavedImage(targetName);
      editStatus.hidden = false;
      editStatus.textContent = "Η φωτογραφία προστέθηκε.";
      window.setTimeout(() => {
        if (editStatus.textContent === "Η φωτογραφία προστέθηκε.") editStatus.hidden = true;
      }, 4000);
    } catch (error) {
      editStatus.hidden = false;
      editStatus.textContent = error.message || "Δεν ήταν δυνατή η προσθήκη της φωτογραφίας.";
    }
  });
}

for (const removeButton of document.querySelectorAll("[data-remove-image]")) {
  removeButton.addEventListener("click", () => {
    const targetName = removeButton.dataset.removeImage;
    delete savedImages[targetName];
    try {
      localStorage.setItem(imagesStorageKey, JSON.stringify(savedImages));
    } catch {
      storageError = true;
    }
    showSavedImage(targetName);
  });
}

function setEditing(isEditing) {
  document.body.classList.toggle("is-editing", isEditing);
  editButton.setAttribute("aria-pressed", String(isEditing));
  editButton.innerHTML = isEditing
    ? 'Τέλος <span aria-hidden="true">✓</span>'
    : 'Γράψε <span aria-hidden="true">↗</span>';
  resetButton.hidden = !isEditing;
  editStatus.hidden = !isEditing;
  editStatus.textContent = storageError
    ? "Το πρόγραμμα περιήγησης δεν μπορεί να αποθηκεύσει τις αλλαγές."
    : "Ενεργοποιήθηκε η επεξεργασία — επέλεξε ένα από τα περιγραμμένα κείμενα.";

  for (const field of editableFields) {
    if (isEditing) {
      field.setAttribute("contenteditable", "plaintext-only");
      field.setAttribute("spellcheck", "true");
    } else {
      field.removeAttribute("contenteditable");
      field.removeAttribute("spellcheck");
    }
  }

  if (isEditing) {
    window.setTimeout(() => {
      if (editButton.getAttribute("aria-pressed") === "true") editStatus.hidden = true;
    }, 5000);
  }
}

editButton.addEventListener("click", () => {
  setEditing(editButton.getAttribute("aria-pressed") !== "true");
});

for (const field of editableFields) {
  field.addEventListener("input", () => {
    try {
      const saved = JSON.parse(localStorage.getItem(editsStorageKey) || "{}");
      saved[field.dataset.editable] = field.innerHTML;
      localStorage.setItem(editsStorageKey, JSON.stringify(saved));
      storageError = false;
    } catch {
      storageError = true;
      editStatus.hidden = false;
      editStatus.textContent = "Δεν ήταν δυνατή η αποθήκευση των αλλαγών.";
    }
    if (field.dataset.editable === "contact-email") updateEmailLink();
  });
}

resetButton.addEventListener("click", () => {
  if (!window.confirm("Να επανέλθουν όλα τα κείμενα και οι φωτογραφίες στις αρχικές τιμές;")) return;
  try {
    localStorage.removeItem(editsStorageKey);
    localStorage.removeItem(imagesStorageKey);
  } catch {
    storageError = true;
  }
  window.location.reload();
});

document.querySelector("#contact-form").addEventListener("submit", (event) => {
  event.preventEvent?.();
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const emailField = document.querySelector('[data-editable="contact-email"]');
  const email = emailField.textContent.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    editStatus.hidden = false;
    editStatus.textContent = "Πρόσθεσε πρώτα ένα έγκυρο email επικοινωνίας.";
    return;
  }
  const subject = encodeURIComponent(`Μήνυμα από ${form.get("name")}`);
  const body = encodeURIComponent(`Όνομα: ${form.get("name")}\nEmail: ${form.get("email")}\n\n${form.get("message")}`);
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
});

function setMenuOpen(isOpen) {
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Κλείσιμο μενού" : "Άνοιγμα μενού");
  navigation.classList.toggle("is-open", isOpen);
}

menuButton.addEventListener("click", () => setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true"));
navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenuOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
    setMenuOpen(false);
    menuButton.focus();
  }
});
